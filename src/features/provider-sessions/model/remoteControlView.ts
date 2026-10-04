import type { RemoteControlStatus } from "../../../integrations/harness/core/types";

export type RemoteControlLabel =
  | "Off"
  | "Connecting"
  | "On"
  | "Paused"
  | "Needs setup"
  | "Failed";

export type RemoteControlView = {
  label: RemoteControlLabel;
  tone: "neutral" | "busy" | "ok" | "warn" | "error";
  /** One honest sentence for the menu header and the chip tooltip. */
  detail: string;
  /** Saved choice for this chat; distinct from the confirmed `label`. */
  desired: boolean;
  canTurnOn: boolean;
  canTurnOff: boolean;
  canRetry: boolean;
  /** Only a URL the provider actually returned for a live connection. */
  url?: string;
};

export const REMOTE_CONTROL_SETUP_COPY =
  "Remote Control needs one-time setup. Run `claude`, enter `/remote-control`, accept the prompt, then select Retry.";

/**
 * Turns the saved intent plus the event-driven status into what the chip
 * shows. The chip label is the confirmed state; `desired` is only what the
 * user asked for, so "On" is never claimed before the provider confirms it.
 */
export function remoteControlView(input: {
  desired: boolean;
  status?: RemoteControlStatus;
  url?: string;
  message?: string;
}): RemoteControlView {
  const { desired, status, url, message } = input;
  const base = { desired, canTurnOn: !desired, canTurnOff: desired };
  switch (status) {
    case "connecting":
      return {
        ...base,
        label: "Connecting",
        tone: "busy",
        detail: "Connecting Remote Control for this chat.",
        canTurnOn: false,
        canTurnOff: true,
        canRetry: false,
      };
    case "on":
      return {
        ...base,
        label: "On",
        tone: "ok",
        detail: url
          ? "Remote Control is connected. Continue this chat from your phone."
          : "Remote Control is connected.",
        canRetry: false,
        ...(url ? { url } : {}),
      };
    case "needs-consent":
      return {
        ...base,
        label: "Needs setup",
        tone: "warn",
        detail: message
          ? `${REMOTE_CONTROL_SETUP_COPY} (${message})`
          : REMOTE_CONTROL_SETUP_COPY,
        canTurnOn: false,
        canTurnOff: desired,
        canRetry: true,
      };
    case "failed":
      return {
        ...base,
        label: "Failed",
        tone: "error",
        detail: message
          ? `Remote Control could not connect. ${message}`
          : "Remote Control could not connect.",
        canRetry: true,
      };
    default:
      // "off" or never reported: a saved choice with no live connection is paused.
      return desired
        ? {
            ...base,
            label: "Paused",
            tone: "warn",
            detail:
              "Remote Control is on for this chat but not connected. It reconnects with your next message, or select Retry.",
            canRetry: true,
          }
        : {
            ...base,
            label: "Off",
            tone: "neutral",
            detail: "Remote Control is off for this chat.",
            canRetry: false,
          };
  }
}
