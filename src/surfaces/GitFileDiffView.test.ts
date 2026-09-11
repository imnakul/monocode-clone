import { describe, expect, it } from "vitest";
import {
  deriveGitFileDiffViewState,
  type LoadedGitDiff,
} from "./gitFileDiffViewState";

describe("deriveGitFileDiffViewState", () => {
  const sampleUnifiedDiff = {
    path: "src/file.ts",
    oldPath: "src/file.ts",
    additions: 3,
    deletions: 1,
    blocks: [
      {
        oldStart: 1,
        oldLines: 1,
        newStart: 1,
        newLines: 3,
        lines: [
          { type: "delete" as const, text: "old line", oldNo: 1 },
          { type: "add" as const, text: "new line 1", newNo: 1 },
          { type: "add" as const, text: "new line 2", newNo: 2 },
          { type: "add" as const, text: "new line 3", newNo: 3 },
        ],
      },
    ],
  };

  it("returns loading status when loading is true or loaded is null", () => {
    expect(
      deriveGitFileDiffViewState({
        loading: true,
        loaded: null,
        error: null,
        relative: "src/file.ts",
        path: "/repo/src/file.ts",
      }),
    ).toEqual({ status: "loading" });

    const loaded: LoadedGitDiff = {
      binary: false,
      tooLarge: false,
      original: "old",
      current: "new",
      unified: sampleUnifiedDiff,
    };
    expect(
      deriveGitFileDiffViewState({
        loading: true,
        loaded,
        error: null,
        relative: "src/file.ts",
        path: "/repo/src/file.ts",
      }),
    ).toEqual({ status: "loading" });
  });

  it("returns error status with message when error is present", () => {
    const res = deriveGitFileDiffViewState({
      loading: false,
      loaded: null,
      error: "git diff failed with exit code 128",
      relative: "src/file.ts",
      path: "/repo/src/file.ts",
    });
    expect(res).toEqual({
      status: "error",
      error: "git diff failed with exit code 128",
    });
  });

  it("prioritizes error over loaded data", () => {
    const loaded: LoadedGitDiff = {
      binary: false,
      tooLarge: false,
      original: "old",
      current: "new",
      unified: sampleUnifiedDiff,
    };
    const res = deriveGitFileDiffViewState({
      loading: false,
      loaded,
      error: "network broken",
      relative: "src/file.ts",
      path: "/repo/src/file.ts",
    });
    expect(res).toEqual({
      status: "error",
      error: "network broken",
    });
  });

  it("returns ready with substate 'diff' for normal text changes", () => {
    const loaded: LoadedGitDiff = {
      binary: false,
      tooLarge: false,
      original: "old",
      current: "new",
      unified: sampleUnifiedDiff,
    };
    const unstaged = deriveGitFileDiffViewState({
      loading: false,
      loaded,
      error: null,
      relative: "src/file.ts",
      path: "/repo/src/file.ts",
      kind: "unstaged",
    });
    expect(unstaged.status).toBe("ready");
    if (unstaged.status === "ready") {
      expect(unstaged.substate).toBe("diff");
      expect(unstaged.model.label).toBe("src/file.ts");
      expect(unstaged.model.additions).toBe(3);
      expect(unstaged.model.deletions).toBe(1);
      expect(unstaged.model.canStage).toBe(true);
      expect(unstaged.model.canDiscard).toBe(true);
    }

    const staged = deriveGitFileDiffViewState({
      loading: false,
      loaded,
      error: null,
      relative: "src/file.ts",
      path: "/repo/src/file.ts",
      kind: "staged",
    });
    expect(staged.status).toBe("ready");
    if (staged.status === "ready") {
      expect(staged.substate).toBe("diff");
      expect(staged.model.label).toBe("src/file.ts (staged)");
      expect(staged.model.canStage).toBe(false);
      expect(staged.model.canDiscard).toBe(false);
    }
  });

  it("returns ready with substate 'binary' for binary files", () => {
    const loaded: LoadedGitDiff = {
      binary: true,
      tooLarge: false,
      original: "",
      current: "",
      unified: null,
    };
    const res = deriveGitFileDiffViewState({
      loading: false,
      loaded,
      error: null,
      relative: "image.png",
      path: "/repo/image.png",
      kind: "staged",
    });
    expect(res.status).toBe("ready");
    if (res.status === "ready") {
      expect(res.substate).toBe("binary");
      expect(res.model.binary).toBe(true);
    }
  });

  it("returns ready with substate 'too-large' for oversized files", () => {
    const loaded: LoadedGitDiff = {
      binary: false,
      tooLarge: true,
      original: "",
      current: "",
      unified: null,
    };
    const res = deriveGitFileDiffViewState({
      loading: false,
      loaded,
      error: null,
      relative: "large.json",
      path: "/repo/large.json",
      kind: "unstaged",
    });
    expect(res.status).toBe("ready");
    if (res.status === "ready") {
      expect(res.substate).toBe("too-large");
      expect(res.model.tooLarge).toBe(true);
    }
  });

  it("returns ready with substate 'empty' and distinct message for staged vs unstaged", () => {
    const emptyUnified = {
      path: "src/file.ts",
      oldPath: "src/file.ts",
      additions: 0,
      deletions: 0,
      blocks: [],
    };
    const loaded: LoadedGitDiff = {
      binary: false,
      tooLarge: false,
      original: "same",
      current: "same",
      unified: emptyUnified,
    };

    const unstaged = deriveGitFileDiffViewState({
      loading: false,
      loaded,
      error: null,
      relative: "src/file.ts",
      path: "/repo/src/file.ts",
      kind: "unstaged",
    });
    expect(unstaged.status).toBe("ready");
    if (unstaged.status === "ready") {
      expect(unstaged.substate).toBe("empty");
      expect(unstaged.model.emptyMessage).toBe("No unstaged changes");
    }

    const staged = deriveGitFileDiffViewState({
      loading: false,
      loaded,
      error: null,
      relative: "src/file.ts",
      path: "/repo/src/file.ts",
      kind: "staged",
    });
    expect(staged.status).toBe("ready");
    if (staged.status === "ready") {
      expect(staged.substate).toBe("empty");
      expect(staged.model.emptyMessage).toBe("No staged changes");
    }
  });
});
