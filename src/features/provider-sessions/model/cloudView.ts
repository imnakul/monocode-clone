import { invoke } from "@tauri-apps/api/core";
import type {
  CloudAction,
  CloudCapabilities,
  CloudSession,
} from "./cloudSessions";
import type { NativeProvider } from "./providerSessions";

export type CloudRecordAction = Exclude<CloudAction, "launch" | "list">;

export type CloudActionEntry = {
  action: CloudRecordAction;
  label: string;
  available: boolean;
  /** Why it is unavailable, straight from the capability probe. */
  reason?: string;
  /** Needs an explicit confirmation step before it runs. */
  confirm: boolean;
  /** Needs text input (a follow-up message). */
  input: boolean;
};

const ORDER: Record<NativeProvider, readonly CloudRecordAction[]> = {
  claude: ["message", "status", "teleport"],
  codex: ["status", "diff", "apply", "message"],
};

const LABEL: Record<CloudRecordAction, string> = {
  message: "Send follow-up",
  status: "Check status",
  diff: "Show diff",
  apply: "Apply changes",
  teleport: "Continue locally (teleport)",
};

/** Only actions this provider has, each marked supported or explained. */
export function cloudActionEntries(
  provider: NativeProvider,
  capabilities: CloudCapabilities,
): CloudActionEntry[] {
  return ORDER[provider].map((action) => {
    const capability = capabilities[action];
    return {
      action,
      label: LABEL[action],
      available: capability.available,
      ...(capability.available
        ? {}
        : { reason: capability.reason ?? "This action is not available." }),
      confirm: action === "apply",
      input: action === "message",
    };
  });
}

/** Re-save a record after a retention failure. Never launches anything. */
export function retryCloudRetention(session: CloudSession): Promise<CloudSession> {
  return invoke<CloudSession>("provider_cloud_save", { session });
}

export function cloudRecordKey(
  record: Pick<CloudSession, "provider" | "providerAccountId" | "id">,
): string {
  return JSON.stringify([record.provider, record.providerAccountId, record.id]);
}

/** Merge records from several accounts, newest first, one per identity. */
export function mergeCloudRecords(
  ...groups: readonly (readonly CloudSession[])[]
): CloudSession[] {
  const byKey = new Map<string, CloudSession>();
  for (const group of groups)
    for (const record of group) byKey.set(cloudRecordKey(record), record);
  return [...byKey.values()].sort(
    (left, right) => right.createdAt - left.createdAt,
  );
}
