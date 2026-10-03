import { createElement } from "react";
import {
  Archive,
  Copy,
  Play,
  Target,
  Trash2,
  type IconComponent,
} from "../../../shared/ui/icons";
import type { ExplorerMenuItem } from "../../files/ui/ExplorerMenu";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  isInFocus,
  type Task,
  type TaskStatus,
} from "../tasks";
import { TaskStatusIcon } from "./TaskStatusIcon";

const icon = (Component: IconComponent) =>
  createElement(Component, { className: "size-3.5", strokeWidth: 1.75 });

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
      ? [{
          kind: "item" as const,
          id: "work",
          label: "Start Work",
          icon: icon(Play),
        }]
      : []),
    pinned
      ? {
          kind: "item",
          id: "unfocus",
          label: "Remove from today's focus",
          icon: icon(Target),
        }
      : {
          kind: "item",
          id: "focus",
          icon: icon(Target),
          label: isInFocus(task, today)
            ? "Pin to today's focus"
            : "Focus today",
        },
    {
      kind: "item",
      id: "move",
      label: "Status",
      icon: createElement(TaskStatusIcon, {
        status: task.status,
        className: "size-3.5",
      }),
      submenu: TASK_STATUSES.map((status) => ({
        kind: "item" as const,
        id: `${MOVE_PREFIX}${status}`,
        label: TASK_STATUS_LABELS[status],
        icon: createElement(TaskStatusIcon, {
          status,
          className: "size-3.5",
        }),
        checked: task.status === status,
      })),
    },
    { kind: "item", id: "copy", label: "Copy", icon: icon(Copy) },
    { kind: "sep" },
    archived
      ? {
          kind: "item",
          id: "unarchive",
          label: "Unarchive",
          icon: icon(Archive),
        }
      : {
          kind: "item",
          id: "archive",
          label: "Archive",
          icon: icon(Archive),
        },
    {
      kind: "item",
      id: "delete",
      label: "Delete task",
      icon: icon(Trash2),
      danger: true,
    },
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
