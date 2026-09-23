// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Popover } from "./Popover";

/**
 * The sliding hover pill must paint between the popover's glass wash and its
 * content: the wash (`.popover-surface`) belongs to the stable frame, the
 * content layer above the marker stays transparent and unblurred. When the
 * wash sits on the content instead, its backdrop-filter smears the pill away
 * while `[data-shared-hover-active]` clears the row's own hover background —
 * hovered menu rows then show no highlight at all (Automations trigger
 * submenu, SelectMenu, tab-group submenus).
 */
describe("Popover shared-hover marker stacking", () => {
  let container: HTMLDivElement;
  let anchor: HTMLButtonElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    anchor = document.createElement("button");
    document.body.append(container, anchor);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    anchor.remove();
    vi.resetAllMocks();
    vi.unstubAllGlobals();
  });

  function renderMenu(): { first: HTMLButtonElement; second: HTMLButtonElement } {
    act(() =>
      root.render(
        createElement(
          Popover,
          {
            anchor,
            side: "bottom",
            align: "start",
            width: 220,
            role: "menu",
            "aria-label": "Test menu",
          },
          createElement("button", { type: "button", role: "menuitem" }, "Hourly"),
          createElement("button", { type: "button", role: "menuitem" }, "Daily"),
        ),
      ),
    );
    const rows = [
      ...document.body.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]',
      ),
    ];
    return { first: rows[0], second: rows[1] };
  }

  it("paints the marker between the frame wash and the transparent content layer", () => {
    renderMenu();
    const marker = document.body.querySelector<HTMLElement>(
      "[data-shared-hover-highlight]",
    );
    expect(marker).not.toBeNull();
    // The wash lives on the marker's parent (the stable frame).
    expect(marker!.parentElement!.className).toContain("popover-surface");
    // The content layer above the marker must stay transparent and unblurred.
    const content = marker!.nextElementSibling as HTMLElement;
    expect(content.className).not.toContain("popover-surface");
  });

  it("marks the hovered menu row active and shows the pill", () => {
    const { first, second } = renderMenu();
    const marker = document.body.querySelector<HTMLElement>(
      "[data-shared-hover-highlight]",
    )!;

    act(() => {
      second.dispatchEvent(new Event("pointermove", { bubbles: true }));
    });
    expect(second.getAttribute("data-shared-hover-active")).toBe("true");
    expect(first.getAttribute("data-shared-hover-active")).toBeNull();
    expect(marker.dataset.visible).toBe("true");
    expect(marker.style.opacity).toBe("1");

    act(() => {
      first.dispatchEvent(new Event("pointermove", { bubbles: true }));
    });
    expect(first.getAttribute("data-shared-hover-active")).toBe("true");
    expect(second.getAttribute("data-shared-hover-active")).toBeNull();
  });
});
