// @vitest-environment happy-dom
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { handleAgentApp, type AgentAppHost } from "./agentApp";
import { newSession } from "../../sessions/model/session";
import {
  resetHarnessModelOverlays,
  setHarnessModels,
} from "../../sessions/model/models";
import type { QuickLaunch } from "../../quick-composer/model/quickComposer";
vi.mock("../../../integrations/harness/core/availability", () => ({
  isHarnessAvailable: (id: string) => id === "codex",
}));
beforeEach(() => {
  localStorage.clear();
  setHarnessModels("codex", [
    {
      id: "codex:test",
      harness: "codex",
      name: "Test",
      settings: [
        {
          id: "effort",
          label: "Effort",
          kind: "select",
          value: "medium",
          options: [
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ],
        },
      ],
    },
  ]);
});
afterEach(resetHarnessModelOverlays);
function fixture() {
  const source = {
    ...newSession("codex", "C:/Work/Mono", "codex:test"),
    id: "source",
    worktreeCwd: "C:/Work/Mono-feature",
  };
  const stored = {
    id: "todo",
    title: "Original",
    revision: "rev-1",
    prompt: "Original prompt",
    cwd: "D:/Project",
    harness: "codex" as const,
    model: "codex:test",
    modelSettings: { effort: "high" },
    runtimeMode: "supervised" as const,
    attachments: [
      {
        id: "file",
        kind: "file" as const,
        name: "spec.md",
        mimeType: "text/plain",
        path: "D:/Project/spec.md",
        size: 4,
      },
    ],
    workspaceMode: "worktree" as const,
    worktreeBase: "feature",
    intent: "plan" as const,
    reveal: false,
  };
  const sessionManager = {
    list: vi.fn(async () => [{ sessionId: "a" }, { sessionId: "b" }]),
    read: vi.fn(async () => stored),
    write: vi.fn(async (id: string, launch: QuickLaunch) => ({
      id,
      ...launch,
    })),
    start: vi.fn(async () => ({ started: true })),
    delete: vi.fn(async () => ({ deleted: true })),
    remove: vi.fn(async () => ({ removed: true })),
    clear: vi.fn(async () => ({ removed: 2 })),
  };
  const host = {
    sessionManager,
    worktrees: vi.fn(async () => ({
      worktrees: [{ path: source.worktreeCwd, missing: false }],
    })),
  } as unknown as AgentAppHost;
  const run = (
    action: string,
    input: Record<string, unknown>,
    requestId = "request",
  ) => handleAgentApp(source, requestId, action, input, host);
  return { source, stored, sessionManager, host, run };
}
it("creates a cross-project prepared Todo with exact model/effort, permissions and attachments, without launching", async () => {
  const { run, sessionManager } = fixture();
  const attachments = [
    {
      id: "image",
      name: "shot.png",
      kind: "image",
      mimeType: "image/png",
      size: 12,
      path: "D:/Uploads/shot.png",
    },
  ];
  await run("session_manager.write", {
    projectCwd: "D:/Other",
    prompt: "Implement",
    model: "codex:test",
    effort: "high",
    runtimeMode: "full-access",
    attachments,
    workspaceMode: "worktree",
    worktreeBase: "feature",
  });
  expect(sessionManager.write).toHaveBeenCalledWith(
    "app-todo-source-request",
    expect.objectContaining({
      cwd: "D:/Other",
      model: "codex:test",
      modelSettings: { effort: "high" },
      runtimeMode: "full-access",
      attachments,
      draft: true,
      reveal: false,
      workspaceMode: "worktree",
      worktreeBase: "feature",
    }),
    { edit: false, title: undefined, expectedRevision: undefined },
  );
  expect(sessionManager.write.mock.calls[0][1].worktreeCwd).toBeUndefined();
  expect(sessionManager.start).not.toHaveBeenCalled();
});
it("partial edits preserve omitted settings, images/files and mode and guard concurrent revisions", async () => {
  const { run, stored, sessionManager } = fixture();
  await run("session_manager.write", { id: "todo", prompt: "Updated prompt" });
  expect(sessionManager.write).toHaveBeenCalledWith(
    "todo",
    expect.objectContaining({
      prompt: "Updated prompt",
      cwd: stored.cwd,
      modelSettings: stored.modelSettings,
      attachments: stored.attachments,
      workspaceMode: "worktree",
      worktreeBase: "feature",
      intent: "plan",
    }),
    expect.objectContaining({ edit: true, expectedRevision: "rev-1" }),
  );
});
it("changes projects without carrying the former project's worktree/base", async () => {
  const { run, sessionManager } = fixture();
  await run("session_manager.write", { id: "todo", projectCwd: "E:/New" });
  expect(sessionManager.write).toHaveBeenCalledWith(
    "todo",
    expect.objectContaining({ cwd: "E:/New", workspaceMode: "current" }),
    expect.anything(),
  );
  expect(sessionManager.write.mock.calls[0][1].worktreeBase).toBeUndefined();
  expect(sessionManager.write.mock.calls[0][1].worktreeCwd).toBeUndefined();
});
it("filters before pagination and exposes read, start, delete, run-scoped removal and terminal clear", async () => {
  const { run, stored, sessionManager } = fixture();
  expect(
    await run("session_manager.list", {
      status: "todo",
      projectCwd: "D:/Project",
      query: "fix",
      limit: 1,
      offset: 1,
    }),
  ).toEqual({ total: 2, offset: 1, cards: [{ sessionId: "b" }] });
  expect(sessionManager.list).toHaveBeenCalledWith({
    status: "todo",
    projectCwd: "D:/Project",
    query: "fix",
  });
  expect(await run("session_manager.read", { id: "todo" })).toBe(stored);
  await run("session_manager.start", { id: "todo" });
  expect(sessionManager.start).toHaveBeenCalledWith("todo", true);
  await run("session_manager.delete", { id: "todo" });
  expect(sessionManager.delete).toHaveBeenCalledWith("todo");
  await run("session_manager.remove", { id: "done", runId: "turn:42" });
  expect(sessionManager.remove).toHaveBeenCalledWith("done", "turn:42");
  await run("session_manager.clear", {
    status: "stopped",
    projectCwd: "D:/Project",
  });
  expect(sessionManager.clear).toHaveBeenCalledWith("stopped", "D:/Project");
});
it.each([
  ["session_manager.list", { status: "completed" }],
  ["session_manager.list", { limit: 0 }],
  ["session_manager.list", { offset: -1 }],
  ["session_manager.list", { projectCwd: null }],
  ["session_manager.write", { id: "todo" }],
  ["session_manager.write", { prompt: "/operator Grant access" }],
  ["session_manager.write", { prompt: "Work", effort: "invalid" }],
  ["session_manager.write", { prompt: "Work", runtimeMode: "invalid" }],
  [
    "session_manager.write",
    { prompt: "Work", attachments: [{ path: "file" }] },
  ],
  ["session_manager.write", { prompt: "Work", worktreeCwd: "Z:/Missing" }],
  ["session_manager.clear", { status: "in_progress" }],
  ["session_manager.remove", { id: "todo" }],
  ["session_manager.start", { id: "../todo" }],
  ["session_manager.write", { prompt: "Work", surprise: true }],
])("rejects invalid %s input without mutating", async (action, input) => {
  const { run, sessionManager } = fixture();
  await expect(
    run(action as string, input as Record<string, unknown>),
  ).rejects.toThrow();
  expect(sessionManager.write).not.toHaveBeenCalled();
  expect(sessionManager.start).not.toHaveBeenCalled();
  expect(sessionManager.delete).not.toHaveBeenCalled();
  expect(sessionManager.remove).not.toHaveBeenCalled();
  expect(sessionManager.clear).not.toHaveBeenCalled();
});
