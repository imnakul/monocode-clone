import { describe, expect, it } from "vitest";
import {
  REMOTE_CONTROL_SETUP_COPY,
  remoteControlView,
} from "./remoteControlView";

describe("remoteControlView", () => {
  it("is Off with no saved choice and never reports On unconfirmed", () => {
    const view = remoteControlView({ desired: false });
    expect(view).toMatchObject({ label: "Off", canTurnOn: true, canTurnOff: false });
    expect(remoteControlView({ desired: true }).label).toBe("Paused");
    expect(remoteControlView({ desired: true, status: "off" }).label).toBe(
      "Paused",
    );
  });

  it("separates desired intent from the confirmed state", () => {
    const connecting = remoteControlView({ desired: true, status: "connecting" });
    expect(connecting).toMatchObject({
      label: "Connecting",
      desired: true,
      canTurnOff: true,
      canRetry: false,
    });
    const on = remoteControlView({
      desired: true,
      status: "on",
      url: "https://claude.ai/code/session_1",
    });
    expect(on).toMatchObject({
      label: "On",
      url: "https://claude.ai/code/session_1",
    });
  });

  it("only exposes a link the provider returned", () => {
    expect(remoteControlView({ desired: true, status: "on" }).url).toBeUndefined();
    expect(
      remoteControlView({ desired: false, status: "off", url: "https://x" }).url,
    ).toBeUndefined();
  });

  it("explains consent with the exact setup steps and offers Retry", () => {
    const view = remoteControlView({ desired: true, status: "needs-consent" });
    expect(view.label).toBe("Needs setup");
    expect(view.detail).toBe(REMOTE_CONTROL_SETUP_COPY);
    expect(view.detail).toContain("`claude`");
    expect(view.detail).toContain("`/remote-control`");
    expect(view.detail).toContain("Retry");
    expect(view.canRetry).toBe(true);
  });

  it("shows the real failure reason and lets the user retry", () => {
    const view = remoteControlView({
      desired: false,
      status: "failed",
      message: "not signed in",
    });
    expect(view).toMatchObject({ label: "Failed", tone: "error", canRetry: true });
    expect(view.detail).toContain("not signed in");
  });
});
