import type { HTMLAttributes, ReactNode } from "react";

/** Horizontal board that scrolls inside itself; columns share the width. */
export function BoardColumns({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 min-w-0 gap-3 overflow-x-auto p-3">
      {children}
    </div>
  );
}

export function BoardColumn({
  id,
  label,
  icon,
  count,
  minWidth,
  actions,
  highlighted = false,
  children,
  columnProps,
}: {
  id: string;
  label: string;
  icon?: ReactNode;
  count: number;
  minWidth: number;
  actions?: ReactNode;
  highlighted?: boolean;
  children: ReactNode;
  columnProps?: HTMLAttributes<HTMLElement> & Record<`data-${string}`, string>;
}) {
  return (
    <section
      {...columnProps}
      aria-label={`${label} column`}
      data-board-column={id}
      style={{ minWidth }}
      className={`relative flex min-h-0 flex-1 basis-0 flex-col rounded-lg transition-colors duration-100 ${
        highlighted ? "bg-content/5 ring-1 ring-accent/40" : "bg-content/3"
      }`}
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
    </section>
  );
}
