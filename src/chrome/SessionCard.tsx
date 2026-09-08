import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Archive, Check, CircleAlert, GitBranch, Pin } from "./icons";
import { HarnessIcon } from "./HarnessIcon";
import { TerminalSpinner } from "./TerminalSpinner";
import { suppressTextSelection } from "../lib/drag";
import type { PaneEdge } from "../lib/layout";
import { resolveModel } from "../lib/models";
import { paneDropFromPoint, setExternalPaneDrop } from "../lib/paneDrop";
import { sessionDisplayTitle } from "../lib/session";
import type { SessionListDropTarget } from "../lib/sessionFolders";
import type { SessionSummary } from "../lib/sessionStore";

export function sessionListDropFromPoint(
  x: number,
  y: number,
  draggedId: string,
): SessionListDropTarget | null {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const card = el.closest("[data-session-card]") as HTMLElement | null;
  const cardId = card?.dataset.sessionCard;
  if (cardId === draggedId) return null;
  const folder = el.closest("[data-session-folder]") as HTMLElement | null;
  const folderId = folder?.dataset.sessionFolder;
  if (folderId && cardId && card && folder.contains(card)) {
    return { kind: "folder", id: folderId };
  }
  if (cardId) return { kind: "session", id: cardId };
  if (folderId) return { kind: "folder", id: folderId };
  return null;
}

