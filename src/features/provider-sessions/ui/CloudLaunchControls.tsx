import { type ReactElement, type ReactNode } from "react";
import { Cloud } from "../../../shared/ui/icons";
import { PROVIDER_LABEL } from "../model/conversationSummary";
import type { NativeProvider } from "../model/providerSessions";
import type { Attachment } from "../../sessions/model/session";

export type Execution = "local" | "cloud";

/** What the session composer needs to offer Local | Cloud and launch once. */
export type ComposerCloudLaunch = {
  active: boolean;
  canLaunch: boolean;
  disabledReason?: string;
  /** Choose Cloud (true) or Local (false); offered as "Cloud session" in the + menu. */
  setActive: (active: boolean) => void;
  /** Fields, notes and errors shown above the box while Cloud is chosen. */
  panel: ReactNode;
  /** Resolves true when the task was started; false keeps the draft untouched. */
  launch: (
    prompt: string,
    attachments: readonly Attachment[],
    conflictingMode: boolean,
  ) => Promise<boolean>;
  resetToLocal: () => void;
};

const fieldClass =
  "h-7 min-w-0 rounded-md border border-content/10 bg-content/5 px-2 text-[12px] text-content outline-none placeholder:text-content/35 focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-60";

export function CloudLaunchPanel({
  provider,
  environmentId,
  branch,
  pending,
  error,
  onEnvironmentChange,
  onBranchChange,
}: {
  provider: NativeProvider;
  environmentId: string;
  branch: string;
  pending: boolean;
  error: string | null;
  onEnvironmentChange: (value: string) => void;
  onBranchChange: (value: string) => void;
}): ReactElement {
  const label = PROVIDER_LABEL[provider];
  const codex = provider === "codex";
  return (
    <div
      data-cloud-launch-panel
      className="mx-3 mb-1.5 flex flex-col gap-1.5 rounded-lg border border-content/10 bg-content/5 px-3 py-2 text-[12px] text-content/70"
    >
      <p className="flex items-start gap-1.5 leading-snug">
        <Cloud aria-hidden className="mt-0.5 size-3.5 shrink-0 text-content/55" />
        <span>
          Your prompt starts a {label} cloud task from this project. It runs on{" "}
          {label}&apos;s servers, so the model, permission mode, MCP setup and
          unsaved files you chose here are not carried over. Nothing opens
          automatically; continue it from {label} or from here.
        </span>
      </p>
      {codex ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0">Environment ID</span>
            <input
              value={environmentId}
              disabled={pending}
              onChange={(event) => onEnvironmentChange(event.target.value)}
              placeholder="Required"
              spellCheck={false}
              autoComplete="off"
              aria-required="true"
              className={`${fieldClass} w-44`}
            />
          </label>
          <label className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0">Branch</span>
            <input
              value={branch}
              disabled={pending}
              onChange={(event) => onBranchChange(event.target.value)}
              placeholder="Optional"
              spellCheck={false}
              autoComplete="off"
              className={`${fieldClass} w-36`}
            />
          </label>
        </div>
      ) : (
        <p className="text-content/55">
          Claude uses the cloud environment configured in its CLI; choosing an
          environment or branch is not supported here.
        </p>
      )}
      <div role="status" aria-live="polite" className="sr-only">
        {pending ? "Starting cloud task" : ""}
      </div>
      {pending ? (
        <p className="text-content/60">Starting the cloud task…</p>
      ) : null}
      {error ? (
        <p role="alert" className="whitespace-pre-wrap break-words text-red-400/90">
          {error}
        </p>
      ) : null}
    </div>
  );
}
