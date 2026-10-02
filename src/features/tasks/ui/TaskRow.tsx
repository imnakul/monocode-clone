import type { ProjectMarks } from "../../projects/ui/ProjectMark";
import { notePreview } from "../../notes/notes";
import { TASK_STATUS_LABELS, type Task } from "../tasks";
import { TaskStatusIcon } from "./TaskStatusIcon";
import { relativeTime, TaskProjectMark, TaskTagChips } from "./TaskTags";

/** One full-width List row. */
export function TaskRow({
  task,
  active,
  marks,
  onSelect,
  onTagClick,
}: {
  task: Task;
  active: boolean;
  marks: ProjectMarks;
  onSelect: () => void;
  onTagClick: (tag: string) => void;
}) {
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
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left ${
        active
          ? "bg-selection text-content"
          : "text-content/80 hover:bg-content/5 hover:text-content"
      }`}
    >
      <span className="flex shrink-0 items-center">
        <TaskStatusIcon status={task.status} className="size-4" />
        <span className="sr-only">{TASK_STATUS_LABELS[task.status]}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-1 block text-[13px] font-semibold text-content">
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
      <span className="max-w-40 min-w-0 shrink-0 text-[11px] text-content/50">
        <TaskProjectMark task={task} marks={marks} />
      </span>
      {time ? (
        <span className="shrink-0 text-[11px] tabular-nums text-content/45">
          {time}
        </span>
      ) : null}
    </button>
  );
}
