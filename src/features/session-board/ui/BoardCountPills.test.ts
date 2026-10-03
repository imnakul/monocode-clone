// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { BoardCountPills } from "./BoardCountPills";
import { boardCountsLabel } from "../useBoardCounts";

it("shows non-zero column counts and an accessible summary", () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  const root = createRoot(container);
  const counts = { inProgress: 2, needsAttention: 0, done: 3 };
  act(() => root.render(createElement(BoardCountPills, { counts })));
  const pills = [
    ...container.querySelectorAll<HTMLElement>("[data-board-count]"),
  ];
  expect(
    pills.map((pill) => [pill.dataset.boardCount, pill.textContent]),
  ).toEqual([
    ["inProgress", "2"],
    ["done", "3"],
  ]);
  expect(boardCountsLabel(counts)).toBe("2 in progress, 3 done");
  act(() =>
    root.render(
      createElement(BoardCountPills, {
        counts: { inProgress: 0, needsAttention: 0, done: 0 },
      }),
    ),
  );
  expect(container.textContent).toBe("");
  act(() => root.unmount());
  vi.unstubAllGlobals();
});
