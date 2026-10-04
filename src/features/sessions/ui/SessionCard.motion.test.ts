// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionSummary } from "../data/sessionStore";
import { SessionCard } from "./SessionCard";

let root: Root;
let container: HTMLDivElement;
let reduced = false;

const session: SessionSummary = {
  id: "provider-row", cwd: "/tmp/project", harness: "claude",
  title: "First title", createdAt: 1, updatedAt: 1,
};

function render(title: string): void {
  act(() => root.render(createElement(SessionCard, {
    session: { ...session, title }, isActive: false, busy: false,
    done: false, needsApproval: false, now: 1, onSelect: vi.fn(),
  })));
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  reduced = false;
  vi.stubGlobal("matchMedia", () => ({ matches: reduced }));
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(64);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(16);
  const context = {
    scale: vi.fn(), fillText: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(),
    measureText: vi.fn(() => ({ width: 32 })),
    getImageData: vi.fn((_x: number, _y: number, width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
    })),
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(window, "requestAnimationFrame").mockReturnValue(42);
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
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

describe("title motion on shared provider/chat cards", () => {
  it("animates an updated title while keeping first paint still and replaces interrupted motion", () => {
    render("First title");
    expect(container.querySelector("canvas")).toBeNull();

    render("Updated title");
    expect(container.querySelectorAll("canvas")).toHaveLength(1);
    expect(container.querySelector('span[aria-hidden="true"]')?.textContent).toBe("First title");

    render("Final title");
    expect(container.querySelectorAll("canvas")).toHaveLength(1);
    expect(container.querySelector('span[aria-hidden="true"]')?.textContent).toBe("Updated title");
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(42);
    expect(container.querySelector("button")?.textContent).toContain("Final title");
  });

  it("shows the new title directly when reduced motion is requested", () => {
    render("First title");
    reduced = true;
    render("Updated title");
    expect(container.querySelector("canvas")).toBeNull();
    expect(container.querySelector("button")?.textContent).toContain("Updated title");
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });
});
