# Tasks: Notes parity, List / Table / Board views, peek pane, open beside session — spec

- Tier: complex (persistence of view state, optimistic async status moves, pointer drag, workspace snapshot schema)
- Snapshot: `bee3eea` on `claude/tasks-ui-review-views-u5xmmg`, 2026-10-02 · Status: draft
- If `git rev-parse --short HEAD` is not `bee3eea`, diff `bee3eea..HEAD` for the files listed in "Implementation plan" before starting and report any conflict.

## Goal and user story

As a MonoCode user I keep Tasks next to my agent sessions. Today the Tasks screen looks like a settings form and does not match Notes. I want:

1. Tasks to use the same visual language as Notes (header, toolbar, cards, editor, tabs, project marks, empty and loading states).
2. No task sidebar. The whole Tasks surface is one main view with three modes of the same filtered tasks: List (default, full-width rows), Table (grouped by status, resizable/sortable/hideable columns) and Board (Kanban by status, drag a card to change its status).
3. In every mode, clicking a task opens it in a resizable peek pane on the right without leaving the view.
4. The existing session Kanban is renamed "Session board", fills the full width of the window, and uses the same toolbar, column and header styling as the Tasks Board.
5. From any task, "Open beside session" opens the task as a tab in the session workspace (like Release Notes), so I can keep it next to the agent working on it.

## Scope

- Rebuild `src/features/tasks/ui/TasksView.tsx` and split it into small components.
- Extract shared pieces out of Notes (project marks, Preview/Source tab strip) and use them in both Notes and Tasks with no visible change to Notes.
- New Task workspace tab type (`FilePaneTab.task`), persisted in the workspace snapshot.
- View state persistence in `localStorage`.
- Tests for every acceptance criterion below.

## Out of scope

- Any change to the Rust tasks table or commands (`src-tauri/src/tasks.rs`). No manual card ordering; within a status, order is the active sort (default `updatedAt` desc).
- Session board behavior: card status rules (`sessionBoard.ts`), open/hide session pane, the board/session split resize, clearing cards. Only its name, icon, layout width and styling change (AC-31 to AC-34).
- Image drop/paste in task bodies, "Add to chat" for tasks, priority/due date fields.
- Operator / `tasks.*` CLI behaviour (`src/features/agent-app/**`, `src-tauri/src/control_cli.rs`).
- New npm dependencies. Do not install a table or drag-and-drop library (see Decisions).

## Current behavior (confirmed in source at `bee3eea`)

- `TasksView` (`src/features/tasks/ui/TasksView.tsx:39-334`) renders a fixed `w-72` aside (`:152`), four filter rows with native `<select>`s (`:153-268`), hand-rolled cards (`:289-311`), and `TaskEditor` (`:336-530`).
- Shared `control` class `:35` boxes every control; it is the main visual mismatch.
- Selection falls back to `visible[0]` when the selected task is filtered out (`:97-98`). Notes keeps the selection (`src/features/notes/ui/NotesView.tsx:219-222`).
- Escape handler `:87-95` closes the view unless `event.defaultPrevented`.
- `TaskEditor` saves partial changes through `updateTask(id, changes)` (`:367-393`), debounced 400 ms, flushed on unmount (`:394-404`). `updateTask` (`src/features/tasks/tasks.ts:139-166`) is serialized per task id and merges the changes onto the latest row from `tasks_get`, so concurrent partial edits of different fields from two editors do not overwrite each other. `deleteTask` is serialized the same way (`:167-172`).
- Every write dispatches `TASKS_CHANGED_EVENT` (`tasks.ts:96-99`); `TasksView.refresh` reloads on it (`TasksView.tsx:78-86`), with a request counter to drop stale loads (`:63-77`).
- `filterTasks` (`tasks.ts:57-94`) applies statuses, tags (all/any), project (null = Personal) and query, sorted `updatedAt` desc then id.
- Notes reference implementation: resizable list with `useDragResize` (`NotesView.tsx:131-139`, separator `:409-418`), `NoteCard` (`:542-622`), `NoteProjectMark` / `NotePersonalMark` (`:469-513`, not exported), header meta row (`:916-946`), Preview/Source underline tabs + `MarkdownCopyButton` (`:515-540`, `:1015-1033`), `peekNotes()` cache (`:140-141`), `ExplorerMenu` create menu "File note under…" (`:229-277`, `:356-370`), spinner and icon empty states (`:376-407`, `:639-646`).
- Tasks is mounted in `src/app/App.tsx:11764-11780`. When Tasks is open the session workspace stays mounted but is `hidden`, `aria-hidden` and `inert` (`App.tsx:11493-11518`). So a task tab in the workspace and a Tasks peek editor can be mounted at the same time.
- Virtual workspace tab precedent: Release Notes. Type `FilePaneTab.releaseNotes` (`src/features/workspace/model/layout.ts:71`), factory `newReleaseNotesWorkspaceTab` (`:239-257`), guard `isReleaseNotesTab` (`:508-512`), `isVirtualDocumentTab` (`:530-537`), `editorTabKey` (`:620-633`), `isPreviewableTab` (`:652-661`), snapshot sanitizer (`src/features/workspace/model/workspaceSnapshot.ts:561-661`, `sanitizeReleaseNotes :742-747`), tab title (`src/features/workspace/ui/SurfaceTabs.tsx:115-125`), render (`src/features/files/ui/FilePane.tsx:212-213`), tab-group summary titles (`App.tsx:12066-12085`).
- File open flow to mirror for "Open beside session": `onOpenFile` (`App.tsx:5950-6030`) with its two branches (`loadFileTabMode() === "workspace"` → `openWorkspaceFile` + `newEditorWorkspaceTab`; otherwise `openEditorTab(tab, file, { split, pin })`).
- Drag in this app is pointer-based (`src/features/workspace/model/paneDrop.ts`, `SurfaceTabs.tsx:296`). HTML5 drag-and-drop is not used; Tauri's native drag-drop handler is on (Notes uses `getCurrentWebview().onDragDropEvent`), which interferes with HTML5 DnD in WebView2 on Windows.
- Tests: vitest, `src/**/*.test.ts` only, happy-dom via `// @vitest-environment happy-dom`, React rendered with `createElement` (see `src/features/tasks/ui/TasksView.test.ts:1-120` for the `invoke` mock harness). No ESLint config exists in the repo.

