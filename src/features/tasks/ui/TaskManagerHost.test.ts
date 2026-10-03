// @vitest-environment happy-dom
import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TaskManagerHost, openTaskManager } from "./TaskManagerHost";
import type { Task } from "../tasks";
import type { QuickLaunch } from "../../quick-composer/model/quickComposer";
const task: Task = {
  id: "task-1",
  title: "Fix installer",
  body: "Keep details",
  tags: ["bug"],
  status: "todo",
  createdAt: 1,
  updatedAt: 1,
};
const launch: QuickLaunch = {
  prompt: "Fix installer",
  cwd: "/work",
  harness: "claude",
  runtimeMode: "supervised",
  reveal: false,
};
vi.mock("./TasksView", () => ({
  TasksView: ({ onWorkOn }: { onWorkOn: (task: Task) => void }) =>
    createElement(
      "button",
      { id: "work", onClick: () => onWorkOn(task) },
      "Start Work",
    ),
}));
vi.mock("./TaskWorkComposer", () => ({
  TaskWorkComposer: ({
    onStart,
  }: {
    onStart: (launch: QuickLaunch) => Promise<void>;
  }) => {
    const [error, setError] = useState<string | null>(null);
    return createElement(
      "div",
      null,
      createElement(
        "button",
        {
          id: "start",
          onClick: async () => {
            try {
              await onStart(launch);
            } catch {
              setError("Start failed");
            }
          },
        },
        "Start",
      ),
      error ? createElement("span", { role: "alert" }, error) : null,
    );
  },
}));
let root: Root, container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
it("keeps a failed launch available and retries with the same delivery ID", async () => {
  const start = vi
    .fn<
      (_launch: QuickLaunch, _task: Task, _deliveryId: string) => Promise<void>
    >()
    .mockRejectedValueOnce(new Error("Unavailable"))
    .mockResolvedValue();
  await act(async () =>
    root.render(
      createElement(TaskManagerHost, {
        cwd: "/work",
        recents: [],
        navigationKey: "sessions",
        onOpenSource: async () => {},
        onOpenBeside: () => {},
        onLaunchTask: start,
      }),
    ),
  );
  await act(async () => openTaskManager());
  await act(async () =>
    container.querySelector<HTMLButtonElement>("#work")!.click(),
  );
  await act(async () =>
    container.querySelector<HTMLButtonElement>("#start")!.click(),
  );
  expect(container.querySelector('[role="alert"]')?.textContent).toBe(
    "Start failed",
  );
  expect(container.querySelector("[data-manager-overlay]")).not.toBeNull();
  await act(async () =>
    container.querySelector<HTMLButtonElement>("#start")!.click(),
  );
  expect(start).toHaveBeenCalledTimes(2);
  expect(start.mock.calls[0][2]).toBe(start.mock.calls[1][2]);
  expect(start.mock.calls[1][0]).toEqual(launch);
  expect(start.mock.calls[1][1]).toEqual(task);
  expect(container.querySelector("[data-manager-overlay]")).toBeNull();
});
