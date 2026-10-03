import { describe, expect, it } from "vitest";
import { burstFields } from "../../../shared/ui/CelebrationBurst";
import { focusDayChip } from "./TaskTags";

describe("focusDayChip", () => {
  it("says Today, the date ahead, or From <date> when carried over", () => {
    expect(focusDayChip("2026-10-03", "2026-10-03")).toEqual({
      label: "Today",
      past: false,
      today: true,
    });
    expect(focusDayChip("2026-10-05", "2026-10-03")).toMatchObject({
      label: "Oct 5",
      past: false,
    });
    expect(focusDayChip("2026-10-02", "2026-10-03")).toMatchObject({
      label: "From Oct 2",
      past: true,
    });
    expect(focusDayChip(undefined, "2026-10-03")).toBeNull();
  });
});

describe("burstFields", () => {
  it("uses one field normally and spreads wide targets, capped", () => {
    expect(burstFields(1200, false)).toBe(1);
    expect(burstFields(100, true)).toBe(1);
    expect(burstFields(1000, true)).toBe(4);
    expect(burstFields(9000, true)).toBe(6);
  });
});
