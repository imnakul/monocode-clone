import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SessionProviderStrip } from "./SessionProviderStrip";
import type { SessionProviderStripProps } from "./SessionProviderStrip";

function render(props: SessionProviderStripProps): string {
  return renderToStaticMarkup(createElement(SessionProviderStrip, props));
}
const onChange = vi.fn();

describe("SessionProviderStrip", () => {
  it("renders nothing when there is no note and no Remote Control", () => {
    expect(render({})).toBe("");
  });

  it("shows the older-transcript note without claiming history is loaded", () => {
    const html = render({ nativeNoticeProvider: "Claude" });
    expect(html).toContain("Continuing your Claude conversation");
    expect(html).toContain("Earlier");
    expect(html).toContain("not shown here yet");
    expect(html).not.toContain("Remote Control");
  });

  it.each([
    [{ desired: false }, "Off"],
    [{ desired: true }, "Paused"],
    [{ desired: true, status: "connecting" as const }, "Connecting"],
    [{ desired: true, status: "on" as const }, "On"],
    [{ desired: true, status: "needs-consent" as const }, "Needs setup"],
    [{ desired: false, status: "failed" as const, message: "no auth" }, "Failed"],
  ])("renders the %j state as %s", (state, label) => {
    const html = render({ remoteControl: { ...state, onChange } });
    expect(html).toContain(label);
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain(`Remote Control: ${label}.`);
  });

  it("describes setup with the exact steps and the real failure reason", () => {
    const setup = render({ remoteControl: { desired: true, status: "needs-consent", onChange } });
    expect(setup).toContain("Run `claude`, enter `/remote-control`, accept the prompt, then select Retry.");
    const failed = render({ remoteControl: { desired: false, status: "failed", message: "not signed in", onChange } });
    expect(failed).toContain("not signed in");
  });

  it("does not reflect a desired switch as connected", () => {
    const html = render({ remoteControl: { desired: true, onChange } });
    expect(html).toContain("Paused");
    expect(html).not.toContain(">On<");
  });
});
