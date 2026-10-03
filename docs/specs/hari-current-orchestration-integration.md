# Blocked — Hari on the current orchestration engine — spec

- Workflow status: Blocked. Historical snapshot status and verification notes below are retained.
- Parking record: [orchestration-parking-30sept.md](../notes/orchestration-parking-30sept.md). The unfinished Hari layer is on `personal/hari-orchestration-changes-30sept` at `5620894a64b88b042833d98f62c07f1e2b77d1ed`; resume only in a clean worktree from its pinned base. Desktop review remains pending.


- Tier: complex · Snapshot: `9397898c923491a9ee1e9cd77c4bcc917634c888`, 25 September 2026 · Status: ready for delegated implementation
- Target checkout: `E:\Developing\OpenSource\mono-clone`, branch `nakul/windows-support`.
- Reference only: `E:\Developing\OpenSource\mono-clone-hari`, branch `feature/hari-orchestrator`, six commits after `7095e9f`. Do not merge or cherry-pick that branch.
- Local backup: `E:\Developing\OpenSource\monocode-clone-personalbackup-25sept` at the snapshot commit. It includes the ignored docs and three uncommitted protected files. Do not implement in the backup.

## Goal and user story

Give the user a Hari entry point with one lead conversation and a truthful board of that lead's agent work. As a user, I can describe a goal, review the proposed worker assignments, start the run, inspect progress and needed input, leave and return without stopping work, and recover after restart. Hari is a focused view over MonoCode's current orchestration engine, not a second engine.

## Scope and decisions

1. Work directly in `nakul/windows-support`. The user's instruction overrides the older working agreement's default worktree workflow. Keep the three existing unrelated working-tree edits untouched and unstaged.
2. Port the useful Hari *experience* from the old branch: a visible Hari entry, Chat and Board views, a single selected lead conversation for the current project, and a four-lane read-only board. Reuse the current `SessionPane`, `Composer`, proposal card, worker controls, and session navigation.
3. Hari's first goal enters the current orchestration proposal flow. The lead chooses the task breakdown, harnesses, and models using the current catalog. The user reviews the existing **Confirm & start** card before any worker starts. This preserves the current permission boundary; a different auto-start policy needs a separate product decision and tests.
4. Current orchestration run state in SQLite, current session storage, current worktree lifecycle, and current Automations remain authoritative. Do not add `hari_json`, a second `RunState`, a second scheduler, Hari Git commands, a parallel worker router, or a localStorage run database.
5. The old file-based Hive/inbox/outbox/memory mirror is a separate follow-up. Do not silently imply that this release provides long-term Hari memory. Keep the old branch and its data intact for later review.

### Old branch disposition

| Old code or behavior | Decision for this port | Current owner or reason |
| --- | --- | --- |
| `src/lib/hari/orchestrator.ts`, `planner.ts`, `router.ts`, `supervisor.ts`, `types.ts`, `runs.ts` | Do not copy. Project Hari UI from the current engine. | `src/features/orchestration/model/orchestration.ts:273-314,493-581,795-835,1970-2162` and `orchestrationState.ts:1-115`. |
| `src-tauri/src/session_store.rs` migration 15 and `Session.hari` | Do not copy or renumber migrations. | Current schema reaches version 18 (`src-tauri/src/session_store.rs:482-754,3247-3255`); runs and worker links already persist at `:794-902`. |
| `src-tauri/src/hari.rs` Git worktree commands, `worktrees.ts`, Settings flag | Do not copy. | Current app-managed worker checkout creation/removal is wired at `src/app/App.tsx:7860-8212` and registered at `src-tauri/src/lib.rs:415-422`. |
| `schedule.ts` | Do not copy. | Current Automations already own scheduled launches (`src/features/automations/model/automations.ts:190-260`; `src-tauri/src/lib.rs:327-335`). The old plan itself says its scheduler UI/launch was unfinished (`docs/notes/archive/hari-orchestrator-plan.md:130-143`). |
| `godPrompt.ts` / `HARI-DONE` parsing | Do not copy the old prompt or marker parser. Use the current proposal and control CLI contracts. | `orchestrationPlan.ts:237-255`, `orchestration.ts:829-835,2094-2162`; the current engine observes structured harness events and durable dispatch IDs. |
| `breaker.ts` | Do not graft into the current engine as a second automatic stop path. Inspect current continuation/pause rules and report any concrete unaddressed loop risk separately. | Current run already has bounded continuation and pause/restart paths (`orchestration.ts:493-560,1813-1838,1970-2086`). |
| `HariView`, `HariChatView`, `HariBoardView`, `board.ts` | Use as behavior references; reimplement under current feature folders and UI components. | Old paths `src/surfaces/*` and `src/App.tsx` no longer exist on the target branch. |
| Hive file mirror and memory | Follow-up; leave source branch unchanged. | Current run state is SQLite-owned. A second writer and recovery contract would require separate design. |

