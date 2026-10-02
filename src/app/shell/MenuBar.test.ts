// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MenuBar } from "./MenuBar";
import { saveKeybindingOverride } from "../../features/settings/model/settings";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(async () => {}) }));
vi.mock("../model/updater", () => ({ runUpdateFlow: vi.fn() }));

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
const render = () =>
  act(() =>
    root.render(
      createElement(MenuBar, {
        onNew: vi.fn(),
        onToggleSidebar: vi.fn(),
        onToggleSessionSidebar: vi.fn(),
      }),
    ),
  );
const press = (init: KeyboardEventInit) =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", init));
  });
const menuTitles = () =>
  [...container.querySelectorAll("button")].map((entry) => entry.textContent);

it("hides and restores the menu bar with Alt+O and remembers the choice", () => {
  render();
  expect(menuTitles()).toContain("File");
  press({ code: "KeyO", key: "o", altKey: true });
  expect(container.textContent).toBe("");
  expect(localStorage.getItem("monocode.menuBarVisible")).toBe("false");
  act(() => root.unmount());
  root = createRoot(container);
  render();
  expect(container.textContent).toBe("");
  press({ code: "KeyO", key: "o", altKey: true });
  expect(menuTitles()).toContain("File");
  expect(localStorage.getItem("monocode.menuBarVisible")).toBe("true");
});

it("ignores other chords and follows a rebound shortcut", () => {
  render();
  press({ code: "KeyO", key: "o", altKey: true, ctrlKey: true });
  press({ code: "KeyO", key: "o" });
  expect(menuTitles()).toContain("File");
  saveKeybindingOverride("View: Toggle Menu Bar", { shortcut: "Option+KeyM" });
  press({ code: "KeyO", key: "o", altKey: true });
  expect(menuTitles()).toContain("File");
  press({ code: "KeyM", key: "m", altKey: true });
  expect(container.textContent).toBe("");
});
