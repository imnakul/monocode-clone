import { describe, expect, it } from "vitest";
import type { Task } from "../tasks";
import { dayDiff, focusDayChip, shortDay, shortTime } from "./TaskTags";

const TODAY = "2026-10-07";
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

describe("focusDayChip", () => {
  it("says Today for a pin that started today", () => {
    expect(focusDayChip(task({ focusDate: TODAY }), TODAY)).toEqual({
      label: "Today",
      past: false,
      today: true,
    });
  });
  it("says Since yesterday / N days ago / Since <date> for older work", () => {
    expect(
      focusDayChip(task({ focusDate: "2026-10-07", focusDays: ["2026-10-06"] }), TODAY),
    ).toMatchObject({ label: "Since yesterday" });
    expect(
      focusDayChip(task({ focusDate: "2026-10-06" }), "2026-10-09"),
    ).toMatchObject({ label: "Since 3 days ago" });
    expect(
      focusDayChip(task({ focusDate: "2026-09-28" }), TODAY),
    ).toMatchObject({ label: "Since 28 Sep" });
  });
  it("keeps the short date for a future plan", () => {
    expect(focusDayChip(task({ focusDate: "2026-10-09" }), TODAY)).toMatchObject({
      label: "9 Oct",
      past: false,
    });
  });
  it("shows no chip without a pin", () => {
    expect(focusDayChip(task(), TODAY)).toBeNull();
  });
});

describe("day helpers", () => {
  it("diffs calendar days and formats short dates and times", () => {
    expect(dayDiff("2026-10-07", "2026-10-10")).toBe(3);
    expect(dayDiff("2026-10-07", "2026-10-07")).toBe(0);
    expect(shortDay("2026-09-28")).toBe("28 Sep");
    expect(shortTime(new Date(2026, 9, 10, 16, 30).getTime())).toBe("4:30 PM");
  });
});
