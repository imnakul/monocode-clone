// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invalidateWatchedFiles: vi.fn(),
  generateHelperCommitMessage: vi.fn(),
  generateHelperPrContent: vi.fn(),
  helperFailureMessage: vi.fn(() => "The description was not generated."),
  openUrl: vi.fn(async () => {}),
}));

vi.mock("../../../platform/tauri/fs", () => ({
  gitDiffIndex: vi.fn(),
  gitHistory: vi.fn(async () => []),
  gitPrStatus: vi.fn(async () => null),
  gitPull: vi.fn(async () => {}),
  gitPush: vi.fn(async () => {}),
  gitSync: vi.fn(async () => {}),
  gitCommit: vi.fn(async () => {}),
  gitHeadMessage: vi.fn(async () => ""),
  gitStageAll: vi.fn(async () => {}),
  gitUnstageAll: vi.fn(async () => {}),
  gitDiscardAll: vi.fn(async () => {}),
  gitStageFile: vi.fn(async () => {}),
  gitUnstageFile: vi.fn(async () => {}),
  gitDiscardFile: vi.fn(async () => {}),
  gitPrCreate: vi.fn(async () => ""),
  notifyGitChanged: vi.fn(),
  subscribeGitChanged: () => () => {},
  basename: (path: string) => path.split("/").pop() ?? path,
}));

vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: mocks.openUrl }));

vi.mock("../../../integrations/harness", () => ({
  generateHelperCommitMessage: mocks.generateHelperCommitMessage,
  generateHelperPrContent: mocks.generateHelperPrContent,
  helperFailureMessage: mocks.helperFailureMessage,
}));

vi.mock("../../files/model/fileWatch", () => ({
  invalidateWatchedFiles: mocks.invalidateWatchedFiles,
  nudgeWatchedFiles: vi.fn(),
}));

vi.mock("../../inbox/model/inboxSelfActivity", () => ({
  recordInboxSelfActivity: vi.fn(),
}));

import { GitChangesPanel } from "./GitChangesPanel";
import {
  gitDiffIndex,
  gitPull,
  gitPush,
  gitPrCreate,
} from "../../../platform/tauri/fs";
import type { GitDiffIndex } from "../../../platform/tauri/fs";
import { generateHelperPrContent } from "../../../integrations/harness";

function index(overrides: Partial<GitDiffIndex> = {}): GitDiffIndex {
  return {
    branch: "feature/pull",
    head: "abc123",
    files: [],
    additions: 0,
    deletions: 0,
    remote: null,
    upstream: null,
    defaultBranch: "main",
    ahead: 0,
    behind: 0,
    aheadOfDefault: 0,
    headPushed: true,
    ...overrides,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.mocked(gitDiffIndex).mockReset();
  vi.mocked(gitPull).mockReset();
  mocks.invalidateWatchedFiles.mockReset();
  mocks.generateHelperCommitMessage.mockReset();
  mocks.generateHelperPrContent.mockReset();
  mocks.helperFailureMessage.mockReset().mockReturnValue(
    "The description was not generated.",
  );
  mocks.openUrl.mockReset();
  vi.mocked(gitPush).mockReset();
  vi.mocked(gitPrCreate).mockReset();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body
    .querySelectorAll("[data-popover-side]")
    .forEach((element) => element.remove());
  vi.unstubAllGlobals();
});

async function renderPanel() {
  act(() =>
    root.render(
      createElement(GitChangesPanel, {
        cwd: "/repo",
        enabled: true,
        onOpenFile: vi.fn(),
        onOpenAllChanges: vi.fn(),
        onOpenCommit: vi.fn(),
      }),
    ),
  );
  await act(async () => {});
}

async function openBranchMenu() {
  const toggle = container.querySelector<HTMLButtonElement>(
    '[aria-label="Branch actions"]',
  )!;
  await act(async () => toggle.click());
  await act(async () => {});
  return document.querySelector<HTMLButtonElement>(
    '[role="menuitem"]',
  )!;
}

describe("GitChangesPanel pull action", () => {
  it("disables Pull when the branch has no upstream", async () => {
    vi.mocked(gitDiffIndex).mockResolvedValue(
      index({ remote: null, upstream: null }),
    );
    await renderPanel();

    const pull = await openBranchMenu();
    expect(pull.textContent).toContain("Pull");
    expect(pull.disabled).toBe(true);
  });

  it("disables Pull when the repository has no remote", async () => {
    vi.mocked(gitDiffIndex).mockResolvedValue(
      index({ remote: null, upstream: "origin/feature/pull" }),
    );
    await renderPanel();

    const pull = await openBranchMenu();
    expect(pull.disabled).toBe(true);
  });

  it("pulls the current branch and reloads watched files", async () => {
    vi.mocked(gitDiffIndex).mockResolvedValue(
      index({ remote: "origin", upstream: "origin/feature/pull" }),
    );
    await renderPanel();

    const pull = await openBranchMenu();
    expect(pull.disabled).toBe(false);

    mocks.invalidateWatchedFiles.mockClear();
    await act(async () => {
      pull.click();
      await Promise.resolve();
    });

    expect(gitPull).toHaveBeenCalledWith("/repo");
    expect(mocks.invalidateWatchedFiles).toHaveBeenCalled();
  });
});

