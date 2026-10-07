# Todo — Import session in Settings, accent toggles, sidebar card order, Session Manager spacing

- Tier: standard · Snapshot: `f16c498` on `nakul/windows-support-upstream-0.8.0`, 2026-10-07 · Status: Todo
- Branch: work on `nakul/windows-support-upstream-0.8.0` only (not 0.7.0).
- Skills: `frontend-ui`
- Desktop UI checks are Nakul's. The implementer finishes with the manual checklist at the end.

## Goal

Four polish items:

1. **Session Manager toolbar spacing:** the same even top and bottom gap that Task Manager already has (`eaedb3c`, present on this branch).
2. **Import session:** "Add session" leaves the main sidebar and becomes an **Import session** button in Settings → Migration. Its dialog is redesigned around the existing components, with less text and controls of matching size.
3. **Toggles follow Appearance → Accent color**, instead of the fixed default blue.
4. **Sidebar session cards** read title first, then branch, then model.

## Out of scope

- `ProviderConversationList` itself (`src/features/provider-sessions/ui/ProviderConversationList.tsx`). It is shared with the sidebar provider panel (`src/app/App.tsx:~6125`). Its header, filter menu, refresh and rows stay as they are.
- The modal menu layering. It was fixed in `f3f0656`: `ExplorerMenu` `layer`, and `menuLayer={LAYER.dialogPopover}` passed from the dialog. Keep that wiring unchanged.
- The bulk importer in Settings → Migration (`MigrationView`). Only a header button is added to that page.
- Cloud session rows in the rail. They stay, under a clearer heading.
- The red "delete sessions" switch in `src/features/source-control/ui/DeleteWorktreeDialog.tsx:159`. It is red on purpose, because it marks a destructive action.
- Session Manager board cards and the compact "Model:" label setting.

## Current behavior (confirmed in source at `f16c498`)

**1. Session Manager toolbar**
- `src/features/session-board/ui/SessionBoardView.tsx:275`: the row is `flex h-9 shrink-0 items-center gap-1.5 px-3`, with 28px controls.
- The board below has `p-3` (`src/shared/ui/board/BoardColumns.tsx:14,145`), so its top padding is 12px.
- Result: 4px above the controls and 16px below.
- Task Manager's fix is a 40px row with bottom-aligned controls (`src/features/tasks/ui/TasksToolbar.tsx`, `boardBelow`).

**2. Add session**
- **Sidebar:** `src/app/shell/ProviderRail.tsx`:
  - `:30` `if (entries.length === 0 && !onAddSession) return null;`
  - `:35` heading `Sessions`
  - `:38` a `SecondaryButton` "Add session"
  - below them, the cloud rows ("<Provider> cloud").
- **Prop chain:**
  - `src/app/App.tsx:13712-13715` passes `onAddSession` when `enabledNativeProviders.length > 0`;
  - `src/app/shell/Sidebar.tsx:391,505,2622` and `src/app/shell/ProjectRail.tsx:148,200,567` forward it.
- **Dialog:** `src/features/provider-sessions/ui/AddNativeSessionDialog.tsx` (349 lines). It is mounted at the app-shell root (`App.tsx:13597-13602`), outside the Settings subtree, so it can open over Settings. Current layout, top to bottom:
  1. `Modal` with `title="Add session"`, description "Choose a provider, find its local conversations, and resume one", `size="md"`, `fitViewport`.
  2. A 2-column grid with two `SearchableSelect`s, **Provider** and **Provider account** (`:198-231`).
  3. A row with a hand-styled search `<input>` (`py-2`, a different height from the selects), a **Project** `SearchableSelect`, and a **Find** `SecondaryButton` (`:232-268`). The list loads only after Find is clicked (`find()` sets `request`, `:110-121`).
  4. When a request is active, `ProviderConversationList` in an `h-72` bordered box, with `menuLayer={LAYER.dialogPopover}` (`:269-300`).
  5. `<details>` "Or paste a session ID or resume command", containing a second hand-styled input (`:301-327`).
  6. A four-sentence paragraph (`:328-333`).
  7. The error line.
  8. Footer: `SecondaryButton`s "Cancel" and "Resume session", the latter submitting the pasted ID (`:340-347`).

  The controls are three different heights, and there are three different "go" actions: Find, clicking a row, and Resume session.
- **Logic to keep:**
  - `find` (`:110-121`);
  - `resumeRow`, which guards the provider/account and opens a row (`:122-150`);
  - `archive` (`:151-162`);
  - `submit`, which parses and resolves a pasted ID (`:163-188`);
  - the `submitting` ref and `busy` state;
  - `ProviderConversationStore` keyed on `request` (`:57-82`).
