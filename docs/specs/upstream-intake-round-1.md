# Draft — Upstream intake round 1: v0.1.56 — spec

- Tier: complex · Snapshot: local `c2c8bf6c2127521b55f3a16e4a1ae58e25014eb6`, target `611e05bcde80c096433ef65f3b085693a1be18c5`.
- Workflow status: Draft (2026-10-01 19:43 IST). Analysis only so far; owner answers and reviewer clearance required before implementation.
- Worktree path: `E:\Developing\OpenSource\mono-clone`; branch `nakul/windows-support`; base/current start `c2c8bf6`. No extra worktree proposed.

## In plain words

Bring the first upstream release after our last sync into the Windows fork while keeping its local behavior. This adds a compact sidebar drawer, Haze for chat backgrounds, editor formatting and preview tabs, project-specific provider settings and pull-request checks/repair. Quick composer remains macOS-only. This document does not authorize a merge or decide new product choices.

## Goal and user story

As a Windows-fork user, I want the v0.1.56 improvements while my queues, provider controls, files and appearance keep working. The implementer follows only the owner-approved parameters and file instructions below.

## Scope

One merge of v0.1.56 (19 commits; 170 changed upstream paths by `git diff --name-only 3344bea..611e05b`); all 23 measured conflict paths below plus necessary direct-consumer and clean-merge contract repairs. Candidate IDs: U-001, U-002, U-003, U-004, U-005, U-006, U-007, U-034, U-035, U-036, U-037, U-038, U-039, U-040, U-041, U-042. Preserve all L behaviors, with focused checks below.

## Out of scope

Later releases and post-tag commits, remote host, MCP manager, executable updater, parked Hari/orchestration, redesign, dependency upgrades unrelated to this tag, installer, deployment, push, stash operations and native/browser UI inspection by the MonoCode worker. Commits require separate explicit permission. No source task starts while required decisions remain unanswered.

## Current behavior and recorded baseline

Verified source at pinned local commit: Composer.tsx:163 imports local Queue/Steer action resolvers; Composer.test.ts:47 keeps Stop visible; session.ts:30 includes Cline; availability.ts:102 has per-provider evidence; codex.ts:1177/1229 has scoped-grant/liveness paths; appearance.ts:879 applies wallpaper; App.tsx:6652 marks human origin; branchPlan.ts:68 chooses native forks. Full exact paths and source excerpts: `docs/notes/upstream-intake-2026-10-01/01-local-preservation-list.md`. Generic anchors alone do not prove every behavior.

Verified historical baseline, quoted in substance from `docs/WINDOWS-CHANGES.md` “1 Oct 2026 18:20” and changelog “18:05 / 18:20”: TypeScript passes; full web suite 342 files / 3,944 tests at `35b1f2b`, with one later branch-test line tested in its file; production web and unsigned NSIS builds passed with usual CSS/chunk warnings. Rust checks were not rerun because no Rust source changed since local3. ESLint has no config. Nakul reported local5 “fine”; individual manual checks were not itemized. Real MCP forms and Claude fork CLI behavior retain their documented caveats. Do not treat that historical record as a check of this merge.

## Proposed behavior and invariants

Inferred integration contract, pending approval: retain Stop/Queue/Steer, eleven local providers, shared official ACP and no resurrected old provider, persistent queues, lazy terminal ownership, all five Windows wallpaper effects, stable hover frame, usage/context accounting, helper choice/tool isolation, session-scoped approvals/forms, native fork identity and CRLF serialization. Upstream preview/CI/background logic is added without overwriting these. No reset or clearing of user storage to make the merge work.

## Facts, decisions, assumptions

Verified: scratch merge-tree reports 23 X paths and 63 textual hunks; full hunks saved/read in `docs/notes/upstream-intake-2026-10-01/scripts/round-one-hunks.md`. Final-target C groups are navigation references, not a substitute for this tag-specific table. Standing calls are `docs/NOTES.md` §0 and archive records 2026-09-23/24; wider non-plan Codex Full Access is also recorded as the intended weave in newest WINDOWS-CHANGES learnings.

