import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import type { Session } from "../sessions/model/session";

import {
  boardCardTag,
  boardLane,
  isBoardStatus,
  projectBoardCard,
  visibleBoardCards,
  type BoardCard,
} from "./sessionBoard";
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
function session(overrides: Partial<Session> = {}): Session {
  return {
    id: "session-1",
    harness: "claude",
    model: "model",
    runtimeMode: "supervised",
    cwd: "/project",
    title: "Run",
    blocks: [{ id: "turn-1", role: "user", text: "Work" }],
    ...overrides,
  };
}
function card(status: BoardCard["status"]): BoardCard {
  return {
    ...projectBoardCard(session({ busy: true }), undefined, 1)!,
    status,
  };
}
describe("session board lifecycle", () => {
  it("uses structured activity, approvals, queues, drafts and errors", () => {
    expect(projectBoardCard(session({ busy: true }))?.status).toBe(
      "in_progress",
    );
    expect(
      projectBoardCard(
        session({
          busy: true,
          usageLimit: {},
        }),
      )?.status,
    ).toBe("blocked");
    expect(
      projectBoardCard(
        session({
          busy: true,
          pendingQuestion: {} as Session["pendingQuestion"],
        }),
      )?.status,
    ).toBe("needs_attention");
    expect(
      projectBoardCard(
        session({
          blocks: [{ id: "draft", role: "user", text: "Later", draft: true }],
        }),
      )?.status,
    ).toBe("todo");
    expect(
      projectBoardCard(
        session({
          blocks: [
            ...session().blocks,
            {
              id: "error",
              role: "system",
              text: "Authentication failed",
              notice: "error",
            },
          ],
        }),
      )?.reason,
    ).toBe("Authentication failed");
  });
  it("retains completed and stopped results when viewed and metadata changes", () => {
    expect(
      projectBoardCard(session({ title: "Renamed", busy: false }), card("done"))
        ?.status,
    ).toBe("done");
    expect(
      projectBoardCard(
        session({ usageLimit: {} as Session["usageLimit"] }),
        card("stopped"),
      )?.status,
    ).toBe("stopped");
    expect(projectBoardCard(session(), card("done"), 20)?.updatedAt).toBe(1);
  });
  it("a new turn or draft reappears after removing the prior run", () => {
    const removed = { ...card("done"), hiddenRunId: "turn-1" };
    expect(visibleBoardCards([removed])).toEqual([]);
    const next = projectBoardCard(
      session({
        busy: true,
        blocks: [
          ...session().blocks,
          { id: "turn-2", role: "user", text: "Again" },
        ],
      }),
      removed,
    )!;
    expect(next.status).toBe("in_progress");
    expect(visibleBoardCards([next])).toEqual([next]);
  });
  it("does not create cards for empty or inbox sessions", () => {
    expect(projectBoardCard(session({ blocks: [] }))).toBeNull();
    expect(
      projectBoardCard(session({ inboxAsk: {} as Session["inboxAsk"] })),
    ).toBeNull();
  });
  it("does not turn unknown idle history into a failure or a success", () => {
    expect(projectBoardCard(session())).toBeNull();
    expect(
      projectBoardCard(
        session({
          blocks: [
            { id: "turn-1", role: "user", text: "Work", durationMs: 1000 },
            { id: "reply", role: "assistant", text: "Completed successfully" },
          ],
        }),
      ),
    ).toBeNull();
    const legacy = {
      ...card("blocked"),
      reason: "Earlier run has no recorded result; review the session",
    };
    expect(projectBoardCard(session(), legacy)).toBeNull();
    expect(projectBoardCard(session({ busy: true }), legacy)).toMatchObject({
      status: "in_progress",
      reason: undefined,
    });
    expect(projectBoardCard(session(), card("in_progress"))).toMatchObject({
      status: "blocked",
      reason: "Previous run was interrupted; review the session",
    });
  });
  it("stores the model that ran the turn and normalizes the title", () => {
    const next = projectBoardCard(
      session({
        busy: true,
        title: "  A   title  ",
        model: "next-choice",
        blocks: [
          {
            id: "turn-1",
            role: "user",
            text: "Work",
            turnModel: {
              harness: "codex",
              id: "actual-model",
              name: "Actual Model",
            },
          },
        ],
      }),
    )!;
    expect(next).toMatchObject({
      harness: "codex",
      model: "Actual Model",
      title: "A title",
    });
  });
});
describe("board lanes and tags", () => {
  it("folds six stored statuses into four columns", () => {
    expect(boardLane(card("todo"))).toBe("draft");
    expect(
      boardLane({ ...card("todo"), reason: "Messages are queued" }),
    ).toBe("in_progress");
    expect(boardLane(card("in_progress"))).toBe("in_progress");
    expect(boardLane(card("needs_attention"))).toBe("needs_attention");
    expect(boardLane(card("blocked"))).toBe("needs_attention");
    expect(boardLane(card("done"))).toBe("done");
    expect(boardLane(card("stopped"))).toBe("done");
  });
  it("names why a run needs you and how it finished", () => {
    const tag = (status: BoardCard["status"], reason?: string) =>
      boardCardTag({ ...card(status), reason }).label;
    expect(tag("todo")).toBe("Draft");
    expect(tag("todo", "Messages are queued")).toBe("Queued");
    expect(tag("needs_attention", "Waiting for your permission")).toBe(
      "Permission",
    );
    expect(tag("needs_attention", "Waiting for your answer")).toBe("Question");
    expect(tag("blocked", "The provider reached its usage limit")).toBe(
      "Usage limit",
    );
    expect(tag("blocked", "The provider reached its usage limit")).toBe("Usage limit");
    expect(
      tag("blocked", "Previous run was interrupted; review the session"),
    ).toBe("Interrupted");
    expect(tag("blocked", "Authentication failed")).toBe("Failed");
    expect(tag("done")).toBe("Done");
    expect(tag("stopped")).toBe("Stopped");
  });
  it("tells a permission request from a question", () => {
    expect(
      projectBoardCard(
        session({
          busy: true,
          pendingQuestion: {} as Session["pendingQuestion"],
        }),
      )?.reason,
    ).toBe("Waiting for your answer");
  });
  it("accepts only stored statuses for Operator filters", () => {
    expect(isBoardStatus("blocked")).toBe(true);
    expect(isBoardStatus("draft")).toBe(false);
  });
});
describe("durable board ledger", () => {
  let rows: Map<string, BoardCard>;
  beforeEach(() => {
    vi.resetModules();
    rows = new Map();
    vi.mocked(invoke)
      .mockReset()
      .mockImplementation(async (command, args) => {
        if (command === "session_board_list") return [...rows.values()];
        if (command === "session_board_upsert") {
          const incoming = args!.card as BoardCard;
          const saved = {
            ...incoming,
            hiddenRunId: rows.get(incoming.sessionId)?.hiddenRunId,
          };
          rows.set(saved.sessionId, saved);
          return saved;
        }
        if (command === "session_board_hide") {
          for (const key of args!.cards as BoardCard[]) {
            const row = rows.get(key.sessionId);
            if (row?.runId === key.runId)
              rows.set(row.sessionId, { ...row, hiddenRunId: row.runId });
          }
          return [...rows.values()];
        }
        throw new Error(command);
      });
  });
  it("restores terminal cards and diagnoses interrupted runs on restart", async () => {
    rows.set("done", { ...card("done"), sessionId: "done" });
    rows.set("busy", { ...card("in_progress"), sessionId: "busy" });
    const board = await import("./sessionBoard");
    await board.loadBoard();
    expect(
      board.boardSnapshot().cards.find((row) => row.sessionId === "done")
        ?.status,
    ).toBe("done");
    expect(
      board.boardSnapshot().cards.find((row) => row.sessionId === "busy")
        ?.status,
    ).toBe("blocked");
  });
  it("keeps hide tombstones during observation and keeps new runs visible", async () => {
    const board = await import("./sessionBoard");
    await board.recordBoardOutcome(session(), "done");
    await board.hideBoardCards(board.boardSnapshot().cards);
    await board.observeBoardSessions([session()]);
    expect(board.visibleBoardCards(board.boardSnapshot().cards)).toEqual([]);
    await board.observeBoardSessions([
      session({
        busy: true,
        blocks: [{ id: "next", role: "user", text: "Again" }],
      }),
    ]);
    expect(board.visibleBoardCards(board.boardSnapshot().cards)).toHaveLength(
      1,
    );
  });
  it("records provider failure and explicit stop without inferring assistant prose", async () => {
    const board = await import("./sessionBoard");
    await board.recordBoardOutcome(session(), "blocked", "provider failed");
    expect(board.boardSnapshot().cards[0].status).toBe("blocked");
    await board.recordBoardOutcome(session(), "stopped", "Stopped by you");
    await board.observeBoardSessions([session()]);
    expect(board.boardSnapshot().cards[0].status).toBe("stopped");
  });
  it("ignores idle history but records explicit terminal outcomes without prior observation", async () => {
    const board = await import("./sessionBoard");
    await board.observeBoardSessions([session()]);
    expect(rows.size).toBe(0);
    await board.recordBoardOutcome(session(), "done");
    expect(rows.get("session-1")?.status).toBe("done");
    await board.observeBoardSessions([session()]);
    expect(board.visibleBoardCards(board.boardSnapshot().cards)).toHaveLength(
      1,
    );
  });
  it("skips unchanged sessions on repeated observation but still records real changes", async () => {
    const board = await import("./sessionBoard");
    const running = session({ busy: true });
    await board.observeBoardSessions([running]);
    const upserts = () =>
      vi
        .mocked(invoke)
        .mock.calls.filter(([command]) => command === "session_board_upsert")
        .length;
    const afterFirst = upserts();
    expect(afterFirst).toBe(1);
    // The same session objects again (another session streamed): no work.
    for (let pass = 0; pass < 5; pass++)
      await board.observeBoardSessions([running]);
    expect(upserts()).toBe(afterFirst);
    // A real change to this session (it hit an error) is still recorded.
    await board.observeBoardSessions([
      {
        ...running,
        blocks: [
          ...running.blocks,
          { id: "fail", role: "assistant", text: "Provider failed", notice: "error" },
        ],
      },
    ]);
    expect(upserts()).toBe(afterFirst + 1);
    expect(board.boardSnapshot().cards[0].status).toBe("blocked");
  });
  it("exposes storage failures and retries without losing session state", async () => {
    const board = await import("./sessionBoard");
    vi.mocked(invoke).mockRejectedValueOnce(new Error("Database unavailable"));
    await board.loadBoard();
    expect(board.boardSnapshot().error).toContain("Database unavailable");
    expect(board.boardSnapshot().ready).toBe(false);
    await board.loadBoard();
    await board.observeBoardSessions([session({ busy: true })]);
    expect(board.boardSnapshot().error).toBeNull();
    expect(board.boardSnapshot().cards[0].status).toBe("in_progress");
  });
});
