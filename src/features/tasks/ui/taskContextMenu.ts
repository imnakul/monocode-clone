import type { ExplorerMenuItem } from "../../files/ui/ExplorerMenu";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  isInFocus,
  type Task,
  type TaskStatus,
} from "../tasks";

/** What a task context-menu pick does. */
export type TaskMenuAction =
  | { kind: "work" }
  | { kind: "focus"; on: boolean }
  | { kind: "move"; status: TaskStatus }
  | { kind: "copy" }
  | { kind: "archive"; on: boolean }
  | { kind: "delete" };

const MOVE_PREFIX = "move:";

/** Right-click menu for one task. `today` is the local day (YYYY-MM-DD). */
export function taskMenuItems(
  task: Task,
  today: string,
  canWorkOn: boolean,
): ExplorerMenuItem[] {
  const pinned = task.focusDate === today;
  const archived = task.archivedAt !== undefined;
  return [
    ...(canWorkOn
      ? [{ kind: "item" as const, id: "work", label: "Work on…" }]
      : []),
    pinned
      ? { kind: "item", id: "unfocus", label: "Remove from today's focus" }
      : {
          kind: "item",
          id: "focus",
          label: isInFocus(task, today)
            ? "Pin to today's focus"
            : "Focus today",
        },
    {
      kind: "item",
      id: "move",
      label: "Move to",
      submenu: TASK_STATUSES.map((status) => ({
        kind: "item" as const,
        id: `${MOVE_PREFIX}${status}`,
        label: TASK_STATUS_LABELS[status],
        checked: task.status === status,
      })),
    },
    { kind: "item", id: "copy", label: "Copy task" },
    { kind: "sep" },
    archived
      ? { kind: "item", id: "unarchive", label: "Unarchive" }
      : { kind: "item", id: "archive", label: "Archive" },
    { kind: "item", id: "delete", label: "Delete task", danger: true },
  ];
}

/** Decode a picked menu id. */
export function taskMenuAction(id: string): TaskMenuAction | null {
  if (id.startsWith(MOVE_PREFIX)) {
    const status = TASK_STATUSES.find(
      (entry) => entry === id.slice(MOVE_PREFIX.length),
    );
    return status ? { kind: "move", status } : null;
  }
  switch (id) {
    case "work":
      return { kind: "work" };
    case "focus":
      return { kind: "focus", on: true };
    case "unfocus":
      return { kind: "focus", on: false };
    case "copy":
      return { kind: "copy" };
    case "archive":
      return { kind: "archive", on: true };
    case "unarchive":
      return { kind: "archive", on: false };
    case "delete":
      return { kind: "delete" };
    default:
      return null;
  }
}