| Required owner parameter | Assumption for this Draft | If owner chooses otherwise |
|---|---|---|
| D-05 | Assumed pending Nakul: D-05 = approve this tag's macOS tauri-plugin-global-shortcut 2/NSPanel change, allow-set-theme capability and Quick Vite entry after provenance/capability review. No frontend package/CI delta identified in this tag. | Stop before merge; reviewer writes explicit feature/dependency removal plan. Do not silently strip macOS code. |
| D-08 | Assumed pending Nakul: D-08 = Haze chat-only; Windows wallpaper remains None/Dither/ASCII/Halftone/Scanlines. | Wallpaper Haze needs a separate renderer spec and tests; do not route it through unsupported worker behavior. |
| D-11 | Assumed pending Nakul: D-11 = repair missing Cline map and removed Codex helper contract while preserving scoped grants/forms. | Stop; no accepted merge may knowingly keep invalid declarations or imports. |
| D-12 | Assumed pending Nakul: D-12 = preserve legacy snapshots and queues, add optional preview/lastDockSide with absent-field defaults. | Require explicit compatible migration plan before storage changes; no deletion. |
| D-13 | Assumed pending Nakul: D-13 = accept U-001–U-006 and release fixes; retain macOS-gated U-007 without Windows UI. | Reviewer rewrites affected rows/AC/tests; this Draft must not be interpreted as feature acceptance. |
| D-14 | Assumed pending Nakul: D-14 = VERSION 0.1.56-local1-intake-r1 and an approved tooling-only version/lock regeneration recipe. | Replace VERSION everywhere with the exact owner label and approved tooling recipe; never guess the counter. |

Blocking tooling fact: existing `scripts/bump-version.mjs:8` accepts only plain numeric versions and writes lockfiles itself, so it cannot apply the proposed suffix under the no-hand-edit-generated-files rule. Reviewer must supply and approve the exact compatible Cargo lock/version command before this Draft becomes executable. Proposed npm regeneration is `npm install --package-lock-only --ignore-scripts`; it is a future authorized tooling operation, not permission to install today. Missing Cargo recipe is a labeled Draft gap; worker stops rather than improvises.

## Acceptance criteria

| AC | Given / When / Then |
|---|---|
| AC-1 | Given exact clean start and approved parameters, when the merge is resolved, then no unmerged paths or marker lines remain and target 611e05b is an ancestor after an authorized merge commit. Before commit, MERGE_HEAD equals target. |
| AC-2 | Given a compact project rail, when its drawer opens/closes and settings/search/inbox/notes overlays appear, then only the intended sidebar content is mounted and Chat mode respects all overlay guards; existing MenuBar stays present. |
| AC-3 | Given an unprobed ACP and Cline, when provider defaults/picker scope changes, then ACP is not marked missing without evidence, Cline remains selectable and scoped provider settings use the same availability state as discovery. |
| AC-4 | Given a persisted held queue/attachment and dormant terminal, when workspace is restored or its owning chat/pane is removed, then queue remains held on restore and removed ownership cannot dispatch or leave a child running. |
| AC-5 | Given wallpaper with a legacy Halftone preference, when Haze is selected for a chat background, then wallpaper choice/rendering remains one of the five supported values and its preference is unchanged; blob: CSP remains present. |
| AC-6 | Given CRLF disk/index text and a preview file, when save/format/stage/pin occurs, then serializers retain intended disk/index EOL and a pinned/edited tab is permanent; existing diff kind/status is forwarded. |
| AC-7 | Given a Codex recognized MCP confirmation, when non-plan Full Access responds, then it accepts; supervised mode uses selected scoped grants. Plan never replays a stored grant; stopped/replaced runtime never stores one; non-confirmation forms are validated and never silently auto-filled. |
| AC-8 | Given Claude native fork/live controls/context usage, when streamed input/background completion arrives, then reported fork identity is bound once, control responses keep ordering and usage is stamped on the correct turn before stopping. |
| AC-9 | Given CodeRabbit review and CI repair evidence, when both are saved/restored/rendered, then neither field overwrites the other; CI disclosure is initially collapsed and escapes markup. |
| AC-10 | Given old local snapshots without preview/lastDockSide, when loaded, then local diff/focusKind and encoded-drive repairs remain valid, absent fields default safely and terminal-only tabs survive. |
| AC-11 | Given completed repairs, when all verification commands run, then gates pass with exact results recorded; missing ESLint config is reported, no test weakened, skipped or deleted. |

