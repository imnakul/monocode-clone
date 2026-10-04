import { createElement, useMemo, useRef, useState } from "react";
import type { Attachment, HarnessId } from "../../sessions/model/session";
import { selectedProviderAccountId } from "../../providers/model/providerAccounts";
import {
  createCloudLauncher,
  type CloudLaunchResult,
} from "../model/cloudLaunchModel";
import type { CloudSession } from "../model/cloudSessions";
import type { NativeProvider } from "../model/providerSessions";
import {
  CloudExecutionSwitch,
  CloudLaunchPanel,
  type ComposerCloudLaunch,
  type Execution,
} from "./CloudLaunchControls";

export type CloudLaunchOutcome =
  | { kind: "launched"; record: CloudSession }
  | { kind: "unsaved"; record: CloudSession; message: string };

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
}): boolean {
  return (
    (session.harness === "claude" || session.harness === "codex") &&
    session.blocksCount === 0 &&
    !session.inboxAsk &&
    !session.remote &&
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
  onOutcome: (outcome: CloudLaunchOutcome) => void;
}): ComposerCloudLaunch | undefined {
  const { harness, cwd, providerAccountId, blocksCount, inboxAsk, remote, onOutcome } =
    input;
  const eligible = cloudLaunchEligible({
    harness,
    cwd,
    blocksCount,
    inboxAsk,
    remote,
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
      onOutcome(
        result.status === "unsaved"
          ? { kind: "unsaved", record: result.record, message: result.message }
          : { kind: "launched", record: result.record },
      );
      return true;
    };
    return {
      active,
      launch,
      control: createElement(CloudExecutionSwitch, {
        value: execution,
        disabled: pending,
        onChange: (value: Execution) => {
          setError(null);
          setExecution(value);
        },
      }),
      panel: active
        ? createElement(CloudLaunchPanel, {
            provider,
            environmentId,
            branch,
            pending,
            error,
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
    onOutcome,
  ]);
}
