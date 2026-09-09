import type { Block } from "./session";

/**
 * Normalized token usage processed during a user turn or across a session.
 *
 * Distinct from context-window usage (which represents occupancy of the prompt
 * context buffer).
 */
export type ProcessedUsage = {
  /** Total tokens processed (input + output). */
  total: number;
  /** Total input tokens processed. */
  input: number;
  /** Output tokens generated. */
  output: number;
  /**
   * Cached input tokens read from cache.
   * In Codex, this is a subset of inputTokens.
   * In Claude, this is cache_read_input_tokens (a partition of total input).
   */
  cachedInput?: number;
  /**
   * Cache creation / write tokens.
   * Reported by Claude and Codex when supported.
   */
  cacheWrite?: number;
  /**
   * Reasoning tokens generated.
   * In Codex, this is a subset of outputTokens.
   * Undefined when not supported or reported.
   */
  reasoning?: number;
};

export type CodexRawUsageRecord = {
  totalTokens: number;
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
};

export function emptyCodexUsage(): CodexRawUsageRecord {
  return {
    totalTokens: 0,
    inputTokens: 0,
    cachedInputTokens: 0,
    cacheWriteInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
  };
}

export function subtractCodexUsage(
  a: CodexRawUsageRecord,
  b: CodexRawUsageRecord,
): CodexRawUsageRecord {
  return {
    totalTokens: Math.max(0, a.totalTokens - b.totalTokens),
    inputTokens: Math.max(0, a.inputTokens - b.inputTokens),
    cachedInputTokens: Math.max(0, a.cachedInputTokens - b.cachedInputTokens),
    cacheWriteInputTokens: Math.max(
      0,
      a.cacheWriteInputTokens - b.cacheWriteInputTokens,
    ),
    outputTokens: Math.max(0, a.outputTokens - b.outputTokens),
    reasoningOutputTokens: Math.max(
      0,
      a.reasoningOutputTokens - b.reasoningOutputTokens,
    ),
  };
}

/**
 * Converts a Codex cumulative usage snapshot to a ProcessedUsage breakdown,
 * or calculates the turn delta given a baseline snapshot.
 *
 * Codex Accounting Semantics:
 * - `inputTokens` is total input (it already contains `cachedInputTokens`).
 * - `outputTokens` is total output (it already contains `reasoningOutputTokens`).
 * - `totalTokens` is inputTokens + outputTokens.
 * - Subset counters (`cachedInputTokens` and `reasoningOutputTokens`) must NEVER
 *   be added again to total or input/output.
 */
export function diffCodexUsage(
  current: CodexRawUsageRecord,
  baseline?: CodexRawUsageRecord,
): ProcessedUsage {
  const base = baseline ?? emptyCodexUsage();
  const input = Math.max(0, current.inputTokens - base.inputTokens);
  const output = Math.max(0, current.outputTokens - base.outputTokens);
  const total = Math.max(0, current.totalTokens - base.totalTokens);

  const cachedDelta = Math.max(
    0,
    current.cachedInputTokens - base.cachedInputTokens,
  );
  const cacheWriteDelta = Math.max(
    0,
    current.cacheWriteInputTokens - base.cacheWriteInputTokens,
  );
  const reasoningDelta = Math.max(
    0,
    current.reasoningOutputTokens - base.reasoningOutputTokens,
  );

  return {
    total: total > 0 ? total : input + output,
    input,
    output,
    ...(cachedDelta > 0 || current.cachedInputTokens > 0
      ? { cachedInput: cachedDelta }
      : {}),
    ...(cacheWriteDelta > 0 || current.cacheWriteInputTokens > 0
      ? { cacheWrite: cacheWriteDelta }
      : {}),
    ...(reasoningDelta > 0 || current.reasoningOutputTokens > 0
      ? { reasoning: reasoningDelta }
      : {}),
  };
}

export function codexUsageToProcessed(
  record: CodexRawUsageRecord,
): ProcessedUsage {
  return diffCodexUsage(record);
}

/**
 * Parses Claude usage object (from assistant message or result payload).
 *
 * Anthropic Claude Accounting Semantics:
 * - `input_tokens` is raw uncached input.
 * - `cache_read_input_tokens` is tokens read from cache.
 * - `cache_creation_input_tokens` is tokens written to cache.
 * - `output_tokens` is output generated.
 * - Total input = `input_tokens + cache_read_input_tokens + cache_creation_input_tokens`.
 * - Total processed = total input + output_tokens.
 * - Reasoning token breakdown is not reported separately by Claude CLI.
 */