- **On success,** `onAddNativeSession` (`App.tsx:6028-…`) closes Settings (`setSettingsOpen(false)`, `:6050`) and opens the session.
- **Tests:** `AddNativeSessionDialog.test.ts` and `AddNativeSessionDialog.menu.test.ts` (menu layering and Escape).
- **Settings → Migration:**
  - section id `"migration"`, label "Migration" (`src/features/settings/model/settings.ts`, the `migration` entry);
  - it renders `MigrationView` (`src/features/settings/ui/SettingsView.tsx:744-745`);
  - the generic header is `<PageHeader title description />` (`:691-695`). `PageHeader` (`:5246`) already accepts an `action` slot.
  - `SettingsView` props: `onImportSessions` (`:549, 575`).

**3. Toggles**
- `src/shared/ui/Toggle.tsx:28` uses `bg-accent` when on. Other hand-made switches use `bg-accent` when on too:
  - `SkillsPage.tsx:345`
  - `ModelPicker.tsx:1292` (`h-4 w-7`)
  - `AutomationsView.tsx:1661`
- `bg-accent` is `--color-accent: hsl(211 92% 62%)`, a fixed blue (`src/styles/index.css:131`).
- The Appearance accent (`applyAccentColor`, `src/features/settings/model/appearance.ts`) sets `--user-accent-color` and the class `html.has-user-accent`. Existing overrides follow the pattern `html.has-user-accent .primary-action` (ending `index.css:1898`).
- No rule covers switches, so toggles stay blue.
- The Accent color row says "Used for the composer send button and your message bubbles." (`SettingsView.tsx:2894-2895`).

**4. Sidebar session card** (`src/app/shell/Sidebar.tsx`, `SessionCard` `:3448`; markup `role="button"` `:3828` … indicator slot `:3945`)
- **Line 1:** `HarnessIcon` + `{model}`, with `linkedUpdateDot` + `status` on the right (`:3846-3860`).
- **Line 2:** pin + title (`ParticleText`, `:3873`).
- Compact `Model: {model}` label (`:3885-3892`), then `OrchestrationSidebarAgents` (`:3894`).
- **Line 3:** branch (`GitBranch`, `:3909`) plus archive / work item / automation / Remote Control on the right.

## Proposed behavior and invariants

- I-1: Session Manager shows the same 12px gap above the toolbar controls as below them.
- I-2: The sidebar has no "Sessions" heading and no "Add session" button. Cloud rows, when present, sit under a "Cloud sessions" heading. With no cloud rows, the rail renders nothing.
- I-3: Settings → Migration shows an **Import session** button in its page header, only when at least one native provider is enabled. It opens the redesigned dialog over Settings. A successful import closes Settings and opens the session (existing behaviour).
- I-4: The dialog keeps every existing guard and behaviour: provider/account checks, archived restore, the busy lock, paste-ID parsing, and dialog-layer menus with Escape keeping the dialog open.
- I-5: Every switch with `role="switch"` and `aria-checked="true"` uses the user's accent when one is set, and keeps the default accent otherwise. The danger switch keeps red.
- I-6: Sidebar cards read title, then branch, then model, in both normal and compact modes.

## Implementation plan

### 1. Session Manager toolbar spacing

- `SessionBoardView.tsx:275`: change the row to `flex h-10 shrink-0 items-end gap-1.5 px-3`.
- Extend the comment above it (`:274`) with: `items-end: the board's 12px top padding is the gap below.`

### 2. Import session

**2a. Remove it from the sidebar.**
- `ProviderRail.tsx`:
  - remove the `onAddSession` prop and the button (`:20, 28, 38`);
  - change the heading from `Sessions` to `Cloud sessions`;
  - change the early return to `if (entries.length === 0) return null;`;
  - remove the unused `Plus` and `SecondaryButton` imports.
- Remove the pass-through in `ProjectRail.tsx:148,200,567`, `Sidebar.tsx:391,505,2622` and `App.tsx:13712-13715`. Then `grep -rn "onAddSession" src` must return nothing.

**2b. Add it to Settings → Migration.**
- `SettingsView.tsx`: add the prop `onImportSession?: () => void` beside `onImportSessions` (`:549, 575`). In the header block (`:691-695`), pass `action` when `section === "migration" && onImportSession`:
  ```tsx
  <SecondaryButton onClick={onImportSession}>
    <ArrowDownCircle aria-hidden className="size-3.5" strokeWidth={1.75} />
    Import session
  </SecondaryButton>
  ```
  `ArrowDownCircle` is exported by `src/shared/ui/icons.tsx`.
