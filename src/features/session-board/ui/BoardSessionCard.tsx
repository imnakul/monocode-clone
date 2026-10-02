import type { MouseEvent, ReactNode } from "react";
import { projectName } from "../../../shared/lib/paths";
import {
  Check,
  CircleAlert,
  GitBranch,
  Pencil,
  Play,
  Square,
  X,
} from "../../../shared/ui/icons";
import { isHarnessId } from "../../sessions/model/models";
import { HarnessIcon } from "../../sessions/ui/HarnessIcon";
import { formatRelative } from "../../sessions/ui/SessionCard";
import { TerminalSpinner } from "../../sessions/ui/TerminalSpinner";
import {
  boardCardTag,
  type BoardCard,
  type BoardLane,
  type BoardTagTone,
} from "../sessionBoard";

const TAG_TONE: Record<BoardTagTone, string> = {
  draft: "text-content/50",
  working: "text-accent",
  attention: "text-amber-400",
  done: "text-emerald-400",
  muted: "text-content/50",
};

const iconAction =
  "relative inline-flex size-6 items-center justify-center rounded-md text-content/55 transition-colors duration-100 hover:bg-content/12 hover:text-content focus-visible:bg-content/12 focus-visible:text-content focus-visible:outline-none disabled:opacity-40";

/** Unsent Todo drafts can be started, edited or deleted from the board. */
export function isDraftTodo(card: BoardCard): boolean {
  return card.status === "todo" && card.runId.startsWith("draft:");
}

/**
 * One Session Manager card. Live lanes use three lines (title and time,
 * where it runs, model and state) plus an inset reason when a run needs you;
 * finished runs collapse to two lines. Hover or keyboard focus swaps the time
 * for the card's actions in the same slot, so nothing overlaps.
 */
