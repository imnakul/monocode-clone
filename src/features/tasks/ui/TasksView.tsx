import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, Plus, Search, Trash2 } from "../../../shared/ui/icons";
import { OverlayNav } from "../../../app/shell/TitleBar";
import { WindowControls } from "../../../app/shell/WindowControls";
import { IS_MAC } from "../../../platform/tauri/platform";
import { projectName, pathKey } from "../../../shared/lib/paths";
import { useLockOverscroll } from "../../../shared/hooks/useLockOverscroll";
import {
  looksLikeProject,
  type RecentProject,
} from "../../projects/model/recents";
import { SearchableProjectPicker } from "../../projects/ui/SearchableProjectPicker";
import { NoteSource, NoteTagsEditor } from "../../notes/ui/NotesView";
import { notePreview } from "../../notes/notes";
import { AgentMarkdown } from "../../sessions/ui/AgentMarkdown";
import {
  MarkdownModeToggle,
  useMarkdownMode,
} from "../../sessions/ui/MarkdownModeToggle";
import {
  createTask,
  deleteTask,
  filterTasks,
  loadTasks,
  TASKS_CHANGED_EVENT,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  updateTask,
  type Task,
  type TaskChanges,
  type TaskFilters,
  type TaskStatus,
} from "../tasks";

const control =
  "min-w-0 rounded-md border border-content/10 bg-background-base px-2 py-1 text-[12px] text-content outline-none focus-visible:ring-2 focus-visible:ring-accent";
let rememberedTaskId: string | null = null;