- `App.tsx`, where `SettingsView` gets `onImportSessions` (`:14262`): pass
  `onImportSession={enabledNativeProviders.length > 0 ? () => setImportSessionOpen(true) : undefined}`.
- Rename in `App.tsx` (behaviour unchanged):
  - `addNativeSessionOpen` / `setAddNativeSessionOpen` → `importSessionOpen` / `setImportSessionOpen`;
  - `onAddNativeSession` → `onImportNativeSession`.

**2c. Redesign the dialog.** Rename the file to `ImportSessionDialog.tsx` and the component to `ImportSessionDialog`. Rename both test files to `ImportSessionDialog.test.ts` and `ImportSessionDialog.menu.test.ts`, and update their imports.

Keep `find`, `resumeRow`, `archive`, `submit`, the store and the `submitting`/`busy` logic exactly. Change only the layout and when `find` runs.

```
Import session                                                     ×
Continue a Claude Code or Codex conversation from this computer.

[ Claude Code | Codex ]                               [ Account ▾ ]
[ 🔍 Search by name, message, folder or ID        ]  [ All projects ▾ ]
┌──────────────────────────────────────────────────────────────────┐
│ ◈ Claude Code conversations                                ⧩  ⟳ │   ← ProviderConversationList, unchanged
│ rows…                                                            │
└──────────────────────────────────────────────────────────────────┘
▸ Paste a session ID instead
    [ claude --resume <session-id>                 ]  [ Import ]
Must be on this computer. Close it in the other app first.
```

- **Modal:** `title="Import session"`, `description="Continue a Claude Code or Codex conversation from this computer."`, `size="md"`, `fitViewport`. The form is `className="flex flex-col gap-3 p-4"`.
- **Row 1** (`flex items-center gap-2`), shown only when it has content:
  - **Provider:** `SegmentedSwitch` (`src/shared/ui/SegmentedSwitch.tsx`) with `ariaLabel="Provider"` and options `{ id: "claude", label: "Claude Code" }`, `{ id: "codex", label: "Codex" }`, filtered to `providers`. Render it only when `providers.length > 1`. On change (ignored while `busy`), keep the existing reset: `setAccountId("default")`, `setError(null)`.
  - **Account:** the existing `SearchableSelect`, relabelled `Account`, pushed right with `ml-auto`. Render it only when `accounts.length > 1`. Pass `layer={LAYER.dialogPopover}`. When `accounts` changes and `accountId` is not among them, set it to `accounts[0]?.id ?? "default"` in an effect.
- **Row 2** (`flex items-center gap-2`):
  - **Search:** a wrapper `relative flex h-9 min-w-0 flex-1 items-center` holding:
    - `Search` icon `pointer-events-none absolute left-2.5 size-3.5 text-content/40`;
    - the `<input aria-label="Search conversations">` with classes `h-9 w-full rounded-md border border-content/10 bg-content/5 pl-8 pr-2.5 text-[13px] text-content outline-none placeholder:text-content/30 focus:border-content/25 disabled:opacity-50` and placeholder `Search by name, message, folder or ID`;
    - Enter calls `find()`, as now.
  - **Project:** the existing `SearchableSelect` (`All projects` plus recents), with `layer={LAYER.dialogPopover}` and its label kept for accessibility. Selecting a project calls `setProjectCwd(value)` and then runs `find` with that value.
  - **Remove the Find button.**
- **Loading the list without Find:** the list loads automatically.
  - Add an effect that calls `find()` once on mount, and again whenever `provider`, `accountId` or `projectCwd` changes. It must not run while `submitting.current` is true.
  - Search text applies on Enter only. Also, when the input becomes empty (`query.trim() === ""` after a change), call `find()` so clearing the search restores the full list.
  - `find` reads `query` and `projectCwd` from state. To avoid acting on a stale value right after `setProjectCwd`, have `find` accept optional overrides: `find({ projectCwd?: string, query?: string })`.
- **List box:** unchanged: `h-72 min-h-0 overflow-hidden rounded-md border border-content/10`, `inert` while busy, all existing props including `menuLayer={LAYER.dialogPopover}`.
- **Paste an ID:**
  - keep `<details>`, with the summary text `Paste a session ID instead` (`text-[12px] text-content/55 cursor-pointer`);
  - inside it, a row `mt-2 flex items-center gap-2` with the input (`aria-label="Session ID or resume command"`, the same `h-9` input classes without the icon padding, `pl-2.5`, provider-specific placeholder, and the existing attributes) and an **Import** submit button;
  - the button uses the solid style from `src/features/source-control/ui/CreateBranchDialog.tsx:80`, with `h-9`. While busy it shows `<Loader className="size-3.5 animate-spin" />` `Importing…`. It is disabled when `busy || !input.trim() || providers.length === 0`.
  - The form `onSubmit` still calls `submit()`.
