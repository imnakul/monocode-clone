import type { ReactNode } from "react";
import {
  localDay,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  type TaskStatus,
} from "../../tasks/tasks";
import { TaskStatusIcon } from "../../tasks/ui/TaskStatusIcon";
import { Sun, Tag, X } from "../../../shared/ui/icons";
import type { QuickTaskFields as Fields } from "../model/quickTask";

/**
 * Task-only row of the composer: Status, an optional focus day, and tags.
 * Everything is inline (no popovers) because the floating composer is a
 * small native window that grows with its card.
 */
export function QuickTaskFields({
  value,
  disabled,
  onChange,
}: {
  value: Fields;
  disabled: boolean;
  onChange: (next: Fields) => void;
}): ReactNode {
  const set = (changes: Partial<Fields>) => onChange({ ...value, ...changes });
  const today = localDay();
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 px-4 pb-2.5">
      <div
        role="radiogroup"
        aria-label="Status"
        onKeyDown={(event) => {
          const step =
            event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
          if (!step || disabled) return;
          event.preventDefault();
          const index = TASK_STATUSES.indexOf(value.status);
          const next =
            TASK_STATUSES[
              (index + step + TASK_STATUSES.length) % TASK_STATUSES.length
            ];
          set({ status: next });
          event.currentTarget
            .querySelector<HTMLButtonElement>(`[data-status="${next}"]`)
            ?.focus();
        }}
        className="flex h-7 items-center rounded-md border border-content/10 bg-content/5 p-0.5"
      >
        {TASK_STATUSES.map((status) => (
          <StatusOption
            key={status}
            status={status}
            selected={value.status === status}
            disabled={disabled}
            onSelect={() => set({ status })}
          />
        ))}
      </div>
      {value.focusDate ? (
        <span className="flex h-7 items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/10 pl-2 pr-0.5 text-[12px] text-content">
          <Sun aria-hidden className="size-3.5 text-amber-400" />
          <input
            type="date"
            aria-label="Focus day"
            value={value.focusDate}
            min={today}
            disabled={disabled}
            onChange={(event) => set({ focusDate: event.target.value || null })}
            className="w-[7.5rem] bg-transparent text-[12px] tabular-nums outline-none [color-scheme:inherit]"
          />
          <button
            type="button"
            aria-label="Remove focus day"
            title="Remove focus day"
            disabled={disabled}
            onClick={() => set({ focusDate: null })}
            className="grid size-6 place-items-center rounded text-content/45 hover:bg-selection-hover hover:text-content"
          >
            <X className="size-3" />
          </button>
        </span>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => set({ focusDate: today })}
          title="Add to today's focus (change the day after)"
          className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] text-content/65 hover:bg-selection-hover hover:text-content disabled:opacity-40"
        >
          <Sun aria-hidden className="size-3.5" />
          Focus
        </button>
      )}
      <label className="flex h-7 min-w-32 flex-1 items-center gap-1.5 rounded-md px-2 text-[12px] text-content/65 focus-within:bg-content/5 hover:bg-content/5">
        <Tag aria-hidden className="size-3.5 shrink-0" />
        <input
          value={value.tags}
          disabled={disabled}
          onChange={(event) => set({ tags: event.target.value })}
          placeholder="Tags"
          aria-label="Tags, separated by spaces or commas"
          spellCheck={false}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-content outline-none placeholder:text-content/40"
        />
      </label>
    </div>
  );
}

function StatusOption({
  status,
  selected,
  disabled,
  onSelect,
}: {
  status: TaskStatus;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}): ReactNode {
  const label = TASK_STATUS_LABELS[status];
  return (
    <button
      type="button"
      role="radio"
      data-status={status}
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onSelect}
      className={`flex h-6 items-center gap-1 rounded px-1.5 text-[12px] transition-colors duration-100 ${
        selected
          ? "bg-selection-strong text-content"
          : "text-content/50 hover:text-content/85"
      }`}
    >
      <TaskStatusIcon status={status} className="size-3.5" />
      {selected ? <span>{label}</span> : null}
    </button>
  );
}
