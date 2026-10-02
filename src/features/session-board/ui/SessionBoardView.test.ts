// @vitest-environment happy-dom
import { act, createElement, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SessionBoardView } from "./SessionBoardView";
import { hideBoardCards, loadBoard, type BoardCard } from "../sessionBoard";
vi.mock("../sessionBoard", async (original) => ({
  ...(await original<typeof import("../sessionBoard")>()),
  hideBoardCards: vi.fn(async () => {}),
  loadBoard: vi.fn(async () => {}),
}));
vi.mock("../../../app/shell/WindowControls", () => ({
  WindowControls: () => null,
}));
vi.mock("../../../app/shell/TitleBar", () => ({ OverlayNav: () => null }));
let root: Root,
  container: HTMLDivElement,
  props: ComponentProps<typeof SessionBoardView>;
const row = (
  id: string,
  status: BoardCard["status"],
  cwd = "/projects/one",
): BoardCard => ({
  sessionId: id,
  runId: `run-${id}`,
  title: `Session ${id}`,
  cwd,
  harness: "claude",
  model: "Model A",
  status,
  queuedCount: 0,
  updatedAt: 1,
});
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  localStorage.clear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  props = {
    cards: [
      row("running", "in_progress"),
      row("finished", "done"),
      row("stopped", "stopped", "/projects/two"),
    ],
    loading: false,
    error: null,
    onOpenSession: vi.fn(async () => {}),
    onClose: vi.fn(),
    onWorkspaceHost: vi.fn(),
    onPaneVisible: vi.fn(),
  };
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
const render = () =>
  act(() => root.render(createElement(SessionBoardView, props)));
const card = (id: string) =>
  container.querySelector<HTMLElement>(`[data-session-card="${id}"]`)!;
const button = (label: string) =>
  container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
it("keeps the board visible while opening sessions from different projects beside it", async () => {
  render();
  await act(async () => card("running").click());
  expect(props.onOpenSession).toHaveBeenLastCalledWith("running", undefined);
  expect(props.onPaneVisible).toHaveBeenLastCalledWith(true);
  await act(async () =>
    card("stopped").dispatchEvent(
      new MouseEvent("click", { bubbles: true, altKey: true }),
    ),
  );
  expect(props.onOpenSession).toHaveBeenLastCalledWith("stopped", true);
  expect(card("running")).toBeTruthy();
  expect(card("stopped")).toBeTruthy();
  expect(container.querySelector("[data-app-kanban]")).toBeTruthy();
  expect(props.onClose).not.toHaveBeenCalled();
});
it("removes and clears run-scoped terminal cards without deleting sessions", async () => {
  render();
  await act(async () => button("Clear Done").click());
  expect(hideBoardCards).toHaveBeenLastCalledWith([props.cards[1]]);
  await act(async () => button("Clear Cancelled / Stopped").click());
  expect(hideBoardCards).toHaveBeenLastCalledWith([props.cards[2]]);
  await act(async () => button("Remove Session running from board").click());
  expect(hideBoardCards).toHaveBeenLastCalledWith([props.cards[0]]);
  props.cards = props.cards.map((entry) =>
    entry.sessionId === "running"
      ? { ...entry, hiddenRunId: entry.runId }
      : entry,
  );
  render();
  expect(container.querySelector('[data-board-card="running"]')).toBeNull();
});
const pick = async (trigger: string, option: string) => {
  await act(async () =>
    container
      .querySelector<HTMLElement>(`button[aria-label^="${trigger}:"]`)!
      .click(),
  );
  await act(async () =>
    [...document.querySelectorAll<HTMLElement>('[role="option"]')]
      .find((entry) => entry.textContent?.trim() === option)!
      .click(),
  );
};
it("filters by project and status and clears only the filtered terminal cards", async () => {
  props.cards = [
    row("one", "done"),
    row("two", "done", "/projects/two"),
    row("blocked", "blocked"),
  ];
  render();
  await pick("Board project", "one");
  expect(container.querySelector('[data-board-card="two"]')).toBeNull();
  await act(async () => button("Clear Done").click());
  expect(hideBoardCards).toHaveBeenLastCalledWith([props.cards[0]]);
  await pick("Board status", "Blocked");
  expect(card("blocked")).toBeTruthy();
  expect(container.querySelector('[data-board-card="one"]')).toBeNull();
});
it("uses the Session board header and toolbar without native selects", async () => {
  render();
  expect(
    container.querySelector('[role="region"]')?.getAttribute("aria-label"),
  ).toBe("Session board");
  expect(container.textContent).toContain("Session board");
  expect(container.textContent).not.toContain("Kanban");
  expect(container.querySelector("select")).toBeNull();
  const resetButton = () =>
    [...container.querySelectorAll("button")].find(
      (entry) => entry.textContent === "Reset",
    );
  expect(resetButton()).toBeUndefined();
  await pick("Board status", "Blocked");
  expect(resetButton()).toBeDefined();
  await act(async () => resetButton()!.click());
  expect(resetButton()).toBeUndefined();
  expect(
    [...container.querySelectorAll("button")].some(
      (entry) => entry.textContent === "Reset filters",
    ),
  ).toBe(false);
});
it("shares the full width equally between columns with a 256px minimum", async () => {
  render();
  const columns = [
    ...container.querySelectorAll<HTMLElement>(
      "section[aria-label$=' column']",
    ),
  ];
  expect(columns).toHaveLength(6);
  for (const column of columns) {
    expect(column.classList.contains("flex-1")).toBe(true);
    expect(column.classList.contains("basis-0")).toBe(true);
    expect(column.style.minWidth).toBe("256px");
    expect(column.classList.contains("w-64")).toBe(false);
  }
  expect(
    container.querySelector<HTMLElement>("[data-board-card]")!.className,
  ).not.toContain("border-stroke");
});
it("keeps the board side at its split width when the session pane is open", async () => {
  render();
  await act(async () => card("running").click());
  let side: HTMLElement | null = container.querySelector<HTMLElement>(
    "section[aria-label='Todo column']",
  )!.parentElement;
  while (side && !side.style.width) side = side.parentElement;
  expect(side?.style.width).toBe("48%");
  expect(
    container.querySelector<HTMLElement>("section[aria-label='Todo column']")!
      .style.minWidth,
  ).toBe("256px");
});
it("reports an unavailable session and storage retry without opening an empty pane", async () => {
  props.onOpenSession = vi.fn(async () => {
    throw new Error("Session unavailable");
  });
  render();
  await act(async () => card("running").click());
  expect(container.querySelector('[role="alert"]')?.textContent).toContain(
    "Session unavailable",
  );
  expect(props.onPaneVisible).not.toHaveBeenCalledWith(true);
  const reload = [...container.querySelectorAll("button")].find(
    (button) => button.textContent === "Reload board",
  )!;
  await act(async () => reload.click());
  expect(loadBoard).toHaveBeenCalledOnce();
});
it("hides the session pane without removing its card and supports keyboard resizing", async () => {
  render();
  await act(async () => card("running").click());
  const divider = container.querySelector<HTMLElement>('[role="separator"]')!;
  act(() =>
    divider.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
    ),
  );
  expect(divider.getAttribute("aria-valuenow")).toBe("43");
  expect(localStorage.getItem("monocode.boardWidth")).toBe("43");
  act(() =>
    [...container.querySelectorAll("button")]
      .find((button) => button.textContent === "Hide session pane")!
      .click(),
  );
  expect(props.onPaneVisible).toHaveBeenLastCalledWith(false);
  expect(card("running")).toBeTruthy();
});

