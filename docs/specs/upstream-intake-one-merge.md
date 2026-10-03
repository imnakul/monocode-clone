# Todo — Upstream intake in one merge: v0.1.56 through v0.6.0 and nine later commits — spec

- Tier: complex · Snapshot: `cde05ca`, 2026-10-01 · Branch: `nakul/windows-support` (work happens here, no worktree)
- Upstream target: `43aac9d216c323a7e04c9037eb0b251dd840cc7a` (upstream `main`, `package.json` says `0.6.0`)
- Merge base: `3344bea70341d8ea4d6dea414aa15c13683372e9` (tag `v0.1.55`). Ours is 99 commits ahead, upstream 128.
- Replaces the Draft [round-1 spec](upstream-intake-round-1.md). Three stages, one worker, one file.
- Record of Nakul's answers: [owner decisions](../notes/upstream-intake-2026-10-01/09-owner-decisions.md).

## In plain words

Today our build is upstream's version 0.1.55 plus everything we added for Windows. Upstream has since
shipped seven releases. After this work our app has all of them in one step, with everything we built
still working.

What Nakul will newly see: a quick "BTW" side question on an answer (our Sidechat stays too), an Operator
mode that is off until switched on for a chat, chats on another machine over SSH, MCP server settings, a
start-up notice that offers to update Claude, Codex, OpenCode and Pi from inside the app (it replaces our
notice, which never appeared), format on save and autosave, preview tabs, custom shortcuts, pasting
screenshots and files, generated images, and the usage meter showing how much is left. Haze, the new
blurred background, works for chats and also as a sixth wallpaper effect.

What stays as it is: the separate Stop button with Queue and Steer, the always-visible menu bar, our
Antigravity and Cline providers, saved message queues, the wallpaper effects, "Allow for session", MCP
forms, and the Windows fixes.

## Goal and user story

As Nakul, I want the fork to carry every upstream change up to `43aac9d` so that I get upstream's new
features without losing any local feature in `docs/LOCAL-FEATURES.md`.

## Scope

1. One `git merge` of `43aac9d` into `nakul/windows-support`, with every conflict resolved by the table in
   Stage 1.
