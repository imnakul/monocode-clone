import { describe, expect, it } from "vitest";
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
