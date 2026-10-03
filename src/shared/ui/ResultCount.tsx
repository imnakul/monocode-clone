/**
 * Header count: the total, or "shown of total" while filters narrow the list.
 * Announced politely so screen readers hear filter results as they change.
 */
export function ResultCount({
  shown,
  total,
  filtered,
  noun,
}: {
  shown: number;
  total: number;
  filtered: boolean;
  /** Plural noun for the spoken label, e.g. "tasks". */
  noun: string;
}) {
  const narrowed = filtered && shown !== total;
  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={
        narrowed ? `${shown} of ${total} ${noun} shown` : `${total} ${noun}`
      }
      className="shrink-0 rounded-md bg-content/8 px-1.5 py-0.5 text-[11px] leading-none tabular-nums text-content/55"
    >
      {narrowed ? (
        <>
          <span className="text-content/80">{shown}</span>
          <span className="text-content/40"> of </span>
          {total}
        </>
      ) : (
        total
      )}
    </span>
  );
}
