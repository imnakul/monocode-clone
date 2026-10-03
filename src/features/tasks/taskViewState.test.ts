// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BOARD_KEY,
  PEEK_WIDTH_KEY,
  TABLE_KEY,
  VIEW_KEY,
  defaultBoardState,
  GROUPING_KEY,
  defaultGrouping,
  defaultTableState,
  groupTasks,
  groupTasksByProject,
  groupTasksByStatus,
  loadGrouping,
  loadBoardState,
  loadPeekWidth,
  loadTableState,
  loadTaskView,
  nextSort,
  saveBoardState,
  saveTableState,
  saveTaskView,
  sortTasks,
} from "./taskViewState";
import type { Task } from "./tasks";

function task(partial: Partial<Task> & { id: string }): Task {
  return {
    title: partial.id,
    body: "",
    status: "todo",
    tags: [],
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  };
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("task view persistence", () => {
  it("defaults to list and accepts only known views", () => {
    expect(loadTaskView()).toBe("list");
    localStorage.setItem(VIEW_KEY, "kanban");
    expect(loadTaskView()).toBe("list");
    saveTaskView("board");
    expect(loadTaskView()).toBe("board");
  });

  it("clamps the peek width and ignores wrong types", () => {
    expect(loadPeekWidth()).toBe(440);
    localStorage.setItem(PEEK_WIDTH_KEY, "50");
    expect(loadPeekWidth()).toBe(360);
    localStorage.setItem(PEEK_WIDTH_KEY, "99999");
    expect(loadPeekWidth()).toBe(720);
    localStorage.setItem(PEEK_WIDTH_KEY, '"wide"');
    expect(loadPeekWidth()).toBe(440);
    localStorage.setItem(PEEK_WIDTH_KEY, "not json");
    expect(loadPeekWidth()).toBe(440);
  });

  it("round-trips a valid table state", () => {
    const state = defaultTableState();
    state.widths.title = 400;
    state.hidden = ["tags"];
    state.sort = { column: "title", dir: "asc" };
    state.collapsed = ["status:draft", "project:/work/app"];
    saveTableState(state);
    expect(loadTableState()).toEqual(state);
  });

  it("drops invalid table fields individually", () => {
    localStorage.setItem(
      TABLE_KEY,
      JSON.stringify({
        widths: { title: 5, status: "wide", bogus: 200, tags: 9999 },
        hidden: ["title", "tags", "nope", 3],
        sort: { column: "nope", dir: "asc" },
        collapsed: ["review", "nope", "project:/work/app", 4],
      }),
    );
    const state = loadTableState();
    const defaults = defaultTableState();
    expect(state.widths.title).toBe(200);
    expect(state.widths.status).toBe(defaults.widths.status);
    expect(state.widths.tags).toBe(640);
    expect(state.hidden).toEqual(["tags"]);
    expect(state.sort).toEqual(defaults.sort);
    // Bare status ids from older saves become status group keys.
    expect(state.collapsed).toEqual(["status:review", "project:/work/app"]);
  });

  it("falls back to defaults for malformed JSON and wrong shapes", () => {
    localStorage.setItem(TABLE_KEY, "{oops");
    expect(loadTableState()).toEqual(defaultTableState());
    localStorage.setItem(TABLE_KEY, "[]");
    expect(loadTableState()).toEqual(defaultTableState());
    localStorage.setItem(BOARD_KEY, "7");
    expect(loadBoardState()).toEqual(defaultBoardState());
  });

  it("clamps board column width and filters hidden statuses and projects", () => {
    localStorage.setItem(
      BOARD_KEY,
      JSON.stringify({
        width: 10,
        hidden: ["review", "x"],
        hiddenProjects: ["project:/work/app", "bogus", 3],
      }),
    );
    expect(loadBoardState()).toEqual({
      width: 220,
      hidden: ["review"],
      hiddenProjects: ["project:/work/app"],
      order: [],
    });
    saveBoardState({ width: 300, hidden: [], hiddenProjects: [], order: [] });
    expect(loadBoardState()).toEqual({
      width: 300,
      hidden: [],
      hiddenProjects: [],
      order: [],
    });
  });

  it("starts filling the board when an old save only has a minimum column width", () => {
    localStorage.setItem(BOARD_KEY, JSON.stringify({ columnWidth: 300 }));
    expect(loadBoardState().width).toBeNull();
  });

  it("never throws when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadTaskView()).toBe("list");
    expect(loadPeekWidth()).toBe(440);
    expect(loadTableState()).toEqual(defaultTableState());
    expect(loadBoardState()).toEqual(defaultBoardState());
    expect(() => saveTaskView("table")).not.toThrow();
    expect(() => saveTableState(defaultTableState())).not.toThrow();
    expect(() => saveBoardState(defaultBoardState())).not.toThrow();
  });
});

