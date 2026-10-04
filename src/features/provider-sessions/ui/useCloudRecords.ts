import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { providerAccounts } from "../../providers/model/providerAccounts";
import {
  listRetainedCloudSessions,
  type CloudSession,
} from "../model/cloudSessions";
import { mergeCloudRecords } from "../model/cloudView";
import type { NativeProvider } from "../model/providerSessions";
import { NATIVE_PROVIDERS } from "./useProviderConversations";

export type CloudRecordsController = {
  records: CloudSession[];
  error: string | null;
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
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
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
      })),
    );
    if (targets.length === 0) {
      setRecords([]);
      setError(null);
      return;
    }
    void Promise.allSettled(
      targets.map((target) =>
        listRetainedCloudSessions(target.provider, target.accountId),
      ),
    ).then((results) => {
      if (run !== generation.current) return;
      const groups = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      const failed = results.find((result) => result.status === "rejected");
      setRecords(mergeCloudRecords(...groups));
      setError(
        failed && failed.status === "rejected"
          ? failed.reason instanceof Error
            ? failed.reason.message
            : String(failed.reason)
          : null,
      );
    });
  }, [key]);

  useEffect(() => {
    refresh();
    return () => {
      generation.current += 1;
    };
  }, [refresh]);

  const add = useCallback((record: CloudSession): void => {
    setRecords((current) => mergeCloudRecords(current, [record]));
  }, []);

  return useMemo(
    () => ({ records, error, refresh, add }),
    [records, error, refresh, add],
  );
}