2. The repairs and local adaptations in Stage 2 (things that merge without a conflict but are wrong, and
   four decisions that follow from Nakul's answers).
3. The automated checks and records in Stage 3.

## Out of scope

- Upstream commits after `43aac9d` (for example `1e97594`). Do not fetch or merge anything newer.
- Porting Cline or our Antigravity to the remote host. An update notice for Cline. "Allow for session" and
  MCP forms on remote sessions.
- Git-ignored files in `@` mentions. Hari and the parked orchestration work.
- Building the Windows installer, pushing, opening a PR. Desktop checks (see Manual checks).
- Refactors, renames or formatting outside what a resolution needs.

## Rules for this task that differ from the standing docs

- **One merge.** `docs/NOTES.md` suggests staged rounds. Nakul chose one merge on 2026-10-01; that wins.
- **Conflicts.** `docs/WORKING-AGREEMENT.md` says to stop on every merge conflict and never auto-decide.
  For this task the resolutions in Stage 1 are already decided and approved by Nakul through the answers
  recorded in the owner-decisions file. Apply them without stopping. Stop only in the cases listed under
  Stop conditions.
- **Commit.** Do not commit unless Nakul's handoff message says you may. Without that, leave the merge
  resolved, staged and uncommitted, and do not run anything that would discard it (`git merge --abort`,
  `git reset`, `git stash`, `git checkout` of another branch, `git clean`). If Nakul allowed it: one merge
  commit after every gate in Stage 3 passes, message
  `merge(upstream): take upstream main 43aac9d (v0.1.56–v0.6.0 and nine later commits)`. Never push.
- **Docs.** `docs/` and `.agents/` are git-ignored and stay that way. Never `git add -f` them.
- **Leave alone:** the three stashes, the folders `mono-clone-hari`, `mono-clone-remote` and
  `mono-clone-scratch`, and the remote `origin` (upstream; never push there).

## Evidence to read (do not redo the research)

All in `docs/notes/upstream-intake-2026-10-01/`:

| File | Use it for |
|---|---|
| `04-conflicts-and-risks.md` | Groups C-01…C-27 and risks R-01…R-15 with reasons. Read fully before merging. |
| `scripts/hunk-review.md` | Both sides of each of the 231 conflict spots, per file. Open the section for the file you are resolving. |
| `scripts/clean-merge-audit.md` | The 47 files changed on both sides that merge without a conflict. |
| `03-files.tsv` | Every upstream path with its class (N new, E upstream-only edit, B both sides clean, X conflict). |

Also read before starting, as `AGENTS.md` requires: `docs/WORKING-AGREEMENT.md`,
`docs/changelog/CHANGELOG.md`, `docs/specs/SPECS.md`, `docs/WINDOWS-CHANGES.md`, `docs/LOCAL-FEATURES.md`.

The line numbers in the Stage 1 table are positions of conflict markers in the analyst's scratch merge.
They help to find a spot; the real merge may differ by a few lines. Source line numbers elsewhere are at
`cde05ca` (ours) or `43aac9d` (upstream) as stated.

## Current state (facts)

- 527 upstream paths change: 258 added, 269 modified. Classes: 256 new, 144 upstream-only, 47 both sides
  clean, 80 conflicting (74 content conflicts, 2 add/add, 4 modify/delete). 231 conflict spots.
- Upstream adds Rust modules `account_identity`, `harness_updates`, `mcp`, `pi_usage`, `remote`,
  `remote_ssh`, `ssh_askpass`, and macOS-only `quick_composer` and `macos_background`; a `host/` package
  built with esbuild; one capability, `core:window:allow-set-theme`.
- New dependencies, all approved by Nakul: Rust `toml`, `time`, `arboard`, `png`,
  `tauri-plugin-global-shortcut` (macOS target only); npm dev `esbuild`, `@types/node`.
- Our `package.json` differs from the merge base only in the version line.
- `scripts/bump-version.mjs` accepts only plain `x.y.z`. Do not use it for the local label.
- No ESLint config exists in this repository. Report lint as unavailable; do not add a lint setup.
- Known before this task: 11 Rust tests in `checkpoint.rs` and `fs.rs` fail on Windows because of line
  endings (`docs/WINDOWS-CHANGES.md:573`); a Unix-only test
  `antigravity_launch_args_match_the_platform_registry` calls a removed function and does not compile on
  Linux/macOS (`docs/WINDOWS-CHANGES.md:655`). Last recorded web baseline: 342 test files, 3,944 tests.

## Owner answers that shape the work

| # | Topic | Result |
|---|---|---|
| 1 | BTW and Sidechat | Both. Sidechat keeps its label; BTW comes in as upstream ships it. |
| 2 | In-app CLI updates | Upstream's notice replaces ours (Stage 2, part B). |
| 3 | Remote over SSH | Taken. Nine remote providers (Stage 2, part D). |
| 4 | Usage meter | "Left" by default; our setting stays so "used" is possible. |
| 5 | Haze | Chat background and wallpaper effect (Stage 2, part C). |
| 6 | Operator mode | As upstream ships it, off until switched on per chat. |
| 7 | New libraries | Accepted. |

## Stage 1 — Merge and resolve

### 1.1 Start checks

Run in PowerShell from `E:\Developing\OpenSource\mono-clone`. Stop if any line does not match.

```powershell
git rev-parse --abbrev-ref HEAD      # nakul/windows-support
git status --porcelain                # prints nothing
git merge-base HEAD 43aac9d216c323a7e04c9037eb0b251dd840cc7a   # 3344bea70341d8ea4d6dea414aa15c13683372e9
git cat-file -t 43aac9d216c323a7e04c9037eb0b251dd840cc7a       # commit
Get-PSDrive C,E | Select-Object Name,@{n='FreeGB';e={[math]::Round($_.Free/1GB,2)}}
```

`HEAD` is expected to be `cde05ca`. If it is newer, list the extra commits in the report and continue only
when they touch nothing under `src/`, `src-tauri/`, `host/`, `Cargo.*` or `package*.json`.

Storage follows `docs/WORKING-AGREEMENT.md` ("Storage exhaustion is a hard blocker"). Floors chosen for
this task: at least 6 GB free on C: and 12 GB on E: before `npm install`, before the first Rust build and
before the full test run. Below a floor: stop and report the measured numbers. Set `CARGO_BUILD_JOBS=1`
for every cargo command (the linker ran out of memory before).

No `git fetch` is needed; the target commit is already in the local repository.

### 1.2 Merge command

```powershell
git merge --no-commit --no-ff 43aac9d216c323a7e04c9037eb0b251dd840cc7a
git diff --name-only --diff-filter=U
```

Expect 80 unmerged paths. If the set of paths differs from the table below, see Stop conditions.

### 1.3 General resolution rules

- Never take one whole side of a source or test file to remove markers. Resolve spot by spot. The only
  whole-side resolutions are the lock files in C-01 and the four deleted files in C-23.
- "Union" means both sides' lines are kept once, with no duplicate imports, fields or cases.
- Where upstream renamed or moved something our code calls, update our call; do not keep a second copy.
- After each group, read the full diff of the files in it and their direct consumers, then run
  `npx tsc --noEmit` (TypeScript groups) or `cargo check` (Rust groups) before the next group. Errors that
  belong to a group not yet resolved are expected; note them and move on.
- Recommended order: C-01, C-02, C-03, C-05, C-27 (Rust and manifests), then C-13, C-22, C-23, C-04, C-21,
  C-24, C-25, C-26 (model and providers), then C-14, C-20, C-09, C-10, C-18, C-19, C-08, C-11, C-12
  (features), then C-15, C-16, C-17, C-07, C-06 (shell and app, largest last).

### 1.4 Resolution table

| Group | Files (marker lines in the scratch merge) | Resolution |
|---|---|---|
| C-01 | `Cargo.lock` (2345), `Cargo.toml` (7), `package-lock.json` (3, 13), `package.json` (4), `src-tauri/tauri.conf.json` (4) | See Stage 2, part G. `package.json`: upstream's content, version from part G. `tauri.conf.json`: union; keep our Windows bundle settings (no signing, NSIS), our asset access and `blob:` in `connect-src`; take upstream's additions including `linux.rpm.depends`. Lock files: upstream's side, then regenerated by tooling. |
| C-02 | `src-tauri/src/fs.rs` (5, 29, 5485), `lib.rs` (3, 483), `main.rs` (4), `search.rs` (174), `window.rs` (121) | Union module declarations and command registrations, each once; our wallpaper, import, skills, Antigravity ACP and Cline commands stay registered next to upstream's new ones. Keep both `AtomicU64` and `AtomicBool`, and `mpsc`, `thread`, `AppHandle`, `Uuid` where used. Keep `ensure_scratch_chat` beside the generated-image functions. In `main.rs` the askpass exit check and our ACP-auth URL check are two independent early exits. In `window.rs` run `prepare_windows_window` before returning upstream's `WebviewWindow`; keep our conditional focus on reveal. In `search.rs` keep cancellable search through our hidden-process helper. |
| C-03 | `src-tauri/src/harness.rs` (79, 1444, 1525, 1855, 3212, 5336), `src/integrations/harness/core/child.ts` (1, 345, 478) | Keep our backend resolution and `resolved_binary_matches` (case-insensitive on Windows). Take upstream's configured-path resolver and extend it per Stage 2, part A. Keep `hide_console_window`, `new_provider_command`, `isolate_child`, `terminate` and the job-object code; add upstream's Unix retry and `exec_output`, adapted per part B. No new bare `Command::new` for a provider binary. Do not bring back anything in the do-not-resurrect list (part F). |
| C-04 | `src/integrations/harness/core/availability.ts` (61, 94, 289), `src/features/sessions/ui/ModelPicker.tsx` (37, 232, 371, 468, 1483), `providers/claude/claudeCatalog.ts` (407, 423), `providers/codex/codexCatalog.ts` (82) | One availability store that includes Cline, with our evidence and error semantics (R-01). Picker filter: not hidden for the project, and `showProviderInModelPicker(id, isHarnessAvailable(id), hasHarnessEvidence(id))`. Our refresh keeps excluding ACP providers from blanket probes. Claude: keep our default and resolved-model fallback, add upstream's `claudeLaunchId`. Codex: distinct probe IDs; upstream's configured-binary parameters with our exit-code and timeout reporting. Keep all eleven tabs and the 440/442 px picker dimensions. |
| C-05 | `src-tauri/src/session_store.rs` (1366, 1479, 1582) | Migrations run through version 18 in order, ours and upstream's each once. Every queue field appears in INSERT, SELECT and the row mapper. Use upstream's `search_sessions_sql` with our candidate-cwd matching; budget, limit and cancellation bound in the right order; de-duplicate by ID. Do not restore `SearchRow` if nothing uses it. |
| C-06 | `src/app/App.tsx` (108, 335, 1174, 2710, 3409, 3794, 3872, 6444, 7254, 9248) | Exactly one `runNativeBranchSend`, wrapped around upstream's Operator and CI prompt building. Keep `humanAuthored`. Keep our queue scheduler. Terminal start, forget and kill run on every close and removal path. Remote history retention is separate from local. Local approval scope and remote approval stay separate calls. Diff opening keeps our options form (`optionsOrSession`, `OpenDiffOptions`, change kind) and gains upstream's `pin` and `kind`. `MenuBar` stays always rendered. Mount upstream's `HarnessUpdateNotice` as upstream does. |
| C-07 | `src/app/shell/MenuBar.tsx` (9), `ProjectRail.tsx` (84), `Sidebar.tsx` (32, 177, 282, 788, 2304) | Union imports. Use upstream's `useProjectMenu`. Keep our chat-mode overlay guards and `SharedHoverHighlight`. Upstream's drawer applies only in the project sidebar branch; never mount `sidebarContent` twice. The menu is never hidden behind Alt. |
| C-08 | `src/app/shell/UsageFooter.tsx` (2), `UsageProviderChip.tsx` (76), `src/features/providers/model/rateLimits.test.ts` (4, 98) | "Left" is the default; our saved setting still switches to "used". Remaining is computed once, not on both sides. Keep our clamp and rounding and the `exhaustedWindowResetAt` tests in their own `describe` blocks next to upstream's. |
| C-09 | `src/features/files/editor/editorDoc.test.ts` (3, 68), `src/features/files/ui/FileEditor.tsx` (168, 238, 273, 366, 405) | Keep `EditorDiskSession` with `serializeForSave` and `serializeForStage`. Adopt upstream's `gitDiffFiles` staged/unstaged. One shared `LineEnding` type (R-03). Keep both families of tests. |
| C-10 | `src/features/files/ui/FilePane.tsx` (37), `src/platform/tauri/fs.test.ts` (10) | Upstream's `lazySurface` and Suspense, with our `GitFileDiffView` route and terminal branch. Union the `pickFolders` and wallpaper test imports. |
| C-11 | `src/features/inbox/ui/InboxView.tsx` (375, 400, 1402, 1418, 1445, 2004, 2022), `InboxView.test.ts` (14) | Carry `onPullReview` and upstream's `repairSessions` / `onRepairChecks` through every type, destructuring and JSX layer. |
| C-12 | `src/features/notes/ui/NotesView.tsx` (124) | Upstream's initializer that validates the remembered selection; keep our loading and error states, hover attributes and the notes-changed subscription. |
| C-13 | `src/features/sessions/data/sessionStore.ts` (24, 685, 766, 790), `sessionStore.test.ts` (3, 26), `src/features/sessions/model/session.ts` (1, 23, 372, 467) | Union fields and sanitizers: `sanitizeBranchOrigin`, review, `sanitizeNestedId`, generated image, BTW. `providerForkPoint` stays on user blocks. `ciContext` and our intent fields are separate. Sessions owned by a remote host are not written to local persistence. Our queues stay persisted. Cline stays in `HarnessId` and `HARNESSES`. |
| C-14 | `src/features/sessions/model/messageQueue.ts` (38), `messageQueue.test.ts` (64) | One `canDispatchQueuedHead` that blocks on: busy, usage limit, paused, resuming, steering, held, preparing a handoff, edited head. A reset must not release a held or paused queue (D-10, R-09). |
| C-15 | `src/features/sessions/ui/AgentTranscript.tsx` (178, 1182), `AgentTranscript.test.ts` (49), `SessionPane.tsx` (102, 328), `src/features/workspace/ui/PaneTree.tsx` (20, 542) | `onApproval(requestId, decision, scope?)` keeps its scope. Keep `McpFormReply`. Pass all five BTW callbacks. Sidechat stays. Add `backgroundTasks` to the props. |
| C-16 | `src/features/sessions/ui/Composer.tsx` (259, 607, 1579, 1766, 1849, 2642, 2906, 3047, 3060, 3084), `Composer.test.ts` (60, 155, 201) | Standing call: keep `canSteer`, `actionTooltip`, `actionAriaLabel`, `handleActionClick`, `executeComposerAction`, and Stop beside Send. Parse upstream's MCP, mode and BTW slash commands before dispatch; text, attachments and intents are carried exactly once. Keep our MCP form priority and the deterministic `FileReader` mock. Do not adopt upstream's `allowBusySubmit` replacement of Stop. |
| C-17 | `src/features/settings/model/appearance.ts` (2, 1165), `settings.test.ts` (4, 24, 40, 51, 66), `src/features/settings/ui/SettingsView.tsx` (251, 372, 391, 413, 1292, 3573, 3933, 4143, 4551, 4567, 4587, 4612, 5431, 5614), `src/styles/index.css` (307, 460) | Union imports. Keep our initial appearance application and the stable Popover wash. Take upstream's Linux and native-theme options. AI helper and Editor are separate groups. Provider rows: upstream's scope controls and picker visibility together with our `initialLoading` and Recheck. `Segmented` options support `disabled`, `title`, `description` and upstream's icon. Our update-notice wiring in `ProvidersPage` is removed (part B) and our binary buttons give way to upstream's control (part A). Haze per part C. |
| C-18 | `src/features/source-control/model/unifiedDiff.ts` (3), `ui/SourceControl.tsx` (12), `ui/WorkingTreeDiff.tsx` (155) | Union `decodeLineEndings` and `LINE_DIFF_CONFIG`. Staged/unstaged kind flows through Open All Changes. Keep `focusPath`. |
| C-19 | `ui/GitChangesPanel.tsx` (74, 125, 380, 397, 589, 609, 719, 975, 1023, 1390, 1602, 1640), `GitChangesPanel.test.ts` (6, 64, 116; add/add), `SwitchBranchDialog.tsx` (83, 103, 120), `SwitchBranchDialog.test.ts` (3, 127; add/add) | D-07: keep `generateHelperCommitMessage` and `generateHelperPrContent`, now taking an `AbortSignal`. Adopt upstream's Cancel button and duplicate-generation guard. Keep the `startText` comparison and `helperFailureMessage`. Remote repositories use the remote API. Both test suites are kept in full. |
| C-20 | `src/features/workspace/model/layout.ts` (467, 726), `workspaceSnapshot.ts` (380, 571, 656), `workspaceSnapshot.test.ts` (16) | Keep `!file.diff` in the reusable-editor check. Validate `diff`/`focusKind` and `remoteFile` independently. A `remoteOwner` maps remote paths; otherwise `repairLegacyEncodedDriveColon`. `model = stub.model || session.model`. Old snapshots load (D-12, R-14). |
| C-21 | `src/integrations/harness/core/apply.ts` (548, 565, 739) | `stopStreaming(session, endedAt = Date.now())` clears `backgroundTasks` and stamps our token usage before the duration, using the active turn owner. `findTurnOwnerIndex` stays separate from `stampTurnDuration(blocks, endedAt)`. |
| C-22 | `src/integrations/harness/core/registry.ts` (1, 37, 127, 439, 511), `registry.test.ts` (67), `src/integrations/harness/index.ts` (194) | `HelperPromptInput` / `runHelperPrompt` (ours, tool-free) and `TextPromptInput` / `runTextPrompt` (upstream, BTW) are two distinct things; keep both (R-15). Extend upstream's provider lists and tests to Cline. |
| C-23 | `src/integrations/harness/providers/antigravity/antigravity.ts`, `antigravityCatalog.ts`, `antigravityLive.test.ts`, `antigravityProtocol.test.ts` (modify/delete) | Keep them deleted: `git rm` each. Our Antigravity lives in `src/integrations/harness/core/`. |
| C-24 | `providers/claude/claude.ts` (211, 229, 465, 671, 2324), `claudeAdapter.ts` (21, 52), `claudeLive.test.ts` (39), `claudeProtocol.test.ts` (1234) | Union `Live` fields, task and grant maps and their resets. Keep delayed `providerBound` with the reported fork ID and our live model and permission controls. Add upstream's `pendingAssistantBoundary`, `RESUME_GRACE_MS` and background-task logic. Keep `runHelperPrompt` and add `runTextPrompt` / `stopTextPrompt`. |
| C-25 | `providers/codex/codex.ts` (49, 137, 510, 783, 1040, 1287, 1390, 1492), `codexAdapter.ts` (22, 59), `codexElicitation.test.ts` (1), `codexLive.test.ts` (139), `codexProtocol.ts` (376) | Use upstream's `emittedAssistantByItem` / `emittedReasoningByItem`; keep our `threadBaseline`, `lastThreadTotal`, `turnUsage` and the `inProgressMcpTools` reset. Confirmation order: `codexMcpConfirmation` with our parent tool candidates; outside Plan, Full Access accepts a recognised confirmation; else a stored grant (outside Plan); else the approval UI with scope. Remove `isCodexComputerUseAccessConfirmation` and its import (R-05). Never auto-fill a form. Token usage is the union with `usageLimited` and `rateLimits`. |
| C-26 | `providers/claude/claudeText.ts` (15 spots), `providers/codex/codexText.ts` (13), `providers/opencode/opencodeText.ts` (5), `opencodeText.test.ts` (1, 166), `opencodeAdapter.ts` (20, 50) | Helper isolation mode (ours) is separate from read-only BTW (upstream). `noTools`, the max-turn limit, deny-all and `outputSchema` apply to helper calls only. The isolation mode is part of the reuse key. Carry the `AbortSignal` cleanup. |
| C-27 | `src/platform/tauri/pty.ts` (135), `pty.test.ts` (2) | Call `decodePtyChunk` first. When it returns null, do not change `bytesSeen` and do not call the handler. Keep our offsets. |

`codexElicitation.test.ts`: the tests that asserted the removed predicate are rewritten to assert the same
behaviour through `codexMcpConfirmation` and the live handler (`codexLive.test.ts`). Grant, form and
fail-closed cases stay. This change is approved (D-11); list each rewritten test name in the report.

## Stage 2 — Repairs and local adaptations

These do not show up as conflicts. Do them before running the full gates.

### 2.1 Risks without a conflict

| ID | What to do |
|---|---|
| R-01 | Upstream's new `src/integrations/harness/core/availabilityState.ts` (lines 8–20) has no Cline entry and has upstream's Antigravity semantics. Add Cline to the typed map; move our evidence, diagnostic and reset logic there; `availability.ts` re-exports the existing public API. Add a test: `noteHarnessEvidence` and project-default resolution see the same update. |
| R-02 | Part D. |
| R-03 | Merged `src/features/files/editor/editorDoc.ts` has `LineEnding` twice (import near line 7, export near line 22). Keep one definition and one import path for all users. |
| R-04 | Part A. |
| R-05 | See C-25. No remaining reference to `isCodexComputerUseAccessConfirmation`. |
| R-06 | Part B. |
| R-07 | Part C. |
| R-08 | Remote sessions do not offer Cline, Antigravity, "Allow for session" or MCP forms. Upstream's `approve(id, request, decision)` on remote has no scope; do not add one. Local sessions keep all four. |
| R-09 | Upstream's auto-resume after a usage limit lifts only the usage pause. A queue the user held stays held (D-10). Test in `messageQueue.test.ts`. |
| R-10 | Generated images: before deleting an image when a chat is removed, check that no other chat (for example a native branch copy) still references it (D-09). Add a test next to upstream's generated-image tests. |
| R-11 | `host/` builds and tests are part of the gates (Stage 3). |
| R-12 | Every new native spawn: `remote_ssh.rs` already hides the `ssh` console on Windows (creation flag `0x08000000`); `mcp.rs` spawns nothing; `harness_updates.rs` goes through `exec_output` (part B); `quick_composer.rs` is macOS only. Confirm no other new `Command::new` in the merged Rust tree lacks console hiding on Windows; list what you checked. |
| R-13 | Tests that encode the provider count: `registry.test.ts`, `ModelPicker.test.ts` (440/442), upstream's `btw.test.ts` and `child.test.ts`. Extend them to eleven providers with our Antigravity; do not lower an expectation. |
| R-14 | Old saved workspaces and queues load; new fields get defaults (D-12). Test in `workspaceSnapshot.test.ts`. |
| R-15 | See C-22 and C-26. |

For the 47 both-sides-clean files, read `scripts/clean-merge-audit.md` and check the runtime wiring of the
local features it names (L-08, L-09, L-10, L-14, L-19, L-20, L-22, L-23, L-24, L-25, L-28) rather than only
that the declarations survived.

### Part A — One CLI path store (D-04, R-04)

Facts. Ours: `src/integrations/harness/core/customBinary.ts` stores one key per provider,
`monocode.customBinary.<id>`, read by `child.ts:287–296`, `SettingsView.tsx:377, 3141–3144, 3599–3636` and
`MigrationView.tsx:306`; the path is passed as `overridePath` on each call and applies at once. Upstream:
`src/features/providers/model/providerBinaryPaths.ts` stores one JSON object under
`monocode.providerBinaryPaths.v1`; `src/main.tsx:20, 37, 92` calls `initializeProviderBinaryPaths()` at
start, which hands the paths to Rust (`harness_runtime_binary_paths`); Rust keeps the first set for the
life of the process (`runtime_binary_paths`), so a changed path applies after restart
(`providerBinaryPathChangePending`). Upstream's Rust resolver (`resolve_harness_binary_override`,
`resolve_harness_binary_default`, `harness_resolve_configured`) knows ten providers: no Cline, and
upstream's own Antigravity.

