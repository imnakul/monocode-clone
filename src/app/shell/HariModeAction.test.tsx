// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HariModeAction } from "./HariModeAction";

describe("HariModeAction", () => {
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
    vi.unstubAllGlobals();
  });

  it.each([false, true])(
    "supports button activation and selected styling in compact=%s mode",
    (compact) => {
      const onClick = vi.fn();
      act(() =>
        root.render(
          createElement(HariModeAction, { compact, active: true, onClick }),
        ),
      );

      const button = container.querySelector("button")!;
      expect(button.getAttribute("aria-pressed")).toBe("true");
      expect(button.hasAttribute("data-shared-hover-preserve")).toBe(true);
      expect(button.getAttribute("aria-label")).toBe("Hari, return to projects");

      act(() => button.click());
      expect(onClick).toHaveBeenCalledTimes(1);
    },
  );
});