## Implementation plan

### 0. Do not start until approved

Read AGENTS/profile, working agreement, indexes/current records and this spec. Load relevant frontend-ui, desktop-app, testing and API skills for actual code changes. Confirm every owner parameter above, reviewer clearance of source/test gaps and approved version tooling; an unanswered product decision blocks the entire merge because it includes those features. Set Draft to Progress only after authorization, recording answers verbatim. This analyst run does not grant it.

### 1. Exact starting state

Run read-only commands in main: `git branch --show-current` = `nakul/windows-support`; `git rev-parse HEAD` = `c2c8bf6c2127521b55f3a16e4a1ae58e25014eb6`; `git rev-parse refs/remotes/origin/main` = `43aac9d216c323a7e04c9037eb0b251dd840cc7a`; `git status --porcelain` has no tracked changes; `git rev-parse v0.1.56^{commit}` = `611e05bcde80c096433ef65f3b085693a1be18c5`; `git merge-base HEAD 611e05b` = `3344bea70341d8ea4d6dea414aa15c13683372e9`. Record stash/worktree names only, matching stage 0; do not open them. Check C/E plus TEMP/cache/target free space. Stop on mismatch or insufficient space, without restore/reset/stash.

### 2. Authorized merge only

Exact command, run only by the later authorized worker:

```powershell
git merge --no-commit --no-ff 611e05bcde80c096433ef65f3b085693a1be18c5
```

Expected exit 1 with exactly the 23 paths below. Record `git diff --name-only --diff-filter=U`; any missing/additional path or different target stops the worker for reviewer recomputation. The working agreement says STOP on conflicts; proceed only if Nakul explicitly approves this table and its consequences beforehand. Otherwise report conflicts and stop. No automatic branch/worktree/abort/commit/push.

### 3. File-by-file resolution

Read index stages `git show :1:<file>`, `:2:<file>`, `:3:<file>` and current auto-merged content; resolve only the listed seam plus necessary directly connected repairs. “Both” means union neighboring additions, not concatenate whole files. “Weave” means adapt the stated contracts. All recommendations are Inferred until gates/review.

