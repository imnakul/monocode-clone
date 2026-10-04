# Changelog 02

Newest first. One short entry per change (format in `docs/WORKING-AGREEMENT.md` → Records).
Entries dated 2026-10-02 to 2026-10-03 were backfilled from commits made in cloud sessions
that did not have the docs; file lists name the main files only.


## 2026-10-04 — Connect normal/quick Cloud controls and restore shared session motion
- What: Repaired the normal/split-pane container dropping Cloud and Claude RC callbacks. QuickComposer Session mode now reuses Local | Cloud and launches through the cloud boundary without local submit/worktree creation; Save to Draft stays local. Native resumes/sidechats and unsupported local worktrees are guarded. Retained cloud tasks refresh with local lists and account changes, show read errors without losing prior rows, and survive stale results. Launch storage/delivery failures retain the real ID and prompt for recovery without another task. Shared chat/provider cards reuse upstream title particles and fresh-row motion; scratch rows receive live title/model changes while keeping saved ordering and pin/archive state.
- Files: `src/features/workspace/ui/PaneTree.tsx` (Cloud/RC forwarding); `SessionPane.tsx`, `Composer.tsx` (eligibility/send guards); `QuickComposer.tsx` (cloud/recovery/draft routing); provider cloud models/hooks/list and `App.tsx` (event validation/refresh); `SessionCard.tsx`, `SessionListItem.tsx` (existing motion reuse), `ChatPanel.tsx`, `Sidebar.tsx`, `sessionHistory.ts`; integration regressions and repair/handoff/register docs.
- Verified: focused cloud/quick/provider tests ✅ (164 / 26 files), primary audit ✅ (126 / 9 files), updated Composer ✅ (42), history ✅ (35); full `npm run check` ✅ (5,499 web / 508 files, TypeScript, fmt/Clippy, 609 Rust passed / 2 ignored), production build ✅, diff check ✅. Manual: Windows motion, real CLI/account/cloud launches and Claude RC phone/consent checks in the repair spec. No installer/version change.
- Commit: `614b27e5c2758aca48c442ce049894a2c9550c92` (repair source pushed and remote verified); this documentation-only checkpoint follows.

## 2026-10-04 — One test line: provider sessions + upstream main sync on 0.7.0
- What: `nakul/windows-support-upstream-0.7.0` fast-forwarded to the provider-sessions branch (backend + sidebar list, earlier history, Remote Control, Local | Cloud) and merged with `nakul/windows-support-upstream-0.7.0-latest-2026-10-03` (upstream main through `00d68d3`). Only conflict: one row each in `docs/specs/SPECS.md` (both kept).
- Files: merge only; `docs/specs/SPECS.md` (both Review rows kept)
- Verified: tsc ✅ tests ✅ (5,478) build ✅ cargo fmt ✅ cargo test --lib ✅ (609) | manual: provider-sessions and upstream-sync checklists in their specs
- Commit: see git log for this entry
## 2026-10-04 — Original 0.7.0 updates combined with latest upstream intake
- What: Included all four original-branch commits through `9effbed` after explicit user approval. Kept both conflict sides: saved-prompt/permissions imports and all changelog records. Latest now combines MCP switch polish, saved prompts, Task Focus/hover changes and the Remote Control draft with the seven upstream improvements. Session draft regression checks prompt insertion and selected permission mode together; Task/Session and existing actions remain.
- Files: all incoming prompts/Tasks/MCP/settings/hover source and tests; QuickComposer import combination and combined regression; preserved docs plus intake spec/index and local-feature audit.
- Verified: focused tests ✅ (107 / 7 files) full `npm run check` ✅ (5,317 web tests / 487 files, tsc, fmt/Clippy, 599 Rust passed / 2 ignored) cargo check ✅ production build ✅ diff check ✅ | manual: merged desktop checklist in intake spec.
- Commit: `68c1edb8b657c9d8a1194b82c90dc8bdeaf048a8` (combined source merge; both complete parent lines verified).

