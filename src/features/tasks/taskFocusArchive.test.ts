import { describe, expect, it } from "vitest";
import {
  filterTasks,
  isInFocus,
  localDay,
  normalizeStoredTask,
  taskMarkdown,
  taskWorkPrompt,
  type Task,
} from "./tasks";
import {
  moveGroupKey,
  orderGroups,
  reorderColumn,
  sortForBoard,
} from "./taskViewState";
import { taskMenuAction, taskMenuItems } from "./ui/taskContextMenu";

const DAY = new Date(2026, 9, 3, 12).getTime();
const TODAY = localDay(DAY);
const YESTERDAY = localDay(DAY - 86_400_000);

function task(id: string, changes: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    body: "",
    status: "todo",
    tags: [],
    createdAt: DAY - 3 * 86_400_000,
    updatedAt: 1,
    ...changes,
  };
}

describe("Focus", () => {
  it("counts tasks created today or pinned to today", () => {
    expect(TODAY).toBe("2026-10-03");
    expect(isInFocus(task("new", { createdAt: DAY }), TODAY)).toBe(true);
    expect(isInFocus(task("pinned", { focusDate: TODAY }), TODAY)).toBe(true);
    expect(isInFocus(task("old"), TODAY)).toBe(false);
    expect(isInFocus(task("yesterday", { focusDate: YESTERDAY }), TODAY)).toBe(
      false,
    );
  });

  it("filters by focus day, hides archived by default and combines several projects", () => {
    const rows = [
      task("today", { createdAt: DAY, projectCwd: "/work/a" }),
      task("pinned", { focusDate: TODAY }),
      task("archived", { createdAt: DAY, archivedAt: 5 }),
      task("other", { projectCwd: "/work/b" }),
    ];
    expect(filterTasks(rows, { focusDay: TODAY }).map((t) => t.id).sort()).toEqual([
      "pinned",
      "today",
    ]);
    expect(filterTasks(rows).map((t) => t.id)).not.toContain("archived");
    expect(filterTasks(rows, { archived: true }).map((t) => t.id)).toEqual([
      "archived",
    ]);
    expect(filterTasks(rows, { archived: "all" })).toHaveLength(4);
    expect(
      filterTasks(rows, { projectCwds: ["/work/a", null] })
        .map((t) => t.id)
        .sort(),
    ).toEqual(["pinned", "today"]);
  });
});

describe("retired statuses", () => {
  it("shows Draft as Todo and Deferred as an archived Todo, and flags them for rewrite", () => {
    const draft = normalizeStoredTask({ ...task("d"), status: "draft" });
    expect(draft).toMatchObject({ legacy: true, task: { status: "todo" } });
    expect(draft.task.archivedAt).toBeUndefined();
    const deferred = normalizeStoredTask({
      ...task("x", { updatedAt: 9 }),
      status: "deferred",
    });
    expect(deferred).toMatchObject({
      legacy: true,
      task: { status: "todo", archivedAt: 9 },
    });
    expect(normalizeStoredTask(task("ok")).legacy).toBe(false);
  });
});

describe("copy and work-on text", () => {
  it("copies the title, status, project, dates, tags and description", () => {
    const text = taskMarkdown(
      task("Fix login", {
        title: "Fix login",
        body: "Steps to reproduce",
        status: "in_progress",
        tags: ["auth", "web"],
        projectCwd: "/work/app",
        createdAt: DAY,
        focusDate: TODAY,
      }),
      () => "app",
    );
    expect(text).toBe(
      [
        "# Fix login",
        "",
        "- Status: Progress",
        "- Project: app",
        "- Created: 2026-10-03",
        "- Focus: 2026-10-03",
        "- Tags: #auth #web",
        "",
        "Steps to reproduce",
        "",
      ].join("\n"),
    );
  });

  it("prefills Work on with the title, tags and description", () => {
    expect(
      taskWorkPrompt({ title: "Fix login", body: "Steps", tags: ["auth"] }),
    ).toBe("Task: Fix login\n\nTags: #auth\n\nSteps\n\n");
    expect(taskWorkPrompt({ title: "Tidy", body: "", tags: [] })).toBe(
      "Task: Tidy\n\n",
    );
  });
});

describe("board ordering", () => {
  it("orders columns by the saved order and moves a column before another", () => {
    const groups = [{ key: "a" }, { key: "b" }, { key: "c" }];
    expect(orderGroups(groups, ["c", "a"]).map((g) => g.key)).toEqual([
      "c",
      "a",
      "b",
    ]);
    expect(moveGroupKey(["a", "b", "c"], "c", "a")).toEqual(["c", "a", "b"]);
    expect(moveGroupKey(["a", "b", "c"], "a", null)).toEqual(["b", "c", "a"]);
  });

  it("puts hand-placed cards first and renumbers a column after a drop", () => {
    const column = sortForBoard([
      task("new", { updatedAt: 5 }),
      task("placed", { sortOrder: 0 }),
      task("older", { updatedAt: 1 }),
    ]);
    expect(column.map((t) => t.id)).toEqual(["placed", "new", "older"]);
    const updates = reorderColumn(column, "older", 0);
    expect(updates).toEqual([
      { id: "older", sortOrder: 0 },
      { id: "placed", sortOrder: 1 },
      { id: "new", sortOrder: 2 },
    ]);
  });
});

describe("task right-click menu", () => {
  it("offers work, focus, move, copy, archive and delete, and decodes picks", () => {
    const items = taskMenuItems(task("a"), TODAY, true);
    const labels = items.map((item) => (item.kind === "item" ? item.label : "—"));
    expect(labels).toEqual([
      "Work on…",
      "Focus today",
      "Move to",
      "Copy task",
      "—",
      "Archive",
      "Delete task",
    ]);
    expect(labels).not.toContain("Open beside session");
    const archived = taskMenuItems(
      task("b", { archivedAt: 1, focusDate: TODAY }),
      TODAY,
      false,
    ).map((item) => (item.kind === "item" ? item.label : "—"));
    expect(archived).toContain("Unarchive");
    expect(archived).toContain("Remove from today's focus");
    expect(archived).not.toContain("Work on…");
    expect(taskMenuAction("move:review")).toEqual({
      kind: "move",
      status: "review",
    });
    expect(taskMenuAction("unarchive")).toEqual({ kind: "archive", on: false });
    expect(taskMenuAction("bogus")).toBeNull();
  });
});
