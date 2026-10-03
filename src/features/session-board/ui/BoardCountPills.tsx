import type { ReactNode } from "react";
import { boardCountsLabel, type BoardCounts } from "../useBoardCounts";

const PILLS: {
  key: keyof BoardCounts;
  label: string;
  className: string;
}[] = [
  {
    key: "inProgress",
    label: "In progress",
    className: "bg-accent/18 text-accent",
  },
  {
    key: "needsAttention",
    label: "Needs attention",
    className: "bg-amber-400/15 text-amber-300",
  },
  {
    key: "done",
    label: "Done",
    className: "bg-emerald-400/12 text-emerald-300",
  },
];

/**
 * Compact per-column counts for the Session Manager sidebar entry. Zero
 * counts are omitted so a quiet board shows nothing. Visual only: the entry's
 * accessible name carries the same numbers.
 */
export function BoardCountPills({
  counts,
}: {
  counts: BoardCounts;
}): ReactNode {
  const shown = PILLS.filter((pill) => counts[pill.key] > 0);
  if (!shown.length) return null;
  return (
    <span
      aria-hidden
      title={boardCountsLabel(counts)}
      className="flex shrink-0 items-center gap-1"
    >
      {shown.map((pill) => (
        <span
          key={pill.key}
          data-board-count={pill.key}
          className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-semibold leading-none tabular-nums ${pill.className}`}
        >
          {counts[pill.key] > 99 ? "99+" : counts[pill.key]}
        </span>
      ))}
    </span>
  );
}
