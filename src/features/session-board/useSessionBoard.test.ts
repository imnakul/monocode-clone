// @vitest-environment happy-dom
import { act, createElement, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import type { Session } from "../sessions/model/session";
import type { BoardCard } from "./sessionBoard";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("../../app/shell/WindowControls", () => ({
  WindowControls: () => null,
}));
vi.mock("../../app/shell/TitleBar", () => ({ OverlayNav: () => null }));

let root: Root;
let container: HTMLDivElement;
let rows: Map<string, BoardCard>;
let useBoard: typeof import("./useSessionBoard").useSessionBoard;
let View: typeof import("./ui/SessionBoardView").SessionBoardView;
const onOpenSession = vi.fn(async () => {});
const onClose = vi.fn();
const onWorkspaceHost = vi.fn();
const onPaneVisible = vi.fn();
const session = (overrides: Partial<Session> = {}): Session => ({
  id: "running",
  title: "Already running",
  cwd: "E:/Projects/monocode",
  harness: "claude",
  model: "model",
  runtimeMode: "supervised",
  busy: true,
  blocks: [{ id: "turn-1", role: "user", text: "Work" }],
  ...overrides,
});
function Harness({ sessions }: { sessions: readonly Session[] }) {
  const board = useBoard(sessions);
  return createElement(View, {
    cards: board.cards,
    loading: !board.ready,
    error: board.error,
    onOpenSession,
    onClose,
    onWorkspaceHost,
    onPaneVisible,
  });
}
async function render(sessions: readonly Session[]) {
  await act(async () =>
    root.render(
      createElement(StrictMode, null, createElement(Harness, { sessions })),
    ),
  );
}
async function tick(milliseconds = 150) {
  await act(async () => vi.advanceTimersByTimeAsync(milliseconds));
}
const inColumn = (label: string) =>
  container.querySelector(
    `[aria-label="${label} column"] [data-board-card="running"]`,
  );

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  rows = new Map();
  vi.mocked(invoke)
    .mockReset()
    .mockImplementation(async (command, args) => {
      if (command === "session_board_list")
        return [...rows.values()].map((row) => ({ ...row }));
      if (command === "session_board_upsert") {
        const incoming = args!.card as BoardCard;
        const saved = {
          ...incoming,
          hiddenRunId: rows.get(incoming.sessionId)?.hiddenRunId,
        };
        rows.set(saved.sessionId, saved);
        return { ...saved };
      }
      if (command === "session_board_hide") {
        for (const key of args!.cards as BoardCard[]) {
          const row = rows.get(key.sessionId);
          if (row?.runId === key.runId)
            rows.set(row.sessionId, { ...row, hiddenRunId: row.runId });
        }
        return [...rows.values()].map((row) => ({ ...row }));
      }
      throw new Error(`Unexpected command: ${command}`);
    });
  ({ useSessionBoard: useBoard } = await import("./useSessionBoard"));
  ({ SessionBoardView: View } = await import("./ui/SessionBoardView"));
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("captures an already-running session after StrictMode effect replay without another session update", async () => {
  await render([session()]);
  expect(container.textContent).not.toContain("Loading sessions…");
  await tick();
  expect(inColumn("Progress")).not.toBeNull();
  expect(rows.get("running")?.status).toBe("in_progress");
  expect(
    Array.from(
      container.querySelectorAll("option"),
      (option) => option.textContent,
    ),
  ).toContain("monocode");
});

it("observes the latest streaming snapshot at the throttle deadline without waiting for streaming to stop", async () => {
  await render([session()]);
  for (let index = 1; index <= 5; index++) {
    await tick(25);
    await render([
      session({
        title: `Streaming ${index}`,
        blocks: [
          ...session().blocks,
          { id: "answer", role: "assistant", text: `Token ${index}` },
        ],
      }),
    ]);
  }
  await tick(25);
  expect(inColumn("Progress")).not.toBeNull();
  expect(rows.get("running")?.title).toBe("Streaming 5");
  expect(
    vi
      .mocked(invoke)
      .mock.calls.filter(([command]) => command === "session_board_upsert"),
  ).toHaveLength(1);
});

it("keeps a live run in Progress after hydrating its saved interrupted-run fallback", async () => {
  rows.set("running", {
    sessionId: "running",
    runId: "turn-1",
    title: "Already running",
    cwd: session().cwd,
    harness: "claude",
    model: "model",
    status: "in_progress",
    queuedCount: 0,
    updatedAt: 1,
  });
  await render([session()]);
  await tick();
  expect(inColumn("Progress")).not.toBeNull();
  expect(rows.get("running")?.reason).toBeUndefined();
});

it("captures the latest live status even when native hydration finishes after the throttle deadline", async () => {
  let finish!: (cards: BoardCard[]) => void;
  vi.mocked(invoke).mockImplementationOnce(
    () =>
      new Promise<BoardCard[]>((resolve) => {
        finish = resolve;
      }),
  );
  await render([session()]);
  await render([
    session({ pendingQuestion: {} as Session["pendingQuestion"] }),
  ]);
  await tick();
  expect(container.textContent).toContain("Loading sessions…");
  await act(async () => finish([]));
  expect(inColumn("Needs attention")).not.toBeNull();
});

it("moves live cards through blocked, attention and completion, retains hidden runs, and shows new runs", async () => {
  const board = await import("./sessionBoard");
  await render([session()]);
  await tick();
  expect(inColumn("Progress")).not.toBeNull();
  await render([
    session({ queueStatus: "held", queueHoldReason: "Quota expired" }),
  ]);
  await tick();
  expect(inColumn("Blocked")).not.toBeNull();
  await render([
    session({ pendingQuestion: {} as Session["pendingQuestion"] }),
  ]);
  await tick();
  expect(inColumn("Needs attention")).not.toBeNull();
  const finished = session({ busy: false });
  await act(async () => board.recordBoardOutcome(finished, "done"));
  await render([finished]);
  await tick();
  expect(inColumn("Done")).not.toBeNull();
  await act(async () =>
    container
      .querySelector<HTMLButtonElement>(
        '[aria-label="Remove Already running from board"]',
      )!
      .click(),
  );
  await render([{ ...finished }]);
  await tick();
  expect(container.querySelector('[data-board-card="running"]')).toBeNull();
  await render([
    session({
      blocks: [
        ...finished.blocks,
        { id: "turn-2", role: "user", text: "Again" },
      ],
    }),
  ]);
  await tick();
  expect(inColumn("Progress")).not.toBeNull();
});

it("cancels pending observation when the workspace unmounts", async () => {
  await render([session()]);
  await act(async () => root.render(null));
  await tick();
  expect(rows.size).toBe(0);
  expect(
    vi
      .mocked(invoke)
      .mock.calls.some(([command]) => command === "session_board_upsert"),
  ).toBe(false);
});
