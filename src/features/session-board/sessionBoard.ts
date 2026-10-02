import { invoke } from "@tauri-apps/api/core";
import { hasPendingApproval, type Session } from "../sessions/model/session";

export const BOARD_COLUMNS = {
  todo: "Todo",
  in_progress: "Progress",
  needs_attention: "Needs attention",
  blocked: "Blocked",
  done: "Done",
  stopped: "Cancelled / Stopped",
} as const;
export type BoardStatus = keyof typeof BOARD_COLUMNS;
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
  const users = [...session.blocks]
    .reverse()
    .filter((block) => block.role === "user");
  const running =
    session.busy ||
    session.worktreePreparing ||
    session.backgroundTasks?.length;
  const user =
    (running ? users.find((block) => !block.draft) : undefined) ?? users[0];
  return user ? (user.draft ? `draft:${user.id}` : user.id) : undefined;
}
/** Durable terminal state is independent of whether the session has been viewed. */
export function projectBoardCard(
  session: Session,
  previous?: BoardCard,
  now = Date.now(),
): BoardCard | null {
  const runId = boardRunId(session);
  if (!runId || session.ephemeral || session.inboxAsk) return null;
  let userIndex = -1;
  for (let index = session.blocks.length - 1; index >= 0; index--) {
    if (session.blocks[index].role === "user" && !session.blocks[index].draft) {
      userIndex = index;
      break;
    }
  }
  const turn = session.blocks.slice(userIndex + 1);
  const user = session.blocks[userIndex];
  const turnModel = user?.turnModel;
  const sameRun = previous?.runId === runId;
  let status: BoardStatus = sameRun ? previous.status : "todo";
  let reason: string | undefined = sameRun ? previous.reason : undefined;
  const error = [...turn].reverse().find((block) => block.notice === "error");
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
    session.pendingQuestion ||
    session.pendingForm
  ) {
    status = "needs_attention";
    reason = "Waiting for your input";
  } else if (
    session.usageLimit ||
    session.queueHoldReason ||
    session.queueStatus === "held" ||
    error
  ) {
    status = "blocked";
    reason =
      session.queueHoldReason ||
      (session.usageLimit
        ? "The provider reached its usage limit"
        : undefined) ||
      error?.text ||
      "The queue needs review";
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
    reason = "Messages are queued";
  } else if (
    session.blocks.some((block) => block.role === "user" && block.draft)
  ) {
    status = "todo";
    reason = "Draft ready to send";
  } else if (sameRun && previous.status === "in_progress") {
    status = "blocked";
    reason = "Previous run was interrupted; review the session";
  } else if (!sameRun && !session.busy && user) {
    status = "blocked";
    reason = "Earlier run has no recorded result; review the session";
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
                reason: "Previous run was interrupted; review the session",
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
export function observeBoardSessions(
  sessions: readonly Session[],
): Promise<void> {
  const version = ++observationVersion;
  return enqueue(async () => {
    if (version !== observationVersion) return;
    for (const session of sessions) {
      const previous = cards.find((card) => card.sessionId === session.id);
      const next = projectBoardCard(session, previous);
      if (next && JSON.stringify(next) !== JSON.stringify(previous))
        await store(next);
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
    const next = projectBoardCard(session, previous);
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