## Proposed behavior and invariants

Invariants:

- I1. The UI never writes a full task record. Every edit goes through `updateTask(id, partialChanges)` or `deleteTask(id)`.
- I2. All three views render the same list: `filterTasks(tasks, filters)` then the view's own grouping/sorting. Filters are shared and survive view switches.
- I3. The selected task id survives filter changes and view switches. If the selected task no longer exists in `tasks` (deleted anywhere), selection becomes null and the peek closes.
- I4. Notes looks and behaves exactly as before. Its tests pass unchanged.
- I5. A status move started from the Board is shown immediately, and the card ends in the status of the latest move the user made, whatever order the writes finish in. A failed latest move reverts the card to the persisted status and shows an error.
- I6. Persisted UI state that is missing, unreadable or invalid falls back to defaults without throwing. Every `localStorage` access is in `try/catch`.
- I7. Only Tailwind classes, except `style` for runtime-computed sizes (column widths, pane widths, the drag ghost position), which is the existing pattern (`NoteSource`, `useDragResize`).

### Layout

```
h-10 header : [nav] ✓ Tasks ············ [List|Table|Board] [+][▾] [window controls]
h-9 toolbar : [⌕ Filter tasks] [Status ▾] [Project ▾] [Tag ▾] [Columns ▾ (Table/Board)] [Reset]
(optional)  : #tag ✕  #tag ✕  [Match all | any]        ← only when tag filters are set
body        : List  → [full-width rows ······ | peek (when a task is selected)]
              Table → [table ················ | peek (when a task is selected)]
              Board → [columns ·············· | peek (when a task is selected)]
```

There is no task sidebar in any mode. The main view shows every task; the peek pane is the only detail surface inside Tasks.

## States and transitions

| State | Event | Next state | User sees |
|---|---|---|---|
| Loading, no cache | `tasks_list` resolves | Ready | Spinner replaced by list/table/board |
| Loading, cache from earlier mount | mount | Ready (refreshing) | Cached tasks at once, no spinner |
| Loading | `tasks_list` rejects, no tasks | Error | `Could not load tasks: <msg>` + Retry |
| Ready | `tasks_list` rejects while tasks shown | Ready + banner | Existing rows stay; banner `Could not refresh tasks: <msg>` + Retry |
| Ready, 0 tasks | — | Empty | Icon + `No tasks yet. Capture a selection from a transcript, or create one here.` |
| Ready, filters hide all | — | Filtered empty | `No tasks match these filters` + `Reset filters` button |
| Any view, none selected | click/Enter on a task | Peek open | Peek shows `TaskEditor` |
| Peek open | Escape (focus not in a menu) | Peek closed | Focus returns to the task's row/card |
| Peek open | `×` | Peek closed | same |
| Peek open | task deleted (here or Operator) | Peek closed | row/card disappears |
| Any | Escape, no peek, no open menu | View closed | `onClose()` |
| Board idle | pointer down + move ≥ 4 px on a card | Dragging | Ghost follows pointer; target column highlighted |
| Dragging | pointer up over another visible column | Moving (optimistic) | Card in new column at once |
| Dragging | pointer up over same column / outside / Escape / pointercancel | Board idle | Card stays |
| Moving | `updateTask` resolves (latest request for that id) | Board idle | No change |
| Moving | `updateTask` rejects (latest request for that id) | Board idle + error | Card returns to persisted status; banner `Could not move "<title>": <msg>` |
| Any | "Open beside session" | Workspace | Tasks closes; task tab focused in workspace |

## Acceptance criteria

List view and Notes parity

