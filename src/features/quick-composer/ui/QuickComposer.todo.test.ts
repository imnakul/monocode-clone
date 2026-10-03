// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { QuickComposer } from "./QuickComposer";

vi.mock("../../../platform/tauri/platform", () => ({
  IS_MAC: true,
  IS_WIN: false,
  IS_LINUX: false,
  MOD: "⌘",
  ALT: "⌥",
  SHIFT: "⇧",
}));

const native = vi.hoisted(() => ({
  shown: () => {},
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/event", () => ({
  emit: vi.fn().mockResolvedValue(undefined),
  listen: vi.fn(async (name, callback) => {
    if (name === "quick_composer_shown") native.shown = callback;
    return () => {};
  }),
}));
vi.mock("./useQuickPickerMotion", () => ({ useQuickPickerMotion: () => {} }));
vi.mock("../../workspace/ui/WorkspacePicker", () => ({
  WorkspacePicker: () => null,
}));
vi.mock("../../source-control/ui/BranchPicker", () => ({
  BranchPicker: () => null,
}));
vi.mock("./QuickWorkspaceControls", () => ({
  QuickWorkspaceControls: () => null,
}));
vi.mock("./QuickProjectIcon", () => ({
  QuickProjectIcon: () => null,
  loadQuickProjectAppearance: () => ({}),
}));
vi.mock("./QuickModelSelector", () => ({ QuickModelSelector: () => null }));
vi.mock("./useQuickAttachments", () => ({
  useQuickAttachments: () => ({ files: [], clear: () => {} }),
}));
vi.mock("../model/quickComposer", async (actual) => ({
  ...(await actual<object>()),
  loadQuickProjects: () => ["/tmp/project"],
  initialQuickChoice: () => ({ harness: "codex", model: "test" }),
  resolveQuickModel: () => ({
    harness: "codex",
    id: "test",
    name: "Test model",
  }),
}));

let root: Root;
let container: HTMLDivElement;
let prompt: HTMLTextAreaElement;

function commands() {
  return container.querySelector('[role="listbox"][aria-label="Commands"]');
}

function input(text: string, cursor = text.length) {
  act(() => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )!.set!.call(prompt, text);
    prompt.setSelectionRange(cursor, cursor);
    prompt.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function key(key: string, options: KeyboardEventInit = {}) {
  await act(async () => {
    prompt.dispatchEvent(
      new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...options,
      }),
    );
  });
}

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => {
    callback();
    return 0;
  });
  const stored = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  });
  vi.mocked(invoke).mockReset().mockResolvedValue(undefined);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root.render(createElement(QuickComposer, { onShown: () => {} })),
  );
  prompt = container.querySelector("textarea")!;
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

it("saves an embedded Todo through its callback, preserving chosen settings and avoiding native panel submit/fit/dismiss", async () => {
  const save = vi.fn(async () => {}),
    dismiss = vi.fn();
  await act(async () =>
    root.render(
      createElement(QuickComposer, {
        onShown: () => {},
        initialLaunch: {
          prompt: "Handover\n\nWork on spec",
          cwd: "D:/Project",
          harness: "codex",
          model: "test",
          modelSettings: {},
          runtimeMode: "full-access",
          workspaceMode: "worktree",
          worktreeBase: "feature",
          reveal: false,
        },
        onSubmitLaunch: save,
        onDismiss: dismiss,
      }),
    ),
  );
  // A different component key ensures the initial draft is read as on modal open.
  await act(async () =>
    root.render(
      createElement(QuickComposer, {
        key: "embedded",
        onShown: () => {},
        initialLaunch: {
          prompt: "Handover\n\nWork on spec",
          cwd: "D:/Project",
          harness: "codex",
          model: "test",
          modelSettings: {},
          runtimeMode: "full-access",
          workspaceMode: "worktree",
          worktreeBase: "feature",
          reveal: false,
        },
        onSubmitLaunch: save,
        onDismiss: dismiss,
      }),
    ),
  );
  prompt = container.querySelector("textarea")!;
  expect(prompt.value).toBe("Handover\n\nWork on spec");
  expect(container.textContent).toContain("Save to Draft");
  vi.mocked(invoke).mockClear();
  await key("Enter");
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({
      prompt: "Handover\n\nWork on spec",
      cwd: "D:/Project",
      model: "test",
      runtimeMode: "full-access",
      workspaceMode: "worktree",
      worktreeBase: "feature",
      draft: true,
      reveal: false,
    }),
  );
  expect(invoke).not.toHaveBeenCalledWith(
    "quick_composer_submit",
    expect.anything(),
  );
  expect(invoke).not.toHaveBeenCalledWith(
    "quick_composer_fit",
    expect.anything(),
  );
  await key("Escape");
  expect(dismiss).toHaveBeenCalledOnce();
  expect(invoke).not.toHaveBeenCalledWith("quick_composer_dismiss");
});
it("retains the embedded draft after save failure and retries the same prompt", async () => {
  const save = vi
    .fn()
    .mockRejectedValueOnce(new Error("disk full"))
    .mockResolvedValueOnce(undefined);
  await act(async () =>
    root.render(
      createElement(QuickComposer, {
        key: "embedded",
        onShown: () => {},
        initialLaunch: {
          prompt: "Do the work",
          cwd: "/tmp/project",
          harness: "codex",
          model: "test",
          reveal: false,
        },
        onSubmitLaunch: save,
        onDismiss: () => {},
      }),
    ),
  );
  prompt = container.querySelector("textarea")!;
  await key("Enter");
  expect(prompt.value).toBe("Do the work");
  expect(container.textContent).toContain("disk full");
  await key("Enter");
  expect(save).toHaveBeenCalledTimes(2);
  expect(prompt.value).toBe("");
});

it("draws the floating card with the shared glass surface and the embedded card on the modal's glass", async () => {
  // beforeEach rendered the floating (global) composer.
  const floating = prompt.closest<HTMLElement>(".rounded-\\[16px\\]")!;
  expect(floating.className).toContain("quick-composer-surface");
  expect(floating.className).not.toContain("bg-background-base");
  await act(async () =>
    root.render(
      createElement(QuickComposer, {
        key: "embedded-surface",
        onShown: () => {},
        onSubmitLaunch: vi.fn(async () => {}),
        onDismiss: vi.fn(),
      }),
    ),
  );
  const embedded = container
    .querySelector("textarea")!
    .closest<HTMLElement>(".rounded-\\[16px\\]")!;
  // Inside a modal the modal draws the glass, so the card adds no dark fill.
  expect(embedded.className).toContain("bg-content/3");
  expect(embedded.className).not.toContain("quick-composer-surface");
  expect(embedded.className).not.toContain("bg-background-base");
});
