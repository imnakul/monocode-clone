import { homeDir } from "../../../platform/tauri/fs";
import {
  execChild,
  probeHarnessBinary,
} from "../../../integrations/harness/core/child";
import {
  idleRateLimits,
  SESSION_WINDOW_MINUTES,
  WEEKLY_WINDOW_MINUTES,
  type ProviderRateLimits,
  type RateLimitWindow,
} from "./rateLimits";

export type AntigravityQuotaGroup = NonNullable<
  ProviderRateLimits["modelGroups"]
>[number];

function reportText(raw: string): string {
  const clean = raw.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").trim();
  if (!clean.startsWith("{")) return clean;
  const value: unknown = JSON.parse(clean);
  if (!value || typeof value !== "object")
    throw new Error("Invalid CLI report");
  const wrapper = value as Record<string, unknown>;
  const result =
    wrapper.result && typeof wrapper.result === "object"
      ? (wrapper.result as Record<string, unknown>)
      : wrapper;
  if (result.status && result.status !== "SUCCESS")
    throw new Error("CLI report failed");
  if (typeof result.response !== "string")
    throw new Error("Unsupported CLI report format");
  return result.response;
}

function resetTimestamp(text: string, utc = false): number | null {
  const iso = text.match(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})/i,
  )?.[0];
  // The native table omits a timezone on values but explicitly labels the column UTC.
  const tableTime =
    utc && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text.trim())
      ? `${text.trim().replace(" ", "T")}Z`
      : undefined;
  const timestamp = iso ?? tableTime;
  const value = timestamp ? Date.parse(timestamp) : NaN;
  return Number.isFinite(value) ? value : null;
}