| File | Resolution | Exactly what to keep from each side | Why |
|---|---|---|---|
| `Cargo.lock` | weave | Use ours as tooling seed only; regenerate workspace version/dependency metadata by approved Cargo tooling after manifests resolve. Preserve local portable-pty and carry macOS shortcut dependencies. Never hand-edit generated lock entries. D-14 tooling approval is blocking. | C-01; preserve its local contracts and this tag's addition; exact hunk evidence in stage-7 output. |
| `Cargo.toml` | weave | Only the version hunk: approved VERSION from D-14. Keep local workspace configuration; do not change other dependency ranges. | C-01; preserve its local contracts and this tag's addition; exact hunk evidence in stage-7 output. |
| `package-lock.json` | weave | Use ours as tooling seed only; regenerate both root version entries via npm package-lock-only/ignore-scripts after package.json resolves. No new frontend package is introduced by this tag; no hand-edited lock data. | C-01; preserve its local contracts and this tag's addition; exact hunk evidence in stage-7 output. |
| `package.json` | weave | Approved VERSION only; keep local build:windows MSVC/NSIS script and all existing scripts/dependencies; this tag adds no host scripts. | C-01; preserve its local contracts and this tag's addition; exact hunk evidence in stage-7 output. |
| `src-tauri/src/window.rs` | weave | Keep cfg(windows) prepare_windows_window(&window) after creation. Adopt upstream WebviewWindow return and reveal-conditional focus; update callers to its changed return type. Do not focus a hidden Quick window unconditionally. | C-02; preserve its local contracts and this tag's addition; exact hunk evidence in stage-7 output. |
| `src-tauri/tauri.conf.json` | weave | Approved VERSION only. Preserve existing CSP including blob: in packaged/dev connect-src, Windows configuration and asset access. No wholesale theirs. | C-01; preserve its local contracts and this tag's addition; exact hunk evidence in stage-7 output. |
| `src/app/App.tsx` | weave | Two diff-signature hunks: retain optionsOrSession / OpenDiffOptions handling and changeKindParam; add pin=false as final parameter. onOpenFile accepts kind OR local {kind,status} plus optional pin, normalizes kind once, forwards pin. Preserve runNativeBranchSend, humanAuthored, queue/terminal cleanup, forms/scopes and always-rendered MenuBar in auto-merged body. Retain upstream preview/CI/quick-launch plumbing without importing later BTW/remote work. | C-06; preserve its local contracts and this tag's addition; exact hunk evidence in stage-7 output. |
| `src/app/shell/ProjectRail.tsx` | weave | Replace inline projectMenuExtraItems with upstream useProjectMenu. Keep SharedHoverHighlight and AppMode imports used by local rail styling. Preserve shared frame/highlight/mode attributes at hook call sites; remove only unused old helper/imports after checking consumers. | C-07; preserve its local contracts and this tag's addition; exact hunk evidence in stage-7 output. |
| `src/app/shell/Sidebar.tsx` | weave | Union useId/useLayoutEffect imports. Preserve local onOpenDiff kind-or-options signature plus optional pin. Retain chatVisible overlay guards as written; project branch uses upstream drawerMounted/drawerVisible/drawerClosing/listeners and panelOpen for loading. Render chat mode only via chatVisible, project mode via sidebarVisible/drawerRendered; never double-mount sidebarContent. | C-07; preserve its local contracts and this tag's addition; exact hunk evidence in stage-7 output. |
| `src/features/inbox/ui/InboxView.tsx` | both | Seven neighboring prop hunks: keep onPullReview and add repairSessions/onRepairChecks in every type, destructure and JSX forwarding layer. Review report and CI evidence remain different fields; no last-prop overwrite. | C-11; preserve its local contracts and this tag's addition; exact hunk evidence in stage-7 output. |
| `src/features/sessions/data/sessionStore.ts` | both | Keep sanitizeReview/block.review and append user-only non-empty string ciContext sanitizer. Preserve all queue/branch fields and validation elsewhere. | C-13; preserve its local contracts and this tag's addition; exact hunk evidence in stage-7 output. |
| `src/features/sessions/model/session.ts` | both | Union ContextUsage/dropContextWindow, ProcessedUsage/deriveLocalSessionTitle, CodeReviewReport and loadProjectProviderSettings imports. Keep review and add ciContext. Add backgroundTasks as in-memory; retain accurate persisted-followups comment and local fields. Keep Cline in HarnessId/HARNESSES and all local fork/usage fields. | C-13; preserve its local contracts and this tag's addition; exact hunk evidence in stage-7 output. |
| `src/features/sessions/ui/AgentTranscript.test.ts` | both | Keep complete accessible native/composer/prefix divider test and append complete saved CI disclosure test. Share existing render helper; CI content must escape HTML and disclosure remain collapsed. | C-15; preserve its local contracts and this tag's addition; exact hunk evidence in stage-7 output. |
| `src/features/sessions/ui/AgentTranscript.tsx` | both | Keep scope-aware onApproval(requestId,decision,scope?) and local form reply/context props; add backgroundTasks prop. Carry upstream CI/background rendering already auto-merged. Do not reduce signature to two parameters. | C-15; preserve its local contracts and this tag's addition; exact hunk evidence in stage-7 output. |
| `src/features/sessions/ui/ModelPicker.tsx` | weave | Union project-provider subscription imports with hasHarnessEvidence. Picker predicate becomes !isProviderHidden(project,id) AND showProviderInModelPicker(id,isHarnessAvailable(id),hasHarnessEvidence(id)); retain projectVersion dependency. ACP with no evidence stays listed unless explicitly hidden; keep all eleven tabs/dimensions. | C-04; preserve its local contracts and this tag's addition; exact hunk evidence in stage-7 output. |
| `src/features/settings/ui/SettingsView.tsx` | weave | Union hasLiveCatalog/isPickerProviderVisible, remaining quota and Quick settings imports. Close AI helper Group then render separate Editor Group. ProvidersPage retains exported ReactElement signature and gains optional cwd/recents; add scopeOptions/global-project controls alongside initialLoading/updateNotices/runUpdateCheck. ProviderRow receives inPicker/pickerLocked/onPickerVisible AND initialLoading/onCatalogRefreshed. Rename duplicate local state/callback to avoid shadowing; remove only old visibility-state ownership, preserve customBinaryPath/recheck/ACP setup. Keep disabled/title/description option fields and add icon rendering before existing label+description. D-08 restricts wallpaper to five effects. | C-17; preserve its local contracts and this tag's addition; exact hunk evidence in stage-7 output. |
| `src/features/source-control/ui/GitChangesPanel.tsx` | weave | All onOpenFile types retain kind-or-{kind,status} options and add pin?:boolean. Keep optional onOpenAllChanges with guarded invocation; add optional pin to onOpenCommit. Union upstream double-click (kind,true) with local focus/ring/rounded row classes; preserve local helper pipeline and PR details elsewhere. No BTW/helper decision is required by this tag. | C-19; preserve its local contracts and this tag's addition; exact hunk evidence in stage-7 output. |
| `src/integrations/harness/core/apply.ts` | weave | Destructure backgroundTasks away from settlePendingApprovals result; retain local stopped block mapping, stampTurnUsage on liveTurnUsage, then stampTurnDuration. Keep native owner selection and session grant settlement; do not copy the upstream shortened branch wholesale. | C-21; preserve its local contracts and this tag's addition; exact hunk evidence in stage-7 output. |
| `src/integrations/harness/core/availability.ts` | weave | Consolidate state into new availabilityState.ts (R-01) so project defaults and UI read the same values. Move local evidenced set, ACP diagnostic, version/listener/reset/hint/note logic there; re-export existing public APIs from availability.ts for current consumers. Keep probe inflight/acquisition and excludes here; merge partial results into existing eleven-provider map, never replace unprobed ACP with false evidence. Use one emit per completed update and mark probed timestamp consistently. | C-04; preserve its local contracts and this tag's addition; exact hunk evidence in stage-7 output. |
| `src/integrations/harness/providers/claude/claude.ts` | both | Union Live requestsById/priorTurnsUsage/turnUsage with pendingAssistantBoundary, initialize all. Keep CONTROL_TIMEOUT_MS/ClaudeControlError and add RESUME_GRACE_MS. Preserve live model/permission controls, scoped-grant liveness, native-fork reported-id binding and request usage; carry upstream streamed-input and background completion logic in the auto-merged body. | C-24; preserve its local contracts and this tag's addition; exact hunk evidence in stage-7 output. |
| `src/integrations/harness/providers/claude/claudeLive.test.ts` | both | Union inspectClaudeContext and cancelClaudeTurn imports. Keep all local fork/control/grant/context tests plus upstream streamed-input/background cases; do not replace the file. | C-24; preserve its local contracts and this tag's addition; exact hunk evidence in stage-7 output. |
| `src/integrations/harness/providers/codex/codex.ts` | weave | Retain grant/form/native-fork/usage imports but remove isCodexComputerUseAccessConfirmation import/call. Replace emittedAssistant/emittedReasoning strings with upstream per-item Maps and clear them at start/finish, while also retaining inProgressMcpTools.clear and threadBaseline/turnUsage reset. Confirmation first uses local parent-only tool candidates; non-plan Full Access accepts recognized confirmation; otherwise non-plan stored grant, then scoped approval UI with liveness after response. Preserve codexMcpForm path for non-confirmations; never auto-fill a form. Remove stale computer-use-only comment. Keep source/branch/token behavior outside hunks. | C-25; preserve its local contracts and this tag's addition; exact hunk evidence in stage-7 output. |
| `src/integrations/harness/providers/codex/codexElicitation.test.ts` | weave | Union local afterEach/form/secret/type imports and upstream confirmation suite; remove the stale import; replace predicate-only assertions with equivalent new confirmation/live-handler assertions only after explicit D-11 reviewer/owner approval. Never simply delete or weaken a test. Preserve grant/form/fail-closed cases; wider Full Access behavior belongs in codexLive tests, not a deleted predicate test. | C-25; preserve its local contracts and this tag's addition; exact hunk evidence in stage-7 output. |

