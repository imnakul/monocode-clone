// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { QuickComposer } from "./QuickComposer";
import { CLOUD_LAUNCH_OUTCOME_EVENT } from "../../provider-sessions/ui/useCloudLaunch";
import {
  CloudRetentionError,
  type CloudSession,
} from "../../provider-sessions/model/cloudSessions";

const native = vi.hoisted(() => ({
  launch: vi.fn(),
  emit: vi.fn(),
}));

vi.mock("../../../platform/tauri/platform", () => ({
  IS_MAC: false,
  IS_WIN: true,
  IS_LINUX: false,
  MOD: "Ctrl+",
  ALT: "Alt+",
  SHIFT: "Shift+",
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/event", () => ({
  emit: native.emit,
  listen: vi.fn(async () => () => {}),
}));
vi.mock("../../workspace/ui/WorkspacePicker", () => ({
  WorkspacePicker: () => null,
}));
vi.mock("../../source-control/ui/BranchPicker", () => ({
  BranchPicker: () => null,
}));
vi.mock("./useQuickPickerMotion", () => ({ useQuickPickerMotion: () => {} }));
vi.mock("./QuickWorkspaceControls", () => ({
  QuickWorkspaceControls: () => null,
}));
vi.mock("./QuickProjectIcon", () => ({
  QuickProjectIcon: () => null,
  loadQuickProjectAppearance: () => ({}),
}));
vi.mock("./QuickModelSelector", () => ({ QuickModelSelector: () => null }));
vi.mock("./useQuickAttachments", () => ({
  useQuickAttachments: () => ({ files: [], clear: vi.fn() }),
}));
vi.mock("../../provider-sessions/model/cloudLaunchModel", async (actual) => {
  const model = await actual<
    typeof import("../../provider-sessions/model/cloudLaunchModel")
  >();
  return {
    ...model,
    createCloudLauncher: () => model.createCloudLauncher(native.launch),
  };
});
vi.mock("../../providers/model/providerAccounts", () => ({
  selectedProviderAccountId: () => "codex-account",
}));
vi.mock("../../provider-sessions/ui/CloudSessionDialog", () => ({
  CloudSessionDialog: () => null,
}));
vi.mock("../model/quickComposer", async (actual) => ({
  ...(await actual<object>()),
  loadQuickProjects: () => ["/tmp/project"],
  initialQuickChoice: () => ({ harness: "codex", model: "test" }),
  resolveQuickModel: (choice: { harness: "claude" | "codex" }) => ({
    harness: choice.harness,
    id: "test",
    name: "Test model",
  }),
}));

const record: CloudSession = {
  provider: "codex",
  id: "task_quick_1",
  url: "https://chatgpt.com/codex/tasks/task_quick_1",
  cwd: "/tmp/project",
  providerAccountId: "codex-account",
  environmentId: "env-quick",
  branch: "main",
  createdAt: 1,
};

let root: Root;
let container: HTMLDivElement;
let prompt: HTMLTextAreaElement;
let stored: Map<string, string>;

function button(label: string): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find(
    (element) => element.textContent?.trim() === label,
  );
  if (!found) throw new Error(`No button ${label}`);
  return found;
}

async function click(element: HTMLElement): Promise<void> {
  await act(async () => {
    element.click();
  });
}

