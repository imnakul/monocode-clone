import { useEffect, useState } from "react";
import { useDragResize } from "../../../shared/hooks/useDragResize";
import { PanelRight, X } from "../../../shared/ui/icons";
import {
  PEEK_DEFAULT_WIDTH,
  PEEK_MAX_WIDTH,
  PEEK_MIN_WIDTH,
  loadPeekWidth,
  savePeekWidth,
} from "../taskViewState";
import type { Task } from "../tasks";
import { TaskEditor, type TaskEditorProps } from "./TaskEditor";

const iconButton =
  "grid size-6 shrink-0 place-items-center rounded-md text-content/45 hover:bg-content/10 hover:text-content";

/** Resizable right-hand pane that edits the selected task in any view. */
export function TaskPeekPane({
  task,
  onClose,
  onOpenBeside,
  ...editor
}: Omit<TaskEditorProps, "variant" | "onOpenBeside"> & {
  task: Task;
  onClose: () => void;
  onOpenBeside: (task: Task) => void;
}) {
  const resize = useDragResize({
    direction: "left",
    min: PEEK_MIN_WIDTH,
    max: () => Math.min(PEEK_MAX_WIDTH, Math.round(window.innerWidth * 0.6)),
    defaultWidth: PEEK_DEFAULT_WIDTH,
    initial: loadPeekWidth(),
    onCommit: savePeekWidth,
  });
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <aside
      ref={resize.setPaneRef}
      aria-label="Task panel"
      className={`relative flex h-full min-h-0 shrink-0 flex-col border-l border-stroke transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${
        entered ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0"
      }`}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize task panel"
        className={`absolute inset-y-0 -left-px z-10 w-1.5 cursor-col-resize touch-none ${
          resize.dragging ? "bg-content/15" : "hover:bg-content/10"
        }`}
        onPointerDown={resize.onPointerDown}
        onDoubleClick={resize.onDoubleClick}
      />
      <div className="flex h-9 shrink-0 items-center justify-end gap-1 border-b border-stroke px-2">
        <button
          type="button"
          title="Open beside session"
          aria-label="Open beside session"
          onClick={() => onOpenBeside(task)}
          className={iconButton}
        >
          <PanelRight className="size-3.5" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          title="Close task panel"
          aria-label="Close task panel"
          onClick={onClose}
          className={iconButton}
        >
          <X className="size-3.5" strokeWidth={1.75} />
        </button>
      </div>
      <TaskEditor
        key={task.id}
        task={task}
        variant="compact"
        onOpenBeside={onOpenBeside}
        {...editor}
      />
    </aside>
  );
}
