import type { MouseEvent } from "react";
import { formatRelativeTime } from "../../inbox/model/githubTasks";
import {
  PersonalMark,
  ProjectMark,
  type ProjectMarks,
} from "../../projects/ui/ProjectMark";
import { Target } from "../../../shared/ui/icons";
import { TASK_STATUS_LABELS, type Task, type TaskStatus } from "../tasks";
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

/** "Oct 5" for a YYYY-MM-DD day. */
function shortDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) return day;
  return new Date(year, month - 1, date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * What the focus chip says for a task pinned to `focusDate`: "Today", the
 * short date when it is ahead, or "From Oct 2" when it was carried over.
 */
export function focusDayChip(
  focusDate: string | undefined,
  today: string,
): FocusDayChip | null {
  if (!focusDate) return null;
  if (focusDate === today) return { label: "Today", past: false, today: true };
  if (focusDate > today)
    return { label: shortDay(focusDate), past: false, today: false };
  return { label: `From ${shortDay(focusDate)}`, past: true, today: false };
}

export function TaskFocusChip({
  focusDate,
  today,
  className = "",
}: {
  focusDate: string | undefined;
  today: string;
  className?: string;
}) {
  const chip = focusDayChip(focusDate, today);
  if (!chip) return null;
  return (
    <span
      data-focus-chip
      title={
        chip.past
          ? `Pinned to focus ${shortDay(focusDate ?? "")}, still unfinished`
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

/** Status (icon + label) shown where the project is when grouped by Project. */
export function TaskStatusLabel({ status }: { status: TaskStatus }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <TaskStatusIcon status={status} className="size-3.5" />
      <span className="truncate">{TASK_STATUS_LABELS[status]}</span>
    </span>
  );
}
