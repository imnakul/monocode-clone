// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { TaskTabSurface } from "./TaskTabSurface";
import { TaskTabActionsContext } from "./TaskTabActionsContext";
import { TASKS_CHANGED_EVENT, type Task, type TaskUpsert } from "../tasks";

vi.mock("@tauri-apps/api/core", async (original) => ({
  ...(await original<typeof import("@tauri-apps/api/core")>()),
  invoke: vi.fn(),
}));
vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: () => ({ onDragDropEvent: async () => () => {} }),
}));

let root: Root, container: HTMLDivElement, rows: Map<string, Task>;
const sourceOpen = vi.fn();

function task(partial: Partial<Task> = {}): Task {
  return {
    id: "t-1",
    title: "Fix installer",
    body: "Body text",
    status: "todo",
    tags: [],
    sourceSessionId: "session",
    sourceBlockId: "block",
    createdAt: 1,
    updatedAt: 10,
    ...partial,
  };
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  sourceOpen.mockReset();
  rows = new Map([["t-1", task()]]);
  vi.mocked(invoke)
    .mockReset()
    .mockImplementation(async (command, args) => {
      if (command === "tasks_get") return rows.get(args?.id as string) ?? null;
      if (command === "tasks_upsert") {
        const input = args?.task as TaskUpsert;
        const saved: Task = { ...input, createdAt: 1, updatedAt: 11 };
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
  vi.unstubAllGlobals();
});

async function render() {
  await act(async () =>
    root.render(
      createElement(
        TaskTabActionsContext.Provider,
        { value: { onOpenSource: sourceOpen } },
        createElement(TaskTabSurface, {
          source: { taskId: "t-1", title: "Fix installer" },
        }),
      ),
    ),
  );
}
const input = (label: string) =>
  container.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;
function button(text: string) {
  return [...container.querySelectorAll<HTMLButtonElement>("button")].find(
    (entry) => entry.textContent?.trim() === text,
  )!;
}
async function type(label: string, value: string) {
  const element = input(label);
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
const event = () =>
  act(async () => window.dispatchEvent(new Event(TASKS_CHANGED_EVENT)));

describe("TaskTabSurface", () => {
  it("shows a spinner until the task loads, then the full editor", async () => {
    let release: (value: Task) => void = () => {};
    const original = vi.mocked(invoke).getMockImplementation()!;
    vi.mocked(invoke).mockImplementation(async (command, args) => {
      if (command === "tasks_get")
        return new Promise<Task>((resolve) => {
          release = resolve;
        });
      return original(command, args);
    });
    await render();
    expect(
      container.querySelector('[aria-label="Loading task"]'),
    ).not.toBeNull();
    await act(async () => release(task()));
    expect(input("Task title").value).toBe("Fix installer");
    expect(container.querySelector(".max-w-5xl")).not.toBeNull();
    // The tab is already beside the session, so it has no "Open beside" action.
    expect(button("Open beside session")).toBeUndefined();
  });

  it("saves edits and opens the source session through the provided handler", async () => {
    await render();
    await type("Task title", "Renamed");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });
    expect(rows.get("t-1")?.title).toBe("Renamed");
    await act(async () => button("Open source session").click());
    expect(sourceOpen).toHaveBeenCalledWith("session", "block");
  });

  it("reloads when tasks change", async () => {
    await render();
    rows.set("t-1", task({ title: "Operator title", updatedAt: 20 }));
    await event();
    expect(input("Task title").value).toBe("Operator title");
  });

  it("shows a deleted state when the task disappears", async () => {
    await render();
    rows.delete("t-1");
    await event();
    expect(container.textContent).toContain("This task was deleted.");
    expect(container.querySelector('[aria-label="Task title"]')).toBeNull();
  });

  it("reports a load error and retries", async () => {
    const original = vi.mocked(invoke).getMockImplementation()!;
    vi.mocked(invoke).mockImplementation(async (command, args) => {
      if (command === "tasks_get") throw new Error("db locked");
      return original(command, args);
    });
    await render();
    expect(container.textContent).toContain("Could not load task: db locked");
    vi.mocked(invoke).mockImplementation(original);
    await act(async () => button("Retry").click());
    expect(input("Task title").value).toBe("Fix installer");
  });

  it("ignores a stale load that resolves after a newer one", async () => {
    const resolvers: ((value: Task) => void)[] = [];
    const original = vi.mocked(invoke).getMockImplementation()!;
    vi.mocked(invoke).mockImplementation(async (command, args) => {
      if (command === "tasks_get")
        return new Promise<Task>((resolve) => resolvers.push(resolve));
      return original(command, args);
    });
    await render();
    await event();
    expect(resolvers).toHaveLength(2);
    await act(async () => resolvers[1](task({ title: "Newest" })));
    await act(async () => resolvers[0](task({ title: "Stale" })));
    expect(input("Task title").value).toBe("Newest");
  });
});
