# Superseded — Import session in Settings, accent toggles, sidebar card order, Session Manager spacing

- Superseded: implement the updated copy on `nakul/windows-support-upstream-0.8.0` (`docs/specs/import-session-polish-plan.md`, commit `28c68ab`). Do not implement this on 0.7.0.
- Tier: standard · Snapshot: `2a35625` on `nakul/windows-support-upstream-0.7.0`, 2026-10-07 · Status: Todo
- Skills: `frontend-ui`
- Desktop UI checks are Nakul's. The implementer finishes with the manual checklist at the end.

## Goal

Four small polish items:

1. **Session Manager toolbar spacing:** the same even top/bottom gap that Task Manager got in `eaedb3c`.
2. **Import session:** "Add session" leaves the main sidebar and becomes an **Import session** button in Settings → Migration. Its dialog is redesigned with the app's existing components and less text.
3. **Toggles follow Appearance → Accent color**, instead of the fixed default blue.
4. **Sidebar session cards** read title first, then branch, then model.

## Out of scope

- The bulk importer in Settings → Migration (`MigrationView`) itself. Only a header button is added to that page.
- Cloud session listing (the Claude cloud / Codex cloud entries in the rail). It stays, under a clearer heading.
- The red "delete sessions" switch in `DeleteWorktreeDialog` (`src/features/source-control/ui/DeleteWorktreeDialog.tsx:159-170`). It is red on purpose, because it marks a destructive action.
- Session Manager board cards (`BoardSessionCard`) and the compact "Model:" label setting.

## Current behavior (confirmed in source)

**1. Session Manager toolbar**
- `src/features/session-board/ui/SessionBoardView.tsx:275`: the toolbar row is `flex h-9 shrink-0 items-center gap-1.5 px-3`, with 28px controls.
- The board below it (`BoardColumns`, `src/shared/ui/board/BoardColumns.tsx:143-147`) has `p-3`, so its top padding is 12px.
- Result: 4px above the controls and 4 + 12 = 16px below.
- Task Manager fixed the same problem with a bottom-aligned 40px row (`src/features/tasks/ui/TasksToolbar.tsx:101-105`, `boardBelow`).

**2. Add session**
- **Sidebar:** `src/app/shell/ProviderRail.tsx:33-38` renders a "Sessions" heading plus a `SecondaryButton` "Add session". Under it are the cloud entries (`:39-93`, "<Provider> cloud" rows).
- **Prop chain to the button:**
  - `src/app/App.tsx:12298-12302` passes `onAddSession` when `enabledNativeProviders.length > 0`;
  - `src/app/shell/Sidebar.tsx:370,480,2454` and `src/app/shell/ProjectRail.tsx:147,197,563` forward it;
  - `ProviderRail` renders the button.
- **Dialog** (`src/features/provider-sessions/ui/AddNativeSessionDialog.tsx`):
  - `Modal` with title "Add session" and description "Resume a local Claude Code or Codex conversation";
  - two `SearchableSelect`s (Provider, Provider account) in a 2-column grid;
  - a hand-styled `<input>` (`py-2`, a different height from the selects);
  - a four-sentence paragraph (`:146-151`);
  - two `SecondaryButton`s ("Cancel", "Resume session").

  The controls are all different heights, and the paragraph repeats information the user doesn't need each time.
- **Mount:** it is mounted at the app-shell root (`App.tsx:12184-12190`), so it can open from any view, including Settings.
- **After a successful resume**, `onAddNativeSession` (`App.tsx:5564-5595`) already closes Settings (`setSettingsOpen(false)`) and selects the session.
- **"Filter opens behind the modal":** in a happy-dom probe (Modal + SearchableSelect, opened), the dropdown's z-index was 91 and the dialog layer's 90, so they are correctly ordered there. `SearchableSelect` picks the layer during render from `root.current?.closest('[role="dialog"]')` (`src/shared/ui/SearchableSelect.tsx:98-102`). It is not reproduced outside the desktop. The redesign removes the Provider dropdown, and the account dropdown gets an explicit layer (see Plan). Treat the root cause as unconfirmed.
- **Settings → Migration** exists:
  - section id `"migration"`, label "Migration", description "Import past Claude and Codex sessions — resume natively or replay as history." (`src/features/settings/model/settings.ts:153-158`);
  - it renders `MigrationView` (`src/features/settings/ui/SettingsView.tsx:721-723`);
  - the generic header is `<PageHeader title description />` (`:671-676`). `PageHeader` already accepts an `action` slot (`:5102-5110`).

