// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BOARD_KEY,
  PEEK_WIDTH_KEY,
  TABLE_KEY,
  VIEW_KEY,
  defaultBoardState,
  defaultTableState,
  groupTasksByStatus,
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
    state.collapsed = ["draft", "review"];
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
        collapsed: ["review", "nope"],
      }),
    );
    const state = loadTableState();
    const defaults = defaultTableState();
    expect(state.widths.title).toBe(200);
    expect(state.widths.status).toBe(defaults.widths.status);
    expect(state.widths.tags).toBe(640);
    expect(state.hidden).toEqual(["tags"]);
    expect(state.sort).toEqual(defaults.sort);
    expect(state.collapsed).toEqual(["review"]);
  });

  it("falls back to defaults for malformed JSON and wrong shapes", () => {
    localStorage.setItem(TABLE_KEY, "{oops");
    expect(loadTableState()).toEqual(defaultTableState());
    localStorage.setItem(TABLE_KEY, "[]");
    expect(loadTableState()).toEqual(defaultTableState());
    localStorage.setItem(BOARD_KEY, "7");
    expect(loadBoardState()).toEqual(defaultBoardState());
  });

  it("clamps board column width and filters hidden statuses", () => {
    localStorage.setItem(
      BOARD_KEY,
      JSON.stringify({ columnWidth: 10, hidden: ["review", "x"] }),
    );
    expect(loadBoardState()).toEqual({ columnWidth: 220, hidden: ["review"] });
    saveBoardState({ columnWidth: 300, hidden: [] });
    expect(loadBoardState()).toEqual({ columnWidth: 300, hidden: [] });
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
      task({ id: "b", status: "draft" }),
      task({ id: "c", status: "review" }),
    ]);
    expect(groups.map((group) => group.status)).toEqual(["draft", "review"]);
    expect(groups[1].tasks.map((t) => t.id)).toEqual(["a", "c"]);
  });
});
