// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localDay, type Task } from "../tasks";
import { addDays, describeDay, TaskWeekStrip, weekWindow } from "./TaskWeekStrip";

function task(id: string, changes: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    body: "",
    status: "todo",
    tags: [],
    createdAt: 1,
    updatedAt: 1,
    focusDays: [],
    ...changes,
  };
}

const TODAY = localDay(new Date(2026, 9, 7, 12).getTime());
let root: Root, container: HTMLDivElement, selected: string | null | undefined;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  selected = undefined;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

async function render(tasks: Task[] = [], day: string | null = null) {
  await act(async () =>
    root.render(
      createElement(TaskWeekStrip, {
        tasks,
        today: TODAY,
        selectedDay: day,
        onSelect: (next: string | null) => {
          selected = next;
        },
      }),
    ),
  );
}
const tabs = () =>
  [...container.querySelectorAll<HTMLElement>('[role="tab"]')].filter(
    (entry) => !/^All/.test(entry.getAttribute("aria-label") ?? ""),
  );
const allTab = () =>
  container.querySelector<HTMLElement>('[aria-label^="All"]')!;
async function click(element: Element | null | undefined) {
  await act(async () => (element as HTMLElement).click());
}

describe("TaskWeekStrip", () => {
  it("centres a 7-day window on today with All at the end", async () => {
    expect(weekWindow(TODAY)).toEqual([
      addDays(TODAY, -3),
      addDays(TODAY, -2),
      addDays(TODAY, -1),
      TODAY,
      addDays(TODAY, 1),
      addDays(TODAY, 2),
      addDays(TODAY, 3),
    ]);
    await render();
    expect(tabs()).toHaveLength(7);
    expect(tabs()[3]!.getAttribute("aria-label")).toMatch(/^Wed 7 Oct/);
    expect(allTab().textContent).toContain("All");
  });

  it("shifts the window by 7 days with the arrows", async () => {
    await render();
    await click(container.querySelector('[aria-label="Next week"]'));
    expect(tabs()[3]!.getAttribute("aria-label")).toMatch(/^Wed 14 Oct/);
    await click(container.querySelector('[aria-label="Previous week"]'));
    await click(container.querySelector('[aria-label="Previous week"]'));
    expect(tabs()[0]!.getAttribute("aria-label")).toMatch(/^Sun 27 Sep/);
  });

  it("labels days with counts and marks busy days with a dot", async () => {
    const rows = [
      task("a", { focusDate: TODAY }),
      task("b", { focusDate: TODAY }),
      task("c", { focusDays: [addDays(TODAY, 1)] }),
    ];
    await render(rows);
    expect(tabs()[3]!.getAttribute("aria-label")).toBe("Wed 7 Oct, 2 tasks");
    expect(tabs()[4]!.getAttribute("aria-label")).toBe("Thu 8 Oct, 1 task");
    expect(tabs()[0]!.getAttribute("aria-label")).toMatch(/no tasks$/);
    // Dots only where the count is non-zero.
    expect(tabs()[3]!.querySelector("span.size-1")).not.toBeNull();
    expect(tabs()[0]!.querySelector("span.size-1")).toBeNull();
  });

  it("clicking the selected day again selects All", async () => {
    await render([], TODAY);
    await click(tabs()[3]);
    expect(selected).toBeNull();
    await render([], null);
    await click(allTab());
    expect(selected).toBeNull();
  });

  it("shows the selected pill on the selected item and hides it outside the window", async () => {
    // happy-dom has no layout (every offsetLeft is 0), so assert visibility.
    await render([], TODAY);
    expect(
      container.querySelector("[data-week-pill]")!.style.opacity,
    ).toBe("1");
    await render([], null);
    expect(
      container.querySelector("[data-week-pill]")!.style.opacity,
    ).toBe("1");
    // A selected day outside the window hides the pill.
    await render([], addDays(TODAY, 30));
    expect(
      container.querySelector("[data-week-pill]")!.style.opacity,
    ).toBe("0");
  });

  it("steps with arrow keys, wraps the week at the edges, and jumps Home", async () => {
    await render([], TODAY);
    const strip = container.querySelector<HTMLElement>(
      '[role="tablist"][aria-label="Task days"]',
    )!;
    const key = (key: string) =>
      act(async () => {
        strip.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      });
    await key("ArrowRight");
    expect(selected).toBe(addDays(TODAY, 1));
    await render([], addDays(TODAY, 1));
    await key("Home");
    expect(selected).toBe(TODAY);
    // Past the last day: All.
    await render([], addDays(TODAY, 3));
    await key("ArrowRight");
    expect(selected).toBeNull();
    // Before the first day: the week shifts back 7 days.
    await render([], addDays(TODAY, -3));
    await key("ArrowLeft");
    expect(selected).toBe(addDays(TODAY, -4));
    expect(tabs()[6]!.getAttribute("aria-label")).toMatch(
      new RegExp(`^${describeDay(addDays(TODAY, -4))}`),
    );
  });

  it("puts the centre node in today's place, and between the 3rd and 4th day in other weeks", async () => {
    await act(async () =>
      root.render(
        createElement(TaskWeekStrip, {
          tasks: [],
          today: TODAY,
          selectedDay: TODAY,
          onSelect: () => {},
          center: createElement("button", { "data-center": "" }, "Focus"),
        }),
      ),
    );
    const order = () =>
      [...container.querySelectorAll<HTMLElement>('[role="tab"], [data-center]')].map(
        (entry) => (entry.hasAttribute("data-center") ? "center" : entry.getAttribute("aria-label")!.split(",")[0]!),
      );
    // Today's own cell gives way to the centre: 3 days, centre, 3 days, All.
    expect(order()).toEqual([
      describeDay(addDays(TODAY, -3)),
      describeDay(addDays(TODAY, -2)),
      describeDay(addDays(TODAY, -1)),
      "center",
      describeDay(addDays(TODAY, 1)),
      describeDay(addDays(TODAY, 2)),
      describeDay(addDays(TODAY, 3)),
      "All",
    ]);
    // The selected day is today, which the centre represents: no pill.
    expect(container.querySelector("[data-week-pill]")!.style.opacity).toBe("0");
    // Another week: all 7 days show, with the centre after the 3rd.
    await click(container.querySelector('[aria-label="Previous week"]'));
    const shifted = order();
    expect(shifted).toHaveLength(9);
    expect(shifted[3]).toBe("center");
    expect(shifted[4]).toBe(describeDay(addDays(TODAY, -7)));
  });
});
