import { useRef, type KeyboardEvent, type ReactNode } from "react";
import type { IconComponent } from "./icons";

export type SegmentedOption<T extends string> = {
  id: T;
  label: string;
  icon?: IconComponent;
};

/**
 * Small tab-style switch (List | Table | Board, Task | Session). Arrow keys
 * move between options; only the selected option is in the tab order.
 */
export function SegmentedSwitch<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}): ReactNode {
  const refs = useRef(new Map<T, HTMLButtonElement>());
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const index = options.findIndex((option) => option.id === value);
    const next = options[(index + delta + options.length) % options.length];
    if (!next) return;
    onChange(next.id);
    refs.current.get(next.id)?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className="flex shrink-0 rounded-md border border-content/10 bg-content/10 p-0.5"
    >
      {options.map(({ id, label, icon: Icon }) => {
        const selected = value === id;
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
            className={`inline-flex h-6 items-center gap-1 rounded px-2 font-sans text-[11px] transition-colors duration-100 ${
              selected
                ? "bg-selection-strong text-content"
                : "text-content/45 hover:text-content/80"
            }`}
          >
            {Icon ? (
              <Icon aria-hidden className="size-3" strokeWidth={1.75} />
            ) : null}
            {label}
          </button>
        );
      })}
    </div>
  );
}
