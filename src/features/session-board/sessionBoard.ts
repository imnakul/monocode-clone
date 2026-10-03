import { invoke } from "@tauri-apps/api/core";
import {
  hasPendingApproval,
  type Session,
} from "../sessions/model/session";

/**
 * Stored run status. These values are the durable ledger and Operator's
 * `session_manager` contract; the board groups them into fewer lanes.
 */
export type BoardStatus =
  | "todo"
  | "in_progress"
  | "needs_attention"
  | "blocked"
  | "done"
  | "stopped";
export const BOARD_STATUSES: readonly BoardStatus[] = [
  "todo",
  "in_progress",
  "needs_attention",
  "blocked",
  "done",
  "stopped",
];
export function isBoardStatus(value: string): value is BoardStatus {
  return BOARD_STATUSES.some((status) => status === value);
}

/** Session Manager columns. Each stored status folds into exactly one. */
export const BOARD_LANES = {
  draft: "Draft",
  in_progress: "In progress",
  needs_attention: "Needs attention",
  done: "Done",
} as const;
export type BoardLane = keyof typeof BOARD_LANES;

const WAITING_PERMISSION_REASON = "Waiting for your permission";
const WAITING_ANSWER_REASON = "Waiting for your answer";
const USAGE_LIMIT_REASON = "The provider reached its usage limit";
const QUEUE_REVIEW_REASON = "The queue needs review";
const QUEUED_REASON = "Messages are queued";
const INTERRUPTED_REASON = "Previous run was interrupted; review the session";
const LEGACY_REASON = "Earlier run has no recorded result; review the session";

/**
 * Column a card shows in: blocked runs need you like any other attention
 * case, a run you stopped is finished, and queued messages are about to run.
 */
export function boardLane(card: BoardCard): BoardLane {
  switch (card.status) {
    case "todo":
      return card.reason === QUEUED_REASON ? "in_progress" : "draft";
    case "in_progress":
      return "in_progress";
    case "needs_attention":
    case "blocked":
      return "needs_attention";
    case "done":
    case "stopped":
      return "done";
  }
}

export type BoardTagTone = "draft" | "working" | "attention" | "done" | "muted";

/** Short state label for a card, e.g. "Permission" or "Usage limit". */
export function boardCardTag(card: BoardCard): {
  label: string;
  tone: BoardTagTone;
} {
  switch (card.status) {
    case "todo":
      return card.reason === QUEUED_REASON
        ? { label: "Queued", tone: "working" }
        : { label: "Draft", tone: "draft" };
    case "in_progress":
      return { label: "Working…", tone: "working" };
    case "needs_attention":
      return {
        label:
          card.reason === WAITING_PERMISSION_REASON ? "Permission" : "Question",
        tone: "attention",
      };
    case "blocked":
      return { label: blockedTagLabel(card.reason), tone: "attention" };
    case "done":
      return { label: "Done", tone: "done" };
    case "stopped":
      return { label: "Stopped", tone: "muted" };
  }
}

