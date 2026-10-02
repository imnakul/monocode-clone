import { useEffect, useMemo, useRef, useState } from "react";
import { OverlayNav } from "../../../app/shell/TitleBar";
import { WindowControls } from "../../../app/shell/WindowControls";
import { IS_MAC } from "../../../platform/tauri/platform";
import { MessageMultiple, Search, X } from "../../../shared/ui/icons";
import {
  BoardColumn,
  BoardColumns,
} from "../../../shared/ui/board/BoardColumns";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "../../../shared/ui/SearchableSelect";
import { projectName, pathKey } from "../../../shared/lib/paths";
import { SessionCard } from "../../sessions/ui/SessionCard";
import type { HarnessId } from "../../sessions/model/session";
import {
  BOARD_COLUMNS,
  hideBoardCards,
  loadBoard,
  visibleBoardCards,
  type BoardCard,
  type BoardStatus,
} from "../sessionBoard";

const COLUMN_MIN_WIDTH = 256;
export function SessionBoardView({
  cards,
  loading,
  error,
  activeSessionId,
  onOpenSession,
  onClose,
  onWorkspaceHost,
  onPaneVisible,
  besideRail,
  compactRail,
  onToggleSidebar,
}: {
  cards: readonly BoardCard[];
  loading: boolean;
  error: string | null;
  activeSessionId?: string;
  onOpenSession: (sessionId: string, altKey?: boolean) => Promise<void>;
  onClose: () => void;
  onPaneVisible: (visible: boolean) => void;
  onWorkspaceHost: (host: HTMLElement | null) => void;
  besideRail?: boolean;
  compactRail?: boolean;
  onToggleSidebar?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [project, setProject] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [width, setWidth] = useState(() => {
    try {
      return Math.max(
        25,
        Math.min(75, Number(localStorage.getItem("monocode.boardWidth")) || 48),
      );
    } catch {
      return 48;
    }
  });
  const resizeCleanup = useRef<(() => void) | undefined>(undefined);
  useEffect(() => {
    onPaneVisible(selected);
    return () => onPaneVisible(false);
  }, [selected, onPaneVisible]);
  useEffect(() => {
    try {
      localStorage.setItem("monocode.boardWidth", String(width));
    } catch {}
  }, [width]);
  useEffect(() => () => resizeCleanup.current?.(), []);
  const body = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const projects = useMemo(
    () => [
      ...new Map(cards.map((card) => [pathKey(card.cwd), card.cwd])).values(),
    ],
    [cards],
  );
  const visible = visibleBoardCards(cards).filter(
    (card) =>
      (!project || pathKey(project) === pathKey(card.cwd)) &&
      (!status || card.status === status) &&
      (!query.trim() ||
        [card.title, card.cwd, card.model, card.harness, card.reason ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase())),
  );
  const projectOptions = useMemo<SearchableSelectOption[]>(
    () => [
      { value: "", label: "All projects" },
      ...projects.map((path) => ({
        value: path,
        label: projectName(path),
        keywords: path,
      })),
    ],
    [projects],
  );
  const statusOptions = useMemo<SearchableSelectOption[]>(
    () => [
      { value: "", label: "All statuses" },
      ...Object.entries(BOARD_COLUMNS).map(([value, label]) => ({
        value,
        label,
      })),
    ],
    [],
  );
  const runAction = async (action: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
    } catch (failure) {
      setActionError(String(failure));
    } finally {
      setBusy(false);
    }
  };
  const open = async (card: BoardCard, altKey?: boolean) => {
    await runAction(async () => {
      await onOpenSession(card.sessionId, altKey);
      setSelected(true);
    });
  };
  const resize = (event: React.PointerEvent<HTMLDivElement>) => {
    resizeCleanup.current?.();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const move = (next: PointerEvent) => {
      const rect = body.current?.getBoundingClientRect();
      if (rect)
        setWidth(
          Math.max(
            25,
            Math.min(75, ((next.clientX - rect.left) / rect.width) * 100),
          ),
        );
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      resizeCleanup.current = undefined;
    };
    resizeCleanup.current = up;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  return (
    <div
      data-app-kanban
      aria-label="Session board"
      role="region"
      className="flex min-h-0 min-w-0 flex-1 flex-col text-content"
    >
      <div
        className="flex h-10 shrink-0 items-center border-b border-stroke"
        data-tauri-drag-region="deep"
      >
        {IS_MAC && !besideRail ? <div className="w-[78px] shrink-0" /> : null}
        {IS_MAC && compactRail ? <div className="w-4 shrink-0" /> : null}
        {!besideRail ? (
          <OverlayNav onBack={onClose} onToggleSidebar={onToggleSidebar} />
        ) : null}
        <div className="flex min-w-0 flex-1 items-center gap-2 px-3 text-[13px]">
          <MessageMultiple
            className="size-3.5 shrink-0 text-content/45"
            strokeWidth={1.75}
          />
          <span className="min-w-0 truncate text-content">Session board</span>
        </div>
        <button
          type="button"
          className="mr-2 h-7 rounded-md px-2.5 text-[12px] text-content/70 hover:bg-content/10 hover:text-content"
          onClick={onClose}
        >
          Back to workspace
        </button>
        {!IS_MAC ? <WindowControls /> : null}
      </div>
      <div className="flex h-9 shrink-0 items-center gap-1.5 px-2">
        <div className="relative flex h-7 min-w-0 max-w-72 flex-1 items-center">
          <Search className="pointer-events-none absolute left-2 size-3 shrink-0 opacity-50" />
          <input
            className="h-7 w-full rounded-md bg-transparent pl-7 pr-2 text-[12px] text-content outline-none placeholder:text-content/40"
            aria-label="Search board"
            placeholder="Search sessions, projects, models…"
            spellCheck={false}
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <SearchableSelect
          variant="pill"
          label="Board project"
          value={project}
          options={projectOptions}
          searchPlaceholder="Search projects…"
          onChange={setProject}
        />
        <SearchableSelect
          variant="pill"
          label="Board status"
          value={status}
          options={statusOptions}
          searchable={false}
          onChange={setStatus}
        />
        {query || project || status ? (
          <button
            type="button"
            className="h-7 shrink-0 rounded-md px-2 text-[12px] text-content/50 hover:bg-content/10 hover:text-content"
            onClick={() => {
              setQuery("");
              setProject("");
              setStatus("");
            }}
          >
            Reset
          </button>
        ) : null}
        {selected ? (
          <button
            type="button"
            className="ml-auto h-7 shrink-0 rounded-md px-2.5 text-[12px] text-content/70 hover:bg-content/10 hover:text-content"
            onClick={() => setSelected(false)}
          >
            Hide session pane
          </button>
        ) : null}
      </div>
      {error || actionError ? (
        <div role="alert" className="p-2 text-xs text-red-400">
          {actionError || error}{" "}
          <button
            className="underline"
            onClick={() => void loadBoard().then(() => setActionError(null))}
          >
            Reload board
          </button>
        </div>
      ) : null}
      <div ref={body} className="flex min-h-0 min-w-0 flex-1">
        <div
          className="flex min-h-0 min-w-0 flex-col"
          style={{ width: selected ? `${width}%` : "100%" }}
        >
          {loading ? (
            <p className="px-4 pt-3 text-[12px] text-content/50">
              Loading sessions…
            </p>
          ) : null}
          {!loading && !visible.length ? (
            <p className="px-4 pt-3 text-[13px] text-content/45">
              No sessions match. Sessions appear here when a turn or draft is
              created.
            </p>
          ) : null}
          <div className="min-h-0 flex-1">
            <BoardColumns>
              {(Object.entries(BOARD_COLUMNS) as [BoardStatus, string][])
                .filter(([key]) => !status || key === status)
                .map(([key, label]) => {
                  const rows = visible.filter((card) => card.status === key);
                  return (
                    <BoardColumn
                      key={key}
                      id={key}
                      label={label}
                      count={rows.length}
                      minWidth={COLUMN_MIN_WIDTH}
                      actions={
                        key === "done" || key === "stopped" ? (
                          <button
                            type="button"
                            className="text-[12px] font-normal text-content/50 hover:text-content disabled:opacity-40"
                            disabled={busy || !rows.length}
                            onClick={() =>
                              void runAction(() => hideBoardCards(rows))
                            }
                            aria-label={`Clear ${label}`}
                          >
                            Clear
                          </button>
                        ) : null
                      }
                    >
                      {rows.map((card) => (
                        <div
                          className="group relative mb-2 rounded-md bg-background-base/60 hover:bg-content/5"
                          key={card.sessionId}
                          data-board-card={card.sessionId}
                        >
                          <SessionCard
                            session={{
                              id: card.sessionId,
                              title: card.title,
                              cwd: card.cwd,
                              harness: card.harness as HarnessId,
                              model: card.model,
                              branch: card.branch,
                              runtimeMode: "supervised",
                              createdAt: card.updatedAt,
                              updatedAt: card.updatedAt,
                            }}
                            isActive={
                              selected && card.sessionId === activeSessionId
                            }
                            busy={key === "in_progress"}
                            done={key === "done"}
                            needsApproval={key === "needs_attention"}
                            now={now}
                            onSelect={(_id, event) =>
                              void open(card, event?.altKey)
                            }
                          />
                          <div className="px-2 pb-2 text-[11px] text-content/50">
                            <span title={card.cwd}>
                              {projectName(card.cwd)}
                            </span>
                            {card.queuedCount ? (
                              <span> · {card.queuedCount} queued</span>
                            ) : null}
                            {card.reason ? (
                              <p className="mt-1 line-clamp-3">{card.reason}</p>
                            ) : null}
                          </div>
                          <button
                            className="absolute right-1 top-1 rounded bg-background-base p-1 opacity-0 hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
                            aria-label={`Remove ${card.title} from board`}
                            disabled={busy}
                            onClick={() =>
                              void runAction(() => hideBoardCards([card]))
                            }
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </BoardColumn>
                  );
                })}
            </BoardColumns>
          </div>
        </div>
        {selected ? (
          <div
            role="separator"
            aria-label="Board and session divider"
            aria-orientation="vertical"
            tabIndex={0}
            aria-valuemin={25}
            aria-valuemax={75}
            aria-valuenow={Math.round(width)}
            className="w-1.5 shrink-0 cursor-col-resize bg-content/5 hover:bg-accent/30 focus:bg-accent/30"
            onPointerDown={resize}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                setWidth((value) =>
                  Math.max(
                    25,
                    Math.min(75, value + (event.key === "ArrowLeft" ? -5 : 5)),
                  ),
                );
              }
            }}
          />
        ) : null}
        <div
          ref={onWorkspaceHost}
          className={
            selected ? "flex min-h-0 min-w-0 flex-1 flex-col" : "hidden"
          }
          aria-label="Board session workspace"
        />
      </div>
    </div>
  );
}
