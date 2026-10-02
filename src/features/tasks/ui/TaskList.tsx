import { useLockOverscroll } from "../../../shared/hooks/useLockOverscroll";
import type { ProjectMarks } from "../../projects/ui/ProjectMark";
import { SharedHoverHighlight } from "../../sessions/ui/SharedHoverHighlight";
import type { Task } from "../tasks";
import { TaskRow } from "./TaskRow";

export function TaskList({
  tasks,
  selectedId,
  marks,
  onSelect,
  onTagClick,
}: {
  tasks: readonly Task[];
  selectedId: string | null;
  marks: ProjectMarks;
  onSelect: (id: string) => void;
  onTagClick: (tag: string) => void;
}) {
  const lock = useLockOverscroll<HTMLDivElement>();
  return (
    <div
      ref={lock}
      className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-none"
    >
      <SharedHoverHighlight />
      <ul
        aria-label="Tasks"
        role="list"
        data-shared-hover-continuity
        className="flex flex-col gap-0.5 p-1.5"
      >
        {tasks.map((task) => (
          <li key={task.id}>
            <TaskRow
              task={task}
              active={selectedId === task.id}
              marks={marks}
              onSelect={() => onSelect(task.id)}
              onTagClick={onTagClick}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
