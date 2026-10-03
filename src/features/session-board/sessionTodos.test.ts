// @vitest-environment happy-dom
import { beforeEach, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import type { Session } from "../sessions/model/session";
import type { QuickLaunch } from "../quick-composer/model/quickComposer";
import type { BoardCard } from "./sessionBoard";
import { sanitizeSessionForPersist } from "../sessions/data/sessionStore";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("../sessions/model/attachments", async (actual) => ({
  ...(await actual<object>()),
  prepareAttachments: vi.fn(async (files) => files),
}));
let createManager: typeof import("./sessionTodos").sessionTodoManager;
let board: typeof import("./sessionBoard");
let sessions: Map<string, Session>;
let cards: Map<string, BoardCard>;
const launch: QuickLaunch = {
  prompt: "Implement\n\n| A | B |\n|---|---|\n| 1 | 2 |",
  cwd: "C:/Work/Mono",
  harness: "codex",
  model: "gpt-5.4",
  modelSettings: {},
  runtimeMode: "supervised",
  workspaceMode: "worktree",
  worktreeBase: "feature/spec",
  intent: "plan",
  attachments: [
    {
      id: "image",
      name: "shot.png",
      kind: "image",
      mimeType: "image/png",
      size: 10,
      path: "C:/Uploads/shot.png",
    },
    {
      id: "file",
      name: "spec.md",
      kind: "file",
      mimeType: "text/plain",
      size: 5,
      path: "C:/Work/Mono/spec.md",
    },
  ],
  reveal: false,
};
function fixture() {
  const host = {
    read: vi.fn(async (id: string) => sessions.get(id) ?? null),
    save: vi.fn(async (session: Session) => {
      const stored = sanitizeSessionForPersist(session);
      sessions.set(session.id, { ...session, ...stored });
    }),
    erase: vi.fn(async (session: Session) => {
      sessions.delete(session.id);
    }),
    open: vi.fn(async (id: string) => sessions.get(id) ?? null),
    submit: vi.fn(
      async (
        id: string,
        text: string,
        attachments: QuickLaunch["attachments"],
        options: {
          draftBlockId?: string;
          intent?: string;
          appRequestId?: string;
        },
      ) => {
        const session = sessions.get(id)!;
        sessions.set(id, {
          ...session,
          busy: true,
          blocks: [
            {
              id: "running",
              role: "user",
              text,
              attachments,
              appRequestId: options.appRequestId,
            },
          ],
        });
        return true;
      },
    ),
  };
  return { host, manager: createManager(host) };
}
beforeEach(async () => {
  vi.resetModules();
  cards = new Map();
  sessions = new Map();
  vi.mocked(invoke)
    .mockReset()
    .mockImplementation(async (command, args) => {
      if (command === "session_board_list") return [...cards.values()];
      if (command === "session_board_upsert") {
        const card = args!.card as BoardCard;
        const saved = {
          ...card,
          hiddenRunId: cards.get(card.sessionId)?.hiddenRunId,
        };
        cards.set(card.sessionId, saved);
        return saved;
      }
      if (command === "session_board_hide") {
        for (const request of args!.cards as BoardCard[]) {
          const card = cards.get(request.sessionId);
          if (card?.runId === request.runId)
            cards.set(card.sessionId, {
              ...card,
              hiddenRunId: args!.hidden ? card.runId : undefined,
            });
        }
        return [...cards.values()];
      }
      return undefined;
    });
  ({ sessionTodoManager: createManager } = await import("./sessionTodos"));
  board = await import("./sessionBoard");
});
it("persists an unsent Todo including exact Markdown, images/files, project, permissions and deferred workspace", async () => {
  const { host, manager } = fixture();
  await manager.write("todo", launch);
  expect(host.open).not.toHaveBeenCalled();
  expect(host.submit).not.toHaveBeenCalled();
  expect(sessions.get("todo")).toMatchObject({
    cwd: launch.cwd,
    harness: "codex",
    runtimeMode: "supervised",
    workspaceMode: "worktree",
    worktreeBase: "feature/spec",
    blocks: [
      {
        text: launch.prompt,
        draft: true,
        intent: "plan",
        attachments: launch.attachments,
      },
    ],
  });
  expect((await manager.list())[0]).toMatchObject({
    sessionId: "todo",
    status: "todo",
  });
  // New manager represents a reloaded UI; data comes from persisted sessions and ledger.
  const loaded = await fixture().manager.read("todo");
  expect(loaded).toMatchObject({
    prompt: launch.prompt,
    attachments: launch.attachments,
    worktreeBase: "feature/spec",
    intent: "plan",
  });
});
it("safely retries a saved create, rejects ID reuse, and updates an unsent draft without changing its run ID", async () => {
  const { host, manager } = fixture();
  await manager.write("todo", launch);
  const draftId = sessions.get("todo")!.blocks[0].id;
  await manager.write("todo", launch);
  expect(host.save).toHaveBeenCalledOnce();
  await expect(
    manager.write("todo", { ...launch, prompt: "Different" }),
  ).rejects.toThrow("different Todo");
  const original = await manager.read("todo");
  await manager.write(
    "todo",
    {
      ...launch,
      cwd: "D:/Other",
      prompt: "New instructions",
      workspaceMode: "current",
      worktreeBase: undefined,
    },
    { edit: true, expectedRevision: original.revision },
  );
  expect(sessions.get("todo")!.blocks[0].id).toBe(draftId);
  expect(await manager.read("todo")).toMatchObject({
    cwd: "D:/Other",
    prompt: "New instructions",
    workspaceMode: "current",
  });
  await expect(
    manager.write("todo", launch, {
      edit: true,
      expectedRevision: original.revision,
    }),
  ).rejects.toThrow("changed while");
});
it("starts once through the existing draft submission path with all attachments and intent", async () => {
  const { host, manager } = fixture();
  await manager.write("todo", launch);
  const draftId = sessions.get("todo")!.blocks[0].id;
  const results = await Promise.all([
    manager.start("todo"),
    manager.start("todo"),
  ]);
  expect(host.submit).toHaveBeenCalledOnce();
  expect(host.submit).toHaveBeenCalledWith(
    "todo",
    launch.prompt,
    launch.attachments,
    { draftBlockId: draftId, appRequestId: "todo", intent: "plan" },
  );
  expect(results[1]).toMatchObject({ alreadyStarted: true });
  await expect(manager.write("todo", launch, { edit: true })).rejects.toThrow(
    "already started",
  );
  await expect(manager.delete("todo")).rejects.toThrow("unsent Todo");
  await board.observeBoardSessions([...sessions.values()]);
  expect((await manager.list())[0].status).toBe("in_progress");
});
it("retains the draft after rejected submission and can retry", async () => {
  const { host, manager } = fixture();
  await manager.write("todo", launch);
  host.submit.mockResolvedValueOnce(false);
  await expect(manager.start("todo")).rejects.toThrow("retained");
  expect(sessions.get("todo")!.blocks[0].draft).toBe(true);
  expect(await manager.start("todo")).toMatchObject({ started: true });
});
it("deletes only unsent Todos and terminal clearing retains actual sessions", async () => {
  const { host, manager } = fixture();
  await manager.write("todo", launch);
  await manager.delete("todo");
  expect(sessions.has("todo")).toBe(false);
  expect(await manager.list()).toEqual([]);
  await manager.write("done", launch);
  await manager.start("done");
  await board.recordBoardOutcome(
    { ...sessions.get("done")!, busy: false },
    "done",
  );
  await manager.write("pending", launch);
  await manager.clear("done", "c:\\work\\mono");
  expect(sessions.has("done")).toBe(true);
  expect(host.erase).toHaveBeenCalledOnce();
  expect((await manager.list()).map((card) => card.sessionId)).toEqual([
    "pending",
  ]);
});
it("guards stale terminal removal against a new run and rejects removing running cards", async () => {
  const { manager } = fixture();
  await manager.write("todo", launch);
  await manager.start("todo");
  await board.recordBoardOutcome(
    { ...sessions.get("todo")!, busy: false },
    "done",
  );
  const old = (await manager.list())[0];
  sessions.set("todo", {
    ...sessions.get("todo")!,
    blocks: [{ id: "new-run", role: "user", text: "New run" }],
    busy: true,
  });
  await board.observeBoardSessions([...sessions.values()]);
  await expect(manager.remove("todo", old.runId)).rejects.toThrow(
    "run changed",
  );
  await expect(manager.remove("todo", "new-run")).rejects.toThrow("Only done or stopped");
});
it("rejects invalid payloads and remote projects without saving or starting", async () => {
  const { host, manager } = fixture();
  await expect(
    manager.write("todo", {
      ...launch,
      attachments: [{ ...launch.attachments![0], path: "" }],
    }),
  ).rejects.toThrow("valid prompt");
  await expect(
    manager.write("todo", { ...launch, cwd: "ssh://host/project" }),
  ).rejects.toThrow("local project");
  expect(host.save).not.toHaveBeenCalled();
  expect(host.submit).not.toHaveBeenCalled();
});
it("protects the existing Operator child-access guard for user-authored Todos", async () => {
  const { host, manager } = fixture();
  await manager.write("todo", {
    ...launch,
    prompt: "/operator Change the app",
    intent: undefined,
  });
  await expect(manager.start("todo", true)).rejects.toThrow(
    "cannot enable /operator",
  );
  expect(host.submit).not.toHaveBeenCalled();
  await manager.start("todo");
  expect(host.submit).toHaveBeenCalledOnce();
});
it("recovers from a failed save without publishing an unsaved Todo", async () => {
  const { host, manager } = fixture();
  host.save.mockRejectedValueOnce(new Error("disk full"));
  await expect(manager.write("todo", launch)).rejects.toThrow("disk full");
  expect(await manager.list()).toEqual([]);
  await manager.write("todo", launch);
  expect((await manager.list())[0].status).toBe("todo");
});

it("prevents a duplicate start even before the UI has published accepted draft promotion", async () => {
  const { host, manager } = fixture();
  await manager.write("todo", launch);
  host.submit.mockImplementation(async () => true);
  expect(await manager.start("todo")).toMatchObject({ alreadyStarted: false });
  expect(await manager.start("todo")).toMatchObject({ alreadyStarted: true });
  expect(host.submit).toHaveBeenCalledOnce();
});

it("rejects oversized IDs before saving a session that the board cannot store", async () => {
  const { host, manager } = fixture();
  await expect(manager.write("a".repeat(257), launch)).rejects.toThrow(
    "maximum 256",
  );
  expect(host.save).not.toHaveBeenCalled();
  expect(await manager.list()).toEqual([]);
});
