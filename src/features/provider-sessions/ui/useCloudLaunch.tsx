import { createElement, useMemo, useRef, useState } from "react";
import type { Attachment, HarnessId } from "../../sessions/model/session";
import { selectedProviderAccountId } from "../../providers/model/providerAccounts";
import {
  createCloudLauncher,
  type CloudLaunchResult,
} from "../model/cloudLaunchModel";
import {
  isCloudSessionRecord,
  type CloudSession,
} from "../model/cloudSessions";
import type { NativeProvider } from "../model/providerSessions";
import {
  CloudLaunchPanel,
  type ComposerCloudLaunch,
  type Execution,
} from "./CloudLaunchControls";

export type CloudLaunchOutcome =
  | { kind: "launched"; record: CloudSession }
  | { kind: "unsaved"; record: CloudSession; message: string };

/** Cross-window delivery for cloud launches made from the floating composer. */
export const CLOUD_LAUNCH_OUTCOME_EVENT = "provider-cloud-launch-outcome";

/** Validate the webview event before it reaches App's retained-record state. */
export function isCloudLaunchOutcome(value: unknown): value is CloudLaunchOutcome {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { kind?: unknown; record?: unknown; message?: unknown };
  if (candidate.kind !== "launched" && candidate.kind !== "unsaved") return false;
  if (candidate.kind === "unsaved" && typeof candidate.message !== "string")
    return false;
  return (
    isCloudSessionRecord(candidate.record) &&
    (candidate.kind === "launched" || typeof candidate.message === "string")
  );
}

const ENV_KEY = (provider: NativeProvider): string =>
  `monocode.cloudEnvironment.${provider}`;

function loadEnvironment(provider: NativeProvider): string {
  try {
    return localStorage.getItem(ENV_KEY(provider)) ?? "";
  } catch {
    return "";
  }
}
function saveEnvironment(provider: NativeProvider, value: string): void {
  try {
    localStorage.setItem(ENV_KEY(provider), value);
  } catch {
    // A remembered environment is a convenience only.
  }
}

/** Cloud execution applies to a new, local, project-backed Claude/Codex session. */
export function cloudLaunchEligible(session: {
  harness: HarnessId;
  cwd: string;
  blocksCount: number;
  inboxAsk?: boolean;
  remote: boolean;
  /** Existing native conversations can also have no local user blocks. */
  nativeResume?: boolean;
  /** Local workspace choices such as a worktree are not cloud launch inputs. */
}): boolean {
  return (
    (session.harness === "claude" || session.harness === "codex") &&
    session.blocksCount === 0 &&
    !session.inboxAsk &&
    !session.remote &&
    !session.nativeResume &&
    session.cwd.trim() !== "" &&
    session.cwd !== "~"
  );
}

/**
 * Local | Cloud choice for a new session. Cloud goes through the cloud launch
 * API exactly once per Send and never through the local send path.
 */
export function useCloudLaunch(input: {
  harness: HarnessId;
  cwd: string;
  providerAccountId?: string;
  blocksCount: number;
  inboxAsk?: boolean;
  remote: boolean;
  nativeResume?: boolean;
  disabledReason?: string;
  onOutcome: (outcome: CloudLaunchOutcome) => void | Promise<void>;
}): ComposerCloudLaunch | undefined {
  const {
    harness,
    cwd,
    providerAccountId,
    blocksCount,
    inboxAsk,
    remote,
    nativeResume,
    disabledReason,
    onOutcome,
  } = input;
  const eligible = cloudLaunchEligible({
    harness,
    cwd,
    blocksCount,
    inboxAsk,
    remote,
    nativeResume,
  });
  const provider: NativeProvider = harness === "codex" ? "codex" : "claude";
  const [execution, setExecution] = useState<Execution>("local");
  const [environments, setEnvironments] = useState<Record<string, string>>({});
  const [branch, setBranch] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const launcher = useRef(createCloudLauncher());
  const environmentId = environments[provider] ?? loadEnvironment(provider);
  const active = eligible && execution === "cloud";

  return useMemo(() => {
    if (!eligible) return undefined;
    const launch: ComposerCloudLaunch["launch"] = async (
      prompt,
      attachments: readonly Attachment[],
      conflictingMode,
    ) => {
      setError(null);
      if (disabledReason) {
        setError(disabledReason);
        return false;
      }
      setPending(true);
      let result: CloudLaunchResult;
      try {
        result = await launcher.current({
          provider,
          prompt,
          cwd,
          accountId: providerAccountId ?? selectedProviderAccountId(provider, cwd),
          environmentId,
          branch,
          attachments,
          conflictingMode,
        });
      } finally {
        setPending(false);
      }
      if (result.status === "rejected" || result.status === "failed") {
        setError(result.message);
        return false;
      }
      if (provider === "codex") saveEnvironment(provider, environmentId.trim());
      setExecution("local");
      await onOutcome(
        result.status === "unsaved"
          ? { kind: "unsaved", record: result.record, message: result.message }
          : { kind: "launched", record: result.record },
      );
      return true;
    };
    return {
      active,
      canLaunch: active && !pending && !disabledReason,
      ...(disabledReason ? { disabledReason } : {}),
      resetToLocal: () => setExecution("local"),
      launch,
      setActive: (next: boolean): void => {
        if (pending) return;
        setError(null);
        setExecution(next ? "cloud" : "local");
      },
      panel: active
        ? createElement(CloudLaunchPanel, {
            provider,
            environmentId,
            branch,
            pending,
            error: error ?? disabledReason ?? null,
            onEnvironmentChange: (value: string) =>
              setEnvironments((current) => ({ ...current, [provider]: value })),
            onBranchChange: setBranch,
          })
        : null,
    };
  }, [
    eligible,
    active,
    execution,
    pending,
    error,
    provider,
    cwd,
    providerAccountId,
    environmentId,
    branch,
    disabledReason,
    onOutcome,
  ]);
}
