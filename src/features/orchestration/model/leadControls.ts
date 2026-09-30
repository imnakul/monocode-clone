import type { OrchestrationRun } from "./orchestrationState";

export const STOP_LEAD_RESPONSE_LABEL = "Stop lead response";
export const RESUME_AND_SEND_LABEL = "Resume and send";
export const CANCEL_ORCHESTRATION_LABEL = "Cancel orchestration";
export const CANCEL_ORCHESTRATION_CONFIRMATION =
  "Cancel this orchestration? Running workers will stop. Unintegrated changes will remain in their worktrees.";

/**
 * How the composer of a session must present Stop and Send. A lead's Stop only
 * ends its current response, so it never shares the plain "Stop" label with
 * actions that end a whole session.
 */
export function leadComposerLabels(
  run: Pick<OrchestrationRun, "leadId" | "status"> | undefined,
  sessionId: string,
): { stopLabel?: string; sendLabel?: string } {
  if (!run || run.leadId !== sessionId) return {};
  if (run.status === "active") return { stopLabel: STOP_LEAD_RESPONSE_LABEL };
  if (run.status === "paused")
    return {
      stopLabel: STOP_LEAD_RESPONSE_LABEL,
      sendLabel: RESUME_AND_SEND_LABEL,
    };
  return {};
}
