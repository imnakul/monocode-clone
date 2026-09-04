import type { AgentModel } from "../models";

/**
 * Structured Antigravity headless protocol.
 *
 * Ported from the HARI/T3 Code reference (`AgyProtocol.ts`) into MonoCode's
 * plain-TS harness style (no Effect). The CLI contract is:
 *
 *   agy --input-format stream-json --output-format stream-json \
 *       [--model <id>] [--effort low|medium|high] \
 *       [--conversation <id>] [--dangerously-skip-permissions]
 *
 * with NDJSON `{"event":"user","message":{"content":"..."}}` on stdin and
 * newline-delimited `init` / `step_update` / `result` events on stdout.
 */

export type AgyEffort = "low" | "medium" | "high";

export interface AgyUsage {
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
  cachedInputTokens?: number | undefined;
  reasoningOutputTokens?: number | undefined;
  totalTokens?: number | undefined;
}

export interface AgyStreamResult {
  conversationId?: string | undefined;
  deltas: string[];
  response?: string | undefined;
  status?: string | undefined;
  error?: string | undefined;
  usage?: AgyUsage | undefined;
}

export interface AgyCommandInput {
  model?: string | undefined;
  effort?: string | undefined;
  conversationId?: string | undefined;
  fullAccess: boolean;
}

export interface AgyModelRef {
  slug: string;
  name: string;
}

export interface AgyToolUpdate {
  index: number;
  kind: "tool" | "subagent";
  name: string;
  completed: boolean;
  output?: string | undefined;
  data: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function stringField(
  record: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function numberField(
  record: Record<string, unknown> | null | undefined,
  ...keys: string[]
): number | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      return Math.round(value);
    }
  }
  return undefined;
}

function textField(
  record: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}

function eventName(record: Record<string, unknown>): string | undefined {
  return stringField(record, "event", "type");
}

function parseJsonLine(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return undefined;
  }
}

function parseUsage(value: unknown): AgyUsage | undefined {
  const rec = asRecord(value);
  if (!rec) return undefined;
  const usage: AgyUsage = {
    inputTokens: numberField(rec, "input_tokens", "inputTokens", "prompt_tokens"),
    outputTokens: numberField(rec, "output_tokens", "outputTokens", "completion_tokens"),
    cachedInputTokens: numberField(
      rec,
      "cache_read_tokens",
      "cached_input_tokens",
      "cachedInputTokens",
    ),
    reasoningOutputTokens: numberField(
      rec,
      "thinking_tokens",
      "reasoning_output_tokens",
      "reasoningOutputTokens",
    ),
    totalTokens: numberField(rec, "total_tokens", "totalTokens"),
  };
  return Object.values(usage).some((entry) => entry !== undefined) ? usage : undefined;
}

function normalizeModel(
  value: unknown,
): { slug: string; name: string } | undefined {
  if (typeof value === "string") {
    const slug = value.trim();
    return slug.length > 0 ? { slug, name: slug } : undefined;
  }
  const rec = asRecord(value);
  if (!rec) return undefined;
  const slug = stringField(rec, "id", "model", "slug", "name");
  if (!slug) return undefined;
  return {
    slug,
    name: stringField(rec, "display_name", "displayName", "label", "name") ?? slug,
  };
}

/**
 * Parse both the current JSON catalog and older TSV/text `agy models` output.
 * Accepts the installed CLI's `{status, command:{data:{models}}}` envelope
 * without mistaking it for a model id.
 */
