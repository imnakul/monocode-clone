import { isProviderFailureText } from "./plan";
import { isPreparingHandoff } from "./handoff";
import { promoteLastAssistantToPlan, stopStreaming } from "./harness/apply";
import type { PlanStatus, QueuedMessage, Session, TurnIntent } from "./session";

const QUEUED_STEER_CANCEL_GRACE_MS = 15_000;

export function queuedHead(session: Session): QueuedMessage | undefined {
  return session.queuedMessages?.[0];
}

/** Hold auto-dispatch only while the item about to send is being edited. */
export function isEditingQueuedHead(session: Session): boolean {
  const head = queuedHead(session);
  return Boolean(head && session.editingQueuedMessageId === head.id);
}

export function dequeueQueuedMessage(
  session: Session,
  messageId: string,
): Session {
  const queuedMessages = (session.queuedMessages ?? []).filter(
    (message) => message.id !== messageId,
  );
  return {
    ...session,
    queuedMessages: queuedMessages.length > 0 ? queuedMessages : undefined,
    queueStatus: queuedMessages.length > 0 ? session.queueStatus : undefined,
    editingQueuedMessageId:
      session.editingQueuedMessageId === messageId
        ? undefined
        : session.editingQueuedMessageId,
  };
}

/**
 * True when the idle session can send its queued head as a new turn.
 * Busy / paused / resuming / steering / held / preparing-handoff / editing-the-head all wait.
 */
export function canDispatchQueuedHead(session: Session): boolean {
  if (session.busy) return false;
  if (
    session.queueStatus === "paused" ||
    session.queueStatus === "resuming" ||
    session.queueStatus === "steering" ||
    // A failed turn holds the queue: auto-dispatch waits for the user.
    session.queueStatus === "held"
  ) {
    return false;
  }
  const head = queuedHead(session);
  if (!head) return false;
  if (isEditingQueuedHead(session)) return false;
  if (isPreparingHandoff(session)) return false;
  return true;
}

/** Resolve a queued row for auto-dispatch (head, idle) or an explicit Steer. */
export function queuedMessageForSubmit(
  session: Session,
  messageId: string,
  mode: "dispatch" | "steer",
): QueuedMessage | undefined {
  const message = session.queuedMessages?.find(
    (entry) => entry.id === messageId,
  );
  if (!message) return undefined;
  if (mode === "steer") return message;
  if (queuedHead(session)?.id !== messageId) return undefined;
  if (!canDispatchQueuedHead(session)) return undefined;
  return message;
}

/**
 * Stop visible progress and hold dispatch while a non-native Steer waits for
 * the provider's cancellation acknowledgement.
 */
export function beginQueuedSteerCancellation(
  session: Session,
  messageId: string,
): Session {
  const selected = session.queuedMessages?.find(
    (message) => message.id === messageId,
  );
  if (!selected) return session;
  const stopped = stopStreaming(session);
  return {
    ...stopped,
    // Keep the composer in its in-flight state until cancellation settles.
    busy: true,
    queuedMessages: [
      selected,
      ...(stopped.queuedMessages ?? []).filter(
        (message) => message.id !== messageId,
      ),
    ],
    queueStatus: "steering",
    editingQueuedMessageId: undefined,
  };
}

/** Release a cancelled Steer, or hold it for manual recovery on failure. */
export function finishQueuedSteerCancellation(
  session: Session,
  succeeded: boolean,
): Session {
  if (session.queueStatus !== "steering") return session;
  return {
    ...session,
    busy: false,
    queueStatus: succeeded ? "active" : "held",
  };
}

