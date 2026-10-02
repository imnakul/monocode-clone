// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { SettingsView } from "./SettingsView";
import { saveKeybindingOverride } from "../model/settings";

vi.mock("../../../platform/tauri/platform", () => ({
  IS_MAC: false,
  IS_WIN: true,
  IS_LINUX: false,
  HAS_NATIVE_GLASS: true,
  MOD: "Ctrl+",
  ALT: "Alt+",
  SHIFT: "Shift+",
}));
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async () => undefined),
  convertFileSrc: (path: string) => path,
}));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    isMaximized: async () => false,
    onResized: async () => () => {},
  }),
}));
vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: vi.fn() }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ ask: vi.fn(async () => true) }));

let container: HTMLDivElement;
let root: Root;
const data = new Map<string, string>();

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  data.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  });
  vi.mocked(invoke).mockClear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

async function render(section: "general" | "keybindings" = "keybindings") {
  await act(async () =>
    root.render(
      createElement(SettingsView, {
        section,
        cwd: "/repo",
        sessions: [],
        onClose: vi.fn(),
        onSelectSection: vi.fn(),
        onOpenSession: vi.fn(),
        onArchiveSession: vi.fn(),
        onDeleteSession: vi.fn(),
        onOpenWhatsNew: vi.fn(),
      }),
    ),
  );
}

it("exposes the Windows default and explicitly assigns Alt+Space", async () => {
  await render();
  const input = container.querySelector<HTMLInputElement>(
    '[aria-label="Change quick composer shortcut"]',
  )!;
  expect(input.value).toBe("Ctrl+Shift+Space");
  const preset = Array.from(
    container.querySelectorAll<HTMLButtonElement>("button"),
  ).find((button) => button.textContent === "Use Alt+Space")!;
  expect(preset.title).toContain("Windows window menu");
  await act(async () => preset.click());
  expect(invoke).toHaveBeenCalledWith("quick_composer_set_enabled", {
    enabled: true,
    shortcut: "Option+Space",
  });
  expect(data.get("monocode.quickComposerShortcut")).toBe("Option+Space");
  expect(input.value).toBe("Alt+Space");
  await act(async () =>
    container
      .querySelector<HTMLButtonElement>(
        '[aria-label="Reset quick composer shortcut"]',
      )!
      .click(),
  );
  expect(invoke).toHaveBeenLastCalledWith("quick_composer_set_enabled", {
    enabled: true,
    shortcut: "Control+Shift+Space",
  });
});

it("retains the previous Windows hotkey when Alt+Space registration fails", async () => {
  await render();
  vi.mocked(invoke).mockRejectedValueOnce("Shortcut is in use");
  const preset = Array.from(
    container.querySelectorAll<HTMLButtonElement>("button"),
  ).find((button) => button.textContent === "Use Alt+Space")!;
  await act(async () => preset.click());
  expect(data.has("monocode.quickComposerShortcut")).toBe(false);
  expect(
    container.querySelector<HTMLInputElement>(
      '[aria-label="Change quick composer shortcut"]',
    )!.value,
  ).toBe("Ctrl+Shift+Space");
  expect(container.textContent).toContain("Shortcut is in use");
});

it("refuses an Alt hotkey already assigned to an application action", async () => {
  saveKeybindingOverride("App: Search", { shortcut: "Option+Space" });
  await render();
  const preset = Array.from(
    container.querySelectorAll<HTMLButtonElement>("button"),
  ).find((button) => button.textContent === "Use Alt+Space")!;
  await act(async () => preset.click());
  expect(container.textContent).toContain("Already used by App: Search");
  expect(invoke).not.toHaveBeenCalledWith(
    "quick_composer_set_enabled",
    expect.anything(),
  );
});

it("exposes the General toggle and keeps it enabled after native disabling fails", async () => {
  await render("general");
  const toggle = container.querySelector<HTMLButtonElement>(
    '[aria-label="Quick composer"]',
  )!;
  expect(toggle).not.toBeNull();
  expect(toggle.getAttribute("aria-checked")).toBe("true");
  vi.mocked(invoke).mockRejectedValueOnce("Could not unregister shortcut");
  await act(async () => toggle.click());
  expect(toggle.getAttribute("aria-checked")).toBe("true");
  expect(data.get("monocode.quickComposerEnabled")).not.toBe("0");
  expect(container.textContent).toContain("Could not unregister shortcut");
});
