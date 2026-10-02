import { projectName } from "../../shared/lib/paths";
import {
  TASK_STATUSES,
  type Task,
  type TaskStatus,
} from "./tasks";

export const TASK_VIEW_IDS = ["list", "table", "board"] as const;
export type TaskViewId = (typeof TASK_VIEW_IDS)[number];
export const DEFAULT_TASK_VIEW: TaskViewId = "list";

export const TASK_COLUMN_IDS = [
  "title",
  "status",
  "project",
  "tags",
  "updated",
  "completed",
] as const;
export type TaskColumnId = (typeof TASK_COLUMN_IDS)[number];

export const TASK_COLUMN_MAX_WIDTH = 640;
export const TASK_COLUMNS: Record<
  TaskColumnId,
  { header: string; width: number; min: number; hideable: boolean }
> = {
  title: { header: "Title", width: 320, min: 200, hideable: false },
  status: { header: "Status", width: 140, min: 110, hideable: true },
  project: { header: "Project", width: 170, min: 120, hideable: true },
  tags: { header: "Tags", width: 200, min: 100, hideable: true },
  updated: { header: "Updated", width: 120, min: 90, hideable: true },
  completed: { header: "Completed", width: 130, min: 90, hideable: true },
};

export const PEEK_MIN_WIDTH = 360;
export const PEEK_MAX_WIDTH = 720;
export const PEEK_DEFAULT_WIDTH = 440;
export const BOARD_COLUMN_MIN = 220;
export const BOARD_COLUMN_MAX = 400;
export const BOARD_COLUMN_DEFAULT = 260;

export type TaskSort = { column: TaskColumnId; dir: "asc" | "desc" };
export type TaskTableState = {
  widths: Record<TaskColumnId, number>;
  hidden: TaskColumnId[];
  sort: TaskSort;
  collapsed: TaskStatus[];
};
export type TaskBoardState = {
  columnWidth: number;
  hidden: TaskStatus[];
};

export const VIEW_KEY = "monocode.tasks.view";
export const PEEK_WIDTH_KEY = "monocode.tasks.peekWidth";
export const TABLE_KEY = "monocode.tasks.table";
export const BOARD_KEY = "monocode.tasks.board";

export function defaultTableState(): TaskTableState {
  return {
    widths: {
      title: TASK_COLUMNS.title.width,
      status: TASK_COLUMNS.status.width,
      project: TASK_COLUMNS.project.width,
      tags: TASK_COLUMNS.tags.width,
      updated: TASK_COLUMNS.updated.width,
      completed: TASK_COLUMNS.completed.width,
    },
    hidden: ["completed"],
    sort: { column: "updated", dir: "desc" },
    collapsed: [],
  };
}

