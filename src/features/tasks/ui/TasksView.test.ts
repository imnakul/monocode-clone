// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { TasksView } from "./TasksView";
import {
  invalidateTasks,
  TASKS_CHANGED_EVENT,
  type Task,
  type TaskUpsert,
} from "../tasks";
import {
  BOARD_KEY,
  PEEK_WIDTH_KEY,
  TABLE_KEY,
  VIEW_KEY,
} from "../taskViewState";

const copy = vi.hoisted(() => vi.fn(async (_text: string) => {}));
vi.mock("../../../platform/tauri/clipboard", async (original) => ({
  ...(await original<typeof import("../../../platform/tauri/clipboard")>()),
  copyText: copy,
}));
vi.mock("@tauri-apps/api/core", async (original) => ({
  ...(await original<typeof import("@tauri-apps/api/core")>()),
  invoke: vi.fn(),
}));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    isMaximized: async () => false,
    onResized: async () => () => {},
  }),
}));
vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: () => ({ onDragDropEvent: async () => () => {} }),
}));

let root: Root, container: HTMLDivElement, rows: Map<string, Task>;
const sourceOpen = vi.fn();
const openBeside = vi.fn();
const onClose = vi.fn();

function row(partial: Partial<Task> & { id: string }): Task {
  return {
    title: partial.id,
    body: "",
    status: "todo",
    tags: [],
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  };
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  invalidateTasks();
  sourceOpen.mockReset();
  openBeside.mockReset();
  onClose.mockReset();
  copy.mockReset().mockResolvedValue();
  rows = new Map([
    [
      "first",
      row({
        id: "first",
        title: "Fix installer",
        body: "# Installer\n\n| OS | State |\n| --- | --- |\n| Windows | Bug |",
        status: "blocked",
        tags: ["windows", "bug"],
        projectCwd: "/work/project",
        sourceSessionId: "session",
        sourceBlockId: "cline:42",
        updatedAt: 10,
      }),
    ],
    [
      "personal",
      row({
        id: "personal",
        title: "Personal reminder",
        body: "Remember this",
        tags: ["home"],
        updatedAt: 2,
      }),
    ],
    [
      "docs",
      row({
        id: "docs",
        title: "Ship docs",
        body: "Write the docs",
        status: "in_progress",
        tags: ["docs", "bug"],
        projectCwd: "/work/other",
        updatedAt: 5,
      }),
    ],
  ]);
  vi.mocked(invoke)
    .mockReset()
    .mockImplementation(async (command, args) => {
      if (command === "tasks_list")
        return [...rows.values()].map((entry) => ({ ...entry }));
      if (command === "tasks_get") return rows.get(args?.id as string) ?? null;
      if (command === "tasks_upsert") {
        const input = args?.task as TaskUpsert;
        const old = rows.get(input.id);
        const saved: Task = {
          ...input,
          createdAt: old?.createdAt ?? 20,
          updatedAt: (old?.updatedAt ?? 20) + 1,
        };
        rows.set(input.id, saved);
        return saved;
      }
      if (command === "tasks_delete") {
        rows.delete(args?.id as string);
        return;
      }
      throw new Error(`Unexpected command ${command}`);
    });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function render() {
  await act(async () =>
    root.render(
      createElement(TasksView, {
        cwd: "/work/project",
        recents: [
          { path: "/work/project", openedAt: 1 },
          { path: "/work/other", openedAt: 2 },
        ],
        onClose,
        onOpenSource: sourceOpen,
        onOpenBeside: openBeside,
      }),
    ),
  );
}
const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
function input(label: string) {
  return container.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    `[aria-label="${label}"]`,
  )!;
}
function button(text: string) {
  return [...container.querySelectorAll<HTMLButtonElement>("button")].find(
    (entry) => entry.textContent?.trim() === text,
  )!;
}
function byLabel<T extends HTMLElement = HTMLElement>(label: string) {
  return container.querySelector<T>(`[aria-label="${label}"]`)!;
}
async function click(element: Element | null | undefined) {
  await act(async () => (element as HTMLElement).click());
}
async function change(label: string, value: string) {
  const element = input(label);
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(
      element,
      value,
    );
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
function listRow(title: string) {
  return [
    ...container.querySelectorAll<HTMLElement>(
      '[aria-label="Tasks"][role="list"] button',
    ),
  ].find((entry) => entry.textContent?.includes(title))!;
}
function tableRow(title: string) {
  return [...container.querySelectorAll<HTMLElement>("tr[data-task-row]")].find(
    (entry) => entry.textContent?.includes(title),
  )!;
}
function card(title: string) {
  return [...container.querySelectorAll<HTMLElement>("[data-task-card]")].find(
    (entry) => entry.textContent?.includes(title),
  )!;
}
const peek = () =>
  container.querySelector<HTMLElement>('[aria-label="Task panel"]');
async function pickOption(trigger: string, option: string) {
  await click(container.querySelector(`button[aria-label^="${trigger}:"]`));
  const choice = [
    ...document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((entry) => entry.textContent?.trim() === option);
  await click(choice);
}
async function pickMenuItem(trigger: HTMLElement | undefined, label: string) {
  await click(trigger);
  const item = [
    ...document.querySelectorAll<HTMLElement>(
      '[role="menuitem"], [role="menuitemcheckbox"]',
    ),
  ].find((entry) => entry.textContent?.trim() === label);
  await click(item);
}
async function escape(target: Element = document.body) {
  await act(async () => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      }),
    );
  });
}
async function switchView(label: "List" | "Table" | "Board") {
  await click(
    [
      ...container.querySelectorAll<HTMLElement>(
        '[aria-label="Tasks view"] [role="tab"]',
      ),
    ].find((entry) => entry.textContent?.trim() === label),
  );
}
function listTitles() {
  return [
    ...container.querySelectorAll<HTMLElement>(
      '[aria-label="Tasks"][role="list"] li button .font-semibold',
    ),
  ].map((entry) => entry.textContent);
}
function upserts() {
  return vi
    .mocked(invoke)
    .mock.calls.filter(([command]) => command === "tasks_upsert")
    .map(([, args]) => (args as { task: TaskUpsert }).task);
}

