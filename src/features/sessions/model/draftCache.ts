/**
 * In-memory composer drafts, keyed by session id.
 *
 * SessionPane keeps the text you are typing in a React ref so retyping while
 * the pane stays mounted does not re-render on every keystroke. A plain ref
 * only lives as long as that one component instance though: closing a
 * session's pane (or moving it to another split) unmounts SessionPane, and
 * the ref - and whatever you had typed - is gone with no warning the moment
 * it remounts.
 *
 * This module-level map survives that, because it lives outside the React
 * tree for as long as the app process is running: the draft comes back when
 * the pane for that session opens again.
 *
 * It does not survive an app restart or a full reload - that needs the
 * draft written into the session's persisted record on disk, which is a
 * separate, larger change (touches the Rust-side session_upsert schema
 * too).
 */
import type { McpTag } from "./mcpPicker";
import type { Attachment } from "./session";

export const COMPOSER_INPUT_RESTORE_EVENT = "monocode:restore-composer-input";

export type ComposerInputRestore = {
  sessionId: string;
  text: string;
  attachments: Attachment[];
};

/** Restore a failed asynchronous submission into its still-open composer. */
export function restoreComposerInput(input: ComposerInputRestore): void {
  setComposerDraft(input.sessionId, input.text);
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ComposerInputRestore>(COMPOSER_INPUT_RESTORE_EVENT, {
      detail: input,
    }),
  );
}

const drafts = new Map<string, string>();
const mcpTags = new Map<string, McpTag[]>();

export function getComposerDraft(sessionId: string): string | undefined {
  return drafts.get(sessionId);
}

export function setComposerDraft(sessionId: string, text: string): void {
  if (text) {
    drafts.set(sessionId, text);
  } else {
    drafts.delete(sessionId);
    mcpTags.delete(sessionId);
  }
}

export function getComposerMcpTags(sessionId: string): McpTag[] {
  return mcpTags.get(sessionId) ?? [];
}

export function setComposerMcpTags(sessionId: string, tags: McpTag[]): void {
  if (tags.length > 0) {
    mcpTags.set(sessionId, tags);
  } else {
    mcpTags.delete(sessionId);
  }
}

export function clearComposerDraft(sessionId: string): void {
  drafts.delete(sessionId);
  mcpTags.delete(sessionId);
  pendingInput.delete(sessionId);
}

const pendingInput = new Set<string>();
export function setComposerPendingInput(sessionId: string, pending: boolean): void {
  if (pending) pendingInput.add(sessionId);
  else pendingInput.delete(sessionId);
}
export function hasComposerPendingInput(sessionId: string): boolean {
  return pendingInput.has(sessionId);
}

/** Replacing a session pane must retain any unfinished composer input or run. */
export function protectSessionOpening(session: import("./session").Session): boolean {
  return !!(
    session.busy || session.worktreePreparing || session.backgroundTasks?.length ||
    session.queuedMessages?.length || session.blocks.some(block => block.draft) ||
    getComposerDraft(session.id) || hasComposerPendingInput(session.id)
  );
}
