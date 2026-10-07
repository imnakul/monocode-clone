// @vitest-environment happy-dom
import { act, createElement, StrictMode, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { ResumeSessionDialog } from "./ResumeSessionDialog";
import type {
  NativeProvider,
  ProviderConversation,
} from "../model/providerSessions";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
// Exercise the form with real selectors. Modal focus/portal behavior has its
// own tests; its native shell dependencies are irrelevant to identity lookup.
vi.mock("../../../shared/ui/Modal", () => ({
  Modal: ({
    title,
    children,
    onClose,
  }: {
    title: string;
    children: ReactNode;
    onClose: () => void;
  }) =>
    createElement(
      "div",
      { role: "dialog", "aria-label": title },
      createElement("h2", null, title),
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
const emptyPage = { conversations: [], diagnostics: [], nextOffset: null };
const resume = vi.fn<(row: ProviderConversation) => Promise<void>>();
const close = vi.fn();
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  vi.mocked(invoke)
    .mockReset()
    .mockImplementation(async (command: string) =>
      command === "provider_sessions_find" ? emptyPage : row,
    );
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
        createElement(ResumeSessionDialog, {
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
const resolveCalls = () =>
  vi
    .mocked(invoke)
    .mock.calls.filter(([command]) => command === "provider_sessions_resolve");
const findCalls = () =>
  vi
    .mocked(invoke)
    .mock.calls.filter(([command]) => command === "provider_sessions_find");
describe("Resume session", () => {
  it("looks up the exact native ID and selected account before opening the same row", async () => {
    await render();
    await type("claude --resume native-one");
    await submit();
    expect(resolveCalls()).toEqual([
      [
        "provider_sessions_resolve",
        { provider: "claude", nativeId: "native-one", accountId: "default" },
      ],
    ]);
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
    expect(resolveCalls()).toHaveLength(0);
  });
  it("prevents duplicate submission and closing during attachment", async () => {
    let finish: (row: ProviderConversation) => void = () => undefined;
    await render();
    vi.mocked(invoke).mockImplementationOnce(
      async () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await type("native-one");
    await submit();
    await submit();
    await act(async () =>
      [...container.querySelectorAll("button")]
        .find((button) => button.textContent === "Close")!
        .click(),
    );
    expect(resolveCalls()).toHaveLength(1);
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
async function pressEnterInSearch(): Promise<void> {
  await act(async () => {
    container
      .querySelector<HTMLInputElement>('[aria-label="Search conversations"]')!
      .dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      );
  });
}
const page = (title: string, key = "k") => ({
  conversations: [{ ...row, key, title }],
  diagnostics: [],
  nextOffset: null,
});
describe("Loading native sessions", () => {
  it("loads the list on open without a Find button and opens a row", async () => {
    vi.mocked(invoke).mockImplementation(async () => page("Original", row.key));
    await render();
    expect(findCalls().length).toBeGreaterThan(0);
    expect(findCalls()[0]).toEqual([
      "provider_sessions_find",
      {
        provider: "claude",
        accountId: "default",
        request: {
          includeArchived: false,
          limit: 10,
          offset: 0,
          query: "",
          projectCwd: "",
        },
      },
    ]);
    for (const label of ["Find", "Resume session", "Cancel"])
      expect(
        [...container.querySelectorAll("button")].some(
          (button) => button.textContent === label,
        ),
      ).toBe(false);
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
  it("reloads for Enter, a cleared search and a provider switch, not for typing", async () => {
    await render();
    const before = findCalls().length;
    await search("landing");
    expect(findCalls()).toHaveLength(before);
    await pressEnterInSearch();
    expect(findCalls()).toHaveLength(before + 1);
    expect(findCalls().at(-1)![1]).toMatchObject({
      request: { query: "landing" },
    });
    await search("");
    expect(findCalls()).toHaveLength(before + 2);
    expect(findCalls().at(-1)![1]).toMatchObject({ request: { query: "" } });
    await act(async () =>
      [...container.querySelectorAll<HTMLElement>('[role="tab"]')]
        .find((tab) => tab.textContent === "Codex")!
        .click(),
    );
    expect(findCalls().at(-1)![1]).toMatchObject({ provider: "codex" });
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
    await pressEnterInSearch();
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
  it("drops an older response after another search", async () => {
    let finish: (value: unknown) => void = () => undefined;
    await render();
    await search("old");
    vi.mocked(invoke).mockImplementationOnce(
      async () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await pressEnterInSearch();
    await search("new");
    vi.mocked(invoke).mockResolvedValueOnce(page("New task", "new"));
    await pressEnterInSearch();
    await act(async () => finish(page("Stale task")));
    expect(container.textContent).toContain("New task");
    expect(container.textContent).not.toContain("Stale task");
  });
  it("shows discovery failures and blocks a wrong-account row", async () => {
    vi.mocked(invoke).mockRejectedValueOnce(
      new Error("Provider store is unavailable"),
    );
    await render();
    expect(container.textContent).toContain("Provider store is unavailable");
    await search("again");
    vi.mocked(invoke).mockResolvedValueOnce({
      conversations: [{ ...row, providerAccountId: "other" }],
      diagnostics: [],
      nextOffset: null,
    });
    await pressEnterInSearch();
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>("[data-session-card]")!
        .click(),
    );
    expect(container.textContent).toContain("different or removed");
    expect(resume).not.toHaveBeenCalled();
  });
});
describe("Resume session layout", () => {
  it("is called Resume session and never Import", async () => {
    await render();
    expect(container.querySelector("h2")?.textContent).toBe("Resume session");
    expect(container.textContent).not.toContain("Import");
  });
  it("shows the provider switch only for two providers and no account select for one account", async () => {
    await render();
    expect(
      container.querySelector('[role="tablist"][aria-label="Provider"]'),
    ).not.toBeNull();
    expect(container.querySelector('[aria-label^="Account"]')).toBeNull();
  });
  it("hides the provider switch for a single provider", async () => {
    await render(["codex"]);
    expect(
      container.querySelector('[role="tablist"][aria-label="Provider"]'),
    ).toBeNull();
  });
  it("uses h-9 controls and drops the footer and long paragraph", async () => {
    await render();
    const searchInput = container.querySelector(
      '[aria-label="Search conversations"]',
    )!;
    const paste = container.querySelector(
      '[aria-label="Session ID or resume command"]',
    )!;
    const importButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Resume",
    )!;
    for (const element of [searchInput, paste, importButton])
      expect(element.classList.contains("h-9")).toBe(true);
    expect(container.textContent).toContain(
      "Must be on this computer. Close it in the other app first.",
    );
    expect(container.textContent).not.toContain("without a summary transfer");
  });
});