describe("Tasks list view", () => {
  it("defaults to a full-width List with no sidebar, newest first", async () => {
    await render();
    expect(container.querySelector("aside")).toBeNull();
    expect(
      byLabel("Tasks view").querySelector('[aria-selected="true"]')
        ?.textContent,
    ).toContain("List");
    expect(listTitles()).toEqual([
      "Fix installer",
      "Ship docs",
      "Personal reminder",
    ]);
    const first = listRow("Fix installer");
    expect(first.textContent).toContain("Blocked");
    expect(listRow("Personal reminder").textContent).toContain("Remember this");
    expect(first.textContent).toContain("#windows");
    expect(first.textContent).toContain("project");
    expect(listRow("Personal reminder").textContent).toContain("Personal");
    expect(peek()).toBeNull();
  });

  it("opens the peek pane when a row is clicked", async () => {
    await render();
    await click(listRow("Fix installer"));
    expect(peek()).not.toBeNull();
    expect(input("Task title").value).toBe("Fix installer");
    expect(listRow("Fix installer").getAttribute("aria-current")).toBe("true");
  });

  it("shows a spinner on first mount and cached rows on later mounts", async () => {
    let release: (value: Task[]) => void = () => {};
    const original = vi.mocked(invoke).getMockImplementation()!;
    vi.mocked(invoke).mockImplementation(async (command, args) => {
      if (command === "tasks_list")
        return new Promise<Task[]>((resolve) => {
          release = resolve;
        });
      return original(command, args);
    });
    await render();
    expect(byLabel("Loading tasks")).not.toBeNull();
    await act(async () => release([...rows.values()]));
    expect(listTitles()).toHaveLength(3);
    await act(async () => root.render(null));
    await render();
    // tasks_list is still pending, yet the cached rows are already on screen.
    expect(listTitles()).toHaveLength(3);
    expect(container.querySelector('[aria-label="Loading tasks"]')).toBeNull();
    await act(async () => release([...rows.values()]));
  });

  it("shows empty, filtered-empty and load-error states", async () => {
    rows.clear();
    await render();
    expect(container.textContent).toContain(
      "No tasks yet. Capture a selection from a transcript, or create one here.",
    );
    await act(async () => root.render(null));
    invalidateTasks();
    vi.mocked(invoke).mockImplementation(async () => {
      throw new Error("db locked");
    });
    await render();
    expect(container.textContent).toContain("Could not load tasks: db locked");
    expect(button("Retry")).toBeDefined();
  });

  it("keeps rows and shows a banner when a refresh fails", async () => {
    await render();
    const original = vi.mocked(invoke).getMockImplementation()!;
    vi.mocked(invoke).mockImplementation(async (command, args) => {
      if (command === "tasks_list") throw new Error("offline");
      return original(command, args);
    });
    await act(async () => window.dispatchEvent(new Event(TASKS_CHANGED_EVENT)));
    expect(container.textContent).toContain("Could not refresh tasks: offline");
    expect(listTitles()).toHaveLength(3);
  });
});

