// @vitest-environment happy-dom
import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SessionManagerHost, openSessionManager } from "./SessionManagerHost";
import type { QuickLaunch } from "../../quick-composer/model/quickComposer";
import type { sessionTodoManager } from "../sessionTodos";
vi.mock("../useSessionBoard", () => ({
  useSessionBoard: () => ({ cards: [], ready: true, error: null }),
}));
vi.mock("./SessionBoardView", () => ({
  SessionBoardView: ({ onAddTodo }: { onAddTodo: (project: string) => void }) =>
    createElement(
      "button",
      { id: "add", onClick: () => onAddTodo("/work") },
      "Add Todo",
    ),
}));
vi.mock("./SessionTodoComposer", () => ({
  SessionTodoComposer: ({
    initialLaunch,
    onSave,
  }: {
    initialLaunch: QuickLaunch;
    onSave: (launch: QuickLaunch) => Promise<void>;
  }) => {
    const [error, setError] = useState<string | null>(null);
    return createElement(
      "div",
      null,
      createElement(
        "button",
        {
          id: "save",
          onClick: async () => {
            try {
              await onSave({ ...initialLaunch, prompt: "Prepare release" });
            } catch {
              setError("Save failed");
            }
          },
        },
        "Save",
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
it("retries a new draft save with the same identity and create semantics", async () => {
  const write = vi
    .fn()
    .mockRejectedValueOnce(new Error("Unavailable"))
    .mockResolvedValue({});
  const manager = { write } as unknown as ReturnType<typeof sessionTodoManager>;
  await act(async () =>
    root.render(
      createElement(SessionManagerHost, {
        sessions: [],
        cwd: "/work",
        recents: [],
        manager,
        navigationKey: "sessions",
        onOpenSession: async () => {},
        onWorkspaceHost: () => {},
        onPaneVisible: () => {},
      }),
    ),
  );
  await act(async () => openSessionManager());
  await act(async () =>
    container.querySelector<HTMLButtonElement>("#add")!.click(),
  );
  await act(async () =>
    container.querySelector<HTMLButtonElement>("#save")!.click(),
  );
  expect(container.querySelector('[role="alert"]')?.textContent).toBe(
    "Save failed",
  );
  await act(async () =>
    container.querySelector<HTMLButtonElement>("#save")!.click(),
  );
  expect(write).toHaveBeenCalledTimes(2);
  expect(write.mock.calls[0][0]).toBe(write.mock.calls[1][0]);
  expect(write.mock.calls[1][1]).toMatchObject({
    cwd: "/work",
    prompt: "Prepare release",
  });
  expect(write.mock.calls[1][2]).toEqual({
    edit: false,
    expectedRevision: undefined,
  });
});