## Out of scope

- No remote-chat worktree changes, new provider, new model-routing algorithm, new dependency, new Tauri command, database schema migration, separate run store, autonomous approval bypass, or new scheduled-run UI.
- No copy of the old `src/App.tsx`, `src/chrome/*`, `src/lib/hari/*`, or `src/surfaces/*` files into the reorganized tree. No `git merge` or `git cherry-pick` from `feature/hari-orchestrator`.
- No version bump, installer build, commit, fork push, worktree deletion, or browser-based UI test during this implementation handoff. After automated gates, report for Tauri dev-mode verification. Release work begins only after that verdict.
- Do not relocate `docs/` or alter the working agreement in this feature. Those are separate local workflow decisions.

## Current behavior and evidence

- `AppMode` accepts only `projects | chat` and the loader maps unknown values to `projects` (`src/features/settings/model/appearance.ts:1549-1562`). `App.tsx:890,8549-8552` owns and persists the mode.
- `ProjectRail` receives mode callbacks but does not render a Hari control (`src/app/shell/ProjectRail.tsx:252-295,678-1004`). The compact rail is a distinct path in `src/app/shell/Sidebar.tsx:1897-1966`; both must expose the same new destination without disturbing current hover groups.
- Normal sessions are created with `newDefaultSession` and `newTab` in `src/app/App.tsx:2133-2152`. The existing composer sends `intent: "orchestrate"` when its Orchestrator mode is selected (`src/features/sessions/ui/Composer.tsx:1360-1400,2080-2146`). `App.tsx:5758-5836,6550-6575` performs the proposal submission and current run checks.
- The current lead produces an editable proposal card and cannot start workers before approval (`src/features/orchestration/model/orchestrationPlan.ts:237-255`; `src/app/App.tsx:8342-8404`). `Orchestrator.startApproved` validates proposal, checkout, and model availability (`orchestration.ts:581-674`). Keep that contract.
- Current run state owns tasks, dispatch IDs, accepted review, workspace identity, and resume state (`orchestrationState.ts:1-115`). `Orchestrator.hydrate` pauses interrupted active runs and retains worker checkouts (`orchestration.ts:493-560`). Sidebar worker status and actions already exist (`src/features/orchestration/ui/OrchestrationSidebarAgents.tsx:17-150`). Reuse their labels and actions.
- The old Hari branch diverged from `7095e9f`; its six feature commits add about 4,432 lines across 39 older-layout paths. The target branch has 220 further commits, including a source reorganization and a newer orchestration engine. Its older successful test run is evidence about that old branch only, not a gate for this port.

## Proposed behavior and invariants

1. Hari is one focused *view* of the current project's lead session. It does not own an independent worker lifecycle. A lead remains a normal persisted session; its proposal and run are the current proposal block and `OrchestrationRun` keyed by `leadId`.
2. Entering or leaving Hari never starts, stops, duplicates, or deletes a run. It only selects a view/session. A pending user draft survives view changes according to the existing session composer behavior.
3. Opening Hari in a project chooses that project's currently selected eligible orchestration lead; otherwise the most recently active eligible lead with a proposal or run. If none exists, show an empty Hari chat composer. Do not create and persist a blank lead merely by opening the view. On the first accepted goal submission, create exactly one normal lead session and submit once with `intent: "orchestrate"`. A rejected submission retains the draft and creates no duplicate lead.
4. A change of project while a proposal or render is pending must not switch the visible Hari view back to the previous project's lead when an older async callback completes. Use the current project identity and a revision/eligibility check at the selection boundary. The underlying old project's run may continue normally.
5. The Board derives from the current orchestration proposal/run and session state on each render. It never writes a second board store. Cards represent tasks in the selected lead's proposal/run. A non-orchestrated ordinary chat is not labeled “Done.” A saved run without live sessions uses its persisted task states and a visible “Saved” or “Paused” label, not a fake spinner.
6. Board lanes are: **Todos** = queued; **In Progress** = running or cancelling; **Needs Input** = blocked, failed, interrupted, pending approval/question, or a paused run's undelivered task; **Done** = completed and accepted. A completed task awaiting review stays in Needs Input with “Review result.” A cancelled task is shown as cancelled in Needs Input until dismissed or the run is closed. Use `orchestrationTaskLabel` where possible; do not infer success from an idle session.
7. Clicking a card opens the real worker session or existing worker inspector. Need-input and retry/stop/approve controls remain the current ones. Never auto-answer an approval or question from the board.
8. On restart, a saved active run is paused through current hydration; Hari shows its paused state and existing Resume action. It does not silently restart workers, lose their retained checkouts, or claim a run is active before hydration completes.
9. Existing Projects, Chat, rail hover/selection, chat-background effects, wallpaper settings, ordinary orchestration proposals, Automations, Inbox, Notes, and remote-chat worktree contents remain unchanged.

