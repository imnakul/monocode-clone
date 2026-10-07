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
  runId: status === "todo" ? `draft:run-${id}` : `run-${id}`,
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
  expect(props.onOpenSession).toHaveBeenLastCalledWith("running", false);
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
  // Stopped runs are finished: they share the Done column and its Clear.
  await act(async () => button("Clear Done").click());
  expect(hideBoardCards).toHaveBeenLastCalledWith([
    props.cards[1],
    props.cards[2],
  ]);
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
      .find(
        (entry) =>
          (
            entry.querySelector("[data-option-label]") ?? entry
          ).textContent?.trim() === option,
      )!
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
  await pick("Board status", "Needs attention");
  expect(card("blocked")).toBeTruthy();
  expect(container.querySelector('[data-board-card="one"]')).toBeNull();
});
it("uses the Session Manager header and toolbar without native selects", async () => {
  render();
  expect(
    container.querySelector('[role="region"]')?.getAttribute("aria-label"),
  ).toBe("Session Manager");
  expect(container.textContent).toContain("Session Manager");
  expect(container.textContent).not.toContain("Kanban");
  expect(container.querySelector("select")).toBeNull();
  const resetButton = () =>
    [...container.querySelectorAll("button")].find(
      (entry) => entry.textContent === "Reset",
    );
  expect(resetButton()).toBeUndefined();
  await pick("Board status", "Needs attention");
  expect(resetButton()).toBeDefined();
  await act(async () => resetButton()!.click());
  expect(resetButton()).toBeUndefined();
  expect(
    [...container.querySelectorAll("button")].some(
      (entry) => entry.textContent === "Reset filters",
    ),
  ).toBe(false);
});
it("shares the full width equally between columns, shrinking instead of scrolling", async () => {
  render();
  const columns = [
    ...container.querySelectorAll<HTMLElement>(
      "section[aria-label$=' column']",
    ),
  ];
  expect(columns.map((column) => column.getAttribute("aria-label"))).toEqual([
    "Draft column",
    "In progress column",
    "Needs attention column",
    "Done column",
  ]);
  for (const column of columns) {
    expect(column.classList.contains("flex-1")).toBe(true);
    expect(column.classList.contains("basis-0")).toBe(true);
    // Fit mode: no fixed minimum, so the board never scrolls sideways.
    expect(column.style.minWidth).toBe("0");
    expect(column.classList.contains("w-64")).toBe(false);
  }
  expect(
    container.querySelector<HTMLElement>("[data-board-card]")!.className,
  ).not.toContain("border-stroke");
});
it("keeps the board side at its split width when the session pane is open", async () => {
  render();
  await act(async () => card("running").click());
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 400));
  });
  let side: HTMLElement | null = container.querySelector<HTMLElement>(
    "section[aria-label='Draft column']",
  )!.parentElement;
  while (side && !side.style.width) side = side.parentElement;
  expect(side?.style.width).toBe("48%");
});
it("shows the workspace tab strip in the pane header instead of a single title", async () => {
  props.paneTabs = createElement("div", { "data-test-tabs": "" }, "Tabs");
  render();
  await act(async () => card("running").click());
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
  const workspace = container.querySelector<HTMLElement>(
    '[aria-label="Board session workspace"]',
  )!.parentElement!;
  expect(workspace.querySelector("[data-test-tabs]")).toBeTruthy();
});
it("opens no pane and shows no error when the session was deleted", async () => {
  props.onOpenSession = vi.fn(async () => false);
  render();
  await act(async () => card("running").click());
  expect(container.querySelector('[role="alert"]')).toBeNull();
  expect(props.onPaneVisible).not.toHaveBeenCalledWith(true);
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
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 400));
  });
  const divider = container.querySelector<HTMLElement>(
    '[aria-label="Board and session divider"]',
  )!;
  act(() =>
    divider.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
    ),
  );
  expect(divider.getAttribute("aria-valuenow")).toBe("43");
  expect(localStorage.getItem("monocode.boardWidth")).toBe("43");
  act(() =>
    [...container.querySelectorAll("button")]
      .find((button) => button.getAttribute("aria-label") === "Close session")!
      .click(),
  );
  // One close icon for the pane; no "Hide session pane" text in the toolbar.
  expect(container.textContent).not.toContain("Hide session pane");
  // It slides out while still mounted and not interactive, then hides.
  const host = container.querySelector<HTMLElement>(
    '[aria-label="Board session workspace"]',
  )!.parentElement!;
  expect(host.hasAttribute("inert")).toBe(true);
  expect(host.className).toContain("opacity-0");
  expect(props.onPaneVisible).toHaveBeenLastCalledWith(true);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 260));
  });
  expect(props.onPaneVisible).toHaveBeenLastCalledWith(false);
  expect(host.className).toBe("hidden");
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
  ].map((entry) =>
    (entry.querySelector("[data-option-label]") ?? entry).textContent?.trim(),
  );
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


