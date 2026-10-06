// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BoardColumn, boardColumnsPerRow } from "./BoardColumns";

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

describe("BoardColumn surface", () => {
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
  async function render(highlighted: boolean) {
    await act(async () =>
      root.render(
        createElement(
          BoardColumn,
          {
            id: "todo",
            label: "Todo",
            count: 1,
            fillMin: 200,
            highlighted,
          },
          "card",
        ),
      ),
    );
    return container.querySelector<HTMLElement>("[data-board-column]")!;
  }

  it("uses the Settings card surface with no blur", async () => {
    const column = await render(false);
    expect(column.className).toContain("rounded-xl");
    expect(column.className).toContain("border-content/10");
    expect(column.className).toContain("bg-content/3");
    expect(column.className).not.toContain("surface-blur");
    expect(column.className).not.toContain("surface-tint");
    expect(column.className).not.toContain("rounded-lg");
  });

  it("marks the drop target with an accent border and no ring", async () => {
    const column = await render(true);
    expect(column.className).toContain("border-accent/40");
    expect(column.className).toContain("bg-content/5");
    expect(column.className).not.toContain("ring-1");
    expect(column.className).not.toContain("surface-blur");
  });
});
