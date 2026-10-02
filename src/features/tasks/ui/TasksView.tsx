import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CheckCircle,
  ChevronDown,
  LoaderCircle,
  Plus,
} from "../../../shared/ui/icons";
import { OverlayNav } from "../../../app/shell/TitleBar";
import { WindowControls } from "../../../app/shell/WindowControls";
import { IS_MAC } from "../../../platform/tauri/platform";
import { pathKey, projectName } from "../../../shared/lib/paths";
import {
  ExplorerMenu,
  type ExplorerMenuItem,
} from "../../files/ui/ExplorerMenu";
import { noteProjectChoices, type NoteProjectChoice } from "../../notes/notes";
import {
  loadRecents,
  looksLikeProject,
  type RecentProject,
} from "../../projects/model/recents";
import { useProjectMarks } from "../../projects/ui/ProjectMark";
import {
  TASK_COLUMNS,
  TASK_COLUMN_IDS,
  isTaskColumnId,
  TASK_GROUP_BYS,
  TASK_GROUP_LABELS,
  groupTasksByProject,
  loadBoardState,
  loadGrouping,
  saveGrouping,
  loadTableState,
  loadTaskView,
  saveBoardState,
  saveTableState,
  saveTaskView,
  type TaskBoardState,
  type TaskGrouping,
  type TaskTableState,
  type TaskViewId,
} from "../taskViewState";
import {
  createTask,
  deleteTask,
  filterTasks,
  loadTasks,
  peekTasks,
  TASKS_CHANGED_EVENT,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  updateTask,
  type Task,
  type TaskFilters,
  type TaskStatus,
} from "../tasks";
import { TaskBoard } from "./TaskBoard";
import { TaskList } from "./TaskList";
import { TaskPeekPane } from "./TaskPeekPane";
import { TaskTable } from "./TaskTable";
import { hasActiveFilters, TasksToolbar } from "./TasksToolbar";
import { ResultCount } from "../../../shared/ui/ResultCount";
import { TasksViewSwitch } from "./TasksViewSwitch";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "../../../shared/ui/SearchableSelect";

const GROUP_OPTIONS: Record<TaskViewId, SearchableSelectOption[]> = {
  list: (["none", "status", "project"] as const).map((value) => ({
    value,
    label: TASK_GROUP_LABELS[value],
  })),
  table: (["status", "project", "none"] as const).map((value) => ({
    value,
    label: TASK_GROUP_LABELS[value],
  })),
  board: (["status", "project"] as const).map((value) => ({
    value,
    label: TASK_GROUP_LABELS[value],
  })),
};

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type Menu = { kind: "create" | "columns"; x: number; y: number };

