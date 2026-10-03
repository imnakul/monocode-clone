import { useSyncExternalStore } from "react";
import {
  boardLane,
  boardSnapshot,
  subscribeBoard,
  visibleBoardCards,
  type BoardCard,
} from "./sessionBoard";

/** Visible Session Manager cards per live column, for the sidebar entry. */
export type BoardCounts = {
  inProgress: number;
  needsAttention: number;
  done: number;
};

const EMPTY: BoardCounts = { inProgress: 0, needsAttention: 0, done: 0 };
let cachedCards: readonly BoardCard[] | null = null;
let cachedCounts: BoardCounts = EMPTY;

/** Stable while the card list is unchanged, as useSyncExternalStore needs. */
function countsSnapshot(): BoardCounts {
  const { cards } = boardSnapshot();
  if (cards === cachedCards) return cachedCounts;
  const next = { inProgress: 0, needsAttention: 0, done: 0 };
  for (const card of visibleBoardCards(cards)) {
    const lane = boardLane(card);
    if (lane === "in_progress") next.inProgress += 1;
    else if (lane === "needs_attention") next.needsAttention += 1;
    else if (lane === "done") next.done += 1;
  }
  cachedCards = cards;
  cachedCounts =
    next.inProgress === cachedCounts.inProgress &&
    next.needsAttention === cachedCounts.needsAttention &&
    next.done === cachedCounts.done
      ? cachedCounts
      : next;
  return cachedCounts;
}

export function useBoardCounts(): BoardCounts {
  return useSyncExternalStore(subscribeBoard, countsSnapshot, () => EMPTY);
}

/** "2 in progress, 1 needs attention, 3 done", or "" when the board is empty. */
export function boardCountsLabel(counts: BoardCounts): string {
  return [
    counts.inProgress ? `${counts.inProgress} in progress` : "",
    counts.needsAttention ? `${counts.needsAttention} need attention` : "",
    counts.done ? `${counts.done} done` : "",
  ]
    .filter(Boolean)
    .join(", ");
}
