import { useMemo, type ReactNode } from "react";
import { useLockOverscroll } from "../../../shared/hooks/useLockOverscroll";
import type { ProjectMarks } from "../../projects/ui/ProjectMark";
import { SharedHoverHighlight } from "../../sessions/ui/SharedHoverHighlight";
import { groupTasks, type TaskGroup, type TaskGroupBy } from "../taskViewState";
import type { Task } from "../tasks";
import { TaskGroupHeader } from "./TaskGroupHeader";
import { TaskRow } from "./TaskRow";

export function TaskList({
  tasks,
  groupBy,
  collapsed,
  selectedId,
  marks,
  today,
  selectedDay = null,
  groups: override,
  groupIcon,
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
  /** Local day (YYYY-MM-DD) for the focus chips. */
  today: string;
  /** Week-strip day; completed cards on a past day show their Done time. */
  selectedDay?: string | null;
  /** Replaces the `groupBy` groups (the day view's Completed / In focus). */
  groups?: TaskGroup[];
  /** Override icon for a group header (the day view's In focus Target). */
  groupIcon?: (group: TaskGroup) => ReactNode;
  onSelect: (id: string) => void;
  onTagClick: (tag: string) => void;
  onToggleGroup: (key: string) => void;
  onContextMenu: (task: Task, x: number, y: number) => void;
}) {
  const lock = useLockOverscroll<HTMLDivElement>();
  const computed = useMemo(() => groupTasks(tasks, groupBy), [tasks, groupBy]);
  const groups = override ?? computed;
  const grouped = override ? true : groupBy !== "none";
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
                  icon={groupIcon?.(group)}
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
                      today={today}
                      selectedDay={selectedDay}
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