Decision. Upstream's store and upstream's `ProviderBinaryControl` are the only ones.

1. New function `migrateLegacyCustomBinaries(): void` in `providerBinaryPaths.ts`. For each `HarnessId`:
   read `monocode.customBinary.<id>`; if it is a non-empty string and the v1 store has no entry for that
   provider, set it. Write the v1 store once. Remove the legacy keys only when the write succeeded. Any
   storage error leaves both stores as they were. Running it again is a no-op.
2. `src/main.tsx`: call `migrateLegacyCustomBinaries()` before `initializeProviderBinaryPaths()`.
   `providerBinaryPaths.ts` reads the store when the module loads; make sure the module-level copy is read
   after the migration (read lazily or refresh it at the end of the migration).
3. Delete `customBinary.ts`. Replace its users: `child.ts` uses `runtimeProviderBinaryPath`;
   `MigrationView.tsx:306` uses `loadProviderBinaryPath`; the Settings provider row drops
   `customBinaryPath`, "Choose binary…" and its reset in favour of `ProviderBinaryControl`. Our Recheck
   button and `initialLoading` stay.
4. Rust: `resolve_harness_binary_override` gains `"cline" => &["cline"]`. For `"antigravity"` it calls our
   `resolve_antigravity_acp(Some(path))` and skips upstream's Windows rejection and the
   `agy_acp_server.par` name rule. `resolve_harness_binary_default` gains `"cline" => resolve_cline()` and
   uses our `resolve_antigravity()`. `harness_resolve_configured` returns no `args` (there is no
   `antigravity_args`). Our `harness_resolve_cline` and `harness_probe_provider` stay registered.
