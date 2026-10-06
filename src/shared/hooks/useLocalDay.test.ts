// @vitest-environment happy-dom
import { act } from "react";
import { createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localDay } from "../../features/tasks/tasks";
import { msUntilNextLocalDay, useLocalDay } from "./useLocalDay";

let root: Root, container: HTMLDivElement, seen: string[];

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 7, 12));
  seen = [];
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function Probe() {
  const day = useLocalDay();
  useEffect(() => {
    seen.push(day);
  }, [day]);
  return createElement("span", null, day);
}

describe("useLocalDay", () => {
  it("returns today and rolls over at midnight", async () => {
    await act(async () =>
      root.render(createElement(Probe)),
    );
    expect(seen).toEqual(["2026-10-07"]);
    // To just past the next midnight: the day flips once.
    await act(async () => {
      vi.advanceTimersByTime(msUntilNextLocalDay() + 1000);
    });
    expect(seen.at(-1)).toBe("2026-10-08");
    expect(container.textContent).toBe("2026-10-08");
    // The timer re-arms: the next midnight flips again.
    await act(async () => {
      vi.advanceTimersByTime(86_400_000);
    });
    expect(seen.at(-1)).toBe("2026-10-09");
  });

  it("clears the timer on unmount", async () => {
    const clear = vi.spyOn(globalThis, "clearTimeout");
    await act(async () => root.render(createElement(Probe)));
    await act(async () => root.unmount());
    expect(clear).toHaveBeenCalled();
  });

  it("measures until the next midnight plus one second", () => {
    const at = new Date(2026, 9, 7, 12).getTime();
    const delay = msUntilNextLocalDay(at);
    expect(new Date(at + delay).getDate()).toBe(8);
    expect(localDay(at)).toBe("2026-10-07");
  });
});
