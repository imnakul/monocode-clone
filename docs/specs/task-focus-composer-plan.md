# Review — Task Manager focus/archive, one composer, Drafts group — spec

Branch: `nakul/windows-support-upstream-0.7.0` · Base commit: `51690f7` · Created 2026-10-03 (IST)

## Idea
- Task Manager: a daily Focus, Archive instead of Deferred, a right-click menu, multi-select
  filters, drag to reorder board columns and cards, small celebrations.
- One composer in three places: the floating window (Task | Session switch), Session Manager
  "Add Draft", and Task Manager "Work on…". Sessions get Save to Draft and Start.
- Session Manager drafts also show in the project Sessions list, grouped like Reminders.

## Research
- SQLite CHECK constraints cannot be altered without a table rebuild, so statuses keep
  their stored names: Draft/Deferred are retired in the UI and Operator (draft → Todo,
  deferred → archived Todo) and "Completed" is not renamed to Done. New columns
  (`focus_date`, `archived_at`, `sort_order`) use the existing add-missing-columns upgrade.
- The floating composer is its own window; it saves tasks with `tasks_upsert` and the
  `monocode://tasks-changed` Tauri event refreshes Task Manager in the main window.
- The floating window grows with its card, so task fields are inline (no popovers).

## Plan
1. Storage and model: `src-tauri/src/tasks.rs`, `src/features/tasks/tasks.ts`
   (`parseTaskStatus`, `isInFocus`, `taskMarkdown`, `taskWorkPrompt`).
2. Task Manager UI: `TasksView.tsx` (Focus, Archived, menu), `taskContextMenu.ts`,
   `TaskBoard.tsx` (column grip, card order), `SearchableSelect` multi mode,
   `CelebrationBurst.tsx`, `TaskEditor.tsx` header icons.
3. Composer: `QuickComposer.tsx` (kinds, Save to Draft / Start), `QuickTaskFields.tsx`,
   `model/quickTask.ts`, `SessionTodoComposer.tsx` (`onStart`), `App.tsx` (`workOnTask`).
4. Drafts group: `sessionFolders.ts` (`drafts` entry), `Sidebar.tsx`.

## Todos
- [x] Focus: created today or focus day is today; "N/total" count; carry-over chip
- [x] Context menu: Work on…, Focus today, Move to ▸, Copy task, Archive/Unarchive, Delete
- [x] New task: Personal, cursor in the title; peek header Focus / Copy / Delete
- [x] Draft and Deferred removed from the UI; Show archived toggle (faded, struck through)
- [x] Multi-select Status and Project filters; hidden statuses drop their board columns
- [x] Board: wrap to a grid, drag columns by the grip, drag cards to an exact place
- [x] Celebrations on Focus and on Completed (skipped with reduced motion)
- [x] Operator uses the same names (`focusDate`, `archived`, five statuses)
- [x] Composer: Task | Session switch (remembered), Task fields, Save to Draft + Start,
      Enter = Start, Ctrl+Enter = Start and open; 14px prompt, h-7 controls, 3.5 icons
- [x] Session Manager Add Draft and Task Manager Work on… use the same composer without
      the switch; Work on moves a Todo/Blocked task to Progress when it starts
- [x] Drafts group in the project Sessions list (view only; folders and pins kept)
- [ ] Manual desktop checks (below) — Nakul

## Manual checks (desktop, `npm run tauri dev`)
- Floating composer: switch Task ↔ Session, reopen keeps the last kind; save a task with a
  status, focus day and tags; it appears in Task Manager without a refresh.
- Session mode: Save to Draft lands in Session Manager → Draft and in the project Sessions
  list → Drafts; Start runs it; Ctrl+Enter starts and opens it.
- Task Manager → right-click → Work on…: prefilled prompt; Start moves the task to Progress.
- Focus and Completed celebrations; board column and card drag; Show archived.
- Drafts group collapse is remembered per project; starting a draft moves it out.

## Issues and fixes
- `Task` lost `Eq` because of the float `sort_order`.
- Multi-select menus stay open, so tests pick options without reopening the menu.
- A drop at the same place wrote a new order; same-index drops are now skipped.

## Learnings
- Retire values in the UI and parsers instead of migrating CHECK-constrained columns.

## Done
Implementation and automated checks complete; waiting for the manual checks above.