## 2026-10-03 — Seven upstream main commits after 0.7.0
- What: Integrated upstream through `00d68d3` on the new dated branch from `6705686`, after user approval of all eight conflict combinations. Added title/sidebar/pane/panel animations, separate composer permissions, detailed live usage captions and PR/issue activity/overview. Preserved Task/Session and Drafts, hover, active-model metadata, pane actions, Windows support and MCP controls. Compact quota setting/default/used-left wording stays independent. Four newer commits on the original base branch are excluded pending the separate inclusion choice.
- Files: App/Sidebar/UsageProviderChip; Inbox models/views and new overview/timeline tests; QuickComposer/model/permissions/motion; session history; PaneTree and entry tests; ParticleText/styles; preservation register, spec/index and conflict record.
- Verified: full `npm run check` ✅ (5,286 web tests / 483 files, tsc, fmt/Clippy, 596 Rust passed / 2 ignored) production build ✅ diff check ✅ | manual: desktop checklist in `docs/specs/upstream-main-after-070-plan.md`; no installer built.
- Commit: `1f399abecb6fc6529b0a39532ddd0322785c0c92` (source merge pushed and verified; handoff records follow).

## 2026-10-04 — Normal vs Cloud launch and cloud task view (frontend part C)
- What: New Claude/Codex sessions get a Local | Cloud switch in the composer. Cloud shows what it will not carry over (model, permissions, MCP, unsaved files), asks Codex for a required environment ID and optional branch, launches exactly once through `launchProviderCloudSession` (never a local send), keeps the draft on any refusal or failure, warns that a timeout may still have started a task, and on a retention failure shows the real task ID with Retry saving instead of launching again. Retained tasks list under the provider with a cloud icon; opening one shows its details and only the actions the installed CLI supports (explained when not), real CLI output, and Apply behind an explicit confirmation. Nothing opens a browser or phone automatically.
- Files: `src/features/provider-sessions/model/cloudLaunchModel.ts`, `cloudView.ts`; `ui/CloudLaunchControls.tsx`, `useCloudLaunch.tsx`, `CloudSessionDialog.tsx`, `useCloudRecords.ts`, `ProviderConversationList.tsx` (Cloud tasks section); `Composer.tsx` (`cloudLaunch` prop, launch branch in `completeSubmit`), `SessionPane.tsx`, `App.tsx`; tests beside each file
- Verified: tsc ✅ tests ✅ (5,455 / 500 files) build ✅ | manual: pending; QuickComposer has no cloud choice yet
- Commit: see git log for this entry

## 2026-10-04 — Earlier history for opened provider conversations (frontend part D)
- What: A chat bound to a native Claude/Codex conversation now shows that conversation's earlier messages above new turns, read-only from the provider's own transcript file, with an "Earlier in Claude Code / Codex" divider, collapsed tool-call rows, a Show earlier button (steps of 200 messages, then older 6 MB file chunks) and a clear Retry message when the file is missing or unreadable (resuming still works). History is display-only: it is composed in the pane, never in `session.blocks`, so it is not saved, not sent to the provider, and not counted as turns. Items at or after the chat's first MonoCode turn are trimmed so a continued chat never shows turns twice. The earlier "older transcript is not shown" note is removed.
- Files: `src-tauri/src/provider_sessions.rs` (`provider_sessions_history`, `read_history_at`; read-only, canonical-root check, tail/paged chunks) + `lib.rs` + tests; `src/features/provider-sessions/model/history.ts` (parsers, `NativeHistoryStore`, `trimHistoryBefore`, display blocks), `ui/useNativeHistory.ts`, `SessionProviderStrip.tsx`; `SessionPane.tsx` (history above `session.blocks`; Branch/Sidechat/Second opinion/Handoff ignore history turns); `App.tsx` (note state removed, history cache dropped on delete)
- Verified: tsc ✅ tests ✅ (5,438 / 497 files) build ✅ cargo fmt ✅ cargo test --lib ✅ (609 passed, 2 ignored) | manual: real Claude/Codex transcripts (large file, moved file, Codex layouts without a JSONL rollout show the reason)
- Commit: see git log for this entry