it("draws session cards on the translucent board surface, not an opaque one", () => {
  render();
  const wrapper = container.querySelector<HTMLElement>(
    '[data-board-card="running"]',
  )!;
  // Menu surface tint: a translucent fill that follows the settings slider.
  expect(wrapper.className).toContain("surface-tint");
  expect(wrapper.className).not.toContain("bg-background-base");
});

it("shows the session total in the header and faceted counts in the filters", async () => {
  render();
  const count = () =>
    container.querySelector<HTMLElement>(
      '[data-tauri-drag-region] [role="status"]',
    );
  expect(count()?.textContent).toBe("3");
  await pick("Board status", "Done");
  expect(count()?.textContent).toBe("2 of 3");
  await act(async () =>
    container
      .querySelector<HTMLElement>('button[aria-label^="Board status:"]')!
      .click(),
  );
  const statusCounts = Object.fromEntries(
    [...document.querySelectorAll<HTMLElement>('[role="option"]')].map(
      (option) => {
        return [
          option.querySelector("[data-option-label]")?.textContent?.trim(),
          Number(option.querySelector(".tabular-nums")?.textContent),
        ];
      },
    ),
  );
  expect(statusCounts).toMatchObject({
    "All statuses": 3,
    Draft: 0,
    "In progress": 1,
    "Needs attention": 0,
    Done: 2,
  });
});
it("adds into the selected project, edits/deletes Todos, and starts beside the retained board", async () => {
  props.cwd = "/projects/current";
  props.cards = [row("prepared", "todo", "/projects/two")];
  props.onAddTodo = vi.fn(); props.onEditTodo = vi.fn(async () => {}); props.onStartTodo = vi.fn(async () => {}); props.onDeleteTodo = vi.fn(async () => {});
  render();
  await pick("Board project", "two");
  await act(async () => button("Add Draft").click());
  expect(props.onAddTodo).toHaveBeenCalledWith("/projects/two");
  await act(async () => button("Edit Session prepared").click());
  expect(props.onEditTodo).toHaveBeenCalledWith("prepared");
  await act(async () => button("Start Session prepared").click());
  expect(props.onStartTodo).toHaveBeenCalledWith("prepared");
  expect(props.onOpenSession).toHaveBeenCalledWith("prepared");
  expect(props.onPaneVisible).toHaveBeenLastCalledWith(true);
  expect(card("prepared")).toBeTruthy();
  await act(async () => button("Delete Todo Session prepared").click());
  expect(props.onDeleteTodo).toHaveBeenCalledWith("prepared");
  expect(hideBoardCards).not.toHaveBeenCalled();
});
it("keeps a rejected Todo start on the board with a readable error and retry action", async () => {
  props.cards = [row("prepared", "todo")]; props.onStartTodo = vi.fn().mockRejectedValueOnce(new Error("Provider unavailable")).mockResolvedValueOnce(undefined);
  render();
  await act(async () => button("Start Session prepared").click());
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("Provider unavailable");
  expect(props.onOpenSession).not.toHaveBeenCalled();
  expect(card("prepared")).toBeTruthy();
  await act(async () => button("Start Session prepared").click());
  expect(props.onStartTodo).toHaveBeenCalledTimes(2); expect(props.onOpenSession).toHaveBeenCalledWith("prepared");
});

it("treats the whole card as one hover surface and opens the session from anywhere on it", async () => {
  props.cards = [{ ...row("running", "in_progress"), reason: "Waiting on CI" }];
  render();
  const wrapper = container.querySelector<HTMLElement>(
    '[data-board-card="running"]',
  )!;
  // The whole card is the gliding hover item; the inner button is not one.
  expect(wrapper.hasAttribute("data-shared-hover-item")).toBe(true);
  expect(card("running").hasAttribute("data-shared-hover-item")).toBe(false);
  expect(card("running").className).not.toContain("hover:bg-content/5");
  // Clicking the lower details (not the title button) still opens the session.
  const details = [...wrapper.querySelectorAll("p")].find((entry) =>
    entry.textContent?.includes("one"),
  )!;
  await act(async () => details.click());
  expect(props.onOpenSession).toHaveBeenCalledWith("running", false);
});

