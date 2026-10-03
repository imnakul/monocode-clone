# Hari current orchestration integration — active plan

The authoritative scope is `docs/specs/hari-current-orchestration-integration.md` on `nakul/windows-support`. This current integration reuses MonoCode's existing sessions and orchestration runner. It supersedes the older Hive, scheduler, worktree automation, and replacement-engine proposal below; that material is retained only as historical exploration.

## Goal

Add Hari as a project-scoped mode that reuses the existing lead conversation, proposal confirmation, orchestration run, and worker details. Keep the workspace tabs and panes mounted behind the mode.

## Status

- [x] Persist the Hari mode and expose it in expanded and compact project rails.
- [x] Add project-scoped lead selection and a read-only board projection from real orchestration summaries.
- [x] Reuse `SessionPane`, the existing Confirm & start proposal card, and `OrchestrationSidebarAgents`.
- [x] Keep a blank goal transient; create one normal lead only when the first goal submit is accepted, with `intent: orchestrate`.
- [x] Preserve composer text on rejection and route a closed run's next goal to a fresh lead.
- [x] Gate lead loading and selection by the current project; keep existing workspace panes mounted under Hari.
- [x] Focused Vitest: 62 tests passed. TypeScript check and `git diff --check` passed.
- [ ] Changed-file ESLint is blocked because this checkout has no `eslint.config.*` file.
- [ ] Run the requested native Tauri dev-mode handoff check before building or installing.

## Current scope boundaries

No schema or Tauri command changes, new dependencies, old Hive engine, run scheduler, automated UI session, build, installer, or release. Board cards open existing worker details; Hari does not add task controls or automatic replies.

---

## Historical exploration below — not an implementation plan for the current spec
# Hari orchestrator — single-agent manager over worker threads

- Worktree: `E:\Developing\OpenSource\mono-clone-hari`
- Branch: `feature/hari-orchestrator`
- Base commit: `7095e9f` (nakul/windows-support, chore(release): bump version to 0.1.44-local7-upstream-sync)

> Source of truth for this build is the approved plan (2026-09-14): single-agent Hari v1.
> User talks to one Hari manager thread; Hari decomposes goal → task DAG → spawns/continues
> persisted worker Sessions via existing primitives, supervises via sessionsRef + queue API,
> escalates only critical items to Needs Input. No fleet UI, no 2D office, no mobile/SSH in v1.

---

## Initial idea

`docs/PLANNED.md` north star: one place to talk. Hari sits on top of everything —
knows all projects/threads, decides architecture, spawns/continues threads, picks
providers, manages them, with kanban `Todos → In Progress → Needs Input → Done`.
User request for this build: "we just talk, with single Agent, and it does everything
we ask for, deciding everything automatically". Combine Orca (Runs/Tasks/Dispatches,
worker contract, worktree lifecycle, supervised loop, automations) with Munder-Difflin
(GOD agent, hive files, FIPA-lite messages, markdown memory, autonomy leash), adapted
to MonoCode's structured harness channels (never PTY scraping) and SQLite-first persistence.

## Research