## 2026-10-04 — Provider conversations sidebar, Claude Remote Control UI (frontend parts A and B)
- What: Enabled Claude/Codex get a folder-style row under the projects (provider mark and refresh at the right); selecting one lists its discovered local conversations in the secondary sidebar with loading/empty/error/diagnostics, paging, a Show archived filter and Archive/Unarchive (MonoCode-only, synced with the open chat). Opening a row reuses an existing chat or opens a metadata-only native view with a short "earlier messages are not shown yet" note. Native input is prepared before every send, compact and rewind; deleting a chat clears its native link and RC choice. Settings → Providers gets "Turn on Remote Control for new Claude chats"; local Claude chats get a Remote Control chip (Connecting / On / Paused / Needs setup / Failed, Retry, Copy link) fed by a per-session event route that never touches busy state.
- Files: `src/features/provider-sessions/model/conversationStore.ts` (request-generation list store), `conversationSummary.ts`, `providerActions.ts` (live-aware open deps, archive sync/rollback), `nativeInput.ts`, `remoteControlView.ts`; `ui/ProviderConversationList.tsx`, `useProviderConversations.ts`, `SessionProviderStrip.tsx`; `src/app/shell/ProviderRail.tsx`, `ProjectRail.tsx`, `Sidebar.tsx` (`providerPanel`); `src/app/App.tsx` (handlers, `routeRemoteControlEvent`, prepare wiring, delete cleanup); `SessionPane.tsx` (strip); `SettingsView.tsx`, `settings.ts` (search entry); `icons.tsx` (Cloud, RemoteControl); tests beside each new file
- Verified: tsc ✅ tests ✅ (5,414 / 495 files) build ✅ | manual: pending (see frontend spec checklist); compact rail has no provider entry yet
- Commit: see git log for this entry

## 2026-10-04 — Provider conversations, local Claude RC and cloud backend; UI handoff
- What: New isolated branch from original 0.7.0 (`9effbed`). Read-only Claude/Codex discovery, durable native bindings/original cwd and MonoCode-only archive state, strict native continuation, local Claude RC lifecycle/remembered choices, and supported cloud launch/actions with retained IDs. Existing UI is unchanged; a frontend spec names exact APIs, components, placement and error/manual checks.
- Files: `src-tauri/src/provider_sessions.rs`, module tests, `lib.rs`, `session_store.rs`, scanner parser visibility; `src/features/provider-sessions/model/*`; session-store native metadata save; settings/session types and harness core/Claude/Codex adapters/tests; backend/frontend specs, index and L-61–L-63.
- Verified: `npm run check` ✅ (5,365 web tests/488 files; 607 Rust passed/2 ignored; TypeScript/fmt/Clippy); cargo check ✅; production build ✅; host build/full tests ✅ (96 passed/5 skipped after one intermittent effort fixture failure; evidence in backend spec); diff check ✅. Manual: real provider resume, undocumented Claude RC account/phone protocol, cloud launch/actions, future desktop UI wiring. No installer.
- Commit: `67eb8c4028ea87826bcb29ab80cb9a7a174ece7c` (backend/source); documentation checkpoint follows.

## 2026-10-03 — Focus centred in the Task Manager toolbar; glide in the ! prompt picker
- What: The Focus button sits centred in the free space between the filters and the view controls (new `center` toolbar slot). The `!` saved-prompt picker uses the same gliding hover as menus and popovers.
- Files: `src/features/tasks/ui/TasksToolbar.tsx` (`center` slot); `src/features/tasks/ui/TasksView.tsx` (Focus moved); `src/features/prompts/ui/SavedPromptMenu.tsx` (`SharedHoverHighlight`); tests `TasksView.test.ts`, `SavedPrompts.ui.test.ts`
- Verified: tsc ✅ tests ✅ (5,294) | manual: Focus centred at several window widths; hover rows in the `!` picker
- Commit: see git log for this entry
## 2026-10-03 — Task Manager and MCP polish: button-only burst, hover reflow, toolbar alignment, MCP switches
- What: (1) Focus bursts at the button only again. (2) The gliding hover re-measures when its item resizes or moves under a still pointer (a ResizeObserver on the list and the hovered item), moving to the item now under the pointer or hiding, instead of leaving a ghost at the old size. (3) Task toolbar uses `px-3` like the board's `p-3`, so New task and the view switch line up with the columns. (4) Settings → MCP: the flash was `refresh()` setting the page loading state, which replaced the list with "Checking servers…"; switches now flip the row in place with a per-row "Saving…", refresh quietly, revert only that row on error, say On/Off, are labelled Enable/Disable <name>, and dim disabled servers. Settings has one switch, `SettingsToggle` (shared Toggle plus the sound cue); SettingsView's local wrapper is gone.
- Files: `src/features/tasks/ui/TasksView.tsx` (`toggleFocus`), `TasksToolbar.tsx` (`px-3`, `data-tasks-toolbar` removed); `src/shared/ui/CelebrationBurst.tsx` (`spread`/`burstFields` removed); `src/features/sessions/ui/SharedHoverHighlight.tsx` (`resolveSharedHoverReflow`, `reflow`, `setTarget`); `src/features/settings/ui/McpSettings.tsx` (`setEnabled`, `refresh(force, quiet)`, row toggles); `SettingsToggle.tsx` (new), `SettingsView.tsx`; tests `SharedHoverHighlight.reflow.test.ts` (new), `TasksView.test.ts`, `TaskTags.test.ts`, `McpSettings.test.ts`, `SettingsToggle.test.ts` (new)
- Verified: tsc ✅ full web tests ✅ (5,294 / 483 files) build ✅ cargo fmt ✅ cargo test --lib ✅ (599 passed, 2 ignored) | manual: Focus burst at button, board hover after opening the side pane, toolbar edges on List/Table/Board, MCP switch flash/On-Off/muted rows
- Commit: see git log for this entry

