import {
  DEFAULT_RUNTIME_MODE,
  newSession,
  type Block,
  type HarnessId,
  type RuntimeMode,
  type Session,
} from "../session";
import { readTextFile } from "../fs";
import {
  readExternalTranscript,
  truncateImportTitle,
  type ExternalSessionInfo,
} from "./sessionImport";

/** One replayable turn extracted from a foreign transcript. */
export type ReplayTurn = {
  role: "user" | "assistant";
  text: string;
  /** Tool names invoked in this turn (informational only, never re-run). */
  toolCalls: string[];
  timestamp?: string;
};

export type ReplayParse = {
  turns: ReplayTurn[];
};

/** Hard cap: replay is context, not a full archive. */
export const MAX_REPLAY_TURNS = 200;
/** Per-turn text cap; transcripts embed huge tool outputs. */
const MAX_TURN_CHARS = 4000;

export function capText(text: string): string {
  const trimmed = text.trim();
  if ([...trimmed].length <= MAX_TURN_CHARS) return trimmed;
  return `${[...trimmed].slice(0, MAX_TURN_CHARS).join("")}… [truncated]`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Parse a Claude Code transcript (`~/.claude/projects/*.jsonl`) into
 * ordered turns. Unknown envelopes are skipped, never thrown — schemas
 * drift across CLI versions. Sidechain (subagent) lines are skipped to
 * keep the replay to the main conversation.
 */
export function parseClaudeTranscript(jsonl: string): ReplayParse {
  const turns: ReplayTurn[] = [];
  for (const raw of jsonl.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      continue;
    }
    const rec = asRecord(value);
    if (!rec || rec.isSidechain === true) continue;
    const kind = typeof rec.type === "string" ? rec.type : "";
    if (kind !== "user" && kind !== "assistant") continue;
    const message = asRecord(rec.message);
    if (!message) continue;
    const role: "user" | "assistant" =
      kind === "assistant" ? "assistant" : "user";
    const { text, tools } = claudeContent(message.content);
    if (!text && tools.length === 0) continue;
    turns.push({
      role,
      text: capText(text || tools.map((name) => `[tool: ${name}]`).join("\n")),
      toolCalls: tools,
      ...(typeof rec.timestamp === "string" ? { timestamp: rec.timestamp } : {}),
    });
  }
  return { turns };
}

function claudeContent(content: unknown): { text: string; tools: string[] } {
  const parts: string[] = [];
  const tools: string[] = [];
  const push = (block: unknown) => {
    const rec = asRecord(block);
    if (!rec) {
      if (typeof block === "string" && block.trim()) parts.push(block.trim());
      return;
    }
    const type = typeof rec.type === "string" ? rec.type : "";
    if (type === "text" && typeof rec.text === "string" && rec.text.trim()) {
      parts.push(rec.text.trim());
    } else if (type === "tool_use" && typeof rec.name === "string") {
      tools.push(rec.name);
    } else if (type === "tool_result") {
      // Tool outputs are the most valuable replay context; per-turn caps
      // bound the size. Image results carry no text and are skipped.
      const result = rec.content;
      if (typeof result === "string" && result.trim()) {
        parts.push(result.trim());
      } else if (Array.isArray(result)) {
        for (const item of result) push(item);
      }
    }
  };
  if (typeof content === "string") {
    if (content.trim()) parts.push(content.trim());
  } else if (Array.isArray(content)) {
    for (const block of content) push(block);
  }
  return { text: parts.join("\n\n"), tools };
}

/**
 * Parse a Codex rollout file (under `~/.codex/sessions`, e.g. rollout JSONL).
 * Developer-role messages are injected instructions, not conversation.
 */
export function parseCodexRollout(jsonl: string): ReplayParse {
  const turns: ReplayTurn[] = [];
  for (const raw of jsonl.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      continue;
    }
    const rec = asRecord(value);
    if (!rec || rec.type !== "response_item") continue;
    const payload = asRecord(rec.payload);
    if (!payload || payload.type !== "message") continue;
    const role = payload.role === "assistant" ? "assistant" : payload.role === "user" ? "user" : null;
    if (!role) continue;
    const { text, tools } = codexContent(payload.content, role);
    if (!text && tools.length === 0) continue;
    turns.push({
      role,
      text: capText(text || tools.map((name) => `[tool: ${name}]`).join("\n")),
      toolCalls: tools,
      ...(typeof rec.timestamp === "string" ? { timestamp: rec.timestamp } : {}),
    });
  }
  return { turns };
}

function codexContent(
  content: unknown,
  role: "user" | "assistant",
): { text: string; tools: string[] } {
  const parts: string[] = [];
  const tools: string[] = [];
  if (!Array.isArray(content)) return { text: "", tools };
  for (const block of content) {
    const rec = asRecord(block);
    if (!rec) continue;
    const type = typeof rec.type === "string" ? rec.type : "";
    if (
      (role === "user" && type === "input_text") ||
      (role === "assistant" && type === "output_text")
    ) {
      if (typeof rec.text === "string" && rec.text.trim()) {
        parts.push(rec.text.trim());
      }
    } else if (type === "function_call" && typeof rec.name === "string") {
      tools.push(rec.name);
    }
  }
  return { text: parts.join("\n\n"), tools };
}

