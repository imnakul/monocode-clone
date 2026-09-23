import type { WorkspaceTab } from "./layout";

/**
 * Terminal ids present in `before` but absent from `after`. Session removal can
 * close tabs or reset their terminal panes to a replacement conversation, so
 * every id that disappears must have its shell forgotten and killed — nothing
 * may outlive its surface.
 */
export function disappearedTerminalIds(
  before: readonly WorkspaceTab[],
  after: readonly WorkspaceTab[],
): string[] {
  const live = new Set<string>();
  for (const tab of after) {
    for (const pane of tab.terminalPanes ?? []) {
      for (const file of pane.files) live.add(file.id);
    }
  }
  const gone: string[] = [];
  const seen = new Set<string>();
  for (const tab of before) {
    for (const pane of tab.terminalPanes ?? []) {
      for (const file of pane.files) {
        if (!live.has(file.id) && !seen.has(file.id)) {
          seen.add(file.id);
          gone.push(file.id);
        }
      }
    }
  }
  return gone;
}