## 2026-10-03 — Saved prompts (Settings → Prompts, `!` picker, Add to Prompts)
- What: Cherry-picked `feature/saved-prompts` (6404d02) because a merge pulled six newer upstream commits with conflicts in Sidebar, UsageProviderChip, rateLimits, sessionHistory and PaneTree; merge aborted. Conflicts resolved: Add to Prompts is the 4th selection action; the floating composer shows the `!` picker only in Session mode.
- Files: `src/features/prompts/**` (new); `src-tauri/src/prompts.rs` (new), `lib.rs`, `session_store.rs` (`saved_prompts`); `QuickComposer.tsx` (`promptMenu`, Session mode only); `Composer.tsx`, `SkillPromptField.tsx`, `TranscriptSelectionMenu.tsx`, `SettingsView.tsx`, `SettingsRail.tsx`, `settings.ts`, `App.tsx`, `icons.tsx`; `QuickComposer.modes.test.ts` (2 tests)
- Verified: tsc ✅ targeted tests ✅ (2,064 / 194 files) cargo test prompts:: ✅ (3); full gates re-run after Part B | manual: `!` picker in each composer, Add to Prompts dialog, Settings → Prompts
- Commit: see git log for this entry

## 2026-10-03 — MCP switches and server approval for the current chat
- What: Settings → MCP now reuses the existing switch for configured Claude Code, Codex and OpenCode servers. Native flags preserve config, comments, credentials and CRLF; confirmed discovery controls the displayed state. A separate Allow server for session action covers verified tools from one server in a local chat, alongside existing once/tool-session/deny actions. Other chats/servers and typed forms keep their approval flow; Plan, cancellation, account/folder and native-session boundaries stay guarded. Scope/reload hints and unavailable-provider explanations are shown.
- Files: `src-tauri/src/mcp/controls.rs` (`mcp_set_enabled`, safe config edits); `src-tauri/src/mcp.rs` (`discover`); `src/features/settings/ui/McpSettings.tsx` (switch, errors/cache refresh); `src/shared/ui/Toggle.tsx` (existing switch extracted); `src/integrations/harness/providers/{claude,codex,opencode}/` (verified server grants); approval types/reducer, session storage, transcript and toasts; specs index, L-20/L-59, Windows CRLF learning and behavioral tests.
- Verified: tsc ✅ full web tests ✅ (5,263 / 479 files) fmt/Clippy ✅ Rust tests ✅ (596 passed, 2 ignored) build ✅ host build/tests ✅ (96 passed, 5 skipped) diff check ✅ | manual: native MCP toggles and server approvals in `docs/specs/mcp-controls-plan.md`; no installer built.
- Commit: `647cf0919e77cbbb30c714aa0797525a79ef90ae`

