// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SharedHoverHighlight } from "../../features/sessions/ui/SharedHoverHighlight";
import {
  clearHoverDebugEvents,
  hoverDebugEvents,
  isPerfDebugEnabled,
  paintsOwnHoverFill,
  reportHoverDebug,
  setPerfDebugEnabled,
} from "./perfDebug";
import { PerfOverlayHost } from "./PerfOverlay";

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  setPerfDebugEnabled(false);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  setPerfDebugEnabled(false);
  vi.unstubAllGlobals();
});

describe("perf debug store", () => {
  it("records nothing while the overlay is closed", () => {
    reportHoverDebug({
      kind: "glide",
      surface: "List",
      item: "A",
      ownFill: false,
    });
    expect(hoverDebugEvents()).toHaveLength(0);
    setPerfDebugEnabled(true);
    reportHoverDebug({
      kind: "snap",
      surface: "List",
      item: "A",
      ownFill: false,
    });
    expect(hoverDebugEvents()[0]).toMatchObject({ kind: "snap", item: "A" });
    expect(localStorage.getItem("monocode.perfOverlay")).toBe("true");
    clearHoverDebugEvents();
    expect(hoverDebugEvents()).toHaveLength(0);
  });

  it("flags items that paint their own hover background, but not selected rows", () => {
    const item = document.createElement("button");
    document.body.append(item);
    item.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
    expect(paintsOwnHoverFill(item)).toBe(true);
    item.style.backgroundColor = "rgba(0, 0, 0, 0)";
    expect(paintsOwnHoverFill(item)).toBe(false);
    item.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
    item.setAttribute("aria-current", "true");
    expect(paintsOwnHoverFill(item)).toBe(false);
    item.remove();
  });
});

const list = () =>
  createElement(
    "ul",
    { "aria-label": "Demo list", style: { position: "relative" } },
    createElement(SharedHoverHighlight),
    createElement("li", { "data-shared-hover-item": "", id: "one" }, "One"),
    createElement("li", { id: "gap" }, "spacer"),
    createElement("li", { "data-shared-hover-item": "", id: "two" }, "Two"),
  );
const move = (id: string) =>
  act(() => {
    container
      .querySelector(`#${id}`)!
      .dispatchEvent(new PointerEvent("pointermove", { bubbles: true }));
  });

it("reports glide, snap and the element that broke the glide", () => {
  setPerfDebugEnabled(true);
  act(() => root.render(list()));
  move("one");
  move("two");
  move("gap");
  move("one");
  const kinds = [...hoverDebugEvents()].reverse().map((event) => event.kind);
  expect(kinds).toEqual(["snap", "glide", "hide", "snap"]);
  const hide = hoverDebugEvents().find((event) => event.kind === "hide")!;
  expect(hide.surface).toBe("Demo list");
  expect(hide.reason).toContain("outside this list's glide region");
});

it("toggles the overlay with Ctrl+Alt+Shift+P", () => {
  act(() => root.render(createElement(PerfOverlayHost)));
  expect(
    container.querySelector('[aria-label="Performance overlay"]'),
  ).toBeNull();
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        code: "KeyP",
        ctrlKey: true,
        altKey: true,
        shiftKey: true,
      }),
    );
  });
  expect(isPerfDebugEnabled()).toBe(true);
  expect(
    container.querySelector('[aria-label="Performance overlay"]'),
  ).not.toBeNull();
  act(() =>
    container
      .querySelector<HTMLButtonElement>(
        '[aria-label="Close performance overlay"]',
      )!
      .click(),
  );
  expect(
    container.querySelector('[aria-label="Performance overlay"]'),
  ).toBeNull();
});
