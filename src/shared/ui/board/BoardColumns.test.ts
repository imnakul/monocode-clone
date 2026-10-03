import { describe, expect, it } from "vitest";
import { boardColumnsPerRow } from "./BoardColumns";

describe("boardColumnsPerRow", () => {
  it("keeps one row while it fits, then splits evenly", () => {
    // 4 × 256 + 3 gaps + padding = 1116
    expect(boardColumnsPerRow(4, 1200, 256)).toBe(4);
    expect(boardColumnsPerRow(4, 900, 256)).toBe(2);
    expect(boardColumnsPerRow(4, 400, 256)).toBe(1);
    expect(boardColumnsPerRow(1, 100, 256)).toBe(1);
    expect(boardColumnsPerRow(3, 700, 256)).toBe(2);
  });
});