async function pressCtrlEnter(field: HTMLTextAreaElement): Promise<void> {
  await act(async () => {
    field.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
}

function setValue(field: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  act(() => {
    const prototype =
      field instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function render(props: Record<string, unknown> = {}): Promise<void> {
  await act(async () => {
    root.render(
      createElement(QuickComposer, { onShown: () => {}, ...props }),
    );
  });
  prompt = container.querySelector("textarea")!;
}

/** Cloud is chosen from the + menu ("Cloud session"), not a switch. */
function cloudItem(): HTMLButtonElement | undefined {
  return [...document.querySelectorAll<HTMLButtonElement>("button")].find(
    (element) => element.textContent?.trim() === "Cloud session",
  );
}

async function selectCloud(): Promise<void> {
  const plus = container.querySelector<HTMLButtonElement>(
    'button[aria-label="Add files or choose a mode"]',
  );
  if (!plus) throw new Error("Missing + menu");
  await click(plus);
  const cloud = cloudItem();
  if (!cloud) throw new Error("Missing Cloud session option");
  await click(cloud);
}

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => {
    callback();
    return 0;
  });
  stored = new Map<string, string>();
  stored.set("monocode.cloudEnvironment.codex", "env-quick");
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  });
  native.launch.mockReset().mockResolvedValue(record);
  native.emit.mockReset().mockResolvedValue(undefined);
  vi.mocked(invoke).mockReset().mockImplementation(async (command) =>
    command === "prompts_list" ? [] : undefined,
  );
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await render();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

it("starts one Codex cloud task with the selected project, account and environment", async () => {
  setValue(prompt, "Fix the failing build");
  await selectCloud();
  const environment = container.querySelector<HTMLInputElement>(
    'input[aria-required="true"]',
  );
  if (!environment) throw new Error("Missing Codex environment field");
  setValue(environment, "env-quick");

  await click(button("Start cloud task"));

  expect(native.launch).toHaveBeenCalledTimes(1);
  expect(native.launch).toHaveBeenCalledWith({
    provider: "codex",
    prompt: "Fix the failing build",
    cwd: "/tmp/project",
    accountId: "codex-account",
    environmentId: "env-quick",
  });
  expect(emit).toHaveBeenCalledWith(CLOUD_LAUNCH_OUTCOME_EVENT, {
    kind: "launched",
    record,
  });
  expect(invoke).not.toHaveBeenCalledWith(
    "quick_composer_submit",
    expect.anything(),
  );
  expect(prompt.value).toBe("");
});

it("bypasses embedded local start and delivers an unsaved cloud ID for recovery", async () => {
  native.launch.mockRejectedValue(
    new CloudRetentionError(record, "retained store unavailable"),
  );
  const saveDraft = vi.fn(async () => {});
  const startLocal = vi.fn(async () => {});
  await render({
    key: "embedded-cloud",
    initialLaunch: {
      prompt: "Continue this task",
      cwd: "/tmp/project",
      harness: "codex",
      model: "test",
      reveal: false,
    },
    onSubmitLaunch: saveDraft,
    onStartLaunch: startLocal,
    onDismiss: vi.fn(),
  });
  prompt = container.querySelector("textarea")!;
  await selectCloud();
  await click(button("Start cloud task"));

  expect(native.launch).toHaveBeenCalledTimes(1);
  expect(startLocal).not.toHaveBeenCalled();
  expect(saveDraft).not.toHaveBeenCalled();
  expect(emit).toHaveBeenCalledWith(CLOUD_LAUNCH_OUTCOME_EVENT, {
    kind: "unsaved",
    record,
    message: expect.stringContaining("retained store unavailable"),
  });
  expect(invoke).not.toHaveBeenCalledWith(
    "quick_composer_submit",
    expect.anything(),
  );
  expect(prompt.value).toBe("Continue this task");
  expect(container.textContent).toContain("task_quick_1");
  expect(container.textContent).toContain("Task details");
  expect(button("Task started").disabled).toBe(true);
});

it("keeps Save to Draft local and resets execution to Local", async () => {
  setValue(prompt, "Keep this prompt for later");
  await selectCloud();
  await click(button("Save to Draft"));

  expect(native.launch).not.toHaveBeenCalled();
  expect(invoke).toHaveBeenCalledWith("quick_composer_submit", {
    request: expect.objectContaining({
      prompt: "Keep this prompt for later",
      draft: true,
      reveal: false,
    }),
  });
  // Back to Local: the + menu's Cloud session is no longer checked.
  await click(
    container.querySelector<HTMLButtonElement>(
      'button[aria-label="Add files or choose a mode"]',
    )!,
  );
  expect(cloudItem()?.getAttribute("aria-pressed")).toBe("false");
});

it("keeps a failed cloud prompt and shows the returned error without local send", async () => {
  native.launch.mockRejectedValue(new Error("Codex CLI unavailable"));
  setValue(prompt, "Do not lose this prompt");
  await selectCloud();
  await click(button("Start cloud task"));

  expect(prompt.value).toBe("Do not lose this prompt");
  expect(container.textContent).toContain("Codex CLI unavailable");
  expect(invoke).not.toHaveBeenCalledWith(
    "quick_composer_submit",
    expect.anything(),
  );
  expect(native.launch).toHaveBeenCalledTimes(1);
});

it("does not fall through to local start when Cloud is selected for a worktree", async () => {
  const startLocal = vi.fn(async () => {});
  await render({
    key: "worktree-cloud",
    initialLaunch: {
      prompt: "Keep this on the cloud intent",
      cwd: "/tmp/project",
      harness: "codex",
      model: "test",
      workspaceMode: "worktree",
      worktreeBase: "main",
      reveal: false,
    },
    onStartLaunch: startLocal,
  });
  prompt = container.querySelector("textarea")!;
  await selectCloud();

  const start = button("Start cloud task");
  expect(start.disabled).toBe(true);
  expect(container.textContent).toContain(
    "Cloud tasks cannot use the selected local worktree",
  );
  await pressCtrlEnter(prompt);

  expect(native.launch).not.toHaveBeenCalled();
  expect(startLocal).not.toHaveBeenCalled();
  expect(invoke).not.toHaveBeenCalledWith(
    "quick_composer_submit",
    expect.anything(),
  );
  expect(prompt.value).toBe("Keep this on the cloud intent");
});


it("shows Cloud before first send and permits an explicit Local override", async () => {
  stored.set("monocode.newChatExecution", "cloud");
  await render({ key: "default-cloud" });
  expect(container.querySelector("[data-work-in]")?.getAttribute("data-work-in")).toBe("cloud");
  await click(container.querySelector<HTMLButtonElement>("[data-work-in]")!);
  const local = [...document.querySelectorAll<HTMLButtonElement>("[data-work-in-picker] button")]
    .find((element) => element.textContent?.startsWith("This computer"))!;
  await click(local);
  setValue(prompt, "Run locally instead");
  await pressCtrlEnter(prompt);
  expect(native.launch).not.toHaveBeenCalled();
  expect(invoke).toHaveBeenCalledWith("quick_composer_submit", expect.anything());
});

it.each([true, false])("shows default Remote and delivers the explicit RC choice %s", async (enabled) => {
  stored.set("monocode.newChatExecution", "remote");
  await render({ key: "default-remote", initialLaunch: {
    prompt: "Run once", cwd: "/tmp/project", harness: "claude", model: "test", reveal: false,
  } });
  expect(container.querySelector("[data-work-in]")?.getAttribute("data-work-in")).toBe("remote");
  if (!enabled) {
    await click(container.querySelector<HTMLButtonElement>("[data-work-in]")!);
    const local = [...document.querySelectorAll<HTMLButtonElement>("[data-work-in-picker] button")]
      .find((element) => element.textContent?.startsWith("This computer"))!;
    await click(local);
  }
  await pressCtrlEnter(prompt);
  expect(native.launch).not.toHaveBeenCalled();
  expect(invoke).toHaveBeenCalledWith("quick_composer_submit", {
    request: expect.objectContaining({ harness: "claude", remoteControl: enabled }),
  });
});


it("keeps an explicit saved Local choice even when the global default is Cloud", async () => {
  stored.set("monocode.newChatExecution", "cloud");
  await render({ key: "saved-local", initialLaunch: {
    prompt: "Keep local", cwd: "/tmp/project", harness: "claude", model: "test",
    reveal: false, remoteControl: false,
  } });
  expect(container.querySelector("[data-work-in]")?.getAttribute("data-work-in")).toBe("local");
});