### 4. Clean-merge risks and direct consumers

| R ID | Required handling in this round |
|---|---|
| R-01 | In new availabilityState.ts include Cline in the typed eleven-key initial map, consolidate local evidence/diagnostic/reset semantics there, and re-export from availability.ts. Existing projectProviders.ts already reads the new state directly; add a regression proving noteHarnessEvidence and project-default resolution see the same update. |
| R-05 | CodexElicitation.ts merges cleanly but removes isCodexComputerUseAccessConfirmation. Remove stale uses/imports in codex.ts and predicate-test imports; keep forms/grants and migrate coverage only under the explicit D-11 test-change approval. Add broader Full Access normal-confirmation test and retain Plan/stopped guards. |
| R-07 | appearance.ts merges cleanly and adds gradient-blur to the chat union. Add a separate typed wallpaper-effect subset and validator, retain legacy Halftone migration, disallow gradient-blur at wallpaper selection/load boundaries, keep original wallpaper on failures. Add independent wallpaper/chat preference regression. |
| R-13 | This tag does not add the later registry text-runner list; recheck its provider-keyed defaults/maps (especially Quick composer) for Cline. Preserve ModelPicker 440px/min/max442 assertions. No weakening count/text tests. |
| R-14 | This tag adds preview and lastDockSide, not remote fields. Keep old diff/focusKind/encoded-drive normalization; default absent/invalid lastDockSide; verify preview tabs do not lose terminal ownership. |