5. `is_resolved_harness_binary(command, binary_provider, binary_path)` takes upstream's signature and
   compares with our `resolved_binary_matches`, so `claude.EXE` and `claude.exe` match on Windows.
6. `child.ts`: upstream's command map (`Record<ConfigurableBinaryProvider, string>`) gains `cline:
   "harness_resolve_cline"` and keeps `antigravity` pointing at our resolver. Our `probeHarnessBinary`,
   `resolveAntigravityBinary` and `resolveClineBinary` stay exported. Keep upstream's `updateHarnessCli`,
   `execChild` parameters, `configureChildBackend`, `hasHeadlessChildBackend` and `readHarnessTextFile`.

Behaviour that changes, on purpose: a changed path applies after restart; a path must be absolute and the
file name must be the provider's CLI name; a migrated path that fails these rules shows upstream's error on
that provider's row until the user fixes or clears it.

### Part B — Upstream's update notice replaces ours (question 2, R-06)

Root cause of our notice never appearing (read in source, not reproduced at runtime):
`fetchLatestCliVersion` in `src/integrations/harness/core/cliVersions.ts:59–72` calls `fetch` on
`registry.npmjs.org` from the webview, and `connect-src` in `src-tauri/tauri.conf.json` allows only the
app's own schemes, so the request is blocked; and the check runs only when Settings → Providers opens
(`SettingsView.tsx:3139–3175`).

1. Delete `src/features/settings/ui/UpdateToasts.tsx`, `UpdateToasts.test.ts`,
   `src/integrations/harness/core/cliVersions.ts` and `cliVersions.test.ts`. In `SettingsView.tsx` remove
   the imports (lines 38–42), `runUpdateCheck`, `updateNotices`, the `<UpdateToasts>` element (line 3230)
   and any `onCatalogRefreshed` use that existed only for them. These tests go because the feature they
   test is removed by Nakul's decision; say so in the report.
2. Keep upstream's `src/features/providers/ui/HarnessUpdateNotice.tsx`,
   `src/features/providers/model/harnessUpdates.ts`, their tests, `src-tauri/src/harness_updates.rs` and
   the three commands `harness_latest_version`, `harness_update_check_claim`, `harness_update`.
3. `HarnessUpdateNotice.tsx`, `runLaunchCheck` (line 49 at `43aac9d`): replace
   `await probeHarnessAvailability()` with `await probeHarnessAvailability({ exclude: ["antigravity"] })`
   so the start-up check never starts the Antigravity runtime. The option exists at
   `availability.ts:159–172`.
4. Rust `exec_output(command, args, cwd, timeout)`: build the command with our
   `new_provider_command(Path::new(command), args)?` (so `.cmd`, `.bat` and `.ps1` launchers run through
   their shell with our quoting), then `prepare_child(&mut cmd, command)?` (ours returns `Result`), then
   spawn the way our `probe_command_output` does, with the console hidden. Keep upstream's timeout and
   `terminate(pid)` on timeout. `harness_update` keeps upstream's rule that stdin is closed.
5. Do not extend `EXEC_ALLOWED_ARGS`; the update arguments come only from `update_args` in
   `harness_updates.rs`. Do not add Cline to `npm_package` or `update_args`.
6. Never run a real update while working. Tests mock `invoke`.

### Part C — Haze as chat background and wallpaper effect (question 5, R-07)

Facts. Upstream adds `"gradient-blur"` (label "Haze") to `NEW_THREAD_BACKGROUND_EFFECTS` and the component
`src/features/settings/ui/GradientBlurBackground.tsx`, which blurs `--chat-background-image` with CSS. Our
wallpaper renders the other effects to a new image in a worker (`renderWallpaper`, `appearance.ts:788`),
and the wallpaper selector maps over the same effect list (`SettingsView.tsx:2743`), so Haze appears there
without further work. The wallpaper is painted by `html.is-windows.has-app-wallpaper .app-shell::after`
(`src/styles/index.css:190–196`) from `--app-wallpaper-image` and `--app-wallpaper-opacity`.

1. Chat background: as upstream ships it.
2. `renderWallpaper`: for `"gradient-blur"` return the source URL, like `"none"`. Do not call the worker
   or `prepareNewThreadBackgroundEffect`.
3. Root class `app-wallpaper-gradient-blur` on `document.documentElement`: add it when the committed
   wallpaper effect is `"gradient-blur"`; remove it when another effect is committed and when the wallpaper
   is cleared. The places: `setWallpaperImage` (771), `commitWallpaperSource` (828),
   `commitWallpaperEffect` (849) and the clear branch of `applyWallpaperPath` (893). The class changes in
   the same step that commits the image, never before a new image is ready.
4. `src/app/App.tsx`: render `<GradientBlurBackground className="app-wallpaper-haze" />` as a direct child
   of the `.app-shell` element, marked `aria-hidden`. If the component has no `className` prop, add one.
5. `src/styles/index.css`, next to the wallpaper rules:

   ```css
   .app-wallpaper-haze { display: none; }
   html.is-windows.has-app-wallpaper.app-wallpaper-gradient-blur .app-shell::after {
     background-image: none;
   }
   html.is-windows.has-app-wallpaper.app-wallpaper-gradient-blur .app-shell > .app-wallpaper-haze {
     display: block;
     position: absolute;
     inset: 0;
     z-index: 1;
     pointer-events: none;
     --chat-background-image: var(--app-wallpaper-image);
     opacity: var(--app-wallpaper-opacity);
   }
   ```

   The last rule must win over `html.is-windows.has-app-wallpaper .app-shell > *` (line 202). Use the same
   layer order as `::after` so content stays above the wallpaper; adjust `z-index` only to match it.
6. The saved legacy Halftone key and its migration are untouched. The glass blur and scale variables are
   not applied to the Haze layer.

### Part D — Remote host has nine providers (question 3, R-02)

Upstream's `host/` imports upstream's Antigravity provider, which C-23 keeps deleted.

1. `src/features/connections/model/protocol.ts:17`: remove `"antigravity"` from `REMOTE_PROVIDERS`.
2. `host/providers.ts`: remove the antigravity import (line 10) and its entry (142–147).
3. `host/server.ts`: remove `discoverAntigravityModels` (52), `resolveAntigravityBinary` (55) and both map
   entries (80, 95).
4. `host/process.ts`: remove `binaryNames.antigravity` (23), `extra.antigravity` (40) and the Windows guard
   (120–121).
5. `host/child-backend.ts:85–87`: remove the antigravity `args` special case.
6. Tests. `host/providers.test.ts` asserts that `REMOTE_PROVIDERS` equals `HARNESSES`. Change it to: every
   entry of `HARNESSES` is either in `REMOTE_PROVIDERS` or in a named constant
   `LOCAL_ONLY_PROVIDERS = ["antigravity", "cline"]`, the two lists do not overlap, and
   `Object.keys(hostProviders)` equals `REMOTE_PROVIDERS`. `host/provider-transport.test.ts` (lines 99 and
   201) and `host/child-backend.test.ts:24` lose their antigravity entries. These changes follow from
   Nakul's answer to question 3; list them in the report.
7. Line numbers are at `43aac9d`. `isRemoteProvider` in the client then filters a remote host's provider
   list to the nine.

### Part E — Remote setup downloads upstream's host release

`bootstrap_script_from_template` (`src-tauri/src/remote_ssh.rs:399–413` at `43aac9d`) builds the download
address `https://github.com/hardbeat920/monocode/releases/download/v{version}` from
`env!("CARGO_PKG_VERSION")`, and the bootstrap scripts check that `monocode-host --version` prints the
same value. With our label the release does not exist.