export function TasksView({
  besideRail = false,
  compactRail = false,
  cwd,
  recents = [],
  onClose,
  onToggleSidebar,
  onOpenSource,
}: {
  besideRail?: boolean;
  compactRail?: boolean;
  cwd?: string;
  recents?: RecentProject[];
  onClose: () => void;
  onToggleSidebar?: () => void;
  onOpenSource: (sessionId: string, blockId?: string) => void | Promise<void>;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(rememberedTaskId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({});
  const alive = useRef(true);
  const refreshId = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++refreshId.current;
    try {
      const rows = await loadTasks();
      if (!alive.current || id !== refreshId.current) return;
      setTasks(rows);
      setError(null);
      setLoading(false);
    } catch (error) {
      if (!alive.current || id !== refreshId.current) return;
      setError(error instanceof Error ? error.message : String(error));
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    void refresh();
    window.addEventListener(TASKS_CHANGED_EVENT, refresh);
    return () => {
      alive.current = false;
      window.removeEventListener(TASKS_CHANGED_EVENT, refresh);
    };
  }, [refresh]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      // Let open project/tag controls consume Escape first.
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const visible = useMemo(() => filterTasks(tasks, filters), [tasks, filters]);
  const selected =
    visible.find((task) => task.id === selectedId) ?? visible[0] ?? null;
  useEffect(() => {
    rememberedTaskId = selected?.id ?? null;
  }, [selected?.id]);
  const projects = useMemo(() => {
    const paths = [
      ...recents.map((project) => project.path),
      ...tasks.flatMap((task) => (task.projectCwd ? [task.projectCwd] : [])),
      ...(cwd && looksLikeProject(cwd) ? [cwd] : []),
    ];
    return [...new Map(paths.map((path) => [pathKey(path), path])).values()];
  }, [recents, tasks, cwd]);
  const create = async (projectCwd?: string) => {
    setCreating(true);
    setError(null);
    try {
      const task = await createTask({ projectCwd, status: "todo" });
      if (!alive.current) return;
      setFilters({});
      setSelectedId(task.id);
      await refresh();
    } catch (error) {
      if (alive.current) setError(String(error));
    } finally {
      if (alive.current) setCreating(false);
    }
  };
  const remove = async (id: string) => {
    await deleteTask(id);
    await refresh();
  };
  return (
    <div
      role="region"
      aria-label="Task Manager"
      data-app-tasks
      className="flex min-h-0 min-w-0 flex-1 flex-col text-content"
    >
      <div
        className="flex h-10 shrink-0 select-none items-center border-b border-stroke"
        data-tauri-drag-region="deep"
      >
        {IS_MAC && compactRail ? <div className="w-4 shrink-0" /> : null}
        {IS_MAC && !besideRail ? <div className="w-[78px] shrink-0" /> : null}
        {!besideRail ? (
          <OverlayNav onBack={onClose} onToggleSidebar={onToggleSidebar} />
        ) : null}
        <div className="flex min-w-0 flex-1 items-center gap-2 px-3 text-[13px]">
          <CheckCircle className="size-3.5 text-content/45" />
          Task Manager
        </div>
        {!IS_MAC ? <WindowControls /> : null}
      </div>
      <div className="flex min-h-0 min-w-0 flex-1">
        <aside className="flex w-72 min-h-0 shrink-0 flex-col border-r border-stroke">
          <div className="space-y-2 border-b border-stroke p-2">
            <div className="flex items-center gap-1">
              <Search className="size-3.5 text-content/45" />
              <input
                className={`${control} flex-1`}
                aria-label="Search tasks"
                placeholder="Search tasks"
                value={filters.query ?? ""}
                onChange={(event) =>
                  setFilters({ ...filters, query: event.target.value })
                }
              />
            </div>
            <div className="flex gap-2">
              <select
                className={`${control} flex-1`}
                aria-label="Filter task status"
                value={filters.statuses?.[0] ?? ""}
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    statuses: event.target.value
                      ? [event.target.value as TaskStatus]
                      : [],
                  })
                }
              >
                <option value="">All statuses</option>
                {TASK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {TASK_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
              <select
                className={`${control} flex-1`}
                aria-label="Filter task project"
                value={
                  filters.projectCwd === null
                    ? "personal"
                    : (filters.projectCwd ?? "")
                }
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    projectCwd:
                      event.target.value === "personal"
                        ? null
                        : event.target.value || undefined,
                  })
                }
              >
                <option value="">All projects</option>
                <option value="personal">Personal</option>
                {projects.map((path) => (
                  <option key={path} value={path}>
                    {projectName(path)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <input
                className={`${control} flex-1`}
                aria-label="Filter task tags"
                placeholder="Tags, comma separated"
                value={(filters.tags ?? []).join(",")}
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    tags: event.target.value.split(","),
                  })
                }
              />
              <select
                className={control}
                aria-label="Task tag matching"
                value={filters.tagMatch ?? "all"}
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    tagMatch: event.target.value as "all" | "any",
                  })
                }
              >
                <option value="all">All tags</option>
                <option value="any">Any tag</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                className={`${control} inline-flex items-center gap-1`}
                aria-label="New task"
                disabled={creating}
                onClick={() =>
                  void create(cwd && looksLikeProject(cwd) ? cwd : undefined)
                }
              >
                <Plus className="size-3.5" />
                New task
              </button>
              <button
                className={control}
                disabled={creating}
                onClick={() => void create()}
              >
                New Personal task
              </button>
              <button
                className="ml-auto text-[11px] text-content/50 hover:text-content"
                onClick={() => setFilters({})}
              >
                Reset filters
              </button>
            </div>
          </div>
          {error ? (
            <div role="alert" className="p-3 text-xs text-red-400">
              {error}{" "}
              <button className="underline" onClick={() => void refresh()}>
                Retry
              </button>
            </div>
          ) : null}
          <div
            className="min-h-0 flex-1 overflow-y-auto p-2"
            aria-label="Task list"
          >
            {loading ? (
              <p className="p-2 text-xs text-content/50">Loading tasks…</p>
            ) : null}
            {!loading && !visible.length ? (
              <p className="p-2 text-xs text-content/50">
                {tasks.length ? "No tasks match these filters" : "No tasks yet"}
              </p>
            ) : null}
            {visible.map((task) => (
              <button
                key={task.id}
                type="button"
                aria-current={selected?.id === task.id ? "true" : undefined}
                onClick={() => setSelectedId(task.id)}
                className={`mb-1 block w-full rounded-lg p-3 text-left ${selected?.id === task.id ? "bg-content/8" : "hover:bg-content/5"}`}
              >
                <span className="block truncate text-[13px]">{task.title}</span>
                <span className="mt-1 block text-[11px] text-content/50">
                  {TASK_STATUS_LABELS[task.status]} ·{" "}
                  {task.projectCwd ? projectName(task.projectCwd) : "Personal"}
                </span>
                <span className="mt-1 line-clamp-2 text-[12px] text-content/45">
                  {notePreview(task.body, task.title)}
                </span>
                {task.tags.length ? (
                  <span className="mt-1 block truncate text-[11px] text-content/50">
                    {task.tags.map((tag) => `#${tag}`).join(" ")}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="border-t border-stroke px-3 py-2 text-[11px] text-content/45">
            {visible.length} of {tasks.length} tasks
          </div>
        </aside>
        {selected ? (
          <TaskEditor
            key={selected.id}
            task={selected}
            recents={recents}
            cwd={cwd}
            onDelete={remove}
            onOpenSource={onOpenSource}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-content/45">
            Select or create a task
          </div>
        )}
      </div>
    </div>
  );
}

function TaskEditor({
  task,
  recents,
  cwd,
  onDelete,
  onOpenSource,
}: {
  task: Task;
  recents: RecentProject[];
  cwd?: string;
  onDelete: (id: string) => Promise<void>;
  onOpenSource: (sessionId: string, blockId?: string) => void | Promise<void>;
}) {
  const [edits, setEdits] = useState<TaskChanges>({});
  const editsRef = useRef<TaskChanges>({});
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);
  const alive = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const source = useRef<HTMLTextAreaElement>(null);
  const lock = useLockOverscroll<HTMLDivElement>();
  const [mode, setMode] = useMarkdownMode(`task:${task.id}`);
  const title = edits.title ?? task.title;
  const body = edits.body ?? task.body;
  const tags = edits.tags ?? task.tags;
  const status = edits.status ?? task.status;
  const project =
    edits.projectCwd === null
      ? undefined
      : (edits.projectCwd ?? task.projectCwd);
  const save = useCallback(async () => {
    clearTimeout(timer.current);
    const snapshot = editsRef.current;
    if (!Object.keys(snapshot).length || deletingRef.current) return;
    try {
      await updateTask(task.id, snapshot);
      const remaining = { ...editsRef.current };
      for (const key of Object.keys(snapshot) as (keyof TaskChanges)[]) {
        if (remaining[key] === snapshot[key]) delete remaining[key];
      }
      editsRef.current = remaining;
      if (alive.current) {
        setEdits(remaining);
        setError(null);
      }
    } catch (error) {
      if (alive.current)
        setError(error instanceof Error ? error.message : String(error));
    }
  }, [task.id]);
  const edit = (changes: TaskChanges, immediate = false) => {
    editsRef.current = { ...editsRef.current, ...changes };
    setEdits(editsRef.current);
    clearTimeout(timer.current);
    if (immediate) void save();
    else timer.current = setTimeout(() => void save(), 400);
  };
  useEffect(() => {
    alive.current = true;
    if (!task.body.trim() && task.title === "Untitled") setMode("source");
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
      void save();
    };
    // The editor is keyed by task ID; changing its saved fields must not reset it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save]);
  return (
    <div
      ref={lock}
      className="min-h-0 min-w-0 flex-1 overflow-y-auto p-6 select-text"
    >
      <div className="mx-auto max-w-3xl space-y-3">
        <input
          className="w-full bg-transparent text-xl font-semibold outline-none"
          aria-label="Task title"
          maxLength={200}
          placeholder="Untitled"
          value={title}
          onChange={(event) => edit({ title: event.target.value })}
          onBlur={() => void save()}
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            className={control}
            aria-label="Task status"
            value={status}
            onChange={(event) =>
              edit({ status: event.target.value as TaskStatus }, true)
            }
          >
            {TASK_STATUSES.map((value) => (
              <option key={value} value={value}>
                {TASK_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
          <span className="text-xs text-content/50">
            {project ? projectName(project) : "Personal"}
          </span>
          <SearchableProjectPicker
            cwd={project ?? "~"}
            recents={recents}
            railCwd={cwd}
            mode="move"
            itemKind="task"
            onSelectProject={(path) =>
              edit({ projectCwd: looksLikeProject(path) ? path : null }, true)
            }
          />
          {project ? (
            <button
              className={control}
              onClick={() => edit({ projectCwd: null }, true)}
            >
              Move to Personal
            </button>
          ) : null}
        </div>
        <NoteTagsEditor
          label="Add task tag"
          tags={tags}
          onChange={(tags) => edit({ tags })}
        />
        <div className="flex flex-wrap items-center gap-2 text-xs text-content/50">
          <span>Updated {new Date(task.updatedAt).toLocaleString()}</span>
          {task.completedAt ? (
            <span>Completed {new Date(task.completedAt).toLocaleString()}</span>
          ) : null}
          {task.sourceSessionId ? (
            <button
              className={control}
              onClick={async () => {
                try {
                  await onOpenSource(task.sourceSessionId!, task.sourceBlockId);
                } catch (error) {
                  setError(String(error));
                }
              }}
            >
              Open source session
            </button>
          ) : null}
          <button
            className={`${control} inline-flex items-center gap-1 hover:text-red-400`}
            disabled={deleting}
            onClick={async () => {
              deletingRef.current = true;
              setDeleting(true);
              clearTimeout(timer.current);
              try {
                await onDelete(task.id);
              } catch (error) {
                deletingRef.current = false;
                if (alive.current) {
                  setDeleting(false);
                  setError(String(error));
                }
              }
            }}
          >
            <Trash2 className="size-3.5" />
            Delete task
          </button>
        </div>
        {error ? (
          <div role="alert" className="text-xs text-red-400">
            Task action failed: {error}{" "}
            <button className="underline" onClick={() => void save()}>
              Retry
            </button>
          </div>
        ) : null}
        <div className="flex justify-end border-b border-stroke pb-2">
          <MarkdownModeToggle mode={mode} onChange={setMode} markdown={body} />
        </div>
        {mode === "source" ? (
          <NoteSource
            value={body}
            textareaRef={source}
            autoFocus={!body.trim()}
            label="Task Markdown"
            onChange={(body) => edit({ body })}
          />
        ) : body.trim() ? (
          <AgentMarkdown text={body} cwd={project} hardBreaks />
        ) : (
          <p className="text-sm text-content/45">No description</p>
        )}
      </div>
    </div>
  );
}
