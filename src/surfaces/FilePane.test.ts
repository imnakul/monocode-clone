import { describe, expect, it } from "vitest";
import {
  newChangesTab,
  newCommitTab,
  newFileTab,
  newGitDiffTab,
  newReleaseNotesWorkspaceTab,
  newSessionChangesTab,
} from "../lib/layout";
import { selectPaneSurface } from "./filePaneSelection";

describe("selectPaneSurface", () => {
  it("returns none when activeFile is undefined", () => {
    expect(selectPaneSurface(undefined, "editor")).toEqual({ kind: "none" });
    expect(selectPaneSurface(undefined, "unified")).toEqual({ kind: "none" });
  });

  it("returns session-changes for session changes tab", () => {
    const file = newSessionChangesTab("/repo", "sess-1", "/repo/a.ts");
    expect(selectPaneSurface(file, "editor")).toEqual({
      kind: "session-changes",
      file,
    });
    expect(selectPaneSurface(file, "unified")).toEqual({
      kind: "session-changes",
      file,
    });
  });

  it("returns commit for commit tab", () => {
    const file = newCommitTab("/repo", {
      sha: "123456",
      shortSha: "123",
      subject: "test",
    });
    expect(selectPaneSurface(file, "editor")).toEqual({
      kind: "commit",
      file,
    });
  });

  it("returns none (fallback to editor surfaces) for release notes tab", () => {
    const tab = newReleaseNotesWorkspaceTab({ version: "0.1.0" });
    const file = tab.editorPanes[0]?.files[0];
    expect(selectPaneSurface(file, "editor")).toEqual({
      kind: "none",
    });
  });

  it("returns working-tree-diff for aggregate Changes tab regardless of diffViewer mode", () => {
    const file = newChangesTab("/repo", "/repo/foo.ts", "staged");
    expect(selectPaneSurface(file, "editor")).toEqual({
      kind: "working-tree-diff",
      file,
    });
    expect(selectPaneSurface(file, "unified")).toEqual({
      kind: "working-tree-diff",
      file,
    });
  });

  it("returns git-diff for standalone diff tab regardless of diffViewer mode", () => {
    const file = newGitDiffTab("/repo/deleted.ts", "/repo", "unstaged", true);
    expect(selectPaneSurface(file, "editor")).toEqual({
      kind: "git-diff",
      file,
    });
    expect(selectPaneSurface(file, "unified")).toEqual({
      kind: "git-diff",
      file,
    });
  });

  it("routes modified review tabs to working-tree-diff in unified mode and none in editor mode", () => {
    const regularReviewFile = newFileTab("/repo/modified.ts", "/repo", true);
    expect(selectPaneSurface(regularReviewFile, "unified")).toEqual({
      kind: "working-tree-diff",
      file: regularReviewFile,
    });
    expect(selectPaneSurface(regularReviewFile, "editor")).toEqual({
      kind: "none",
    });
  });

  it("returns none (fallback to editor surfaces) for regular files", () => {
    const file = newFileTab("/repo/main.ts", "/repo");
    expect(selectPaneSurface(file, "editor")).toEqual({
      kind: "none",
    });
  });
});
