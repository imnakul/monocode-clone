import { describe, expect, it } from "vitest";
import { applyHarnessEvent, stopStreaming, appendUser } from "./apply";
import { newSession, type Session } from "../session";
import {
  diffCodexUsage,
  parseClaudeUsage,
  sumProcessedUsage,
  subtractCodexUsage,
  emptyCodexUsage,
  type CodexRawUsageRecord,
  type ProcessedUsage,
} from "../tokenAccounting";

describe("Token Usage Lifecycle & Reducer", () => {
  it("updates liveTurnUsage and stamps active block on usage event", () => {
    let session = newSession("codex", "/project");
    session = appendUser(session, "Help me write a test");
    expect(session.blocks.length).toBe(1);
    expect(session.blocks[0].turnUsage).toBeUndefined();
    expect(session.liveTurnUsage).toBeUndefined();

    // In-flight usage event arrives
    const turnUsage1: ProcessedUsage = {
      total: 1200,
      input: 1000,
      cachedInput: 400,
      output: 200,
    };
    const sessionUsage1: ProcessedUsage = {
      total: 5200,
      input: 4500,
      cachedInput: 1500,
      output: 700,
    };

    session = applyHarnessEvent(session, {
      type: "usage",
      turn: turnUsage1,
      session: sessionUsage1,
    });

    expect(session.liveTurnUsage).toEqual(turnUsage1);
    expect(session.blocks[0].turnUsage).toEqual(turnUsage1);

    // Later delta in same turn replaces it
    const turnUsage2: ProcessedUsage = {
      total: 2500,
      input: 1500,
      cachedInput: 400,
      output: 1000,
    };
    session = applyHarnessEvent(session, {
      type: "usage",
      turn: turnUsage2,
      session: { total: 6500, input: 5000, output: 1500 },
    });

    expect(session.liveTurnUsage).toEqual(turnUsage2);
    expect(session.blocks[0].turnUsage).toEqual(turnUsage2);

    // Stop streaming finalizes the turn block and clears liveTurnUsage
    session = stopStreaming(session);
    expect(session.liveTurnUsage).toBeUndefined();
    expect(session.blocks[0].turnUsage).toEqual(turnUsage2);
  });

  it("handles Claude streaming message deduplication by message.id", () => {
    const requestsById = new Map<string, ProcessedUsage>();

    // Chunk 1 for message msg_1
    const rawMsg1Chunk1 = {
      input_tokens: 100,
      cache_read_input_tokens: 500,
      output_tokens: 10,
    };
    const usage1 = parseClaudeUsage(rawMsg1Chunk1)!;
    requestsById.set("msg_1", usage1);
    let inFlight = sumProcessedUsage(Array.from(requestsById.values()));
    expect(inFlight.total).toBe(610);
    expect(inFlight.output).toBe(10);

    // Chunk 2 for same message msg_1 (output grew from 10 to 45)
    const rawMsg1Chunk2 = {
      input_tokens: 100,
      cache_read_input_tokens: 500,
      output_tokens: 45,
    };
    const usage2 = parseClaudeUsage(rawMsg1Chunk2)!;
    requestsById.set("msg_1", usage2); // replaces msg_1, does NOT add 610 + 645
    inFlight = sumProcessedUsage(Array.from(requestsById.values()));
    expect(inFlight.total).toBe(645);
    expect(inFlight.output).toBe(45);

    // Sub-request msg_2 arrives in same turn (e.g. after tool use)
    const rawMsg2 = {
      input_tokens: 200,
      cache_read_input_tokens: 600,
      output_tokens: 80,
    };
    const usageMsg2 = parseClaudeUsage(rawMsg2)!;
    requestsById.set("msg_2", usageMsg2);
    inFlight = sumProcessedUsage(Array.from(requestsById.values()));
    // msg_1 (645) + msg_2 (880) = 1525
    expect(inFlight.total).toBe(1525);
    expect(inFlight.output).toBe(125);
  });

  it("handles Codex cumulative snapshots and resumed thread baseline", () => {
    // Simulated Codex thread with 50,000 historical tokens
    let lastThreadTotal: CodexRawUsageRecord | undefined;
    let threadBaseline: CodexRawUsageRecord | undefined;

    // First turn on a resumed thread
    const notification1 = {
      last: {
        totalTokens: 2500,
        inputTokens: 2000,
        cachedInputTokens: 1000,
        cacheWriteInputTokens: 0,
        outputTokens: 500,
        reasoningOutputTokens: 50,
      },
      total: {
        totalTokens: 52_500,
        inputTokens: 42_000,
        cachedInputTokens: 20_000,
        cacheWriteInputTokens: 0,
        outputTokens: 10_500,
        reasoningOutputTokens: 1_000,
      },
    };

    // On resumed thread: baseline = total - last = 50,000
    if (threadBaseline === undefined) {
      threadBaseline = subtractCodexUsage(notification1.total, notification1.last);
    }
    expect(threadBaseline.totalTokens).toBe(50_000);

    const turn1Usage = diffCodexUsage(notification1.total, threadBaseline);
    // Turn usage is exactly 2,500, NOT 52,500!
    expect(turn1Usage.total).toBe(2500);
    expect(turn1Usage.input).toBe(2000);
    expect(turn1Usage.output).toBe(500);
    lastThreadTotal = notification1.total;

    // Turn 1 completes. Next turn starts.
    threadBaseline = lastThreadTotal; // Baseline for Turn 2 is 52,500

    const notification2 = {
      last: {
        totalTokens: 4000,
        inputTokens: 3000,
        cachedInputTokens: 1500,
        cacheWriteInputTokens: 0,
        outputTokens: 1000,
        reasoningOutputTokens: 100,
      },
      total: {
        totalTokens: 56_500,
        inputTokens: 45_000,
        cachedInputTokens: 21_500,
        cacheWriteInputTokens: 0,
        outputTokens: 11_500,
        reasoningOutputTokens: 1_100,
      },
    };

    const turn2Usage = diffCodexUsage(notification2.total, threadBaseline);
    expect(turn2Usage.total).toBe(4000);
    expect(turn2Usage.input).toBe(3000);
    expect(turn2Usage.output).toBe(1000);
  });
});