## 2026-10-03 — Task Manager polish: Target focus, focus-day chip, single resize divider; Drafts collapsed
- What: New task keeps the open pane (the task is added locally and Focus/filters are cleared so it cannot be dropped). Columns control removed; Focus moved next to New task and uses a Target icon, with a toolbar-wide celebration. Cards/rows show a focus-day chip (Today, Oct 5, From Oct 2) and the status instead of the project when grouped by Project. Board never scrolls sideways and has no column resize handles (only the side-pane divider). Task menu has icons: Start Work, Status, Copy. Sessions Drafts group is collapsed until the user chooses. Notes and Task title fields no longer lose a trailing space when autosave runs mid-typing (the typed text is kept while focused, trimmed on blur).
- Files: `src/features/tasks/ui/TasksView.tsx` (`create`, `toggleFocus`, toolbar, menus); `TasksToolbar.tsx` (Columns removed, `data-tasks-toolbar`); `TaskBoard.tsx` (no resize, `fit`, status label); `TaskRow.tsx`, `TaskList.tsx`, `TaskTags.tsx` (`TaskFocusChip`, `focusDayChip`, `TaskStatusLabel`); `TaskEditor.tsx` (Target + chip); `taskContextMenu.ts`; `src/features/files/ui/ExplorerMenu.tsx` (item `icon`); `src/shared/ui/board/BoardColumns.tsx` (`fit`); `CelebrationBurst.tsx` (`spread`, `burstFields`); `icons.tsx` (`Target`); `src/features/sessions/model/sessionFolders.ts` (drafts default collapsed); `src/features/notes/ui/NotesView.tsx` (`acceptSaved`, title focus/blur); tests `NotesView.test.ts`, `TasksView.test.ts`, `TaskTags.test.ts` (new), `taskFocusArchive.test.ts`, `sessionFolders.test.ts`
- Verified: tsc ✅ tests ✅ build ✅ | manual: checklist in `docs/specs/task-focus-composer-plan.md`
- Commit: see git log for this entry

## 2026-10-03 — One composer (Task | Session), Drafts group in Sessions list
- What: The floating composer has a Task / Session switch; Task mode saves a task (status, focus day, tags, project); sessions get Save to Draft and Start, Enter starts and Ctrl+Enter starts and opens. Session Manager Add Draft and Task Manager Work on… reuse it without the switch; Work on moves the task to Progress on Start. Prompt is 14px, controls h-7, icons 3.5. Session Manager drafts gather in a Drafts group in the project Sessions list.
- Files: `src/features/quick-composer/ui/QuickComposer.tsx`, `QuickTaskFields.tsx` (new), `model/quickTask.ts` (new); `src/features/session-board/ui/SessionTodoComposer.tsx` (`onStart`); `src/app/App.tsx` (`workOnTask`, composer Start); `src/features/sessions/model/sessionFolders.ts`, `src/app/shell/Sidebar.tsx`, `src/features/sessions/ui/ChatPanel.tsx` (drafts group); `src/shared/ui/icons.tsx` (`Tag`); tests `QuickComposer.modes.test.ts` (new), `sessionFolders.test.ts`
- Verified: tsc ✅ tests ✅ (5,198) cargo 578 ✅ build ✅ npm run check:rust ✅ (fmt, clippy -D warnings, cargo test) | manual: checklist in `docs/specs/task-focus-composer-plan.md`
- Commit: see git log for this entry

## 2026-10-03 — Task Manager: Focus, Archive, task menu, board drag
- What: Focus button with "N/total" and a carry-over chip; Show archived toggle (Deferred becomes archived, Draft becomes Todo, no migration; Completed keeps its name); right-click menu (Work on…, Focus today, Move to, Copy task, Archive, Delete); new tasks are Personal with the cursor in the title; peek header Focus / Copy / Delete; multi-select Status and Project filters; drag board columns and cards; celebrations. Operator uses the same names.
- Files: `src-tauri/src/tasks.rs` (`focus_date`, `archived_at`, `sort_order`); `src-tauri/src/control_cli.rs`; `src/features/tasks/tasks.ts`, `taskViewState.ts`, `ui/TasksView.tsx`, `ui/TaskBoard.tsx`, `ui/taskContextMenu.ts` (new), `ui/TaskEditor.tsx`; `src/shared/ui/SearchableSelect.tsx`, `SegmentedSwitch.tsx` (new), `CelebrationBurst.tsx` (new); `src/features/agent-app/model/agentApp.ts`
- Verified: tsc ✅ tests ✅ cargo test tasks:: ✅ | manual: checklist in `docs/specs/task-focus-composer-plan.md`
- Commit: 346db9b

## 2026-10-03 — Working agreement: upstream-friendly first, branch wording
- What: Upstream-friendly section moved to the top; storage-blocker section and the T3 reference-repo line removed; `nakul/windows-support` described as our main add-on branch with upstream-sync branches fast-forwarded into it; AGENTS.md states the LOCAL-FEATURES and changelog rule up front.
- Files: `docs/WORKING-AGREEMENT.md` (sections reordered and trimmed); `AGENTS.md` (lines 9-11)
- Verified: docs only
- Commit: see git log for this entry