describe("sorting and grouping", () => {
  it("sorts with id as the tie-breaker in both directions", () => {
    const tasks = [
      task({ id: "b", title: "Same" }),
      task({ id: "a", title: "Same" }),
      task({ id: "c", title: "Alpha" }),
    ];
    expect(
      sortTasks(tasks, { column: "title", dir: "asc" }).map((t) => t.id),
    ).toEqual(["c", "a", "b"]);
    expect(
      sortTasks(tasks, { column: "title", dir: "desc" }).map((t) => t.id),
    ).toEqual(["a", "b", "c"]);
  });

  it("sorts dates numerically", () => {
    const tasks = [
      task({ id: "a", updatedAt: 5 }),
      task({ id: "b", updatedAt: 20 }),
    ];
    expect(
      sortTasks(tasks, { column: "updated", dir: "desc" }).map((t) => t.id),
    ).toEqual(["b", "a"]);
  });

  it("first click is asc, except dates which start desc, then flips", () => {
    const base = { column: "updated", dir: "desc" } as const;
    expect(nextSort(base, "title")).toEqual({ column: "title", dir: "asc" });
    expect(nextSort(base, "updated")).toEqual({
      column: "updated",
      dir: "asc",
    });
    expect(nextSort(base, "completed")).toEqual({
      column: "completed",
      dir: "desc",
    });
  });

  it("groups in status order and hides empty groups", () => {
    const groups = groupTasksByStatus([
      task({ id: "a", status: "review" }),
      task({ id: "b", status: "todo" }),
      task({ id: "c", status: "review" }),
    ]);
    expect(groups.map((group) => group.status)).toEqual(["todo", "review"]);
    expect(groups[1].tasks.map((t) => t.id)).toEqual(["a", "c"]);
  });
});

describe("grouping", () => {
  it("defaults per view and drops invalid choices individually", () => {
    expect(loadGrouping()).toEqual(defaultGrouping());
    localStorage.setItem(
      GROUPING_KEY,
      JSON.stringify({ list: "project", table: "bogus", board: "none" }),
    );
    // A board always needs columns, so "none" falls back to status.
    expect(loadGrouping()).toEqual({
      list: "project",
      table: "status",
      board: "status",
    });
    localStorage.setItem(GROUPING_KEY, "{oops");
    expect(loadGrouping()).toEqual(defaultGrouping());
  });

  it("groups by project by name, merges Windows path spellings and puts Personal last", () => {
    const groups = groupTasksByProject([
      task({ id: "p", projectCwd: undefined }),
      task({ id: "z", projectCwd: "/work/zeta" }),
      task({ id: "w1", projectCwd: "E:/Work/Alpha" }),
      task({ id: "w2", projectCwd: "e:\\work\\alpha\\" }),
    ]);
    expect(
      groups.map((group) => [group.label, group.tasks.map((t) => t.id)]),
    ).toEqual([
      ["Alpha", ["w1", "w2"]],
      ["zeta", ["z"]],
      ["Personal", ["p"]],
    ]);
    expect(groups[2]).toMatchObject({
      key: "project:personal",
      projectCwd: null,
    });
  });

  it("returns one group for no grouping and readable labels for status groups", () => {
    const tasks = [task({ id: "a", status: "review" }), task({ id: "b" })];
    expect(
      groupTasks(tasks, "none").map((group) => group.tasks.length),
    ).toEqual([2]);
    expect(groupTasks(tasks, "status").map((group) => group.label)).toEqual([
      "Todo",
      "Review",
    ]);
  });
});
