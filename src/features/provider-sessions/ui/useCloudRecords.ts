import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  providerAccounts,
  subscribeProviderAccounts,
} from "../../providers/model/providerAccounts";
import {
  listRetainedCloudSessions,
  type CloudSession,
} from "../model/cloudSessions";
import { cloudRecordKey, mergeCloudRecords } from "../model/cloudView";
import type { NativeProvider } from "../model/providerSessions";
import { NATIVE_PROVIDERS } from "./useProviderConversations";

export type CloudRecordsController = {
  records: CloudSession[];
  /** Last refresh failures grouped by provider; successful providers stay clear. */
  errors: Partial<Record<NativeProvider, string>>;
  refreshing: boolean;
  refresh: () => void;
  /** Show a record at once (a launch just returned it) without waiting for a list. */
  add: (record: CloudSession) => void;
};

/**
 * MonoCode-launched cloud tasks for the enabled providers, restored from the
 * retained records. This does not discover other cloud chats.
 */
export function useCloudRecords(
  providers: readonly NativeProvider[],
): CloudRecordsController {
  const [records, setRecords] = useState<CloudSession[]>([]);
  const [errors, setErrors] = useState<Partial<Record<NativeProvider, string>>>(
    {},
  );
  const [refreshing, setRefreshing] = useState(false);
  const generation = useRef(0);
  const additions = useRef(new Map<string, CloudSession>());
  const key = providers.join(",");

  const refresh = useCallback((): void => {
    const wanted = key ? key.split(",") : [];
    const run = ++generation.current;
    const targets = NATIVE_PROVIDERS.filter((provider) =>
      wanted.includes(provider),
    ).flatMap((provider) =>
      providerAccounts(provider).map((account) => ({
        provider,
        accountId: account.id,
        label: account.label,
      })),
    );
    if (targets.length === 0) {
      setRecords([]);
      setErrors({});
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    void Promise.allSettled(
      targets.map((target) =>
        listRetainedCloudSessions(target.provider, target.accountId),
      ),
    ).then((results) => {
      if (run !== generation.current) return;
      const groups = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      const activeTargets = new Set(
        targets.map((target) => targetKey(target.provider, target.accountId)),
      );
      const failedTargets = new Set<string>();
      const nextErrors: Partial<Record<NativeProvider, string>> = {};
      results.forEach((result, index) => {
        if (result.status !== "rejected") return;
        const target = targets[index];
        if (!target) return;
        failedTargets.add(targetKey(target.provider, target.accountId));
        const detail =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);
        const line = `Could not refresh ${target.provider} cloud tasks for account “${target.label}”. ${detail}`;
        nextErrors[target.provider] = [
          ...(nextErrors[target.provider] ? [nextErrors[target.provider]!] : []),
          line,
        ].join("\n");
      });
      for (const group of groups)
        for (const record of group) additions.current.delete(cloudRecordKey(record));
      const pendingAdds = [...additions.current.values()].filter((record) =>
        activeTargets.has(
          targetKey(record.provider, record.providerAccountId),
        ),
      );
      setRecords((current) => {
        const retainedFailedRecords = current.filter((record) =>
          failedTargets.has(
            targetKey(record.provider, record.providerAccountId),
          ),
        );
        return mergeCloudRecords(retainedFailedRecords, ...groups, pendingAdds);
      });
      setErrors(nextErrors);
      setRefreshing(false);
    });
  }, [key]);

  useEffect(() => {
    refresh();
    const unsubscribeAccounts = subscribeProviderAccounts(refresh);
    return () => {
      generation.current += 1;
      unsubscribeAccounts();
    };
  }, [refresh]);

  const add = useCallback((record: CloudSession): void => {
    additions.current.set(cloudRecordKey(record), record);
    setRecords((current) => mergeCloudRecords(current, [record]));
  }, []);

  return useMemo(
    () => ({ records, errors, refreshing, refresh, add }),
    [records, errors, refreshing, refresh, add],
  );
}

function targetKey(provider: NativeProvider, accountId: string): string {
  return JSON.stringify([provider, accountId]);
}
