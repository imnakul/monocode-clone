import { useMemo } from "react";
import { useLockOverscroll } from "../../../shared/hooks/useLockOverscroll";
import type { ProjectMarks } from "../../projects/ui/ProjectMark";
import { SharedHoverHighlight } from "../../sessions/ui/SharedHoverHighlight";
import { groupTasks, type TaskGroupBy } from "../taskViewState";
import type { Task } from "../tasks";
import { TaskGroupHeader } from "./TaskGroupHeader";
import { TaskRow } from "./TaskRow";

export function TaskList({
  tasks,
  groupBy,
  collapsed,
  selectedId,
  marks,
  onSelect,
  onTagClick,
  onToggleGroup,
  onContextMenu,
}: {
  tasks: readonly Task[];
  groupBy: TaskGroupBy;
  /** Collapsed group keys. */
  collapsed: readonly string[];
  selectedId: string | null;
  marks: ProjectMarks;
  onSelect: (id: string) => void;
  onTagClick: (tag: string) => void;
  onToggleGroup: (key: string) => void;
  onContextMenu: (task: Task, x: number, y: number) => void;
}) {
  const lock = useLockOverscroll<HTMLDivElement>();
  const groups = useMemo(() => groupTasks(tasks, groupBy), [tasks, groupBy]);
  const grouped = groupBy !== "none";
  return (
    <div
      ref={lock}
      className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-none"
    >
      <SharedHoverHighlight />
      {groups.map((group) => {
        const isCollapsed = grouped && collapsed.includes(group.key);
        return (
          <section
            key={group.key}
            aria-label={grouped ? group.label : undefined}
          >
            {grouped ? (
              <div className="flex h-8 items-center px-1.5">
                <TaskGroupHeader
                  group={group}
                  collapsed={isCollapsed}
                  marks={marks}
                  onToggle={() => onToggleGroup(group.key)}
                />
              </div>
            ) : null}
            {isCollapsed ? null : (
              <ul
                aria-label={grouped ? `${group.label} tasks` : "Tasks"}
                role="list"
                data-shared-hover-continuity
                className="flex flex-col gap-0.5 p-1.5"
              >
                {group.tasks.map((task) => (
                  <li key={task.id}>
                    <TaskRow
                      task={task}
                      active={selectedId === task.id}
                      marks={marks}
                      groupBy={groupBy}
                      onSelect={() => onSelect(task.id)}
                      onTagClick={onTagClick}
                      onContextMenu={(x, y) => onContextMenu(task, x, y)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
