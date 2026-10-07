# Todo — Task Manager week strip, focus days, Settings-style board columns

- Tier: medium · Snapshot: `147aea7` on `nakul/windows-support-upstream-0.7.0`, 2026-10-06 · Status: Review
- Skills: `frontend-ui`
- Desktop UI checks are Nakul's. The implementer finishes with the manual checklist at the end.

## Goal

Focus is great for today, but finished and carried tasks disappear from view the next day, so "what did I work on yesterday / on Friday?" can't be answered. Add a week strip to see any day's tasks, record which past days a task was in focus, show a small timeline in task details, and plan tasks onto upcoming days from the right-click menu.

Separately, board columns in Task Manager and Session Manager should use the Settings → Appearance card surface (no blur) instead of a blurred surface under already-tinted cards.

## Current behavior (confirmed in source)

**Tasks model and Focus**
- `src/features/tasks/tasks.ts:37-41`: `Task` has `createdAt`, `updatedAt`, `completedAt?`, `focusDate?` (one local day, `YYYY-MM-DD`).
- `tasks.ts:91`: `isInFocus(task, day)` is `focusDate === day || localDay(createdAt) === day`.
- `tasks.ts:153`: `filterTasks` applies `filters.focusDay`.
- `src/features/tasks/ui/TasksView.tsx`:
  - `:162` loads the Focus toggle `focusOn` from the `FOCUS_KEY` flag;
  - `:215-222` builds `effectiveFilters` with `focusDay`;
  - `:236-246` computes the `carryOver` list;
  - `:393` sets `focusDate: today` when a task is pinned;
  - `:618-640` renders the centre Focus button (amber when on, `Target` icon, `focusCount/total`);
  - `:702-716` renders the carry-over banner, which writes `focusDate: today` on each carried task.
- `src/features/tasks/ui/TaskTags.tsx:100-128` (`focusDayChip`):
  - pinned today shows `Today`;
  - a future pin shows its short date;
  - a past pin shows `From <short date>`.
- `src/features/tasks/ui/taskContextMenu.ts:35-104`: the right-click menu has Start Work, one Focus item ("Focus today" / "Pin to today's focus" / "Remove from today's focus"), a Status submenu, Copy, Archive/Unarchive and Delete.

**Persistence**
- `src-tauri/src/tasks.rs:113-128` creates the `tasks` table.
- `tasks.rs:149-167` holds the column-upgrade list. It adds missing columns to existing databases (this is how `tags_json` was added).
- `focus_date TEXT` is at `:127`/`:162`, and the struct fields at `:74`/`:100`.

**Shared UI**
- `src/features/sessions/ui/SharedHoverHighlight.tsx` provides the gliding hover. Usage: put `<SharedHoverHighlight />` inside a `relative` container whose items carry `data-shared-hover-item`. Example: `src/features/session-board/ui/SessionBoardView.tsx:399`.
- `src/shared/ui/SegmentedSwitch.tsx` is the keyboard pattern to copy: tablist/tab roles, arrow keys, only the selected item tabbable.

**Board columns**
- `src/shared/ui/board/BoardColumns.tsx:234-242`: columns use `rounded-lg … surface-blur` with `surface-tint` (or `bg-content/5 ring-1 ring-accent/40` when highlighted).
- The cards inside use `surface-tint` only: `src/features/session-board/ui/BoardSessionCard.tsx:151` and `src/features/tasks/ui/TaskBoard.tsx:563-565`.
- Settings groups (`src/features/settings/ui/SettingsView.tsx:5166-5169`) use `rounded-xl border border-content/10 bg-content/3`, with no blur.

## Rules (decided)

**R1. Plan vs history.** `focusDate` is the current plan: today, a future day, or a past day the task was left on. `focusDays` is history: past days the task sat in focus before moving on. Nothing runs at midnight.

**R2. Writing history.** On any change of `focusDate` from an old value O to a new value N (including N = none), the frontend sends `today` with the update, and Rust adds O to `focusDays` (no duplicates, kept sorted) when either:
- O < today; or
- O == today and the new value is another day,

and in both cases only when the task's status before or after the update is Progress, Blocked, Verify (`review`) or Done. A Todo task (including the old draft and deferred names) records nothing, so moving it away never leaves a trace.