1. Add `fn host_release_version(package_version: &str) -> &str` in `remote_ssh.rs`: return the text before
   the first `-`, or the whole string when there is none.
2. Use `host_release_version(env!("CARGO_PKG_VERSION"))` wherever `remote_ssh.rs` and `remote.rs` put the
   version into a bootstrap, upgrade or pairing script, and wherever they compare it with what the host
   reports.
3. Unit test: `host_release_version("0.6.0-local1-upstream") == "0.6.0"` and
   `host_release_version("0.6.0") == "0.6.0"`. The existing tests
   `unix_bootstrap_accepts_windows_checkout_line_endings` and
   `bootstrap_is_versioned_and_only_explicit_upgrade_restarts_the_host` keep passing; if they compare
   against `CARGO_PKG_VERSION`, compare against the helper's result instead.
4. Checked on 2026-10-01: upstream release `v0.6.0` has `monocode-host-{darwin,linux}-{arm64,x64}.tar.gz`
   and `monocode-host-win32-{arm64,x64}.zip` with `.sha256` files, and `git diff v0.6.0 43aac9d` is empty
   for `host/`, `src/features/connections`, `remote.rs`, `remote_ssh.rs` and the bootstrap scripts.
5. Do not change the download host, the HTTPS-only rule or the SHA-256 check.

