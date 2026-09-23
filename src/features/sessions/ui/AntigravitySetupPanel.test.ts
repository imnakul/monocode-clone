import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AntigravitySetupPanel, type AntigravitySetupPanelProps } from "./AntigravitySetupPanel";

function render(overrides: Partial<AntigravitySetupPanelProps> = {}): string {
  return renderToStaticMarkup(createElement(AntigravitySetupPanel, {
    available: false, signingIn: false, onSignIn: (): void => {}, onCancel: (): void => {}, ...overrides,
  }));
}

describe("Antigravity ACP setup", () => {
  // Missing installation must lead to the official ACP package, not the old CLI installer.
  it("explains the required executable pair and disables sign-in until installed", (): void => {
    const markup = render();
    expect(markup).toContain("agy_acp_server");
    expect(markup).toContain("localharness_external");
    expect(markup).toContain("https://github.com/agentclientprotocol/registry/tree/main/antigravity-acp");
    expect(markup).toMatch(/<button[^>]*disabled/);
  });
  // Browser opening is not equivalent to completing setup; a pending flow stays cancellable.
  it("shows a cancellable waiting state during Google sign-in", (): void => {
    const markup = render({ available: true, signingIn: true });
    expect(markup).toContain('aria-label="Cancel Antigravity sign-in"');
    expect(markup).toContain('role="status"');
    expect(markup).toContain("Waiting for Google sign-in");
  });
  // A provider error must be readable on installed builds without developer tools.
  it("surfaces an accessible error with a retry action", (): void => {
    const markup = render({ available: true, error: "Subscription required" });
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Subscription required");
    expect(markup).toContain('aria-label="Sign in to Antigravity with Google"');
  });
});