## States and transitions

| State | Event | Next state and visible result |
| --- | --- | --- |
| No eligible lead | Open Hari | Empty Chat and Board; “Describe a goal for Hari” composer; no session/run persisted. |
| Draft goal | Submit once | One lead is created; draft clears only after accepted submit; proposal shows “Preparing plan.” |
| Draft goal | Submit rejected, duplicate click, or navigation | Draft remains; no second lead, worker, or proposal. |
| Planning | Valid proposal finishes | Existing editable assignment card appears; Board shows proposed queued tasks but no running worker. |
| Planning | Invalid proposal/provider error | Current invalid/retry feedback appears; Board does not show running workers. |
| Ready proposal | Confirm & start | Current `startApproved` starts one run; Board follows durable task statuses. |
| Ready proposal | Close Hari, switch tab/project | Proposal stays with lead; no start. Returning restores the same proposal. |
| Active run | Worker needs approval/question or fails | Needs Input card and existing actionable details; no invented approval. |
| Active run | Worker completes but awaits review | Needs Input “Review result”; Done only after accepted review. |
| Active run | App exits/restarts | Hydration marks active work interrupted and run paused; retained checkout and Resume remain available. |
| Any run | Switch project or leave Hari | Work continues under its own lead; the visible board changes to the newly selected project's lead. |
| Finished/stopped run | Open Hari | Read-only final status and task results; a new goal uses a fresh proposal/session rather than mutating the finished run. |

## Acceptance criteria

- **AC-1:** Given `9397898` with the three protected edits, when Hari is implemented directly on `nakul/windows-support`, then those files have exactly their starting SHA-256 hashes, remain unstaged, and no old-layout Hari file, schema migration, or new worktree was added.
- **AC-2:** Given either expanded or compact rail, when Hari is selected by pointer or keyboard, then the Hari surface opens, current rail selected and sliding-hover behavior remains, and returning to the prior workspace shows its previous active tab and draft.
- **AC-3:** Given no Hari lead in the current project, when the user enters a goal and submits once, then exactly one normal lead/proposal is created with `intent: "orchestrate"`; before Confirm & start, worker creation count is zero.
- **AC-4:** Given a pending or invalid proposal, when the user navigates away and back or retries, then the same lead/proposal/draft and current error state are shown without duplicate workers. A later valid proposal follows the existing card.
- **AC-5:** Given two projects A and B, when A's proposal finishes after the user has switched Hari to B, then B remains visible; A's saved proposal is available when returning to A. No cross-project worker is shown in B's board.
- **AC-6:** Given a confirmed run with queued, running, blocked, completed-awaiting-review, and accepted-completed tasks, then the board puts each in the exact lane above; each card names its task, model/harness, current status, and opens the correct worker or inspector.
- **AC-7:** Given a worker approval/question, failed task, interrupted run, or paused run, then Hari surfaces the existing current-engine action and error; it does not answer, retry, resume, or stop automatically. A stale request ID cannot be acted upon via a card.
- **AC-8:** Given an active run, when the user closes Hari, switches Projects/Chat, or restarts the app, then the run is not deleted; after restart it appears paused with retained workers and explicit Resume, matching existing orchestration behavior.
- **AC-9:** Given a finished run and a new goal, then the old run stays readable and the new goal gets its own proposal. Rapid repeat submissions and completion callbacks cannot attach a result to the wrong lead.
- **AC-10:** Existing ordinary Orchestrator composer flow and current Automations, worker checkouts, Sidebar sessions, and appearance state still pass their direct regression tests. No new database migration or Tauri command appears in the diff.

## Ordering and ownership contracts