export function SessionCard({
  session,
  isActive,
  busy,
  done,
  needsApproval,
  dropTarget,
  compact = false,
  now,
  onSelect,
  onPrefetch,
  onPlaceOnPane,
  onListDrop,
  onListDropTargetChange,
  onContextMenu,
  onArchive,
  onRename,
  onDelete,
}: {
  session: SessionSummary;
  isActive: boolean;
  busy: boolean;
  done: boolean;
  needsApproval: boolean;
  dropTarget?: boolean;
  compact?: boolean;
  now: number;
  onSelect: (sessionId: string) => void;
  onPrefetch?: (sessionId: string) => void;
  onPlaceOnPane?: (sessionId: string, targetId: string, edge: PaneEdge) => void;
  onListDrop?: (draggedId: string, target: SessionListDropTarget) => void;
  onListDropTargetChange?: (target: SessionListDropTarget | null) => void;
  onContextMenu?: (e: ReactMouseEvent<HTMLButtonElement>) => void;
  onArchive?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}) {
  const skipClickUntil = useRef(0);
  const [dragging, setDragging] = useState(false);
  const title = sessionDisplayTitle(session.title, session.harness);
  const gitLabel = formatGitLabel(session.repo, session.branch);
  const time = formatRelative(session.updatedAt, now);
  const model = compact
    ? null
    : resolveModel(session.harness, session.model).name;
  const statusClass = needsApproval
    ? "text-amber-400"
    : busy
      ? "text-accent"
      : done
        ? "text-emerald-400"
        : "text-content/45";
  const status = (
    <span
      className={`flex shrink-0 items-center gap-1 text-[11px] tabular-nums ${statusClass}`}
    >
      {needsApproval ? (
        <>
          <CircleAlert className="size-3" strokeWidth={1.75} />
          <span>Need approval</span>
        </>
      ) : busy ? (
        <>
          <TerminalSpinner className="inline-block w-3 select-none text-center text-[11px] leading-none text-accent" />
          <span>Working...</span>
        </>
      ) : done ? (
        <>
          <Check className="size-3" strokeWidth={2.25} />
          <span>Done</span>
        </>
      ) : (
        <span>{time}</span>
      )}
    </span>
  );

  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "F2" && onRename) {
      e.preventDefault();
      onRename();
      return;
    }
    if ((e.key === "Delete" || e.key === "Backspace") && onDelete) {
      e.preventDefault();
      onDelete();
    }
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    // Warm the transcript during the press. Opening stays on click so a
    // drag-to-pane gesture does not switch conversations.
    onPrefetch?.(session.id);
    if (!onPlaceOnPane && !onListDrop) return;
    const handle = event.currentTarget;
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    let active = false;
    let lastX = startX;
    let lastY = startY;
    let lastList: SessionListDropTarget | null = null;
    handle.setPointerCapture(pointerId);
    const restoreSelection = suppressTextSelection();

    const setListTarget = (next: SessionListDropTarget | null) => {
      if (lastList?.kind === next?.kind && lastList?.id === next?.id) return;
      lastList = next;
      onListDropTargetChange?.(next);
    };

    const onMove = (ev: PointerEvent) => {
      lastX = ev.clientX;
      lastY = ev.clientY;
      if (!active) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 5) return;
        active = true;
        setDragging(true);
        if (onPlaceOnPane) {
          setExternalPaneDrop({
            fromId: session.id,
            overId: null,
            edge: "left",
          });
        }
      }
      setListTarget(
        sessionListDropFromPoint(ev.clientX, ev.clientY, session.id),
      );
      if (!onPlaceOnPane) return;
      const over = paneDropFromPoint(ev.clientX, ev.clientY);
      if (!over || over.id === session.id) {
        setExternalPaneDrop({
          fromId: session.id,
          overId: over?.id === session.id ? session.id : null,
          edge: over?.edge ?? "left",
        });
        return;
      }
      setExternalPaneDrop({
        fromId: session.id,
        overId: over.id,
        edge: over.edge,
      });
    };

    const onUp = () => finish(true);
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== "Escape") return;
      ev.preventDefault();
      finish(false);
    };

    function finish(commit: boolean) {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKey);
      restoreSelection();
      setDragging(false);
      setExternalPaneDrop(null);
      setListTarget(null);
      try {
        handle.releasePointerCapture(pointerId);
      } catch {
        /* already released */
      }
      if (!active) return;
      skipClickUntil.current = performance.now() + 400;
      if (!commit) return;
      const listOver = sessionListDropFromPoint(lastX, lastY, session.id);
      if (listOver) {
        onListDrop?.(session.id, listOver);
        return;
      }
      const over = paneDropFromPoint(lastX, lastY);
      if (over && over.id !== session.id) {
        onPlaceOnPane?.(session.id, over.id, over.edge);
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKey);
  };

  const archiveLabel = session.archived ? "Unarchive" : "Archive";

  return (
    <div className="group relative">
    <button
      type="button"
      data-shared-hover-item
      data-shared-hover-preserve={
        isActive || needsApproval || dropTarget ? "" : undefined
      }
      title={title}
      aria-current={isActive ? "true" : undefined}
      data-session-card={session.id}
      data-tauri-drag-region="false"
      onPointerDown={onPointerDown}
      onPointerEnter={() => onPrefetch?.(session.id)}
      onClick={() => {
        if (performance.now() < skipClickUntil.current) return;
        onSelect(session.id);
      }}
      onContextMenu={onContextMenu}
      onKeyDown={onKeyDown}
      className={`relative border flex w-full touch-none flex-col rounded-md px-2.5 text-left ${
        compact ? "py-1.5" : "py-2"
      } ${dragging ? "opacity-40" : ""} ${
        dropTarget
          ? "text-content border-transparent"
          : needsApproval
            ? "bg-content/20 text-content border-content/30 border-dashed"
            : isActive
              ? "bg-content/10 text-content border-transparent"
              : "text-content/80 hover:bg-content/5 hover:text-content border-transparent"
      }`}
    >
      {dropTarget ? (
        <div className="pointer-events-none absolute inset-0 rounded-md bg-accent/20" />
      ) : null}
      {compact ? null : (
        <span className="relative flex items-center gap-2">
          <span className="flex min-w-0 flex-1 items-center gap-1.5">
            <HarnessIcon
              harness={session.harness}
              className="size-3.5 shrink-0"
            />
            <span className="min-w-0 truncate text-[11px] text-content/50">
              {model}
            </span>
          </span>
          {status}
        </span>
      )}
      <span
        className={`relative flex min-w-0 items-center gap-1.5 ${
          compact ? "" : "mt-1"
        }`}
      >
        {session.pinned ? (
          <Pin className="size-3 shrink-0 text-content/45" strokeWidth={1.75} />
        ) : null}
        <span className="min-w-0 flex-1 line-clamp-1 text-[13px] font-semibold leading-snug text-content">
          {title}
        </span>
        {compact ? status : null}
      </span>
      <span className="relative mt-1 flex items-center gap-2">
        {gitLabel ? (
          <span className="flex min-w-0 flex-1 items-center gap-1 text-[11px] text-content/45">
            <GitBranch className="size-3 shrink-0" strokeWidth={1.75} />
            <span className="min-w-0 truncate">{gitLabel}</span>
          </span>
        ) : (
          <span className="min-w-0 flex-1" />
        )}
        <span
          className={`flex shrink-0 items-center gap-1.5 ${
            onArchive
              ? "transition-[padding] group-focus-within:pl-5 group-hover:pl-5"
              : ""
          }`}
        >
          <HarnessIcon
            harness={session.harness}
            className="size-3.5 shrink-0"
          />
        </span>
      </span>
    </button>
      {onArchive ? (
        <button
          type="button"
          data-no-drag
          data-tauri-drag-region="false"
          title={archiveLabel}
          aria-label={`${archiveLabel} ${title}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onArchive();
          }}
          className={`pointer-events-none absolute right-7 grid size-5 place-items-center rounded text-content/50 opacity-0 transition-opacity hover:bg-content/10 hover:text-content group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 ${
            compact ? "bottom-[5px]" : "bottom-[7px]"
          }`}
        >
          <Archive className="size-3.5" strokeWidth={1.75} />
        </button>
      ) : null}
    </div>
  );
}

export function SessionRenameRow({
  session,
  isActive,
  busy,
  needsApproval,
  onCommit,
  onCancel,
}: {
  session: SessionSummary;
  isActive: boolean;
  busy: boolean;
  needsApproval: boolean;
  onCommit: (title: string) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const finished = useRef(false);
  const [value, setValue] = useState(() =>
    sessionDisplayTitle(session.title, session.harness),
  );

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  const finish = (success: boolean) => {
    if (finished.current) return;
    if (success) {
      const trimmed = value.trim();
      if (!trimmed) {
        onCancel();
        return;
      }
      finished.current = true;
      onCommit(trimmed);
      return;
    }
    finished.current = true;
    onCancel();
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      finish(true);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      finish(false);
    }
  };

  return (
    <div
      className={`flex w-full flex-col rounded-md px-2.5 py-2 ${
        needsApproval
          ? "bg-amber-400/10 text-content"
          : isActive
            ? "bg-content/10 text-content"
            : "text-content/80"
      }`}
    >
      <input
        ref={inputRef}
        value={value}
        disabled={busy}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => finish(true)}
        onKeyDown={onKeyDown}
        className="w-full rounded bg-content/10 px-2 py-1 text-[13px] font-semibold leading-snug text-content outline-none ring-1 ring-accent/40"
      />
    </div>
  );
}

function formatGitLabel(repo?: string, branch?: string): string {
  if (repo && branch) return `${repo}/${branch}`;
  return branch || repo || "";
}

function formatRelative(value: number, now: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  const seconds = Math.max(0, Math.round((now - value) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `${hours}h ${rest}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return "";
  }
}