export function defaultBoardState(): TaskBoardState {
  return {
    columnWidth: BOARD_COLUMN_DEFAULT,
    hidden: ["draft", "deferred"],
  };
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function clampColumnWidth(id: TaskColumnId, value: number): number {
  return clampNumber(value, TASK_COLUMNS[id].min, TASK_COLUMN_MAX_WIDTH);
}

export function isTaskColumnId(value: unknown): value is TaskColumnId {
  return (
    typeof value === "string" &&
    (TASK_COLUMN_IDS as readonly string[]).includes(value)
  );
}

export function isTaskStatusId(value: unknown): value is TaskStatus {
  return (
    typeof value === "string" &&
    (TASK_STATUSES as readonly string[]).includes(value)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: the choice just won't persist */
  }
}

function uniqueFiltered<T>(value: unknown, keep: (item: unknown) => item is T) {
  if (!Array.isArray(value)) return undefined;
  return [...new Set(value.filter(keep))];
}

export function parseTaskView(value: unknown): TaskViewId {
  return TASK_VIEW_IDS.find((id) => id === value) ?? DEFAULT_TASK_VIEW;
}

export function loadTaskView(): TaskViewId {
  try {
    return parseTaskView(localStorage.getItem(VIEW_KEY));
  } catch {
    return DEFAULT_TASK_VIEW;
  }
}
export function saveTaskView(view: TaskViewId) {
  write(VIEW_KEY, view);
}

export function loadPeekWidth(): number {
  const value = readJson(PEEK_WIDTH_KEY);
  return typeof value === "number" && Number.isFinite(value)
    ? clampNumber(value, PEEK_MIN_WIDTH, PEEK_MAX_WIDTH)
    : PEEK_DEFAULT_WIDTH;
}
export function savePeekWidth(width: number) {
  write(PEEK_WIDTH_KEY, JSON.stringify(width));
}

export function parseTableState(value: unknown): TaskTableState {
  const state = defaultTableState();
  if (!isRecord(value)) return state;
  if (isRecord(value.widths)) {
    for (const id of TASK_COLUMN_IDS) {
      const width = value.widths[id];
      if (typeof width === "number" && Number.isFinite(width))
        state.widths[id] = clampColumnWidth(id, width);
    }
  }
  const hidden = uniqueFiltered(
    value.hidden,
    (item): item is TaskColumnId =>
      isTaskColumnId(item) && TASK_COLUMNS[item].hideable,
  );
  if (hidden) state.hidden = hidden;
  if (
    isRecord(value.sort) &&
    isTaskColumnId(value.sort.column) &&
    (value.sort.dir === "asc" || value.sort.dir === "desc")
  )
    state.sort = { column: value.sort.column, dir: value.sort.dir };
  const collapsed = uniqueFiltered(value.collapsed, isTaskStatusId);
  if (collapsed) state.collapsed = collapsed;
  return state;
}
export function loadTableState(): TaskTableState {
  return parseTableState(readJson(TABLE_KEY));
}
export function saveTableState(state: TaskTableState) {
  write(TABLE_KEY, JSON.stringify(state));
}

export function parseBoardState(value: unknown): TaskBoardState {
  const state = defaultBoardState();
  if (!isRecord(value)) return state;
  if (
    typeof value.columnWidth === "number" &&
    Number.isFinite(value.columnWidth)
  )
    state.columnWidth = clampNumber(
      value.columnWidth,
      BOARD_COLUMN_MIN,
      BOARD_COLUMN_MAX,
    );
  const hidden = uniqueFiltered(value.hidden, isTaskStatusId);
  if (hidden) state.hidden = hidden;
  return state;
}
export function loadBoardState(): TaskBoardState {
  return parseBoardState(readJson(BOARD_KEY));
}
export function saveBoardState(state: TaskBoardState) {
  write(BOARD_KEY, JSON.stringify(state));
}

/** First click direction for a column: dates start newest first. */
export function defaultSortDir(column: TaskColumnId): "asc" | "desc" {
  return column === "updated" || column === "completed" ? "desc" : "asc";
}

/** Next sort after clicking a header: new column starts at its default, same column flips. */
export function nextSort(current: TaskSort, column: TaskColumnId): TaskSort {
  if (current.column !== column)
    return { column, dir: defaultSortDir(column) };
  return { column, dir: current.dir === "asc" ? "desc" : "asc" };
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

function sortKey(task: Task, column: TaskColumnId): string | number {
  switch (column) {
    case "title":
      return task.title;
    case "status":
      return TASK_STATUSES.indexOf(task.status);
    case "project":
      return task.projectCwd ? projectName(task.projectCwd) : "";
    case "tags":
      return task.tags.join(" ");
    case "updated":
      return task.updatedAt;
    case "completed":
      return task.completedAt ?? 0;
  }
}

/** Single-column sort; ties are always broken by id ascending. */
export function sortTasks(tasks: readonly Task[], sort: TaskSort): Task[] {
  const sign = sort.dir === "asc" ? 1 : -1;
  return [...tasks].sort((a, b) => {
    const left = sortKey(a, sort.column);
    const right = sortKey(b, sort.column);
    const order =
      typeof left === "number" && typeof right === "number"
        ? left - right
        : compareText(String(left), String(right));
    return order * sign || a.id.localeCompare(b.id);
  });
}

/** Groups in TASK_STATUSES order, omitting empty groups. Row order is preserved. */
export function groupTasksByStatus(
  tasks: readonly Task[],
): { status: TaskStatus; tasks: Task[] }[] {
  return TASK_STATUSES.map((status) => ({
    status,
    tasks: tasks.filter((task) => task.status === status),
  })).filter((group) => group.tasks.length > 0);
}