const projectTrigger = () =>
  container.querySelector<HTMLButtonElement>(
    'button[aria-label^="Board project:"]',
  )!;
const projectOptionLabels = async () => {
  await act(async () => projectTrigger().click());
  const labels = [
    ...document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].map((entry) => entry.textContent?.trim());
  await act(async () => projectTrigger().click());
  return labels;
};
it("lists known sidebar and current projects even before any board cards exist", async () => {
  props.cards = [];
  props.cwd = "E:/Projects/Current";
  props.recents = [
    { path: "E:/Projects/Teacher", openedAt: 2 },
    { path: "E:/Projects/MonoCode", openedAt: 1 },
  ];
  render();
  expect(await projectOptionLabels()).toEqual([
    "All projects",
    "Current",
    "Teacher",
    "MonoCode",
  ]);
});

it("deduplicates Windows project paths and filters persisted cards using the known project option", async () => {
  props.cwd = "E:/Projects/MonoCode";
  props.recents = [
    { path: "E:/Projects/Teacher", openedAt: 2 },
    { path: "E:/Projects/MonoCode", openedAt: 1 },
  ];
  props.cards = [
    row("running", "in_progress", "e:\\projects\\monocode\\"),
    row("old", "done", "E:/Other/Archived"),
  ];
  render();
  expect(await projectOptionLabels()).toEqual([
    "All projects",
    "Teacher",
    "MonoCode",
    "Archived",
  ]);
  await pick("Board project", "MonoCode");
  expect(card("running")).not.toBeNull();
  expect(container.querySelector('[data-board-card="old"]')).toBeNull();
});

it("keeps the selected Windows project when its display path changes slash style or casing", async () => {
  props.recents = [{ path: "E:/Projects/MonoCode", openedAt: 1 }];
  props.cards = [
    row("running", "in_progress", "e:/projects/monocode"),
    row("other", "done"),
  ];
  render();
  await pick("Board project", "MonoCode");
  props.recents = [{ path: "e:\\Projects\\MONOCODE\\", openedAt: 2 }];
  render();
  expect(projectTrigger().getAttribute("aria-label")).toBe(
    "Board project: MONOCODE",
  );
  expect(card("running")).not.toBeNull();
  expect(container.querySelector('[data-board-card="other"]')).toBeNull();
});
