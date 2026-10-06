import { useEffect, useId, useRef, useState } from "react";
import {
  Check,
  Lock,
  Pencil,
  Shield,
  Sparkles,
} from "../../../shared/ui/icons";
import {
  runtimeModesForHarness,
  type HarnessId,
  runtimeModeHint,
  runtimeModeLabel,
  type RuntimeMode,
} from "../../sessions/model/session";

const ICONS = {
  supervised: Lock,
  "auto-accept-edits": Pencil,
  auto: Sparkles,
  "full-access": Shield,
};

export function QuickPermissionIcon({
  mode,
  className,
}: {
  mode: RuntimeMode;
  className?: string;
}) {
  const Icon = ICONS[mode];
  return (
    <Icon
      className={`${className ?? ""} ${mode === "full-access" ? "text-amber-400/90" : ""}`}
      strokeWidth={1.75}
    />
  );
}

export function QuickPermissions({
  value,
  harness,
  onChange,
  onClose,
}: {
  value: RuntimeMode;
  harness?: HarnessId;
  onChange: (mode: RuntimeMode) => void;
  onClose: () => void;
}) {
  const modes = runtimeModesForHarness(harness);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const [active, setActive] = useState(Math.max(0, modes.indexOf(value)));
  useEffect(() => {
    root.current?.focus({ preventScroll: true });
  }, []);
  const pick = (mode: RuntimeMode) => {
    onChange(mode);
    onClose();
  };

  return (
    <div
      ref={root}
      role="listbox"
      aria-label="Permissions"
      aria-activedescendant={`${id}-${active}`}
      tabIndex={-1}
      className="min-h-0 overflow-y-auto overscroll-none border-t border-stroke p-2 outline-none"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          const step = event.key === "ArrowDown" ? 1 : -1;
          setActive(
            (index) =>
              (index + step + modes.length) % modes.length,
          );
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          pick(modes[active]);
        }
      }}
    >
      {modes.map((mode, index) => (
        <button
          key={mode}
          id={`${id}-${index}`}
          type="button"
          role="option"
          tabIndex={-1}
          aria-selected={value === mode}
          onMouseDown={(event) => {
            event.preventDefault();
            root.current?.focus({ preventScroll: true });
          }}
          onMouseEnter={() => setActive(index)}
          onClick={() => pick(mode)}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${active === index ? "bg-selection-emphasis text-content" : "text-content/75 hover:bg-selection-hover"}`}
        >
          <QuickPermissionIcon mode={mode} className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-medium">
              {runtimeModeLabel(mode, harness)}
            </span>
            <span className="mt-0.5 block text-[11px] text-content/45">
              {runtimeModeHint(mode, harness)}
            </span>
          </span>
          {value === mode ? (
            <Check className="size-3.5 shrink-0 text-accent" />
          ) : null}
        </button>
      ))}
    </div>
  );
}
