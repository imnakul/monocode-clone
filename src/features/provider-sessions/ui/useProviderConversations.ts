import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  getHarnessAvailabilitySnapshot,
  hasProbedHarnessAvailability,
  isHarnessAvailable,
  subscribeHarnessAvailability,
} from "../../../integrations/harness/core/availabilityState";
import {
  getPickerVisibilitySnapshot,
  showProviderInModelPicker,
  subscribePickerVisibility,
} from "../../sessions/model/models";
import {
  providerAccountLabel,
  providerAccounts,
  subscribeProviderAccounts,
} from "../../providers/model/providerAccounts";
import {
  ProviderConversationStore,
  type ProviderListSnapshot,
} from "../model/conversationStore";
import {
  listProviderConversations,
  type NativeProvider,
} from "../model/providerSessions";

export const NATIVE_PROVIDERS: readonly NativeProvider[] = ["claude", "codex"];
/** Quiet window-focus refreshes are spaced out so alt-tabbing stays cheap. */
export const FOCUS_REFRESH_MIN_MS = 15_000;

/** Same enable rule the model picker uses: installed (once probed) and not hidden. */
export function useEnabledNativeProviders(): NativeProvider[] {
  const availability = useSyncExternalStore(
    subscribeHarnessAvailability,
    getHarnessAvailabilitySnapshot,
    getHarnessAvailabilitySnapshot,
  );
  const visibility = useSyncExternalStore(
    subscribePickerVisibility,
    getPickerVisibilitySnapshot,
    getPickerVisibilitySnapshot,
  );
  return useMemo(
    () =>
      NATIVE_PROVIDERS.filter((provider) =>
        showProviderInModelPicker(
          provider,
          isHarnessAvailable(provider),
          hasProbedHarnessAvailability(),
        ),
      ),
    // The snapshots are version counters that invalidate the module-level reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [availability, visibility],
  );
}

export type ProviderConversationsController = {
  store: ProviderConversationStore;
  snapshot: ProviderListSnapshot;
  showArchived: boolean;
  setShowArchived: (value: boolean) => void;
  refresh: (provider: NativeProvider) => void;
  loadMore: (provider: NativeProvider) => void;
};

/**
 * Owns discovery for the enabled providers: loads on enable/startup, refreshes
 * quietly on window focus and account changes, and exposes explicit
 * refresh/paging. Never watches the filesystem and never starts an agent.
 */
export function useProviderConversations(
  providers: readonly NativeProvider[],
): ProviderConversationsController {
  const [store] = useState(
    () =>
      new ProviderConversationStore({
        list: (provider, options) =>
          listProviderConversations(provider, options),
        accounts: (provider) =>
          providerAccounts(provider).map((account) => account.id),
        accountLabel: (provider, accountId) =>
          providerAccountLabel(provider, accountId),
      }),
  );
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  const [showArchived, setShowArchivedState] = useState(false);
  const providerKey = providers.join(",");

  useEffect(() => {
    const wanted = providerKey.split(",");
    store.setProviders(
      NATIVE_PROVIDERS.filter((provider) => wanted.includes(provider)),
    );
  }, [store, providerKey]);

  useEffect(() => {
    let last = Date.now();
    const onFocus = (): void => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - last < FOCUS_REFRESH_MIN_MS) return;
      last = now;
      store.refreshAll({ quiet: true });
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const unsubscribeAccounts = subscribeProviderAccounts(() => {
      store.refreshAll({ quiet: true });
    });
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      unsubscribeAccounts();
    };
  }, [store]);

  return useMemo(
    () => ({
      store,
      snapshot,
      showArchived,
      setShowArchived: (value: boolean): void => {
        setShowArchivedState(value);
        store.setIncludeArchived(value);
      },
      refresh: (provider: NativeProvider): void => {
        void store.refresh(provider, { quiet: false });
      },
      loadMore: (provider: NativeProvider): void => {
        void store.loadMore(provider);
      },
    }),
    [store, snapshot, showArchived],
  );
}
