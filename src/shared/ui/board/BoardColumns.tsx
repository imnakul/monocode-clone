import { useRef, type HTMLAttributes, type ReactNode } from "react";
import { ResizeHandle } from "../ResizeHandle";

/** Horizontal board that scrolls inside itself; columns share the width. */
export function BoardColumns({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 min-w-0 gap-3 overflow-x-auto p-3">
      {children}
    </div>
  );
}

/**
 * Shared column width for a board. `width: null` means columns fill the
 * board equally (never narrower than `fillMin`); a number fixes every column
 * to that width and the board scrolls when they don't fit.
 */
export type BoardColumnResize = {
  width: number | null;
  /** Live width while dragging, or null when idle. */
  liveWidth: number | null;
  min: number;
  max: number;
  onLive: (width: number | null) => void;
  onCommit: (width: number) => void;
  /** Double-click: return to filling the board. */
  onReset: () => void;
};

export function BoardColumn({
  id,
  label,
  icon,
  count,
  fillMin,
  resize,
  actions,
  highlighted = false,
  children,
  columnProps,
}: {
  id: string;
  label: string;
  icon?: ReactNode;
  count: number;
  /** Minimum width while columns fill the board. */
  fillMin: number;
  resize?: BoardColumnResize;
  actions?: ReactNode;
  highlighted?: boolean;
  children: ReactNode;
  columnProps?: HTMLAttributes<HTMLElement> & Record<`data-${string}`, string>;
}) {
  const section = useRef<HTMLElement>(null);
  const fixed = resize ? (resize.liveWidth ?? resize.width) : null;
  return (
    <section
      {...columnProps}
      ref={section}
      aria-label={`${label} column`}
      data-board-column={id}
      style={fixed === null ? { minWidth: fillMin } : { width: fixed }}
      className={`relative flex min-h-0 flex-col rounded-lg transition-colors duration-100 ${
        fixed === null ? "flex-1 basis-0" : "flex-none"
      } ${highlighted ? "bg-content/5 ring-1 ring-accent/40" : "bg-content/3"}`}
    >
      <div className="flex h-9 shrink-0 items-center gap-2 px-3 text-[12px] font-medium">
        {icon}
        <span className="min-w-0 truncate">{label}</span>
        <span className="text-content/45 tabular-nums">{count}</span>
        {actions ? (
          <div className="ml-auto flex items-center">{actions}</div>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-1.5">
        {children}
      </div>
      {resize ? (
        <ResizeHandle
          label={`Resize ${label} column`}
          value={fixed ?? fillMin}
          min={resize.min}
          max={resize.max}
          defaultValue={fillMin}
          placement="inset-y-2 -right-2.5 rounded-full"
          getStartValue={() =>
            Math.round(section.current?.getBoundingClientRect().width ?? 0) ||
            fixed ||
            fillMin
          }
          onLive={resize.onLive}
          onCommit={resize.onCommit}
          onReset={resize.onReset}
        />
      ) : null}
    </section>
  );
}