R-03/R-04/R-06/R-08/R-09/R-10/R-11/R-15 refer to later-source changes and are not imported here. R-02 old Antigravity host import is later; retain its standing deletions now. R-12 is a Windows native safety checkpoint: union lib/fs/window registrations without losing existing wallpaper/import/ACP commands; retain cfg-gated suppression and queue SQL even where unchanged. No new SQL migration is present in this tag. Audit new cfg gates and all window-return direct callers; do not claim macOS runtime tested on Windows.

### 5. Repair loop and records

After resolving a logical group, inspect complete diff and its consumers, add combined regressions below, run focused suite/typecheck, and classify every failure before fixing. Never replace a full source/test file just to remove markers. If failure is outside approved scope or requires a product/API/dependency change, stop and report. Re-run only affected gates after a new repair, then once run all final gates.

Record in `docs/notes/upstream-intake-round-1-record.md`: exact start/target/base, D answers and permission, all 23 resolutions, every clean repair, L/AC test names and results, disk measurements, check failures, version-tool output, final status and desktop follow-up. Update current numbered changelog, WINDOWS-CHANGES and spec/index to Review after automated gates; only owner/reviewer closes Done after acceptance. Docs stay ignored/uncommitted. Do not delete retained analysis scratch.

## Preservation checks and test matrix

All 28 L behaviors are included conservatively because shared App/Settings/provider/bridge consumers can affect behavior even when its owner file did not change. Source anchors/tests refer to pinned local files; they are search starting points, not runtime proof. Generic coverage must be strengthened where stated before reviewer clearance.

