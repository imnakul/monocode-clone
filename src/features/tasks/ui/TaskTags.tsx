import type { MouseEvent } from "react";
import { formatRelativeTime } from "../../inbox/model/githubTasks";
import {
  PersonalMark,
  ProjectMark,
  type ProjectMarks,
} from "../../projects/ui/ProjectMark";
import type { Task } from "../tasks";

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
