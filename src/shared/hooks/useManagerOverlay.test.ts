// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useManagerOverlay } from "./useManagerOverlay";
let root: Root, container: HTMLDivElement, previous: HTMLButtonElement;
function Harness({ navigationKey }: { navigationKey: string }) {
  const overlay = useManagerOverlay(
    "open-manager",
    "other-manager",
    navigationKey,
  );
  return createElement(
    "div",
    null,
    createElement("button", { id: "workspace" }, "Workspace"),
    overlay.open
      ? createElement(
          "div",
          { ref: overlay.root, tabIndex: -1, "data-manager-overlay": "" },
          "Manager",
        )
      : null,
  );
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(createElement(Harness, { navigationKey: "sessions" })));
  previous = container.querySelector("button")!;
  previous.focus();
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
it("focuses the opened manager and restores workspace interaction on close", () => {
  act(() => window.dispatchEvent(new Event("open-manager")));
  expect(document.activeElement?.textContent).toBe("Manager");
  expect(previous.inert).toBe(true);
  act(() =>
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", cancelable: true }),
    ),
  );
  expect(container.querySelector("[data-manager-overlay]")).toBeNull();
  expect(previous.inert).toBe(false);
  expect(document.activeElement).toBe(previous);
});
it("closes when another surface opens or navigation changes", () => {
  act(() => window.dispatchEvent(new Event("open-manager")));
  act(() => window.dispatchEvent(new Event("other-manager")));
  expect(container.querySelector("[data-manager-overlay]")).toBeNull();
  act(() => window.dispatchEvent(new Event("open-manager")));
  act(() => root.render(createElement(Harness, { navigationKey: "settings" })));
  expect(container.querySelector("[data-manager-overlay]")).toBeNull();
  expect(previous.inert).toBe(false);
});
it("leaves Escape to an open picker or modal", () => {
  act(() => window.dispatchEvent(new Event("open-manager")));
  const modal = document.createElement("div");
  modal.setAttribute("role", "dialog");
  document.body.append(modal);
  act(() =>
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", cancelable: true }),
    ),
  );
  expect(container.querySelector("[data-manager-overlay]")).not.toBeNull();
  modal.remove();
});
