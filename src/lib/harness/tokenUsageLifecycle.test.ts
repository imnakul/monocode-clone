import { describe, expect, it, vi } from "vitest";
import {
  appendSteerUser,
  appendUser,
  applyHarnessEvent,
  stopStreaming,
} from "./apply";
import { newSession, type Session } from "../session";
import {
  diffCodexUsage,
  emptyCodexUsage,
  latestTurnProcessedUsage,
  parseClaudeUsage,
  sessionProcessedUsage,
  subtractCodexUsage,
  sumProcessedUsage,
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

  it("tracks latest-turn and session telemetry through the reducer lifecycle without double-counting", () => {
    // 8. Preserve the no-telemetry case returning undefined
    let session = newSession("codex", "/project");
    expect(session.liveTurnUsage).toBeUndefined();
    expect(
      latestTurnProcessedUsage(session.blocks, session.liveTurnUsage),
    ).toBeUndefined();
    expect(sessionProcessedUsage(session.blocks)).toBeUndefined();

    // Turn 1 starts (user message added, no telemetry yet)
    session = appendUser(session, "First question");
    expect(
      latestTurnProcessedUsage(session.blocks, session.liveTurnUsage),
    ).toBeUndefined();
    expect(sessionProcessedUsage(session.blocks)).toBeUndefined();

    // 1. Apply a usage event during Turn 1
    const turn1Usage: ProcessedUsage = {
      total: 1000,
      input: 800,
      cachedInput: 200,
      output: 200,
    };
    session = applyHarnessEvent(session, {
      type: "usage",
      turn: turn1Usage,
    });

    // 2. Confirm current user block contains turnUsage and liveTurnUsage is set
    expect(session.blocks[0].turnUsage).toEqual(turn1Usage);
    expect(session.liveTurnUsage).toEqual(turn1Usage);
    expect(
      latestTurnProcessedUsage(session.blocks, session.liveTurnUsage),
    ).toEqual(turn1Usage);

    // 3. Resolve cumulative session usage and confirm active turn is counted exactly once
    const sessionDuringTurn1 = sessionProcessedUsage(session.blocks);
    expect(sessionDuringTurn1).toEqual({
      total: 1000,
      input: 800,
      cachedInput: 200,
      output: 200,
    });

    // 4. Stop streaming
    session = stopStreaming(session);
    expect(session.liveTurnUsage).toBeUndefined();

    // 5. Confirm latest-turn usage is still resolvable from the completed user block
    expect(
      latestTurnProcessedUsage(session.blocks, session.liveTurnUsage),
    ).toEqual(turn1Usage);

    // 6. Confirm cumulative usage remains unchanged after stopping
    expect(sessionProcessedUsage(session.blocks)).toEqual(sessionDuringTurn1);

    // 7. Multi-turn case: start Turn 2
    session = appendUser(session, "Second question");
    expect(session.blocks.length).toBe(2);

    // Before Turn 2 telemetry arrives:
    // Latest turn still resolves to the previous completed turn
    expect(
      latestTurnProcessedUsage(session.blocks, session.liveTurnUsage),
    ).toEqual(turn1Usage);
    // Cumulative session usage still reflects Turn 1
    expect(sessionProcessedUsage(session.blocks)).toEqual(turn1Usage);

    // Apply Turn 2 usage event
    const turn2Usage: ProcessedUsage = {
      total: 1500,
      input: 1100,
      cachedInput: 400,
      output: 400,
    };
    session = applyHarnessEvent(session, {
      type: "usage",
      turn: turn2Usage,
    });

    // During Turn 2 active streaming:
    expect(session.liveTurnUsage).toEqual(turn2Usage);
    expect(session.blocks[1].turnUsage).toEqual(turn2Usage);
    expect(
      latestTurnProcessedUsage(session.blocks, session.liveTurnUsage),
    ).toEqual(turn2Usage);

    // Confirm Turn 1 and Turn 2 are aggregated exactly once (no double counting of active turn)
    expect(sessionProcessedUsage(session.blocks)).toEqual({
      total: 2500,
      input: 1900,
      cachedInput: 600,
      output: 600,
    });

    // Stop streaming on Turn 2
    session = stopStreaming(session);
    expect(session.liveTurnUsage).toBeUndefined();

    // After Turn 2 completion:
    // Latest turn resolves to Turn 2 from the completed user block
    expect(
      latestTurnProcessedUsage(session.blocks, session.liveTurnUsage),
    ).toEqual(turn2Usage);
    // Cumulative usage remains unchanged and counts each completed turn once
    expect(sessionProcessedUsage(session.blocks)).toEqual({
      total: 2500,
      input: 1900,
      cachedInput: 600,
      output: 600,
    });
  });

  it("keeps a single usage owner per provider turn when steering messages are appended", () => {
    let now = 10_000;
    const dateSpy = vi.spyOn(Date, "now").mockImplementation(() => now);

    try {
      // 1. appendUser for Turn 1.
      let session = newSession("codex", "/project");
      session = appendUser(session, "First turn");
      expect(session.blocks).toHaveLength(1);
      const turn1Owner = session.blocks[0];
      expect(turn1Owner.startedAt).toBe(10_000);
      expect(turn1Owner.durationMs).toBeUndefined();
      expect(turn1Owner.turnUsage).toBeUndefined();

      // 2. Apply a usage event with cumulative usage 1,000.
      const turn1UsageEarly: ProcessedUsage = {
        total: 1000,
        input: 800,
        cachedInput: 200,
        output: 200,
      };
      session = applyHarnessEvent(session, {
        type: "usage",
        turn: turn1UsageEarly,
      });
      expect(session.blocks[0].turnUsage).toEqual(turn1UsageEarly);

      // 3. appendSteerUser during the same active turn.
      session = appendSteerUser(session, "Steering message during turn 1");
      expect(session.blocks).toHaveLength(2);
      const steerBlock = session.blocks[1];

      // 4. Confirm the steer block has no startedAt and no independent turnUsage.
      expect(steerBlock.startedAt).toBeUndefined();
      expect(steerBlock.turnUsage).toBeUndefined();
      expect(steerBlock.durationMs).toBeUndefined();

      // 5. Apply a later cumulative usage event with usage 1,500.
      const turn1UsageLate: ProcessedUsage = {
        total: 1500,
        input: 1100,
        cachedInput: 300,
        output: 400,
      };
      session = applyHarnessEvent(session, {
        type: "usage",
        turn: turn1UsageLate,
      });

      // 6. Confirm the original Turn 1 owner now contains 1,500, replacing 1,000.
      expect(session.blocks[0].turnUsage).toEqual(turn1UsageLate);

      // 7. Confirm the steer block still has no turnUsage.
      expect(session.blocks[1].turnUsage).toBeUndefined();

      // 8. Confirm sessionProcessedUsage returns 1,500, not 2,500.
      expect(sessionProcessedUsage(session.blocks)).toEqual(turn1UsageLate);

      // 9. stopStreaming.
      now = 25_000;
      session = stopStreaming(session);

      // 10. Confirm the original owner retains final usage and receives durationMs.
      expect(session.blocks[0].turnUsage).toEqual(turn1UsageLate);
      expect(session.blocks[0].durationMs).toBe(15_000);

      // 11. Confirm the steer block still does not receive duration or usage.
      expect(session.blocks[1].turnUsage).toBeUndefined();
      expect(session.blocks[1].durationMs).toBeUndefined();

      // Also confirm latestTurnProcessedUsage resolves to Turn 1 owner usage when idle
      expect(
        latestTurnProcessedUsage(session.blocks, session.liveTurnUsage),
      ).toEqual(turn1UsageLate);

      // 12. Start a genuinely separate Turn 2 and verify its usage is added once.
      now = 30_000;
      session = appendUser(session, "Second turn");
      expect(session.blocks).toHaveLength(3);
      expect(session.blocks[2].startedAt).toBe(30_000);
      expect(session.blocks[2].durationMs).toBeUndefined();
      expect(session.blocks[2].turnUsage).toBeUndefined();

      const turn2Usage: ProcessedUsage = {
        total: 2000,
        input: 1500,
        cachedInput: 500,
        output: 500,
      };
      session = applyHarnessEvent(session, {
        type: "usage",
        turn: turn2Usage,
      });

      // Turn 2 owner contains 2,000
      expect(session.blocks[2].turnUsage).toEqual(turn2Usage);
      // Turn 1 owner still contains 1,500
      expect(session.blocks[0].turnUsage).toEqual(turn1UsageLate);
      // Steer block still has no turnUsage
      expect(session.blocks[1].turnUsage).toBeUndefined();

      // Total session usage adds Turn 1 (1,500) and Turn 2 (2,000) exactly once = 3,500
      expect(sessionProcessedUsage(session.blocks)).toEqual({
        total: 3500,
        input: 2600,
        cachedInput: 800,
        output: 900,
      });

      // Stop streaming on Turn 2
      now = 42_000;
      session = stopStreaming(session);
      expect(session.blocks[2].durationMs).toBe(12_000);
      expect(session.blocks[2].turnUsage).toEqual(turn2Usage);
      expect(sessionProcessedUsage(session.blocks)).toEqual({
        total: 3500,
        input: 2600,
        cachedInput: 800,
        output: 900,
      });
      expect(
        latestTurnProcessedUsage(session.blocks, session.liveTurnUsage),
      ).toEqual(turn2Usage);
    } finally {
      dateSpy.mockRestore();
    }
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