**3. Toggles**
- `src/shared/ui/Toggle.tsx:27-29` uses `bg-accent` when on. `src/features/skills/ui/SkillsPage.tsx:~352` and `src/features/automations/ui/AutomationsView.tsx:~1668` use `bg-accent` too.
- `bg-accent` is `--color-accent: hsl(211 92% 62%)`, a fixed blue (`src/styles/index.css:131`).
- The Appearance accent (`applyAccentColor`, `src/features/settings/model/appearance.ts:337-351`) sets `--user-accent-color` and the class `html.has-user-accent`. Existing overrides follow the pattern `html.has-user-accent .primary-action` (`index.css:1725-1740`) and `.user-message-bubble` (`:819`).
- No rule covers switches, so toggles stay blue.
- The Accent color row says "Used for the composer send button and your message bubbles." (`SettingsView.tsx:2860-2861`).

**4. Sidebar session card** (`src/app/shell/Sidebar.tsx`, `SessionCard`, `:3224`; markup `:3603-3740`)
- Non-compact order:
  - line 1: harness icon + model, with the linked-update dot and status/time on the right (`:3621-3636`);
  - line 2: pin + title (`:3637-3658`);
  - line 3: branch, with archive / work-item / automation / Remote Control on the right (`:3676-3740`).
- Compact mode:
  - title + status;
  - an optional `Model: …` line (`:3660-3670`, when `compactModelLabels`);
  - then the branch line.

## Proposed behavior and invariants