export type ReplayImport = {
  blocks: Block[];
  truncated: boolean;
  turnCount: number;
  summary: string;
};

const HISTORY_BADGE =
  "Imported history — read-only, not re-executable. " +
  "Approvals, live tool results, attachments, absolute paths, and " +
  "model-specific blocks did not transfer; only the conversation text did.";

/**
 * Build the blocks for a replay import: a badge block, the capped history,
 * and a truncation notice when the transcript exceeds the cap.
 */
export function buildReplayBlocks(
  source: ExternalSessionInfo,
  turns: ReplayTurn[],
): ReplayImport {
  const truncated = turns.length > MAX_REPLAY_TURNS;
  const kept = truncated ? turns.slice(-MAX_REPLAY_TURNS) : turns;
  const blocks: Block[] = [
    {
      id: crypto.randomUUID(),
      role: "system",
      text: HISTORY_BADGE,
    },
  ];
  for (const turn of kept) {
    blocks.push({
      id: crypto.randomUUID(),
      role: turn.role,
      text: turn.text,
      ...(turn.timestamp ? { startedAt: Date.parse(turn.timestamp) || undefined } : {}),
    });
  }
  if (truncated) {
    blocks.push({
      id: crypto.randomUUID(),
      role: "system",
      text: `Showing the most recent ${MAX_REPLAY_TURNS} of ${turns.length} turns. Older history was not imported.`,
    });
  }
  return {
    blocks,
    truncated,
    turnCount: turns.length,
    summary: buildReplaySummary(source, turns, truncated),
  };
}

function buildReplaySummary(
  source: ExternalSessionInfo,
  turns: ReplayTurn[],
  truncated: boolean,
): string {
  const users = turns.filter((turn) => turn.role === "user").length;
  const tools = [
    ...new Set(turns.flatMap((turn) => turn.toolCalls)),
  ].slice(0, 5);
  const firstTopic = turns.find((turn) => turn.role === "user")?.text ?? "";
  const topic = firstTopic.split(/\s+/).slice(0, 24).join(" ");
  const parts = [
    `Imported ${turns.length} turns (${users} from you) from ${source.source} session "${source.title}".`,
    topic ? `It started with: ${topic}.` : "",
    tools.length > 0 ? `Tools used there: ${tools.join(", ")}.` : "",
    truncated
      ? `Only the most recent ${MAX_REPLAY_TURNS} turns were kept.`
      : "",
    "Ask me to continue the work; I don't share its live state.",
  ];
  return parts.filter(Boolean).join(" ");
}

export type ReplaySessionOptions = {
  harness: HarnessId;
  cwd?: string;
  model?: string;
  runtimeMode?: RuntimeMode;
};

/**
 * Create a fresh MonoCode session prefilled with replayed history.
 * Deliberately NOT bound to any native id: the next turn starts a new
 * provider conversation with the summary as context.
 */
export function createReplaySession(
  source: ExternalSessionInfo,
  imported: ReplayImport,
  options: ReplaySessionOptions,
): Session {
  const session = newSession(
    options.harness,
    options.cwd?.trim() || source.cwd.trim() || "~",
    options.model,
    options.runtimeMode ?? DEFAULT_RUNTIME_MODE,
  );
  const title = truncateImportTitle(source.title);
  session.title = title || session.title;
  session.blocks = imported.blocks;
  // Feed the model on first send: the composer opens prefilled with the
  // summary (same one-shot mechanism as inbox items), so the new turn
  // carries context instead of starting cold. History blocks stay
  // display-only.
  session.composerSeed = imported.summary;
  return session;
}

/**
 * Sibling messages file for a Cline manifest path:
 * `<id>.json` → `<id>.messages.json` in the same directory.
 */
export function clineMessagesPath(manifestPath: string): string {
  return manifestPath.endsWith(".json")
    ? `${manifestPath.slice(0, -".json".length)}.messages.json`
    : `${manifestPath}.messages.json`;
}

/**
 * Parse an `read_external_transcript` export (`{messages: [{role, time,
 * parts}]}`) shared by the sqlite-backed sources (OpenCode, ZCode).
 * Part shapes: `{type: "text", text}`, `{type: "reasoning", text}` (kept —
 * it explains decisions), `{type: "tool", tool/callID, ...}` (name only),
 * step markers (skipped).
 */
