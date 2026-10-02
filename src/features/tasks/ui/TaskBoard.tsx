import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { suppressTextSelection } from "../../../shared/lib/drag";
import { X } from "../../../shared/ui/icons";
import {
  BoardColumn,
  BoardColumns,
} from "../../../shared/ui/board/BoardColumns";
import type { ProjectMarks } from "../../projects/ui/ProjectMark";
import {
  BOARD_COLUMN_DEFAULT,
  BOARD_COLUMN_MAX,
  BOARD_COLUMN_MIN,
  isTaskStatusId,
  type TaskBoardState,
} from "../taskViewState";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type Task,
  type TaskStatus,
} from "../tasks";
import { ResizeHandle } from "./ResizeHandle";
import { TaskStatusIcon, TaskStatusMenu } from "./TaskStatusIcon";
import { relativeTime, TaskProjectMark, TaskTagChips } from "./TaskTags";
import { useOptimisticStatus } from "./useOptimisticStatus";

const DRAG_THRESHOLD = 4;

type DragView = {
  task: Task;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  width: number;
  over: TaskStatus | null;
};

function statusAtPoint(x: number, y: number): TaskStatus | null {
  const column = document
    .elementFromPoint(x, y)
    ?.closest("[data-task-column]")
    ?.getAttribute("data-task-column");
  return isTaskStatusId(column) ? column : null;
}

