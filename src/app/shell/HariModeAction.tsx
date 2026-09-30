import { Sparkles } from "../../shared/ui/icons";

export function HariModeAction({
  compact = false,
  active,
  onClick,
}: {
  compact?: boolean;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={active ? "Hari, return to projects" : "Hari"}
      aria-pressed={active}
      title={active ? "Return to projects" : "Hari"}
      data-shared-hover-item
      data-shared-hover-preserve={active ? "" : undefined}
      onClick={onClick}
      className={
        compact
          ? `relative grid size-8 shrink-0 place-items-center rounded-md active:scale-[0.97] ${
              active
                ? "bg-selection text-content"
                : "text-content/50 hover:bg-content/10 hover:text-content"
            }`
          : `relative flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-medium ${
              active
                ? "bg-selection text-content"
                : "text-content/50 hover:bg-content/10 hover:text-content"
            }`
      }
    >
      <Sparkles
        className={compact ? "size-4" : "size-4 shrink-0 opacity-70"}
        strokeWidth={1.75}
      />
      {compact ? <span className="sr-only">Hari</span> : <span>Hari</span>}
    </button>
  );
}
