// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  completedOn,
  createTask,
  deleteTask,
  filterTasks,
  firstFocusDay,
  inFocusOn,
  localDay,
  normalizeFocusDays,
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
    focusDays: [],
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
  it("matches a day by focus history, plan, creation or completion, archived included", () => {
    // 2026-10-07 is a Tuesday; timestamps are noon local.
    const day = (y: number, m: number, d: number) =>
      new Date(y, m - 1, d, 12).getTime();
    const seventh = day(2026, 10, 7);
    const created7th = (changes: Partial<Task> = {}) =>
      task("x", { createdAt: seventh, ...changes });
    // R4: recorded history counts.
    expect(
      inFocusOn(created7th({ focusDays: ["2026-10-06"] }), "2026-10-06"),
    ).toBe(true);
    // R4: created on the 7th, planned for the 9th → not on the 7th.
    expect(
      inFocusOn(created7th({ focusDate: "2026-10-09" }), "2026-10-07"),
    ).toBe(false);
    expect(
      inFocusOn(created7th({ focusDate: "2026-10-09" }), "2026-10-09"),
    ).toBe(true);
    // R4: created on the 7th, unpinned → on the 7th.
    expect(inFocusOn(created7th(), "2026-10-07")).toBe(true);
    expect(inFocusOn(created7th(), "2026-10-08")).toBe(false);
    // R5.
    expect(
      completedOn(task("c", { completedAt: day(2026, 10, 10) }), "2026-10-10"),
    ).toBe(true);
    expect(completedOn(task("c"), "2026-10-10")).toBe(false);
    // firstFocusDay: earliest of history, plan (≤ today) and created day.
    // Created on the 7th but planned for the 9th: the 7th is not included.
    expect(
      firstFocusDay(
        created7th({ focusDays: ["2026-10-08"], focusDate: "2026-10-09" }),
        "2026-10-10",
      ),
    ).toBe("2026-10-08");
    expect(
      firstFocusDay(created7th({ focusDate: "2026-10-07" }), "2026-10-10"),
    ).toBe("2026-10-07");
    expect(firstFocusDay(created7th(), "2026-10-07")).toBe("2026-10-07");
    expect(
      firstFocusDay(created7th({ focusDate: "2026-10-09" }), "2026-10-07"),
    ).toBeUndefined();
    expect(normalizeFocusDays(["2026-10-09", "bad", "2026-10-09"])).toEqual([
      "2026-10-09",
    ]);
    expect(localDay(seventh)).toBe("2026-10-07");
  });
  it("includes archived tasks in a day view but hides them elsewhere", () => {
    const rows = [
      task("done", {
        createdAt: new Date(2026, 9, 10, 12).getTime(),
        completedAt: new Date(2026, 9, 10, 16, 30).getTime(),
        archivedAt: 5,
      }),
      task("other", { archivedAt: 6 }),
    ];
    expect(filterTasks(rows, { day: "2026-10-10" }).map((t) => t.id)).toEqual([
      "done",
    ]);
    expect(filterTasks(rows).map((t) => t.id)).toEqual([]);
    expect(
      filterTasks(rows, { archived: "all" }).map((t) => t.id).sort(),
    ).toEqual(["done", "other"]);
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
