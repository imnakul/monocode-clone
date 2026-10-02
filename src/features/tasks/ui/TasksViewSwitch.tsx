import { useRef, type KeyboardEvent } from "react";
import {
  DashboardSquare,
  ListBullet,
  PanelTop,
  type IconComponent,
} from "../../../shared/ui/icons";
import { TASK_VIEW_IDS, type TaskViewId } from "../taskViewState";

const VIEWS: Record<TaskViewId, { label: string; icon: IconComponent }> = {
  list: { label: "List", icon: ListBullet },
  table: { label: "Table", icon: PanelTop },
  board: { label: "Board", icon: DashboardSquare },
};

export function TasksViewSwitch({
  view,
  onChange,
}: {
  view: TaskViewId;
  onChange: (view: TaskViewId) => void;
}) {
  const refs = useRef(new Map<TaskViewId, HTMLButtonElement>());
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const index = TASK_VIEW_IDS.indexOf(view);
    const next =
      TASK_VIEW_IDS[
        (index + delta + TASK_VIEW_IDS.length) % TASK_VIEW_IDS.length
      ];
    onChange(next);
    refs.current.get(next)?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label="Tasks view"
      onKeyDown={onKeyDown}
      className="flex shrink-0 rounded-md border border-content/10 bg-content/10 p-0.5 backdrop-blur-md"
    >
      {TASK_VIEW_IDS.map((id) => {
        const { label, icon: Icon } = VIEWS[id];
        const selected = view === id;
        return (
          <button
            key={id}
            ref={(element) => {
              if (element) refs.current.set(id, element);
              else refs.current.delete(id);
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(id)}
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-sans text-[11px] ${
              selected
                ? "bg-selection-strong text-content"
                : "text-content/45 hover:text-content/80"
            }`}
          >
            <Icon aria-hidden className="size-3" strokeWidth={1.75} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