function quotaGroupName(
  text: string,
): AntigravityQuotaGroup["name"] | undefined {
  const name = text
    .replace(/\s+models$/i, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
  if (name === "gemini") return "Gemini";
  if (name === "claude") return "Claude";
  if (name === "gpt") return "GPT";
  if (name === "claude & gpt") return "Claude & GPT";
  return undefined;
}

/** Parse explicitly labelled model-group quotas; never infer bare percentages. */
export function parseAntigravityCliQuotas(
  raw: string,
): AntigravityQuotaGroup[] {
  const groups = new Map<
    AntigravityQuotaGroup["name"],
    AntigravityQuotaGroup
  >();
  let current: AntigravityQuotaGroup | undefined;
  let lastWindow: RateLimitWindow | undefined;
  let quotaTable: { utc: boolean } | undefined;
  for (const rawLine of reportText(raw).split(/\r?\n/)) {
    const line = rawLine
      .replace(/^[\s│┃|>*#•●▪]+/, "")
      .replace(/\*+/g, "")
      .trim();
    const cells = line
      .replace(/\|\s*$/, "")
      .split("|")
      .map((cell) => cell.trim());
    if (
      cells.length === 4 &&
      /^model group$/i.test(cells[0]) &&
      /^limit window$/i.test(cells[1])
    ) {
      quotaTable =
        /^remaining$/i.test(cells[2]) &&
        /^resets at(?: \(UTC\))?$/i.test(cells[3])
          ? { utc: /\(UTC\)/i.test(cells[3]) }
          : undefined;
      current = undefined;
      lastWindow = undefined;
      continue;
    }
    if (quotaTable && cells.length === 4) {
      const name = quotaGroupName(cells[0]);
      const kind = /^weekly limit$/i.test(cells[1])
        ? "weekly"
        : /^5-hour limit$/i.test(cells[1])
          ? "session"
          : undefined;
      if (!name || !kind) continue;
      const match = cells[2].match(/^(-?\d+(?:\.\d+)?)\s*%$/);
      if (!match)
        throw new Error(
          "Antigravity CLI returned an unrecognized quota percentage",
        );
      const percentage = Number(match[1]);
      if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100)
        throw new Error("Antigravity CLI returned an invalid quota percentage");
      const group = groups.get(name) ?? { name, session: null, weekly: null };
      group[kind] = {
        usedPercent: 100 - percentage,
        windowMinutes:
          kind === "weekly" ? WEEKLY_WINDOW_MINUTES : SESSION_WINDOW_MINUTES,
        resetsAt: resetTimestamp(cells[3], quotaTable.utc),
      };
      groups.set(name, group);
      continue;
    }
    const header = line.match(
      /^(Gemini|Claude|GPT)(?:\s+Models)?(?=\s*$|\s*[(:|·—-]|\s+(?:weekly|five|5h|5[- ]hour))/i,
    );
    if (header) {
      const name =
        header[1].toLowerCase() === "gemini"
          ? "Gemini"
          : header[1].toLowerCase() === "claude"
            ? "Claude"
            : "GPT";
      current = groups.get(name) ?? { name, session: null, weekly: null };
      groups.set(name, current);
      lastWindow = undefined;
    } else if (/^[\w ]+models\b/i.test(line)) {
      current = undefined;
      lastWindow = undefined;
    }
    if (!current) continue;
    const markers = [
      ...line.matchAll(
        /\b(weekly|7[- ]?days?|five[- ]?hours?|5[- ]?hours?|5h)\b/gi,
      ),
    ];
    for (let i = 0; i < markers.length; i += 1) {
      const marker = markers[i];
      const segment = line.slice(marker.index, markers[i + 1]?.index);
      const match = segment.match(/(-?\d+(?:\.\d+)?)\s*%/);
      const remaining = /\b(?:remaining|left)\b/i.test(segment);
      const used = /\b(?:used|consumed)\b/i.test(segment);
      if (!match || remaining === used) {
        lastWindow = undefined;
        continue;
      }
      const percentage = Number(match[1]);
      if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100)
        throw new Error("Antigravity CLI returned an invalid quota percentage");
      const weekly = /weekly|7/i.test(marker[1]);
      const window: RateLimitWindow = {
        usedPercent: remaining ? 100 - percentage : percentage,
        windowMinutes: weekly ? WEEKLY_WINDOW_MINUTES : SESSION_WINDOW_MINUTES,
        resetsAt: resetTimestamp(segment),
      };
      current[weekly ? "weekly" : "session"] = window;
      lastWindow = window;
    }
    if (markers.length === 0 && lastWindow && /reset/i.test(line))
      lastWindow.resetsAt = resetTimestamp(line) ?? lastWindow.resetsAt;
  }
  const recognized = [...groups.values()].filter(
    (group) => group.session || group.weekly,
  );
  if (!recognized.length)
    throw new Error(
      "Antigravity CLI quota format was not recognized. Run /usage to inspect the report.",
    );
  return recognized;
}

export function parseAntigravityCliCredits(raw: string): number {
  const text = reportText(raw);
  const match =
    text.match(
      /\bremaining\s+(?:AI\s+)?credits\s*[:|=]?\s*([\d,]+(?:\.\d+)?)/i,
    ) ?? text.match(/\bcredits\s+remaining\s*[:|=]?\s*([\d,]+(?:\.\d+)?)/i);
  if (!match)
    throw new Error("Antigravity CLI credit balance was not recognized");
  const balance = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(balance) || balance < 0)
    throw new Error("Invalid CLI credit balance");
  return balance;
}

/** Select only the actual model family. Configured/unknown models expose all groups. */
export function antigravityCliLimitsForModel(
  limits: ProviderRateLimits,
  model?: string,
): ProviderRateLimits {
  const slug = model?.replace(/^antigravity-cli:/, "").toLowerCase();
  const name = slug?.startsWith("gemini-")
    ? "Gemini"
    : slug?.startsWith("claude-")
      ? "Claude"
      : slug?.startsWith("gpt-")
        ? "GPT"
        : undefined;
  const group =
    limits.modelGroups?.find((item) => item.name === name) ??
    limits.modelGroups?.find(
      (item) =>
        item.name === "Claude & GPT" && (name === "Claude" || name === "GPT"),
    );
  return {
    ...limits,
    session: group?.session ?? null,
    weekly: group?.weekly ?? null,
  };
}

export async function fetchAntigravityCliRateLimits(): Promise<ProviderRateLimits> {
  const { path } = await probeHarnessBinary("antigravity-cli");
  const cwd = await homeDir();
  const [usage, credits] = await Promise.allSettled([
    execChild(
      path,
      ["--print", "/usage", "--print-timeout", "30s"],
      cwd,
      "antigravity-cli",
    ),
    execChild(
      path,
      ["--print", "/credits", "--print-timeout", "30s"],
      cwd,
      "antigravity-cli",
    ),
  ]);
  if (usage.status === "rejected") throw usage.reason;
  const limits: ProviderRateLimits = {
    ...idleRateLimits("antigravity-cli"),
    modelGroups: parseAntigravityCliQuotas(usage.value),
    updatedAt: Date.now(),
    status: "ok",
  };
  try {
    if (credits.status === "rejected") throw credits.reason;
    limits.creditBalance = parseAntigravityCliCredits(credits.value);
  } catch {
    limits.creditError =
      "Credit balance unavailable. Run /credits to inspect the report.";
  }
  return limits;
}
