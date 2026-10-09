# Review — Upstream 0.10.0 synchronization

Created: 2026-10-09. Tier: Large (upstream merge and provider/storage changes).
Working branch: `nakul/windows-support-upstream-0.10.0`.
Base: fork branch `nakul/windows-support-upstream-0.8.0` at
`82907ac33c9bfc5cf17fec15e85220fffbd3a439`.
Upstream target: `main` at `416396c1b9815bcb1ea069563ff9c263a82671b1`,
including all commits after the v0.10.0 tag as requested.
Fork publication target: `origin/nakul/windows-support-upstream-0.10.0`;
the branch was absent at intake and is now published at the unchanged base
`82907ac33c9bfc5cf17fec15e85220fffbd3a439` as an authorized base-only
checkpoint. The user approved the keep-both conflict plan. The pinned merge is
integrated locally; its verification gates and primary source review passed.
The parent authorized a normal push of this merge commit to the target branch;
the actual remote SHA is recorded in the task handoff. Later `main` at
`7d099eb` is a separate follow-up, not included in this validated snapshot.

## Idea

Bring the pinned upstream main snapshot through v0.10.0 and its 16 later main
commits into a fresh fork sync branch. Preserve the Windows fork, its local
features and the reviewed 0.8.0 additions. The primary reviewer presented the
conflict groups and the user approved the keep-both plan; integrate the pinned
snapshot under those contracts. Keep this sync separate from the reported
Antigravity CLI console-window issue.

## Research

- The prior checkout was `nakul/windows-support-upstream-0.8.0` at
  `f16c498fdcfb5276196a432178582bfd7dd61ace`. The live fork ref is 10 commits
  ahead and descends from that commit. The requested `-local` wording is a
  build label; neither the local nor live fork refs contain a branch named
  `nakul/windows-support-upstream-0.8.0-local`.
- The new base `82907ac` is the live fork branch head. It includes L-70 task
  status/focus history and editor catch-up work, L-71 Settings → Migration
  Resume session and hidden compaction summaries, L-72 Mono Tasks project
  alias, L-73 startup provider check/Refresh all, and Windows build/approval
  label repairs. Preserve these with all existing L-01–L-73 behavior. The two
  untracked legacy files `docs/specs/UPSTREAM-0.7.0-PROGRESS.md` and
  `docs/specs/UPSTREAM-0.7.0-SYNC.md` remain hands-off.
- Last integrated upstream release: v0.8.0, peeled commit
  `9ccfc094615aa3170c01ae77a44298aefacdc9de`, confirmed as the merge base.
  Release boundaries: v0.9.0 `9a7b6a2581b6ac11bef8dffc8df461074346aa92`;
  v0.10.0 `a3f6f8a44b5f25bf712cbdaed1c831caa278d658`. The source tag refs are
  annotated tags; their peeled commit IDs are recorded here.
- The pinned range is 22 commits from v0.8.0 to v0.9.0, 25 from v0.9.0 to
  v0.10.0, and 16 from v0.10.0 to main: 63 incoming commits total. Main was
  checked against live `ls-remote` before and after fetch; both report
  `416396c1b9815bcb1ea069563ff9c263a82671b1`. Upstream changed 204 unique
  paths from the last integrated tag (60 additions, 144 modifications; no
  final-range deletions). The durable intake report contains the complete path
  manifest; command logs and merge-preview artifacts are in
  `/tmp/monocode-upstream-0.10.0-intake`.
- A three-way preview ran in the disposable bare repo
  `/tmp/monocode-upstream-0.10.0-intake/merge-preview.git`; it did not merge
  or write files in this checkout. Against the 0.8.0 merge base, the preview
  reports 40 actual conflicts (39 content, one add/add) across 90 text hunks.
  It also classifies 36 clean auto-merges and 128 upstream-only paths. The
  durable path manifest, conflict hunk counts, preservation contracts and
  clean-merge semantic checklist are in
  [the intake report](../notes/upstream-0.10.0-intake.md); full per-path merge
  text remains in the sibling `hunks/` directory under `/tmp`.