- **Hint:** `<p className="text-[11px] leading-4 text-content/45">Must be on this computer. Close it in the other app first.</p>`. Delete the four-sentence paragraph.
- **Error:** `role="alert"`, `text-[11px] leading-4 text-red-400/90`, same position.
- **Remove the footer** (Cancel / Resume session). Closing works through the Modal × and Escape. Modal's Escape guard still ignores `data-dialog-popover` menus, so this is unchanged.

**2d. Records:** update L-71 in `docs/LOCAL-FEATURES.md` (its Index line and detail row): "Import session" in Settings → Migration, the dialog redesigned and auto-loading, and the sidebar button removed.

### 3. Toggles use the accent colour

- `src/styles/index.css`, after the `html.has-user-accent .primary-action:disabled` rule (`:1898`):
  ```css
  html.has-user-accent [role="switch"][aria-checked="true"]:not([data-switch-tone="danger"]):not(:disabled) {
    background-color: var(--user-accent-color);
  }
  ```
  Keep it unlayered, like its neighbours, so it overrides the `bg-accent` utility.
- `DeleteWorktreeDialog.tsx:159`: add `data-switch-tone="danger"` to its switch.
- **Check each remaining `role="switch"`** (`grep -rn 'role="switch"' src --include=*.tsx`):
  - `Toggle.tsx`, `SkillsPage.tsx:345`, `ModelPicker.tsx:1292` and `AutomationsView.tsx:1661` must expose `aria-checked` and use `bg-accent` when on. Add `aria-checked` where it is missing.
  - `ProjectNotificationSettings.tsx:338` and `SavedPromptForm.tsx:105`: read them. If one is not a two-state on/off switch, leave it and say so in the report.
- Accent row description (`SettingsView.tsx:2895`): `Used for the send button, your message bubbles and switches.`
- The thumb stays `bg-white`.

### 4. Sidebar session card order

In `Sidebar.tsx` `SessionCard`, non-compact mode:
- **Line 1:** pin + title (`ParticleText`, classes unchanged) on the left; `linkedUpdateDot` + `status` on the right (moved here from the model line). This line takes over the old line 1's place inside the `role="button"` element (`:3828`), so clicking the title still selects the session.
- **Line 2:** the branch row (`GitBranch` `:3909`) plus the right-side icon group, unchanged, keeping `mt-1`.
- **Line 3** (new): `relative mt-0.5 flex min-w-0 items-center gap-1.5`, holding `HarnessIcon` (`size-3 shrink-0`) and `{model}` in `min-w-0 truncate text-[11px] text-content/45`. Render it only when `model` is non-empty.

Compact mode (`compact && !orchestrationExpanded`):
- the title + status line, unchanged;
- then the branch row;
- then the `Model: …` label (`:3885-3892`), moved below the branch row and still gated on `compactModelLabels && model`.

When orchestration is expanded, `OrchestrationSidebarAgents` stays directly after the title line, before the branch row.

Keep the drop-target and selection styling, handlers and `title` attributes unchanged.

## UI copy

| Where | Text |
|---|---|
| Settings → Migration header button | `Import session` |
| Dialog title / description | `Import session` / `Continue a Claude Code or Codex conversation from this computer.` |
| Search placeholder | `Search by name, message, folder or ID` |
| Paste disclosure | `Paste a session ID instead` |
| Paste button | `Import` / `Importing…` |
| Hint | `Must be on this computer. Close it in the other app first.` |
| Sidebar rail heading | `Cloud sessions` |
| Accent description | `Used for the send button, your message bubbles and switches.` |

Existing validation and error messages stay unchanged.

## Acceptance criteria

- AC-1: Session Manager's toolbar row is `h-10 items-end`. The gap above the controls equals the gap to the column tops.
- AC-2: The sidebar has no "Sessions" heading and no "Add session" button. Cloud rows appear under "Cloud sessions" only when they exist. `grep -rn onAddSession src` is empty.
- AC-3: Settings → Migration shows "Import session" when a native provider is enabled. It opens the dialog over Settings, and a successful import closes Settings and opens the session.
- AC-4: The dialog:
  - loads the conversation list on open with no Find button;
  - reloads on provider, account or project change, on Enter in search, and when the search is cleared;
  - shows the provider switch only for 2 providers and the account select only for 2+ accounts;
  - uses `h-9` inputs and an `h-9` Import button;
  - has no footer and no long paragraph.
