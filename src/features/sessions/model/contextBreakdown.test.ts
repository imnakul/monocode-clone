import { describe, expect, it } from "vitest";
import {
  nativeSegments,
  type NativeContextBreakdown,
} from "./contextBreakdown";

describe("native context segments", () => {
  it("preserves provider ordering, uses reported sources and excludes deferred categories", () => {
    const fixture: NativeContextBreakdown = {
      source: "claude",
      totalTokens: 60,
      windowTokens: 100,
      memoryFiles: [],
      mcpServers: [],
      categories: [
        { name: "Messages", tokens: 60, kind: "used" },
        { name: "Buffer", tokens: 10, kind: "buffer" },
        { name: "Deferred", tokens: 5, kind: "deferred" },
        { name: "Free", tokens: 30, kind: "free" },
      ],
    };
    const segments = nativeSegments(fixture);
    expect(segments.map((segment) => segment.label)).toEqual([
      "Messages",
      "Buffer",
      "Free",
    ]);
    expect(segments.map((segment) => segment.colorClass)).toEqual([
      "bg-sky-400",
      "bg-content/20",
      "bg-content/5",
    ]);
    expect(segments.map((segment) => segment.percent)).toEqual([60, 10, 30]);
    expect(segments.every((segment) => segment.source === "reported")).toBe(
      true,
    );
  });
});
