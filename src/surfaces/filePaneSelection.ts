import {
  isChangesTab,
  isCommitTab,
  isDiffTab,
  isReviewTab,
  isSessionChangesTab,
  type FilePaneTab,
} from "../lib/layout";
import type { DiffViewer } from "../lib/settings";

export type PaneSurfaceSelection =
  | {
      kind: "session-changes";
      file: FilePaneTab & {
        sessionChanges: NonNullable<FilePaneTab["sessionChanges"]>;
      };
    }
  | {
      kind: "commit";
      file: FilePaneTab & { commit: NonNullable<FilePaneTab["commit"]> };
    }
  | {
      kind: "git-diff";
      file: FilePaneTab & { diff: NonNullable<FilePaneTab["diff"]> };
    }
  | {
      kind: "working-tree-diff";
      file: FilePaneTab;
    }
  | {
      kind: "none";
    };

export function selectPaneSurface(
  activeFile: FilePaneTab | undefined,
  diffViewer: DiffViewer,
): PaneSurfaceSelection {
  if (!activeFile) return { kind: "none" };
  if (isSessionChangesTab(activeFile)) {
    return { kind: "session-changes", file: activeFile };
  }
  if (isCommitTab(activeFile)) {
    return { kind: "commit", file: activeFile };
  }
  if (isDiffTab(activeFile)) {
    return { kind: "git-diff", file: activeFile };
  }
  if (
    isChangesTab(activeFile) ||
    (diffViewer === "unified" && isReviewTab(activeFile))
  ) {
    return { kind: "working-tree-diff", file: activeFile };
  }
  return { kind: "none" };
}
