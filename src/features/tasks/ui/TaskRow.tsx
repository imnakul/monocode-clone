import type { ProjectMarks } from "../../projects/ui/ProjectMark";
import { notePreview } from "../../notes/notes";
import { localDay, TASK_STATUS_LABELS, type Task } from "../tasks";
import type { TaskGroupBy } from "../taskViewState";
import { TaskStatusIcon } from "./TaskStatusIcon";
import {
  relativeTime,
  TaskFocusChip,
  TaskProjectMark,
  TaskStatusLabel,
  TaskTagChips,
} from "./TaskTags";

/** One full-width List row. */
export function TaskRow({
  task,
  active,
  marks,
  groupBy = "none",
  onSelect,
  onTagClick,
  onContextMenu,
}: {
  task: Task;
  active: boolean;
  marks: ProjectMarks;
  /** Grouped by Project: show the status where the project would be. */
  groupBy?: TaskGroupBy;
  onSelect: () => void;
  onTagClick: (tag: string) => void;
  onContextMenu?: (x: number, y: number) => void;
}) {
  const archived = task.archivedAt !== undefined;
  const preview = notePreview(task.body, task.title);
  const time = relativeTime(task.updatedAt);
  return (
    <button
      type="button"
      data-shared-hover-item
      data-shared-hover-preserve={active ? "" : undefined}
      data-task-id={task.id}
      title={`${task.title} · ${TASK_STATUS_LABELS[task.status]}`}
      aria-current={active ? "true" : undefined}
      data-archived={archived ? "" : undefined}
      onClick={onSelect}
      onContextMenu={
        onContextMenu
          ? (event) => {
              event.preventDefault();
              onContextMenu(event.clientX, event.clientY);
            }
          : undefined
      }
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left ${
        active
          ? "bg-selection text-content"
          : "text-content/80 hover:text-content"
      } ${archived ? "opacity-55" : ""}`}
    >
      <span className="flex shrink-0 items-center">
        <TaskStatusIcon status={task.status} className="size-4" />
        <span className="sr-only">{TASK_STATUS_LABELS[task.status]}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`line-clamp-1 block text-[13px] font-semibold text-content ${
            archived ? "line-through decoration-content/40" : ""
          }`}
        >
          {task.title}
        </span>
        {preview ? (
          <span className="line-clamp-1 block text-[12px] text-content/45">
            {preview}
          </span>
        ) : null}
      </span>
      <TaskTagChips
        tags={task.tags}
        max={3}
        onTagClick={onTagClick}
        className="hidden shrink-0 md:flex"
      />
      <TaskFocusChip focusDate={task.focusDate} today={localDay()} />
      <span className="max-w-40 min-w-0 shrink-0 text-[11px] text-content/50">
        {groupBy === "project" ? (
          <TaskStatusLabel status={task.status} />
        ) : (
          <TaskProjectMark task={task} marks={marks} />
        )}
      </span>
      {time ? (
        <span className="shrink-0 text-[11px] tabular-nums text-content/45">
          {time}
        </span>
      ) : null}
    </button>
  );
}
