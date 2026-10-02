import { useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { ChevronDown } from "../../../shared/ui/icons";
import { useLockOverscroll } from "../../../shared/hooks/useLockOverscroll";
import type { ProjectMarks } from "../../projects/ui/ProjectMark";
import {
  TASK_COLUMNS,
  TASK_COLUMN_IDS,
  TASK_COLUMN_MAX_WIDTH,
  clampColumnWidth,
  groupTasksByStatus,
  nextSort,
  sortTasks,
  type TaskColumnId,
  type TaskTableState,
} from "../taskViewState";
import { TASK_STATUS_LABELS, type Task, type TaskStatus } from "../tasks";
import { ResizeHandle } from "./ResizeHandle";
import { TaskStatusIcon, TaskStatusMenu } from "./TaskStatusIcon";
import { relativeTime, TaskProjectMark, TaskTagChips } from "./TaskTags";

export function TaskTable({
  tasks,
  state,
  selectedId,
  marks,
  onStateChange,
  onSelect,
  onTagClick,
  onStatusChange,
}: {
  tasks: readonly Task[];
  state: TaskTableState;
  selectedId: string | null;
  marks: ProjectMarks;
  onStateChange: (state: TaskTableState) => void;
  onSelect: (id: string) => void;
  onTagClick: (tag: string) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
}) {
  const lock = useLockOverscroll<HTMLDivElement>();
  const [live, setLive] = useState<{
    column: TaskColumnId;
    width: number;
  } | null>(null);
  const columns = TASK_COLUMN_IDS.filter((id) => !state.hidden.includes(id));
  const widthOf = (id: TaskColumnId) =>
    live?.column === id ? live.width : state.widths[id];
  const total = columns.reduce((sum, id) => sum + widthOf(id), 0);
  const groups = useMemo(
    () => groupTasksByStatus(sortTasks(tasks, state.sort)),
    [tasks, state.sort],
  );
  const toggleGroup = (status: TaskStatus) =>
    onStateChange({
      ...state,
      collapsed: state.collapsed.includes(status)
        ? state.collapsed.filter((item) => item !== status)
        : [...state.collapsed, status],
    });

  const cell = (task: Task, id: TaskColumnId): ReactNode => {
    switch (id) {
      case "title":
        return (
          <button
            type="button"
            data-task-id={task.id}
            className="block w-full truncate text-left text-[12px] font-medium text-content"
          >
            {task.title}
          </button>
        );
      case "status":
        return (
          <TaskStatusMenu
            status={task.status}
            onChange={(status) => onStatusChange(task, status)}
          />
        );
      case "project":
        return (
          <span className="block min-w-0 text-content/60">
            <TaskProjectMark task={task} marks={marks} />
          </span>
        );
      case "tags":
        return (
          <TaskTagChips tags={task.tags} max={3} onTagClick={onTagClick} />
        );
      case "updated":
        return (
          <span className="tabular-nums text-content/50">
            {relativeTime(task.updatedAt)}
          </span>
        );
      case "completed":
        return (
          <span className="tabular-nums text-content/50">
            {relativeTime(task.completedAt)}
          </span>
        );
    }
  };

  return (
    <div
      ref={lock}
      className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-none"
    >
      <table
        aria-label="Tasks table"
        className="table-fixed border-separate border-spacing-0 text-[12px]"
        style={{ width: total, minWidth: "100%" }}
      >
        <colgroup>
          {columns.map((id) => (
            <col key={id} style={{ width: widthOf(id) }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((id) => {
              const meta = TASK_COLUMNS[id];
              const sorted = state.sort.column === id;
              return (
                <th
                  key={id}
                  scope="col"
                  aria-sort={
                    sorted
                      ? state.sort.dir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                  className="sticky top-0 z-20 h-8 bg-background-base px-3 text-left text-[11px] font-normal text-content/50"
                >
                  <button
                    type="button"
                    onClick={() =>
                      onStateChange({
                        ...state,
                        sort: nextSort(state.sort, id),
                      })
                    }
                    className="inline-flex max-w-full items-center gap-1 hover:text-content"
                  >
                    <span className="truncate">{meta.header}</span>
                    {sorted ? (
                      <ChevronDown
                        aria-hidden
                        className={`size-3 shrink-0 ${
                          state.sort.dir === "asc" ? "rotate-180" : ""
                        }`}
                      />
                    ) : null}
                  </button>
                  <ResizeHandle
                    label={`Resize ${meta.header} column`}
                    value={widthOf(id)}
                    min={meta.min}
                    max={TASK_COLUMN_MAX_WIDTH}
                    defaultValue={meta.width}
                    onLive={(width) =>
                      setLive(width === null ? null : { column: id, width })
                    }
                    onCommit={(width) =>
                      onStateChange({
                        ...state,
                        widths: {
                          ...state.widths,
                          [id]: clampColumnWidth(id, width),
                        },
                      })
                    }
                  />
                </th>
              );
            })}
          </tr>
        </thead>
        {groups.map((group) => {
          const collapsed = state.collapsed.includes(group.status);
          return (
            <tbody key={group.status}>
              <tr>
                <th
                  colSpan={columns.length}
                  scope="colgroup"
                  className="sticky top-8 z-10 h-8 bg-background-base px-2 text-left font-normal"
                >
                  <button
                    type="button"
                    aria-expanded={!collapsed}
                    onClick={() => toggleGroup(group.status)}
                    className="inline-flex h-6 items-center gap-1.5 rounded-md px-1.5 text-[12px] font-medium text-content/80 hover:bg-content/5 hover:text-content"
                  >
                    <ChevronDown
                      aria-hidden
                      className={`size-3 text-content/45 ${
                        collapsed ? "-rotate-90" : ""
                      }`}
                    />
                    <TaskStatusIcon status={group.status} />
                    <span>
                      {TASK_STATUS_LABELS[group.status]} {group.tasks.length}
                    </span>
                  </button>
                </th>
              </tr>
              {collapsed
                ? null
                : group.tasks.map((task) => {
                    const active = selectedId === task.id;
                    return (
                      <tr
                        key={task.id}
                        aria-selected={active}
                        data-task-row={task.id}
                        onClick={(event: MouseEvent<HTMLTableRowElement>) => {
                          if (
                            event.target instanceof Element &&
                            event.target.closest("[data-row-ignore]")
                          )
                            return;
                          onSelect(task.id);
                        }}
                        className={`h-9 cursor-pointer ${
                          active
                            ? "bg-selection text-content"
                            : "text-content/80 hover:bg-content/5"
                        }`}
                      >
                        {columns.map((id) => (
                          <td key={id} className="min-w-0 truncate px-3">
                            {cell(task, id)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
