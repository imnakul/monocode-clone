import type { ReactElement } from "react";

export function Toggle({
  label,
  on,
  onChange,
  disabled = false,
  onToggle,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
  onToggle?: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={on}
      disabled={disabled}
      onClick={() => {
        onChange(!on);
        onToggle?.();
      }}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        on ? "bg-accent" : "bg-content/20"
      }`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-white transition-[left] ${
          on ? "left-4.5" : "left-0.5"
        }`}
      />
    </button>
  );
}
