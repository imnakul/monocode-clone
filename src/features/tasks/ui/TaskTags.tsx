import type { MouseEvent } from "react";
import { formatRelativeTime } from "../../inbox/model/githubTasks";
import {
  PersonalMark,
  ProjectMark,
  type ProjectMarks,
} from "../../projects/ui/ProjectMark";
import { Target } from "../../../shared/ui/icons";
import {
  TASK_STATUS_LABELS,
  completedOn,
  firstFocusDay,
  type Task,
  type TaskStatus,
} from "../tasks";
import { TaskStatusIcon } from "./TaskStatusIcon";

export function relativeTime(timestamp: number | undefined): string {
  return timestamp === undefined
    ? ""
    : formatRelativeTime(new Date(timestamp).toISOString());
}

/**
 * Tag chips that add the tag to the filter. They sit inside row and card
 * buttons, so they are role="button" spans (keyboard users use the Tag filter).
 */
export function TaskTagChips({
  tags,
  max,
  onTagClick,
  className = "",
}: {
  tags: readonly string[];
  max: number;
  onTagClick: (tag: string) => void;
  className?: string;
}) {
  if (tags.length === 0) return null;
  return (
    <span
      className={`flex min-w-0 items-center gap-1 overflow-hidden ${className}`}
    >
      {tags.slice(0, max).map((tag) => (
        <span
          key={tag}
          role="button"
          tabIndex={-1}
          data-row-ignore
          data-no-drag
          title={`Filter by #${tag}`}
          aria-label={`Filter by tag #${tag}`}
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            onTagClick(tag);
          }}
          className="max-w-24 cursor-pointer truncate rounded bg-content/8 px-1.5 py-0.5 text-[10px] leading-none text-content/55 hover:bg-content/15 hover:text-content"
        >
          #{tag}
        </span>
      ))}
      {tags.length > max ? (
        <span className="shrink-0 text-[10px] text-content/40">
          +{tags.length - max}
        </span>
      ) : null}
    </span>
  );
}

export function TaskProjectMark({
  task,
  marks,
}: {
  task: Pick<Task, "projectCwd">;
  marks: ProjectMarks;
}) {
  return task.projectCwd ? (
    <ProjectMark cwd={task.projectCwd} {...marks} />
  ) : (
    <PersonalMark />
  );
}

export type FocusDayChip = {
  label: string;
  /** Pinned on an earlier day (carried over). */
  past: boolean;
  today: boolean;
};

/** Whole days from `first` to `later` (both `YYYY-MM-DD`). */
export function dayDiff(first: string, later: string): number {
  const parse = (day: string) => {
    const [year, month, date] = day.split("-").map(Number);
    return Date.UTC(year || 1970, (month || 1) - 1, date || 1);
  };
  return Math.round((parse(later) - parse(first)) / 86_400_000);
}

/** "5 Oct" for a YYYY-MM-DD day. */
export function shortDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) return day;
  const monthName = new Date(year, month - 1, date).toLocaleDateString("en-US", {
    month: "short",
  });
  return `${date} ${monthName}`;
}

/** "4:30 PM" for a completed-at timestamp. */
export function shortTime(at: number): string {
  return new Date(at).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * What the focus chip says: "Today" for a pin that started today, "Since …"
 * for unfinished work that started earlier, or the short date for a future
 * plan. Unpinned tasks show no chip.
 */
export function focusDayChip(
  task: Pick<Task, "focusDate" | "focusDays" | "createdAt" | "status">,
  today: string,
): FocusDayChip | null {
  const focusDate = task.focusDate;
  if (!focusDate) return null;
  if (focusDate > today)
    return { label: shortDay(focusDate), past: false, today: false };
  const first = firstFocusDay(task, today);
  if (focusDate === today && first === today)
    return { label: "Today", past: false, today: true };
  if (first !== undefined && first < today) {
    const ago = dayDiff(first, today);
    if (ago === 1) return { label: "Since yesterday", past: true, today: false };
    if (ago <= 6)
      return { label: `Since ${ago} days ago`, past: true, today: false };
    return { label: `Since ${shortDay(first)}`, past: true, today: false };
  }
  return { label: "Today", past: false, today: true };
}

export function TaskFocusChip({
  task,
  today,
  className = "",
}: {
  task: Pick<Task, "focusDate" | "focusDays" | "createdAt" | "status">;
  today: string;
  className?: string;
}) {
  const chip = focusDayChip(task, today);
  if (!chip) return null;
  return (
    <span
      data-focus-chip
      title={
        chip.past
          ? `In focus since ${shortDay(firstFocusDay(task, today) ?? task.focusDate ?? "")}, still unfinished`
          : `In focus: ${chip.label}`
      }
      className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] leading-none ${
        chip.past
          ? "bg-amber-400/10 text-amber-300/70"
          : "bg-amber-400/15 text-amber-200"
      } ${className}`}
    >
      <Target aria-hidden className="size-2.5" strokeWidth={1.75} />
      {chip.label}
    </span>
  );
}

/** Completion time shown on cards for a day selected in the week strip. */
export function TaskDoneChip({
  completedAt,
  className = "",
}: {
  completedAt: number;
  className?: string;
}) {
  return (
    <span
      data-done-chip
      title={`Completed at ${shortTime(completedAt)}`}
      className={`inline-flex shrink-0 items-center rounded bg-content/8 px-1.5 py-0.5 text-[10px] leading-none text-content/55 ${className}`}
    >
      Done {shortTime(completedAt)}
    </span>
  );
}

/** Done chip when a past strip day is selected and the task completed then. */
export function taskDayChip(
  task: Pick<Task, "completedAt">,
  selectedDay: string | null,
  today: string,
): boolean {
  return (
    selectedDay !== null &&
    selectedDay < today &&
    task.completedAt !== undefined &&
    completedOn(task, selectedDay)
  );
}

/** Status (icon + label) shown where the project is when grouped by Project. */
export function TaskStatusLabel({ status }: { status: TaskStatus }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <TaskStatusIcon status={status} className="size-3.5" />
      <span className="truncate">{TASK_STATUS_LABELS[status]}</span>
    </span>
  );
}
