// @vitest-environment happy-dom
import { act, createElement, StrictMode, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { AddNativeSessionDialog } from "./AddNativeSessionDialog";
import type {
  NativeProvider,
  ProviderConversation,
} from "../model/providerSessions";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
// Exercise the form with real selectors. Modal focus/portal behavior has its
// own tests; its native shell dependencies are irrelevant to identity lookup.
vi.mock("../../../shared/ui/Modal", () => ({
  Modal: ({
    children,
    onClose,
  }: {
    children: ReactNode;
    onClose: () => void;
  }) =>
    createElement(
      "div",
      { role: "dialog" },
      children,
      createElement("button", { onClick: onClose }, "Close"),
    ),
}));

const row: ProviderConversation = {
  key: '["claude","/home/.claude","native-one"]',
  provider: "claude",
  nativeId: "native-one",
  sourceRoot: "/home/.claude",
  providerAccountId: "default",
  title: "Original",
  cwd: "/repo",
  updatedAt: 42,
  archived: false,
  monocodeSessionId: null,
};
let root: Root;
let container: HTMLDivElement;
const resume = vi.fn<(row: ProviderConversation) => Promise<void>>();
const close = vi.fn();
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  vi.mocked(invoke).mockReset().mockResolvedValue(row);
  resume.mockReset().mockResolvedValue();
  close.mockReset();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
async function render(
  providers: NativeProvider[] = ["claude", "codex"],
): Promise<void> {
  await act(async () =>
    root.render(
      createElement(
        StrictMode,
        null,
        createElement(AddNativeSessionDialog, {
          providers,
          onResume: resume,
          onClose: close,
        }),
      ),
    ),
  );
}
async function type(text: string): Promise<void> {
  const input = container.querySelector<HTMLInputElement>("input")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function submit(): Promise<void> {
  await act(async () =>
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}
describe("Add session", () => {
  it("looks up the exact native ID and selected account before opening the same row", async () => {
    await render();
    await type("claude --resume native-one");
    await submit();
    expect(invoke).toHaveBeenCalledExactlyOnceWith(
      "provider_sessions_resolve",
      { provider: "claude", nativeId: "native-one", accountId: "default" },
    );
    expect(resume).toHaveBeenCalledExactlyOnceWith(row);
    expect(close).toHaveBeenCalledOnce();
  });
  it("works with Codex without offering excluded providers", async () => {
    await render(["codex"]);
    await type("codex resume thread-one");
    await submit();
    expect(invoke).toHaveBeenCalledWith("provider_sessions_resolve", {
      provider: "codex",
      nativeId: "thread-one",
      accountId: "default",
    });
    expect(container.textContent).not.toContain("Antigravity");
    expect(container.textContent).not.toContain("OpenCode");
  });
  it("keeps the form open on a missing session or failed native bind", async () => {
    await render();
    await type("missing");
    vi.mocked(invoke).mockRejectedValueOnce(
      new Error("Not found in this account"),
    );
    await submit();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Not found",
    );
    expect(resume).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    resume.mockRejectedValueOnce(new Error("Original folder unavailable"));
    await type("native-one");
    await submit();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Original folder",
    );
    expect(close).not.toHaveBeenCalled();
  });
  it("does not cross provider profiles for a pasted command", async () => {
    await render();
    await type("codex resume thread-one");
    await submit();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Choose that provider",
    );
    expect(invoke).not.toHaveBeenCalled();
  });
  it("prevents duplicate submission and closing during attachment", async () => {
    let finish: (row: ProviderConversation) => void = () => undefined;
    vi.mocked(invoke).mockImplementationOnce(
      async () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await render();
    await type("native-one");
    await submit();
    await submit();
    await act(async () =>
      [...container.querySelectorAll("button")]
        .find((button) => button.textContent === "Close")!
        .click(),
    );
    expect(invoke).toHaveBeenCalledOnce();
    expect(close).not.toHaveBeenCalled();
    await act(async () => finish(row));
    expect(resume).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });
});