| L | Search / contract to retain | Existing test file or source-only gap |
|---|---|---|
| L-01 | resolveComposer action helpers, separate Stop, queue/steer priority; new project={cwd}; `src/features/sessions/ui/Composer.tsx:163` | `src/features/sessions/ui/Composer.test.ts` |
| L-02 | App renders MenuBar always; no Alt gate; `src/app/App.tsx:9651` | `src/app/shell/TitleBar.test.ts; generic coverage: retain source inspection and add focused combined regression if wiring changes` |
| L-03 | core/antigravityAdapter and shared runtime acquisition; old providers directory stays deleted; `src/integrations/harness/core/antigravityRuntimeHost.ts:54` | `src/integrations/harness/core/antigravityAcpLive.test.ts` |
| L-04 | HarnessId/HARNESSES has cline; eleven-key availability and picker dimensions; `src/features/sessions/model/session.ts:30` | `src/features/sessions/ui/ModelPicker.test.ts; generic coverage: retain source inspection and add focused combined regression if wiring changes` |
| L-05 | queuedFollowups persistence/attachment ownership and v14 reconciliation; `src/features/sessions/model/queueDurability.ts:31` | `src/features/sessions/model/queueDurability.test.ts` |
| L-06 | held/steering barriers and cancellation; `src/features/sessions/model/messageQueue.ts:38` | `src/features/sessions/model/messageQueue.test.ts` |
| L-07 | disappearedTerminalIds, eviction and kill ownership; `src/app/App.tsx:4498` | `src/features/workspace/model/terminalPanes.test.ts` |
| L-08 | DormantTerminalSurface and release on close; `src/features/terminal/ui/TerminalView.tsx:35` | `src/features/sessions/ui/TerminalView.test.ts` |
| L-09 | applyWallpaperPath, five wallpaper choices, legacy Halftone and blob CSP; `src/features/settings/model/appearance.ts:879` | `src/features/settings/model/appearance.wallpaper.test.ts` |
| L-10 | Popover stable frame SharedHoverHighlight, continuous hover; `src/shared/ui/Popover.tsx:265` | `src/shared/ui/Popover.hover.test.ts` |
| L-11 | stampTurnUsage/liveTurnUsage and native turn ownership; `src/features/sessions/model/tokenAccounting.ts:9` | `src/features/sessions/model/tokenAccounting.test.ts` |
| L-12 | load/saveRemainingQuota plus clamp/round remaining percent; `src/features/providers/model/rateLimits.ts:183` | `src/features/providers/model/rateLimits.test.ts` |
| L-13 | Windows hidden commands, PATHEXT resolver, job object cleanup; `src-tauri/src/harness.rs:129` | `src-tauri/src/harness.rs; generic coverage: retain source inspection and add focused combined regression if wiring changes` |
| L-14 | ConPTY stall replay and offset ownership; `src-tauri/src/pty.rs:393` | `src-tauri/src/pty.rs; generic coverage: retain source inspection and add focused combined regression if wiring changes` |
| L-15 | reveal_path test seam and error propagation; `src-tauri/src/fs.rs:5207` | `src-tauri/src/fs.rs` |
| L-16 | import/replay/native resume contracts; `src/integrations/harness/core/sessionImport.ts:16` | `src/integrations/harness/core/sessionImport.test.ts` |
| L-17 | skills discovery and setting registration; `src/features/skills/model/skills.ts:26` | `src-tauri/src/skills.rs; generic coverage: retain source inspection and add focused combined regression if wiring changes` |
| L-18 | hasHarnessEvidence, initialLoading/recheck, update notices and unknown ACP; `src/integrations/harness/core/availability.ts:118` | `src/features/settings/ui/UpdateToasts.test.ts` |
| L-19 | AI helper preference validation, structured output, no tools/fallback boundary; `src/features/settings/model/settings.ts:794` | `src/integrations/harness/core/helperPipeline.test.ts` |
| L-20 | ApprovalScope and tool-key grant replay; `src/integrations/harness/providers/codex/codex.ts:1221` | `src/integrations/harness/providers/codex/codexElicitation.test.ts` |
| L-21 | !live.planning, liveByThread===live, !cancelled; `src/integrations/harness/providers/codex/codex.ts:1229` | `src/integrations/harness/providers/codex/codexLive.test.ts — Plan at1279, stopped grant at1330; ClaudeLive corresponding stopped-rule test` |
| L-22 | Claude model/permission control response ordering; `src/integrations/harness/providers/claude/claude.ts:466` | `src/integrations/harness/providers/claude/claudeLive.test.ts — matching model response at296; permission control block` |
| L-23 | McpFormReply typed validation, cancel/secret handling; `src/features/sessions/ui/McpForm.tsx:17` | `src/features/sessions/model/mcpForm.test.ts` |
| L-24 | context breakdown totals/estimates provider inspection; `src/features/sessions/model/contextBreakdown.ts:33` | `src/features/sessions/model/contextBreakdown.test.ts` |
| L-25 | reported fork ID, bound event once, branch divider origin; `src/features/sessions/model/branchPlan.ts:68` | `src/features/sessions/model/branchPlan.test.ts` |
| L-26 | Sidechat and CodeRabbit review callbacks; `src/features/sessions/ui/SessionPane.tsx:758` | `src/features/sessions/ui/ChatPanel.test.ts` |
| L-27 | EditorDiskSession serializeForSave/Stage preserves CRLF; `src/features/files/editor/editorDoc.ts:8` | `src/features/files/editor/editorDoc.test.ts` |
| L-28 | humanAuthored retained through fork/managed submissions; `src/app/App.tsx:6652` | `src/integrations/harness/providers/claude/claudeProtocol.test.ts; generic coverage: retain source inspection and add focused combined regression if wiring changes` |