### Part F — Do not resurrect upstream's Antigravity

Our Antigravity is `src/integrations/harness/core/antigravity*.ts`, `acp.ts`, `acpSubagents.ts`,
`src-tauri/src/antigravity_acp.rs` and `AntigravitySetupPanel.tsx`; `core/register.ts` imports
`ensureAntigravityRegistered` from `./antigravityAdapter` and `ensureClineRegistered` from
`./clineAdapter`. After the merge none of these upstream items may exist (positions at `43aac9d`):

- `harness.rs`: `AntigravityBinary` (86), `antigravity_args` (91, 336), upstream's body of
  `harness_resolve_antigravity` (799), its override rules (1918, 1950–1951, 1963, 2026),
  `resolve_antigravity` where it differs from ours (2328), its tests (3385–3475, 3710, 3731).
- `availability.ts:4, 53, 155–157`, `availabilityState.ts:20`, `child.ts:365, 424–427, 471`,
  `core/register.ts`, `src/integrations/harness/index.ts:101–104`: imports of or branches for
  `providers/antigravity/*`.
- Any file under `src/integrations/harness/providers/antigravity/`.

`inspectHarnessBinary` may keep returning `{ path, version: "ACP server" }` for Antigravity.

### Part G — Version label and manifests (D-14, C-01)

Label: `0.6.0-local1-upstream`.

1. `package.json`: upstream's content. `package-lock.json`: upstream's side
   (`git checkout --theirs package-lock.json`). Then
   `npm version 0.6.0-local1-upstream --no-git-tag-version --allow-same-version --ignore-scripts`, which
   writes the label into both files.
2. `Cargo.toml`: `[workspace.package] version = "0.6.0-local1-upstream"`; keep everything else from the
   merge. `src-tauri/Cargo.toml` merges cleanly; confirm our `winreg = "0.55"`, our `windows-sys` features
   and the macOS `tauri` feature `macos-private-api` are present beside upstream's new crates.
3. `Cargo.lock`: upstream's side (`git checkout --theirs Cargo.lock`), then let `cargo check` add our
   entries. Do not edit it by hand. Afterwards `git diff 43aac9d -- Cargo.lock` should show only the
   `monocode` package version and `winreg` with its dependencies; report anything else.
4. `src-tauri/tauri.conf.json`: `"version": "0.6.0-local1-upstream"`, with the union from C-01.
5. `npm install` once after the lock is settled (storage check first). `git diff 43aac9d --
   package-lock.json` should show only the two version lines; report anything else.
6. Keep `src-tauri/capabilities/default.json` with upstream's `core:window:allow-set-theme` and all our
   existing permissions.

## Invariants

1. Every row L-01…L-40 of `docs/LOCAL-FEATURES.md` still holds, and the locking test named in each row
   still exists and passes, except the two changed by Nakul's decisions: L-18's update-notice half
   (replaced, part B) and L-09 (gains Haze, part C).
2. `HARNESSES` has eleven entries including `antigravity` (ours) and `cline`.
3. No provider binary is started on Windows without console hiding and our launcher handling.
4. No test is deleted, skipped or weakened except the ones named in this spec (part B, part D, C-25).
5. Form answers are never auto-filled; stored session grants are not used in Plan mode or after Stop.
6. Old `localStorage` and SQLite data from build `0.1.55-local5-provider-fixes` loads without loss.

## States and transitions

Update notice (per provider row):

| State | Event | Next | User sees |
|---|---|---|---|
| none | launch check finds a newer version | idle | Provider name, installed → latest, Update |
| idle | Update (or Update all) | updating | Spinner on that row; other rows unchanged |
| updating | updater exits and the re-read version ≥ latest | updated | Check mark and the new version; model list reloaded |
| updating | updater fails, times out (300 s), or version unchanged | failed | The error line and Retry |
| failed | Retry | updating | Spinner |
| any | window opened later in the same app run | — | No second check (`harness_update_check_claim` is false) |
| none | registry request fails or provider not installed | none | No notice, no error |

Wallpaper effect:

| State | Event | Next | User sees |
|---|---|---|---|
| any effect | choose Haze | Haze | Original picture through the blur layer; no worker run |
| Haze | choose Dither, ASCII, Halftone or Scanlines | that effect | Old wallpaper stays until the new image is ready, then swaps; Haze layer hidden at the swap |
| Haze | choose None | None | Original picture; Haze layer hidden |
| Haze | clear wallpaper | no wallpaper | Neither picture nor Haze layer |
| Haze | worker failure on a later effect change | Haze | Haze stays; existing error handling |
| Haze | app restart | Haze | Haze restored from the saved effect |

CLI path:

| State | Event | Next | User sees |
|---|---|---|---|
| legacy key only | first start after the merge | v1 entry, legacy key removed | Same path shown in the provider's control |
| legacy and v1 both set | first start | v1 unchanged, legacy removed | v1 path |
| v1 set | user saves another path | pending | Upstream's pending marker; old path still used |
| pending | restart | active | New path used |
| v1 set, file fails validation | start or inspect | error on the row | Upstream's message; provider unavailable until fixed or cleared |

## Acceptance criteria

- AC-1. Given the merge is complete, when `git diff --name-only --diff-filter=U` and the marker grep in
  Stage 3 run, then both print nothing, and `git merge-base --is-ancestor 43aac9d HEAD` succeeds after the
  commit (or `git rev-parse MERGE_HEAD` prints `43aac9d…` while uncommitted).
- AC-2. Given the merged tree, when `HARNESSES` is read, then it has eleven ids including `antigravity` and
  `cline`, no file exists under `src/integrations/harness/providers/antigravity/`, and
  `git grep -n "antigravity_args\|AntigravityBinary" -- src src-tauri host` prints nothing.
- AC-3. Given `localStorage` has `monocode.customBinary.codex = "C:\\tools\\codex.cmd"` and no v1 store,
  when `migrateLegacyCustomBinaries()` runs, then `monocode.providerBinaryPaths.v1` is
  `{"codex":"C:\\tools\\codex.cmd"}` and the legacy key is gone. Given the v1 store already has a codex
  path, then it is unchanged and the legacy key is gone. Given `setItem` throws, then both stores are
  unchanged. A second run changes nothing.
- AC-4. Given provider `cline` and an absolute path whose file name is `cline.cmd`, when
  `resolve_harness_binary_override` runs on Windows, then it does not return "Unsupported configured
  harness provider".
