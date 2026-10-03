// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { handleAgentApp, type AgentAppHost } from "./agentApp";
import { newSession } from "../../sessions/model/session";
import { type Task, type TaskChanges, type TaskUpsert } from "../../tasks";
function fixture() {
  const source = { ...newSession("codex", "C:/Work/Mono"), id: "source" };
  const rows = new Map<string, Task>([
    [
      "a",
      {
        id: "a",
        title: "Installer",
        body: "Full body",
        status: "blocked",
        tags: ["windows", "bug"],
        projectCwd: source.cwd,
        sourceSessionId: source.id,
        sourceBlockId: "cline:42",
        createdAt: 1,
        updatedAt: 4,
      },
    ],
    [
      "b",
      {
        id: "b",
        title: "Personal",
        body: "Full body",
        status: "todo",
        tags: ["bug"],
        createdAt: 1,
        updatedAt: 3,
      },
    ],
    [
      "c",
      {
        id: "c",
        title: "Done",
        body: "Full body",
        status: "completed",
        tags: ["windows"],
        projectCwd: source.cwd,
        createdAt: 1,
        updatedAt: 2,
      },
    ],
  ]);
  const host = {
    tasks: vi.fn(async () => [...rows.values()]),
    task: vi.fn(async (id: string) => rows.get(id) ?? null),
    saveTask: vi.fn(async (input: TaskUpsert) => {
      const saved = { ...input, createdAt: 5, updatedAt: 5 };
      rows.set(input.id, saved);
      return saved;
    }),
    updateTask: vi.fn(async (id: string, changes: TaskChanges) => {
      const row = rows.get(id);
      if (!row) throw new Error("Task was not found");
      const saved = {
        ...row,
        ...changes,
        sourceSessionId:
          changes.sourceSessionId === null
            ? undefined
            : (changes.sourceSessionId ?? row.sourceSessionId),
        sourceBlockId:
          changes.sourceBlockId === null
            ? undefined
            : (changes.sourceBlockId ?? row.sourceBlockId),
        projectCwd:
          changes.projectCwd === null
            ? undefined
            : (changes.projectCwd ?? row.projectCwd),
      };
      rows.set(id, saved);
      return saved;
    }),
    deleteTask: vi.fn(async (id: string) => {
      rows.delete(id);
    }),
  } as unknown as AgentAppHost;
  const run = (
    action: string,
    input: Record<string, unknown>,
    requestId = "request",
  ) => handleAgentApp(source, requestId, action, input, host);
  return { source, rows, host, run };
}
describe("Operator Tasks", () => {
  it("filters before pagination, reports filtered total, and omits full bodies from list", async () => {
    const { run } = fixture();
    const result = await run("tasks.list", {
      statuses: ["Todo", "Blocked"],
      tags: ["#BUG"],
      tagMatch: "all",
      query: "Full",
      limit: 1,
      offset: 1,
    });
    expect(result).toMatchObject({
      total: 2,
      offset: 1,
      tasks: [{ id: "b", preview: "Full body" }],
    });
    expect((result as { tasks: unknown[] }).tasks[0]).not.toHaveProperty(
      "body",
    );
    expect(
      await run("tasks.list", {
        status: "blocked",
        tags: ["bug", "windows"],
        projectCwd: "c:\\work\\mono",
      }),
    ).toMatchObject({ total: 1, tasks: [{ id: "a" }] });
    expect(await run("tasks.list", { projectCwd: null })).toMatchObject({
      total: 1,
      tasks: [{ id: "b" }],
    });
    expect(
      await run("tasks.list", {
        tags: ["missing", "windows"],
        tagMatch: "any",
      }),
    ).toMatchObject({ total: 2 });
  });
  it("creates title-only tasks with source/project defaults, supports Personal and idempotent retries", async () => {
    const { run, host } = fixture();
    const input = {
      title: "New task",
      tags: ["#BUG"],
      status: "Progress",
      sourceBlockId: "cline:42",
    };
    const task = await run("tasks.write", input);
    expect(task).toMatchObject({
      id: "app-source-request",
      title: "New task",
      body: "",
      status: "in_progress",
      projectCwd: "C:/Work/Mono",
      sourceSessionId: "source",
      sourceBlockId: "cline:42",
      tags: ["bug"],
    });
    expect(await run("tasks.write", input)).toEqual(task);
    expect(host.saveTask).toHaveBeenCalledOnce();
    await expect(run("tasks.write", { title: "different" })).rejects.toThrow(
      "already used",
    );
    expect(
      await run(
        "tasks.write",
        { body: "Personal task", projectCwd: null },
        "personal",
      ),
    ).toMatchObject({ status: "todo", projectCwd: undefined });
  });
  it("reads full tasks, updates only provided fields, and deletes", async () => {
    const { run, rows } = fixture();
    expect(await run("tasks.read", { id: "a" })).toMatchObject({
      body: "Full body",
      sourceBlockId: "cline:42",
    });
    expect(
      await run("tasks.write", {
        id: "a",
        status: "completed",
        tags: ["review"],
        projectCwd: null,
      }),
    ).toMatchObject({
      title: "Installer",
      body: "Full body",
      sourceSessionId: "source",
      sourceBlockId: "cline:42",
      projectCwd: undefined,
    });
    expect(await run("tasks.delete", { id: "a" })).toEqual({
      id: "a",
      deleted: true,
    });
    expect(rows.has("a")).toBe(false);
    await expect(run("tasks.read", { id: "a" })).rejects.toThrow("not found");
  });
  it("supports explicit source unlinking and bounds opaque source IDs in UTF-8 bytes", async () => {
    const { run } = fixture();
    expect(
      await run("tasks.write", {
        id: "a",
        sourceSessionId: null,
        sourceBlockId: null,
      }),
    ).toMatchObject({
      sourceSessionId: undefined,
      sourceBlockId: undefined,
      projectCwd: "C:/Work/Mono",
    });
    expect(
      await run(
        "tasks.write",
        { title: "Unlinked", sourceSessionId: null },
        "unlinked",
      ),
    ).toMatchObject({ sourceSessionId: undefined });
    await expect(
      run(
        "tasks.write",
        { title: "Too long", sourceBlockId: "界".repeat(171) },
        "long",
      ),
    ).rejects.toThrow("Invalid sourceBlockId");
    expect(
      await run(
        "tasks.write",
        { title: "Bounded", sourceBlockId: "界".repeat(170) },
        "bounded",
      ),
    ).toHaveProperty("sourceBlockId", "界".repeat(170));
  });
  it.each([
    ["tasks.list", { status: "todo", statuses: ["todo"] }],
    ["tasks.list", { status: "bad" }],
    ["tasks.list", { statuses: "todo" }],
    ["tasks.list", { tags: [42] }],
    ["tasks.list", { tagMatch: "either" }],
    ["tasks.list", { limit: 0 }],
    ["tasks.list", { offset: -1 }],
    ["tasks.list", { surprise: true }],
    ["tasks.write", {}],
    ["tasks.write", { id: "a" }],
    ["tasks.write", { title: "x", projectCwd: "~" }],
    ["tasks.write", { title: "x", sourceBlockId: "bad\nblock" }],
    ["tasks.delete", { id: "../a" }],
  ])("rejects malformed %s arguments", async (action, input) => {
    await expect(
      fixture().run(action as string, input as Record<string, unknown>),
    ).rejects.toThrow();
  });
  it("filters by focus and archive, and accepts focusDate, archived and retired status names", async () => {
    const { run, rows, host } = fixture();
    const today = new Date();
    const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    rows.set("a", { ...rows.get("a")!, focusDate: day });
    rows.set("c", { ...rows.get("c")!, archivedAt: 9 });
    expect(await run("tasks.list", { focus: true })).toMatchObject({
      total: 1,
      tasks: [{ id: "a" }],
    });
    // Archived tasks are hidden unless asked for.
    expect(await run("tasks.list", {})).toMatchObject({ total: 2 });
    expect(await run("tasks.list", { archived: true })).toMatchObject({
      total: 1,
      tasks: [{ id: "c" }],
    });
    expect(await run("tasks.list", { archived: "all" })).toMatchObject({
      total: 3,
    });
    await run("tasks.write", { id: "b", focusDate: day, archived: true });
    expect(host.updateTask).toHaveBeenLastCalledWith("b", {
      focusDate: day,
      archived: true,
    });
    await run("tasks.write", { id: "b", status: "deferred" });
    expect(host.updateTask).toHaveBeenLastCalledWith("b", {
      status: "todo",
      archived: true,
    });
    await run("tasks.write", { id: "b", status: "done" });
    expect(host.updateTask).toHaveBeenLastCalledWith("b", {
      status: "completed",
    });
    await expect(
      run("tasks.write", { id: "b", focusDate: "03/10/2026" }),
    ).rejects.toThrow("focusDate must be YYYY-MM-DD or null");
    await expect(run("tasks.list", { archived: "yes" })).rejects.toThrow(
      'archived must be true, false or "all"',
    );
  });
});