(Updated 2026-10-07: replaces the earlier "past days only" note. Moving a worked-on task's today pin to another day records today; moving a Todo task records nothing.)

Nothing else writes `focusDays`. So these record nothing:
- unpinning today (a mistake gets undone cleanly);
- moving a plan between future days;
- re-planning on the same day.

**R3. Created day.** If the task never had a `focusDate` (O is none) and its created day C is before today, treat O as C for R2. Example: a task added on the 7th, left in Today's focus and moved on the 8th records the 7th.

**R4. "In focus on day D"** is true when any of these hold:
- `focusDays` includes D;
- `focusDate == D`;
- the task was created on D, and its `focusDate` is none or ≤ D. A task created on the 7th but planned for the 9th does not show on the 7th.

**R5. "Completed on day D":** `localDay(completedAt) == D`.

**R6. Today** keeps today's Focus meaning: R4 applied to today.

## Scope

### 1. Data: `focusDays`

- `src-tauri/src/tasks.rs`:
  - add `("focus_days_json", "TEXT NOT NULL DEFAULT '[]'")` to the upgrade list (`:149-167`) and to `CREATE TABLE` (`:113-128`);
  - add `focus_days: Vec<String>` to both structs (`:74`, `:100`), serialised as `focusDays`;
  - in the update path, accept an optional `today: String` and apply R2/R3 inside the same transaction as the `focus_date` write. Pass `today` from the frontend whenever `focusDate` is in the changes.
  - Existing rows need no seeding: their `focusDate` already counts under R4.
- `src/features/tasks/tasks.ts`:
  - add `focusDays: string[]` to `Task`, normalising a missing value to `[]`;
  - add `inFocusOn(task, day)` (R4) and `completedOn(task, day)` (R5);
  - `isInFocus` becomes `inFocusOn` (keep the export name or update callers);
  - add `firstFocusDay(task)`: the earliest of `focusDays`, `focusDate` (if ≤ today) and the created day (when R4 allows it).
- Add `today` to the task-update call (`TasksView.tsx` change helpers and the context-menu actions).

### 2. `today` updates at midnight

New `src/shared/hooks/useLocalDay.ts`:
- returns `localDay()`;
- re-arms a `setTimeout` to the next local midnight + 1s and clears it on unmount.

Use it in `TasksView.tsx` for `today`.

### 3. Week strip (its own row directly under the toolbar)

New `src/features/tasks/ui/TaskWeekStrip.tsx`.

**Layout:**
```
‹   Thu 4   Fri 5   Sat 6   [ Sun 7 ]   Mon 8   Tue 9   Wed 10   ›      All
      •       •                 •                  •
```
- **Window:** 7 days centred on an anchor: 3 before it, the anchor, 3 after. The anchor starts at today and follows `today` across midnight unless the user has moved the window.
- **`‹ ›`** shift the anchor by 7 days, in both directions with no limit (future weeks are allowed).
- **Day item:** a `<button>` with:
  - the weekday on top (`text-[10px] uppercase text-content/45`);
  - the date number below (`text-[13px] font-medium tabular-nums`);
  - a 4px dot when the day has any task under R4/R5 (`bg-content/35`, `bg-accent` for today).

  Today's number uses the accent colour. The aria-label reads `Sun 7 Oct, 5 tasks` (or `no tasks`).
- **All:** a strip item at the far right, same style, label `All`. It is selected when `selectedDay` is `null`.
- **Transparent look:** no background or border on the strip. Only the hover and selected states draw anything.
- **Gliding hover:** reuse `SharedHoverHighlight`. Put `<SharedHoverHighlight />` inside the strip's `relative` container, and add `data-shared-hover-item` to every day, to `All` and to both arrows.
- **Selected pill:** one absolutely positioned `bg-selection-strong rounded-md` element behind the selected item. It moves with `transition-[transform,width] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]`, measured from the item's `offsetLeft` and `offsetWidth`. When the selected day is outside the visible window, the pill hides.
- **Week change:** the 7 days slide. The outgoing set moves 24px toward the arrow's side and fades out; the incoming set comes from the opposite side, over 200ms. `motion-reduce` swaps instantly.
- **Keyboard:** `role="tablist"` with `role="tab"` items (days and All), copying `SegmentedSwitch.tsx`. Left and right arrows move the selection; at an edge they shift the window by 7 days. `Home` selects today.
- **State:** `selectedDay: string | null` (`null` means All). Clicking the selected day again sets `null`.
- **Counts and dots** come from one `useMemo` over `tasks` for the visible window, never one pass per day per render.

### 4. Focus button (stays the only centre control)

Keep the current button (`TasksView.tsx:618-640`): its look, amber when on, the `Target` icon and the `n/total` count.

- **On** means `selectedDay === today`.
- Clicking it when off sets `selectedDay = today` and re-centres the window on today ("jump to today"). Clicking it when on sets `null` (All).
- Selecting any other day or All shows Focus off (`aria-pressed=false`).
- `FOCUS_KEY` persistence keeps meaning "start on Today" vs "start on All". A past or future day is never restored.
- **Same effect:** wrap the button in a `relative` container with its own `<SharedHoverHighlight />` and `data-shared-hover-item` on the button, so its hover glides like the strip's. The amber on/off fade (`duration-150`) stays.

### 5. Filtering and grouping

- `effectiveFilters` (`TasksView.tsx:215-222`): replace `focusDay` with `day: selectedDay ?? undefined`.
- In `filterTasks` (`tasks.ts:153`), when `day` is set:
  - keep tasks where `inFocusOn(task, day) || completedOn(task, day)`;
  - ignore the archived filter, so tasks archived since still show for that day.
- **List view** (any selected day): two groups using the existing `TaskGroupHeader`:
  - `Completed` (`completedOn`);
  - `In focus` (in focus and not completed on that day).

  Board and Table views only filter; they don't group.
- **Empty states:**
  - Today keeps the current message (`TasksView.tsx:518`);
  - a past day: `Nothing recorded for Thu 4 Oct.`;
  - a future day: `Nothing planned for Tue 9 Oct.`
- **Carry-over banner** (`:702-716`): unchanged copy and action, shown only when `selectedDay === today`. Its writes pass `today`, so R2 records history.

### 6. Right-click menu: "Focus on" submenu (Status stays)

In `taskContextMenu.ts:50-64`, replace the single Focus item with:

```
Focus on            ›   Today            (✓ when focusDate == today)
                        Tomorrow · Mon 8
                        Tue 9
                        Wed 10
                        ─────────
                        Remove from focus   (only when focusDate is set)
```
- Use the `Target` icon on the parent item. Items show ✓ for the current `focusDate`.
- Picking a day sets `focusDate` to that day (with `today` sent). "Remove from focus" sets it to none.
- Add `focusOn:YYYY-MM-DD` and `unfocus` ids to `taskMenuAction` and update the callers in `TasksView.tsx`.
- The Status submenu, Start Work, Copy, Archive and Delete are unchanged.

### 7. Card chip wording (`TaskTags.tsx:100-128`)

- Pinned today with `firstFocusDay` today: `Today` (unchanged).
- Unfinished, with `firstFocusDay` before today:
  - `Since yesterday`;
  - `Since 2 days ago` through `Since 6 days ago`;
  - after that, `Since 28 Sep` (use the existing `shortDay`).
- A future plan stays unchanged (short date).
- When a past day is selected in the strip, completed cards show `Done 4:30 PM` (local time from `completedAt`) in place of the focus chip.

### 8. Timeline in task details (`TaskPeekPane.tsx`)

A new section titled `Timeline`, below the body:
```
●  Created        7 Oct
●  In focus       7 Oct · 8 Oct · 9 Oct        (more than 5 days: "7 Oct … 14 Oct · 6 days")
●  Completed      10 Oct · took 3 days
```
- In focus lists the sorted, de-duplicated union of `focusDays`, `focusDate` (if ≤ today) and the created day (per R4).
- For an open task, the last row is `◌ Open · N days`, counted from `firstFocusDay` to today. Use a dashed connector and `text-content/45`.
- A future plan adds a row `○ Planned  Tue 9 Oct`.
- Dots are 6px; the connector is a 1px `border-l border-content/15` (dashed for open tasks).

### 9. Board columns use the Settings card surface

- `src/shared/ui/board/BoardColumns.tsx:234-242`:
  - change `rounded-lg` to `rounded-xl` and remove `surface-blur`;
  - normal state: `border border-content/10 bg-content/3`;
  - highlighted (drop target): `border border-accent/40 bg-content/5`, replacing the `ring-1`. Same size, so no layout shift.
- Cards are unchanged (`surface-tint`).
- The sticky table header (`TaskTable.tsx:134`) keeps its blur.
- This partly reverses `a07c7af`: the Menu backdrop-blur slider no longer affects board columns. Record that in `LOCAL-FEATURES.md`.

## Out of scope

- Per-day status history ("to do on 7, in progress on 9"). This would need an activity log table; it can be added later on top of this.
- A 7-column week grid of cards.
- A stand-up copy button.

## Acceptance criteria

- AC-1: The strip shows 3 days, today and 3 days with `All`. Today is centred on open. `‹ ›` shift by 7 both ways, and the days slide in the arrow's direction.
- AC-2: Hover glides across days, All and the arrows. The selected pill glides between items.
- AC-3: Focus on means Today is selected. Focus off from Today means All. Picking another day shows Focus off. Focus from another week re-centres on today.
- AC-4 (R2/R3 scenario):
  - Create a task on the 7th and plan it for the 9th the same day: it isn't on the 7th, it is on the 9th, and `focusDays = []`.
  - On the 10th, carry it over: `focusDays = [9th]`, and it shows on the 9th (In focus) and on the 10th.
  - Complete it on the 10th: the 10th shows it under Completed.
- AC-5: Unpinning a task pinned today records nothing. Moving a plan from the 9th to the 10th (while today is the 7th) records nothing.
- AC-6: A past day in List view shows `Completed` and `In focus` groups, with archived tasks included. The empty-state text for past and future days matches section 5.
- AC-7: The carry-over banner appears only with Today selected and still carries everything in one click.
- AC-8: The right-click "Focus on" submenu lists Today, Tomorrow and the next 2 days, plus Remove from focus when pinned. Status is still present.
- AC-9: Chip wording matches section 7. Completed cards on a past day show `Done h:mm AM/PM`.
- AC-10: The timeline renders the completed, open and planned cases as in section 8.
- AC-11: With the app left open across midnight, Today and the strip move to the new day.
- AC-12: Board columns in both managers have no `surface-blur`, use `border-content/10 bg-content/3 rounded-xl`, and use `border-accent/40` as a drop target.

## Tests

| AC | File | Scenario |
|---|---|---|
| AC-4/5 | `src-tauri/src/tasks.rs` tests | R2: past O recorded; O == today with N set recorded; O == today with N none not recorded; future → future not recorded; R3 created-day used when O is none; no duplicates and sorted; an old database gains the column with `[]` |
| AC-4/6 | `src/features/tasks/tasks.test.ts` | `inFocusOn` R4, including "created on the 7th, planned for the 9th → not on the 7th"; `completedOn`; the day filter includes archived tasks |
| AC-1/2 | `src/features/tasks/ui/TaskWeekStrip.test.ts` (new) | Window centred on today; `‹ ›` ±7; arrow keys step and wrap the week; `Home` → today; clicking the selected day → All; aria-labels with counts; pill target changes |
| AC-3/6/7 | `src/features/tasks/ui/TasksView.test.ts` | Focus ↔ Today/All; another day → `aria-pressed=false`; groups; empty-state copy; banner only on Today; carry sends `today` |
| AC-8 | `taskContextMenu` test | Submenu items and ✓; Remove only when pinned; action ids decode; Status still present |
| AC-9 | `src/features/tasks/ui/TaskTags.test.ts` | Since yesterday / N days ago / short date; `Done 4:30 PM` |
| AC-10 | `TaskPeekPane` test | Completed, open, planned and collapsed-run rendering |
| AC-11 | `src/shared/hooks/useLocalDay.test.ts` | Fake timers: changes at midnight; re-armed; cleared on unmount |
| AC-12 | `src/shared/ui/board/BoardColumns.test.ts`, `SessionBoardView.test.ts:331` | Column classes for the normal and highlighted states; update the old "translucent board surface" expectation |

## Verification

- `npx tsc --noEmit -p .`
- `npx vitest run`
- `cargo test` (from `src-tauri`, the tasks tests at minimum)
- `cargo clippy --workspace --all-targets -- -D warnings`
- `npm run build`

## Records

- Add a `docs/LOCAL-FEATURES.md` row (week strip, focus days, Focus on submenu, timeline, column surface) and its Index line. Note the partial reversal of `a07c7af`.
- Add a changelog entry to the Current changelog file.
- Mark this spec Review in `docs/specs/SPECS.md` when done.

## Manual checklist (Nakul, desktop)

1. Open Task Manager with Focus on: Today is centred and selected, and the pill and hover glide.
2. `‹ ›` slide the week, and Focus jumps back to today.
3. Click a past day: `Completed` and `In focus` groups; click All: everything.
4. Right-click a task, choose Focus on → Tue 9: it leaves Today and appears on the 9th.
5. Next day: the carry-over banner works, and the previous day still shows the carried task.
6. Peek pane timeline for a done task and for an open task.
7. Leave the app open past midnight: the strip moves.
8. Both boards: columns look like Settings cards, with no double blur.

## Handoff retro

Implemented 2026-10-06 on `nakul/windows-support-upstream-0.7.0` (no drift: only this spec changed since `147aea7`). Deviations: no separator inside the "Focus on" submenu (ExplorerMenu submenus have no separator rows); timeline tested in `TaskTimeline.test.ts` rather than a `TaskPeekPane` test (the timeline is a `TaskTimeline` component rendered by `TaskEditor`); `focusDayChip`/`TaskFocusChip` now take the task (wording needs `firstFocusDay`); `TaskRow`/`TaskBoard` take `today` + `selectedDay` props; `inFocusOn`/`firstFocusDay` tolerate a missing `focusDays` (old fixtures). Verification below; manual checklist unchanged for Nakul.