1. **Selection:** derive eligible leads from current project identity + current session/proposal/run state. On every async completion, recheck the current project and selected lead before changing Hari's visible selection. Old work may settle in its own project; it cannot seize the foreground.
2. **First submit:** keep the user's text in the composer until `onSubmit` accepts. Claim/create one lead, submit with the current orchestration intent, and only then expose its proposal. Guard double clicks while that transaction is in flight. If submission fails before acceptance, do not leave a phantom saved Hari lead; retain draft and show current error.
3. **Proposal and start:** current proposal state is the only plan record. Confirm & start calls current `startApproved` once with the proposal ID; duplicate clicks remain disabled/in flight. Worker creation is owned by the current orchestrator only. After failure, keep the card and error for retry; do not synthesize a run.
4. **Board:** subscribe to current run/session stores. Compute lane projection as a pure function; never mirror statuses into localStorage or write to SQLite from the board. Use task/dispatch identity, not session title, when receiving delayed outcomes.
5. **Navigation and cleanup:** switching a view cancels only view-owned subscriptions/focus work. It does not revoke object URLs, stop harnesses, delete worktrees, change queue state, or alter another project's run. Deleting a lead/session continues to use current `Orchestrator.deleteSession` and session removal path.

## Implementation plan

1. Before editing, confirm target branch/HEAD and record SHA-256 of `src-tauri/Cargo.toml`, `src/features/sessions/model/systemBreakdown.ts`, and `systemBreakdown.test.ts`. Expected hashes are `894B5D3441D93D8DF11F311AE37FCAD767C2A254C9BDC5B1C0A5BFA7DA6CFCE6`, `54B9DFA03305CA37E99B95035910A8C339106ED47C8583E2E1D8DC9EC3072A1F`, and `7363FC14EDA1002A995D3193A8EE116778D3C8D4E6260D6A7F1068613345A708`. Stop if they differ unexpectedly. Read old Hari files as reference only; inspect current source before each adaptation.
2. `src/features/settings/model/appearance.ts:1549-1562`: add `hari` to `AppMode` and loader validation. Keep existing `projects`/`chat` persisted values and fallback. Add focused storage tests.
3. `src/features/orchestration/model/`: add a small pure Hari projection/selection module and tests. Inputs: current project, sessions, proposal blocks, current/saved runs. Outputs: selected lead, empty/ready/active/paused/finished view state, four board lanes. Reuse `OrchestrationTask`, `OrchestrationSummary`, `orchestrationTaskLabel`, and `sessionNeedsInput`; do not copy old `board.ts` or `RunState`.
4. `src/features/orchestration/ui/`: add a Hari surface with Chat/Board tabs and an accessible four-lane read-only board. Reuse current `SessionPane` and worker inspector/actions. Provide exact empty, loading, invalid proposal, paused, and finished states above. Use current tokens and Tailwind; do not import old `src/surfaces` components wholesale.
5. `src/features/sessions/ui/Composer.tsx` and its parent prop path only if needed: expose a typed Hari first-goal intent so Hari's empty composer starts the current proposal flow without asking the user to discover the plus-menu option. Keep ordinary composer default and queue/steer behavior unchanged. No extra independent submit handler or second provider event loop.
6. `src/app/App.tsx:890,2133-2152,5758-5836,8342-8404,8549-8552,9450-9855`: wire Hari view to existing session creation, `onSubmit`, proposal approval, orchestration subscriptions, project selection, and session navigation. Keep the current tab/pane and background surfaces mounted as today where required; do not break terminal, editor, or transcript pooling. Do not add an 800-ms Hari tick loop; current orchestrator already observes harness events and pumps its own work.
7. `src/app/shell/ProjectRail.tsx:252-295,678-1004` and `src/app/shell/Sidebar.tsx:1897-1966`: expose Hari from both rail forms using existing action/hover patterns. Preserve the compact shortcut hover marker and flexible gap semantics. The mode switch should not activate a different project or close the prior tab. Add focused component tests for keyboard access, selected state, and hover continuity.
8. Only if tests show a concrete missing behavior, make a narrow change to the current orchestrator and add a regression to `src/features/orchestration/model/orchestration.test.ts`. Never replace current run persistence, CLI protocol, worktree operations, pause, or approval handling with old branch implementations.
9. Update the ignored local `docs/notes/archive/hari-orchestrator-plan.md`, `docs/changelog/LOCAL-CHANGELOG.md`, and `docs/WINDOWS-CHANGES.md` with the adaptation decision, tested states, and remaining manual checks. `docs/WINDOWS-CHANGES.md` has non-UTF-8 bytes; edit targeted text without rewriting unrelated bytes. Do not move local docs during this feature.

## UI details