## 2026-10-03 — Docs tidy: spec archive, features index, lighter repo
- What: Done specs moved to `docs/specs/archive/` (25 files, all links updated); two stale Drafts and an unindexed Todo spec marked Done (superseded by the 0.6.0/0.7.0 merges); LOCAL-FEATURES got a one-line-per-feature Index; generated intake JSON (2.9 MB) and a 3.9 MB screenshot removed from the branch with restore notes (`docs/` 9.1 MB → 2.6 MB); PLANNED.md opens with the current state.
- Files: `docs/specs/SPECS.md` (archive links, rows); `docs/specs/archive/*` (moved); `docs/LOCAL-FEATURES.md` (Index); `docs/notes/upstream-intake-2026-10-01/scripts/README.md` (new, restore command); `docs/notes/README.md`; `docs/PLANNED.md` (lines 6-14, old handoff moved to the end); `AGENTS.md` (docs map rows)
- Verified: docs only; relative-link check shows no new broken links (22 pre-existing: uncommitted build logs and repo-root-style paths in the intake notes)
- Commit: see git log for this entry

## 2026-10-03 — Lighter docs process, docs map and local-features catch-up
- What: Rules rewritten for task tiers (Small/Medium/Large), test tiers, one record per change and no worktree or installer per feature; the long pre-read list was replaced by a docs map in AGENTS.md. Windows log got an index; changelog rolled over to this file; 15 local features registered.
- Files: `AGENTS.md` (docs map); `docs/WORKING-AGREEMENT.md` (rewritten, all rules kept); `docs/WINDOWS-CHANGES.md` (index at top); `docs/changelog/CHANGELOG.md` (index, 40 KB rollover); `docs/LOCAL-FEATURES.md` (L-02 updated, L-41–L-55 added); `docs/specs/SPECS.md` (Tasks views row, ordering rule).
- Verified: docs only; no code changed | manual: none
- Commit: see git log for this entry

## 2026-10-03 — Project sidebar session cards glide
- What: The project Sessions list used its own card without the shared-hover marker, so it never glided (a recorded performance log showed zero hover events there). Cards are now glide items; state fills are kept. Overlay wording for resting card tints clarified.
- Files: `src/app/shell/Sidebar.tsx` (session card, `data-shared-hover-item`, removed instant hover fill); `src/shared/debug/PerfOverlay.tsx`, `src/shared/debug/perfRecorder.ts` (own-background wording); `src/app/shell/SidebarRename.test.ts` (new test)
- Verified: tsc ✅ tests ✅ (5,180) build ✅ | manual: hover the project Sessions list
- Commit: 9ed1c50

## 2026-10-03 — Speed pill, full-row selected model, one board edge
- What: Output speed (Fast or service tier) is its own one-click pill beside Effort; the selected model fills its whole row; the last board column has no resize handle so only one draggable line sits beside a side pane.
- Files: `src/features/sessions/ui/ModelPicker.tsx` (`SpeedPill`, `isSpeedSetting`, `data-model-row`); `src/styles/index.css` (selected row fill); `src/shared/ui/board/BoardColumns.tsx` (last handle hidden); `ModelPicker.test.ts`
- Verified: tsc ✅ tests ✅ (5,179) build ✅ | manual: done by Nakul ✅
- Commit: 3f4f86a

## 2026-10-03 — Board counts, log recording, sliding panes, 2×2 board
- What: Session Manager sidebar entry shows coloured In progress / Needs attention / Done counts; the performance overlay records and saves a Markdown log; Session and Task Manager side panes slide in and out; the Session Manager board reflows to 2×2 when narrow; model picker rows glide as whole rows.
- Files: `src/features/session-board/useBoardCounts.ts`, `ui/BoardCountPills.tsx`; `src/app/shell/ProjectRail.tsx` (`SessionManagerRailAction`), `RailAction.tsx` (`trailing`); `src/shared/debug/perfRecorder.ts`; `src/shared/hooks/usePresence.ts`; `src/shared/ui/board/BoardColumns.tsx` (`boardColumnsPerRow`, wrap); `SessionBoardView.tsx`, `TasksView.tsx`, `TaskPeekPane.tsx`; `ModelPicker.tsx`
- Verified: tsc ✅ tests ✅ (5,179) build ✅ | manual: done by Nakul ✅
- Commit: cbe08b2