- AC-1 List is the default view. It is a full-width `<ul aria-label="Tasks">` inside an `overflow-y-auto` container, flat (not grouped), in `filterTasks` order (`updatedAt` desc). It uses `SharedHoverHighlight` with `data-shared-hover-continuity` on the list and `data-shared-hover-item` on rows, like Notes (`NotesView.tsx:375, 389-406`).
- AC-2 Each List row is a `<button>` (`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left`, active `bg-selection text-content`, else `text-content/80 hover:bg-content/5 hover:text-content`, `aria-current="true"` when selected) containing, left to right: `TaskStatusIcon` (AC-12); a `min-w-0 flex-1` block with the title (`line-clamp-1 text-[13px] font-semibold text-content`) and the `notePreview` (`line-clamp-1 text-[12px] text-content/45`, omitted when empty); up to 3 tag chips + `+N` (chip classes from `NotesView.tsx:607-617`, hidden below `md`); the project or Personal mark (`text-[11px] text-content/50`, `max-w-40`); relative time from `formatRelativeTime` (`shrink-0 text-[11px] tabular-nums text-content/45`). When the peek is open, rows keep the same content and truncate.
- AC-3 The editor uses the Notes editor structure (`NotesView.tsx:909-1089`). `TaskEditor` has two variants: `full` (used by the workspace task tab, AC-29) with container `mx-auto flex w-full max-w-5xl flex-col gap-5 px-8 py-8`, and `compact` (used by the peek, AC-24) with `flex flex-col gap-4 px-6 py-5` and no max width. Both variants have: meta row `CheckCircle` + `Task` + project mark + `SearchableProjectPicker` (move, `itemKind="task"`) + `TaskStatusMenu` (AC-12); title input `text-[20px] font-semibold leading-tight`, Enter blurs; `Updated <relative time>` and, when set, `Completed <relative time>`; `NoteTagsEditor` (label `Add task tag`); actions row: `Open source session` (only when `sourceSessionId`), `Open beside session`, `Delete` with the exact Notes delete button classes (`NotesView.tsx:982-994`); error row `Could not save task: <msg>` + `Retry`; then the shared Preview/Source tab strip with copy button (AC-6) and the body. The separate "Move to Personal" button and the plain project text are removed; the picker already offers Personal.
- AC-4 Creating: the header has a ghost `+` button (`aria-label="New task"`, files under the current project when `cwd` looks like a project, else Personal) and a chevron button (`aria-label="Choose where the task is filed"`) that opens `ExplorerMenu` with header `File task under…` and the same choices as Notes (`noteProjectChoices(cwd, loadRecents())`). While creating, `+` shows `LoaderCircle animate-spin` and both are disabled. After creating: filters reset, the new task is selected (List: in editor; Table/Board: in peek), and the editor opens in Source mode with the body textarea autofocused, same as today (`TasksView.tsx:396`, `:518`).
- AC-5 Loading uses a module cache like `peekNotes`: add `peekTasks()` / cache update in `tasks.ts` (AC-states table). The first mount shows the spinner (`LoaderCircle size-4 animate-spin`); later mounts show cached rows immediately.
- AC-6 Extract `MarkdownDetailTabs` (Notes' `NoteDetailTab` strip + `MarkdownCopyButton`, `NotesView.tsx:515-540, 1015-1033`) and use it in Notes and Tasks. Notes renders identically (existing Notes tests pass unchanged).
- AC-7 Extract `ProjectMark` and `PersonalMark` (from `NoteProjectMark` / `NotePersonalMark`) plus a `useProjectMarks()` hook, used by Notes and Tasks. Notes renders identically.
- AC-8 Given a selected task, when a filter hides it or the view mode changes, the peek stays open on that task (Notes keeps a filtered-out selection too, `NotesView.tsx:219-222`). Given the selected task is deleted (from the peek or by the Operator), selection is cleared and the peek closes. Selection is not persisted across mounts; the view opens with the peek closed.
- AC-9 Escape: when the project picker, a `SearchableSelect`, an `ExplorerMenu` or the tag input handles Escape, Tasks stays open (mirror the Notes test "closes the project menu with Escape without leaving Notes", `NotesView.test.ts:229-247`). Implement like Notes: ignore when `event.defaultPrevented` or when any Tasks-owned menu is open (ref), then close peek if open, else `onClose()`; call `preventDefault()` and `stopPropagation()` when handled.

Toolbar and filters

- AC-10 A single `h-9` toolbar row under the header, borderless like the Notes list header: search input (`aria-label="Filter tasks"`, placeholder `Filter tasks`, `Search` icon inside), then three `SearchableSelect` with `variant="pill"`: `Status` (options `All statuses` + 7 labels), `Project` (`All projects`, `Personal`, then project names), `Tag` (`Add tag filter…` placeholder, options = all distinct tags in `tasks`, choosing one appends it to `filters.tags`). `Reset` text button appears only when any filter is set. No native `<select>` remains in `src/features/tasks/**`.
- AC-11 When `filters.tags` is non-empty, a second row shows each tag as a chip (`#tag` + remove button `aria-label="Remove tag filter #tag"`) and, when 2 or more tags, a two-option segmented toggle `Match all` / `Match any` bound to `filters.tagMatch`. Clicking a tag chip on a card/row adds that tag to the filter (and does not select the task).

Status system

- AC-12 `TaskStatusIcon` maps each status to an icon and a text color class, used everywhere a status appears:
  | status | icon | class |
  |---|---|---|
  | draft | `CircleDashed` | `text-content/40` |
  | todo | `CircleDot` | `text-content/60` |
  | in_progress | `Loader` | `text-sky-400` |
  | blocked | `CircleAlert` | `text-red-400` |
  | review | `Eye` | `text-amber-400` |
  | completed | `CheckCircle` | `text-emerald-400` |
  | deferred | `Clock` | `text-content/40` |
  Icons use `strokeWidth={1.75}` and `aria-hidden`; the label is always present as text or `aria-label`. `TaskStatusMenu` is a ghost button (icon + label) opening `ExplorerMenu` with the 7 statuses (`checked` on current); picking calls `updateTask(id, { status })` immediately. Used in the editor meta row, table Status cell and board card.

View switcher and persistence

- AC-13 Header segmented control `role="tablist"` `aria-label="Tasks view"` with three `role="tab"` buttons with icon + text: `List` (`ListBullet`), `Table` (`PanelTop`), `Board` (`DashboardSquare`). Do not use `PanelLeft`; the sidebar toggle uses it. Styling copies `MarkdownModeToggle`'s segmented pill (`src/features/sessions/ui/MarkdownModeToggle.tsx:34-45`). ArrowLeft/ArrowRight move between tabs. Default `list`.
- AC-14 Persist in `localStorage`, read once on mount, validated by hand (no zod in the repo):
  - `monocode.tasks.view`: `"list" | "table" | "board"`.
  - `monocode.tasks.peekWidth`: number, clamped on read.
  - `monocode.tasks.table`: `{ widths: Record<ColumnId, number>, hidden: ColumnId[], sort: { column: ColumnId, dir: "asc" | "desc" }, collapsed: TaskStatus[] }`.
  - `monocode.tasks.board`: `{ columnWidth: number, hidden: TaskStatus[] }`.
  Unknown keys, wrong types, unknown column ids or statuses are dropped individually; out-of-range numbers are clamped. Filters are not persisted (same as today).

Table

- AC-15 Semantic `<table>` with `table-fixed` and a `<colgroup>` whose `<col>` widths come from state. Columns (id, header, default width, min): `title` Title 320/200 (cannot be hidden), `status` Status 140/110, `project` Project 170/120, `tags` Tags 200/100, `updated` Updated 120/90, `completed` Completed 130/90 (hidden by default). Rows are grouped by status in `TASK_STATUSES` order; each group is a `<tbody>` with a header row containing a button (`aria-expanded`, label `<Status label> <count>`) that collapses the group. Groups with 0 rows are not shown.
- AC-16 Each header cell (except when hidden) has a resize handle (`role="separator"`, `aria-orientation="vertical"`, `aria-label="Resize <Header> column"`, focusable). Pointer drag changes that column width, clamped to its min and 640; ArrowLeft/ArrowRight change it by 16 px; double-click resets to default. Width is committed to state and storage on pointerup/keyup only.
- AC-17 Clicking a header label sorts by that column: first click `asc` (for `updated`/`completed` first click `desc`), second click flips. Sorting applies within each status group. Tie-breaker is `id` asc. `aria-sort` set on the sorted header. Default sort `updated desc`.
- AC-18 A `Columns` toolbar button (`SlidersHorizontal` icon, `aria-label="Choose visible columns"`) opens `ExplorerMenu` with checked items for each hideable column.
- AC-19 Row: the title cell holds a `<button>` with the title; clicking anywhere on the row except interactive children (status menu, tag chips, source button) selects the task and opens the peek. The selected row has `bg-selection` and `aria-selected="true"`. Row height `h-9`, text `text-[12px]`, header `text-[11px] text-content/50`, no outer borders, row hover `hover:bg-content/5`, group header sticky under the table header.

Board

- AC-20 One column per visible status in `TASK_STATUSES` order. Default hidden: `draft`, `deferred`. The `Columns` toolbar button in Board view toggles status visibility (same menu component). Column header: `TaskStatusIcon` + label + count. Columns use the shared `BoardColumns` layout (AC-33): they grow to fill the available width; the user-adjustable value is the minimum column width (default 260, min 220, max 400), changed by a handle on the right edge of every column header (same keyboard/double-click rules as AC-16) and persisted as `columnWidth`. When the minimums do not fit, the board scrolls horizontally inside its own container.
- AC-21 Card (`button`, rounded-md, `bg-content/3`, `hover:bg-content/5`, `px-2.5 py-2`, selected `bg-selection`): title `line-clamp-2 text-[13px] font-medium`, then a row with project/Personal mark, tags (max 2 + `+N`) and relative updated time, and `TaskStatusMenu` as an icon-only trigger on hover/focus (top-right). Click or Enter opens the peek.
- AC-22 Pointer drag (no HTML5 DnD, no new library): pointerdown with button 0 on a card (not on its status menu) records the start point; when the pointer moves 4 px or more, dragging starts: `setPointerCapture`, a fixed-position ghost copy of the card follows the pointer (`style.transform`), the source card gets `opacity-40`, text selection is suppressed with `suppressTextSelection()` from `src/shared/lib/drag.ts` (call its returned restore function when the drag ends), and `document.body.style.cursor` is set to `grabbing` and restored to its previous value when the drag ends, exactly as `useDragResize` does for `col-resize` (`src/shared/hooks/useDragResize.ts`). The target is the nearest ancestor with `data-task-column="<status>"` of `document.elementFromPoint(x, y)`, highlighted with `bg-content/5 ring-1 ring-accent/40`. On pointerup over a different column, perform the optimistic move (AC-23). Escape or `pointercancel` cancels. The click that follows a drag must not open the peek.
- AC-23 Optimistic move ordering (see Ordering contracts): the card appears in the new column immediately; on failure of the latest move for that task it returns to its persisted status and the board shows `Could not move "<title>": <msg>` with a dismiss button. Keyboard users move a card via its `TaskStatusMenu`.

Peek pane

- AC-24 In every view mode, when a task is selected, a right pane renders `TaskEditor` in its `compact` variant (AC-3). Width via `useDragResize({ direction: "left", min: 360, max: () => Math.min(720, Math.round(window.innerWidth * 0.6)), defaultWidth: 440 })`, separator on its left edge `aria-label="Resize task panel"`, persisted to `monocode.tasks.peekWidth`. The pane header (`h-9`, border-b) has `Open beside session` (icon `PanelRight`, `aria-label="Open beside session"`) and close (`X`, `aria-label="Close task panel"`).
- AC-25 Switching the selected task while the peek has unsaved edits flushes them (existing `TaskEditor` unmount flush, `key={task.id}`); nothing is lost (test with fake timers before the 400 ms debounce).

Open beside session

- AC-26 New `FilePaneTab.task?: { taskId: string; title: string }`. Factory `newTaskTab(task)` returns `{ id: uuid, path: "task:<taskId>", cwd: task.projectCwd ?? "~", ...(projectCwd ? { projectCwd } : {}), task: { taskId, title } }`. `isTaskTab`, `isVirtualDocumentTab` includes it, `editorTabKey` returns `task:<taskId>`, `isPreviewableTab` excludes it.
- AC-27 The snapshot keeps task tabs across restart: `sanitizeTask` accepts only a non-empty string `taskId` (≤ 200 chars) and a string `title` (trimmed, ≤ 200, fallback `Task`); a `task` key that fails validation drops the file (like `releaseNotes`); a `task` combined with `plan`, `releaseNotes`, `commit`, `sessionChanges`, `diff`, `review`, `changes` or `terminal` drops the file.
- AC-28 `SurfaceTabs` shows the task title with icon name `task.md` and tooltip `Task: <title>`; the tab-group summary in `App.tsx:12066-12085` uses `task:<taskId>` as the dedupe key and the task title as label.
- AC-29 `FilePane` renders `TaskTabSurface` for task tabs: it loads the task with `getTask(taskId)`, reloads on `TASKS_CHANGED_EVENT` (ignore stale loads with a counter), shows the full-size `TaskEditor`, a spinner while the first load is pending, `This task was deleted.` when `getTask` returns null, and `Could not load task: <msg>` + `Retry` on rejection. `onOpenSource` from inside the tab uses the same App handler as the Tasks view.
- AC-30 `Open beside session` (editor action row and peek header) calls a new App handler `onOpenTaskBeside(task)`: it closes the records view (`setRecordsViewOpen(false)`) and opens `newTaskTab(task)` pinned, mirroring `onOpenFile` (`App.tsx:5950-6030`): workspace tab mode → `openWorkspaceFile(prev, file, newEditorWorkspaceTab(file), insertBesideActive…, true, { dirtyFileIds })` then activate; otherwise `openEditorTab(activeTab, file, { split: "right", pin: true, dirtyFileIds })`; when there is no active tab, append `newEditorWorkspaceTab(file)` and activate it. If a tab for the same task is already open anywhere, it is focused instead of duplicated (guaranteed by `editorTabKey`; test it). Pending edits in the Tasks editor are flushed by its unmount when the records view closes.

Session board rename

- AC-31 Every user-facing "Kanban" for the session board becomes `Session board`, and its icon changes from `PanelLeft` to `MessageMultiple`: `src/app/shell/Sidebar.tsx:2484` (IconButton label) and `:2676` (CompactRailAction label), `src/app/shell/ProjectRail.tsx:427` (label and ariaLabel), `src/app/shell/TitleBar.tsx:890`, `src/app/shell/MenuBar.tsx:346` (menu label), and `src/features/session-board/ui/SessionBoardView.tsx` header text (`Kanban` → `Session board`) and region `aria-label` (`Session Kanban` → `Session board`). Internal names stay unchanged to keep the diff small: `onOpenKanban`, `kanbanActive`, `recordKind "kanban"`, `data-app-kanban`, menu id `open_kanban`, `monocode.boardWidth`. Search `src` for any other visible "Kanban" string and include it in the report.

Session board layout and styling

- AC-32 Root cause of the width bug: each session column is a fixed `w-64 shrink-0` (`SessionBoardView.tsx`, the `<section aria-label="<label> column">` element), so six columns stop at about 1,620 px and leave an empty band on wider windows. Given a window wider than the sum of column minimums, when the Session board is open with no session pane, then the columns together fill the full width of the board area with equal widths and no empty band on the right. Given the session pane is open, the columns fill the board side of the split (`width%`) the same way. Given a narrow window, columns keep their minimum width (256 px) and the board scrolls horizontally inside its container; the page itself never scrolls horizontally.
- AC-33 New shared layout `src/shared/ui/board/BoardColumns.tsx` used by both boards: `BoardColumns` (horizontal `flex h-full min-h-0 min-w-0 gap-3 overflow-x-auto p-3` container) and `BoardColumn` props `{ id, label, icon?: ReactNode, count, minWidth, actions?: ReactNode, highlighted?: boolean, children, columnProps?: HTMLAttributes }`. A column is `<section aria-label="<label> column">` with classes `flex min-h-0 flex-1 basis-0 flex-col rounded-lg bg-content/3` and `style={{ minWidth }}`; `highlighted` adds `bg-content/5 ring-1 ring-accent/40 transition-colors duration-100`. Header `flex h-9 shrink-0 items-center gap-2 px-3 text-[12px] font-medium` with icon, label, count (`text-content/45 tabular-nums`) and the `actions` slot pushed right; body `min-h-0 flex-1 overflow-y-auto px-1.5 pb-1.5`. The optional resize handle is part of the Tasks Board only (passed through `actions`/an absolutely positioned child, Tasks-owned). Keep the existing `aria-label="<label> column"` text so current tests and selectors keep working.
- AC-34 Session board header and toolbar match Tasks (AC-10, AC-13): header title uses icon `MessageMultiple` + `Session board` with the Notes header markup; the `Back to workspace` button becomes a ghost button (`h-7 rounded-md px-2.5 text-[12px] text-content/70 hover:bg-content/10 hover:text-content`), same copy. The toolbar is one borderless `h-9` row: search input (`aria-label="Search board"`, placeholder unchanged, `Search` icon inside), `SearchableSelect variant="pill"` for project (`label="Board project"`, `All projects` + names) and status (`label="Board status"`, `All statuses` + `BOARD_COLUMNS` labels), `Reset` text button shown only when a filter is set (copy changes from `Reset filters` to `Reset`), and `Hide session pane` as a ghost button on the right when the pane is open. Delete the local `control` constant; no native `<select>` remains in `src/features/session-board/**`. Cards keep `SessionCard`; replace the card wrapper border `border border-stroke` with `rounded-md bg-background-base/60 hover:bg-content/5` and keep `data-board-card`. Error banner copy unchanged.

## Ordering contracts

1. Load: `refresh()` increments `refreshId`; it applies the result only if it is still the latest and the view is mounted (existing). It also writes the module cache used by `peekTasks()`.
2. Editor save (existing, unchanged): edit → `editsRef` → debounce 400 ms → `updateTask(id, snapshot)` (serialized per id, merged with the latest durable row) → clear only fields whose value still equals the snapshot → refresh via event. Unmount flushes. Delete sets `deletingRef` first so a pending save is skipped; `deleteTask` is queued behind pending saves.
3. Board move (new, owned by `TaskBoard` via a hook `useOptimisticStatus`):
   - On drop: `token = ++seq[id]`; `override[id] = { status, token }` (render uses override over the persisted status); call `updateTask(id, { status })`.
   - On resolve: if `seq[id] === token`, delete `override[id]`. The refresh from `TASKS_CHANGED_EVENT` carries the persisted status. If a newer token exists, do nothing.
   - On reject: if `seq[id] === token`, delete `override[id]` (card returns to persisted status) and set the error banner. If a newer token exists, ignore this failure (the newer request's result decides).
   - Out-of-order walkthrough A: move X to Review (t1), then to Blocked (t2). `updateTask` serializes, so t1 writes then t2 writes; t1 resolves → `seq=2` → ignored; t2 resolves → override cleared → persisted Blocked. Card never flickers back to Review.
   - Walkthrough B: t1 rejects, t2 pending → t1 ignored, card stays Blocked until t2 settles.
   - Walkthrough C: task deleted (Operator) while a move is pending → `updateTask` rejects `Task was not found` → if latest, override cleared, error shown; the task is gone after refresh, so the error banner names it by the title captured at drop time.
   - Unmount: overrides are component state; nothing to release. Results arriving after unmount are ignored (alive ref).
4. Peek width / column widths: drag writes DOM or local state only; storage write happens once on commit.
5. Task tab load: `TaskTabSurface` `loadId` counter; apply only latest; unmount sets alive=false.

## Implementation plan

Work in this order and keep the app compiling after each step. Commit after each numbered step with a clear message.

1. `src/features/projects/ui/ProjectMark.tsx` (new): move `NoteProjectMark` → `ProjectMark`, `NotePersonalMark` → `PersonalMark`, the `ProjectMarks` type, and add `useProjectMarks()` returning `{ logos: useTabGroupLogos(), mascots, colors, customColors }` (state initialised with the `load*` functions as Notes does at `NotesView.tsx:157-160`). Update `NotesView.tsx` to import them; replace the per-render `load*()` calls at `:923-929` with the hook values. No visual change.
2. `src/features/sessions/ui/MarkdownDetailTabs.tsx` (new): `MarkdownDetailTabs({ mode, onChange, markdown, label })` = the `NoteDetailTab` strip + `MarkdownCopyButton` from `NotesView.tsx:1015-1033`, `role="tablist"` `aria-label={label}`. Use it in `NotesView.tsx` (label `Note sections`) and delete `NoteDetailTab`.
3. `src/features/tasks/tasks.ts`: add a module cache (`let cachedTasks: Task[] | null`), `peekTasks()`, and make `loadTasks()` update the cache. Add `TASK_VIEW_IDS`, column ids and the storage readers/writers with validation in a new `src/features/tasks/taskViewState.ts` (pure, unit-tested). Add `sortTasks(tasks, sort)` and `groupTasksByStatus(tasks)` pure helpers there.
4. `src/features/tasks/ui/` split (new files): `TaskStatusIcon.tsx` (icon + `TaskStatusMenu`), `TaskRow.tsx` (List row), `TaskEditor.tsx` (moved from `TasksView.tsx:336-530`, restyled per AC-3, prop `variant: "full" | "compact"`, props `onOpenBeside`, `onOpenSource`, `onDelete`, `recents`, `cwd`), `TasksToolbar.tsx`, `TasksViewSwitch.tsx`, `TaskList.tsx` (List view), `TaskTable.tsx`, `TaskBoard.tsx` (built on the shared `src/shared/ui/board/BoardColumns.tsx` from AC-33; create that file first, in this step), `useOptimisticStatus.ts`, `TaskPeekPane.tsx`, `TaskTabSurface.tsx`. `TasksView.tsx` keeps loading, filters, selection, view state and composition only. Delete the `control` constant.
5. `TasksView` props: add `onOpenBeside: (task: Task) => void`. Keep existing props.
6. Workspace (`layout.ts`, `workspaceSnapshot.ts`, `SurfaceTabs.tsx`, `FilePane.tsx`): AC-26 to AC-29. `FilePane` needs `onOpenTaskSource` passed down the same way other callbacks reach it; find the prop chain from `App.tsx` and add one optional prop. If threading is wide, use a small context `TaskTabActionsContext` provided in `App.tsx` around the workspace instead; choose the one with fewer touched files and say which in the report.
7. `App.tsx`: add `onOpenTaskBeside` (AC-30) next to `onOpenFile`; pass it to `TasksView` at `:11765`; reuse the existing `onOpenSource` closure body (`:11772-11778`) for task tabs; update the summary at `:12066-12085`.
8. Tests (see matrix), then the verification commands.

9. Session board rename, width fix and styling (AC-31, AC-32, AC-34). Behavior stays the same; existing `SessionBoardView.test.ts` cases keep their intent (update only the select interactions for `SearchableSelect` and the `Reset` copy).

Do not change: `src-tauri/**`, `src/features/session-board/sessionBoard.ts`, `useSessionBoard.ts` and the session-pane/split logic in `SessionBoardView.tsx` (only AC-31 to AC-34 change that file), `src/features/agent-app/**`, `filterTasks` semantics, `updateTask`/`deleteTask` serialization, the `TASKS_CHANGED_EVENT` dispatch in `upsertTask`/`deleteTask`, and the `tasks`/`task`/`saveTask`/`updateTask`/`deleteTask` host wiring in `App.tsx:9901-9905` (the Operator depends on all of these).

## UI details

- Load the `frontend-ui` skill. Follow the Notes file for tokens: `border-stroke`, `text-content/45|50`, `bg-selection`, ghost icon button `grid size-6 place-items-center rounded-md text-content/45 hover:bg-content/10 hover:text-content disabled:opacity-40`, text scale `text-[11px] / [12px] / [13px] / [20px]`, icons `strokeWidth={1.75}`.
- Header title: `CheckCircle` icon + `Tasks`, same markup as Notes header (`NotesView.tsx:429-446`).
- Exact copy: `Filter tasks`, `All statuses`, `All projects`, `Personal`, `Add tag filter…`, `Reset`, `Match all`, `Match any`, `New task`, `Choose where the task is filed`, `File task under…`, `Columns`, `Choose visible columns`, `Open beside session`, `Open source session`, `Delete`, `Close task panel`, `Resize task panel`, `No tasks yet. Capture a selection from a transcript, or create one here.`, `No tasks match these filters`, `Reset filters`, `Could not load tasks: `, `Could not refresh tasks: `, `Could not save task: `, `Could not move "<title>": `, `Could not load task: `, `This task was deleted.`, `Retry`, `Updated `, `Completed `.
- Motion: the peek pane mounts with `opacity-0 translate-x-2`, then a `requestAnimationFrame` sets an `entered` state that switches it to `opacity-100 translate-x-0`, with `transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none`. The drop-target column highlight uses `transition-colors duration-100`. No other new animation.
- Min widths: Table and Board scroll horizontally inside their own container (`overflow-auto`); the page never scrolls horizontally.

## Skills to load

`frontend-ui`, `testing` if available. Read `AGENTS.md`.

## Test matrix

All tests are `*.test.ts` with happy-dom and the existing `invoke` mock harness from `TasksView.test.ts`. Update existing Tasks tests that rely on native selects or removed copy; keep their intent.

| AC / risk | Level | File | Scenario |
|---|---|---|---|
| AC-1, AC-2 | feature | `TasksView.test.ts` | default view is List with no task sidebar; rows show status icon label, title, preview, tags, project mark, relative time, in updatedAt-desc order; row click opens peek |
| Operator | feature | `TasksView.test.ts` | with the view open in each mode, simulate an Operator `tasks.write` (update `rows`, dispatch `TASKS_CHANGED_EVENT`) → new status/title shown; Operator delete of the peeked task closes the peek |
| Operator | unit | `agentApp.tasks.test.ts` | existing tests unchanged and green |
| AC-31 | feature | `SidebarRename.test.ts` | update the "Kanban navigation" test to the new label; still opens below Automations |
| AC-32, AC-33 | feature | `SessionBoardView.test.ts` | every column `<section>` has `flex-1` and `basis-0` and a `min-width` style of 256px; with the pane open the board side keeps its `width%` style |
| AC-34 | feature | `SessionBoardView.test.ts` | existing filter test drives the two `SearchableSelect`s instead of native selects; `Reset` only visible with a filter; no `select` element in the container; header reads `Session board` |
| AC-3, AC-25 | feature | `TasksView.test.ts` | edit title, switch selection before 400 ms, assert `tasks_upsert` received the title |
| AC-4 | feature | `TasksView.test.ts` | `+` creates under project; chevron → "Personal" creates Personal; buttons disabled while pending (deferred promise) |
| AC-5 | feature | `TasksView.test.ts` | second mount shows cached task before `tasks_list` resolves (deferred) |
| AC-6, AC-7, I4 | feature | `NotesView.test.ts` | existing tests unchanged and green |
| AC-8 | feature | `TasksView.test.ts` | filter hides selected → peek still shows it; switch List→Board → peek still open; delete from peek → peek closes |
| AC-9 | feature | `TasksView.test.ts` | Escape in project picker and in status SearchableSelect keeps Tasks open; Escape with peek open closes peek only; Escape again calls onClose |
| AC-10, AC-11 | feature | `TasksView.test.ts` | combine search, status, project, two tags with all/any; chip removal; tag click on card adds filter without selecting; no `select` element in container |
| AC-12 | unit+feature | `TaskStatusIcon` via `TasksView.test.ts` | status menu changes status immediately (`tasks_upsert` with new status) |
| AC-13, AC-14 | unit | `taskViewState.test.ts` | valid, missing, malformed JSON, wrong types, unknown ids, out-of-range numbers, throwing `localStorage` |
| AC-13 | feature | `TasksView.test.ts` | switch view persists; remount restores; arrow keys move between view tabs |
| AC-15, AC-17 | unit+feature | `taskViewState.test.ts`, `TasksView.test.ts` | grouping order, empty groups hidden, collapse persists, sort asc/desc and tie-breaker, `aria-sort` |
| AC-16 | feature | `TasksView.test.ts` | keyboard resize ±16 clamped, double-click reset, persisted |
| AC-18 | feature | `TasksView.test.ts` | hide Tags column, remount, still hidden; Title not offered |
| AC-19, AC-24 | feature | `TasksView.test.ts` | row click opens peek; status-menu click in row does not |
| AC-20 | feature | `TasksView.test.ts` | Draft/Deferred hidden by default; toggle via Columns |
| AC-22 | feature | `TasksView.test.ts` | dispatch pointerdown/pointermove/pointerup with mocked `document.elementFromPoint`; < 4 px is a click; Escape cancels; no peek after drag |
| AC-23, I5 | feature | `TasksView.test.ts` | deferred `tasks_upsert`: walkthroughs A, B, C from Ordering contracts |
| AC-26, AC-27 | unit | `layout.test.ts`, `workspaceSnapshot.test.ts` | tab key, previewable false, snapshot round-trip, invalid and conflicting `task` dropped |
| AC-28 | unit | `SurfaceTabs.test.ts` | presentation title/icon/tooltip |
| AC-29 | feature | new `TaskTabSurface.test.ts` | loading, loaded edit saves, deleted state, error + retry, reload on event, stale load ignored |
| AC-30 | unit | `layout.test.ts` | `openWorkspaceFile`/`openEditorTab` with a task tab twice focuses the existing tab |

## Verification

Implementer runs (install first: `npm ci`):

- `npx tsc --noEmit`
- `npx vitest run src/features/tasks src/features/notes src/features/workspace src/features/files src/app/shell`
- There is no ESLint config in this repo; do not add one. Check changed files for unused imports and dead code by hand.

Later full checks (not the implementer): `npm run check:web`, `npm run check:rust`, production `npm run build`, desktop manual checks below.

## Manual checks (separate follow-up, not for the implementing agent; see AGENTS.md)

- Visual side-by-side of Notes and Tasks List view, light and dark, macOS and Windows title bars.
- Session board on a wide (2560 px) and a narrow (1280 px) window, with and without the session pane: columns fill the width, no empty band, horizontal scroll only inside the board.
- Board drag on Windows (WebView2) and macOS: drag, cancel with Escape, drop on the same column, drop while a previous move is pending.
- Column and pane resize feel, cursor, no text selection during drag.
- Open beside session in both file-tab modes, with and without an active session; restart the app and confirm the task tab restores.
- Escape behavior with each menu open.

## Facts, decisions, assumptions

Facts: see "Current behavior".

Decisions (reversible):

- D1 One phase, delivered as ordered commits (Implementation plan steps 1-8).
- D2 No new dependencies. TanStack Table and dnd-kit were considered; the table needs only fixed grouping, single-column sort, hide and resize (about 250 lines with a semantic `<table>`), and the app already uses hand-written pointer drag. Avoiding them removes version and bundle risk for this change. Revisit if multi-column sort, virtualization or in-column ordering is added.
- D3 No in-column manual ordering (would require a Rust schema migration; `91b12ca` shows migrations here are risky). Board order follows the active table sort default `updated desc`.
- D4 No task sidebar in any mode (product decision, 2026-10-02). List is a separate full-width view and the default. The peek pane is the detail surface in all modes; the full-size editor lives in the workspace task tab.
- D7 The Operator is independent of the Tasks UI: `agentApp.ts:479-540` calls the host functions wired at `App.tsx:9901-9905`, which are the same `tasks.ts` functions the UI uses, backed by the Rust commands. The UI only listens to `TASKS_CHANGED_EVENT`. Removing the sidebar does not affect it, as long as the "Do not change" list in the Implementation plan holds.
- D8 Rename the session Kanban to "Session board" and give it its own icon. Tasks Board and Session board stay separate surfaces: session cards get their status from agent runs (`BOARD_COLUMNS` in `sessionBoard.ts:4-11`: Todo, Progress, Needs attention, Blocked, Done, Cancelled / Stopped), while task statuses are set by the user. Merging them is a later decision. Both share the `BoardColumns` layout so they look the same and the width fix applies to both.
- D9 Board columns grow to fill (`flex-1 basis-0` + min width) instead of a fixed width, because a fixed width is what leaves the empty band on wide windows. The Tasks Board setting therefore controls the minimum width, not an exact width.
- D5 Task tabs store a title snapshot for the tab label; renaming a task does not rename an open tab until it is reopened. `TaskTabSurface` shows the live title inside.
- D6 Status colors use Tailwind palette classes listed in AC-12 because the repo has no status color tokens.

Assumptions (verify while implementing, report if wrong):

- A1 `SearchableProjectPicker` and `SearchableSelect` call `preventDefault()` or stop propagation on Escape (the Notes test implies it for the picker).
- A2 `FilePane` callback props reach it from `App.tsx` through `PaneTree`; the exact chain was not traced.
- A3 `ExplorerMenu` `checked` items render a check mark suitable for the Columns menu.

## Open questions

- None blocking. Resolved on 2026-10-02: no task sidebar in any mode (D4); rename the session Kanban (D8).

## Implementer report format

- Per AC: done / partial / not done, with `file:line` or test name.
- Deviations from the spec and why. Answer A1-A3 and say which option you chose in plan step 6.
- Checks run with results (paste the summary lines).
- Files changed, and which of them other features import.

## Handoff retro

Filled in 2026-10-02 after review of commits `e6cd476..d82ecdc` (+ review fix `fbb6fcc`).

- Delegation setup, not spec content: worktree isolation starts from the default branch (`66ff8b8`), not the feature branch. Two runs were lost to that. Next time: state the base branch in the handoff and either create the worktree from it or let the agent work in its own worktree after a sanctioned reset.
- AC-4 vs D4 contradiction (spec gap): AC-4 said "List: in editor" after D4 removed the List editor. Implementer correctly used the peek. When a decision changes, re-grep every AC for the old behavior.
- AC-27 missed the `remoteFile` conflict case; the implementer flagged it (D11) and review fixed it. Spec should enumerate every existing exclusive source in the sanitizer, including `remoteFile`.
- Plan step 6 assumed one optional prop reaches `FilePane`; the real chain goes through `PaneTree` and a memo comparison. The spec's "choose fewer files" fallback worked (context). Trace prop chains before writing the plan.
- AC-22 asked for a single card `<button>` containing the status menu, which is invalid nested interactive HTML. Implementer used a wrapper `div` (D2). Spec should check interactive nesting.
- Not covered by the spec: board optimistic overrides and their errors are lost if the user switches view while a move is pending (the write still completes; only a failure banner could be missed). Acceptable; note for later.
- Upstream moved during implementation: `983d195` (live Kanban updates) landed on `nakul/windows-support-upstream-0.6.0` and touches `SessionBoardView.tsx`, which this change rewrote. Not merged yet.
