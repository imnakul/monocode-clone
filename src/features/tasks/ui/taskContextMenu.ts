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
  localDay,
  type Task,
  type TaskStatus,
} from "../tasks";
import { TaskStatusIcon } from "./TaskStatusIcon";
import { addDays } from "./TaskWeekStrip";

const icon = (Component: IconComponent) =>
  createElement(Component, { className: "size-3.5", strokeWidth: 1.75 });

/** What a task context-menu pick does. */
export type TaskMenuAction =
  | { kind: "work" }
  | { kind: "focus"; on: boolean; day?: string }
  | { kind: "move"; status: TaskStatus }
  | { kind: "copy" }
  | { kind: "archive"; on: boolean }
  | { kind: "delete" };

const MOVE_PREFIX = "move:";
const FOCUS_ON_PREFIX = "focusOn:";

function weekdayDate(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  const at = new Date(year || 1970, (month || 1) - 1, date || 1);
  return `${at.toLocaleDateString("en-US", { weekday: "short" })} ${at.getDate()}`;
}

/** The four days offered by the "Focus on" submenu. */
export function focusOnDays(today: string): { day: string; label: string }[] {
  const tomorrow = addDays(today, 1);
  return [
    { day: today, label: "Today" },
    { day: tomorrow, label: `Tomorrow · ${weekdayDate(tomorrow)}` },
    { day: addDays(today, 2), label: weekdayDate(addDays(today, 2)) },
    { day: addDays(today, 3), label: weekdayDate(addDays(today, 3)) },
  ];
}

/** Right-click menu for one task. `today` is the local day (YYYY-MM-DD). */
export function taskMenuItems(
  task: Task,
  today: string = localDay(),
  canWorkOn: boolean,
): ExplorerMenuItem[] {
  const archived = task.archivedAt !== undefined;
  const days = focusOnDays(today);
  return [
    ...(canWorkOn
      ? [{
          kind: "item" as const,
          id: "work",
          label: "Start Work",
          icon: icon(Play),
        }]
      : []),
    {
      kind: "item",
      id: "focus-on",
      label: "Focus on",
      icon: icon(Target),
      submenu: [
        ...days.map((entry) => ({
          kind: "item" as const,
          id: `${FOCUS_ON_PREFIX}${entry.day}`,
          label: entry.label,
          checked: task.focusDate === entry.day,
        })),
        ...(task.focusDate !== undefined
          ? [
              {
                kind: "item" as const,
                id: "unfocus",
                label: "Remove from focus",
              },
            ]
          : []),
      ],
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
  if (id.startsWith(FOCUS_ON_PREFIX)) {
    const day = id.slice(FOCUS_ON_PREFIX.length);
    return /^\d{4}-\d{2}-\d{2}$/.test(day)
      ? { kind: "focus", on: true, day }
      : null;
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
