import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { GitChangedFile } from "../lib/fs";
import { ChangeRow, GitChangesPanel } from "./GitChangesPanel";

describe("GitChangesPanel", () => {
  it("renders GitChangesPanel container with Changes header", () => {
    const markup = renderToStaticMarkup(
      createElement(GitChangesPanel, {
        cwd: "/mock/repo",
        enabled: true,
        onOpenFile: vi.fn(),
        onOpenCommit: vi.fn(),
      }),
    );
    expect(markup).toBeDefined();
    expect(markup).toContain("Changes");
    expect(markup).toContain("Commit");
  });
});

describe("ChangeRow", () => {
  const deletedFile: GitChangedFile = {
    path: "/mock/repo/src/removed.ts",
    relative: "src/removed.ts",
    status: "deleted",
    staged: false,
    unstaged: true,
    additions: 0,
    deletions: 42,
  };

  const stagedDeletedFile: GitChangedFile = {
    path: "/mock/repo/src/old.ts",
    relative: "src/old.ts",
    status: "deleted",
    staged: true,
    unstaged: false,
    additions: 0,
    deletions: 15,
  };

  it("calls onOpenFile with { kind, status } when primary button is clicked", () => {
    const onOpenFile = vi.fn();
    const onAction = vi.fn();
    const el = ChangeRow({
      file: deletedFile,
      active: false,
      busy: false,
      kind: "unstaged",
      onOpenFile,
      onAction,
    });

    // The root is <li> containing a <div> with [primaryButton, actionButtonsContainer]
    const rowContainer = el.props.children;
    const [primaryButton, actionsContainer] = rowContainer.props.children;

    expect(primaryButton.type).toBe("button");
    expect(primaryButton.props.title).toBe("src/removed.ts");
    expect(primaryButton.props["aria-hidden"]).toBeUndefined();
    expect(primaryButton.props.tabIndex).toBeUndefined();

    // Clicking primary button invokes onOpenFile with path, kind, and status
    primaryButton.props.onClick();
    expect(onOpenFile).toHaveBeenCalledTimes(1);
    expect(onOpenFile).toHaveBeenCalledWith("/mock/repo/src/removed.ts", {
      kind: "unstaged",
      status: "deleted",
    });
    expect(onAction).not.toHaveBeenCalled();

    // Verify action buttons container is a sibling, not nested inside primary button
    expect(actionsContainer).toBeDefined();
    expect(actionsContainer.props.className).toContain("absolute");
  });

  it("isolates action buttons so clicks trigger onAction without opening file", () => {
    const onOpenFile = vi.fn();
    const onAction = vi.fn();
    const el = ChangeRow({
      file: deletedFile,
      active: false,
      busy: false,
      kind: "unstaged",
      onOpenFile,
      onAction,
    });

    const rowContainer = el.props.children;
    const [, actionsContainer] = rowContainer.props.children;
    const [discardAction, stageAction] = actionsContainer.props.children;

    // Discard action
    expect(discardAction.props.title).toBe("Discard Changes");
    expect(discardAction.props["aria-hidden"]).toBeUndefined();
    const stopPropagation = vi.fn();
    discardAction.props.onClick({ stopPropagation });
    expect(onAction).toHaveBeenCalledWith(deletedFile, "discard");
    expect(onOpenFile).not.toHaveBeenCalled();

    // Stage action
    expect(stageAction.props.title).toBe("Stage Changes");
    expect(stageAction.props["aria-hidden"]).toBeUndefined();
    stageAction.props.onClick({ stopPropagation });
    expect(onAction).toHaveBeenCalledWith(deletedFile, "stage");
    expect(onOpenFile).not.toHaveBeenCalled();
  });

  it("renders unstage action for staged deleted files and triggers unstage on click", () => {
    const onOpenFile = vi.fn();
    const onAction = vi.fn();
    const el = ChangeRow({
      file: stagedDeletedFile,
      active: true,
      busy: false,
      kind: "staged",
      onOpenFile,
      onAction,
    });

    const rowContainer = el.props.children;
    const [primaryButton, actionsContainer] = rowContainer.props.children;

    primaryButton.props.onClick();
    expect(onOpenFile).toHaveBeenCalledWith("/mock/repo/src/old.ts", {
      kind: "staged",
      status: "deleted",
    });

    const [, unstageAction] = actionsContainer.props.children;
    expect(unstageAction.props.title).toBe("Unstage Changes");
    expect(unstageAction.props["aria-hidden"]).toBeUndefined();
    const stopPropagation = vi.fn();
    unstageAction.props.onClick({ stopPropagation });
    expect(onAction).toHaveBeenCalledWith(stagedDeletedFile, "unstage");
  });
});
