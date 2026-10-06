// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "../tasks";
import {
  focusUnion,
  formatDayMonth,
  formatFocusRun,
  TaskTimeline,
} from "./TaskTimeline";

const TODAY = "2026-10-10";
function task(changes: Partial<Task> = {}): Task {
  return {
    id: "a",
    title: "a",
    body: "",
    status: "todo",
    tags: [],
    createdAt: new Date(2026, 9, 7, 12).getTime(),
    updatedAt: 1,
    focusDays: [],
    ...changes,
  };
}

describe("TaskTimeline", () => {
  it("unions history, the plan and the created day in order", () => {
    // Created on the 7th, planned for the 9th: the 7th stays out (R4).
    expect(
      focusUnion(
        task({ focusDays: ["2026-10-08"], focusDate: "2026-10-09" }),
        TODAY,
      ),
    ).toEqual(["2026-10-08", "2026-10-09"]);
    // Unpinned: the created day counts.
    expect(focusUnion(task(), TODAY)).toEqual(["2026-10-07"]);
    // A future plan and a created day covered by it stay out.
    expect(
      focusUnion(task({ focusDate: "2026-10-12" }), "2026-10-07"),
    ).toEqual([]);
  });

  it("lists short runs and collapses long ones", () => {
    expect(formatFocusRun(["2026-10-07", "2026-10-08", "2026-10-09"])).toBe(
      "7 Oct · 8 Oct · 9 Oct",
    );
    expect(
      formatFocusRun([
        "2026-10-07",
        "2026-10-08",
        "2026-10-09",
        "2026-10-10",
        "2026-10-11",
        "2026-10-14",
      ]),
    ).toBe("7 Oct … 14 Oct · 6 days");
    expect(formatDayMonth("2026-10-07")).toBe("7 Oct");
  });
});

describe("TaskTimeline rendering", () => {
  let root: Root, container: HTMLDivElement;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });
  async function render(entry: Task, today: string) {
    await act(async () =>
      root.render(createElement(TaskTimeline, { task: entry, today })),
    );
    // eslint-disable-next-line no-irregular-whitespace
    return (container.textContent ?? "").replaceAll(" ", " ");
  }

  it("renders the completed case with the duration", async () => {
    const text = await render(
      task({
        focusDays: ["2026-10-07", "2026-10-08"],
        focusDate: "2026-10-09",
        completedAt: new Date(2026, 9, 10, 16, 30).getTime(),
        status: "completed",
      }),
      TODAY,
    );
    expect(text).toContain("Timeline");
    expect(text).toContain("Created");
    expect(text).toContain("7 Oct");
    expect(text).toContain("7 Oct · 8 Oct · 9 Oct");
    expect(text).toContain("Completed");
    expect(text).toContain("10 Oct · took 3 days");
  });

  it("renders the open case with a day count", async () => {
    const text = await render(task({ focusDays: ["2026-10-07"] }), TODAY);
    expect(text).toContain("Open · 3 days");
  });

  it("renders a future plan", async () => {
    const text = await render(
      task({ focusDate: "2026-10-13", focusDays: ["2026-10-07"] }),
      TODAY,
    );
    expect(text).toContain("Planned");
    expect(text).toContain("13 Oct");
    expect(text).toContain("7 Oct");
  });
});
