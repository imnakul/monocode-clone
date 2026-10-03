import { useMemo, useRef, useState } from "react";
import {
  CheckCircle,
  CircleAlert,
  CircleDot,
  Eye,
  Loader,
  type IconComponent,
} from "../../../shared/ui/icons";
import {
  ExplorerMenu,
  type ExplorerMenuItem,
} from "../../files/ui/ExplorerMenu";
import { TASK_STATUSES, TASK_STATUS_LABELS, type TaskStatus } from "../tasks";

const STATUS_ICONS: Record<
  TaskStatus,
  { icon: IconComponent; className: string }
> = {
  todo: { icon: CircleDot, className: "text-content/60" },
  in_progress: { icon: Loader, className: "text-sky-400" },
  blocked: { icon: CircleAlert, className: "text-red-400" },
  review: { icon: Eye, className: "text-amber-400" },
  completed: { icon: CheckCircle, className: "text-emerald-400" },
};

export function TaskStatusIcon({
  status,
  className = "size-3.5",
}: {
  status: TaskStatus;
  className?: string;
}) {
  const { icon: Icon, className: color } = STATUS_ICONS[status];
  return (
    <Icon
      aria-hidden
      strokeWidth={1.75}
      className={`shrink-0 ${color} ${className}`}
    />
  );
}

/** Ghost trigger that opens the five statuses; picking applies immediately. */
export function TaskStatusMenu({
  status,
  onChange,
  iconOnly = false,
  className = "",
}: {
  status: TaskStatus;
  onChange: (status: TaskStatus) => void;
  iconOnly?: boolean;
  className?: string;
}) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useMemo<ExplorerMenuItem[]>(
    () =>
      TASK_STATUSES.map((value) => ({
        kind: "item",
        id: value,
        label: TASK_STATUS_LABELS[value],
        checked: value === status,
      })),
    [status],
  );
  const label = TASK_STATUS_LABELS[status];
  return (
    <>
      <button
        ref={trigger}
        type="button"
        data-no-drag
        data-row-ignore
        aria-label={`Task status: ${label}`}
        aria-haspopup="menu"
        aria-expanded={menu !== null}
        title={`Status: ${label}`}
        onClick={(event) => {
          event.stopPropagation();
          const rect = trigger.current?.getBoundingClientRect();
          setMenu({ x: rect?.left ?? 0, y: (rect?.bottom ?? 0) + 4 });
        }}
        className={`inline-flex h-6 items-center gap-1.5 rounded-md px-1.5 text-[12px] text-content/70 hover:bg-content/10 hover:text-content ${className}`}
      >
        <TaskStatusIcon status={status} />
        {iconOnly ? null : <span>{label}</span>}
      </button>
      {menu ? (
        <ExplorerMenu
          x={menu.x}
          y={menu.y}
          ariaLabel="Task status"
          items={items}
          onPick={(id) => {
            setMenu(null);
            const next = TASK_STATUSES.find((value) => value === id);
            if (next && next !== status) onChange(next);
          }}
          onClose={() => setMenu(null)}
        />
      ) : null}
    </>
  );
}
