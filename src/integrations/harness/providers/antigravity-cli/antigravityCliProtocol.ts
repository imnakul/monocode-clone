import type {
  AgentModel,
  ModelSetting,
} from "../../../../features/sessions/model/models";
import type { ProcessedUsage } from "../../../../features/sessions/model/tokenAccounting";
import type { HarnessSessionInput } from "../../core/types";

export const CLI_HELP =
  "Install the official agy CLI, sign in once by running agy in a terminal, then Recheck Antigravity CLI in Providers.";
export const CLI_POLICY =
  "Antigravity CLI headless mode follows its saved permissions. Requests requiring confirmation are denied; use ACP for interactive approvals, or select Full access explicitly.";

export function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function nativeConversationId(value: unknown): string | undefined {
  return typeof value === "string" &&
    /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value)
    ? value
    : undefined;
}

export function cliAgentName(settings?: Record<string, string>): string {
  const agent = settings?.antigravityAgent ?? "default";
  if (!/^[a-z\d][a-z\d_.-]{0,127}$/i.test(agent))
    throw new Error("Invalid Antigravity CLI agent name. Choose an available agent or Default agent.");
  return agent;
}

export function cliSpawnArgs(
  input: HarnessSessionInput,
  nativeId?: string,
): string[] {
  const args = [
    "--input-format",
    "stream-json",
    "--output-format",
    "stream-json",
    "--print-timeout",
    "30m",
  ];
  const agent = cliAgentName(input.modelSettings);
  if (agent !== "default") args.push("--agent", agent);
  const model = input.model.startsWith("antigravity-cli:")
    ? input.model.slice("antigravity-cli:".length)
    : input.model;
  if (model && model !== "default") args.push("--model", model);
  const effort = input.modelSettings?.effort;
  if (effort && ["low", "medium", "high"].includes(effort))
    args.push("--effort", effort);
  if (nativeId) {
    if (!nativeConversationId(nativeId))
      throw new Error(
        "Invalid Antigravity CLI conversation ID; ACP IDs cannot be resumed by the CLI.",
      );
    args.push("--conversation", nativeId);
  }
  if (input.runtimeMode === "full-access")
    args.push("--dangerously-skip-permissions");
  return args;
}

export function userMessage(text: string): string {
  return JSON.stringify({ event: "user", message: { content: text } });
}

const EFFORT: ModelSetting = {
  id: "effort",
  label: "Reasoning",
  kind: "select",
  value: "high",
  options: ["low", "medium", "high"].map((value) => ({
    value,
    label: value[0].toUpperCase() + value.slice(1),
  })),
};

/** The official `agy models` output is a slug followed by its display name. */
export function cliModels(output: string): AgentModel[] {
  const seen = new Set<string>();
  return output
    .replace(/\x1b\[[0-9;]*m/g, "")
    .split(/\r?\n/)
    .flatMap((line) => {
      const match = line
        .trim()
        .match(/^([a-z\d][a-z\d._/-]*)(?:\t+| {2,})(.+)$/i);
      if (
        !match ||
        ["model", "slug", "name"].includes(match[1].toLowerCase()) ||
        seen.has(match[1])
      )
        return [];
      seen.add(match[1]);
      return [
        {
          id: `antigravity-cli:${match[1]}`,
          harness: "antigravity-cli" as const,
          nativeId: match[1],
          name: match[2].trim(),
          settings: [EFFORT],
        },
      ];
    });
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

export function cliUsage(value: unknown): ProcessedUsage | undefined {
  const usage = record(value);
  if (
    !usage ||
    !["input_tokens", "output_tokens", "total_tokens"].some(
      (key) => typeof usage[key] === "number",
    )
  )
    return undefined;
  const input = count(usage.input_tokens),
    output = count(usage.output_tokens);
  return {
    input,
    output,
    total:
      typeof usage.total_tokens === "number"
        ? count(usage.total_tokens)
        : input + output,
    cachedInput: count(usage.cache_read_tokens),
    reasoning: count(usage.thinking_tokens),
  };
}

/** Cumulative process counters become per-turn counters, never context occupancy. */
export function usageDelta(
  current: ProcessedUsage,
  previous?: ProcessedUsage,
): ProcessedUsage {
  const subtract = (key: keyof ProcessedUsage): number =>
    Math.max(0, (current[key] ?? 0) - (previous?.[key] ?? 0));
  return {
    total: subtract("total"),
    input: subtract("input"),
    output: subtract("output"),
    cachedInput: subtract("cachedInput"),
    reasoning: subtract("reasoning"),
  };
}

/** Read-only CLI commands must not be sent into the user-message stream. */
export function reportArgs(text: string): string[] | undefined {
  const command = text.trim().toLowerCase();
  if (["/usage", "/quota", "/credits"].includes(command))
    return ["--print", command, "--print-timeout", "30s"];
  if (["/models", "/model"].includes(command)) return ["models"];
  return undefined;
}

export function validateCliPrompt(text: string): void {
  if (text.trimStart().startsWith("/"))
    throw new Error(
      "Antigravity CLI interactive slash commands are unavailable in a streaming chat. Use /usage or /models for reports; use the agy terminal for interactive controls and compaction.",
    );
}
