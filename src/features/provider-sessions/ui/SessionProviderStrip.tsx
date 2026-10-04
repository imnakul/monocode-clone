import { useRef, useState, type ReactElement } from "react";
import {
  ExplorerMenu,
  type ExplorerMenuItem,
} from "../../files/ui/ExplorerMenu";
import {
  Check,
  CircleAlert,
  Copy,
  Loader,
  RemoteControl,
  RefreshCw,
  X,
} from "../../../shared/ui/icons";
import { copyText } from "../../../platform/tauri/clipboard";
import {
  remoteControlView,
  type RemoteControlView,
} from "../model/remoteControlView";
import type { RemoteControlStatus } from "../../../integrations/harness/core/types";

export type SessionProviderStripProps = {
  /** Provider name for the "older transcript" note; omit when not applicable. */
  nativeNoticeProvider?: string;
  remoteControl?: {
    desired: boolean;
    status?: RemoteControlStatus;
    url?: string;
    message?: string;
    onChange: (enabled: boolean) => void;
  };
};

const TONE_CLASS: Record<RemoteControlView["tone"], string> = {
  neutral: "text-content/55",
  busy: "text-accent",
  ok: "text-emerald-400",
  warn: "text-amber-400",
  error: "text-red-400",
};

function ToneIcon({ view }: { view: RemoteControlView }): ReactElement {
  if (view.tone === "busy")
    return (
      <Loader
        aria-hidden
        className="size-3 animate-spin motion-reduce:animate-none"
      />
    );
  if (view.tone === "ok") return <Check aria-hidden className="size-3" />;
  if (view.tone === "error" || view.tone === "warn")
    return <CircleAlert aria-hidden className="size-3" />;
  return <RemoteControl aria-hidden className="size-3" />;
}

/**
 * Slim strip above a session's transcript: the "older messages are not shown"
 * note for chats opened from a provider conversation, and the per-chat Claude
 * Remote Control chip. The chip shows the confirmed state; the menu changes the
 * saved choice. Neither touches a running turn.
 */
export function SessionProviderStrip({
  nativeNoticeProvider,
  remoteControl,
}: SessionProviderStripProps): ReactElement | null {
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [copied, setCopied] = useState(false);
  const chip = useRef<HTMLButtonElement>(null);
  const showNotice = !!nativeNoticeProvider && !noticeDismissed;
  if (!showNotice && !remoteControl) return null;
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
      {showNotice ? (
        <p className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="min-w-0 truncate">
            Continuing your {nativeNoticeProvider} conversation. Earlier
            messages are not shown here yet; the agent still has the full
            context.
          </span>
          <button
            type="button"
            title="Dismiss"
            aria-label="Dismiss note"
            onClick={() => setNoticeDismissed(true)}
            className="grid size-5 shrink-0 place-items-center rounded text-content/45 hover:bg-content/10 hover:text-content"
          >
            <X aria-hidden className="size-3" />
          </button>
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
            className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-content/10 px-2 transition-colors duration-100 hover:bg-content/10 ${TONE_CLASS[view.tone]} ${
              anchor ? "bg-selection" : ""
            }`}
          >
            <ToneIcon view={view} />
            <span>Remote Control</span>
            <span className="text-content/80">{view.label}</span>
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