- I-1: Session Manager shows the same 12px gap above the toolbar controls (from the header's bottom border) as below them (to the column tops).
- I-2: There is no "Sessions" heading or "Add session" button in the sidebar. The cloud rows, when present, sit under a "Cloud sessions" heading. With no cloud rows, the rail renders nothing.
- I-3: Settings → Migration shows an **Import session** button in its page header, only when at least one native provider (Claude Code or Codex) is enabled. It opens the redesigned dialog. On success, Settings closes and the session opens (existing behaviour).
- I-4: Every on-state switch with `role="switch"` and `aria-checked="true"` uses the user's accent when one is set, and keeps the default accent otherwise. Danger switches keep their own colour.
- I-5: Sidebar session cards read title, then branch, then model, in both normal and compact modes. Status/time and the right-side icons keep their current behaviour.

## Implementation plan

### 1. Session Manager toolbar spacing

- `src/features/session-board/ui/SessionBoardView.tsx:275`: change the row to `flex h-10 shrink-0 items-end gap-1.5 px-3`. The 40px row with 28px controls puts 12px above them, and the board's 12px `p-3` provides the gap below. Keep the comment above it, extended with: `items-end: the board's 12px top padding is the gap below.`
- Check the loading, empty and error messages under the toolbar (`:334-358`). They keep their own `pt-3` and are unaffected.

### 2. Import session

**2a. Remove it from the sidebar.**
- `ProviderRail.tsx`:
  - delete the `onAddSession` prop and the button (`:19, 26, 38`);
  - change the heading text from `Sessions` to `Cloud sessions`;
  - change the early return to `if (entries.length === 0) return null;`;
  - remove the now-unused `Plus` and `SecondaryButton` imports.
- Remove the `onAddSession` pass-through from `ProjectRail.tsx` (`:147, 197, 563`), `Sidebar.tsx` (`:370, 480, 2454`) and `App.tsx` (`:12298-12302`). Also check `CloudSessionDialog` usages for an `onAddSession` prop with `grep -rn "onAddSession" src` and remove every remaining reference.

**2b. Add it to Settings → Migration.**
- `SettingsView.tsx`:
  - add the prop `onImportSession?: () => void` next to `onImportSessions` (`:529, 555`);
  - in the header block (`:671-676`), pass `action` when `section === "migration" && onImportSession`:
    ```tsx
    <SecondaryButton onClick={onImportSession}>
      <ArrowDownCircle aria-hidden className="size-3.5" strokeWidth={1.75} />
      Import session
    </SecondaryButton>
    ```
- `App.tsx` where `SettingsView` is rendered (around `:12726`): pass
  `onImportSession={enabledNativeProviders.length > 0 ? () => setAddNativeSessionOpen(true) : undefined}`.
  Leave the dialog mount at `:12184` where it is: it is outside the settings subtree and works over Settings.
- Rename the state and handler for clarity: `addNativeSessionOpen` → `importSessionOpen`, `onAddNativeSession` → `onImportNativeSession`. Behaviour is unchanged.

**2c. Redesign the dialog.** Rename the file and component: `AddNativeSessionDialog.tsx` → `ImportSessionDialog.tsx`, `AddNativeSessionDialog` → `ImportSessionDialog`, and the test file to match.

Keep the submit logic exactly (`submit`, the `submitting` ref, and the parse/validate/resolve/onResume/close order, `:57-82`). Only the presentation changes, following the form pattern of `src/features/source-control/ui/CreateBranchDialog.tsx:33-90`:

```
Import session                                   ×
Continue a Claude Code or Codex conversation from this computer.

[ Claude Code | Codex ]          ← SegmentedSwitch, only if 2 providers enabled
Account   [ Work account ▾ ]     ← SearchableSelect, only if the provider has > 1 account

Session ID or resume command
[ claude --resume <session-id>                 ]   ← h-9 input, autofocus

Must be on this computer. Close it in the other app first.   ← 11px hint

                                  Cancel   [ Import ]
```

- `Modal`: `title="Import session"`, `description="Continue a Claude Code or Codex conversation from this computer."`, `size="md"`.
- Form: `className="flex flex-col gap-4 p-4"`.
- **Provider:**
  - use `SegmentedSwitch` (`src/shared/ui/SegmentedSwitch.tsx`) with `ariaLabel="Provider"`, options `[{ id: "claude", label: "Claude Code" }, { id: "codex", label: "Codex" }]` filtered to `providers`;
  - render it only when `providers.length > 1`;
  - on change, keep the current reset behaviour (`setAccountId("default")`, `setError(null)`) and disable it while busy, by not calling `onChange` when `busy`.
- **Account:**
  - render the `SearchableSelect` only when `accounts.length > 1`, with label `Account`, `searchable={false}`, and `layer={LAYER.dialogPopover}` (import `LAYER` from `src/shared/lib/layers.ts`). The explicit layer guarantees the dropdown sits above the dialog even if the ref-based detection misses.
  - With one account, keep `accountId` as that account's id. Add an effect: when `accounts` changes and `accountId` is not in it, set it to `accounts[0]?.id ?? "default"`.
- **Input:**
  - a `<label className="flex flex-col gap-1.5">` with `<span className="text-[12px] font-medium text-content/70">Session ID or resume command</span>`;
  - the input uses exactly the `CreateBranchDialog` input classes (`:58`): `h-9 rounded-md border border-content/10 bg-content/5 px-2.5 font-sans text-[13px] text-content outline-none placeholder:text-content/30 focus:border-content/25 disabled:opacity-50`;
  - keep `autoFocus`, `autoComplete="off"`, `spellCheck={false}`, `maxLength={1024}`, and the provider-specific placeholder.
- **Hint:** `<p className="text-[11px] leading-4 text-content/45">Must be on this computer. Close it in the other app first.</p>`. Delete the four-sentence paragraph.
- **Error:** `<p role="alert" className="whitespace-pre-wrap break-words text-[11px] leading-4 text-red-400/90">`.
- **Footer:** `<div className="flex justify-end gap-2">` with:
  - Cancel: the `CreateBranchDialog` ghost style (`:73`);
  - submit: the `CreateBranchDialog` solid style (`:80`), label `Import`. While busy, show `<Loader className="size-3.5 animate-spin" />` and the label `Importing…`.
  - Submit is disabled when `busy || !input.trim() || providers.length === 0`.
- Enter in the input submits through the form, as now.

**2d. Records:** update L-71 in `docs/LOCAL-FEATURES.md` (both the Index line `:109` and the detail row `:216`): "Import session" in Settings → Migration, dialog redesigned, sidebar button removed.

### 3. Toggles use the accent colour

- `src/styles/index.css`: next to the other `html.has-user-accent` rules (after `:1740`), add:
  ```css
  html.has-user-accent [role="switch"][aria-checked="true"]:not([data-switch-tone="danger"]):not(:disabled) {
    background-color: var(--user-accent-color);
  }
  ```
  Keep it unlayered, like the neighbouring rules, so it overrides the `bg-accent` utility.
- `DeleteWorktreeDialog.tsx:159`: add `data-switch-tone="danger"` to its switch, so it stays red.
- **Check each `role="switch"` in `src`** (`grep -rn 'role="switch"' src --include=*.tsx`):
  - `Toggle.tsx`, `SkillsPage.tsx:345` and `AutomationsView.tsx:1661` must set `aria-checked` and use `bg-accent` when on. Add `aria-checked` where it is missing.
  - `ProjectNotificationSettings.tsx:338` and `SavedPromptForm.tsx:105`: read them. If one is not a two-state switch (for example a pin button), leave it alone and note it in the report.
- Update the Accent color description (`SettingsView.tsx:2861`) to: `Used for the send button, your message bubbles and switches.`
- The thumb stays `bg-white` (unchanged).

### 4. Sidebar session card order

In `Sidebar.tsx` `SessionCard` (`:3603-3740`), non-compact mode:
- **Line 1:** pin + title (`ParticleText`, unchanged classes) on the left; `linkedUpdateDot` + `status` on the right (moved from the old line 1).
- **Line 2:** the branch row (`gitLabel` with `GitBranch`) plus the right-side icon group (archive, work item, automation, Remote Control), unchanged. Its top margin stays `mt-1`.
- **Line 3:** a new row, `relative mt-0.5 flex min-w-0 items-center gap-1.5`, with `HarnessIcon` (`size-3 shrink-0`) and the model in `min-w-0 truncate text-[11px] text-content/45`. Render it only when `model` is non-empty.

Compact mode (`compact && !orchestrationExpanded`):
- the title + status line, unchanged;
- then the branch row;
- then the `Model: …` label (only when `compactModelLabels && model`), moved below the branch row.

Orchestration expanded:
- keep `OrchestrationSidebarAgents` directly after the title line, before the branch row.

Keep everything else unchanged: `ParticleText`, the `role="button"` wrapper and its handlers, `title` attributes, and drop-target and selection styling. The title line takes over the top-row `role="button"` area, so clicking the title still selects the session.

## UI details

Exact copy:

| Where | Text |
|---|---|
| Settings → Migration header button | `Import session` |
| Dialog title | `Import session` |
| Dialog description | `Continue a Claude Code or Codex conversation from this computer.` |
| Field label | `Session ID or resume command` |
| Hint | `Must be on this computer. Close it in the other app first.` |
| Buttons | `Cancel`, `Import` / `Importing…` |
| Sidebar rail heading | `Cloud sessions` |
| Accent setting description | `Used for the send button, your message bubbles and switches.` |

Existing validation error messages in `submit` stay as they are.

## Test matrix

| AC / risk | Level | File | Scenario |
|---|---|---|---|
| AC-1 | feature | `src/features/session-board/ui/SessionBoardView.test.ts` | The toolbar row (parent of `[aria-label="Search board"]`'s wrapper) has `h-10` and `items-end` |
| AC-2 | unit (static render) | `src/app/shell/ProviderRail.test.ts` | Nothing renders with no entries; there is no "Add session" text; with entries the heading is "Cloud sessions" (replace the old "offers Add session…" test) |
| AC-3 | feature | `src/features/settings/ui/SettingsView.test.ts` (or the existing settings test file) | The Migration section shows "Import session" when `onImportSession` is given and calls it on click; no button without the prop; other sections have no button |
| AC-4 | feature | `src/features/provider-sessions/ui/ImportSessionDialog.test.ts` (renamed) | Title and copy; no provider switch with one provider, a switch with two; no account select with one account, a select with two, and its popover z-index is `91`; the input has `h-9`; the old paragraph is gone; submit flow unchanged (existing cases kept); busy shows `Importing…` |
| AC-5 | unit | a new `src/styles/accentSwitch.test.ts`, or `Toggle.test.ts` | Read `src/styles/index.css` as text and assert the `html.has-user-accent [role="switch"][aria-checked="true"]` rule exists with the danger exclusion; `Toggle` sets `aria-checked`; `DeleteWorktreeDialog`'s switch has `data-switch-tone="danger"` |
| AC-6 | feature | the existing Sidebar card tests (find with `grep -rln "data-session-select" src --include=*.test.ts`) | In the DOM, title text comes before the branch label, which comes before the model text; compact mode: title, branch, `Model:` |

## Acceptance criteria

- AC-1: Session Manager's toolbar row is 40px with bottom-aligned controls. The gap above the controls equals the gap to the column tops.
- AC-2: The sidebar has no "Sessions" heading and no "Add session" button. Cloud rows appear under "Cloud sessions" only when they exist.
- AC-3: Settings → Migration has an "Import session" button in its header when a native provider is enabled. It opens the dialog over Settings, and a successful import closes Settings and opens the session.
- AC-4: The dialog matches section 2c: shared control heights, the provider switch and account select only when needed, the account dropdown above the dialog, short copy, and the `Import` primary button.
- AC-5: With an accent set in Appearance, every on switch uses it (except the danger switch). With no accent, switches stay the default accent.
- AC-6: Sidebar cards show title, then branch, then model (compact: title, branch, `Model:`), with status/time on the title line.

## Verification

- `npx tsc --noEmit -p .`
- `npx vitest run src/app/shell src/features/provider-sessions src/features/settings src/features/session-board src/shared/ui`
- Later full checks (not the implementer): `npx vitest run`, `npm run build`.

## Manual checklist (Nakul, desktop)

1. Session Manager: the gap above the Add Draft/search row equals the gap below it.
2. The sidebar no longer shows "Sessions / Add session". With cloud sessions, "Cloud sessions" lists them.
3. Settings → Migration → Import session: the dialog looks clean, controls line up, and the account dropdown (with 2+ accounts) opens above the dialog. Import a real session: Settings closes and the session opens.
4. Appearance → pick an accent: switches in Settings, Skills and Automations turn that colour. Clear it: they're back to the default. The delete-worktree switch stays red.
5. Sidebar session cards: title on top, branch, then model; compact mode in the same order.

## Facts, decisions, assumptions

**Facts:** see Current behavior.

**Decisions:**
- **Import session lives in Settings → Migration,** which is already about importing Claude/Codex sessions. The bulk importer stays below it.
- **The cloud rows keep a heading ("Cloud sessions")** rather than dropping it. Without one, the rows would look like projects.
- **The accent applies to switches through one CSS rule.** This follows the existing `html.has-user-accent` pattern, so every current and future switch follows it without per-component edits.
- **The danger switch opts out** with `data-switch-tone="danger"`.
- **The model line keeps the harness icon,** so the provider stays recognisable at a glance.

**Assumptions:**
- The "dropdown behind the modal" report is desktop-only. The explicit `layer={LAYER.dialogPopover}` on the only remaining dropdown is the fix; the root cause was not reproduced.

## Open questions

- None blocking.

## Implementer report format

- Per AC: done / partial / not done, with `file:line` or the test name.
- Deviations, and which `role="switch"` elements you changed or left alone, and why.
- Checks run, with counts.
- Files changed.

## Handoff retro

(Filled in after implementation.)