export function BoardSessionCard({
  card,
  lane,
  now,
  preserveHover,
  busy,
  onOpen,
  onStart,
  onEdit,
  onDelete,
  onRemove,
}: {
  card: BoardCard;
  lane: BoardLane;
  now: number;
  /** Keep the gliding hover on the card whose session is open beside the board. */
  preserveHover: boolean;
  busy: boolean;
  onOpen: (altKey: boolean) => void;
  onStart?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRemove: () => void;
}): ReactNode {
  const draft = isDraftTodo(card);
  const finished = lane === "done";
  const tag = boardCardTag(card);
  const time = formatRelative(card.updatedAt, now);
  const project = projectName(card.cwd);
  const showReason = lane === "needs_attention" && Boolean(card.reason);
  const canDelete = draft && Boolean(onDelete);
  const actions: ReactNode[] = [];
  if (draft && onStart)
    actions.push(
      <button
        key="start"
        type="button"
        disabled={busy}
        aria-label={`Start ${card.title}`}
        title="Start"
        onClick={onStart}
        className={iconAction}
      >
        <Play aria-hidden className="size-3.5" strokeWidth={1.75} />
      </button>,
    );
  if (draft && onStart && onEdit)
    actions.push(
      <button
        key="edit"
        type="button"
        disabled={busy}
        aria-label={`Edit ${card.title}`}
        title="Edit"
        onClick={onEdit}
        className={iconAction}
      >
        <Pencil aria-hidden className="size-3.5" strokeWidth={1.75} />
      </button>,
    );
  actions.push(
    <button
      key="remove"
      type="button"
      disabled={busy}
      aria-label={
        canDelete ? `Delete Todo ${card.title}` : `Remove ${card.title} from board`
      }
      title={canDelete ? "Delete draft" : "Remove from board"}
      onClick={canDelete ? onDelete : onRemove}
      className={`${iconAction} hover:text-red-400`}
    >
      <X aria-hidden className="size-3.5" strokeWidth={1.75} />
    </button>,
  );

  // The whole card opens the session; its own buttons act alone.
  const openFromCard = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest("button"))
      return;
    onOpen(event.altKey);
  };

  return (
    <div
      data-board-card={card.sessionId}
      data-board-lane={lane}
      data-shared-hover-item
      data-shared-hover-preserve={preserveHover ? "" : undefined}
      onClick={openFromCard}
      className="surface-tint group/board-card relative mb-1.5 flex cursor-default flex-col gap-1 rounded-md px-2.5 py-2 transition-colors duration-100"
    >
      <div className="flex min-w-0 items-start gap-2">
        <button
          type="button"
          data-session-card={card.sessionId}
          title={card.title}
          onClick={(event) => onOpen(event.altKey)}
          className="line-clamp-2 min-w-0 flex-1 rounded-sm text-left text-[13px] font-medium leading-[18px] text-content outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
        >
          {card.title}
        </button>
        {/* Time and actions share one grid cell: the slot keeps its width. */}
        <div
          className={`-my-0.5 grid shrink-0 justify-items-end ${
            actions.length > 1 ? "min-w-[72px]" : "min-w-11"
          }`}
        >
          <span
            className="col-start-1 row-start-1 self-center text-[11px] tabular-nums text-content/45 transition-opacity duration-100 group-focus-within/board-card:opacity-0 group-hover/board-card:opacity-0"
            aria-hidden={!time}
          >
            {time}
          </span>
          <div className="col-start-1 row-start-1 flex items-center gap-0.5 opacity-0 transition-opacity duration-100 group-focus-within/board-card:opacity-100 group-hover/board-card:opacity-100">
            {actions}
          </div>
        </div>
      </div>
      {finished ? null : (
        <p className="flex min-w-0 items-center gap-1.5 text-[11px] text-content/50">
          <span className="min-w-0 truncate" title={card.cwd}>
            {project}
          </span>
          {card.branch ? (
            <>
              <span aria-hidden className="text-content/30">
                ·
              </span>
              <span
                className="flex min-w-0 items-center gap-1"
                title={card.branch}
              >
                <GitBranch
                  aria-hidden
                  className="size-3 shrink-0"
                  strokeWidth={1.75}
                />
                <span className="truncate">{card.branch}</span>
              </span>
            </>
          ) : null}
          {card.queuedCount ? (
            <>
              <span aria-hidden className="text-content/30">
                ·
              </span>
              <span className="shrink-0 tabular-nums">
                {card.queuedCount} queued
              </span>
            </>
          ) : null}
        </p>
      )}
      <div className="flex min-w-0 items-center gap-1.5 text-[11px]">
        {finished ? (
          <span className="min-w-0 truncate text-content/50">
            <span title={card.cwd}>{project}</span>
            <span aria-hidden className="text-content/30">
              {" · "}
            </span>
            {card.model}
          </span>
        ) : (
          <span className="flex min-w-0 items-center gap-1.5 text-content/55">
            {isHarnessId(card.harness) ? (
              <HarnessIcon
                harness={card.harness}
                className="size-3 shrink-0"
              />
            ) : null}
            <span className="truncate" title={card.model}>
              {card.model}
            </span>
          </span>
        )}
        <BoardCardTag
          label={tag.label}
          tone={tag.tone}
          title={showReason ? undefined : card.reason}
        />
      </div>
      {showReason ? (
        <p
          title={card.reason}
          className="line-clamp-2 rounded-sm border-l-2 border-amber-400/50 bg-amber-400/8 px-2 py-1 text-[11px] leading-4 text-content/70"
        >
          {card.reason}
        </p>
      ) : null}
    </div>
  );
}

function BoardCardTag({
  label,
  tone,
  title,
}: {
  label: string;
  tone: BoardTagTone;
  title?: string;
}): ReactNode {
  return (
    <span
      data-board-tag={label}
      title={title}
      className={`ml-auto flex shrink-0 items-center gap-1 tabular-nums ${TAG_TONE[tone]}`}
    >
      {tone === "working" && label === "Working…" ? (
        <TerminalSpinner className="inline-block w-3 select-none text-center text-[11px] leading-none" />
      ) : tone === "attention" ? (
        <CircleAlert aria-hidden className="size-3" strokeWidth={1.75} />
      ) : tone === "done" ? (
        <Check aria-hidden className="size-3" strokeWidth={2.25} />
      ) : tone === "muted" ? (
        <Square aria-hidden className="size-2.5" strokeWidth={2} />
      ) : null}
      {label}
    </span>
  );
}
