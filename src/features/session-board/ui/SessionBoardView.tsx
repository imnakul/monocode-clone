import { useEffect, useMemo, useRef, useState } from "react";
import { OverlayNav } from "../../../app/shell/TitleBar";
import { WindowControls } from "../../../app/shell/WindowControls";
import { IS_MAC } from "../../../platform/tauri/platform";
import { PanelLeft, Plus, Play, Pencil, X } from "../../../shared/ui/icons";
import { projectName, pathKey } from "../../../shared/lib/paths";
import { SessionCard } from "../../sessions/ui/SessionCard";
import type { HarnessId } from "../../sessions/model/session";
import {
  projectRailItems,
  type RecentProject,
} from "../../projects/model/recents";
import {
  BOARD_COLUMNS,
  hideBoardCards,
  loadBoard,
  visibleBoardCards,
  type BoardCard,
  type BoardStatus,
} from "../sessionBoard";

const control =
  "rounded-md border border-content/10 bg-background-base px-2 py-1 text-xs text-content outline-none focus-visible:ring-2 focus-visible:ring-accent";
export function SessionBoardView({
  cards,
  cwd,
  recents = [],
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
  onAddTodo,
  onEditTodo,
  onStartTodo,
  onDeleteTodo,
}: {
  cards: readonly BoardCard[];
  cwd?: string;
  recents?: RecentProject[];
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
  onAddTodo?: (cwd?: string) => void;
  onEditTodo?: (id: string) => Promise<void>;
  onStartTodo?: (id: string) => Promise<void>;
  onDeleteTodo?: (id: string) => Promise<void>;
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
  const projects = useMemo(() => {
    const paths = new Map(
      projectRailItems(recents, cwd ?? "").map(({ path }) => [
        pathKey(path),
        path,
      ]),
    );
    // Keep projects from durable cards even after they leave the recent-project rail.
    for (const card of cards) {
      if (card.cwd && !paths.has(pathKey(card.cwd)))
        paths.set(pathKey(card.cwd), card.cwd);
    }
    return [...paths.values()];
  }, [cards, recents, cwd]);
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
      aria-label="Session Manager"
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
        <div className="flex flex-1 items-center gap-2 px-3 text-sm">
          <PanelLeft className="size-3.5" />
          Session Manager
        </div>
        <button className={`${control} mr-2`} onClick={onClose}>
          Back to workspace
        </button>
        {!IS_MAC ? <WindowControls /> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-stroke p-2">
        {onAddTodo ? (
          <button
            className={`${control} flex items-center gap-1`}
            onClick={() =>
              onAddTodo(
                projects.find((path) => pathKey(path) === project) ?? cwd,
              )
            }
            aria-label="Add Session Manager Todo"
          >
            <Plus className="size-3.5" /> Add Todo
          </button>
        ) : null}
        <input
          className={control}
          aria-label="Search board"
          placeholder="Search sessions, projects, models…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className={control}
          aria-label="Board project"
          value={project}
          onChange={(event) => setProject(event.target.value)}
        >
          <option value="">All projects</option>
          {projects.map((path) => (
            <option key={pathKey(path)} value={pathKey(path)} title={path}>
              {projectName(path)}
            </option>
          ))}
        </select>
        <select
          className={control}
          aria-label="Board status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All statuses</option>
          {Object.entries(BOARD_COLUMNS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <button
          className={control}
          onClick={() => {
            setQuery("");
            setProject("");
            setStatus("");
          }}
        >
          Reset filters
        </button>
        {selected ? (
          <button
            className={`${control} ml-auto`}
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
          className="flex min-h-0 min-w-0 gap-3 overflow-auto p-3"
          style={{ width: selected ? `${width}%` : "100%" }}
        >
          {loading ? <p>Loading sessions…</p> : null}
          {!loading && !visible.length ? (
            <p className="text-sm text-content/45">
              No sessions match. Add a Todo or start a session to see it here.
            </p>
          ) : null}
          {(Object.entries(BOARD_COLUMNS) as [BoardStatus, string][])
            .filter(([key]) => !status || key === status)
            .map(([key, label]) => {
              const rows = visible.filter((card) => card.status === key);
              return (
                <section
                  key={key}
                  aria-label={`${label} column`}
                  className="flex w-64 shrink-0 flex-col rounded-lg border border-stroke bg-content/3"
                >
                  <div className="flex items-center gap-2 border-b border-stroke p-2 text-xs font-medium">
                    <span>{label}</span>
                    <span className="text-content/45">{rows.length}</span>
                    {key === "todo" && onAddTodo ? (
                      <button
                        className="ml-auto rounded p-1 hover:bg-content/10"
                        aria-label="Add Todo"
                        onClick={() =>
                          onAddTodo(
                            projects.find(
                              (path) => pathKey(path) === project,
                            ) ?? cwd,
                          )
                        }
                      >
                        <Plus className="size-3.5" />
                      </button>
                    ) : null}
                    {key === "done" || key === "stopped" ? (
                      <button
                        className="ml-auto text-content/50 hover:text-content disabled:opacity-40"
                        disabled={busy || !rows.length}
                        onClick={() =>
                          void runAction(() => hideBoardCards(rows))
                        }
                        aria-label={`Clear ${label}`}
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                  <div className="min-h-0 overflow-y-auto p-1.5">
                    {rows.map((card) => (
                      <div
                        className="group relative mb-2 rounded-md border border-stroke"
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
                          <span title={card.cwd}>{projectName(card.cwd)}</span>
                          {card.queuedCount ? (
                            <span> · {card.queuedCount} queued</span>
                          ) : null}
                          {card.reason ? (
                            <p className="mt-1 line-clamp-3">{card.reason}</p>
                          ) : null}
                        </div>
                        {key === "todo" &&
                        card.runId.startsWith("draft:") &&
                        onStartTodo ? (
                          <div className="flex gap-1 px-2 pb-2 opacity-0 focus-within:opacity-100 group-hover:opacity-100">
                            <button
                              className={`${control} flex items-center gap-1`}
                              disabled={busy}
                              aria-label={`Start ${card.title}`}
                              onClick={() =>
                                void runAction(async () => {
                                  await onStartTodo(card.sessionId);
                                  await onOpenSession(card.sessionId);
                                  setSelected(true);
                                })
                              }
                            >
                              <Play className="size-3" /> Start
                            </button>
                            {onEditTodo ? (
                              <button
                                className={control}
                                disabled={busy}
                                aria-label={`Edit ${card.title}`}
                                onClick={() =>
                                  void runAction(() =>
                                    onEditTodo(card.sessionId),
                                  )
                                }
                              >
                                <Pencil className="size-3" />
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                        <button
                          className="absolute right-1 top-1 rounded bg-background-base p-1 opacity-0 hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
                          aria-label={
                            key === "todo" &&
                            card.runId.startsWith("draft:") &&
                            onDeleteTodo
                              ? `Delete Todo ${card.title}`
                              : `Remove ${card.title} from board`
                          }
                          disabled={busy}
                          onClick={() =>
                            void runAction(() =>
                              key === "todo" &&
                              card.runId.startsWith("draft:") &&
                              onDeleteTodo
                                ? onDeleteTodo(card.sessionId)
                                : hideBoardCards([card]),
                            )
                          }
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
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
