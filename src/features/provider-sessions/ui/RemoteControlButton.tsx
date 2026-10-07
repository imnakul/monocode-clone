import { useRef, useState, type ReactElement } from "react";
import {
  ExplorerMenu,
  type ExplorerMenuItem,
} from "../../files/ui/ExplorerMenu";
import {
  Computer,
  Copy,
  RefreshCw,
  type IconComponent,
} from "../../../shared/ui/icons";
import { copyText } from "../../../platform/tauri/clipboard";
import { remoteControlView } from "../model/remoteControlView";
import type { RemoteControlStatus } from "../../../integrations/harness/core/types";
import { REMOTE_CONTROL_ICON_CLASS } from "./RemoteControlIndicator";

export type RemoteControlControls = {
  desired: boolean;
  status?: RemoteControlStatus;
  url?: string;
  message?: string;
  onChange: (enabled: boolean) => void;
};

/**
 * The PC icon (coloured by the confirmed state) that opens the Remote Control
 * menu: turn on/off, Retry, Copy link. With `label` it reads like the other
 * composer chips ("Remote"). The menu changes the saved choice only; it never
 * touches a running turn.
 */
export function RemoteControlButton({
  remoteControl,
  label,
  icon: Icon = Computer,
}: {
  remoteControl: RemoteControlControls;
  label?: string;
  /** Defaults to the PC icon; a local chat's "This computer" chip passes a laptop. */
  icon?: IconComponent;
}): ReactElement {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [copied, setCopied] = useState(false);
  const chip = useRef<HTMLButtonElement>(null);
  const view = remoteControlView({
    desired: remoteControl.desired,
    status: remoteControl.status,
    url: remoteControl.url,
    message: remoteControl.message,
  });

  const items: ExplorerMenuItem[] = [];
  if (view.canTurnOn)
    items.push({
      kind: "item",
      id: "on",
      label: "Turn on Remote Control",
      description: "Lets you continue this chat from your phone.",
    });
  if (view.canRetry)
    items.push({
      kind: "item",
      id: "retry",
      label: "Retry",
      icon: <RefreshCw aria-hidden className="size-3.5" />,
    });
  if (view.canTurnOff)
    items.push({ kind: "item", id: "off", label: "Turn off Remote Control" });
  if (view.url)
    items.push(
      { kind: "sep" },
      {
        kind: "item",
        id: "copy",
        label: "Copy link",
        icon: <Copy aria-hidden className="size-3.5" />,
      },
    );

  const onPick = (id: string): void => {
    setAnchor(null);
    if (id === "on" || id === "retry") remoteControl.onChange(true);
    else if (id === "off") remoteControl.onChange(false);
    else if (id === "copy" && view.url) {
      void copyText(view.url).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      });
    }
  };

  return (
    <>
      <button
        ref={chip}
        type="button"
        data-remote-control-button={view.label}
        title={view.detail}
        aria-label={`Remote Control: ${view.label}. ${view.detail}`}
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => setAnchor(event.currentTarget)}
        className={`flex h-6 shrink-0 items-center gap-1.5 rounded-md text-[12px] transition-colors duration-100 hover:bg-content/8 ${
          label ? "-ml-1.5 px-1.5" : "size-6 justify-center"
        } ${REMOTE_CONTROL_ICON_CLASS[view.label]} ${
          anchor ? "bg-content/8" : ""
        }`}
      >
        <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
        {label ? <span className="truncate">{label}</span> : null}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {`Remote Control ${view.label}`}
        {copied ? ". Link copied" : ""}
      </span>
      {anchor ? (
        <ExplorerMenu
          anchor={anchor}
          ariaLabel="Remote Control"
          width={280}
          header={
            <p className="px-3 py-2 text-[12px] leading-snug text-content/70">
              {view.detail}
            </p>
          }
          items={items}
          onPick={onPick}
          onClose={() => {
            setAnchor(null);
            chip.current?.focus();
          }}
        />
      ) : null}
    </>
  );
}