describe("toolbar layout", () => {
  it("puts New task first, filters next and the view switch last in one row", async () => {
    await render();
    const newTask = container.querySelector('[aria-label="New task"]')!;
    const search = container.querySelector('[aria-label="Filter tasks"]')!;
    const views = container.querySelector('[aria-label="Tasks view"]')!;
    const row = newTask.closest("div.h-10")!;
    expect(row.contains(search)).toBe(true);
    expect(row.contains(views)).toBe(true);
    expect(
      newTask.compareDocumentPosition(search) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      search.compareDocumentPosition(views) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const header = container.querySelector("[data-tauri-drag-region]")!;
    expect(header.contains(newTask)).toBe(false);
    expect(header.contains(views)).toBe(false);
  });
});

describe("filters", () => {
  it("combines search, status, project and tags with all/any and resets", async () => {
    await render();
    expect(container.querySelector("select")).toBeNull();
    expect(container.textContent).not.toContain("Reset filters");
    await change("Filter tasks", "installer");
    expect(listTitles()).toEqual(["Fix installer"]);
    await change("Filter tasks", "");
    await pickOption("Status", "Blocked");
    expect(listTitles()).toEqual(["Fix installer"]);
    await pickOption("Status", "All statuses");
    await pickOption("Project", "other");
    expect(listTitles()).toEqual(["Ship docs"]);
    await pickOption("Project", "Personal");
    expect(listTitles()).toEqual(["Personal reminder"]);
    await pickOption("Project", "All projects");
    await pickOption("Tag", "#windows");
    await pickOption("Tag", "#docs");
    // both tags must match by default
    expect(container.textContent).toContain("No tasks match these filters");
    await click(button("Match any"));
    expect(listTitles().sort()).toEqual(["Fix installer", "Ship docs"]);
    await click(byLabel("Remove tag filter #docs"));
    expect(listTitles()).toEqual(["Fix installer"]);
    expect(container.querySelector('[aria-label="Tag matching"]')).toBeNull();
    await click(button("Reset"));
    expect(listTitles()).toHaveLength(3);
    expect(container.textContent).not.toContain("Reset filters");
  });

  it("adds a tag filter from a chip without selecting the task", async () => {
    await render();
    await click(byLabel("Filter by tag #home"));
    expect(listTitles()).toEqual(["Personal reminder"]);
    expect(byLabel("Remove tag filter #home")).not.toBeNull();
    expect(peek()).toBeNull();
  });
});

describe("selection and peek", () => {
  it("keeps a filtered-out selection, keeps it across views, and closes on delete", async () => {
    await render();
    await click(listRow("Fix installer"));
    await pickOption("Status", "Todo");
    expect(listTitles()).toEqual(["Personal reminder"]);
    expect(input("Task title").value).toBe("Fix installer");
    await pickOption("Status", "All statuses");
    await switchView("Board");
    expect(input("Task title").value).toBe("Fix installer");
    await switchView("Table");
    expect(input("Task title").value).toBe("Fix installer");
    await click(button("Delete"));
    expect(rows.has("first")).toBe(false);
    expect(peek()).toBeNull();
  });

  it("closes the peek when the Operator deletes the task, in every view", async () => {
    await render();
    const targets = [
      ["List", "first"],
      ["Table", "docs"],
      ["Board", "personal"],
    ] as const;
    for (const [view, id] of targets) {
      await switchView(view);
      const title = rows.get(id)!.title;
      await click(
        view === "List"
          ? listRow(title)
          : view === "Table"
            ? tableRow(title)
            : card(title).querySelector("button[data-task-id]"),
      );
      expect(peek()).not.toBeNull();
      rows.delete(id);
      await act(async () =>
        window.dispatchEvent(new Event(TASKS_CHANGED_EVENT)),
      );
      expect(peek()).toBeNull();
    }
  });

  it("shows Operator edits in every view and in the open peek", async () => {
    await render();
    await click(listRow("Fix installer"));
    rows.set("first", {
      ...rows.get("first")!,
      title: "Operator updated",
      status: "completed",
      body: "Operator body",
      updatedAt: 99,
    });
    await act(async () => window.dispatchEvent(new Event(TASKS_CHANGED_EVENT)));
    expect(input("Task title").value).toBe("Operator updated");
    expect(peek()!.textContent).toContain("Operator body");
    expect(listRow("Operator updated").textContent).toContain("Completed");
    await switchView("Table");
    expect(tableRow("Operator updated")).toBeDefined();
    await switchView("Board");
    expect(
      card("Operator updated").closest('[aria-label="Completed column"]'),
    ).not.toBeNull();
  });

  it("closes the peek with Escape, then the view, and ignores menu Escapes", async () => {
    await render();
    await click(listRow("Fix installer"));
    // A status SearchableSelect handles its own Escape.
    await click(container.querySelector('button[aria-label^="Status:"]'));
    await escape(container.querySelector('button[aria-label^="Status:"]')!);
    expect(onClose).not.toHaveBeenCalled();
    expect(peek()).not.toBeNull();
    // So does the project picker.
    await click(
      container.querySelector('[aria-label^="Move task to project"]'),
    );
    expect(
      document.querySelector('[aria-label="Project picker"]'),
    ).not.toBeNull();
    await escape(
      container.querySelector('[aria-label^="Move task to project"]')!,
    );
    expect(document.querySelector('[aria-label="Project picker"]')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(peek()).not.toBeNull();
    await escape();
    expect(peek()).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    await escape();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("flushes unsaved edits when the selection changes before the debounce", async () => {
    await render();
    await click(listRow("Fix installer"));
    await change("Task title", "Renamed installer");
    await click(listRow("Personal reminder"));
    await act(async () => {
      await tick();
    });
    expect(upserts().some((task) => task.title === "Renamed installer")).toBe(
      true,
    );
    expect(rows.get("first")?.title).toBe("Renamed installer");
  });

  it("changes status from the status menu immediately", async () => {
    await render();
    await click(listRow("Fix installer"));
    await pickMenuItem(
      peek()!.querySelector<HTMLElement>('button[aria-label^="Task status"]')!,
      "Review",
    );
    expect(rows.get("first")?.status).toBe("review");
  });

  it("opens beside session from the peek header and the editor action", async () => {
    await render();
    await click(listRow("Fix installer"));
    await click(
      peek()!.querySelector('button[aria-label="Open beside session"]'),
    );
    expect(openBeside).toHaveBeenCalledWith(
      expect.objectContaining({ id: "first" }),
    );
    await click(button("Open beside session"));
    expect(openBeside).toHaveBeenCalledTimes(2);
    await click(button("Open source session"));
    expect(sourceOpen).toHaveBeenCalledWith("session", "cline:42");
  });

  it("copies unsaved Markdown, flushes on unmount and deletes without resurrection", async () => {
    await render();
    await click(listRow("Fix installer"));
    await click(button("Source"));
    const markdown =
      "---\ntitle: Draft\n---\n# Unsaved\n\n| A |\n| --- |\n| row |";
    await change("Task Markdown", markdown);
    await click(byLabel("Copy Markdown"));
    expect(copy).toHaveBeenCalledWith(markdown);
    await act(async () => root.render(null));
    expect(rows.get("first")?.body).toBe(markdown);
    await render();
    await click(listRow("Fix installer"));
    await click(button("Delete"));
    expect(rows.has("first")).toBe(false);
    await act(async () => root.render(null));
    expect(rows.has("first")).toBe(false);
  });

  it("retains failed edits for retry and reports source failures", async () => {
    await render();
    await click(listRow("Fix installer"));
    await click(button("Source"));
    const original = vi.mocked(invoke).getMockImplementation()!;
    vi.mocked(invoke).mockImplementation(async (command, args) => {
      if (command === "tasks_upsert") throw new Error("Disk full");
      return original(command, args);
    });
    await change("Task Markdown", "Keep failed draft");
    await act(async () => {
      await tick(450);
    });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Could not save task: Disk full",
    );
    expect(input("Task Markdown").value).toBe("Keep failed draft");
    vi.mocked(invoke).mockImplementation(original);
    await click(button("Retry"));
    expect(rows.get("first")?.body).toBe("Keep failed draft");
    sourceOpen.mockRejectedValueOnce(new Error("Source removed"));
    await click(button("Open source session"));
    expect(container.textContent).toContain("Source removed");
  });

  it("edits tags and moves the task between projects", async () => {
    await render();
    await click(listRow("Fix installer"));
    await change("Add task tag", "Release,");
    await act(async () => {
      await tick(450);
    });
    expect(rows.get("first")?.tags).toContain("release");
    await click(
      container.querySelector('[aria-label^="Move task to project"]'),
    );
    await click(
      document.querySelector(
        '[aria-label="Project picker"] button[title="/work/other"]',
      ),
    );
    expect(rows.get("first")?.projectCwd).toBe("/work/other");
    expect(container.textContent).not.toContain("Move to Personal");
  });
});

describe("creating tasks", () => {
  it("files under the current project with +, and Personal via the chevron", async () => {
    await render();
    await click(byLabel("New task"));
    const project = [...rows.values()].find(
      (entry) => entry.title === "Untitled" && entry.projectCwd,
    )!;
    expect(project.projectCwd).toBe("/work/project");
    expect(peek()).not.toBeNull();
    expect(input("Task Markdown")).not.toBeNull();
    await click(byLabel("Choose where the task is filed"));
    expect(document.body.textContent).toContain("File task under…");
    const personal = [
      ...document.querySelectorAll<HTMLElement>('[role="menuitemcheckbox"]'),
    ].find((entry) => entry.textContent?.trim() === "Personal");
    await click(personal);
    const created = [...rows.values()].find(
      (entry) => entry.title === "Untitled" && !entry.projectCwd,
    )!;
    expect(created).toMatchObject({ status: "todo", tags: [] });
  });

  it("disables the create buttons while a create is pending", async () => {
    let release: () => void = () => {};
    const original = vi.mocked(invoke).getMockImplementation()!;
    vi.mocked(invoke).mockImplementation(async (command, args) => {
      if (command === "tasks_upsert") {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }
      return original(command, args);
    });
    await render();
    await click(byLabel("New task"));
    expect(byLabel<HTMLButtonElement>("New task").disabled).toBe(true);
    expect(
      byLabel<HTMLButtonElement>("Choose where the task is filed").disabled,
    ).toBe(true);
    await act(async () => release());
    expect(byLabel<HTMLButtonElement>("New task").disabled).toBe(false);
  });
});

describe("view switching and persistence", () => {
  it("persists the chosen view, restores it, and supports arrow keys", async () => {
    await render();
    await switchView("Board");
    expect(localStorage.getItem(VIEW_KEY)).toBe("board");
    await act(async () => root.render(null));
    await render();
    expect(
      container.querySelector('[aria-label="Todo column"]'),
    ).not.toBeNull();
    const tab = container.querySelector<HTMLElement>(
      '[aria-label="Tasks view"] [aria-selected="true"]',
    )!;
    await act(async () => {
      tab.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
      );
    });
    expect(localStorage.getItem(VIEW_KEY)).toBe("table");
    expect(container.querySelector("table")).not.toBeNull();
  });
});

describe("table view", () => {
  async function openTable() {
    await render();
    await switchView("Table");
  }
  const headerLabels = () =>
    [...container.querySelectorAll("thead th")].map((entry) =>
      entry.textContent?.trim(),
    );

  it("groups by status, hides empty groups, collapses and persists", async () => {
    await openTable();
    const groups = [...container.querySelectorAll<HTMLElement>("tbody")].map(
      (entry) => entry.querySelector("button")?.textContent?.trim(),
    );
    expect(groups).toEqual(["Todo 1", "Progress 1", "Blocked 1"]);
    expect(headerLabels()).toEqual([
      "Title",
      "Status",
      "Project",
      "Tags",
      "Updated",
    ]);
    const todo = [
      ...container.querySelectorAll<HTMLButtonElement>("button[aria-expanded]"),
    ].find((entry) => entry.textContent?.includes("Todo"))!;
    await click(todo);
    expect(todo.getAttribute("aria-expanded")).toBe("false");
    expect(container.textContent).not.toContain("Personal reminder");
    expect(JSON.parse(localStorage.getItem(TABLE_KEY)!).collapsed).toEqual([
      "todo",
    ]);
    await act(async () => root.render(null));
    await render();
    expect(container.textContent).not.toContain("Personal reminder");
  });

  it("sorts by header with aria-sort and an id tie-breaker", async () => {
    rows.set("a", row({ id: "a", title: "Same", updatedAt: 3 }));
    rows.set("b", row({ id: "b", title: "Same", updatedAt: 4 }));
    await openTable();
    const th = (label: string) =>
      [...container.querySelectorAll("thead th")].find((entry) =>
        entry.textContent?.includes(label),
      )!;
    expect(th("Updated").getAttribute("aria-sort")).toBe("descending");
    await click(th("Title").querySelector("button"));
    expect(th("Title").getAttribute("aria-sort")).toBe("ascending");
    expect(th("Updated").getAttribute("aria-sort")).toBeNull();
    const todoIds = [
      ...container.querySelectorAll<HTMLElement>("tr[data-task-row]"),
    ]
      .map((entry) => entry.dataset.taskRow)
      .filter((id) => id === "a" || id === "b" || id === "personal");
    expect(todoIds).toEqual(["personal", "a", "b"]);
    await click(th("Title").querySelector("button"));
    expect(th("Title").getAttribute("aria-sort")).toBe("descending");
  });

  it("resizes columns by keyboard within limits, resets on double click and persists", async () => {
    await openTable();
    const handle = byLabel("Resize Status column");
    const key = (name: string, type: "keydown" | "keyup") =>
      act(async () => {
        handle.dispatchEvent(
          new KeyboardEvent(type, {
            key: name,
            bubbles: true,
            cancelable: true,
          }),
        );
      });
    await key("ArrowRight", "keydown");
    await key("ArrowRight", "keyup");
    expect(JSON.parse(localStorage.getItem(TABLE_KEY)!).widths.status).toBe(
      156,
    );
    for (let i = 0; i < 6; i += 1) {
      await key("ArrowLeft", "keydown");
      await key("ArrowLeft", "keyup");
    }
    expect(JSON.parse(localStorage.getItem(TABLE_KEY)!).widths.status).toBe(
      110,
    );
    await act(async () => {
      handle.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    });
    expect(JSON.parse(localStorage.getItem(TABLE_KEY)!).widths.status).toBe(
      140,
    );
    expect(container.querySelector("col")).not.toBeNull();
  });

  it("hides a column from the Columns menu and keeps it hidden after remount", async () => {
    await openTable();
    await click(byLabel("Choose visible columns"));
    const labels = [
      ...document.querySelectorAll('[role="menuitemcheckbox"]'),
    ].map((entry) => entry.textContent?.trim());
    expect(labels).toEqual([
      "Status",
      "Project",
      "Tags",
      "Updated",
      "Completed",
    ]);
    await click(
      [...document.querySelectorAll('[role="menuitemcheckbox"]')].find(
        (entry) => entry.textContent?.trim() === "Tags",
      ),
    );
    expect(headerLabels()).not.toContain("Tags");
    await act(async () => root.render(null));
    await render();
    expect(headerLabels()).not.toContain("Tags");
  });

  it("selects on row click but not on status-menu or tag clicks", async () => {
    await openTable();
    await click(
      container.querySelector(
        'tr[data-task-row="first"] button[aria-label^="Task status"]',
      ),
    );
    expect(peek()).toBeNull();
    await escape(document.querySelector('[role="menu"]')!);
    await click(
      container.querySelector(
        'tr[data-task-row="first"] [aria-label="Filter by tag #bug"]',
      ),
    );
    expect(peek()).toBeNull();
    await click(tableRow("Ship docs").querySelector("td:nth-child(3)"));
    expect(peek()).not.toBeNull();
    expect(tableRow("Ship docs").getAttribute("aria-selected")).toBe("true");
  });
});

describe("board view", () => {
  async function openBoard() {
    await render();
    await switchView("Board");
  }
  const columnLabels = () =>
    [
      ...container.querySelectorAll<HTMLElement>(
        "section[aria-label$=' column']",
      ),
    ].map((entry) => entry.getAttribute("aria-label"));

  it("hides Draft and Deferred by default and toggles them from Columns", async () => {
    await openBoard();
    expect(columnLabels()).toEqual([
      "Todo column",
      "Progress column",
      "Blocked column",
      "Review column",
      "Completed column",
    ]);
    await pickMenuItem(byLabel("Choose visible columns"), "Draft");
    expect(columnLabels()[0]).toBe("Draft column");
    expect(JSON.parse(localStorage.getItem(BOARD_KEY)!).hidden).toEqual([
      "deferred",
    ]);
  });

  it("resizes the minimum column width and persists it", async () => {
    await openBoard();
    const handle = byLabel("Resize Todo column");
    await act(async () => {
      handle.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowRight",
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    await act(async () => {
      handle.dispatchEvent(
        new KeyboardEvent("keyup", { key: "ArrowRight", bubbles: true }),
      );
    });
    expect(JSON.parse(localStorage.getItem(BOARD_KEY)!).columnWidth).toBe(276);
    expect(byLabel("Todo column").style.minWidth).toBe("276px");
  });

  describe("drag and optimistic moves", () => {
    let over: Element | null = null;
    beforeEach(() => {
      over = null;
      document.elementFromPoint = () => over;
    });
    const pointer = (type: string, target: EventTarget, x: number, y: number) =>
      act(async () => {
        target.dispatchEvent(
          new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            button: 0,
          }),
        );
      });
    async function drag(title: string, to: string, release = true) {
      const source = card(title);
      await pointer("pointerdown", source, 10, 10);
      await pointer("pointermove", window, 30, 30);
      over = byLabel(`${to} column`);
      await pointer("pointermove", window, 40, 40);
      if (release) await pointer("pointerup", window, 40, 40);
    }

    it("treats a move under 4px as a click and opens the peek", async () => {
      await openBoard();
      const source = card("Fix installer");
      await pointer("pointerdown", source, 10, 10);
      await pointer("pointermove", window, 12, 12);
      await pointer("pointerup", window, 12, 12);
      await click(source.querySelector("button[data-task-id]"));
      expect(peek()).not.toBeNull();
      expect(rows.get("first")?.status).toBe("blocked");
    });

    it("moves a card optimistically and persists the status", async () => {
      await openBoard();
      await drag("Fix installer", "Review");
      expect(
        card("Fix installer").closest('[aria-label="Review column"]'),
      ).not.toBeNull();
      await act(async () => {
        await tick();
      });
      expect(rows.get("first")?.status).toBe("review");
      expect(peek()).toBeNull();
      expect(document.body.style.cursor).toBe("");
    });

    it("cancels with Escape and does nothing when dropped on the same column", async () => {
      await openBoard();
      await drag("Fix installer", "Review", false);
      expect(byLabel("Review column").className).toContain("ring-accent");
      await escape();
      expect(byLabel("Review column").className).not.toContain("ring-accent");
      expect(onClose).not.toHaveBeenCalled();
      await drag("Fix installer", "Blocked");
      expect(upserts()).toHaveLength(0);
      expect(
        card("Fix installer").closest('[aria-label="Blocked column"]'),
      ).not.toBeNull();
    });

    // Writes are serialized per task in a module-level queue, so every test
    // must settle the writes it deferred before the next one starts.
    const openGates: { resolve: () => void }[] = [];
    afterEach(async () => {
      for (const gate of openGates.splice(0)) gate.resolve();
      await act(async () => {
        await tick(5);
      });
    });
    function deferUpserts() {
      const original = vi.mocked(invoke).getMockImplementation()!;
      const gates: { resolve: () => void; reject: (error: Error) => void }[] =
        [];
      vi.mocked(invoke).mockImplementation(async (command, args) => {
        if (command === "tasks_upsert") {
          await new Promise<void>((resolve, reject) => {
            const gate = { resolve, reject };
            gates.push(gate);
            openGates.push(gate);
          });
        }
        return original(command, args);
      });
      return gates;
    }
    const inColumn = (title: string, column: string) =>
      card(title).closest(`[aria-label="${column} column"]`) !== null;

    it("keeps the latest move when an earlier write finishes first (A)", async () => {
      await openBoard();
      const gates = deferUpserts();
      await drag("Fix installer", "Review");
      await drag("Fix installer", "Todo");
      expect(inColumn("Fix installer", "Todo")).toBe(true);
      await act(async () => {
        await tick();
      });
      await act(async () => gates[0].resolve());
      await act(async () => tick());
      expect(inColumn("Fix installer", "Todo")).toBe(true);
      await act(async () => gates[1]?.resolve());
      await act(async () => tick(5));
      expect(inColumn("Fix installer", "Todo")).toBe(true);
    });

    it("ignores an earlier failure while a later move is pending (B)", async () => {
      await openBoard();
      const gates = deferUpserts();
      await drag("Fix installer", "Review");
      await drag("Fix installer", "Todo");
      await act(async () => tick());
      await act(async () => gates[0].reject(new Error("first failed")));
      await act(async () => tick());
      expect(inColumn("Fix installer", "Todo")).toBe(true);
      expect(container.textContent).not.toContain("first failed");
    });

    it("reverts and names the task when the latest move fails (C)", async () => {
      await openBoard();
      const gates = deferUpserts();
      await drag("Fix installer", "Review");
      await act(async () => tick());
      rows.delete("first");
      await act(async () => gates[0].reject(new Error("Task was not found")));
      await act(async () => tick());
      expect(container.textContent).toContain(
        'Could not move "Fix installer": Task was not found',
      );
      await click(byLabel("Dismiss"));
      expect(container.textContent).not.toContain("Could not move");
    });

    it("moves through the card status menu for keyboard users", async () => {
      await openBoard();
      await pickMenuItem(
        card("Fix installer").querySelector<HTMLElement>(
          'button[aria-label^="Task status"]',
        )!,
        "Completed",
      );
      expect(inColumn("Fix installer", "Completed")).toBe(true);
      await act(async () => tick());
      expect(rows.get("first")?.status).toBe("completed");
    });
  });
});

describe("persisted peek width", () => {
  it("restores a stored peek width, clamped", async () => {
    localStorage.setItem(PEEK_WIDTH_KEY, "5000");
    await render();
    await click(listRow("Fix installer"));
    expect(peek()!.style.width).toBe(
      `${Math.min(720, Math.round(window.innerWidth * 0.6))}px`,
    );
  });
});
