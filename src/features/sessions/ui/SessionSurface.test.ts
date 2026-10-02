// @vitest-environment happy-dom
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { SessionSurface } from "./SessionSurface";
it("moves the mounted workspace between normal and board hosts without losing input or attachments", () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div"),
    host = document.createElement("div");
  document.body.append(container, host);
  const root = createRoot(container);
  let mounts = 0;
  function Workspace() {
    const [attachment] = useState(() => {
      mounts++;
      return "image.png";
    });
    return createElement(
      "div",
      null,
      createElement("textarea", { defaultValue: "Draft" }),
      createElement("span", null, attachment),
    );
  }
  const render = (target?: HTMLElement) =>
    act(() =>
      root.render(
        createElement(SessionSurface, {
          host: target,
          children: createElement(Workspace),
        }),
      ),
    );
  render();
  const textarea = container.querySelector("textarea")!;
  textarea.value = "Unsent changes";
  render(host);
  expect(host.querySelector("textarea")).toBe(textarea);
  expect(textarea.value).toBe("Unsent changes");
  expect(host.textContent).toContain("image.png");
  expect(mounts).toBe(1);
  render();
  expect(container.querySelector("textarea")).toBe(textarea);
  expect(mounts).toBe(1);
  act(() => root.unmount());
  container.remove();
  host.remove();
  vi.unstubAllGlobals();
});
