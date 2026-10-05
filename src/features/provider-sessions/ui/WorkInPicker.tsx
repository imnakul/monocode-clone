import { useRef, useState, type ReactElement } from "react";
import { Popover } from "../../../shared/ui/Popover";
import {
  Check,
  ChevronDown,
  Cloud,
  Computer,
  Laptop,
  type IconComponent,
} from "../../../shared/ui/icons";
import {
  RemoteControlButton,
  type RemoteControlControls,
} from "./RemoteControlButton";

/** Where a new session runs. */
export type WorkIn = "local" | "cloud" | "remote";

type Option = {
  id: WorkIn;
  label: string;
  description: string;
  Icon: IconComponent;
};

const OPTIONS: readonly Option[] = [
  {
    id: "local",
    label: "This computer",
    description: "Runs here, in this project",
    Icon: Laptop,
  },
  {
    id: "cloud",
    label: "Cloud",
    description: "Runs in the provider's cloud",
    Icon: Cloud,
  },
  {
    id: "remote",
    label: "Remote",
    description: "Runs here; continue it from your phone",
    Icon: Computer,
  },
];

export function workInLabel(value: WorkIn): string {
  return OPTIONS.find((option) => option.id === value)?.label ?? "This computer";
}

/**
 * "Work in" beside the branch in the session composer. Before the first
 * message it is a dropdown (This computer, Cloud, Remote — only the ones this
 * chat supports); once the chat has started the choice is fixed and shows as
 * an indicator, like Current checkout. A Remote chat's indicator still opens
 * the Remote Control menu (status, Retry, turn off).
 */
export function WorkInPicker({
  started,
  enabled,
  cloud,
  remote,
}: {
  /** The chat has sent its first message: show the fixed choice. */
  started: boolean;
  enabled: boolean;
  /** Present when this new chat may start in the cloud. */
  cloud?: { active: boolean; setActive: (active: boolean) => void };
  /** Present for local Claude chats (Remote Control). */
  remote?: RemoteControlControls;
}): ReactElement | null {
  const anchor = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const value: WorkIn = cloud?.active
    ? "cloud"
    : remote?.desired
      ? "remote"
      : "local";

  if (started) {
    if (value === "remote" && remote)
      return <RemoteControlButton remoteControl={remote} label="Remote" />;
    // Only worth saying when another choice existed.
    if (!remote) return null;
    return (
      <div
        data-work-in="local"
        title="Work in: This computer"
        aria-label="Work in This computer"
        className="-ml-1.5 flex h-6 min-w-0 shrink-0 items-center gap-1.5 px-1.5 text-[12px] text-content/45"
      >
        <Laptop aria-hidden className="size-3.5 shrink-0" />
        <span className="truncate">This computer</span>
      </div>
    );
  }

  const available = OPTIONS.filter(
    (option) =>
      option.id === "local" ||
      (option.id === "cloud" && cloud) ||
      (option.id === "remote" && remote),
  );
  if (available.length < 2) return null;
  const current = OPTIONS.find((option) => option.id === value)!;

  const choose = (next: WorkIn): void => {
    setOpen(false);
    if (next === value) return;
    if (next === "cloud") {
      if (remote?.desired) remote.onChange(false);
      cloud?.setActive(true);
      return;
    }
    if (cloud?.active) cloud.setActive(false);
    if (next === "remote") remote?.onChange(true);
    else if (remote?.desired) remote.onChange(false);
  };

  return (
    <div ref={anchor} className="relative flex min-w-0 shrink-0">
      <button
        type="button"
        data-work-in={value}
        disabled={!enabled}
        aria-label={`Work in ${current.label}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((shown) => !shown)}
        className="-ml-1.5 flex h-6 min-w-0 max-w-48 items-center gap-1.5 rounded-md px-1.5 text-[12px] text-content/55 hover:bg-content/8 hover:text-content aria-expanded:bg-content/8 aria-expanded:text-content disabled:opacity-40 disabled:hover:bg-transparent active:scale-[0.97]"
      >
        <current.Icon
          aria-hidden
          className={`size-3.5 shrink-0 ${value === "remote" ? "text-accent" : ""}`}
        />
        <span className="truncate">{current.label}</span>
        <ChevronDown aria-hidden className="size-3 shrink-0 opacity-60" />
      </button>
      {open ? (
        <Popover
          anchor={anchor}
          side="top"
          width={260}
          onDismiss={() => setOpen(false)}
          role="dialog"
          aria-label="Work in"
          data-work-in-picker
          className="overflow-hidden p-1.5"
        >
          <div className="px-2 py-1 text-[11px] font-medium text-content/45">
            Work in
          </div>
          {available.map((option) => (
            <button
              key={option.id}
              type="button"
              data-shared-hover-item
              aria-pressed={value === option.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option.id)}
              className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-content/85 hover:bg-content/8"
            >
              <option.Icon
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-content/55"
              />
              <span className="min-w-0 flex-1">
                <span className="block">{option.label}</span>
                <span className="block truncate text-[11px] leading-4 text-content/45">
                  {option.description}
                </span>
              </span>
              {value === option.id ? (
                <Check aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              ) : null}
            </button>
          ))}
        </Popover>
      ) : null}
    </div>
  );
}
