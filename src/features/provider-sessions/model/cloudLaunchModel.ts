import type { Attachment } from "../../sessions/model/session";
import {
  CloudRetentionError,
  launchProviderCloudSession,
  type CloudLaunchInput,
  type CloudSession,
} from "./cloudSessions";
import { PROVIDER_LABEL } from "./conversationSummary";
import type { NativeProvider } from "./providerSessions";

export type CloudLaunchRequest = {
  provider: NativeProvider;
  prompt: string;
  cwd: string;
  accountId: string;
  environmentId: string;
  branch: string;
  attachments: readonly Attachment[];
  /** Plan, Draft, Orchestrator or Operator is switched on in the composer. */
  conflictingMode: boolean;
};

export type CloudLaunchResult =
  | { status: "launched"; record: CloudSession }
  /** The task exists at the provider but MonoCode could not save its record. */
  | { status: "unsaved"; record: CloudSession; message: string }
  | { status: "rejected"; message: string }
  | { status: "failed"; message: string };

/** Checks that need no process; a rejection never reaches the provider. */
export function validateCloudLaunch(request: CloudLaunchRequest): string | null {
  const label = PROVIDER_LABEL[request.provider];
  if (!request.prompt.trim()) return "Write what the cloud task should do.";
  if (request.attachments.length > 0)
    return "Cloud tasks take text only. Remove the attachments or switch to Local.";
  if (request.conflictingMode)
    return "Cloud tasks start right away. Turn off Plan, Draft, Orchestrator and Operator first, or switch to Local.";
  if (request.provider === "codex") {
    const environment = request.environmentId.trim();
    if (!environment)
      return "Enter your Codex cloud environment ID. Codex needs one to start a cloud task.";
    if (environment.startsWith("-")) return "That environment ID is not valid.";
    if (request.branch.trim().startsWith("-"))
      return "That branch name is not valid.";
  }
  if (!request.cwd.trim() || request.cwd === "~")
    return `Pick a project folder first; ${label} cloud tasks start from it.`;
  return null;
}

/** A failed launch may still have created a task; say so instead of implying it did not. */
export function describeCloudLaunchFailure(
  provider: NativeProvider,
  error: unknown,
): string {
  const label = PROVIDER_LABEL[provider];
  const detail = error instanceof Error ? error.message : String(error);
  return `${label} cloud launch failed: ${detail} If the command timed out or was interrupted, check ${label} before trying again; a task may already have started.`;
}

/**
 * Launch exactly once per call. A second call while one is running is
 * rejected, and nothing here ever retries a launch: a storage failure after the
 * task exists comes back as `unsaved` carrying the real ID.
 */
export function createCloudLauncher(
  launch: (input: CloudLaunchInput) => Promise<CloudSession> = launchProviderCloudSession,
): (request: CloudLaunchRequest) => Promise<CloudLaunchResult> {
  let inFlight = false;
  return async (request) => {
    if (inFlight)
      return {
        status: "rejected",
        message: "A cloud launch is already in progress.",
      };
    const problem = validateCloudLaunch(request);
    if (problem) return { status: "rejected", message: problem };
    inFlight = true;
    try {
      const codex = request.provider === "codex";
      const record = await launch({
        provider: request.provider,
        prompt: request.prompt,
        cwd: request.cwd,
        accountId: request.accountId,
        ...(codex && request.environmentId.trim()
          ? { environmentId: request.environmentId.trim() }
          : {}),
        ...(codex && request.branch.trim()
          ? { branch: request.branch.trim() }
          : {}),
      });
      return { status: "launched", record };
    } catch (error) {
      if (error instanceof CloudRetentionError)
        return {
          status: "unsaved",
          record: error.session,
          message: error.message,
        };
      return {
        status: "failed",
        message: describeCloudLaunchFailure(request.provider, error),
      };
    } finally {
      inFlight = false;
    }
  };
}