function blockedTagLabel(reason: string | undefined): string {
  switch (reason) {
    case USAGE_LIMIT_REASON:
      return "Usage limit";
    case "Steering was interrupted; review queued messages":
    case QUEUE_REVIEW_REASON:
      return "Queue held";
    case INTERRUPTED_REASON:
      return "Interrupted";
    case LEGACY_REASON:
      return "Review";
    default:
      return "Failed";
  }
}
export type BoardCard = {
  sessionId: string;
  runId: string;
  title: string;
  cwd: string;
  harness: string;
  model: string;
  status: BoardStatus;
  reason?: string;
  branch?: string;
  queuedCount: number;
  updatedAt: number;
  hiddenRunId?: string;
};
function cleanBoardText(value: string, limit: number): string {
  return [
    ...value
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ""),
  ]
    .slice(0, limit)
    .join("");
}
export function boardRunId(session: Session): string | undefined {
  const running =
    session.busy ||
    session.worktreePreparing ||
    session.backgroundTasks?.length;
  // Walk backwards in place: copying long transcripts on every observation
  // pass kept the main thread busy while sessions loaded or streamed.
  let latestUser: (typeof session.blocks)[number] | undefined;
  for (let index = session.blocks.length - 1; index >= 0; index--) {
    const block = session.blocks[index];
    if (block.role !== "user") continue;
    latestUser ??= block;
    if (!running) break;
    if (!block.draft) {
      latestUser = block;
      break;
    }
  }
  const user = latestUser;
  return user ? (user.draft ? `draft:${user.id}` : user.id) : undefined;
}
/** Durable terminal state is independent of whether the session has been viewed. */
export function projectBoardCard(
  session: Session,
  previous?: BoardCard,
  now = Date.now(),
  recordedOutcome = false,
): BoardCard | null {
  const runId = boardRunId(session);
  if (!runId || session.inboxAsk) return null;
  let userIndex = -1;
  for (let index = session.blocks.length - 1; index >= 0; index--) {
    if (session.blocks[index].role === "user" && !session.blocks[index].draft) {
      userIndex = index;
      break;
    }
  }
  const user = session.blocks[userIndex];
  const turnModel = user?.turnModel;
  const sameRun = previous?.runId === runId;
  let status: BoardStatus = sameRun ? previous.status : "todo";
  let reason: string | undefined = sameRun ? previous.reason : undefined;
  let error: (typeof session.blocks)[number] | undefined;
  for (let index = session.blocks.length - 1; index > userIndex; index--) {
    if (session.blocks[index].notice === "error") {
      error = session.blocks[index];
      break;
    }
  }
  if (
    sameRun &&
    previous.status === "stopped" &&
    !session.busy &&
    !session.worktreePreparing &&
    !session.backgroundTasks?.length &&
    !session.blocks.some((block) => block.draft)
  ) {
    status = "stopped";
  } else if (
    hasPendingApproval(session.blocks) ||
    session.pendingQuestion
  ) {
    status = "needs_attention";
    reason = hasPendingApproval(session.blocks)
      ? WAITING_PERMISSION_REASON
      : WAITING_ANSWER_REASON;
  } else if (
    session.usageLimit ||
    (session.queueStatus === "paused" && Boolean(session.queuedMessages?.length)) ||
    error
  ) {
    status = "blocked";
    reason =
        (session.usageLimit ? USAGE_LIMIT_REASON : undefined) ||
      error?.text ||
      QUEUE_REVIEW_REASON;
  } else if (
    session.busy ||
    session.worktreePreparing ||
    session.backgroundTasks?.length
  ) {
    status = "in_progress";
    reason = session.backgroundTasks?.length
      ? "Background work is running"
      : undefined;
  } else if (
    session.queuedMessages?.length &&
    session.queueStatus !== "paused"
  ) {
    status = "todo";
    reason = QUEUED_REASON;
  } else if (
    session.blocks.some((block) => block.role === "user" && block.draft)
  ) {
    status = "todo";
    reason = "Draft ready to send";
  } else if (sameRun && previous.status === "in_progress") {
    status = "blocked";
    reason = INTERRUPTED_REASON;
  } else if (
    !recordedOutcome &&
    (!sameRun ||
      (previous.status === "blocked" &&
        previous.reason === LEGACY_REASON))
  ) {
    // Idle history without an observed outcome is not evidence of a failed run.
    return null;
  }

  const next: BoardCard = {
    sessionId: session.id,
    runId,
    title: [...(session.title.trim().replace(/\s+/g, " ") || "New session")]
      .slice(0, 200)
      .join(""),
    cwd: session.cwd,
    harness: turnModel?.harness ?? session.harness,
    model:
      cleanBoardText(
        turnModel?.name || turnModel?.id || session.model || "Unknown model",
        128,
      ) || "Unknown model",
    status,
    reason: reason ? cleanBoardText(reason, 2000) : undefined,
    branch: session.branch ? cleanBoardText(session.branch, 128) : undefined,
    queuedCount: session.queuedMessages?.length ?? 0,
    updatedAt: previous?.updatedAt ?? now,
    hiddenRunId: previous?.hiddenRunId,
  };
  if (
    !previous ||
    JSON.stringify({ ...next, updatedAt: 0 }) !==
      JSON.stringify({ ...previous, updatedAt: 0 })
  )
    next.updatedAt = now;
  return next;
}
export function visibleBoardCards(cards: readonly BoardCard[]): BoardCard[] {
  return cards
    .filter((card) => card.hiddenRunId !== card.runId)
    .sort(
      (a, b) =>
        b.updatedAt - a.updatedAt || a.sessionId.localeCompare(b.sessionId),
    );
}