export function parseOpencodeTranscript(json: string): ReplayParse {
  let root: unknown;
  try {
    root = JSON.parse(json);
  } catch {
    return { turns: [] };
  }
  const messages = asRecord(root)?.messages;
  if (!Array.isArray(messages)) return { turns: [] };
  const turns: ReplayTurn[] = [];
  for (const item of messages) {
    const rec = asRecord(item);
    if (!rec) continue;
    const role = rec.role === "assistant" ? "assistant" : rec.role === "user" ? "user" : null;
    if (!role) continue;
    const parts = Array.isArray(rec.parts) ? rec.parts : [];
    const texts: string[] = [];
    const tools: string[] = [];
    for (const part of parts) {
      const block = asRecord(part);
      if (!block) continue;
      const type = typeof block.type === "string" ? block.type : "";
      if (
        (type === "text" || type === "reasoning") &&
        typeof block.text === "string" &&
        block.text.trim()
      ) {
        texts.push(block.text.trim());
      } else if (type === "tool") {
        const name =
          typeof block.tool === "string"
            ? block.tool
            : typeof block.name === "string"
              ? block.name
              : null;
        if (name) tools.push(name);
      }
    }
    const text = texts.join("\n\n");
    if (!text && tools.length === 0) continue;
    turns.push({
      role,
      text: capText(text || tools.map((name) => `[tool: ${name}]`).join("\n")),
      toolCalls: tools,
      ...(typeof rec.time === "number" && rec.time > 0
        ? { timestamp: new Date(rec.time).toISOString() }
        : {}),
    });
  }
  return { turns };
}

/**
 * Parse a Cline `*.messages.json` file (`{messages: [{role, content:
 * [{type, text}], ts}]}`). The `<user_input mode="…">` wrapper Cline adds
 * around prompts is stripped for readability.
 */
export function parseClineMessages(json: string): ReplayParse {
  let root: unknown;
  try {
    root = JSON.parse(json);
  } catch {
    return { turns: [] };
  }
  const messages = asRecord(root)?.messages;
  if (!Array.isArray(messages)) return { turns: [] };
  const turns: ReplayTurn[] = [];
  for (const item of messages) {
    const rec = asRecord(item);
    if (!rec) continue;
    const role = rec.role === "assistant" ? "assistant" : rec.role === "user" ? "user" : null;
    if (!role || !Array.isArray(rec.content)) continue;
    const texts: string[] = [];
    for (const block of rec.content) {
      const part = asRecord(block);
      if (!part || part.type !== "text" || typeof part.text !== "string") continue;
      const cleaned = part.text
        .replace(/<user_input[^>]*>/g, "")
        .replace(/<\/user_input>/g, "")
        .trim();
      if (cleaned) texts.push(cleaned);
    }
    if (texts.length === 0) continue;
    turns.push({
      role,
      text: capText(texts.join("\n\n")),
      toolCalls: [],
      ...(typeof rec.ts === "number" && rec.ts > 0
        ? { timestamp: new Date(rec.ts).toISOString() }
        : {}),
    });
  }
  return { turns };
}

/**
 * Parse an `read_external_transcript` `{summary}` export (T3 threads).
 * Returns the trimmed summary or an empty string.
 */
export function parseT3Summary(json: string): string {
  try {
    const summary = asRecord(JSON.parse(json))?.summary;
    return typeof summary === "string" ? summary.trim() : "";
  } catch {
    return "";
  }
}

/**
 * Load the replayable history for an external session, whatever its
 * storage: sqlite-backed sources export through the backend, T3 threads
 * replay from their summary, file sources are read + parsed directly.
 * Readers are injectable so tests never touch disk or Tauri.
 */
export type ReplayReaders = {
  readFile: (path: string) => Promise<string>;
  readExport: (source: string, sessionId: string) => Promise<string>;
};

export async function loadReplayImport(
  info: ExternalSessionInfo,
  readers?: Partial<ReplayReaders>,
): Promise<ReplayImport> {
  const { turns } = await loadReplayTurns(info, readers);
  if (turns.length === 0) {
    throw new Error("No replayable turns found in transcript");
  }
  return buildReplayBlocks(info, turns);
}

async function loadReplayTurns(
  info: ExternalSessionInfo,
  readers?: Partial<ReplayReaders>,
): Promise<ReplayParse> {
  const readFile = readers?.readFile ?? readTextFile;
  const readExport = readers?.readExport ?? readExternalTranscript;
  if (
    info.source === "t3" ||
    info.source === "opencode" ||
    info.source === "zcode"
  ) {
    // Database sources export through the backend in one shared shape
    // (T3 live messages included).
    return parseOpencodeTranscript(await readExport(info.source, info.id));
  }
  const json =
    info.source === "cline"
      ? await readFile(clineMessagesPath(info.file))
      : await readFile(info.file);
  if (info.source === "cline") return parseClineMessages(json);
  return info.source === "codex"
    ? parseCodexRollout(json)
    : parseClaudeTranscript(json);
}

/**
 * Summary-only replay for sources without an accessible transcript (T3
 * threads carry a summary but their full history lives in provider
 * stores). One context block, still badged as imported history.
 */
export function summaryOnlyImport(
  source: ExternalSessionInfo,
  summary: string,
): ReplayImport {
  const text = summary.trim() || source.title;
  const blocks: Block[] = [
    {
      id: crypto.randomUUID(),
      role: "system",
      text: HISTORY_BADGE,
    },
    {
      id: crypto.randomUUID(),
      role: "assistant",
      text: capText(text),
    },
  ];
  return {
    blocks,
    truncated: false,
    turnCount: 1,
    summary: `Imported the summary of ${source.source} session "${source.title}". Ask me to continue the work; I don't share its live state.`,
  };
}