- The pinned release notes confirm v0.9 additions for persistent Mono
  document artifacts and `app` artifact commands; macOS floating Mono chats;
  Mono permission settings and launched-session history; per-Mono session
  sidebar visibility; and regular-session stop/archive/delete commands. The
  release also changes default account-email masking and Mono activity,
  delivery and completion reporting.
- v0.10 adds a floating Mono rail and artifact sheet; macOS menu-bar icon
  control and native spellcheck; Explorer keyboard navigation; an expandable
  Mono activity ticker; OpenCode 2.x local/remote protocols; and Linux
  AppImage self-update. It adds isolated Mono Codex storage/migration, 80%
  context rotation, one-hour habits, and bounded cleanup for Grok/OpenCode
  temporary text sessions. Its Windows fix covers Codex Mono storage
  junctions and rollout-file flushing. Linux packaging/WebKitGTK and beta
  updater changes are platform-specific.
- The 16 post-tag main commits add Mono session diffs and editable commit
  messages, Mono session-folder preferences, Git-backed turn checkpoint
  reviews, same-as-user-shell Codex selection, composer autocorrect settings,
  Markdown rendering/table-width fixes, Mono rail status dots, image lightbox
  zoom and trackpad subscription cleanup, plus drag/drop and thought-row
  fixes. These changes are included because the user requested current main.
  Detailed release notes and the commit manifest are retained under
  `/tmp/monocode-upstream-0.10.0-intake`.
