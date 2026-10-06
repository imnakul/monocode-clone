type Props = {
  additions: number;
  deletions: number;
  title?: string;
  className?: string;
  compact?: boolean;
};

export function DiffStat({
  additions,
  deletions,
  title,
  className = "",
  compact = false,
}: Props) {
  if (additions <= 0 && deletions <= 0) return null;

  return (
    <span
      title={title}
      className={`inline-flex shrink-0 items-baseline ${compact ? "gap-1" : "gap-1.5"} font-mono text-[11px] font-semibold leading-none tabular-nums ${className}`}
    >
      {additions > 0 ? (
        <span className="leading-none text-diff-add-fg">+{additions}</span>
      ) : null}
      {deletions > 0 ? (
        <span className="leading-none text-diff-del-fg">−{deletions}</span>
      ) : null}
    </span>
  );
}