- `docs/WORKING-AGREEMENT.md`, `docs/WINDOWS-CHANGES.md`, `docs/changelog/LOCAL-CHANGELOG.md`,
  `docs/PLANNED.md` (ladder #9 Hari; queue/steer durability local5 done = supervision prerequisite).
- `docs/specs/hari-mode-plan.md`: phase-0 board not in tree (`AppMode` still `projects|chat`,
  Hari disabled in `ProjectRail.tsx:146,166,180,185`). Revival, not migration.
- MonoCode primitives (reuse): `src/lib/session.ts:247-310` Session shape,
  `sessionStore.ts` + `session_store.rs` SQLite, `messageQueue.ts` queue/steer + 15s grace,
  `fork.ts:48,80` branch/bundle caps, `handoff.ts`/`handoffTurn.ts`, `harness/registry.ts:126-139`
  send/steer/cancel + 5-min idle-park, `App.tsx:4007,4606,4709,4783,4880,4909,5132`,
  `liveAgents.ts`, `approvalToast.ts`, `Composer.tsx`, `SessionPane.tsx`.
- Orca (`stablyai/orca` + `onorca.dev/docs/model/worktrees`, `cli/orchestration`,
  `cli/automations`): Run → Task (`pending|ready|dispatched|completed|failed|blocked`) →
  Dispatch → Message (`worker_done` needs `taskId+dispatchId+outcome`) → Decision gate;
  worker-start / check --wait / worker-show|read|stop|release|retain / retry-of;
  `worktree.sharedDirectories` + `.worktreeinclude`; automations create/edit/run.
  Not copied: PTY watching, mobile, SSH federation, splits, Design Mode.
- Munder-Difflin (`chaitanyagiri/munder-difflin` README + raw `HIVE.md`): GOD agent owns
  roster/routing/adjudication/blackboard-scribe/task-ledger; escalation policy in prompt;
  hive under `<harnessHome>/hive/` (`PROTOCOL.md, registry.json, board.md, tasks.json,
  log.jsonl, agents/<id>/{identity.md, memory.md, inbox/, outbox/, cursor.json}`);
  single-committer, single-writer-per-file, temp+rename, one JSON per message;
  FIPA-lite acts (`request|inform|propose|query|agree|refuse|done`), only
  request/query/propose obligate reply, hops cap → escalate; Stop-hook inbox drain;
  markdown-first memory; circuit breaker steer→constrain→stop. Adapted: drive from
  existing `HarnessEvent`s + `busy/queueStatus/pendingQuestion` polling, SQLite stays
  source of truth, hive is audit mirror. Not copied: node-pty, Pixi floor, voice, Slack.

## Discussion

- v1 is single-agent, not fleet: one persistent Hari manager Session (GOD prompt) +
  N persisted worker Sessions linked via `hari:{runId,taskId,dispatchId,role,autonomy}`.
  Workers run same-`cwd` in MVP; git-worktree isolation behind Experimentation flag.
- Threads stay independent: workers never share a native provider session; fork copies.
- Slim MVP first (chat + supervision, 6–8 files, ~5–7 days), then hive/worktree/board
  follow-ups. This build implements the full approved sequence Steps 1–7 in order.

## Implementation plan

### Step 1 — Types + pure planner/router/supervisor (4 new lib files + tests)

1. `src/lib/hari/types.ts`: `HariRun/Task/Dispatch/Message/DecisionGate` (Orca statuses + Munder acts).
2. `src/lib/hari/planner.ts` + `planner.test.ts`: `parseGoalToTasks` heuristic v1 + validation.
3. `src/lib/hari/router.ts` + `router.test.ts`: reuse-idle-same-cwd+harness else cheapest live.
4. `src/lib/hari/supervisor.ts` + `supervisor.test.ts`: `deriveWorkerState/isWorkerDone/shouldEscalate`.

### Step 2 — Session linkage + persistence (migration 13)

5. `src/lib/session.ts`: optional `hari` linkage; workers persisted (`ephemeral:false`).
6. `src/lib/sessionStore.ts` + `src-tauri/src/session_store.rs` migration 13: `hari_json TEXT`,
   safe-degrade corrupt JSON → None, transient normalisation on load.
7. Gate: `tsc + vitest (new) + cargo test session_store`.

### Step 3 — Orchestrator engine + App wiring

8. `src/lib/hari/orchestrator.ts`: `startRun/onManagerTurn/tick/spawnWorker/continueWorker/
   steerWorker/completeDispatch/askUser` — only existing primitives, no direct harness calls.
9. `src/App.tsx` minimal wiring: manager session on Hari entry, Composer → `onManagerTurn`,
   debounced `tick` effect (~1s, hari-mode only), observe `held` for retry/steer.
10. `src/lib/hari/godPrompt.ts`: manager escalation/routing policy + worker preamble injector
    (fork-bundle caps). Prompt-only change.
11. Tests with fake sessions, mocked submit, no live CLI.

### Step 4 — Hive mirror + memory

12. `src/lib/hari/hive.ts`: path-builders + Tauri invoke wrapper + test (`~/.monocode/hari/<runId>/`).
13. `src-tauri/src/hari.rs`: `hari_write` (temp+rename, single-committer), `hari_read`,
    `hari_append_log`, `hari_move_outbox_to_inbox`; register in `lib.rs`; `#[cfg(windows)]`
    hide console; argv arrays only; home via `USERPROFILE`; unit tests.
14. Memory via prompt instruction + fork-bundle caps; no vector DB v1.

### Step 5 — Worktree isolation (behind flag, default OFF)

15. `hari.rs`/`fs.rs`: `hari_worktree_create/remove` (hidden-console `git fetch + worktree add`,
    background progress, preserve-branch-on-unmerged toast, `.worktreeinclude` copy +
    shared-dirs symlink/junction fallback on Windows).
16. `routeTask` gains `worktree: current|new-child`; card shows path; arg-builder tests.

### Step 6 — Hari surfaces

17. `appearance.ts`: `AppMode += "hari"` + 3-value loader; `ProjectRail.tsx`: enable Hari entry.
18. `src/surfaces/HariChatView.tsx`: manager thread via `AgentTranscript + Composer`.
19. `src/surfaces/HariBoardView.tsx`: read-only 4 lanes from `deriveWorkerState`, reuse
    `liveAgentsFromSessions` text; honest open-threads-only empty state.
20. `App.tsx` render on `mode==="hari"`; `Sidebar.tsx` hide workspace pane in Hari mode.
    Tailwind only, aria/keyboard.

### Step 7 — Safety + hardening

21. Autonomy leash (`auto|ask`, default ask for destructive/spend/scope) + circuit breaker
    steer→constrain→stop (3 identical failures, 5 errors/10min, run budget cap) → Needs Input.
22. Scheduled-tasks lite: trigger spec in `tasks.json`, in-app scheduler spawns real thread.
23. Full gates + STOP → dev test → NSIS `<base>-localN-hari` → changelog entries → bring over → close out.

## Todos

- [x] Step 0: plan doc + worktree `mono-clone-hari` + branch `feature/hari-orchestrator` + `npm install`
- [x] Step 1: types + planner/router/supervisor + link + tests (41 → 64 hari tests by end)
- [x] Step 2: session linkage (`Session.hari`) + SQLite migration **15** (`hari_json`; plan said 13, tree already at 14) + tests
- [x] Step 3: orchestrator tick engine (`tickRun` pure + effects) + godPrompt briefings + tests (App wiring deferred to Step 6)
- [x] Step 4: hive.ts + memory.ts + hari.rs (write/read/append-log/route) + tests
- [x] Step 5: worktree create/remove + managed-entry cleanup + flag + Settings toggle + tests
- [x] Step 6: appearance + ProjectRail + HariView/HariChatView/HariBoardView + board.ts + runs.ts + App tick wiring + Sidebar hide
- [x] Step 7: breaker integrated into tick (constrain/stop + `stop` effect) + schedule trigger core + full gates green
- [ ] STOP: report for `npm run tauri dev` manual testing (no installer until pass) — **REACHED, awaiting Nakul**
- [ ] Installable + `docs/WINDOWS-CHANGES.md` / `docs/changelog/LOCAL-CHANGELOG.md` + bring-over + close-out

## Deviations from the approved plan (all assumed, flagged here)

- Migration is **15**, not 13: the tree already carried migrations 13/14 (Local6/queue reconciliation).
- App wiring moved Step 3 → Step 6 so the tick effect, manager bootstrap, and views landed together.
- `supervisor.ts` does not import `liveAgents.ts`/`approvalToast.ts` (heavy UI-side modules); it mirrors their field reads with a comment.
- `worktree remove` takes a `managed[]` list and unlinks only symlinks/plain files before the non-force remove; anything else stays loud.
- Schedule trigger core (`schedule.ts`) is pure + tested; the in-app scheduler that spawns threads is a follow-up (needs a schedule-creation UI that does not exist yet). Spend-cap part of the breaker is likewise follow-up (needs `tokenAccounting` wiring).
- Tick observations are supervision passes (sessions-driven, 800 ms debounce), not raw harness events — three identical passes constrain, five failures in 10 min stop.

## Verification (worktree `mono-clone-hari`, branch `feature/hari-orchestrator`)

- `npx tsc --noEmit`: clean.
- `npx vitest run`: 212 files / 2340 tests green (64 in `src/lib/hari/`).
- `cargo fmt --check`: clean. `cargo clippy --workspace --all-targets -- -D warnings`: clean.
- `cargo test --workspace`: 282 passed, 0 failed, 4 ignored (11 hari hive/worktree + 3 hari linkage).
- `git diff --check`: clean. 7 commits, tree clean.
- Commits: `831d18e` (types/planner/router/supervisor/linkage/migration 15), `6a84fd7` (engine+godPrompt), `cf5bf81` (hive+memory), `8793b0e` (worktrees+flag), `49c2643` (surfaces+App tick), `9c044f4` (breaker+schedule).

## Issues in dev

_(to be filled after `npm run tauri dev` testing — STOP point reached, handed to Nakul)_

## Issues in installed

_(to be filled after the installer round)_

## Learnings

- Rust test temp dirs need a per-test name, not just pid+millis: parallel tests in one binary share the millisecond and delete each other's fixtures.
- `git worktree remove` (non-force) always trips on Hari worktrees because our own shared symlinks + copied `.env` count as untracked dirt — hence managed-entry cleanup before removal.
- `validate_segment` had to allow leading dots (`.env`) in both Rust and `hive.ts` after the worktree copy test caught it.
- PowerShell `Select-String "error"` pipelines on cargo output are unreliable; direct runs + file inspection work.

## Done

- [x] Full gates green (see Verification above)
- [ ] Dev-tested + installed-verified + merged into `nakul/windows-support`