## 2026-10-03 — Performance overlay
- What: View: Toggle Performance Overlay (Ctrl+Alt+Shift+P): FPS, stutters, long tasks and hover glide/snap/hide with the reason a glide ended. No cost while closed.
- Files: `src/shared/debug/perfDebug.ts`, `PerfOverlay.tsx`; `src/features/sessions/ui/SharedHoverHighlight.tsx` (reports); `src/features/settings/model/settings.ts` (keybinding); `src/app/shell/MenuBar.tsx` (menu item); `src/main.tsx` (mount)
- Verified: tsc ✅ tests ✅ (5,175) build ✅
- Commit: 4fae052

## 2026-10-02 — Session Manager fit and clean labels (0.7.0 branch)
- What: A saved column width shrinks to fit instead of overflowing; cards show the session list title (no provider prefix) and the model display name.
- Files: `src/shared/ui/board/BoardColumns.tsx` (flex-basis + shrink); `src/features/session-board/ui/BoardSessionCard.tsx` (`boardModelLabel`)
- Verified: tsc ✅ tests ✅ (5,171) build ✅
- Commit: e192f2d

## 2026-10-02 — Session Manager four columns, compact cards, menu bar toggle
- What: Columns Draft / In progress / Needs attention / Done with reason tags (stored statuses unchanged for Operator); new 3-line card with a 4th reason line and 2-line finished cards; buttons renamed to "Add Draft to Sessions" and "Add Task"; Alt+O toggles the menu bar.
- Files: `src/features/session-board/sessionBoard.ts` (`boardLane`, `boardCardTag`, `isBoardStatus`); `ui/BoardSessionCard.tsx` (new); `ui/SessionBoardView.tsx`; `src/features/agent-app/model/agentApp.ts`; `src-tauri/src/control_cli.rs` (help text); `src/app/shell/MenuBar.tsx`; `src/features/settings/model/settings.ts`
- Verified: tsc ✅ tests ✅ (5,091) build ✅ | Rust help text not compiled here
- Commit: b6ad68b

## 2026-10-02 — Session board observer no longer re-reads every transcript
- What: The background tracker re-projected every session each 150 ms pass while sessions loaded or streamed (startup lag, WebView2 CPU spikes). It now skips unchanged sessions; about 46 ms → 0.18 ms per pass in a 300-session test.
- Files: `src/features/session-board/sessionBoard.ts` (`observeBoardSessions`, `boardRunId`); `sessionBoard.test.ts`
- Verified: tsc ✅ tests ✅ (5,083) build ✅
- Commit: 3cf8be9

## 2026-10-02 — Gliding hover everywhere, surfaces follow menu settings
- What: Glide continuity in the rail, Notes, Automations, Task and Session Manager (whole card); costly per-card blur removed; board surfaces use the Menu surface tint and backdrop blur.
- Files: `src/app/shell/ProjectRail.tsx`, `SettingsRail.tsx`, `MenuBar.tsx` (continuity); `src/features/automations/ui/AutomationsView.tsx`; `src/features/session-board/ui/SessionBoardView.tsx`; `src/styles/index.css` (`surface-tint`, `surface-blur`)
- Verified: tsc ✅ tests ✅ build ✅
- Commit: 0244e71, a07c7af

## 2026-10-02 — Glass Quick Composer, icon-only table actions, new reply footer
- What: Quick Composer (global and in-app) uses transparent glass; table actions are icons plus Add to Session Manager; reply header shows only the model, footer holds actions and "Ran for X · time".
- Files: `src/features/quick-composer/main.tsx`, `ui/QuickComposer.tsx`, `ui/QuickGitPopup.tsx`; `src/features/sessions/ui/MarkdownTable.tsx`; `src/features/sessions/ui/AgentTranscript.tsx` (`TurnDuration`)
- Verified: tsc ✅ tests ✅ build ✅
- Commit: 8d4d3c6

## 2026-10-02 — Task Manager views (List / Table / Board) and task tabs
- What: Tasks rebuilt as List (default), Table and Board with a peek pane; open a task beside the session as a workspace tab; group by project; resizable columns; counts in headers, filters and menus; toolbar row with New task first and the view switch on the right.
- Files: `src/features/tasks/ui/*` (TasksView, TaskList, TaskTable, TaskBoard, TaskPeekPane…); `src/features/tasks/taskViewState.ts`, `taskFacets.ts`; `src/shared/ui/board/BoardColumns.tsx`, `ResizeHandle.tsx`, `ResultCount.tsx`; `src/features/workspace/model/layout.ts`, `workspaceSnapshot.ts`; `src/app/App.tsx`
- Verified: tsc ✅ tests ✅ build ✅ | spec: `docs/specs/archive/tasks-views-redesign.md`
- Commit: e6cd476, 246641f, b5bec1a, ad90d9f, c772e75, aa521d1, d82ecdc, fbb6fcc, 9ebb676, 11c5464, 2990ad0