- AC-5. Given `is_resolved_harness_binary("C:\\x\\claude.EXE", Some("claude"), Some("C:\\x\\claude.exe"))`
  on Windows with that file present and valid, then it returns true.
- AC-6. Given the app starts, when the launch update check runs, then `probeHarnessAvailability` is called
  with `exclude` containing `"antigravity"`, and no file named `UpdateToasts.tsx` or `cliVersions.ts`
  exists.
- AC-7. Given the update notice shows Codex, when Update is pressed and `harness_update` resolves and the
  re-read version is at least the latest, then the row shows the new version and
  `refreshHarnessCatalogs(["codex"], { force: true })` was called once. When `harness_update` rejects with
  a message, then the row shows that message and Retry.
- AC-8. Given `exec_output` is called with a `.cmd` launcher path on Windows, then the process is built by
  `new_provider_command` (through `cmd.exe /D /S /C`) with the console hidden.
- AC-9. Given wallpaper effect Haze is chosen with a picture set, then `prepareNewThreadBackgroundEffect`
  is not called, the root has class `app-wallpaper-gradient-blur`, and `--app-wallpaper-image` is the
  source picture. When the effect changes to Dither, then the class is removed once the new image is
  committed. When the wallpaper is cleared, then the class is removed.
- AC-10. Given chat background Haze, then it renders as upstream's `GradientBlurBackground` in
  `SessionPane`, independent of the wallpaper setting.
- AC-11. Given `REMOTE_PROVIDERS`, then it has nine ids without `antigravity` or `cline`;
  `Object.keys(hostProviders)` equals it; `npm run host:build` succeeds.
- AC-12. Given `CARGO_PKG_VERSION` is `0.6.0-local1-upstream`, when a bootstrap script is generated, then
  the download address ends in `/releases/download/v0.6.0` and the expected host version is `0.6.0`.
- AC-13. Given a queue held by the user and a usage-limit pause, when the limit lifts and auto-resume
  fires, then the queue head is not dispatched until the user releases the hold.
- AC-14. Given two chats reference the same generated image, when one chat is removed, then the image file
  is not deleted; when the last one is removed, it is.
- AC-15. Given the usage footer with no saved preference, then it shows the percentage left. Given our
  setting saved as "used", then it shows the percentage used.
- AC-16. Given a Codex chat in Full Access outside Plan, when a recognised MCP confirmation arrives, then
  it is accepted without a prompt. In Plan mode, or after Stop, then no stored grant is applied. A form
  request always shows the form.
- AC-17. Given a busy chat, then the Composer shows Stop and the Queue/Steer send action; `/btw` and the
  mode slash commands are parsed before dispatch and the text is sent once.
- AC-18. Given a workspace snapshot saved by build `0.1.55-local5-provider-fixes` (no `preview`,
  `lastDockSide`, `remoteFile` or `remoteOwner` fields), when it is restored, then all tabs, terminals and
  diff tabs load and the new fields have defaults.
- AC-19. Given the four version files and `Cargo.lock`, then each holds `0.6.0-local1-upstream`, and the
  lock-file diffs against `43aac9d` are limited as part G states.
- AC-20. Given the merged tree, then every gate in Stage 3 passes, with only the failures listed under
  known caveats.

## Ordering contracts

- **Start-up paths:** migrate legacy paths → `initializeProviderBinaryPaths()` → first resolve of any
  provider. A resolve never runs before the runtime paths are primed (upstream awaits
  `providerBinaryPathsPrimed` in `main.tsx:92`; keep that).
- **Update:** claim the launch check → probe (Antigravity excluded) → read installed versions → fetch
  latest versions → show. Update: run updater → re-read version → reload catalog → mark updated →
  announce to other windows. A row that fails does not block other rows. If the notice unmounts during an
  update, the updater finishes; the next launch check shows the true state.
- **Wallpaper:** prepare the new image (or take the source for Haze and None) → commit image and toggle the
  class together → persist → release the previous object URL. A stale render that finishes after a newer
  choice is ignored, as today.
- **Stop streaming:** clear background tasks → stamp token usage on the active turn owner → stamp
  duration (C-21).
- **Codex confirmation:** recognise → Plan check → Full Access → stored grant → UI (C-25). The liveness
  check (`liveByThread === live`, not cancelled) runs after any awaited response and before a grant is
  stored.
- **Queue dispatch:** every barrier in C-14 is checked at dispatch time, not when the item was queued.
- **Generated image removal:** remove the chat → check remaining references → delete the file only when
  none remain.

## Test matrix

| AC or risk | Level | Test file | Scenario |
|---|---|---|---|
| AC-2, R-13 | unit | `src/integrations/harness/core/registry.test.ts`, `src/features/sessions/ui/ModelPicker.test.ts` | Eleven providers; Cline and our Antigravity in every provider-keyed map; 440/442 dimensions unchanged |
| AC-3 | unit | `src/features/providers/model/providerBinaryPaths.test.ts` | Four migration cases in AC-3 |
| AC-4, AC-5, AC-8 | Rust unit | `src-tauri/src/harness.rs` tests | Cline override accepted; case-insensitive match on Windows; `.cmd` goes through `new_provider_command` (extend `new_provider_command_routes_shims_through_shell`) |
| AC-6, AC-7 | component | `src/features/providers/ui/HarnessUpdateNotice.test.ts` | Probe called with the exclude; success, failure and Retry rows with mocked `invoke` |
| AC-9 | unit | `src/features/settings/model/appearance.wallpaper.test.ts` | Haze: no worker call, class set, source URL; switch effect and clear remove the class |
| AC-10 | component | upstream's Haze tests as merged | Unchanged upstream behaviour |
| AC-11 | unit | `host/providers.test.ts`, `host/provider-transport.test.ts`, `host/child-backend.test.ts` | Part D item 6 |
| AC-12 | Rust unit | `src-tauri/src/remote_ssh.rs` tests | Helper cases; bootstrap address and expected version |
| AC-13, R-09 | unit | `src/features/sessions/model/messageQueue.test.ts` | Held queue survives auto-resume and reset |
| AC-14, R-10 | unit | beside upstream's generated-image tests | Shared image survives one removal |
| AC-15 | unit | `src/features/providers/model/rateLimits.test.ts` | Default left; saved "used" respected |
| AC-16, R-05 | unit | `providers/codex/codexLive.test.ts`, `codexElicitation.test.ts` | Full Access, Plan, stopped, form matrix |
| AC-17 | component | `src/features/sessions/ui/Composer.test.ts` | Stop plus send while busy; slash commands carried once |
| AC-18, R-14 | unit | `src/features/workspace/model/workspaceSnapshot.test.ts` | Old snapshot restores with defaults |
| R-01 | unit | `src/integrations/harness/core/availability.test.ts`, `src/features/projects/model/projectProviders.test.ts` (or where upstream placed it) | Evidence update visible to project defaults |
| R-03 | typecheck | — | One `LineEnding` |
| Invariant 1 | existing | the test named in each L row | All pass |

Use the helpers and fixtures the test files already have. If a named test file does not exist after the
merge, create the test beside the source it covers.

## Stage 3 — Verify and record

### 3.1 Gates

PowerShell, in the checkout. Check free space before each large step. `$env:CARGO_BUILD_JOBS = "1"`.

