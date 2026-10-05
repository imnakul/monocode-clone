import type { ReactElement } from "react";
import { Computer } from "../../../shared/ui/icons";
import type { RemoteControlLabel } from "../model/remoteControlView";

/**
 * PC-icon colours for Remote Control. The accent (the theme colour the user
 * chose) means it is on; warnings keep their usual amber/red; Off is muted.
 */
export const REMOTE_CONTROL_ICON_CLASS: Record<RemoteControlLabel, string> = {
  Off: "text-content/45",
  Connecting: "text-accent animate-pulse motion-reduce:animate-none",
  On: "text-accent",
  Paused: "text-accent/55",
  "Needs setup": "text-amber-400",
  Failed: "text-red-400",
};

/**
 * Small PC icon shown wherever a chat has Remote Control turned on (session
 * lists, provider conversations, Session Manager). Renders nothing when off,
 * so lists stay quiet; the label is in the tooltip and for screen readers.
 */
export function RemoteControlIndicator({
  label = "On",
  detail,
  className = "size-3",
}: {
  /** Confirmed state when known; lists that only know the saved choice pass "On". */
  label?: RemoteControlLabel;
  detail?: string;
  className?: string;
}): ReactElement | null {
  if (label === "Off") return null;
  const text = `Remote Control: ${label}`;
  return (
    <span
      data-remote-control-indicator={label}
      role="img"
      aria-label={text}
      title={detail ? `${text}. ${detail}` : text}
      className={`inline-flex shrink-0 ${REMOTE_CONTROL_ICON_CLASS[label]}`}
    >
      <Computer aria-hidden className={className} strokeWidth={1.75} />
    </span>
  );
}
