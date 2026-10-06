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
  const input = container.querySelector<HTMLInputElement>(
    '[aria-label="Session ID or resume command"]',
  )!;
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

async function clickButton(label: string): Promise<void> {
  await act(async () =>
    [...container.querySelectorAll("button")]
      .find((button) => button.textContent === label)!
      .click(),
  );
}
async function search(text: string): Promise<void> {
  await act(async () => {
    const input = container.querySelector<HTMLInputElement>(
      '[aria-label="Search conversations"]',
    )!;
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
describe("Find native sessions", () => {
  it("does not scan on opening and finds named chats on demand without submitting a prompt", async () => {
    await render();
    expect(invoke).not.toHaveBeenCalled();
    await search("Original");
    vi.mocked(invoke).mockResolvedValueOnce({
      conversations: [row],
      diagnostics: [],
      nextOffset: null,
    });
    await clickButton("Find");
    expect(invoke).toHaveBeenCalledExactlyOnceWith("provider_sessions_find", {
      provider: "claude",
      accountId: "default",
      request: {
        includeArchived: false,
        limit: 10,
        offset: 0,
        query: "Original",
        projectCwd: "",
      },
    });
    expect(container.textContent).toContain("Original");
    expect(resume).not.toHaveBeenCalled();
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>("[data-session-card]")!
        .click(),
    );
    expect(resume).toHaveBeenCalledExactlyOnceWith(row);
    expect(close).toHaveBeenCalledOnce();
  });
  it("pages 10 at a time and retains the selected search filter", async () => {
    await render(["codex"]);
    await search("landing");
    vi.mocked(invoke).mockResolvedValueOnce({
      conversations: Array.from({ length: 10 }, (_, index) => ({
        ...row,
        provider: "codex",
        key: `key-${index}`,
        nativeId: `id-${index}`,
        title: `Landing ${index}`,
      })),
      diagnostics: [],
      nextOffset: 10,
    });
    await clickButton("Find");
    vi.mocked(invoke).mockResolvedValueOnce({
      conversations: [
        {
          ...row,
          provider: "codex",
          key: "older",
          title: "Older landing task",
        },
      ],
      diagnostics: [],
      nextOffset: null,
    });
    await clickButton("Show more");
    expect(invoke).toHaveBeenLastCalledWith("provider_sessions_find", {
      provider: "codex",
      accountId: "default",
      request: {
        includeArchived: false,
        limit: 10,
        offset: 10,
        query: "landing",
        projectCwd: "",
      },
    });
    expect(container.textContent).toContain("Older landing task");
    expect(resume).not.toHaveBeenCalled();
  });
  it("drops an older Find response after another search", async () => {
    let finish: (value: unknown) => void = () => undefined;
    await render();
    vi.mocked(invoke).mockImplementationOnce(
      async () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await clickButton("Find");
    await search("new");
    vi.mocked(invoke).mockResolvedValueOnce({
      conversations: [{ ...row, key: "new", title: "New task" }],
      diagnostics: [],
      nextOffset: null,
    });
    await clickButton("Find");
    await act(async () =>
      finish({
        conversations: [{ ...row, title: "Stale task" }],
        diagnostics: [],
        nextOffset: null,
      }),
    );
    expect(container.textContent).toContain("New task");
    expect(container.textContent).not.toContain("Stale task");
  });
  it("shows discovery failures and blocks a wrong-account row", async () => {
    await render();
    vi.mocked(invoke).mockRejectedValueOnce(
      new Error("Provider store is unavailable"),
    );
    await clickButton("Find");
    expect(container.textContent).toContain("Provider store is unavailable");
    vi.mocked(invoke).mockResolvedValueOnce({
      conversations: [{ ...row, providerAccountId: "other" }],
      diagnostics: [],
      nextOffset: null,
    });
    await clickButton("Find");
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>("[data-session-card]")!
        .click(),
    );
    expect(container.textContent).toContain("different or removed");
    expect(resume).not.toHaveBeenCalled();
  });
});
