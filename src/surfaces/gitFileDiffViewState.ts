import type { UnifiedFileDiff } from "../lib/unifiedDiff";
import type { UnifiedDiffFileModel } from "./UnifiedDiffView";

export type LoadedGitDiff = {
  binary: boolean;
  tooLarge: boolean;
  original: string;
  current: string;
  unified: UnifiedFileDiff | null;
};

export type GitFileDiffViewDerivedState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | {
      status: "ready";
      model: UnifiedDiffFileModel;
      substate: "diff" | "binary" | "too-large" | "empty";
    };

export function deriveGitFileDiffViewState({
  loading,
  loaded,
  error,
  relative,
  path,
  kind = "unstaged",
}: {
  loading: boolean;
  loaded: LoadedGitDiff | null;
  error: string | null;
  relative: string;
  path: string;
  kind?: "staged" | "unstaged";
}): GitFileDiffViewDerivedState {
  if (error) {
    return { status: "error", error };
  }
  if (loading || !loaded) {
    return { status: "loading" };
  }

  const isStaged = kind === "staged";
  const unified = loaded.unified;
  const unchanged =
    unified != null &&
    unified.additions === 0 &&
    unified.deletions === 0 &&
    !loaded.binary;

  let substate: "diff" | "binary" | "too-large" | "empty";
  let emptyMessage: string | undefined;

  if (loaded.binary) {
    substate = "binary";
  } else if (loaded.tooLarge) {
    substate = "too-large";
  } else if (unchanged) {
    substate = "empty";
    emptyMessage = isStaged ? "No staged changes" : "No unstaged changes";
  } else {
    substate = "diff";
  }

  const model: UnifiedDiffFileModel = {
    id: relative,
    path,
    label: isStaged ? `${relative} (staged)` : relative,
    binary: loaded.binary,
    tooLarge: loaded.tooLarge,
    emptyMessage,
    additions: unified?.additions ?? 0,
    deletions: unified?.deletions ?? 0,
    blocks: unchanged ? [] : (unified?.blocks ?? []),
    canStage: !isStaged,
    canDiscard: !isStaged,
    canStageHunk: !isStaged && !loaded.binary && !loaded.tooLarge,
  };

  return {
    status: "ready",
    model,
    substate,
  };
}
