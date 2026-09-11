import { describe, expect, it } from "vitest";
import {
  addProcessedUsage,
  codexUsageToProcessed,
  diffCodexUsage,
  emptyCodexUsage,
  emptyProcessedUsage,
  latestTurnProcessedUsage,
  parseClaudeUsage,
  sanitizeProcessedUsage,
  sessionProcessedUsage,
  subtractCodexUsage,
  sumProcessedUsage,
  type CodexRawUsageRecord,
  type ProcessedUsage,
} from "./tokenAccounting";
import type { Block } from "./session";

describe("tokenAccounting - Codex semantics", () => {
  it("respects Codex subset accounting (input includes cached, output includes reasoning)", () => {
    const raw: CodexRawUsageRecord = {
      totalTokens: 1000,
      inputTokens: 800, // already contains 500 cached
      cachedInputTokens: 500,
      cacheWriteInputTokens: 100,
      outputTokens: 200, // already contains 50 reasoning
      reasoningOutputTokens: 50,
    };

    const processed = codexUsageToProcessed(raw);
    // Total must equal input + output, not double adding subsets
    expect(processed.total).toBe(1000);
    expect(processed.input).toBe(800);
    expect(processed.cachedInput).toBe(500);
    expect(processed.cacheWrite).toBe(100);
    expect(processed.output).toBe(200);
    expect(processed.reasoning).toBe(50);
  });

  it("calculates turn deltas from cumulative snapshots without accumulating duplicates", () => {
    const baseline: CodexRawUsageRecord = {
      totalTokens: 5000,
      inputTokens: 4000,
      cachedInputTokens: 2000,
      cacheWriteInputTokens: 0,
      outputTokens: 1000,
      reasoningOutputTokens: 200,
    };

    const snapshot1: CodexRawUsageRecord = {
      totalTokens: 6200,
      inputTokens: 5000,
      cachedInputTokens: 2500,
      cacheWriteInputTokens: 0,
      outputTokens: 1200,
      reasoningOutputTokens: 300,
    };

    const delta1 = diffCodexUsage(snapshot1, baseline);
    expect(delta1.total).toBe(1200);
    expect(delta1.input).toBe(1000);
    expect(delta1.cachedInput).toBe(500);
    expect(delta1.output).toBe(200);
    expect(delta1.reasoning).toBe(100);

    // Duplicate event with identical snapshot yields identical delta (replacing snapshot, not summing)
    const deltaDuplicate = diffCodexUsage(snapshot1, baseline);
    expect(deltaDuplicate).toEqual(delta1);
  });

  it("handles resumed threads by computing turn baseline as total - last", () => {
    // Thread already has 100,000 historical tokens
    // New turn arrives with last = 5,000, total = 105,000
    const total: CodexRawUsageRecord = {
      totalTokens: 105_000,
      inputTokens: 95_000,
      cachedInputTokens: 80_000,
      cacheWriteInputTokens: 0,
      outputTokens: 10_000,
      reasoningOutputTokens: 1_000,
    };
    const last: CodexRawUsageRecord = {
      totalTokens: 5_000,
      inputTokens: 4_500,
      cachedInputTokens: 3_000,
      cacheWriteInputTokens: 0,
      outputTokens: 500,
      reasoningOutputTokens: 50,
    };

    const baseline = subtractCodexUsage(total, last);
    expect(baseline.totalTokens).toBe(100_000);

    // Turn usage delta attributes only the new turn, not the 100,000 history
    const turnDelta = diffCodexUsage(total, baseline);
    expect(turnDelta.total).toBe(5000);
    expect(turnDelta.input).toBe(4500);
    expect(turnDelta.output).toBe(500);
  });

  it("handles counter reset when compaction causes total to drop below baseline", () => {
    const baseline: CodexRawUsageRecord = {
      totalTokens: 50_000,
      inputTokens: 45_000,
      cachedInputTokens: 0,
      cacheWriteInputTokens: 0,
      outputTokens: 5_000,
      reasoningOutputTokens: 0,
    };
    // Say a reset occurred
    const resetSnapshot: CodexRawUsageRecord = {
      totalTokens: 10_000,
      inputTokens: 9_000,
      cachedInputTokens: 0,
      cacheWriteInputTokens: 0,
      outputTokens: 1_000,
      reasoningOutputTokens: 0,
    };

    // Total < baseline: reset baseline to empty
    const turnDelta = diffCodexUsage(resetSnapshot, emptyCodexUsage());
    expect(turnDelta.total).toBe(10_000);
    expect(turnDelta.input).toBe(9_000);
    expect(turnDelta.output).toBe(1_000);
  });
});

