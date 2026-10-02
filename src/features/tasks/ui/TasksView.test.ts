// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { TasksView } from "./TasksView";
import { TASKS_CHANGED_EVENT, type Task, type TaskUpsert } from "../tasks";
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
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  sourceOpen.mockReset();
  copy.mockReset().mockResolvedValue();
  rows = new Map([
    [
      "first",
      {
        id: "first",
        title: "Fix installer",
        body: "# Installer\n\n| OS | State |\n| --- | --- |\n| Windows | Bug |",
        status: "blocked",
        tags: ["windows", "bug"],
        projectCwd: "/work/project",
        sourceSessionId: "session",
        sourceBlockId: "cline:42",
        createdAt: 1,
        updatedAt: 10,
      },
    ],
    [
      "personal",
      {
        id: "personal",
        title: "Personal reminder",
        body: "Remember this",
        status: "todo",
        tags: ["home"],
        createdAt: 1,
        updatedAt: 2,
      },
    ],
  ]);
  vi.mocked(invoke)
    .mockReset()
    .mockImplementation(async (command, args) => {
      if (command === "tasks_list")
        return [...rows.values()].map((row) => ({ ...row }));
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
        onClose: () => {},
        onOpenSource: sourceOpen,
      }),
    ),
  );
}
function input(label: string) {
  return container.querySelector<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >(`[aria-label="${label}"]`)!;
}
function button(text: string) {
  return [...container.querySelectorAll<HTMLButtonElement>("button")].find(
    (button) => button.textContent?.trim() === text,
  )!;
}
async function change(label: string, value: string) {
  const element = input(label);
  const prototype =
    element instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(
      element,
      value,
    );
    element.dispatchEvent(
      new Event(element instanceof HTMLSelectElement ? "change" : "input", {
        bubbles: true,
      }),
    );
  });
}
async function selectFirst() {
  await act(async () =>
    [
      ...container.querySelectorAll<HTMLButtonElement>(
        '[aria-label="Task list"] button',
      ),
    ]
      .find((button) => button.textContent?.includes("Fix installer"))!
      .click(),
  );
}
describe("Tasks UI", () => {
  it("combines status, tags, project and text filters and resets them", async () => {
    await render();
    await change("Filter task status", "blocked");
    await change("Filter task tags", "#windows,bug");
    await change("Filter task project", "/work/project");
    await change("Search tasks", "installer");
    expect(
      container.querySelector('[aria-label="Task list"]')?.textContent,
    ).toContain("Fix installer");
    expect(
      container.querySelector('[aria-label="Task list"]')?.textContent,
    ).not.toContain("Personal reminder");
    await change("Filter task project", "personal");
    expect(container.textContent).toContain("No tasks match");
    await act(async () => button("Reset filters").click());
    expect(
      container.querySelector('[aria-label="Task list"]')?.textContent,
    ).toContain("Personal reminder");
  });
  it("creates independent Personal/project Todos and preserves them across remount", async () => {
    await render();
    await act(async () => button("New Personal task").click());
    const personal = [...rows.values()].find(
      (row) => row.title === "Untitled",
    )!;
    expect(personal).toMatchObject({ status: "todo", tags: [] });
    expect(personal.projectCwd).toBeUndefined();
    await act(async () => button("New task").click());
    const project = [...rows.values()].find(
      (row) => row.title === "Untitled" && row.projectCwd,
    )!;
    expect(project.projectCwd).toBe("/work/project");
    await act(async () => root.render(null));
    await render();
    expect(rows.has(personal.id)).toBe(true);
    expect(rows.has(project.id)).toBe(true);
  });
  it("edits status/tags/project, opens its source and refreshes an open task after Operator changes", async () => {
    await render();
    await selectFirst();
    await change("Task status", "review");
    expect(rows.get("first")?.status).toBe("review");
    await change("Add task tag", "Release,");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });
    expect(rows.get("first")?.tags).toContain("release");
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label^="Move task to project"]',
        )!
        .click(),
    );
    await act(async () =>
      document
        .querySelector<HTMLButtonElement>(
          '[aria-label="Project picker"] button[title="/work/other"]',
        )!
        .click(),
    );
    expect(rows.get("first")?.projectCwd).toBe("/work/other");
    await act(async () => button("Move to Personal").click());
    expect(rows.get("first")?.projectCwd).toBeUndefined();
    await act(async () => button("Open source session").click());
    expect(sourceOpen).toHaveBeenCalledWith("session", "cline:42");
    rows.set("first", {
      ...rows.get("first")!,
      title: "Operator updated",
      status: "completed",
      body: "Operator body",
    });
    await act(async () => window.dispatchEvent(new Event(TASKS_CHANGED_EVENT)));
    expect(input("Task title").value).toBe("Operator updated");
    expect(input("Task status").value).toBe("completed");
    expect(container.textContent).toContain("Operator body");
  });
  it("copies the current unsaved Markdown, flushes edits on unmount and deletes without resurrection", async () => {
    await render();
    await selectFirst();
    await act(async () => button("Source").click());
    const markdown =
      "---\ntitle: Draft\n---\n# Unsaved\n\n| A |\n| --- |\n| row |";
    await change("Task Markdown", markdown);
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[aria-label="Copy Markdown"]')!
        .click(),
    );
    expect(copy).toHaveBeenCalledWith(markdown);
    await act(async () => root.render(null));
    expect(rows.get("first")?.body).toBe(markdown);
    await render();
    await act(async () => button("Delete task").click());
    expect(rows.has("first")).toBe(false);
    await act(async () => root.render(null));
    expect(rows.has("first")).toBe(false);
  });
  it("retains failed edits for retry and reports missing source navigation", async () => {
    await render();
    await selectFirst();
    await act(async () => button("Source").click());
    const original = vi.mocked(invoke).getMockImplementation()!;
    vi.mocked(invoke).mockImplementation(async (command, args) => {
      if (command === "tasks_upsert") throw new Error("Disk full");
      return original(command, args);
    });
    await change("Task Markdown", "Keep failed draft");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Disk full",
    );
    expect(input("Task Markdown").value).toBe("Keep failed draft");
    vi.mocked(invoke).mockImplementation(original);
    await act(async () => button("Retry").click());
    expect(rows.get("first")?.body).toBe("Keep failed draft");
    sourceOpen.mockRejectedValueOnce(new Error("Source removed"));
    await act(async () => button("Open source session").click());
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Source removed",
    );
  });
});