// One ledger for App lifecycle capture and the board UI; serialize snapshots/hides.
let cards: BoardCard[] = [];
let ready = false;
let error: string | null = null;
let hydration: Promise<void> | undefined;
let observationVersion = 0;
let pending: Promise<unknown> = Promise.resolve();
const listeners = new Set<() => void>();
function publish() {
  for (const listener of listeners) listener();
}
export function boardSnapshot() {
  return { cards, ready, error };
}
export function subscribeBoard(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
async function hydrateBoard(): Promise<void> {
  if (hydration) return hydration;
  hydration = (async () => {
    try {
      const stored = await invoke<BoardCard[]>("session_board_list");
      if (!ready) {
        for (let index = 0; index < stored.length; index++) {
          if (stored[index].status === "in_progress")
            stored[index] = await invoke<BoardCard>("session_board_upsert", {
              card: {
                ...stored[index],
                status: "blocked",
                reason: INTERRUPTED_REASON,
                updatedAt: Date.now(),
              },
            });
        }
      }
      cards = stored;
      ready = true;
      error = null;
    } catch (failure) {
      error = String(failure);
    } finally {
      hydration = undefined;
      publish();
    }
  })();
  return hydration;
}
export function loadBoard(): Promise<void> {
  const next = pending.catch(() => {}).then(() => hydrateBoard());
  pending = next;
  return next;
}
function enqueue(operation: () => Promise<void>): Promise<void> {
  const next = pending
    .catch(() => {})
    .then(async () => {
      if (!ready) await hydrateBoard();
      if (!ready) throw new Error(error ?? "Board storage is unavailable");
      await operation();
      error = null;
      publish();
    })
    .catch((failure) => {
      error = String(failure);
      publish();
      throw failure;
    });
  pending = next;
  return next;
}
async function store(card: BoardCard) {
  const saved = await invoke<BoardCard>("session_board_upsert", { card });
  cards = [...cards.filter((row) => row.sessionId !== saved.sessionId), saved];
}
/**
 * Inputs a session was last projected from. A session is skipped while the
 * object, its blocks array and length, and its stored card are all unchanged:
 * the projection would return that same card, so there is nothing to store.
 * State updates replace only the sessions that changed, so a pass touches a
 * few sessions instead of re-reading every transcript every 150ms.
 */
type ObservedInput = {
  session: Session;
  blocks: Session["blocks"];
  length: number;
  previous: BoardCard | undefined;
};
const observed = new Map<string, ObservedInput>();

export function observeBoardSessions(
  sessions: readonly Session[],
): Promise<void> {
  const version = ++observationVersion;
  return enqueue(async () => {
    if (version !== observationVersion) return;
    const byId = new Map(cards.map((card) => [card.sessionId, card]));
    for (const session of sessions) {
      const previous = byId.get(session.id);
      const last = observed.get(session.id);
      if (
        last &&
        last.session === session &&
        last.blocks === session.blocks &&
        last.length === session.blocks.length &&
        last.previous === previous
      )
        continue;
      const next = projectBoardCard(session, previous);
      if (next && JSON.stringify(next) !== JSON.stringify(previous))
        await store(next);
      // Key on the card now stored, so the next pass can skip this session.
      observed.set(session.id, {
        session,
        blocks: session.blocks,
        length: session.blocks.length,
        previous: cards.find((card) => card.sessionId === session.id),
      });
    }
    // Forget sessions that were closed or deleted so the cache cannot grow.
    if (observed.size > sessions.length) {
      const live = new Set(sessions.map((session) => session.id));
      for (const id of observed.keys()) if (!live.has(id)) observed.delete(id);
    }
  });
}
export function recordBoardOutcome(
  session: Session,
  status: "done" | "blocked" | "stopped",
  reason?: string,
): Promise<void> {
  ++observationVersion;
  return enqueue(async () => {
    const previous = cards.find((card) => card.sessionId === session.id);
    const next = projectBoardCard(session, previous, Date.now(), true);
    if (next)
      await store({
        ...next,
        status,
        reason: reason ? cleanBoardText(reason, 2000) : undefined,
        updatedAt: Date.now(),
      });
  });
}
export function hideBoardCards(
  rows: readonly BoardCard[],
  hidden = true,
): Promise<void> {
  return enqueue(async () => {
    for (let offset = 0; offset < rows.length; offset += 1000) {
      cards = await invoke<BoardCard[]>("session_board_hide", {
        cards: rows
          .slice(offset, offset + 1000)
          .map(({ sessionId, runId }) => ({ sessionId, runId })),
        hidden,
      });
    }
  });
}
