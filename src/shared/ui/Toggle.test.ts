// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Toggle } from "./Toggle";

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

it("exposes switch state and calls its change and toggle handlers", () => {
  const onChange = vi.fn();
  const onToggle = vi.fn();
  act(() =>
    root.render(
      createElement(Toggle, {
        label: "Enable MCP",
        on: false,
        onChange,
        onToggle,
      }),
    ),
  );
  const button = container.querySelector<HTMLButtonElement>('[role="switch"]')!;
  expect(button.getAttribute("aria-label")).toBe("Enable MCP");
  expect(button.getAttribute("aria-checked")).toBe("false");
  act(() => button.click());
  expect(onChange).toHaveBeenCalledWith(true);
  expect(onToggle).toHaveBeenCalledTimes(1);
});

it("does not invoke handlers when disabled", () => {
  const onChange = vi.fn();
  const onToggle = vi.fn();
  act(() =>
    root.render(
      createElement(Toggle, {
        label: "Enable MCP",
        on: true,
        onChange,
        onToggle,
        disabled: true,
      }),
    ),
  );
  const button = container.querySelector<HTMLButtonElement>('[role="switch"]')!;
  expect(button.disabled).toBe(true);
  act(() => button.click());
  expect(onChange).not.toHaveBeenCalled();
  expect(onToggle).not.toHaveBeenCalled();
});
