import type { Session } from "../../sessions/model/session";
import { sameProjectPath } from "../../projects/model/recents";
import type { ProviderConversationStore } from "./conversationStore";
import type {
  NativeOpenDependencies,
  ProviderConversation,
} from "./providerSessions";

const DEFAULT_ACCOUNT = "default";

/**
 * Live-aware lookups for `openProviderConversation`: a chat already open in
 * this window (even a blank phone-only one) is matched on all four identity
 * fields before the durable store is consulted, so a row never duplicates it.
 */
export function liveNativeDependencies(deps: {
  liveSessions: () => readonly Session[];
  getStored: (id: string) => Promise<Session | null | undefined>;
  saveNative: (session: Session) => Promise<unknown>;
}): NativeOpenDependencies {
  return {
    findSession: async (id) =>
      deps.liveSessions().find((entry) => entry.id === id) ??
      (await deps.getStored(id)) ??
      undefined,
    saveSession: async (session) => {
      if (!(await deps.saveNative(session)))
        throw new Error(
          "The MonoCode conversation was removed before it could be saved.",
        );
    },
    findNativeSession: async (row) =>
      deps
        .liveSessions()
        .find(
          (entry) =>
            entry.providerSessionId === row.nativeId &&
            entry.harness === row.provider &&
            sameProjectPath(entry.cwd, row.cwd) &&
            (entry.providerAccountId ?? DEFAULT_ACCOUNT) ===
              row.providerAccountId,
        ),
  };
}

function reason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Archive/unarchive is MonoCode-only visibility. The list flips at once and
 * rolls back on failure. When the row already backs a MonoCode chat, that chat
 * is synchronized through the existing Archive flow; if it refuses, the
 * provider-list flag is undone so the two records never disagree.
 * Returns an error message to show, or null on success.
 */
export async function archiveProviderConversationRow(deps: {
  store: Pick<ProviderConversationStore, "setArchivedLocal" | "restoreRow">;
  setArchived: (key: string, archived: boolean) => Promise<void>;
  /** Existing MonoCode archive flow; resolves false when it did not apply. */
  syncSession: (sessionId: string, archived: boolean) => Promise<boolean>;
  row: ProviderConversation;
  archived: boolean;
}): Promise<string | null> {
  const { store, row, archived } = deps;
  const verb = archived ? "archive" : "unarchive";
  const previous = store.setArchivedLocal(row.key, archived);
  const rollback = (): void => {
    if (previous) store.restoreRow(previous.provider, previous.row);
  };
  try {
    await deps.setArchived(row.key, archived);
  } catch (error) {
    rollback();
    return `Could not ${verb} this conversation. ${reason(error)}`;
  }
  if (!row.monocodeSessionId) return null;
  let synced = false;
  try {
    synced = await deps.syncSession(row.monocodeSessionId, archived);
  } catch {
    synced = false;
  }
  if (synced) return null;
  try {
    await deps.setArchived(row.key, !archived);
    rollback();
    return `MonoCode could not ${verb} the open chat, so the conversation was left as it was.`;
  } catch (error) {
    return `The conversation is ${archived ? "archived" : "unarchived"} in the list, but the MonoCode chat could not be updated. ${reason(error)}`;
  }
}
