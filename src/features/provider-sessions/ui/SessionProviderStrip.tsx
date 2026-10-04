import { useRef, useState, type ReactElement } from "react";
import {
  ExplorerMenu,
  type ExplorerMenuItem,
} from "../../files/ui/ExplorerMenu";
import { Computer, Copy, RefreshCw } from "../../../shared/ui/icons";
import { REMOTE_CONTROL_ICON_CLASS } from "./RemoteControlIndicator";
import { copyText } from "../../../platform/tauri/clipboard";
import { remoteControlView } from "../model/remoteControlView";
import type { RemoteControlStatus } from "../../../integrations/harness/core/types";

export type SessionProviderStripProps = {
  /** Earlier-history status for a chat bound to a native conversation. */
  history?: {
    status: "error" | "ready";
    message?: string;
    canShowEarlier: boolean;
    loadingEarlier: boolean;
    onShowEarlier: () => void;
    onRetry: () => void;
  };
  remoteControl?: {
    desired: boolean;
    status?: RemoteControlStatus;
    url?: string;
    message?: string;
    onChange: (enabled: boolean) => void;
  };
};

/**
 * Slim strip above a session's transcript: the "older messages are not shown"
 * note for chats opened from a provider conversation, and the per-chat Claude
 * Remote Control chip. The chip shows the confirmed state; the menu changes the
 * saved choice. Neither touches a running turn.
 */
export function SessionProviderStrip({
  history,
  remoteControl,
}: SessionProviderStripProps): ReactElement | null {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [copied, setCopied] = useState(false);
  const chip = useRef<HTMLButtonElement>(null);
  const showHistory =
    !!history &&
    (history.status === "error" || history.canShowEarlier || !!history.message);
  if (!showHistory && !remoteControl) return null;
  const view = remoteControl
    ? remoteControlView({
        desired: remoteControl.desired,
        status: remoteControl.status,
        url: remoteControl.url,
        message: remoteControl.message,
      })
    : null;

  const items: ExplorerMenuItem[] = [];
  if (view && remoteControl) {
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
      items.push({
        kind: "item",
        id: "off",
        label: "Turn off Remote Control",
      });
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
  }

  const onPick = (id: string): void => {
    setAnchor(null);
    if (!remoteControl) return;
    if (id === "on" || id === "retry") remoteControl.onChange(true);
    else if (id === "off") remoteControl.onChange(false);
    else if (id === "copy" && view?.url) {
      void copyText(view.url).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      });
    }
  };

  return (
    <div
      data-session-provider-strip
      className="flex min-h-7 shrink-0 items-center gap-2 px-3 py-1 text-[11px] text-content/55"
    >
      {showHistory && history ? (
        <p className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="min-w-0 truncate">
            {history.status === "error"
              ? `Earlier messages could not be loaded: ${history.message ?? "unknown error"}. You can still continue this conversation.`
              : history.message
                ? `Older messages could not be loaded: ${history.message}`
                : "Showing recent earlier messages."}
          </span>
          {history.status === "error" ? (
            <button
              type="button"
              onClick={history.onRetry}
              className="shrink-0 rounded px-1.5 py-0.5 text-content/70 hover:bg-content/10 hover:text-content"
            >
              Retry
            </button>
          ) : history.canShowEarlier ? (
            <button
              type="button"
              disabled={history.loadingEarlier}
              onClick={history.onShowEarlier}
              className="shrink-0 rounded px-1.5 py-0.5 text-content/70 hover:bg-content/10 hover:text-content disabled:opacity-60"
            >
              {history.loadingEarlier ? "Loading…" : "Show earlier"}
            </button>
          ) : null}
        </p>
      ) : (
        <span className="flex-1" />
      )}
      {view && remoteControl ? (
        <>
          <button
            ref={chip}
            type="button"
            title={view.detail}
            aria-label={`Remote Control: ${view.label}. ${view.detail}`}
            aria-haspopup="menu"
            aria-expanded={anchor !== null}
            onClick={(event) => setAnchor(event.currentTarget)}
            className={`grid size-6 shrink-0 place-items-center rounded-md transition-colors duration-100 hover:bg-content/10 ${REMOTE_CONTROL_ICON_CLASS[view.label]} ${
              anchor ? "bg-selection" : ""
            }`}
          >
            {/* The PC icon alone; its colour carries the state (accent = on). */}
            <Computer aria-hidden className="size-3.5" strokeWidth={1.75} />
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
      ) : null}
    </div>
  );
}