export function parseClaudeUsage(
  usage: Record<string, unknown> | null | undefined,
): ProcessedUsage | undefined {
  if (!usage || typeof usage !== "object") return undefined;

  const rawInput =
    typeof usage.input_tokens === "number" &&
    Number.isFinite(usage.input_tokens) &&
    usage.input_tokens >= 0
      ? Math.round(usage.input_tokens)
      : 0;

  const cacheRead =
    typeof usage.cache_read_input_tokens === "number" &&
    Number.isFinite(usage.cache_read_input_tokens) &&
    usage.cache_read_input_tokens >= 0
      ? Math.round(usage.cache_read_input_tokens)
      : 0;

  const cacheWrite =
    typeof usage.cache_creation_input_tokens === "number" &&
    Number.isFinite(usage.cache_creation_input_tokens) &&
    usage.cache_creation_input_tokens >= 0
      ? Math.round(usage.cache_creation_input_tokens)
      : 0;

  const output =
    typeof usage.output_tokens === "number" &&
    Number.isFinite(usage.output_tokens) &&
    usage.output_tokens >= 0
      ? Math.round(usage.output_tokens)
      : 0;

  const totalInput = rawInput + cacheRead + cacheWrite;
  const total = totalInput + output;

  if (total <= 0 && rawInput === 0 && output === 0) {
    return undefined;
  }

  return {
    total,
    input: totalInput,
    output,
    ...(cacheRead > 0 ? { cachedInput: cacheRead } : {}),
    ...(cacheWrite > 0 ? { cacheWrite } : {}),
  };
}

export function addProcessedUsage(
  a?: ProcessedUsage,
  b?: ProcessedUsage,
): ProcessedUsage | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;

  const cachedInput =
    a.cachedInput != null || b.cachedInput != null
      ? (a.cachedInput ?? 0) + (b.cachedInput ?? 0)
      : undefined;

  const cacheWrite =
    a.cacheWrite != null || b.cacheWrite != null
      ? (a.cacheWrite ?? 0) + (b.cacheWrite ?? 0)
      : undefined;

  const reasoning =
    a.reasoning != null || b.reasoning != null
      ? (a.reasoning ?? 0) + (b.reasoning ?? 0)
      : undefined;

  return {
    total: a.total + b.total,
    input: a.input + b.input,
    output: a.output + b.output,
    ...(cachedInput != null ? { cachedInput } : {}),
    ...(cacheWrite != null ? { cacheWrite } : {}),
    ...(reasoning != null ? { reasoning } : {}),
  };
}

export function sumProcessedUsage(
  usages: Array<ProcessedUsage | undefined>,
): ProcessedUsage | undefined {
  let result: ProcessedUsage | undefined;
  for (const usage of usages) {
    result = addProcessedUsage(result, usage);
  }
  return result;
}

/**
 * Aggregates all completed turn usages in a session plus any active turn usage.
 * Returns undefined if no blocks in the session have usage data (legacy/unsupported session).
 */
export function sessionProcessedUsage(
  blocks: Block[],
  liveTurnUsage?: ProcessedUsage,
): ProcessedUsage | undefined {
  let hasAny = false;
  let accumulated: ProcessedUsage | undefined;

  for (const block of blocks) {
    if (block.role === "user" && block.turnUsage) {
      hasAny = true;
      accumulated = addProcessedUsage(accumulated, block.turnUsage);
    }
  }

  if (liveTurnUsage) {
    hasAny = true;
    accumulated = addProcessedUsage(accumulated, liveTurnUsage);
  }

  return hasAny ? accumulated ?? { total: 0, input: 0, output: 0 } : undefined;
}

/**
 * Validates and sanitizes a ProcessedUsage record for disk persistence.
 */
export function sanitizeProcessedUsage(value: unknown): ProcessedUsage | undefined {
  if (!value || typeof value !== "object") return undefined;
  const obj = value as Record<string, unknown>;

  const total = obj.total;
  const input = obj.input;
  const output = obj.output;

  if (
    typeof total !== "number" ||
    !Number.isFinite(total) ||
    total < 0 ||
    typeof input !== "number" ||
    !Number.isFinite(input) ||
    input < 0 ||
    typeof output !== "number" ||
    !Number.isFinite(output) ||
    output < 0
  ) {
    return undefined;
  }

  const result: ProcessedUsage = {
    total: Math.round(total),
    input: Math.round(input),
    output: Math.round(output),
  };

  if (
    typeof obj.cachedInput === "number" &&
    Number.isFinite(obj.cachedInput) &&
    obj.cachedInput >= 0
  ) {
    result.cachedInput = Math.round(obj.cachedInput);
  }

  if (
    typeof obj.cacheWrite === "number" &&
    Number.isFinite(obj.cacheWrite) &&
    obj.cacheWrite >= 0
  ) {
    result.cacheWrite = Math.round(obj.cacheWrite);
  }

  if (
    typeof obj.reasoning === "number" &&
    Number.isFinite(obj.reasoning) &&
    obj.reasoning >= 0
  ) {
    result.reasoning = Math.round(obj.reasoning);
  }

  return result;
}