```powershell
npx tsc --noEmit
npx vitest run <the test files named in the test matrix>
npx vitest run
npm run check:rust
npm run build
npm run host:build
npm run test:host
git diff --check
git diff --cached --check
git diff --name-only --diff-filter=U
git grep -n -e "^<<<<<<< " -e "^=======$" -e "^>>>>>>> " -- src src-tauri host Cargo.toml Cargo.lock package.json package-lock.json
```

The last two print nothing (grep exit code 1 means none). `npm run check:rust` runs `cargo fmt --check`,
clippy with warnings as errors, and `cargo test`. `npm run test:host` starts real Git, Node and PowerShell
processes and runs one file at a time on Windows; allow it time.

Known caveats, to be listed, not fixed: the 11 line-ending Rust tests in `checkpoint.rs` and `fs.rs`. For
every other failing test decide whether it also fails at `cde05ca` for the same reason (run that one test
there only if the answer is not clear from the code); pre-existing ones are listed with evidence, new ones
are fixed at the cause. The Unix-only test `antigravity_launch_args_match_the_platform_registry`: if it
conflicts or still calls a removed function, rewrite it against our ACP resolver or remove it, and say
which (it does not compile on Windows either way).

### 3.2 Repair loop

Classify each failure before fixing: a missed resolution, a clean-merge break, an upstream test that
assumes ten providers or upstream's Antigravity, or pre-existing. Fix the cause. Re-run the affected gate,
then all gates once at the end.

### 3.3 Records

- `docs/LOCAL-FEATURES.md`, following the rules in its first section: L-09 (six effects, Haze), L-18
  (update notice is now upstream's in-app updater; its test is `HarnessUpdateNotice.test.ts`), L-12 and
  L-30 (left is the default; the setting remains), L-03 (not available on remote sessions), the custom
  path row (store name and migration), the caveat about the Unix-only test, the date and commit line.
- `docs/WINDOWS-CHANGES.md`: a section for this intake — what Windows code was kept at each conflict in
  C-02, C-03 and C-27, parts A, B and E, and the remote-host note.
- `docs/changelog/CHANGELOG-01.md`: one entry at the top, time from PowerShell
  `Get-Date -Format "yyyy-MM-dd HH:mm"` (Git Bash prints UTC on this PC).
- `docs/specs/SPECS.md`: move this spec's row to Review and change the heading of this file to
  `# Review — …`. Only Nakul or the spec writer marks it Done.
- If stopped: write the exact resume point under "Rework / resume" at the end of this file and set the
  status to Blocked.

## Stop conditions

Stop, leave the files as they are, and report in plain non-code language (what upstream wants, what we
have, the consequence of each choice, a suggestion) when:

- a start check fails, or the unmerged path set differs from the table by more than files whose conflict
  disappeared;
- a conflict spot is not covered by its group's resolution, or the resolution cannot be applied without
  dropping a local feature or an upstream feature;
- a change would touch authentication, secrets handling, the SQLite schema beyond migrations through 18, a
  dependency not listed here, or CI files in a way this spec does not describe;
- free space is below a floor, or a build fails for lack of space or memory;
- a gate still fails after its cause was looked for and not found; say what was ruled out.

Do not stop for: conflicts the table covers, expected compile errors between groups, or the known caveats.

## Manual checks — separate follow-up, not for the worker

Nakul, or a separate session with desktop access, after the gates pass and an installer is built on
Nakul's word. The worker inside MonoCode does not drive the desktop app.

1. Start: no console windows flash; the menu bar is visible; old chats, queues, tabs and terminals are
   back; saved custom CLI paths show in each provider's control.
2. Update notice: appears at start when a CLI is outdated; Update on one provider; the row turns to the
   new version; an update while that CLI is running in a chat shows an error and Retry. First real run of
   `codex update` and `claude update` on this PC.
3. Haze: chat background; wallpaper with Haze, then each of the other five effects, then None, then clear;
   restart with Haze; light and dark theme; glass settings on.
4. Composer: Stop beside Send while busy; Queue and Steer; `/btw`; mode slash commands; paste a screenshot
   and a file; held queue stays held across a usage-limit pause.
5. BTW sheet and Sidechat both open, with different labels.
6. Providers: all eleven listed; Cline and Antigravity start a chat; Recheck; scope controls; custom path
   change shows pending and applies after restart.
7. Codex: "Allow for session", Plan mode asks again, an MCP form. Claude: live model and permission change,
   native branch.
8. Remote: add a machine over SSH (password prompt works, no console window), nine providers listed,
   one chat, disconnect and reconnect. The remote machine downloads host `0.6.0`.
9. Editor: format on save and autosave on a CRLF file keep CRLF; preview and pinned tabs; staged and
   unstaged diffs.
10. Source control: generate a commit message, Cancel it, generate again; PR text.
11. Operator mode: off by default; switch on for one chat. MCP settings: list and add a server. Custom
    shortcuts. Usage meter shows "left"; our setting switches to "used".

## Facts, decisions, assumptions

**Facts** (checked in source on 2026-10-01): the counts and paths under Current state; the cited line
numbers; the two reasons our update notice cannot fire; upstream's path store pins paths per process;
`ssh` is already spawned without a console; `mcp.rs` spawns nothing; the `v0.6.0` release assets exist and
the host is unchanged up to `43aac9d`; the seven libraries' registry pages show nothing unusual;
`tauri-plugin-global-shortcut` is declared for macOS only.

**Decisions** (Nakul's: questions 1–7, one merge, target `43aac9d`. Claude's, open to overrule): parts A,
B, C, D, E; the lock-file method in part G; the storage floors; the worker commits only with Nakul's word;
the changed host tests and the rewritten Codex predicate tests.

**Assumptions** (not verified): `codex update` and `claude update` work on this PC; a CLI in use can be
updated or fails cleanly; Haze under the glass settings looks right; `cargo check` on upstream's
`Cargo.lock` adds only `winreg`; `npm version` accepts the label and touches only the two version lines;
upstream's suites pass on Windows apart from the known caveats; the marker line numbers match the real
merge closely.

## Open questions

None block the work. For Nakul later: keep or delete the scratch copy; rebuild or drop git-ignored files
in `@` mentions; a Cline update notice; Cline and our Antigravity on remote sessions.

## Skills to load

`spec-implement`, `desktop-app`, `frontend-ui`, `api-integration`, `testing`.

## Implementer report format

1. Per AC-1…AC-20: done, partial or not done, with the test name or `file:line`.
2. Per conflict group C-01…C-27: what was kept from each side, in one or two lines; any spot where the
   table did not fit.
3. Per R-01…R-15 and parts A–G: what was changed, `file:line`.
4. Per L-01…L-40: the locking test and its result, or "source checked" with `file:line`.
5. Tests deleted or rewritten, each with the reason given in this spec.
6. Commands run with results and counts (test files, tests, failures); free space before and after.
7. Lock-file diffs against `43aac9d` (part G).
8. Deviations, assumptions made, anything unrelated that was noticed.
9. Git state: branch, `HEAD`, whether the merge is committed, `git status --short` summary.
10. The manual checklist above, copied unchanged, as the follow-up for Nakul.

End with the sections from the working agreement: What I changed, Checks, States covered, May affect,
Assumptions / follow-ups.

## Handoff retro

Filled in by the spec writer after reviewing the implementation.
