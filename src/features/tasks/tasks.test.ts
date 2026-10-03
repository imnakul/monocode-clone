// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  createTask,
  deleteTask,
  filterTasks,
  TASKS_CHANGED_EVENT,
  parseTaskStatus,
  taskStatus,
  updateTask,
  type Task,
  type TaskUpsert,
} from "./tasks";
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
function task(id: string, changes: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    body: "Markdown",
    status: "todo",
    tags: [],
    createdAt: 1,
    updatedAt: 1,
    ...changes,
  };
}
describe("shared Tasks filters", () => {
  const rows = [
    task("a", {
      tags: ["Windows", "bug"],
      projectCwd: "C:\\Work\\Mono",
      status: "blocked",
      updatedAt: 3,
    }),
    task("b", {
      tags: ["bug"],
      status: "todo",
      body: "Installer",
      updatedAt: 2,
    }),
    task("c", {
      tags: ["windows"],
      projectCwd: "/work/other",
      status: "completed",
    }),
  ];
  it("combines statuses, all tags, Windows project identity and search with AND", () => {
    expect(
      filterTasks(rows, {
        statuses: ["todo", "blocked"],
        tags: ["#BUG", "windows"],
        projectCwd: "c:/work/mono/",
        query: "Markdown",
      }).map((row) => row.id),
    ).toEqual(["a"]);
    expect(
      filterTasks(rows, { statuses: ["todo"], tags: ["windows"] }),
    ).toEqual([]);
  });
  it("supports any-tag matching, Personal and deterministic newest-first order", () => {
    expect(
      filterTasks(rows, { tags: ["missing", "bug"], tagMatch: "any" }).map(
        (row) => row.id,
      ),
    ).toEqual(["a", "b"]);
    expect(
      filterTasks(rows, { projectCwd: null, query: "installer" }).map(
        (row) => row.id,
      ),
    ).toEqual(["b"]);
    expect(filterTasks(rows).map((row) => row.id)).toEqual(["a", "b", "c"]);
  });
  it("normalizes display status aliases and rejects unknown status values", () => {
    expect(taskStatus("In Progress")).toBe("in_progress");
    expect(taskStatus("Progress")).toBe("in_progress");
    // Retired statuses map to Todo; Deferred also archives (see parseTaskStatus).
    expect(taskStatus("DEFERRED")).toBe("todo");
    expect(parseTaskStatus("deferred")).toEqual({ status: "todo", archive: true });
    expect(parseTaskStatus("draft")).toEqual({ status: "todo", archive: false });
    expect(taskStatus("done")).toBe("completed");
    expect(() => taskStatus("cancelled")).toThrow("Invalid task status");
  });
});

describe("Task writes and refresh", () => {
  let rows: Map<string, Task>;
  beforeEach(() => {
    rows = new Map([
      [
        "a",
        task("a", {
          sourceSessionId: "source",
          sourceBlockId: "cline:42",
          projectCwd: "/work/project",
        }),
      ],
    ]);
    vi.mocked(invoke)
      .mockReset()
      .mockImplementation(async (command, args) => {
        if (command === "tasks_get")
          return rows.get(args?.id as string) ?? null;
        if (command === "tasks_upsert") {
          const input = args?.task as TaskUpsert;
          const saved = {
            ...rows.get(input.id),
            ...input,
            createdAt: 1,
            updatedAt: 2,
          };
          rows.set(input.id, saved);
          return saved;
        }
        if (command === "tasks_delete") {
          rows.delete(args?.id as string);
          return;
        }
        throw new Error(`Unexpected command ${command}`);
      });
  });
  afterEach(() => vi.restoreAllMocks());
  it("creates a Todo with normalized tags and source metadata, and signals refresh", async () => {
    const changed = vi.fn();
    window.addEventListener(TASKS_CHANGED_EVENT, changed);
    try {
      const created = await createTask({
        body: "# Fix installer",
        tags: ["#Windows", "WINDOWS"],
        sourceSessionId: "source",
        sourceBlockId: "cline:42",
      });
      expect(created).toMatchObject({
        title: "Fix installer",
        status: "todo",
        tags: ["windows"],
        sourceBlockId: "cline:42",
      });
      expect(changed).toHaveBeenCalledOnce();
    } finally {
      window.removeEventListener(TASKS_CHANGED_EVENT, changed);
    }
  });
  it("serializes UI/Operator partial changes and retains unedited fields and source", async () => {
    const bodyWrite = updateTask("a", { body: "New Markdown" });
    const statusWrite = updateTask("a", { status: "completed" });
    await Promise.all([bodyWrite, statusWrite]);
    expect(rows.get("a")).toMatchObject({
      body: "New Markdown",
      status: "completed",
      sourceSessionId: "source",
      sourceBlockId: "cline:42",
      projectCwd: "/work/project",
    });
    await updateTask("a", { projectCwd: null });
    expect(rows.get("a")?.projectCwd).toBeUndefined();
    expect(rows.get("a")?.sourceSessionId).toBe("source");
  });
  it("clears source links only when explicitly requested", async () => {
    await updateTask("a", { sourceSessionId: null, sourceBlockId: null });
    expect(rows.get("a")?.sourceSessionId).toBeUndefined();
    expect(rows.get("a")?.sourceBlockId).toBeUndefined();
    expect(rows.get("a")?.projectCwd).toBe("/work/project");
  });
  it("orders deletion after pending saves and never recreates a deleted task on update", async () => {
    await Promise.all([
      updateTask("a", { body: "Saved before delete" }),
      deleteTask("a"),
    ]);
    expect(rows.has("a")).toBe(false);
    await expect(updateTask("a", { body: "stale" })).rejects.toThrow(
      "Task was not found",
    );
    expect(rows.has("a")).toBe(false);
  });
});
