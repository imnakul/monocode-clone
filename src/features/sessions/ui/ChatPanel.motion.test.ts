// @vitest-environment happy-dom
import { act, createElement, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionSummary } from "../data/sessionStore";
import { ChatPanel } from "./ChatPanel";

let root: Root;
let container: HTMLDivElement;
let reduced = false;
let animate: ReturnType<typeof vi.spyOn>;

const chat = (id: string, createdAt = 1): SessionSummary => ({
  id, title: id, harness: "claude", createdAt, updatedAt: createdAt,
});

function render(chats: SessionSummary[]): void {
  act(() => root.render(createElement(StrictMode, null, createElement(ChatPanel, {
    chats, creating: false, error: null, onSelect: vi.fn(), onNew: vi.fn(),
  }))));
}

beforeEach(() => {
  localStorage.clear();
  reduced = false;
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("matchMedia", () => ({ matches: reduced }));
  animate = vi.spyOn(HTMLElement.prototype, "animate").mockImplementation(
    () => ({ cancel: vi.fn() }) as unknown as Animation,
  );
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

describe("chat list insertion motion", () => {
  it("animates only a fresh inserted row, not history loads or reordered rows", () => {
    const old = chat("old");
    render([old]);
    expect(animate).not.toHaveBeenCalled();
    const fresh = chat("fresh", Date.now());
    render([fresh, old]);
    expect(animate).toHaveBeenCalledTimes(2);
    expect(animate.mock.contexts.every((element) => container.contains(element as HTMLElement))).toBe(true);
    render([old, fresh, chat("earlier-history")]);
    expect(animate).toHaveBeenCalledTimes(2);
  });

  it("respects reduced motion for new rows", () => {
    render([chat("old")]);
    reduced = true;
    render([chat("fresh", Date.now()), chat("old")]);
    expect(animate).not.toHaveBeenCalled();
  });
});
