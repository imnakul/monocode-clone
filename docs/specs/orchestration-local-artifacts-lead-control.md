# Blocked — Local handoff files and lead control — implementation spec

- Workflow status: Blocked. Historical snapshot status and verification notes below are retained.
- Parking record: [orchestration-parking-30sept.md](../notes/orchestration-parking-30sept.md). The unfinished four-feature layer is on `personal/park-other-orchestration-mode-changes-30sept` at `ac546f3769ab2b69dc1c6df31a1b33ef94378e2c`; resume only in a clean worktree from its pinned base. The archive is unverified WIP and desktop verification remains pending.


- Tier: complex
- Snapshot: `9397898` on `nakul/windows-support`, 2026-09-25
- Status: implementation ready
- 28 September update: the separate lead checkout chooser described in the follow-up notes was later tried and reverted at Nakul's request. Treat that follow-up as historical, not as active implementation scope.
- Checkout: `E:\Developing\OpenSource\mono-clone`; work directly in this checkout. Do not create a branch or worktree for this change. Preserve the current unrelated Hari, Cargo, and `systemBreakdown` edits. Recheck the snapshot and dirty paths before implementation because another agent may still be editing Hari files.

## Goal and user story

An orchestrated spec worker must be able to hand a deliberately local, Git-ignored spec to the lead and a dependent implementation worker without changing `.gitignore` or staging the spec. When the lead is producing a response, the user must be able to stop only that response, change the lead model, and continue supervising the existing workers. A separate, explicit action must cancel the whole orchestration.

As a user, I can stop an expensive lead turn and resume it manually or let a meaningful worker result wake it; I can keep private local documentation private while passing it between assigned workers.

## Scope

1. Exact-path, opt-in handoff of local Git-ignored files between an isolated worker, the lead checkout, and dependent isolated workers. A spec under `docs/specs/` is the primary case. The handoff file remains ignored by Git.
2. Distinct UI actions: **Stop lead response** and **Cancel orchestration**. The first does not cancel workers or revoke the lead's control grant. The second uses the existing run cancellation behavior after a clear confirmation.
3. Resume through a normal lead message (for example, “please continue”), event-driven `sync()` after an actionable worker result/blocker, and the existing paused-run recovery path after a model or usage-limit failure. Model changes between lead turns must work.
4. A per-run supervision choice on the confirmation card: **Efficient** (default, at most two empty bounded waits, then end the lead turn until an actionable `sync()` wake) or **Live supervision** (the lead may continue bounded waits and report useful milestones). Show that Live supervision uses more lead model turns. Worker progress remains visible in the worker pane in either mode. Persist the choice with the run and inject the matching lead instruction.

## Out of scope

- Reopening or silently migrating a run already marked `stopped` by the current version. Preserve its retained worktrees for manual recovery.
- Automatically including all ignored files, copying whole ignored directories, or publishing local docs to Git.
- Changes to model pricing, worker model choice, queue reordering, Hari board design, releases, commits, or pushes.
- Choosing a new lead branch or worktree at orchestration startup, and adding queue-only composition while a session is idle. Those need separate app flows described in the handoff notes below; do not implement them as prompt-only workarounds in this fix.

## Current behavior and root causes

- The composer Stop button calls `SessionPane.onStop` (`src/features/sessions/ui/SessionPane.tsx:577`), which calls `App.onStop` (`src/app/App.tsx:7626`). For an orchestrator lead, `stopForSession` calls `stopRun` (`src/features/orchestration/model/orchestration.ts:1906`), cancelling its tasks and disabling the control grant (`:1838-1904`). The next lead turn has no control environment; `src-tauri/src/control_cli.rs:186-191` reports “No MonoCode connection.” This is why changing from Sol to Luna after pressing the input-area Stop could not continue the run.
- The lead's control endpoint and token are injected into a child process only when its session has a grant (`src-tauri/src/control.rs:391-405`). The grant is associated with the lead session, not the model. Preserve it when stopping only a lead turn.
- `copy_checkout_state` seeds an isolated worker using `git_diff_files_for` (`src-tauri/src/worktrees.rs:246-281`). That index uses `git ls-files -o --exclude-standard` for untracked files (`src-tauri/src/fs.rs:1490-1555,1657-1675`), so an ignored local spec is not seeded into a later worker checkout.
- The checkpoint can capture a file's before and after states from structured edit events (`src-tauri/src/checkpoint.rs:89-185`), but an ignored file written through a shell command can miss that pre-edit boundary. `verified_worker_delta` refuses unprepared or unattributed changes (`:736-812`). Adding the file to Git or changing `.gitignore` after it was written does not reconstruct the missing pre-edit state. Review currently calls checkpoint integration before accepting a completed isolated task (`src/features/orchestration/model/orchestration.ts:1249-1299`; `src/app/App.tsx:8025-8060`). A dependent task waits for acceptance (`orchestration.ts:1454-1481`).
- `sync()` already wakes an idle active lead for undelivered terminal results or blocked input, and avoids interrupting a busy lead or queued user message (`orchestration.ts:1970-2068`). The injected lead prompt still encourages repeated waits (`:829-834`). A failed automatic lead continuation currently pauses the run and interrupts active workers (`:2068-2082`, `:1812-1837`).
- A paused run can resume from retained worker checkouts. A stopped run starts a new run with an empty task list (`orchestration.ts:671-793`); the old cancelled tasks are not reattached. `submissionError` currently blocks normal lead messages while paused (`:795-827`).