export function TaskBoard({
  tasks,
  state,
  selectedId,
  marks,
  onStateChange,
  onSelect,
  onTagClick,
  onSaved,
}: {
  tasks: readonly Task[];
  state: TaskBoardState;
  selectedId: string | null;
  marks: ProjectMarks;
  onStateChange: (state: TaskBoardState) => void;
  onSelect: (id: string) => void;
  onTagClick: (tag: string) => void;
  onSaved: (task: Task) => void;
}) {
  const { statusOf, move, error, dismissError } = useOptimisticStatus(onSaved);
  const [drag, setDrag] = useState<DragView | null>(null);
  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const suppressClick = useRef(false);
  const abortDrag = useRef<(() => void) | null>(null);
  const statusOfRef = useRef(statusOf);
  statusOfRef.current = statusOf;
  const moveRef = useRef(move);
  moveRef.current = move;
  useEffect(() => () => abortDrag.current?.(), []);

  const columns = TASK_STATUSES.filter(
    (status) => !state.hidden.includes(status),
  );
  const columnWidth = liveWidth ?? state.columnWidth;

  const beginDrag = (event: ReactPointerEvent<HTMLElement>, task: Task) => {
    if (event.button !== 0) return;
    if (
      event.target instanceof Element &&
      event.target.closest("[data-no-drag]")
    )
      return;
    abortDrag.current?.();
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    let active = false;
    let restoreSelection: () => void = () => {};
    let previousCursor = "";

    const stop = (dropOn: TaskStatus | null) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey, true);
      abortDrag.current = null;
      if (active) {
        restoreSelection();
        document.body.style.cursor = previousCursor;
        try {
          element.releasePointerCapture(pointerId);
        } catch {
          /* already released */
        }
        setDrag(null);
        // The click that follows a drag must not open the peek.
        suppressClick.current = true;
        window.setTimeout(() => {
          suppressClick.current = false;
        }, 0);
      }
      if (dropOn && dropOn !== statusOfRef.current(task))
        moveRef.current(task, dropOn);
    };
    const onMove = (move: globalThis.PointerEvent) => {
      if (move.pointerId !== pointerId) return;
      if (!active) {
        if (
          Math.hypot(move.clientX - startX, move.clientY - startY) <
          DRAG_THRESHOLD
        )
          return;
        active = true;
        try {
          element.setPointerCapture(pointerId);
        } catch {
          /* capture is best effort */
        }
        restoreSelection = suppressTextSelection();
        previousCursor = document.body.style.cursor;
        document.body.style.cursor = "grabbing";
      }
      setDrag({
        task,
        x: move.clientX,
        y: move.clientY,
        offsetX: startX - rect.left,
        offsetY: startY - rect.top,
        width: rect.width,
        over: statusAtPoint(move.clientX, move.clientY),
      });
    };
    const onUp = (up: globalThis.PointerEvent) => {
      if (up.pointerId !== pointerId) return;
      stop(active ? statusAtPoint(up.clientX, up.clientY) : null);
    };
    const onCancel = (cancel: globalThis.PointerEvent) => {
      if (cancel.pointerId !== pointerId) return;
      stop(null);
    };
    const onKey = (key: KeyboardEvent) => {
      if (key.key !== "Escape" || !active) return;
      key.preventDefault();
      key.stopPropagation();
      stop(null);
    };
    abortDrag.current = () => stop(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey, true);
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {error ? (
        <div
          role="alert"
          className="flex shrink-0 items-center gap-2 px-4 py-1.5 text-[12px] text-red-400/90"
        >
          <span className="min-w-0 flex-1 truncate">{error}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismissError}
            className="grid size-5 shrink-0 place-items-center rounded text-content/45 hover:bg-content/10 hover:text-content"
          >
            <X className="size-3" strokeWidth={1.75} />
          </button>
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        <BoardColumns>
          {columns.map((status) => {
            const cards = tasks.filter((task) => statusOf(task) === status);
            return (
              <BoardColumn
                key={status}
                id={status}
                label={TASK_STATUS_LABELS[status]}
                icon={<TaskStatusIcon status={status} />}
                count={cards.length}
                minWidth={columnWidth}
                highlighted={drag?.over === status}
                columnProps={{ "data-task-column": status }}
                actions={
                  <ResizeHandle
                    label={`Resize ${TASK_STATUS_LABELS[status]} column`}
                    value={columnWidth}
                    min={BOARD_COLUMN_MIN}
                    max={BOARD_COLUMN_MAX}
                    defaultValue={BOARD_COLUMN_DEFAULT}
                    placement="top-0 -right-1.5 h-9"
                    onLive={setLiveWidth}
                    onCommit={(width) =>
                      onStateChange({ ...state, columnWidth: width })
                    }
                  />
                }
              >
                {cards.length === 0 ? (
                  <p className="px-2 py-3 text-center text-[12px] text-content/35">
                    No tasks
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1.5" role="list">
                    {cards.map((task) => (
                      <li key={task.id}>
                        <TaskCard
                          task={task}
                          status={status}
                          active={selectedId === task.id}
                          dragging={drag?.task.id === task.id}
                          marks={marks}
                          onPointerDown={(event) => beginDrag(event, task)}
                          onSelect={() => {
                            if (suppressClick.current) return;
                            onSelect(task.id);
                          }}
                          onTagClick={onTagClick}
                          onStatusChange={(next) => move(task, next)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </BoardColumn>
            );
          })}
          {columns.length === 0 ? (
            <p className="m-auto text-[12px] text-content/45">
              No columns shown. Use Columns to choose statuses.
            </p>
          ) : null}
        </BoardColumns>
      </div>
      {drag ? (
        <div
          aria-hidden
          className="pointer-events-none fixed top-0 left-0 z-50 opacity-90 shadow-xl"
          style={{
            width: drag.width,
            transform: `translate(${drag.x - drag.offsetX}px, ${drag.y - drag.offsetY}px)`,
          }}
        >
          <TaskCard
            task={drag.task}
            status={statusOf(drag.task)}
            active={false}
            dragging={false}
            marks={marks}
            ghost
          />
        </div>
      ) : null}
    </div>
  );
}

function TaskCard({
  task,
  status,
  active,
  dragging,
  marks,
  ghost = false,
  onPointerDown,
  onSelect,
  onTagClick,
  onStatusChange,
}: {
  task: Task;
  status: TaskStatus;
  active: boolean;
  dragging: boolean;
  marks: ProjectMarks;
  ghost?: boolean;
  onPointerDown?: (event: ReactPointerEvent<HTMLElement>) => void;
  onSelect?: () => void;
  onTagClick?: (tag: string) => void;
  onStatusChange?: (status: TaskStatus) => void;
}) {
  const time = relativeTime(task.updatedAt);
  return (
    <div
      data-task-card={ghost ? undefined : task.id}
      onPointerDown={onPointerDown}
      className={`group relative touch-none rounded-md ${
        active ? "bg-selection" : "bg-content/3 hover:bg-content/5"
      } ${dragging ? "opacity-40" : ""}`}
    >
      <button
        type="button"
        tabIndex={ghost ? -1 : undefined}
        data-task-id={ghost ? undefined : task.id}
        aria-current={active ? "true" : undefined}
        onClick={onSelect}
        className="block w-full rounded-md px-2.5 py-2 text-left"
      >
        <span className="line-clamp-2 block pr-6 text-[13px] font-medium text-content">
          {task.title}
        </span>
        <span className="mt-1.5 flex min-w-0 items-center gap-2 text-[11px] text-content/50">
          <span className="min-w-0 max-w-28 shrink">
            <TaskProjectMark task={task} marks={marks} />
          </span>
          <TaskTagChips
            tags={task.tags}
            max={2}
            onTagClick={onTagClick ?? (() => {})}
          />
          {time ? (
            <span className="ml-auto shrink-0 tabular-nums text-content/45">
              {time}
            </span>
          ) : null}
        </span>
      </button>
      {ghost ? null : (
        <div className="absolute top-1 right-1 opacity-0 transition-opacity duration-100 group-focus-within:opacity-100 group-hover:opacity-100">
          <TaskStatusMenu
            status={status}
            iconOnly
            onChange={(next) => onStatusChange?.(next)}
          />
        </div>
      )}
    </div>
  );
}