- The upstream v0.8.0-to-main range touches 204 paths: 60 additions and 144
  modifications (22,234 insertions and 1,307 deletions in upstream's diff).
  The tracked intake report contains the complete path/status and merge-outcome
  manifest: 40 conflict paths, 36 clean overlaps and 128 upstream-only paths.
- Known independent risk: the user reports a window flash with Antigravity
  CLI 1.3.2 only when that CLI starts or does work; their Monos currently use
  OpenCode. Root cause is not established. Do not add an Antigravity/popup fix
  here or claim this upstream sync resolves it. Keep Windows/provider checks
  separate from the merge.

## Plan

1. Read the repository rules, local feature index and upstream intake runbook;
   fetch only the fork base and the pinned upstream main/tags into private
   refs. Confirm branch ancestry and the source snapshot before analysis.
2. Create the requested sync branch from the verified fork head. Build the
   complete per-version file inventory and inspect every preview conflict and
   clean-merge semantic risk. Keep the report and merge simulation artifacts
   in the task-specific `/tmp` directory.
3. Present actual conflict paths, local-versus-upstream behavior and
   preservation requirements to the primary reviewer; record the user’s
   approval before merging or resolving conflicts.
4. After approval, integrate the pinned main snapshot and retain each upstream
   addition. Record per-hunk decisions and audit L-01–L-73, especially
   provider identity, task/session persistence, Windows process handling and
   the 0.8.0 UI/provider work.
5. Run the agreed baseline web/TypeScript gate once before merge. After the
   approved integration and repairs, run the full `npm run check`, workspace
   cargo check, production build and host suite; update the feature register,
   changelog, conflict record and this spec with measured results. Attribute
   existing/environment failures.
6. Keep native desktop and provider checks as a separate human checklist. No
   installer is in scope. Commit and publish only after conflict approval,
   required verification and primary review.

## Todos

- [x] Read repository guidance, working agreement, local feature index and intake runbook.
- [x] Fetch fork and upstream refs privately; verify live heads and tag ancestry.
- [x] Create the local 0.10.0 sync branch from the verified fork base.
- [x] Run a disposable-repo three-way preview without merging the checkout.
- [x] Verify release notes and retain v0.9, v0.10 and post-tag commit manifests.
- [x] Complete the 204-path conflict/clean-merge outcome manifest and record semantic-risk checks.
- [x] Review the 90 conflict hunks and clean-merge semantic risks; obtain primary/user approval.
- [x] Run baseline web and standalone TypeScript checks; save logs and report existing failures.
- [x] Merge only the pinned approved upstream snapshot; preserve local behavior and additions.
- [x] Complete full automated gates, build, local feature audit and manual-check handoff.
- [x] Update records with measured results and remaining limits.
- [ ] Commit and publish the integrated merge after parent review and the upstream-scope decision.

## Issues and fixes

The user approved the grouped keep-both conflict plan on 2026-10-09. All 40
preview conflicts (90 hunks) are resolved and recorded in the intake report;
no unresolved paths remain. Automated gates and primary source review passed.
The merge remains uncommitted pending the parent's final commit/push go-ahead.
The actual preview conflicts were:

| Conflict group | Paths |
|---|---|
| Build and dependency manifests | `.gitignore`; `Cargo.lock`; `Cargo.toml`; `package-lock.json`; `package.json`; `src-tauri/Cargo.toml`; `src-tauri/tauri.conf.json` |
| Native command registration, runtime and persistence | `src-tauri/src/control_cli.rs`; `src-tauri/src/harness.rs`; `src-tauri/src/lib.rs`; `src-tauri/src/quick_composer.rs`; `src-tauri/src/session_store.rs` |
| App/session and Mono control | `src/app/App.tsx`; `src/features/agent-app/model/agentApp.ts`; `src/features/monos/model/monoFiles.ts`; `src/features/sessions/data/sessionStore.test.ts`; `src/features/sessions/data/sessionStore.ts`; `src/features/sessions/model/session.ts`; `src/features/source-control/ui/GitChangesPanel.tsx` |
| Composer/transcript/settings and shared UI | `src/app/shell/SidebarRename.test.ts`; `src/features/notes/ui/NotesView.test.ts`; `src/features/sessions/ui/AccessPicker.tsx`; `src/features/sessions/ui/AgentMarkdown.tsx`; `src/features/sessions/ui/AgentTranscript.tsx`; `src/features/sessions/ui/Composer.tsx`; `src/features/settings/model/displayPrefs.test.ts`; `src/features/settings/model/displayPrefs.ts`; `src/features/settings/model/settings.ts`; `src/features/settings/ui/SettingsView.test.ts`; `src/features/settings/ui/SettingsView.tsx` |
| Provider process and protocol | `host/child-backend.test.ts`; `src/integrations/harness/core/child.ts`; `src/integrations/harness/core/registry.test.ts`; `src/integrations/harness/core/registry.ts`; `src/integrations/harness/providers/codex/codex.ts`; `src/integrations/harness/providers/codex/codexText.test.ts` (add/add); `src/integrations/harness/providers/codex/codexText.ts`; `src/integrations/harness/providers/opencode/opencodeClient.ts`; `src/integrations/harness/providers/opencode/opencodeLive.test.ts`; `src/integrations/harness/providers/opencode/opencodeText.ts` |

The approved product contracts were carried through conflict repair:

- Keep the Windows no-console/process-tree rules, executable/path identity,
  report-argv allowlist and case-insensitive Windows identity while adding
  upstream OpenCode 2.x provider handling and bounded Grok cleanup.
- Keep isolated Codex storage for Mono sessions only; preserve regular Codex
  resume, account identity, Remote Control and cloud behavior. Union session
  projections/schema/indexes with Mono sidebar/artifact fields without shifting
  SQL bind or row-mapper indices.
- Integrate upstream Mono artifact/session lifecycle and changes/commit panels
  with local Tasks aliases and Operator permission checks. Preserve Stop,
  archive/delete cleanup, single submission and current provider/session
  identity.
- Add spellcheck/autocorrect and Mono settings without replacing local composer
  controls, the Windows-visible menu bar, wallpaper/glass or shared hover.
- Keep all L-70/L-71/L-72/L-73 details from the verified 0.8.0 base, including
  focus history/autosave, Settings Resume and compaction hiding, Mono Tasks
  aliases, and the light provider check/Refresh all.

No whole-file side selection was used. Preserve the local v1 fork-at-message
payload. The official
OpenCode v2.0.19 API (tag commit
`1fd016ef32286de9489b7b24f1029f52c49a27b3`) accepts
`{before: SessionMessage.ID}` on POST `/api/session/:sessionID/fork`; its
protocol documentation says the fork copies projected history before that
message. Send `{before: messageID}` for a selected v2 boundary, then use the
existing v2 folder move verification and deletion cleanup. OpenCode tags
v2.0.15 and v2.0.19 still declare `serve --help` with `--hostname` and
`--port`, so the current read-only native provider probe remains valid.

## Learnings

- At intake, the user explicitly requested all current upstream main through
  pinned `416396c`, including the 16 post-v0.10.0 commits. Main later advanced
  to `7d099eb`; parent is asking whether the six additional commits should be
  a separate follow-up. That decision does not change this validated snapshot.
- The live fork sync branch is the safe base, not the older local checkout.
  `f16c498` is its ancestor, so the 10 remote-only commits are retained.
- Keep the Antigravity CLI 1.3.2 flash diagnosis separate and describe it as
  unresolved unless parent-supplied process evidence establishes its cause.
- On the unchanged fork base, the baseline Vitest failures are four tests in
  three files that still expect the old `Allow` label after the UI changed it
  to `Allow once`; the approval controls themselves were not shown to be
  broken. The standalone TypeScript check passed. See the intake report for
  counts and log paths.
- The existing host provider-contract test also compares every local harness
  with the remote allowlist. On the 0.8.0 base it fails because local
  `antigravity-cli` is not a remote provider; remote provider expansion is not
  part of this sync.

## Verification results

These results apply to approved pinned target
`416396c1b9815bcb1ea069563ff9c263a82671b1` on fork base `82907ac`:

- `npm run check` passed: 600 Vitest files / 6,617 tests, TypeScript, Rust
  formatting, workspace Clippy with warnings denied, and 705 Rust tests (2
  ignored).
- `cargo check --workspace` passed. `npm run build` passed; Vite reported the
  existing CSS `::highlight` warning and large-chunk notices.
- `npm run host:build` passed. The host suite had 103 passing, 1 failing and 5
  skipped tests. The failure is the unchanged-base `host/providers.test.ts`
  assertion equating local `HARNESSES` with `REMOTE_PROVIDERS`; local
  `antigravity-cli` is absent from the remote allowlist. Remote provider
  expansion is outside this sync.
- `node --test scripts/release-channel.test.cjs` passed all 8 tests. Six
  focused repair suites passed 139 tests. Automated coverage does not mean
  that all L-01–L-73 features were runtime-tested.
- The final check used the runbook Rust environment and a task-local subreaper
  that reaps orphaned children while tests run. The earlier wrapper reaped
  only after the main command exited, so a process-group test saw terminated
  zombies as live. The targeted assertion and full Rust gate passed after the
  wrapper correction; no product/test code changed for this environment issue.

After validation, live upstream `main` advanced to
`7d099eb8e1d3a544a9221cda66de251f25e6c4a0`, six commits beyond pinned `416396c`.
That later delta is not included in this validated snapshot and awaits a
separate user scope decision. A temporary read-only preview reports 83 changed
paths, 24 content conflicts and one modify/delete conflict; see the intake
report. The approved pinned target and its validation remain unchanged.

## Done

The pinned upstream merge, 40 conflict resolutions and 204-path preservation
audit are complete. The full web/Rust gate, workspace cargo check, production
build and release-channel tests passed. The host build passed; the host suite
has the documented unchanged-base provider-parity failure. The authorized
branch is published as the base-only checkpoint. This reviewed merge is being
published as this merge commit by normal push to
`origin/nakul/windows-support-upstream-0.10.0`; the final remote SHA is in the
task handoff. The later upstream delta is tracked separately and does not
block publication of this validated snapshot. Native Windows/provider checks
remain a separate human handoff.
