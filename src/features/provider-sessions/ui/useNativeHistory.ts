import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { Block, HarnessId } from "../../sessions/model/session";
import {
  historyBlocks,
  nativeHistoryStore,
  trimHistoryBefore,
  type NativeHistoryState,
} from "../model/history";

export type NativeHistoryView = {
  /** Display-only blocks (oldest first, ending with the divider); empty when none. */
  blocks: Block[];
  state: NativeHistoryState;
  showEarlier: () => void;
  retry: () => void;
};

/**
 * Read-only earlier history for a chat bound to a native Claude/Codex
 * conversation. Loads when the chat is shown, once per app run; nothing here
 * writes MonoCode turns or reaches the provider.
 */
export function useNativeHistory(input: {
  sessionId: string;
  harness: HarnessId;
  providerAccountId?: string;
  enabled: boolean;
  /** Epoch ms of the chat's first MonoCode turn; earlier provider items only. */
  cutoffMs?: number;
  representedNativeIds?: ReadonlySet<string>;
}): NativeHistoryView {
  const { sessionId, harness, providerAccountId, enabled, cutoffMs, representedNativeIds } = input;
  const accountId = providerAccountId ?? "default";
  useSyncExternalStore(
    nativeHistoryStore.subscribe,
    nativeHistoryStore.getVersion,
    nativeHistoryStore.getVersion,
  );
  const state = nativeHistoryStore.get(sessionId);
  useEffect(() => {
    if (enabled) void nativeHistoryStore.ensureLoaded(sessionId, harness, accountId);
  }, [enabled, sessionId, harness, accountId]);
  const blocks = useMemo(() => {
    if (state.status !== "ready") return [];
    const earlier = trimHistoryBefore(state.items, cutoffMs, representedNativeIds);
    const items = earlier.slice(-state.visible);
    if (items.length === 0) return [];
    return historyBlocks(items, state.provider, {
      hasEarlier: state.hasEarlier,
      hiddenCount: Math.max(0, earlier.length - state.visible),
    });
  }, [state, cutoffMs, representedNativeIds]);
  return useMemo(
    () => ({
      blocks,
      state,
      showEarlier: () => void nativeHistoryStore.showEarlier(sessionId),
      retry: () =>
        void nativeHistoryStore.ensureLoaded(sessionId, harness, accountId, true),
    }),
    [blocks, state, sessionId, harness, accountId],
  );
}