it("lays out live cards in three lines, adds a reason only when a run needs you, and shortens finished cards", () => {
  props.cards = [
    { ...row("live", "in_progress"), branch: "dev", queuedCount: 2 },
    {
      ...row("held", "blocked"),
      reason: "The provider reached its usage limit",
    },
    { ...row("stopped", "stopped"), reason: "Stopped by you" },
  ];
  render();
  const wrapper = (id: string) =>
    container.querySelector<HTMLElement>(`[data-board-card="${id}"]`)!;
  const live = wrapper("live");
  expect(live.textContent).toContain("dev");
  expect(live.textContent).toContain("2 queued");
  expect(live.textContent).toContain("Model A");
  expect(live.querySelector("[data-board-tag]")?.textContent).toContain(
    "Working",
  );
  const held = wrapper("held");
  expect(held.closest("[aria-label='Needs attention column']")).toBeTruthy();
  expect(held.querySelector("[data-board-tag]")?.textContent).toBe(
    "Usage limit",
  );
  expect(
    [...held.querySelectorAll("p")].some(
      (entry) => entry.textContent === "The provider reached its usage limit",
    ),
  ).toBe(true);
  const stopped = wrapper("stopped");
  expect(stopped.closest("[aria-label='Done column']")).toBeTruthy();
  expect(stopped.querySelector("[data-board-tag]")?.textContent).toBe(
    "Stopped",
  );
  // Finished cards keep two lines: no branch row and no reason box.
  expect(stopped.querySelectorAll("p")).toHaveLength(0);
});
it("keeps the time and the card actions in one slot so they never overlap", () => {
  props.cards = [row("prepared", "todo")];
  props.onStartTodo = vi.fn(async () => {});
  props.onEditTodo = vi.fn(async () => {});
  props.onDeleteTodo = vi.fn(async () => {});
  render();
  const start = button("Start Session prepared");
  const slot = start.parentElement!.parentElement!;
  expect(slot.className).toContain("grid");
  expect(slot.className).toContain("min-w-[72px]");
  expect(slot.children[0].className).toContain("row-start-1");
  expect(slot.children[1].className).toContain("row-start-1");
  expect(button("Delete Todo Session prepared")).toBeTruthy();
});

it("has no per-column resize handles and ignores an old saved column width", () => {
  localStorage.setItem("monocode.sessionBoard.columnWidth", "520");
  render();
  expect(container.querySelector('[aria-label^="Resize "]')).toBeNull();
  const done = container.querySelector<HTMLElement>('[aria-label="Done column"]')!;
  expect(done.className).toContain("flex-1");
  expect(done.style.flexBasis).toBe("");
});
it("shows the session list title and model name, not the stored prefix and raw id", () => {
  props.cards = [
    {
      ...row("named", "in_progress"),
      harness: "opencode",
      title: "opencode · trying this out",
      model: "opencode:opencode/unknown-free-model",
    },
  ];
  render();
  const named = container.querySelector<HTMLElement>(
    '[data-board-card="named"]',
  )!;
  expect(card("named").textContent).toBe("trying this out");
  expect(named.textContent).not.toContain("opencode:opencode/");
});

it("reflows four columns into an even 2×2 grid when the board is too narrow", () => {
  const width = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "clientWidth",
  );
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get() {
      return 800;
    },
  });
  try {
    render();
    const grid = container.querySelector<HTMLElement>("[data-board-wrapped]")!;
    expect(grid.dataset.boardWrapped).toBe("2");
    expect(grid.style.gridTemplateColumns).toBe("repeat(2, minmax(0, 1fr))");
    // The grid sizes columns: no fixed widths or resize handles while wrapped.
    expect(
      container.querySelector<HTMLElement>('[aria-label="Done column"]')!.style
        .minWidth,
    ).toBe("");
    expect(
      container.querySelector('[aria-label="Resize Draft column"]'),
    ).toBeNull();
  } finally {
    if (width) Object.defineProperty(HTMLElement.prototype, "clientWidth", width);
  }
});

it("slides the session pane in and out like the other side panes, with no card morph", async () => {
  render();
  await act(async () => card("running").click());
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
  const pane = container.querySelector<HTMLElement>("[data-board-pane]")!;
  expect(pane.className).toContain("transition-[opacity,transform]");
  expect(pane.className).toContain("translate-x-0");
  expect(pane.style.transform).toBe("");
  act(() =>
    pane.querySelector<HTMLButtonElement>('[aria-label="Close session"]')!.click(),
  );
  expect(pane.className).toContain("translate-x-full");
  expect(pane.hasAttribute("inert")).toBe(true);
});

it("keeps the toolbar row bottom-aligned so the gap above matches the board padding", () => {
  render();
  const row = container.querySelector('[aria-label="Search board"]')!.closest(
    ".flex.shrink-0",
  )!;
  expect(row.classList.contains("h-10")).toBe(true);
  expect(row.classList.contains("items-end")).toBe(true);
});
