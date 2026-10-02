import { invoke } from "@tauri-apps/api/core";
import { normalizeNoteTags, noteTitle } from "../notes/notes";
import { pathKey } from "../../shared/lib/paths";

export const TASK_STATUS_LABELS = {
  draft: "Draft",
  todo: "Todo",
  in_progress: "Progress",
  blocked: "Blocked",
  review: "Review",
  completed: "Completed",
  deferred: "Deferred",
} as const;
export type TaskStatus = keyof typeof TASK_STATUS_LABELS;
export const TASK_STATUSES = Object.keys(TASK_STATUS_LABELS) as TaskStatus[];
export const TASKS_CHANGED_EVENT = "monocode:tasks-changed";
export type Task = {
  id: string;
  title: string;
  body: string;
  status: TaskStatus;
  tags: string[];
  projectCwd?: string;
  sourceSessionId?: string;
  sourceBlockId?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
};
export type TaskUpsert = Omit<Task, "createdAt" | "updatedAt" | "completedAt">;
export type TaskChanges = Partial<
  Omit<TaskUpsert, "id" | "projectCwd" | "sourceSessionId" | "sourceBlockId">
> & {
  projectCwd?: string | null;
  sourceSessionId?: string | null;
  sourceBlockId?: string | null;
};
export type TaskFilters = {
  statuses?: TaskStatus[];
  tags?: string[];
  tagMatch?: "all" | "any";
  /** Omitted: all projects; null: Personal. */
  projectCwd?: string | null;
  query?: string;
};

export function taskStatus(value: unknown): TaskStatus {
  if (typeof value !== "string") throw new Error("Invalid task status");
  const normalized = value.trim().toLowerCase().replace(/[ -]+/g, "_");
  const status = normalized === "progress" ? "in_progress" : normalized;
  if (!TASK_STATUSES.includes(status as TaskStatus))
    throw new Error(`Invalid task status: ${value}`);
  return status as TaskStatus;
}

/** UI and Operator share the same combined filter semantics. */
export function filterTasks(
  tasks: readonly Task[],
  filters: TaskFilters = {},
): Task[] {
  const query = filters.query?.trim().toLowerCase();
  const tags = normalizeNoteTags(filters.tags ?? []);
  return tasks
    .filter((task) => {
      if (filters.statuses?.length && !filters.statuses.includes(task.status))
        return false;
      if (filters.projectCwd === null && task.projectCwd) return false;
      if (
        typeof filters.projectCwd === "string" &&
        (!task.projectCwd ||
          pathKey(task.projectCwd) !== pathKey(filters.projectCwd))
      )
        return false;
      const taskTags = normalizeNoteTags(task.tags);
      if (
        tags.length &&
        !(filters.tagMatch === "any"
          ? tags.some((tag) => taskTags.includes(tag))
          : tags.every((tag) => taskTags.includes(tag)))
      )
        return false;
      if (
        query &&
        ![task.title, task.body, ...task.tags, task.projectCwd ?? ""]
          .join("\n")
          .toLowerCase()
          .includes(query)
      )
        return false;
      return true;
    })
    .sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
}

function changed() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event(TASKS_CHANGED_EVENT));
}
export async function loadTasks(): Promise<Task[]> {
  return invoke<Task[]>("tasks_list");
}
export async function getTask(id: string): Promise<Task | null> {
  return invoke<Task | null>("tasks_get", { id });
}
export async function upsertTask(task: TaskUpsert): Promise<Task> {
  const saved = await invoke<Task>("tasks_upsert", {
    task: {
      ...task,
      title: task.title.trim() || noteTitle(task.body),
      tags: normalizeNoteTags(task.tags),
    },
  });
  changed();
  return saved;
}
export async function createTask(
  input: Omit<Partial<TaskUpsert>, "id"> = {},
): Promise<Task> {
  const body = input.body ?? "";
  return upsertTask({
    ...input,
    id: crypto.randomUUID(),
    title: input.title?.trim() || noteTitle(body),
    body,
    status: input.status ?? "todo",
    tags: input.tags ?? [],
  });
}

// Serialize UI and Operator changes, and merge against the latest durable row.
const pendingWrites = new Map<string, Promise<unknown>>();
function serialize<T>(id: string, operation: () => Promise<T>): Promise<T> {
  const prior = pendingWrites.get(id) ?? Promise.resolve();
  const pending = prior
    .catch(() => {})
    .then(operation)
    .finally(() => {
      if (pendingWrites.get(id) === pending) pendingWrites.delete(id);
    });
  pendingWrites.set(id, pending);
  return pending;
}
export function updateTask(id: string, changes: TaskChanges): Promise<Task> {
  return serialize(id, async () => {
    const current = await getTask(id);
    if (!current) throw new Error("Task was not found");
    const {
      createdAt: _created,
      updatedAt: _updated,
      completedAt: _completed,
      ...record
    } = current;
    return upsertTask({
      ...record,
      ...changes,
      sourceSessionId:
        changes.sourceSessionId === null
          ? undefined
          : (changes.sourceSessionId ?? record.sourceSessionId),
      sourceBlockId:
        changes.sourceBlockId === null
          ? undefined
          : (changes.sourceBlockId ?? record.sourceBlockId),
      projectCwd:
        changes.projectCwd === null
          ? undefined
          : (changes.projectCwd ?? record.projectCwd),
    });
  });
}
export function deleteTask(id: string): Promise<void> {
  return serialize(id, async () => {
    await invoke("tasks_delete", { id });
    changed();
  });
}
