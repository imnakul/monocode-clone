import { ChevronDown } from "../../../shared/ui/icons";
import {
  PersonalIcon,
  ProjectIcon,
  type ProjectMarks,
} from "../../projects/ui/ProjectMark";
import type { TaskGroup } from "../taskViewState";
import { TaskStatusIcon } from "./TaskStatusIcon";

/** Status icon for status groups; project logo/mascot or Personal for project groups. */
export function TaskGroupIcon({
  group,
  marks,
}: {
  group: Pick<TaskGroup, "status" | "projectCwd">;
  marks: ProjectMarks;
}) {
  if (group.status) return <TaskStatusIcon status={group.status} />;
  if (group.projectCwd)
    return <ProjectIcon cwd={group.projectCwd} {...marks} />;
  return <PersonalIcon />;
}

/** Collapsible header for a List or Table group. */
export function TaskGroupHeader({
  group,
  collapsed,
  marks,
  onToggle,
}: {
  group: TaskGroup;
  collapsed: boolean;
  marks: ProjectMarks;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      data-task-group={group.key}
      aria-expanded={!collapsed}
      onClick={onToggle}
      className="inline-flex h-6 max-w-full items-center gap-1.5 rounded-md px-1.5 text-[12px] font-medium text-content/80 transition-colors duration-100 hover:bg-content/5 hover:text-content"
    >
      <ChevronDown
        aria-hidden
        className={`size-3 shrink-0 text-content/45 transition-transform duration-150 ${
          collapsed ? "-rotate-90" : ""
        }`}
      />
      <TaskGroupIcon group={group} marks={marks} />
      <span className="min-w-0 truncate">{group.label}</span>
      <span className="shrink-0 tabular-nums text-content/45">
        {group.tasks.length}
      </span>
    </button>
  );
}