## Proposed behavior and invariants

### Local handoff files

- Add an explicit **handoff files** list of exact project-relative file paths to an orchestration task/proposal and the control delegate contract. Display these paths in the confirmation card. No directory or glob entry grants ignored-file handoff, including `.`. A worker may read normal project files as before; this list only grants local artifact transfer.
- The spec task declares its exact output path (for example, `docs/specs/capture-copy-and-save.md`) as a handoff file. Before dispatch, snapshot that path's present/missing state and bytes in the lead checkout. Seed an existing file into the worker checkout. After the worker completes, compare the declared file against that baseline regardless of Git ignore status or whether the write came from a structured edit tool or a shell command. Record the exact after bytes/hash for review.
- Show a reviewable before/after for each changed declared handoff file. On `review`, preflight both the worker file and lead target, then integrate the file only if the lead target still matches the recorded baseline (or the exact previously applied result on retry). Accept the task only after all code and handoff-file integration succeeds. A dependent worker receives the accepted handoff bytes when its isolated checkout is seeded.
- Never `git add`, alter `.gitignore`, or turn a handoff file into a tracked file. Never scan or transfer undeclared ignored files. Keep the existing strict checkpoint checks for ordinary code changes. If a task unexpectedly changes another ignored file, report it as outside the approved handoff and retain the worker checkout rather than silently discarding or transferring it.
- Validate each handoff path at the Rust filesystem boundary: relative within the selected repo, exact file path, no traversal or symlink component, regular file or missing, bounded size (use the checkpoint's existing supported-size limit). Reject any `.git`, `node_modules`, or `target` path component, and any basename equal to `.env` or beginning `.env.` (case-insensitive). Reject unsafe paths before dispatch. Do not echo private file content in errors or logs. Preserve byte content and file mode where supported. A second read/check immediately before integration must detect post-review edits.
- Persist the handoff path, baseline, accepted content hash, and integration state needed for retry/restart. Cleanup must treat changed declared ignored files as changes: cancelling a worker must not delete its only copy. A dependent worker must receive the accepted version, never an earlier copy or an unreviewed file.

### Lead control

- While an active lead is streaming, show two distinguishable, accessible actions: **Stop lead response** in the composer and **Cancel orchestration** in the run controls. Both actions must be discoverable without opening an overflow menu. When the lead is idle but the run is active, keep **Cancel orchestration** available in the run controls. The cancel action first confirms: “Cancel this orchestration? Running workers will stop. Unintegrated changes will remain in their worktrees.”
- **Stop lead response** interrupts only the current lead model turn. Keep the run `active`, preserve worker task states/worktrees, queued user messages, and the lead control grant. Do not call `stopForSession`/`stopRun` for this action. Do not classify an intentional lead-turn stop as an automatic-continuation failure or pause the workers. Use an interruption identity/generation so a late completion or `sync` callback cannot resurrect an old turn, lose an undelivered result, or submit twice.
- After the lead becomes idle, `sync()` may wake it once for a **new actionable event**: a worker's completed/failed/blocked result or a pending worker question/approval. Intermediate worker tool/progress events do not wake the lead. Stopping a lead turn must not immediately re-run the same unfinished wait/progress narration. An undelivered result already involved in the interrupted lead turn remains available to a later manual continuation or new worker event.
- The user may select another lead model and submit “please continue” in the same session. Its new turn receives the existing control grant, sees the current run/tasks, and can review or respond. Preserve the ordering between a queued user message and `sync`: user input is handled first, then any undelivered worker result exactly once.
- If an automatic lead continuation fails due to model limits, retain the current safe `paused` behavior and worker checkouts. Permit an explicit lead message while paused to perform the same guarded recovery as the Resume button and send that message once after recovery. Label the composer action **Resume and send** in that state; show checkout/busy blockers rather than starting a second run. Switching models and sending “please continue” hours later must recover the same task IDs and worktrees. Do not automatically retry a quota failure in a loop.
- **Cancel orchestration** alone calls `stopRun`, cancels active/queued workers and revokes the grant. It is not interchangeable with stopping a lead response. Cancelling and stopping concurrently must settle in the cancelled state without an automatic wake.
- Replace “use bounded wait calls while supervising” in the lead prompt with the selected supervision policy. In **Efficient**, use at most two empty waits after dispatch, then end the lead response normally; do not call the input-area Stop button or stop the session. `sync()` handles results/blockers. In **Live supervision**, bounded waits and concise milestone updates are allowed. Do not repeat unchanged progress. Keep the policy visible on the confirmation card and in the running summary, with **Efficient** as the default for old saved proposals.

## States and transitions

| Current state | Event | Next state and user-visible result |
| --- | --- | --- |
| Active run, lead streaming, worker running | Stop lead response | Run stays active; lead turn stops; worker continues; both controls retain their distinct labels. |
| Active run, lead idle | Worker progress/tool event | No lead model turn; worker pane updates. |
| Active run, lead idle | Worker terminal result or blocked input | `sync()` wakes lead once with the result/question unless a user message is queued. |
| Active run, lead idle | User changes model and sends “please continue” | Same run and task IDs; new model has control access and sees pending results. |
| Active run | Cancel orchestration, then confirm | Run stopped, tasks cancelled, grant revoked; changed worker worktrees retained. |
| Active run | Lead model/quota failure | Run paused and workers safely interrupted; no retry loop. |
| Paused run | User changes model and sends “please continue” | Guarded resume of same run/worktrees, then message delivered once. |
| Spec worker completed | Lead reviews ignored handoff file | Exact diff is visible; accepted bytes integrate without changing Git ignore state; dependent task becomes eligible. |

## Acceptance criteria and deterministic tests

1. Given a temporary repo where `docs/` is ignored, when a spec worker writes its declared handoff file using a shell command that emits no structured file path, then review shows its exact content, accepts it, copies it to the lead, and a dependent implementation worker reads identical bytes. `.gitignore`, Git index, and `git status` do not acquire the spec.
2. Given a pre-existing ignored spec, when a worker changes it, then its original bytes are the baseline and a conflicting lead edit blocks integration without overwriting either copy. An identical retry of a partially applied integration succeeds without duplicate content.
3. Given an undeclared ignored `.env`, an ignored directory, symlink path, path traversal, oversized file, or an unexpected ignored change, then no private bytes are copied or logged, review fails with a useful path-safe error, and the edited worker checkout remains available. Ordinary tracked/untracked code checkpoint rules remain strict.
4. Given worker A's accepted spec and a dependent worker B, then B starts only after A's review/acceptance and receives the accepted spec version. A cancelled or failed A cannot supply it. Restart/recovery never overwrites newer local bytes in B's retained checkout.
5. Given an active worker and a streaming lead, when the user clicks Stop lead response, then only the lead turn stops; the worker keeps running, the run remains active, and the control grant remains enabled. A late callback from the stopped turn cannot pause/cancel the run.
6. Given that stopped lead, when the user switches from Sol to Luna and sends “please continue,” then Luna can use `control get/list` for the same run; task IDs, worker checkout, queued messages, and undelivered results are preserved. When the worker finishes instead, `sync()` wakes the idle lead once. A progress event alone never wakes it.
7. Given a result that arrives just before, during, or just after Stop lead response, then it is delivered once to the next successful lead turn. Repeated Stop clicks and Stop versus Cancel races do not duplicate submissions or change a cancelled run back to active.
8. Given an automatic lead continuation failing because its model is unavailable, then the run pauses with retained worker edits and no retry loop. After selecting an available model, submitting “please continue” resumes the same run and sends the message once; a busy lead, another busy session in the checkout, or wrong checkout shows a blocker.
9. Given an active run, when Cancel orchestration is confirmed, then active/queued tasks are cancelled, the grant is disabled, and changed worker checkouts remain. Dismissing confirmation changes nothing. The composer Stop action never performs this cancellation.
10. Given a long quiet worker run in Efficient mode, the lead performs no more than two empty waits and no repeated progress narration; it ends its turn without stopping the run, and eventual completion/blocker still wakes it. Given Live supervision, the lead may make further bounded waits. The choice persists across a pause/restart and old proposals default to Efficient.

Use deferred promises and fake timers for completion-before-idle, stop-versus-completion, result delivery, and cancellation races. Test the UI action handlers as well as the orchestration model; model-only tests cannot prove the composer button is wired correctly. Add Rust tests for ignored-file seeding/integration/path and conflict checks, plus TypeScript tests for proposal/task metadata, rendering and persistence. Do not weaken existing checkpoint tests.

## Implementation map

- `src/features/orchestration/model/orchestrationPlan.ts` and orchestration task types: add exact handoff-file metadata to proposal/delegate validation and the visible confirmation card; add and persist the Efficient/Live supervision selection; document the spec-first dependency and acceptance gate.
- `src/features/orchestration/model/orchestration.ts` and tests: separate lead-turn interruption from run cancellation; distinguish intentional cancellation callbacks from model failure, preserve deliveries, enable message-based paused resume, enforce bounded-wait prompt, and keep event-driven `sync` deduplicated.
- `src/features/sessions/ui/Composer.tsx`, `SessionPane.tsx`, `src/app/App.tsx`, orchestration run controls, and their tests: wire two distinct buttons and confirmation; ensure changing lead model does not replace the lead session ID or grant.
- `src-tauri/src/worktrees.rs`, `checkpoint.rs`, relevant Tauri IPC wrappers and tests: explicitly seed, capture, review, integrate, and recover declared ignored handoff files without relying on Git's dirty-file index. Reuse existing project-root and symlink validation patterns; keep Git-only code delta validation.
- Local plan/changelogs: record the observed failure, chosen handoff contract, checks, and remaining manual Tauri behavior. Do not modify the unrelated Hari feature design.

## Skills to load

`spec-implement`, `desktop-app`, `frontend-ui`, and `testing`. This changes the existing product UI and Tauri filesystem integration; `frontend-design` is unnecessary because the design system already exists.

## Verification and manual checks

- Run focused TypeScript component/model tests and Rust module tests first, then the repo's full web gate, TypeScript, Rust formatting/Clippy/tests (one Cargo job if memory requires it), production build, and `git diff --check`. Report the ESLint flat-config blocker if it still exists. Do not build an installer, commit, push, or open the desktop UI in this handoff.
- Manual dev-app pointers for the user: start a two-task run with an ignored local spec; review and hand it to a dependent worker; inspect Git status; stop the lead response while a worker runs; change lead model and send “please continue”; let a worker finish and observe one wake; cancel a separate test run with confirmation; close/reopen after a paused model failure and resume.

## Facts, decisions, assumptions, and open questions

- Fact: the current input-area Stop is wired to `stopRun` for a lead. The user's earlier click stopped the run even though they intended to stop only the lead response.
- Fact: `git_diff_files_for` excludes ignored new files, and downstream worktree seeding relies on that list. Checkpoint snapshots need a trustworthy pre-edit state.
- Unverified detail: the failed CapKit worker's checkpoint manifest was not inspected. The source establishes why an ignored shell-written file can lack a recoverable checkpoint; the implementer should inspect a reproduced manifest and error before coding the fix.
- Decision: ignored-file handoff is explicit per exact file, not a global change to Git status or `.gitignore`.
- Decision: a stopped run from the old implementation is not silently revived. Its worker checkout must be inspected and recovered deliberately.
- Assumption: user-confirmed task proposals may authorize named local handoff files. If the current proposal UI cannot display them before confirmation, add that disclosure before enabling transfer.
- Follow-up design: offer **Current branch**, **New branch in this checkout**, **New branch and worktree**, and **Custom** before planning. This must be an app-level checkout selection and validation step, since the current proposal binds to one checkout and workers are forbidden to switch branches. Show the dirty-tree and target path before any switch; do not stash or move unrelated edits automatically. These choices describe the lead/integration checkout; the engine currently still creates isolated worker worktrees under every choice. If “Current branch” is meant to make workers edit the shared checkout directly, add a separate, explicit shared-worker policy with conflict controls. This is separate from this fix.
- Follow-up design: offer **Queue locally** and **Send now** while idle, including a new session or a held queue. Queue locally must persist without provider calls or auto-dispatch. A later **Start with queued ideas** action should send a deliberate combined prompt if the ideas are meant as one job; sequential queue release is a different action. Manual reordering remains separate from this fix.
- Open questions: none that block implementation. If another agent is still editing `App.tsx`/`Composer.tsx` for Hari, preserve its changes and coordinate rather than overwriting them.

## Implementer report format

For each acceptance criterion: done/partial/not done with test or file evidence. List files changed, checks and exact results, any retained worktrees, any migration or recovery limitations, and manual UI checks not performed. Separate source reasoning from observed desktop behavior.

## Handoff retro

To fill after implementation review.