export function parseAgyModels(output: string): AgyModelRef[] {
  const trimmed = output.trim();
  const parsed = parseJsonLine(trimmed);
  const parsedRec = asRecord(parsed);
  const command = parsedRec ? asRecord(parsedRec.command) : null;
  const data = command ? asRecord(command.data) : null;
  const jsonValues = Array.isArray(parsed)
    ? (parsed as unknown[])
    : data && Array.isArray(data.models)
      ? (data.models as unknown[])
      : parsedRec && Array.isArray(parsedRec.models)
        ? (parsedRec.models as unknown[])
        : undefined;
  const textOutput =
    parsedRec && typeof parsedRec.response === "string" && parsedRec.status === "SUCCESS"
      ? (parsedRec.response as string)
      : parsed === undefined
        ? output
        : "";
  const candidates =
    jsonValues?.flatMap((value) => {
      const model = normalizeModel(value);
      return model ? [model] : [];
    }) ??
    textOutput.split(/\r?\n/).flatMap((line) => {
      const row = line.trim();
      if (!row) return [];
      const columns = row.split(/\t|\s{2,}/);
      const first = columns[0]?.trim();
      if (
        !first ||
        /^(id|model|name)$/iu.test(first) ||
        !/^[a-z0-9][a-z0-9._/-]*$/iu.test(first)
      ) {
        return [];
      }
      return [{ slug: first, name: columns[1]?.trim() || first }];
    });

  const unique = new Map<string, AgyModelRef>();
  for (const candidate of candidates) {
    unique.set(candidate.slug, candidate);
  }
  return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Resolve MonoCode model settings to a CLI-supported effort. */
export function getAgyEffort(
  modelSettings?: Record<string, string>,
): AgyEffort | undefined {
  const raw =
    modelSettings?.effort ?? modelSettings?.reasoningEffort ?? modelSettings?.reasoning_effort;
  return raw === "low" || raw === "medium" || raw === "high" ? raw : undefined;
}

/** Build the documented Antigravity headless invocation without a shell. */
export function buildAgyArgs(input: AgyCommandInput): string[] {
  const args = ["--input-format", "stream-json", "--output-format", "stream-json"];
  if (input.model) args.push("--model", input.model);
  if (input.effort && ["low", "medium", "high"].includes(input.effort)) {
    args.push("--effort", input.effort);
  }
  if (input.conversationId) args.push("--conversation", input.conversationId);
  if (input.fullAccess) args.push("--dangerously-skip-permissions");
  return args;
}

export function makeAgyUserInput(message: string): string {
  return `${JSON.stringify({ event: "user", message: { content: message } })}\n`;
}

/** Convert Antigravity's NDJSON event stream into canonical data. */
export function parseAgyStream(output: string): AgyStreamResult {
  let conversationId: string | undefined;
  let response: string | undefined;
  let status: string | undefined;
  let error: string | undefined;
  let usage: AgyUsage | undefined;
  const deltas: string[] = [];

  for (const line of output.split(/\r?\n/)) {
    const parsed = parseJsonLine(line);
    const rec = asRecord(parsed);
    if (!rec) continue;
    const name = eventName(rec);
    if (name === "init") {
      conversationId = stringField(rec, "conversation_id", "conversationId", "session_id");
      continue;
    }
    if (name === "step_update") {
      const step =
        asRecord(rec.step_update) ?? asRecord(rec.step) ?? rec;
      const delta = textField(step, "text_delta", "textDelta", "delta");
      const stepType = stringField(step, "step_type", "stepType", "type");
      if (delta && (!stepType || stepType === "agent_response")) deltas.push(delta);
      continue;
    }
    if (name === "result") {
      const result = asRecord(rec.result) ?? rec;
      response = textField(result, "response", "content", "text");
      status = stringField(result, "status");
      error = stringField(result, "error", "message");
      usage = parseUsage(result.usage);
      conversationId ??= stringField(result, "conversation_id", "conversationId", "session_id");
    }
  }

  return { conversationId, deltas, response, status, error, usage };
}

export function conversationIdFromResumeCursor(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  const rec = asRecord(value);
  if (!rec) return undefined;
  return stringField(rec, "conversationId", "conversation_id");
}

/** Retain tool/subagent detail without coupling to AGY's native shapes. */
export function parseAgyToolUpdate(line: string): AgyToolUpdate | undefined {
  const parsed = parseJsonLine(line);
  const rec = asRecord(parsed);
  if (!rec || rec.event !== "step_update") return undefined;
  const step = asRecord(rec.step_update);
  if (!step) return undefined;
  const index = numberField(step, "step_index");
  if (index === undefined) return undefined;
  const subagent = asRecord(step.subagent_info) != null;
  if (step.step_type !== "tool" && !subagent) return undefined;
  const info = asRecord(step.tool_info);
  return {
    index,
    kind: subagent ? "subagent" : "tool",
    name:
      stringField(step, "tool_name") ??
      (info ? stringField(info, "name") : undefined) ??
      (subagent ? "Subagent" : "Antigravity tool"),
    completed: step.state === "DONE",
    output: info ? textField(info, "output") : undefined,
    data: subagent ? step.subagent_info : step.tool_info,
  };
}

export function modelsFromAntigravityOutput(output: string): AgentModel[] {
  return parseAgyModels(output).map((model) => ({
    id: `antigravity:${model.slug}`,
    harness: "antigravity" as const,
    name: model.name,
    nativeId: model.slug,
  }));
}
