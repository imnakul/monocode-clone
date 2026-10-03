// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SettingsToggle } from "./SettingsToggle";

const playCue = vi.fn();
vi.mock("../model/sounds", () => ({
  playCue: (...args: unknown[]) => playCue(...args),
}));

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  playCue.mockReset();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

it("is the shared switch with the switch sound cue", () => {
  const onChange = vi.fn();
  act(() =>
    root.render(
      createElement(SettingsToggle, { label: "Notes", on: false, onChange }),
    ),
  );
  const button = container.querySelector<HTMLButtonElement>('[role="switch"]')!;
  // Same markup as the shared Toggle: size, colours and thumb.
  expect(button.className).toContain("h-5 w-9");
  expect(button.className).toContain("bg-content/20");
  act(() => button.click());
  expect(onChange).toHaveBeenCalledWith(true);
  expect(playCue).toHaveBeenCalledWith("switch");
});