- AC-5: All existing dialog behaviours pass: row open, archive, paste-ID import, provider/account guards, busy lock, and the menu layer/Escape tests from `f3f0656`.
- AC-6: With an accent set, every on switch except the danger one uses it. With no accent, switches keep the default accent.
- AC-7: Sidebar cards show title, then branch, then model (compact: title, branch, `Model:`), with status/time on the title line.

## Test matrix

| AC | Level | File | Scenario |
|---|---|---|---|
| AC-1 | feature | `src/features/session-board/ui/SessionBoardView.test.ts` | The toolbar row containing `[aria-label="Search board"]` has `h-10` and `items-end` |
| AC-2 | static render | `src/app/shell/ProviderRail.test.ts` | Nothing renders with no entries; no "Add session" text anywhere; the heading reads "Cloud sessions" with entries (replace the "offers Add session…" test) |
| AC-3 | feature | the existing `SettingsView` test file (find with `grep -rln "SettingsView" src --include=*.test.ts`) | Migration shows "Import session" when `onImportSession` is given and calls it on click; no button without the prop; other sections have no button |
| AC-4 | feature | `ImportSessionDialog.test.ts` | The list request starts on mount without clicking Find; switching provider, account or project triggers a new request; Enter in search triggers one; clearing the search triggers one; the provider switch shows only with 2 providers; the account select only with 2+ accounts; no "Find", "Resume session" or "Cancel" button; the long paragraph is absent; the paste input and Import button have `h-9` |
| AC-5 | feature | `ImportSessionDialog.test.ts`, `ImportSessionDialog.menu.test.ts` | Existing cases pass after the rename, adjusted only for removed buttons (use form submit for paste, row click for open) |
| AC-6 | unit | `src/shared/ui/Toggle.test.ts` (extend) | Read `src/styles/index.css` as text and assert the `html.has-user-accent [role="switch"][aria-checked="true"]` rule with the danger exclusion; `Toggle` renders `aria-checked`; `DeleteWorktreeDialog`'s switch has `data-switch-tone="danger"` |
| AC-7 | feature | the sidebar card tests (`grep -rln "data-session-select" src --include=*.test.ts`) | In DOM order the title comes before the branch label, which comes before the model; compact mode: title, branch, `Model:` |

## Verification

- `npx tsc --noEmit -p .`
- `npx vitest run src/app/shell src/features/provider-sessions src/features/settings src/features/session-board src/shared/ui`
- Later full checks (not the implementer): `npx vitest run`, `npm run build`.

## Manual checklist (Nakul, desktop)

1. Session Manager: the gap above the Add Draft/search row equals the gap below it.
2. The sidebar no longer shows "Sessions / Add session". Cloud rows, if any, are under "Cloud sessions".
3. Settings → Migration → Import session:
   - the list appears straight away;
   - search with Enter, change project, and switch between Claude Code and Codex;
   - the filter and right-click menus open above the dialog;
   - paste an ID and Import;
   - a successful import closes Settings and opens the session.
4. Appearance → pick an accent: switches in Settings, Skills, the model picker and Automations follow it. Clear it: they return to the default. The delete-worktree switch stays red.
5. Sidebar session cards: title, then branch, then model; compact mode in the same order.

## Facts, decisions, assumptions

**Facts:** see Current behavior.

**Decisions:**
- **Import session lives in Settings → Migration,** which is already about importing Claude/Codex sessions.
- **The cloud rows keep a heading ("Cloud sessions")** so they don't read as projects.
- **The list loads automatically and the Find button is removed.** The sidebar provider panel already auto-loads the same list, so the scan cost is already accepted. Search applies on Enter to avoid a scan per keystroke.
- **One CSS rule for accent switches,** following the existing `html.has-user-accent` pattern. The danger switch opts out with `data-switch-tone="danger"`.
- **The model line keeps the harness icon,** so the provider stays recognisable.

**Assumptions:**
- `accounts` always contains the id that `setAccountId("default")` resets to, or the new effect corrects it.

## Open questions

- None blocking.

## Implementer report format

- Per AC: done / partial / not done, with `file:line` or the test name.
- Deviations, and which `role="switch"` elements you changed or left alone, and why.
- Checks run, with counts.
- Files changed.

## Handoff retro

(Filled in after implementation.)