describe("tokenAccounting - Claude semantics", () => {
  it("correctly parses Claude raw usage format", () => {
    const claudeRaw = {
      input_tokens: 1500,
      cache_read_input_tokens: 4000,
      cache_creation_input_tokens: 500,
      output_tokens: 300,
    };

    const parsed = parseClaudeUsage(claudeRaw);
    expect(parsed).toBeDefined();
    // Total input = 1500 + 4000 + 500 = 6000
    expect(parsed?.input).toBe(6000);
    expect(parsed?.cachedInput).toBe(4000);
    expect(parsed?.cacheWrite).toBe(500);
    expect(parsed?.output).toBe(300);
    // Total = 6000 + 300 = 6300
    expect(parsed?.total).toBe(6300);
  });

  it("returns undefined for null or empty usage", () => {
    expect(parseClaudeUsage(null)).toBeUndefined();
    expect(parseClaudeUsage({})).toBeUndefined();
    expect(parseClaudeUsage({ input_tokens: 0, output_tokens: 0 })).toBeUndefined();
  });
});

describe("tokenAccounting - Session aggregation & persistence", () => {
  it("sums completed turns and live usage", () => {
    const blocks: Block[] = [
      {
        id: "1",
        role: "user",
        text: "first turn",
        turnUsage: {
          total: 1000,
          input: 800,
          cachedInput: 400,
          output: 200,
        },
      },
      {
        id: "2",
        role: "assistant",
        text: "response 1",
      },
      {
        id: "3",
        role: "user",
        text: "second turn",
        turnUsage: {
          total: 1500,
          input: 1200,
          cachedInput: 600,
          output: 300,
        },
      },
      {
        id: "4",
        role: "assistant",
        text: "response 2",
      },
    ];

    const sessionTotal = sessionProcessedUsage(blocks);
    expect(sessionTotal).toBeDefined();
    expect(sessionTotal?.total).toBe(2500);
    expect(sessionTotal?.input).toBe(2000);
    expect(sessionTotal?.cachedInput).toBe(1000);
    expect(sessionTotal?.output).toBe(500);
  });

  it("returns undefined when no usage exists in session (avoids invented 0 or estimate)", () => {
    const blocks: Block[] = [
      { id: "1", role: "user", text: "hello" },
      { id: "2", role: "assistant", text: "world" },
    ];
    expect(sessionProcessedUsage(blocks)).toBeUndefined();
    expect(sessionProcessedUsage([])).toBeUndefined();
  });

  it("resolves latest-turn usage from live turn when active, then falls back to completed user block", () => {
    const blocks: Block[] = [
      {
        id: "1",
        role: "user",
        text: "first turn",
        turnUsage: { total: 1000, input: 800, output: 200 },
      },
      { id: "2", role: "assistant", text: "done" },
      {
        id: "3",
        role: "user",
        text: "second turn",
        turnUsage: { total: 2000, input: 1500, output: 500 },
      },
      { id: "4", role: "assistant", text: "in progress" },
    ];

    const liveTurn: ProcessedUsage = { total: 2500, input: 1800, output: 700 };

    // Active streaming: liveTurnUsage takes priority
    expect(latestTurnProcessedUsage(blocks, liveTurn)).toEqual(liveTurn);

    // Completed / idle: falls back to the most recent user block with turnUsage
    expect(latestTurnProcessedUsage(blocks, undefined)).toEqual({
      total: 2000,
      input: 1500,
      output: 500,
    });

    // Session without usage: returns undefined instead of inventing values
    const emptyBlocks: Block[] = [
      { id: "1", role: "user", text: "hello" },
      { id: "2", role: "assistant", text: "hi" },
    ];
    expect(latestTurnProcessedUsage(emptyBlocks, undefined)).toBeUndefined();
    expect(latestTurnProcessedUsage([], undefined)).toBeUndefined();
  });

  it("sanitizes persisted usage and rejects invalid structures", () => {
    expect(sanitizeProcessedUsage(null)).toBeUndefined();
    expect(sanitizeProcessedUsage("invalid")).toBeUndefined();
    expect(sanitizeProcessedUsage({ total: -1, input: 10, output: 5 })).toBeUndefined();
    expect(sanitizeProcessedUsage({ total: 15, input: 10, output: "invalid" })).toBeUndefined();

    const valid: ProcessedUsage = {
      total: 150,
      input: 100,
      cachedInput: 20,
      output: 50,
      reasoning: 10,
    };
    expect(sanitizeProcessedUsage(valid)).toEqual(valid);
  });
});