/** Wait for every provider cancellation and report whether all acknowledged. */
export async function settleQueuedSteerCancellations(
  cancellations: readonly Promise<void>[],
): Promise<boolean> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const settled = Promise.allSettled(cancellations).then((results) =>
    results.every((result) => result.status === "fulfilled"),
  );
  const timedOut = new Promise<false>((resolve) => {
    timeoutId = setTimeout(() => resolve(false), QUEUED_STEER_CANCEL_GRACE_MS);
  });

  try {
    return await Promise.race([settled, timedOut]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}


export function withPlanStatus(
  session: Session,
  blockId: string,
  status: PlanStatus,
): Session {
  return {
    ...session,
    blocks: session.blocks.map((block) =>
      block.id === blockId && block.role === "plan"
        ? {
            ...block,
            plan: { ...(block.plan ?? { status: "ready" }), status },
          }
        : block,
    ),
  };
}

export function lastAssistantTextInTurn(session: Session): string {
  for (let index = session.blocks.length - 1; index >= 0; index -= 1) {
    const block = session.blocks[index];
    if (block.role === "user") return "";
    if (block.role === "assistant" && block.text.trim()) return block.text;
  }
  return "";
}

/**
 * Pure turn finalizer. Stops streaming, updates plan/build state, and
 * transitions non-empty queues to "held" synchronously on provider failure.
 */
export function finalizeTurnSession(
  session: Session,
  params: {
    providerFailed: boolean;
    intent?: TurnIntent;
    approvedPlanId?: string;
    buildSucceeded?: boolean;
    nativePlanSeen?: boolean;
    planEventKey?: string;
  },
): Session {
  const stopped = stopStreaming(session);
  const finalized =
    params.intent === "plan" && !params.nativePlanSeen && !params.providerFailed
      ? promoteLastAssistantToPlan(stopped, params.planEventKey)
      : stopped;
  const built =
    params.approvedPlanId && params.intent === "build"
      ? withPlanStatus(
          finalized,
          params.approvedPlanId,
          params.buildSucceeded && !params.providerFailed ? "built" : "ready",
        )
      : finalized;
  if (params.providerFailed && built.queuedMessages?.length) {
    return { ...built, queueStatus: "held" };
  }
  return built;
}


export interface TurnCompletionParams {
  sessionId: string;
  getSessions: () => Session[];
  setSessions: (sessions: Session[]) => void;
  syncDockBadge?: (sessions: Session[]) => void;
  flushCheckpoint: (sessionId: string) => Promise<void>;
  providerFailureSeen: boolean;
  intent?: TurnIntent;
  approvedPlanId?: string;
  buildSucceeded: boolean;
  nativePlanSeen: boolean;
  planEventKey: string;
}

/**
 * Orchestrates turn completion with atomic queue status transitions.
 * If provider failed, synchronously transitions non-empty queue to "held"
 * before awaiting checkpoint flush, preventing auto-dispatch race conditions.
 * On success, preserves busy: true until checkpoint flush completes.
 */
export async function orchestrateTurnCompletion(
  params: TurnCompletionParams,
): Promise<void> {
  const current = params.getSessions().find((s) => s.id === params.sessionId);
  if (!current) return;

  const providerFailed =
    params.providerFailureSeen ||
    isProviderFailureText(lastAssistantTextInTurn(current));

  if (providerFailed) {
    const finalized = finalizeTurnSession(current, {
      providerFailed: true,
      intent: params.intent,
      approvedPlanId: params.approvedPlanId,
      buildSucceeded: false,
      nativePlanSeen: params.nativePlanSeen,
      planEventKey: params.planEventKey,
    });
    const nextSessions = params
      .getSessions()
      .map((s) => (s.id === params.sessionId ? finalized : s));
    params.setSessions(nextSessions);
    params.syncDockBadge?.(nextSessions);

    await params.flushCheckpoint(params.sessionId);
  } else {
    await params.flushCheckpoint(params.sessionId);

    const latest =
      params.getSessions().find((s) => s.id === params.sessionId) ?? current;
    const finalized = finalizeTurnSession(latest, {
      providerFailed: false,
      intent: params.intent,
      approvedPlanId: params.approvedPlanId,
      buildSucceeded: params.buildSucceeded,
      nativePlanSeen: params.nativePlanSeen,
      planEventKey: params.planEventKey,
    });
    const nextSessions = params
      .getSessions()
      .map((s) => (s.id === params.sessionId ? finalized : s));
    params.setSessions(nextSessions);
    params.syncDockBadge?.(nextSessions);
  }
}