describe("GitChangesPanel custom PR recovery", () => {
  const draft = {
    title: "Draft title",
    body: "Draft body",
    base: "main",
    head: "feature/pull",
  };

  async function showCreatePr(ahead: number) {
    vi.mocked(gitDiffIndex).mockResolvedValue(
      index({
        remote: "origin",
        upstream: "origin/feature/pull",
        ahead,
        behind: 0,
        aheadOfDefault: 1,
        headPushed: ahead === 0,
      }),
    );
    mocks.generateHelperPrContent.mockResolvedValue({
      status: "needs-review",
      draft,
      failure: {
        ok: false,
        kind: "auth",
        target: { provider: "claude" },
        message: "sign in required",
        calls: 1,
      },
    });
    await renderPanel();
    const create = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button"),
    ).find((button) => button.textContent?.includes("Create PR"))!;
    await act(async () => {
      create.click();
      await Promise.resolve();
    });
  }

  it("pushes before helper generation and shows a draft without creating a PR", async () => {
    await showCreatePr(1);

    expect(gitPush).toHaveBeenCalledWith("/repo");
    expect(generateHelperPrContent).toHaveBeenCalledWith("/repo", undefined);
    expect(gitPush.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.generateHelperPrContent.mock.invocationCallOrder[0]!,
    );
    expect(gitPrCreate).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Pull request details");
    expect(document.body.textContent).toContain(
      "Your branch was pushed to origin/feature/pull. No pull request was created.",
    );
  });

  it("does not claim that a push happened when the branch was already pushed", async () => {
    await showCreatePr(0);

    expect(gitPush).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Pull request details");
    expect(document.body.textContent).not.toContain(
      "Your branch was pushed to origin/feature/pull.",
    );
    expect(gitPrCreate).not.toHaveBeenCalled();
  });

  it("keeps the ready PR flow ordered after a push and opens the returned URL", async () => {
    vi.mocked(gitDiffIndex).mockResolvedValue(
      index({
        remote: "origin",
        upstream: "origin/feature/pull",
        ahead: 1,
        behind: 0,
        aheadOfDefault: 1,
        headPushed: false,
      }),
    );
    mocks.generateHelperPrContent.mockResolvedValue({
      status: "ready",
      content: draft,
    });
    vi.mocked(gitPrCreate).mockResolvedValue(
      "https://github.com/work/repo/pull/12",
    );
    await renderPanel();
    const create = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button"),
    ).find((button) => button.textContent?.includes("Create PR"))!;

    await act(async () => {
      create.click();
      await Promise.resolve();
    });

    expect(gitPush.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.generateHelperPrContent.mock.invocationCallOrder[0]!,
    );
    expect(mocks.generateHelperPrContent.mock.invocationCallOrder[0]).toBeLessThan(
      gitPrCreate.mock.invocationCallOrder[0]!,
    );
    expect(gitPrCreate).toHaveBeenCalledWith(
      "/repo",
      draft.title,
      draft.body,
      draft.base,
      draft.head,
    );
    expect(mocks.openUrl).toHaveBeenCalledWith(
      "https://github.com/work/repo/pull/12",
    );
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it("keeps text typed while commit generation is pending", async () => {
    const file = {
      path: "/repo/README.md",
      relative: "README.md",
      status: "modified",
      additions: 1,
      deletions: 0,
      staged: true,
      unstaged: false,
    };
    let resolveGeneration: ((message: string) => void) | undefined;
    mocks.generateHelperCommitMessage.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveGeneration = resolve;
        }),
    );
    vi.mocked(gitDiffIndex).mockResolvedValue(index({ files: [file] }));
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    await renderPanel();

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Generate commit message"]',
        )!
        .click();
    });
    const message = container.querySelector<HTMLTextAreaElement>(
      "textarea",
    )!;
    expect(message.disabled).toBe(false);
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )!.set!.call(message, "typed while generating");
      message.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      resolveGeneration?.("generated message");
      await Promise.resolve();
    });

    expect(message.value).toBe("typed while generating");
    expect(alert).toHaveBeenCalledWith(
      "A commit message was generated, but you edited the field, so it wasn't applied.",
    );
  });

  it("applies the generated commit message when the field stayed unchanged", async () => {
    vi.mocked(gitDiffIndex).mockResolvedValue(
      index({
        files: [
          {
            path: "/repo/README.md",
            relative: "README.md",
            status: "modified",
            additions: 1,
            deletions: 0,
            staged: true,
            unstaged: false,
          },
        ],
      }),
    );
    mocks.generateHelperCommitMessage.mockResolvedValue("generated message");
    await renderPanel();

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Generate commit message"]',
        )!
        .click();
      await Promise.resolve();
    });

    expect(
      container.querySelector<HTMLTextAreaElement>("textarea")!.value,
    ).toBe("generated message");
  });
});