## 2026-10-02 — Session Manager drafts runnable, Operator control (other agent)
- What: Unsent session drafts prepared with the Quick Composer, edited and started from the board or Operator `session_manager.*`; navigation renamed to Task Manager / Session Manager; duplicate session icons and false historical Blocked cards fixed.
- Files: `src/features/session-board/sessionTodos.ts`, `ui/SessionTodoComposer.tsx`, `ui/SessionManagerCapture.tsx`; `src/features/agent-app/model/agentApp.ts`; `src-tauri/src/control_cli.rs`
- Verified: per commit message (4,980 web tests, Rust fmt/clippy/574 tests)
- Commit: a87a5f7, 8c3ca2e

## 2026-10-02 — Session board, tab-opening preferences, Windows Quick Composer (other agent)
- What: Persistent session board across restarts; separate file/session tab-opening preferences; Quick Composer on Windows with a global shortcut; ACP launch identity fix; live board updates and project filters restored.
- Files: `src/features/session-board/*`, `src-tauri/src/session_board.rs`; `src/features/settings/model/openingBehavior.ts`; `src-tauri/src/quick_composer.rs`, `src/features/quick-composer/model/quickComposerShortcut.ts`; `src/integrations/harness/core/child.ts`
- Verified: per commit messages (4,927–4,946 web tests, Rust checks, host tests)
- Commit: a0b440c, bee3eea, 983d195

## 2026-10-02 — Persistent Tasks, table actions, Haze, queue holds (other agent)
- What: Tasks with statuses, tags, filters and Operator actions; Copy Markdown; table Copy and Add to Note; Wallpaper Haze; compact model labels experiment; queue holds persisted independently of quota notices; old Tasks tables upgraded at startup.
- Files: `src/features/tasks/tasks.ts`, `src-tauri/src/tasks.rs`; `src/features/sessions/ui/MarkdownCopyButton.tsx`, `MarkdownTable.tsx`; `src/features/settings/model/wallpaperHaze.ts`; `src/features/sessions/model/messageQueue.ts`
- Verified: per commit messages (4,860 web tests, host tests)
- Commit: 5e06791, f4aa072, 91b12ca

## 2026-10-02 — Upstream MonoCode 0.7.0 merged
- What: Upstream main through `6bd432c` (0.7.0 plus its docs commit) merged into the Windows line. Kept: Tasks and Session board, Windows terminal replay and lazy startup, provider discovery, appearance, remaining-usage and email-masking defaults. Combined terminal teardown ordering; Explorer reveal keeps hidden launches and fixes paths with spaces. Version `0.7.0-local1-upstream-sync`.
- Files: merge commit; see `git show --stat 3113550`
- Verified: per merge message (5,160 web tests, TypeScript, build, 96 host tests, Rust fmt/clippy/575 tests) | manual: Windows-native build and smoke checks
- Commit: 3113550 (later syncs: ca3c6ad, 023318e)

## 2026-10-02 — Tasks views work synced with upstream-branch fixes
- What: The Tasks views branch took in the live Kanban fix, Session Manager Todos and session board fixes from the 0.6.0 integration branch.
- Files: merge commits only
- Verified: full web suite and TypeScript at each merge
- Commit: 72bd770, 656a6c1, ec385c7

## 2026-10-01 — Upstream MonoCode 0.6.0 merged
- What: Upstream main through `1e97594` (v0.6.0 plus ten commits) merged, keeping both histories. Kept: shared Antigravity ACP runtime and Google sign-in, Cline, Windows discovery/console/appearance, durable queue and steer, provider forks and hot switching, helper isolation, quota/context details, CRLF and deleted-file handling. Upstream remote-host support adapted to the shared ACP runtime and Cline; SQLite migrations combined.
- Files: merge commit; see `git show --stat 9dcc239`
- Verified: per merge message (full web suite, TypeScript, build, host tests, Rust fmt/clippy/tests, Windows GNU cross-compile) | manual: native desktop and installer checks
- Commit: 9dcc239