New combined regressions required: AC-2 drawer/Chat overlays in SidebarRename.test.ts; AC-3 shared evidence/project defaults in availability.test.ts and projectProviders.test.ts; AC-5 Haze/wallpaper exclusion in appearance.wallpaper.test.ts; AC-6 format/preview/CRLF in editorDoc.test.ts/FileEditor tests; AC-7 Full Access/Plan/forms/stopped-write matrix in codexLive.test.ts; AC-9 dual review/CI persistence in sessionStore.test.ts and AgentTranscript.test.ts; AC-10 old snapshot+preview/lastDockSide in workspaceSnapshot.test.ts. Use source-existing helpers/fixtures; if a proposed test path does not exist, create only the named test beside its owning source, following the repo Vitest convention. Native window/hidden process checks are source/Rust plus separate desktop follow-up.

## Verification

For the later authorized worker only, PowerShell in the main checkout; this analyst did not execute any command below. Check storage before each large operation; stop on insufficient space.

```powershell
npx tsc --noEmit
npx vitest run src/features/sessions/ui/Composer.test.ts src/features/sessions/model/queueDurability.test.ts src/features/sessions/model/messageQueue.test.ts src/features/workspace/model/workspaceSnapshot.test.ts src/features/files/editor/editorDoc.test.ts src/features/settings/model/appearance.wallpaper.test.ts src/features/settings/model/settings.test.ts src/features/sessions/ui/AgentTranscript.test.ts src/features/sessions/data/sessionStore.test.ts src/integrations/harness/core/availability.test.ts src/integrations/harness/providers/claude/claudeLive.test.ts src/integrations/harness/providers/codex/codexLive.test.ts src/integrations/harness/providers/codex/codexElicitation.test.ts
npx vitest run
npm run check:rust
cargo check
npm run build
git diff --check
git diff --cached --check
git diff --name-only --diff-filter=U
git grep -n -e "^<<<<<<< " -e "^=======$" -e "^>>>>>>> " -- src src-tauri Cargo.toml Cargo.lock package.json package-lock.json
```

The last two must print no unresolved paths/markers (grep exit1 means none). Also run each changed/new test suite not in the focused list, including upstream CI/project/default/layout/Quick tests in the full suite. `npm run check:rust` is fmt/clippy/tests at this snapshot. No ESLint config exists; report lint unavailable, do not install a new lint setup. No installer. Commit, abort or push only after explicit permission; never stage all or stage docs/.agents.

## Stop conditions

Unanswered D parameter; missing version tooling approval; start mismatch; source/manifest differences; unexpected conflict; unclear security/provider contract; storage failure; new dependency or migration outside approved scope; pre-existing failure needing unrelated edits; compiler/test/build failure unresolved. Preserve partial files and record exact Resume here; no reset, clean, restore of unrelated WIP or deletion.

## Manual checks — separate follow-up

Nakul or a separate desktop-access session after automated gates; never the worker inside MonoCode:

1. Drawer/hidden-rail menus, Escape and outside dismissal; Chat and settings/search/inbox/notes overlays; menu always visible and hover continuous.
2. Cline selection, project/global default/visibility, unknown ACP then explicit discovery; custom path/Recheck and no stray console windows.
3. Queue text/image across restart; held queue remains held; remove chat/pane and confirm terminal cleanup/lazy startup.
4. Haze chat preview and all five wallpaper effects; restart, theme change and packaged rendering (installed follow-up only after separately authorized installer).
5. CRLF format/save/stage, edited preview/pinned tabs, old workspace restore and deleted-file diffs.
6. CI repair plus Pull review; Claude live controls and native fork; Codex session grant, Plan and real typed MCP form. Report individual checks and remaining baseline caveats.

## Open questions

D-05/D-08/D-11/D-12/D-13/D-14 are unanswered. Exact Cargo version/lock tooling for a suffix is not specified; reviewer must supply it before handoff. Full new Quick/native contracts and generic L test coverage need reviewer clearance. This Draft is not executable until those gaps and parameters are closed.

## Implementer report format

Per AC and L: pass/partial/not checked, exact test name/source evidence; per conflict path and R checkpoint: resolution/repair and consequences; D answers; commands/results and disk state; version label; current Git status and target ancestry; deviations and unrelated failures; separate desktop checklist; commits only if authorized. Leave spec Review until accepted.

## Handoff retro

Filled in by the spec writer after review. Empty for this Draft.
