// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateToasts } from "./UpdateToasts";
import type { CliUpdateNotice } from "../../../integrations/harness/core/cliVersions";

const notice: CliUpdateNotice = {
  harness: "claude",
  currentVersion: "2.1.267",
  latestVersion: "2.1.300",
  updateCommand: "npm i -g @anthropic-ai/claude-code",
};

describe("UpdateToasts", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders nothing when no CLI is outdated", () => {
    act(() =>
      root.render(
        createElement(UpdateToasts, { notices: [], onDismiss: () => {} }),
      ),
    );
    expect(document.body.textContent).not.toContain("update available");
  });

  it("shows the update command with its version delta and copies it", async () => {
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue();
    act(() =>
      root.render(
        createElement(UpdateToasts, { notices: [notice], onDismiss: () => {} }),
      ),
    );

    expect(document.body.textContent).toContain(
      "Claude Code update available",
    );
    expect(document.body.textContent).toContain("v2.1.267 → v2.1.300");
    expect(document.body.textContent).toContain(
      "npm i -g @anthropic-ai/claude-code",
    );

    const copy = [...document.body.querySelectorAll("button")].find(
      (button) => button.textContent === "Copy",
    )!;
    await act(async () => {
      copy.click();
    });

    expect(writeText).toHaveBeenCalledWith("npm i -g @anthropic-ai/claude-code");
    expect(document.body.textContent).toContain("Copied");
  });

  it("dismisses just that provider's notice", () => {
    const onDismiss = vi.fn();
    act(() =>
      root.render(
        createElement(UpdateToasts, { notices: [notice], onDismiss }),
      ),
    );
    const dismiss = document.body.querySelector<HTMLButtonElement>(
      '[aria-label="Dismiss Claude Code update notice"]',
    )!;
    act(() => {
      dismiss.click();
    });
    expect(onDismiss).toHaveBeenCalledWith("claude");
  });
});