- Entry label: **Hari**. Show it in expanded and compact rail with an accessible name; use the same active treatment as current rail destinations.
- Tabs: **Chat** and **Board**. Default Chat when opening Hari; changing tabs does not change the active lead or run. Board is read-only, with lane headings **Todos**, **In Progress**, **Needs Input**, **Done**.
- Empty Chat: “Describe a goal for Hari.” Empty Board: “No agent tasks yet. Describe a goal in Hari chat.” A proposal awaiting approval shows “Review the plan before starting agents.”
- Cards show real task title, harness/model, status, and the existing task action/inspection route. For a saved run, show “Saved”; for a paused run, show “Paused — review and resume.” Do not show a running indicator for a saved/paused worker.
- Buttons are semantic and keyboard-operable. Preserve visible focus, reduced-motion behavior, narrow-window scrolling, and the current glass/tint design. Do not create a new color system.

## Test matrix

| AC or risk | Level | Suggested file | Deterministic case |
| --- | --- | --- | --- |
| AC-2, rail regression | Component | `src/app/shell/SidebarRename.test.ts` and ProjectRail tests | Expanded/compact Hari action, keyboard focus/selection, shortcut hover marker and Settings gap. |
| AC-3/4, submit ownership | Feature/component | New Hari UI test plus `Composer` test | Deferred submit; double click, rejection and retry; zero worker calls before Confirm & start; draft retained on rejection. |
| AC-5, stale project result | Feature/component | New Hari UI test | A proposal promise for project A resolves after selection of B; B remains visible; returning to A shows A. |
| AC-6, lane correctness | Pure + component | New Hari projection test and board test | Every status, pending question, accepted vs awaiting-review completion, saved vs live, ordinary idle chat excluded. |
| AC-7, action integrity | Feature/component | Existing `OrchestrationFlow.test.ts` extended narrowly | Approval/question and pause use current action; stale request ID refused; failed/blocked card preserves error. |
| AC-8/9, restart and new goal | Feature/model | Existing orchestration tests plus Hari UI test | Hydration pauses active run with retained checkout; closing/reopening view does not stop; finished run + new goal creates a different lead. |
| AC-10, neighbor regressions | Existing suites | Composer, Sidebar, orchestration, automation, appearance | Current proposal flow, worker reviews, worktree selection, chat/appearance controls remain green. |

Use deferred promises and fake stores at action boundaries; do not rely on timers to “probably” reproduce races. Do not weaken or delete existing tests.

## Verification and release gate

- Implementer: run focused tests for changed files, `npm run check:web` (full Vitest and TypeScript), `CARGO_BUILD_JOBS=1 npm run check:rust` serially, `npm run build`, and `git diff --check`. Try changed-file ESLint only if a usable flat config appears; record the existing missing-config blocker accurately. Do not overlap Cargo builds.
- Inspect `git diff --name-only`, `git diff --check`, and protected-file hashes. No `src-tauri/src/session_store.rs`, `src-tauri/src/lib.rs`, old Hari paths, version files, or remote-chat files should be changed unless a separately documented, demonstrated need is approved.
- Stop after code/tests and hand off for native Tauri dev-mode verification. The user or a separately authorized native-UI agent checks both rail forms, Hari empty state, proposal review, worker progress/needs input, project switching, leaving/reopening Hari, and restart/Resume. Do not claim these are automated passes.
- Only after dev-mode confirmation: a separate release step versions the next unique local installer, runs final gates on the exact release source, archives the NSIS artifact, and waits for installed-build confirmation before pushing the fork. Keep the existing `0.1.55-local3-rail-wallpaper` installers intact.

## Facts, assumptions, open questions

- Fact: target `HEAD` is `9397898`; `feature/hari-orchestrator` is six commits ahead of its old base while target is 220 commits ahead. The old branch is a reference, not a merge candidate.
- Fact: the target has current orchestration state/worker checkout/automation infrastructure and schema version 18; the old branch's schema version 15 and localStorage runs are not compatible sources of truth.
- Assumption for this spec: the first Hari release keeps **Confirm & start** and delivers manager/board on the current engine. It does not include old Hive memory. If the user answers either product question differently before implementation, revise this spec first.
- No code/API question blocks the spec. If the implementer discovers a semantic conflict where retaining current behavior prevents an acceptance criterion, report the file, old and current behavior, and user-visible consequence before changing the current contract.

## Skills to load

`spec-implement`, `frontend-ui`, `desktop-app`, and `testing`. Use SocratiCode for navigation only if its index is green; verify current source directly.

## Implementer report format

For each AC, mark done/partial/not done with final `file:line` and test evidence. List old Hari modules deliberately not ported and why; name any current-contract change and its user impact. Separate automated gates, source reasoning, and unobserved native UI behavior. Include all changed paths, protected-file hashes, `git status`, and the exact manual test list. State clearly that no installer, commit, push, new worktree, or remote-chat edit was made.

## Handoff retro

Fill after reviewing the implementer's report against this spec.