export function TasksView({
  besideRail = false,
  compactRail = false,
  cwd,
  recents = [],
  onClose,
  onToggleSidebar,
  onOpenSource,
  onOpenBeside,
}: {
  besideRail?: boolean;
  compactRail?: boolean;
  cwd?: string;
  recents?: RecentProject[];
  onClose: () => void;
  onToggleSidebar?: () => void;
  onOpenSource: (sessionId: string, blockId?: string) => void | Promise<void>;
  onOpenBeside: (task: Task) => void;
}) {
  const [tasks, setTasks] = useState<Task[]>(() => peekTasks() ?? []);
  const [loading, setLoading] = useState(() => peekTasks() == null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<TaskViewId>(loadTaskView);
  const [table, setTable] = useState<TaskTableState>(loadTableState);
  const [board, setBoard] = useState<TaskBoardState>(loadBoardState);
  const [grouping, setGrouping] = useState<TaskGrouping>(loadGrouping);
  // List group collapsing is a per-visit convenience; it is not persisted.
  const [listCollapsed, setListCollapsed] = useState<string[]>([]);
  const [menu, setMenu] = useState<Menu | null>(null);
  const marks = useProjectMarks();
  const root = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  const refreshId = useRef(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const menuRef = useRef(menu);
  menuRef.current = menu;

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
      setError(message(error));
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

  const visible = useMemo(() => filterTasks(tasks, filters), [tasks, filters]);
  // The selection survives filters and view switches; only deletion clears it.
  const selected = useMemo(
    () => tasks.find((task) => task.id === selectedId) ?? null,
    [tasks, selectedId],
  );
  useEffect(() => {
    if (selectedId && !loading && !selected) setSelectedId(null);
  }, [selectedId, selected, loading]);
  const selectedRef = useRef(selectedId);
  selectedRef.current = selected ? selectedId : null;

  const closePeek = useCallback(() => {
    const id = selectedRef.current;
    setSelectedId(null);
    if (!id) return;
    requestAnimationFrame(() =>
      root.current
        ?.querySelector<HTMLElement>(`[data-task-id="${CSS.escape(id)}"]`)
        ?.focus(),
    );
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      // Menus and pickers dismiss themselves; don't close the view under them.
      if (menuRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      if (selectedRef.current) closePeek();
      else onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePeek]);

  const projects = useMemo(() => {
    const paths = [
      ...recents.map((project) => project.path),
      ...tasks.flatMap((task) => (task.projectCwd ? [task.projectCwd] : [])),
      ...(cwd && looksLikeProject(cwd) ? [cwd] : []),
    ];
    return [...new Map(paths.map((path) => [pathKey(path), path])).values()];
  }, [recents, tasks, cwd]);

  const create = async (projectCwd?: string) => {
    if (creating) return;
    setCreating(true);
    setActionError(null);
    try {
      const task = await createTask({ projectCwd, status: "todo" });
      if (!alive.current) return;
      setFilters({});
      await refresh();
      if (alive.current) setSelectedId(task.id);
    } catch (error) {
      if (alive.current) setActionError(message(error));
    } finally {
      if (alive.current) setCreating(false);
    }
  };
  const remove = async (id: string) => {
    await deleteTask(id);
    if (alive.current)
      setSelectedId((current) => (current === id ? null : current));
    await refresh();
  };
  const changeStatus = (task: Task, status: TaskStatus) => {
    setActionError(null);
    updateTask(task.id, { status }).catch((reason: unknown) => {
      if (alive.current)
        setActionError(`Could not move "${task.title}": ${message(reason)}`);
    });
  };
  const saveView = (next: TaskViewId) => {
    setView(next);
    saveTaskView(next);
  };
  const updateTable = (next: TaskTableState) => {
    setTable(next);
    saveTableState(next);
  };
  const changeGrouping = (value: string) => {
    const by = TASK_GROUP_BYS.find((id) => id === value);
    if (!by) return;
    const next: TaskGrouping =
      view === "board"
        ? { ...grouping, board: by === "project" ? "project" : "status" }
        : { ...grouping, [view]: by };
    setGrouping(next);
    saveGrouping(next);
  };
  const toggleListGroup = (key: string) =>
    setListCollapsed((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  const updateBoard = (next: TaskBoardState) => {
    setBoard(next);
    saveBoardState(next);
  };
  const addTagFilter = (tag: string) =>
    setFilters((current) => ({
      ...current,
      tags: [...new Set([...(current.tags ?? []), tag])],
    }));
  const patchTask = (saved: Task) =>
    setTasks((current) =>
      current.map((task) => (task.id === saved.id ? saved : task)),
    );

  const createChoices = useMemo<NoteProjectChoice[]>(
    () =>
      menu?.kind === "create" ? noteProjectChoices(cwd, loadRecents()) : [],
    [cwd, menu?.kind],
  );
  const menuItems = useMemo<ExplorerMenuItem[]>(() => {
    if (menu?.kind === "create") {
      const items: ExplorerMenuItem[] = [];
      for (const choice of createChoices) {
        if (choice.kind === "personal") items.push({ kind: "sep" });
        items.push({
          kind: "item",
          id: choice.id,
          label:
            choice.kind === "personal" ? "Personal" : projectName(choice.path),
          checked: choice.current,
        });
      }
      return items;
    }
    if (menu?.kind === "columns" && view === "table")
      return TASK_COLUMN_IDS.filter((id) => TASK_COLUMNS[id].hideable).map(
        (id): ExplorerMenuItem => ({
          kind: "item",
          id,
          label: TASK_COLUMNS[id].header,
          checked: !table.hidden.includes(id),
        }),
      );
    if (menu?.kind === "columns" && grouping.board === "project")
      return groupTasksByProject(visible).map((group): ExplorerMenuItem => ({
        kind: "item",
        id: group.key,
        label: group.label,
        count: group.tasks.length,
        checked: !board.hiddenProjects.includes(group.key),
      }));
    if (menu?.kind === "columns")
      return TASK_STATUSES.map((status): ExplorerMenuItem => ({
        kind: "item",
        id: status,
        label: TASK_STATUS_LABELS[status],
        count: visible.filter((task) => task.status === status).length,
        checked: !board.hidden.includes(status),
      }));
    return [];
  }, [
    menu?.kind,
    createChoices,
    view,
    table.hidden,
    board.hidden,
    board.hiddenProjects,
    grouping.board,
    visible,
  ]);

  const onPickMenu = (id: string) => {
    const kind = menu?.kind;
    setMenu(null);
    if (kind === "create") {
      const choice = createChoices.find((item) => item.id === id);
      if (choice)
        void create(choice.kind === "project" ? choice.path : undefined);
      return;
    }
    if (view === "table" && isTaskColumnId(id)) {
      updateTable({
        ...table,
        hidden: table.hidden.includes(id)
          ? table.hidden.filter((item) => item !== id)
          : [...table.hidden, id],
      });
      return;
    }
    if (grouping.board === "project") {
      updateBoard({
        ...board,
        hiddenProjects: board.hiddenProjects.includes(id)
          ? board.hiddenProjects.filter((item) => item !== id)
          : [...board.hiddenProjects, id],
      });
      return;
    }
    const status = TASK_STATUSES.find((item) => item === id);
    if (status)
      updateBoard({
        ...board,
        hidden: board.hidden.includes(status)
          ? board.hidden.filter((item) => item !== status)
          : [...board.hidden, status],
      });
  };
  const openMenu = (kind: Menu["kind"], anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect();
    setMenu({ kind, x: rect.left, y: rect.bottom + 4 });
  };

  const filteredEmpty = tasks.length > 0 && visible.length === 0;
  const body =
    loading && tasks.length === 0 ? (
      <div className="flex justify-center py-10 text-content/40">
        <LoaderCircle
          aria-label="Loading tasks"
          className="size-4 animate-spin"
          strokeWidth={1.75}
        />
      </div>
    ) : error && tasks.length === 0 ? (
      <p role="alert" className="px-4 py-3 text-[12px] text-red-400/90">
        Could not load tasks: {error}{" "}
        <button
          type="button"
          className="underline hover:no-underline"
          onClick={() => void refresh()}
        >
          Retry
        </button>
      </p>
    ) : tasks.length === 0 ? (
      <EmptyState>
        No tasks yet. Capture a selection from a transcript, or create one here.
      </EmptyState>
    ) : filteredEmpty ? (
      <EmptyState>
        No tasks match these filters
        <button
          type="button"
          onClick={() => setFilters({})}
          className="mt-2 h-7 rounded-md px-3 text-[12px] text-content/70 hover:bg-content/10 hover:text-content"
        >
          Reset filters
        </button>
      </EmptyState>
    ) : view === "list" ? (
      <TaskList
        tasks={visible}
        groupBy={grouping.list}
        collapsed={listCollapsed}
        selectedId={selected?.id ?? null}
        marks={marks}
        onSelect={setSelectedId}
        onTagClick={addTagFilter}
        onToggleGroup={toggleListGroup}
      />
    ) : view === "table" ? (
      <TaskTable
        tasks={visible}
        state={table}
        groupBy={grouping.table}
        selectedId={selected?.id ?? null}
        marks={marks}
        onStateChange={updateTable}
        onSelect={setSelectedId}
        onTagClick={addTagFilter}
        onStatusChange={changeStatus}
      />
    ) : (
      <TaskBoard
        tasks={visible}
        state={board}
        groupBy={grouping.board}
        selectedId={selected?.id ?? null}
        marks={marks}
        onStateChange={updateBoard}
        onSelect={setSelectedId}
        onTagClick={addTagFilter}
        onSaved={patchTask}
      />
    );

  return (
    <div
      ref={root}
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
        {besideRail ? null : (
          <OverlayNav onBack={onClose} onToggleSidebar={onToggleSidebar} />
        )}
        <div className="flex min-w-0 flex-1 items-center gap-2 px-3 text-[13px]">
          <CheckCircle
            className="size-3.5 shrink-0 text-content/45"
            strokeWidth={1.75}
          />
          <span className="min-w-0 truncate text-content">Task Manager</span>
          {loading && tasks.length === 0 ? null : (
            <ResultCount
              shown={visible.length}
              total={tasks.length}
              filtered={hasActiveFilters(filters)}
              noun="tasks"
            />
          )}
        </div>
        {IS_MAC ? null : <WindowControls />}
      </div>
      <TasksToolbar
        filters={filters}
        tasks={tasks}
        projects={projects}
        showColumns={view !== "list"}
        columnsOpen={menu?.kind === "columns"}
        onChange={setFilters}
        onOpenColumns={(anchor) => openMenu("columns", anchor)}
        leading={
          <NewTaskButton
            creating={creating}
            menuOpen={menu?.kind === "create"}
            onCreate={() =>
              void create(cwd && looksLikeProject(cwd) ? cwd : undefined)
            }
            onChooseLocation={(anchor) => openMenu("create", anchor)}
          />
        }
        trailing={
          <>
            <SearchableSelect
              variant="pill"
              label="Group tasks"
              value={grouping[view]}
              options={GROUP_OPTIONS[view]}
              searchable={false}
              align="end"
              onChange={changeGrouping}
            />
            <TasksViewSwitch view={view} onChange={saveView} />
          </>
        }
      />
      {menu ? (
        <ExplorerMenu
          x={menu.x}
          y={menu.y}
          ariaLabel={
            menu.kind === "create"
              ? "Choose where the task is filed"
              : "Choose visible columns"
          }
          header={
            menu.kind === "create" ? (
              <p className="px-2 py-1 text-[11px] text-content/50">
                File task under…
              </p>
            ) : undefined
          }
          items={menuItems}
          onPick={onPickMenu}
          onClose={() => setMenu(null)}
        />
      ) : null}
      {error && tasks.length > 0 ? (
        <p
          role="alert"
          className="shrink-0 px-4 py-1 text-[12px] text-red-400/90"
        >
          Could not refresh tasks: {error}{" "}
          <button
            type="button"
            className="underline hover:no-underline"
            onClick={() => void refresh()}
          >
            Retry
          </button>
        </p>
      ) : null}
      {actionError ? (
        <p
          role="alert"
          className="shrink-0 px-4 py-1 text-[12px] text-red-400/90"
        >
          {actionError}
        </p>
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{body}</div>
        {selected ? (
          <TaskPeekPane
            task={selected}
            recents={recents}
            cwd={cwd}
            onClose={closePeek}
            onDelete={remove}
            onOpenSource={onOpenSource}
            onOpenBeside={onOpenBeside}
          />
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
      <CheckCircle className="mb-3 size-6 text-content/30" strokeWidth={1.75} />
      <div className="flex flex-col items-center text-[13px] text-content/45">
        {children}
      </div>
    </div>
  );
}

/**
 * Primary "New task" split button: the main part files the task under the
 * current project (or Personal); the chevron chooses where it is filed.
 */
function NewTaskButton({
  creating,
  menuOpen,
  onCreate,
  onChooseLocation,
}: {
  creating: boolean;
  menuOpen: boolean;
  onCreate: () => void;
  onChooseLocation: (anchor: HTMLElement) => void;
}): ReactNode {
  return (
    <div className="flex h-7 shrink-0 items-stretch overflow-hidden rounded-md bg-content text-background-base">
      <button
        type="button"
        title="New task"
        aria-label="New task"
        disabled={creating}
        onClick={onCreate}
        className="inline-flex items-center gap-1.5 pl-2.5 pr-2 text-[12px] font-medium transition-colors duration-100 hover:bg-background-base/10 active:bg-background-base/20 disabled:opacity-60"
      >
        {creating ? (
          <LoaderCircle
            aria-hidden
            className="size-3.5 animate-spin"
            strokeWidth={1.75}
          />
        ) : (
          <Plus aria-hidden className="size-3.5" strokeWidth={1.75} />
        )}
        New task
      </button>
      <span aria-hidden className="my-1.5 w-px bg-background-base/20" />
      <button
        type="button"
        title="Choose where the task is filed"
        aria-label="Choose where the task is filed"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        disabled={creating}
        onClick={(event) => onChooseLocation(event.currentTarget)}
        className="grid w-6 place-items-center transition-colors duration-100 hover:bg-background-base/10 active:bg-background-base/20 disabled:opacity-60"
      >
        <ChevronDown aria-hidden className="size-3.5" strokeWidth={1.75} />
      </button>
    </div>
  );
}
