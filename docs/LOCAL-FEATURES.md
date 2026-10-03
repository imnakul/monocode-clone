# Local features — what this fork has that upstream MonoCode does not

**Last updated: 2026-10-03**

Original register checked against our branch `nakul/windows-support` at `c2c8bf6` and upstream `main` at `43aac9d`.
L-39 updated for the 0.6.0 build at `18ab934` (version changes uncommitted).
2026-10-03: re-checked against `nakul/windows-support-upstream-0.7.0` at `066beb0` and upstream `main` at `6bd432c`
(0.7.0; our branch contains all of it plus 161 fork commits). L-02 updated; L-41 to L-55 added from the 31 fork-only
commits after `c2c8bf6`. No earlier row was found adopted upstream.

## Index (read this, then search for the ID, e.g. `grep -n "| L-43 |"`)

| ID | Feature | Area | Windows only |
|---|---|---|---|
| L-01 | Stop stays visible while busy; send becomes Queue/Steer | composer | No |
| L-02 | Menu bar visible by default; Alt+O toggles it | shell | No |
| L-03 | Antigravity via Google's shared ACP runtime | providers | No |
| L-04 | Cline provider | providers | No |
| L-05 | Queued messages survive restart | queue | No |
| L-06 | Held/paused/steering queue never auto-sends | queue | No |
| L-07 | Removing a chat drops its queue and terminals | sessions, terminal | No |
| L-08 | Terminals start lazily | terminal, startup | No |
| L-09 | Wallpaper with effects; Wallpaper & menus settings | appearance | Yes |
| L-10 | Sliding hover highlight in menus and lists | hover | No |
| L-11 | One shared token/cost calculation | usage | No |
| L-12 | Usage footer can show % left | usage | No |
| L-13 | No console flash; child processes tied to the app (Windows) | windows, process | Yes |
| L-14 | ConPTY terminal with stalled-output replay (Windows) | windows, terminal | Yes |
| L-15 | Reveal in Explorer without false error or console | windows, files | Yes |
| L-16 | Import and resume provider CLI conversations | sessions, import | No |
| L-17 | Settings → Skills page | skills | No |
| L-18 | Honest provider errors and CLI update notice | providers | No |
| L-19 | Model choice for commit and PR text | git, AI helper | No |
| L-20 | Allow for session on approval prompts | approvals | No |
| L-21 | Session grants never auto-answer in Plan mode or after stop | approvals | No |
| L-22 | Live model/permission switch for running Claude chats | providers, Claude | No |
| L-23 | Typed forms for Codex MCP input | providers, MCP | No |
| L-24 | Context meter uses provider numbers | usage, context | No |
| L-25 | Branch uses provider's native fork | sessions | No |
| L-26 | Sidechat | sessions | No |
| L-27 | CRLF kept in editor and partial staging | windows, editor, git | No |
| L-28 | Human-typed messages marked for Claude | providers, Claude | No |
| L-29 | Busy-chat keyboard: Enter / Ctrl+Enter / Shift+Enter | composer | No |
| L-30 | Settings → Experimentation page | settings | No |
| L-31 | Source Control full-row diff, deleted files open | git | No |
| L-32 | Providers page shows Checking providers… | providers | No |
| L-33 | Model lists keep the newest model | providers, models | No |
| L-34 | Repair legacy e%3A project paths | windows, projects | Yes |
| L-35 | Tab strip edge fade | shell, tabs | No |
| L-36 | Compact rail uses the sliding highlight | hover, shell | No |
| L-37 | Acrylic window glass strength and font choices | windows, appearance | Glass: |
| L-38 | .cmd/.bat provider launchers found and started | windows, providers | Yes |
| L-39 | NSIS installer build and local versioning | windows, build | Yes |
| L-40 | Antigravity temp files under ~/.monocode; Downloads lookup | windows, providers | Yes |
| L-41 | Task Manager (tasks, filters, Operator tasks.*, Copy Markdown) | tasks | No |
| L-42 | Task Manager views: List/Table/Board, peek pane, task tabs | tasks | No |
| L-43 | Session Manager: 4 columns, tags, 2×2, sidebar counts | session manager | No |
| L-44 | Session Manager drafts and Operator session_manager.* | session manager | No |
| L-45 | File/session tab-opening preferences | settings, tabs | No |
| L-46 | Quick Composer on Windows, global shortcut, glass | windows, composer | Yes |
| L-47 | Markdown table icon actions | transcript | No |
| L-48 | Wallpaper Haze effect | appearance | No |
| L-49 | Compact model labels experiment | sessions | No |
| L-50 | Queue holds independent of quota notice | queue | No |
| L-51 | Reply header/footer layout | transcript | No |
| L-52 | Gliding hover in Notes, Automations, managers, project Sessions | hover | No |
| L-53 | Performance overlay and log recording | debug | No |
| L-54 | Speed pill beside Effort | composer, models | No |
| L-55 | Model picker full-row hover and selected fill | models, hover | No |

## For agents — read this first

**What this file is for.** It lists every behaviour this fork adds or changes compared with upstream MonoCode.
Read it instead of exploring the codebase to find out what is different. Use it when you take in upstream
changes (these behaviours must survive), when you plan a feature (it may already exist here) and when you
review a change (it must not remove one of these by accident).

**How to read a row.**
- *Where it lives* names a file and a function or symbol, not a line number. Line numbers move; search for the
  symbol.
- *Test that locks it* is a test that fails if the behaviour is removed. "No locking test exists" means nothing
  automatic protects the behaviour, so check the source by hand after any merge or refactor that touches it.
- *Source* is the decision or record behind it. "NOTES §0" is the list of standing product calls in
  `docs/NOTES.md`; those are decided and are not reopened.

**How to update this file.** Do this in the same task that adds, changes or removes a local feature.
1. **New feature:** append one row at the end of the register table with the next free ID, and a one-line row in the Index above. Use the same seven columns
   in the same order. Do not insert a row in the middle and do not renumber.
2. **Changed feature:** edit only that row's cells. Keep its ID.
3. **Removed feature, or one that upstream now ships:** keep the row. Change only its *Status* cell, for
   example `Removed 2026-11-03 (reason)` or `Now upstream since v0.7.0`. Never delete a row; other notes and
   specs refer to the IDs.
4. Fill *Where it lives* by following the code from the user action to the function that does the work. Do not
   copy the list of files a commit touched. One to three locations.
5. Name a test only if it would fail when the behaviour is removed. Otherwise write "No locking test exists".
6. Change the **Last updated** date at the top to the day of your edit, and the commit in the line under it.
7. Leave everything else in this file as it is.

## The register

| ID | Feature in plain words | Where it lives (file → symbol) | Test that locks it | Source | Windows only | Status |
|---|---|---|---|---|---|---|
| L-01 | While a chat is busy, Stop stays visible as its own button, and the send button becomes Queue or Steer | `src/features/sessions/ui/composerAction.ts` → `resolveComposerButtonAction`, `resolveComposerActionTooltip`; used by `src/features/sessions/ui/Composer.tsx` | `src/features/sessions/ui/Composer.test.ts` → "keeps Stop visible and labels send with the follow-up action" | NOTES §0.1 | No | Active |
| L-02 | The menu bar is visible by default on Windows and Linux; View: Toggle Menu Bar (Alt+O, rebindable, also View → Hide Menu Bar) hides or restores it and the choice is remembered. Upstream hides it until Alt is tapped | `src/app/shell/MenuBar.tsx` → `MenuBar` (`toggleVisible`, `loadMenuBarVisible`); `src/features/settings/model/settings.ts` → `MENU_BAR_TOGGLE_COMMAND` | `src/app/shell/MenuBar.test.ts` → "hides and restores the menu bar with Alt+O and remembers the choice" | NOTES §0.2; changed 2026-10-02 at Nakul's request | No (not shown on macOS) | Active |
| L-03 | Antigravity runs through Google's official ACP runtime, shared between chats. Upstream's own Antigravity provider is deleted here | `src/integrations/harness/core/antigravityRuntimeHost.ts` → `acquireAntigravityRuntime`; `src-tauri/src/antigravity_acp.rs`; `src-tauri/src/harness.rs` → `resolve_antigravity_acp` | `src/integrations/harness/core/antigravityAcpLive.test.ts` (whole suite) | NOTES §0.3; `docs/notes/antigravity-acp-implementation-notes.md` | No | Active |
| L-04 | Cline is the eleventh provider | `src/features/sessions/model/session.ts` → `HarnessId` includes `"cline"`; `src/integrations/harness/core/cline.ts`, `clineAdapter.ts`, `clineCatalog.ts`; `src-tauri/src/harness.rs` → `harness_resolve_cline` | `src/integrations/harness/core/clineLive.test.ts`, `clineProtocol.test.ts`; `src/features/sessions/ui/ModelPicker.test.ts` expects the 440px / 442 flyout height that eleven tabs need | NOTES §0.4 | No | Active |
| L-05 | Queued messages and their attachments are saved and come back after a restart | `src/features/sessions/model/queueDurability.ts` → `QueueDurabilityScheduler`; `src/features/sessions/data/sessionStore.ts` → `queuePersistFingerprint`; queue columns in `src-tauri/src/session_store.rs` | `src/features/sessions/model/queueDurability.test.ts` → "preserves a pasted image payload through save and restore" | NOTES §0.5 | No | Active |
| L-06 | A queue that is held, paused or being steered never sends by itself; cancelling a Steer is settled before the next message goes | `src/features/sessions/model/messageQueue.ts` → `canDispatchQueuedHead`, `settleQueuedSteerCancellations`, `orchestrateTurnCompletion` | `src/features/sessions/model/messageQueue.test.ts` → the "orchestrateTurnCompletion (production-used orchestration, Defect 2)" group and the `settleQueuedSteerCancellations` cases | NOTES §0.5 | No | Active |
| L-07 | Removing a chat also drops its saved queue and closes the terminals that disappear with it | `src/app/App.tsx` (session-removal wiring) → `disappearedTerminalIds` from `src/features/workspace/model/terminalPanes.ts`, then `forgetTerminal` | `src/features/workspace/model/terminalPanes.test.ts` and `src/features/sessions/model/sessionRemoval.test.ts` test the helpers. The call in `App.tsx` itself: no locking test exists | NOTES §0.5 | No | Active |
| L-08 | Terminals do not start at launch. A restored terminal stays dormant until it is opened, and is released on close | `src/features/sessions/model/terminalLifecycle.ts` → `requestTerminalStart`, `startTerminal`, `forgetTerminal`; `src/features/terminal/ui/TerminalView.tsx` | `src/features/sessions/ui/TerminalView.test.ts` → "restores visible terminals dormant with zero spawns"; `src/features/sessions/ui/terminalSurfaceParity.test.ts` | NOTES §0.6 | No | Active |
| L-09 | Wallpaper behind the app with five effects (None, Dither, ASCII, Halftone, Scanlines), in a "Wallpaper & menus" settings group. Works in the installed app | `src/features/settings/model/appearance.ts` → `applyWallpaperPath` (keys `monocode.wallpaperEffect`, legacy `monocode.wallpaperHalftone`); settings group in `src/features/settings/ui/SettingsView.tsx` | `src/features/settings/model/appearance.wallpaper.test.ts`; `src/features/settings/model/newThreadBackgroundEffects.test.ts` → "allows wallpaper blob URLs to be read under both Tauri CSPs" | NOTES §0.7 | Yes (`applyWallpaperPath` returns early unless Windows) | Active |
| L-10 | One highlight slides between hovered rows in menus and lists. In popovers the glass layer sits on the fixed frame so the highlight is not blurred away | `src/shared/ui/Popover.tsx` (frame carries `popover-surface`, renders `SharedHoverHighlight`); rows opt in with `data-shared-hover-item` and `data-shared-hover-continuity` | `src/shared/ui/Popover.hover.test.ts` → "paints the marker between the frame wash and the transparent content layer"; `src/shared/ui/SharedHoverHighlight.test.ts` | NOTES §0.8 | No | Active |
| L-11 | Token and cost figures come from one shared calculation per turn and per chat | `src/features/sessions/model/tokenAccounting.ts` → `latestTurnProcessedUsage`, `sessionProcessedUsage`; `src/features/sessions/model/tokenCosting.ts` | `src/features/sessions/model/tokenAccounting.test.ts`; `src/features/sessions/model/tokenCosting.test.ts` | NOTES §0.9 | No | Active |
| L-12 | The usage footer can show the percentage left instead of the percentage used | `src/features/providers/model/rateLimits.ts` → `formatQuotaPercent`, `formatRemainingPercent`; `src/app/shell/UsageFooter.tsx` passes `remainingQuota` | `src/features/providers/model/rateLimits.test.ts` → "formats as clamped inverse percent left when remainingQuota is true (ON)" | NOTES §0.9; commit `122ba13` | No | Active |
| L-13 | On Windows, helper programs (git, gh, provider probes) run without a console window flashing, and child processes are tied to the app so they close with it | `src-tauri/src/harness.rs` → helper commands set `CREATE_NO_WINDOW`; `src-tauri/src/windows.rs` → `managed_job` (job object) | `src-tauri/src/windows.rs` → `pty_rejects_an_invalid_job_without_unprotected_fallback`. "No console window appears": no locking test exists | NOTES §0.10; `docs/WORKING-AGREEMENT.md` Windows rules | Yes | Active |
| L-14 | The Windows terminal uses ConPTY, and output that stalled is replayed when the view reconnects | `src-tauri/src/pty.rs` → `spawn_windows` and the replay buffer | `src-tauri/src/pty.rs` → `conpty_spawns_shell_and_echoes`, `replay_returns_bytes_past_offset` | NOTES §0.10; commits `7e02029`, `437cd34` | Yes | Active |
| L-15 | "Reveal in Explorer" opens without a false error and without a console window. Its tests do not open Explorer | `src-tauri/src/fs.rs` → `reveal_path`, `reveal_arg` | `src-tauri/src/fs.rs` → `reveal_dispatch_treats_a_spawned_child_as_success_whatever_its_exit_code`, `reveal_path_rejects_missing_path` | Commit `a8e43b8`; `docs/WINDOWS-CHANGES.md` 24 Sept | Yes | Active |
| L-16 | Existing conversations from the provider CLIs (Claude, Codex, OpenCode, Z Code, Antigravity, Cline) can be imported, then resumed or replayed | `src-tauri/src/session_import.rs` → `scan_external_sessions`, `read_external_transcript`; `src/integrations/harness/core/sessionImport.ts` → `createNativeResumeSession`, `canReplay` | `src/integrations/harness/core/sessionImport.test.ts`; `src-tauri/src/session_import/tests.rs` | Commit `f00cf72` and follow-ups | No | Active |
| L-17 | Settings has a Skills page: list, filter, rescan, switch a skill on or off, copy path, reveal. It has no "run an install command" box (that box caused a Defender false alarm and was removed) | `src-tauri/src/skills.rs` → `list_skills`; `src/features/skills/model/skills.ts` | `src-tauri/src/skills.rs` tests cover discovery. "The command runner stays absent": no locking test exists (`run_skill_import` must not come back) | Commit `7af1091`; `docs/WINDOWS-CHANGES.md` 6 Sept | No | Active |
| L-18 | When a provider cannot be found or its model list fails, the real reason is shown with a retry hint. An outdated CLI shows one notice with the update command and a Copy button | `src/integrations/harness/core/availability.ts` → `noteHarnessEvidence`, `harnessUnavailableHint`; `src/features/settings/ui/UpdateToasts.tsx` → `UpdateToasts` | `src/integrations/harness/core/availability.test.ts` → "keeps the real diagnostic when catalog discovery fails"; `src/features/settings/ui/UpdateToasts.test.ts` → "shows the update command with its version delta and copies it" | Commit `d5ca807`; `docs/WINDOWS-CHANGES.md` 24 Sept | No | Active |
| L-19 | A setting chooses which model writes commit messages and PR text, with a main choice and a fallback | `src/features/settings/model/settings.ts` → `parseAiHelperSettings` (key `monocode.aiHelper`); `src/integrations/harness/core/helperPipeline.ts` | `src/integrations/harness/core/helperPipeline.test.ts` → "uses the fallback once after two invalid primary replies" | Spec `ai-helper-model-settings` (Done) | No | Active |
| L-20 | Approval prompts for Claude and Codex offer "Allow for session" | `src/integrations/harness/providers/codex/codex.ts` (approval reply: `sessionGrant`); `src/integrations/harness/providers/claude/claude.ts` → `sessionGrantsByThread`; `src/features/sessions/ui/ApprovalToasts.tsx` | `src/features/sessions/ui/ApprovalToasts.test.ts` → "shows and forwards Allow for session only when the notice has a hint"; `src/integrations/harness/providers/codex/codexLive.test.ts` → "replays an MCP session grant after a Codex restart and prompts for other tools" | Spec `session-approval-scopes` (Done) | No | Active |
| L-21 | A session grant never answers a prompt by itself in Plan mode, or after the chat was stopped or replaced | `src/integrations/harness/providers/codex/codex.ts` (the `live.planning`, `live.cancelled`, `live.muteUpdates` guard before a grant is stored or reused); `claude.ts` drops the grant when the folder or account changes | `src/integrations/harness/providers/codex/codexLive.test.ts` → "does not reuse a stored MCP grant during a Plan turn", "does not save a Codex session grant when the session stops during the response write" | Spec `provider-batch-followup-fixes` (Done); commit `0a27328` | No | Active |
| L-22 | Changing the model or permission mode of a running Claude chat takes effect in that chat without a restart | `src/integrations/harness/providers/claude/claude.ts` (live steps send `buildSetPermissionModeRequest` and `buildSetModelRequest` from `claudeProtocol.ts`) | `src/integrations/harness/providers/claude/claudeLive.test.ts` → "waits for the matching model response before sending the next user message"; `claudeProtocol.test.ts` → "sends permission mode before the model when both can change live" | Spec `claude-live-controls` (Done) | No | Active |
| L-23 | When a Codex MCP tool asks for input, a typed form is shown with validation | `src/features/sessions/ui/McpForm.tsx` → `McpForm`; `src/features/sessions/model/mcpForm.ts`; `src/integrations/harness/providers/codex/codexElicitation.ts` | `src/features/sessions/model/mcpForm.test.ts`; `src/features/sessions/ui/McpForm.test.ts` → "submits valid values once even if Submit is clicked twice" | Spec `codex-mcp-forms` (Done; never tried against a real MCP server) | No | Active |
| L-24 | The context meter shows the provider's own numbers for Claude and Codex and marks estimates as estimates | `src/features/sessions/model/contextBreakdown.ts` → `nativeSegments`; `src/features/sessions/ui/ContextMeter.tsx` | `src/features/sessions/model/contextBreakdown.test.ts`; `src/features/sessions/ui/contextMeterNative.test.ts` → "shows estimates and size not reported on unavailable inspection" | Spec `context-accuracy` (Done) | No | Active |
| L-25 | Branch uses the provider's own fork where it exists, and says so when it falls back to a summary | `src/features/sessions/model/branchPlan.ts` → `planBranch`, `convertToPrefixSummary`; `src/features/sessions/model/fork.ts` | `src/features/sessions/model/branchPlan.test.ts`; `src/features/sessions/ui/branchFlow.test.ts` | Specs `native-branch` and follow-ups (Done); commit `4423fd8` | No | Active |
| L-26 | Sidechat: a temporary side conversation opened from a chat, carrying that chat's context | `src/app/App.tsx` → `onSidechat`; `src/features/sessions/model/fork.ts` → `sidechatContextBlock`, `sidechatTitle`; `src/features/sessions/ui/SessionPane.tsx` → `askSidechat` | `src/features/sessions/model/fork.test.ts` → "sidechat" group tests the title and context. The button wiring: no locking test exists | Merge records in `docs/notes/archive/` (23 and 24 Sept) | No | Active |
| L-27 | Files with Windows line endings keep them in the editor and when staging parts of a file | `src/features/sessions/model/lineEndings.ts` → `detectLineEnding`, `encodeLineEndings`, `hasSameLogicalText`; `src-tauri/src/fs.rs` → `git_stage_contents_for` | `src/features/sessions/model/lineEndings.test.ts` → "prevents CRCRLF across repeated encode boundaries"; `src-tauri/src/fs.rs` → `git_stage_contents_applies_gitattributes_clean_filter` | Commit `0b9122a` | No | Active |
| L-28 | Messages the user typed are marked as human for Claude; messages the app sends on its own are not | `src/integrations/harness/providers/claude/claudeProtocol.ts` → `buildClaudeUserMessage` (`humanAuthored`); `src/app/App.tsx` passes `humanAuthored: !options?.managed` | `src/integrations/harness/providers/claude/claudeProtocol.test.ts` tests the message shape. The value passed from `App.tsx`: no locking test exists | `docs/notes/orchestration-parking-30sept.md` (code kept) | No | Active |
| L-29 | Keyboard in a busy chat: Enter does the default follow-up, Ctrl/Cmd+Enter does the other one (Queue or Steer), Shift+Enter is always a new line | `src/features/sessions/ui/composerAction.ts` → `resolveComposerKeyAction`, `resolveEffectiveSuggestionAction` | `src/features/sessions/ui/composerAction.test.ts` | Commit `730c428` | No | Active |
| L-30 | Settings has an Experimentation page with two switches, both off by default: the detailed context inspector, and "show remaining quota" | `src/features/settings/ui/SettingsView.tsx` (section `experimentation`); `src/app/shell/SettingsRail.tsx` | `src/features/sessions/ui/Experimentation.test.ts` → "defaults both switches to OFF and exposes switch semantics" | Commit `3ce90b0` | No | Active |
| L-31 | In Source Control, clicking anywhere on a row opens its diff, and a deleted file opens a diff too | `src/features/workspace/model/layout.ts` → `newGitDiffTab`; `src/features/sessions/ui/diffPathMatching.ts` → `isMatchingDiffPath`; `src/features/sessions/ui/filePaneSelection.ts` → `selectPaneSurface` | `src/features/sessions/ui/FilePane.test.ts`; `src/features/sessions/ui/WorkingTreeDiff.test.ts` | Commit `55ebb97` | No | Active |
| L-32 | The Providers page shows "Checking providers…" and keeps Recheck disabled until the first discovery finishes | Providers page in `src/features/settings/ui/SettingsView.tsx` | `src/features/sessions/ui/ProvidersPage.test.ts` → "keeps every Recheck disabled until both availability and catalogs settle", "releases Recheck when an initial discovery request fails" | `docs/WINDOWS-CHANGES.md` 23 Sept | No | Active |
| L-33 | Model lists keep the newest model: Claude's "default" row is resolved to the model behind it, and Codex paging accepts both spellings of the next-page field | `src/integrations/harness/providers/claude/claudeCatalog.ts` (`resolvedModel` handling); `src/integrations/harness/providers/codex/codexCatalog.ts` → `codexModelPage` | `src/integrations/harness/providers/codex/codexProtocol.test.ts` → "codexModelPage" group; Claude default-slot cases in `claudeProtocol.test.ts` | `docs/WINDOWS-CHANGES.md` 23 Sept | No | Active |
| L-34 | Old saved project paths written as `e%3A/...` are repaired, so the same project is not listed twice | `src/features/sessions/model/legacyProjectPath.ts` → `repairLegacyEncodedDriveColon` | `src/features/sessions/model/legacyProjectPath.test.ts` | Commit `e90eceb` | Yes | Active |
| L-35 | The tab strip fades at an edge where more tabs are hidden | `src/app/shell/TitleBar.tsx` → `tabStripFadeMask`, `tabStripOverflow` | `src/app/shell/TitleBar.test.ts` → "tabStripOverflow" group tests which edges overflow. The fade styling: no locking test exists | `docs/WINDOWS-CHANGES.md` (reveal fix and tab-strip fade) | No | Active |
| L-36 | The narrow project rail uses the same sliding highlight as the rest of the app | `src/app/shell/ProjectRail.tsx` and `src/app/shell/RailAction.tsx` (`data-shared-hover-item`) | `src/app/shell/SidebarRename.test.ts` expects exactly one highlight inside `[data-compact-project-rail]` | Commit `4a57b56` | No | Active |
| L-37 | Windows look: acrylic window glass with an adjustable strength, and a choice of interface and terminal fonts | `src/features/settings/model/appearance.ts` → `applyWindowGlassStrength`, `applyUiFont`, `applyTerminalFont`; `src-tauri/src/window.rs` | Not checked (`src/features/settings/model/appearance.test.ts` exists; which case locks this was not confirmed) | Commits `43381fc`, `b08dfca`, `49eb636` | Glass: yes. Fonts: no | Active |
| L-38 | On Windows, provider CLIs installed as `.cmd` or `.bat` launchers (npm, pnpm) are found and started correctly | `src-tauri/src/harness.rs` → `windows_launcher_kind`, `windows_command_candidates`, `resolve_requested_binary` | `src-tauri/src/harness.rs` → `classifies_launchers`, `command_candidates_expand_bare_names_and_keep_shims`, `new_provider_command_routes_shims_through_shell` | Commits `f894c6e`, `80faf07`, `dbe21cf` | Yes | Active |
| L-39 | Windows installer build: `npm run build:windows` makes an NSIS installer; archiving is a separate step in the current script. Local builds normally use `<base>-localN-<feature>`. Nakul explicitly selected plain `0.6.0` on 2 Oct 2026; npm and Cargo regenerate version metadata in their lockfiles | `package.json` → script `build:windows`; `scripts/archive-installer.mjs`; version in `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`, `src-tauri/tauri.conf.json` | No locking test exists | `docs/WORKING-AGREEMENT.md` (version scheme); `docs/specs/windows-060-build-plan.md` (explicit exception); commits `f06b6be`, `9c4bba5`, `7d68db4` | Yes | Active |
| L-40 | The Antigravity runtime's large temporary files go to `~/.monocode/providers/antigravity/tmp` instead of the system temp folder, and a runtime unpacked in Downloads is found | `src-tauri/src/antigravity_acp.rs` (sets `TMP` and `TEMP` for the runtime); `src-tauri/src/harness.rs` (Downloads lookup inside the Antigravity resolver) | `src-tauri/src/antigravity_acp.rs` has a test that reads the `TMP` value. Downloads lookup: not checked | `docs/notes/antigravity-acp-implementation-notes.md` | Yes | Active |
| L-41 | Task Manager: persistent Personal and project tasks with seven statuses, tags and combined filters; chat text can be captured as a task (Add Task); Operator can list, read, write and delete tasks; Copy Markdown beside Preview/Source in Notes, Tasks, Markdown files, plans and skills | `src/features/tasks/tasks.ts` → `loadTasks`, `filterTasks`; `src-tauri/src/tasks.rs` → `ensure_tasks_table`, `tasks_upsert`; `src/features/agent-app/model/agentApp.ts` (`tasks.*` actions); `src/features/sessions/ui/MarkdownCopyButton.tsx` → `MarkdownCopyButton` | `src/features/tasks/tasks.test.ts` → "combines statuses, all tags, Windows project identity and search with AND"; `src/features/agent-app/model/agentApp.tasks.test.ts` | commits `f4aa072`, `91b12ca` (old Tasks tables are upgraded in place) | No | Active |
| L-42 | Task Manager views: full-width List (default), Table and Board with no sidebar; group by status or project in every view; faceted counts in the header and filters; resizable board columns that shrink to fit; a peek pane that slides in and out; open a task beside the session as a workspace tab | `src/features/tasks/ui/TasksView.tsx` → `TasksView`; `src/features/tasks/taskViewState.ts` → `groupTasks`; `src/shared/ui/board/BoardColumns.tsx` → `BoardColumn`; `src/features/tasks/ui/TaskPeekPane.tsx`; `src/features/workspace/model/layout.ts` → `newTaskTab` | `src/features/tasks/ui/TasksView.test.ts` → "defaults to a full-width List with no sidebar, newest first"; `src/features/workspace/model/workspaceSnapshot.test.ts` (task tabs) | spec `docs/specs/archive/tasks-views-redesign.md`; commits `b5bec1a`–`11c5464`, `cbe08b2` | No | Active |
| L-43 | Session Manager: run cards persist across restarts in four columns (Draft, In progress, Needs attention, Done) with a reason tag (Permission, Question, Usage limit, Failed, Interrupted, Stopped); compact 3-line cards; the board turns into a 2×2 grid when narrow; a session opens beside the board with a slide; the sidebar entry shows In progress / Needs attention / Done counts | `src/features/session-board/sessionBoard.ts` → `projectBoardCard`, `boardLane`, `boardCardTag`; `src/features/session-board/ui/SessionBoardView.tsx`; `src/features/session-board/ui/BoardSessionCard.tsx`; `src/app/shell/ProjectRail.tsx` → `SessionManagerRailAction` | `src/features/session-board/sessionBoard.test.ts` → "folds six stored statuses into four columns"; `src/features/session-board/ui/SessionBoardView.test.ts` → "reflows four columns into an even 2×2 grid when the board is too narrow" | commits `a0b440c`, `983d195`, `b6ad68b`, `e192f2d`, `cbe08b2`; stored statuses are unchanged so Operator keeps working | No | Active |
| L-44 | Session Manager drafts: prepare an unsent session (model, settings, permissions, prompt, attachments, workspace) with the Quick Composer, edit it, and start it later from the board or through Operator (`session_manager.*`) | `src/features/session-board/sessionTodos.ts` → `sessionTodoManager`; `src/features/session-board/ui/SessionTodoComposer.tsx`; `src-tauri/src/control_cli.rs` (`session_manager.*` help) | `src/features/session-board/sessionTodos.test.ts` → "persists an unsent Todo including exact Markdown, images/files, project, permissions and deferred workspace" | commit `a87a5f7` | No | Active |
| L-45 | Settings → General chooses separately how files and sessions open (reuse the current tab or a new one); Alt-click opens a new tab; dirty files, drafts and running work are never replaced | `src/features/settings/model/openingBehavior.ts` → `loadFileOpeningBehavior`, `loadSessionOpeningBehavior` | `src/features/settings/model/openingBehavior.test.ts` → "uses independent defaults and safely ignores malformed stored values" | commit `a0b440c` | No | Active |
| L-46 | Quick Composer on Windows with a global shortcut (Ctrl+Shift+Space by default, rebindable, Alt+Space allowed with conflict checks); the floating and embedded composer use transparent glass | `src-tauri/src/quick_composer.rs`; `src/features/quick-composer/model/quickComposerShortcut.ts` → `QUICK_COMPOSER_DEFAULT_SHORTCUT`; `src/features/quick-composer/main.tsx` (`composer-native-glass`) | `src/features/quick-composer/ui/QuickComposer.windows.test.ts` → "uses Ctrl+Enter to start and reveal a Windows session"; `src/features/quick-composer/ui/QuickComposer.todo.test.ts` (glass surface) | commits `bee3eea`, `8d4d3c6` | Yes (shortcut and native glass) | Active |
| L-47 | Rendered Markdown tables have icon-only Add to Note, Add Draft to Sessions and Copy actions; Copy keeps headers, alignment and inline formatting as HTML and Markdown | `src/features/sessions/ui/MarkdownTable.tsx`; `src/features/sessions/model/tableContent.ts` → `tableContent` | `src/features/sessions/ui/MarkdownTable.test.ts` → "shows icon-only Add to Note, Add Draft to Sessions and Copy, in that order" | commits `5e06791`, `8d4d3c6` | No | Active |
| L-48 | Wallpaper "Haze" effect: the top stays clear, the lower image softens and fades | `src/features/settings/model/wallpaperHaze.ts` → `hazeWallpaperPixels` | `src/features/settings/model/wallpaperHaze.test.ts` → "keeps the top artwork clear, softens the lower image, and fades it out" | commit `5e06791` | No | Active |
| L-49 | Experiment (off by default): compact model labels on session cards, preferring the model that actually ran the turn | `src/features/sessions/ui/useCompactModelLabels.ts` → `useCompactModelLabels`, `compactModelLabel` | `src/features/sessions/ui/SessionCard.modelLabel.test.ts` → "keeps the experimental compact label hidden by default" | commit `5e06791` | No | Active |
| L-50 | Queued follow-ups are held independently of the quota notice, the hold reason survives a restart, and only a deliberate Resume (or opt-in quota-reset continuation) releases them | `src/features/sessions/model/messageQueue.ts` (`QUEUE_HOLD_REASON_USAGE_LIMIT`, `QUEUE_HOLD_REASON_STEER_CANCEL`) | `src/features/sessions/model/messageQueue.test.ts`; `src/features/sessions/model/queueDurability.test.ts` | commit `5e06791` | No | Active |
| L-51 | Reply layout: the header shows only the model; the footer has handoff, second opinion, fork and side chat, then "Ran for X · time", with Add to Note, Add Draft to Sessions and Copy on the right | `src/features/sessions/ui/AgentTranscript.tsx` (`TurnDuration` footer) | `src/features/sessions/ui/AgentTranscript.test.ts` → "shows only the model on top and puts actions, run time and keep actions in the footer" | commit `8d4d3c6` | No | Active |
| L-52 | The gliding hover also runs in Notes, Automations, Task Manager, Session Manager (whole card) and the project Sessions list, keeps gliding across small gaps, and board surfaces follow the Menu surface tint and backdrop blur settings | `src/features/sessions/ui/SharedHoverHighlight.tsx`; `src/styles/index.css` → `surface-tint`, `surface-blur`; `src/app/shell/Sidebar.tsx` (session card `data-shared-hover-item`) | `src/app/shell/SidebarRename.test.ts` → "makes project session cards part of the sidebar's gliding hover"; `src/features/session-board/ui/SessionBoardView.test.ts` → "treats the whole card as one hover surface and opens the session from anywhere on it" | commits `0244e71`, `a07c7af`, `9ed1c50`; extends L-10 | No | Active |
| L-53 | Performance overlay (View: Toggle Performance Overlay, Ctrl+Alt+Shift+P): FPS, stutters, long tasks and hover glide/snap/hide with reasons; Start log / Stop & save writes a Markdown report to Downloads | `src/shared/debug/PerfOverlay.tsx` → `PerfOverlayHost`; `src/shared/debug/perfRecorder.ts` → `buildPerfReport`; `src/shared/debug/perfDebug.ts` | `src/shared/debug/perfDebug.test.ts`; `src/shared/debug/perfRecorder.test.ts` | commits `4fae052`, `cbe08b2` | No | Active |
| L-54 | Output speed has its own pill beside the effort pill (⚡ Standard / Fast, one click to switch; a longer tier list opens a menu) | `src/features/sessions/ui/ModelPicker.tsx` → `SpeedPill`, `isSpeedSetting` | `src/features/sessions/ui/ModelPicker.test.ts` → "shows the service tier as its own one-click Speed pill beside the effort pill" | commit `3f4f86a` | No | Active |
| L-55 | Model picker rows: the hover glides over the whole row and the selected model's fill covers the whole row; the row fill is kept for arrow-key navigation | `src/features/sessions/ui/ModelPicker.tsx` (`data-model-row`, `keyboardActive`); `src/styles/index.css` (`[data-model-row][data-selected]`) | `src/features/sessions/ui/ModelPicker.test.ts` (row hover item and selected-row assertions) | commits `cbe08b2`, `3f4f86a` | No | Active |

## Recorded in our notes but not found on the branch

- **Git-ignored files in `@` mentions** (`docs/WINDOWS-CHANGES.md`, 8 Sept; spec `gitignored-file-mentions-plan`
  marked Done). Checked on 2026-10-01 at `c2c8bf6`: the "Ignored" badge and the "ignored by Git" label are not in
  `src/`, and the branch history never contained that text. The `@` list still comes from `git ls-files`, which
  leaves ignored files out. It is not a row above because the behaviour is not there. Nakul decides whether it
  should be rebuilt.

## Known from our notes, not yet verified as rows

These are small and were not traced to a symbol and a test on 2026-10-01. Add a row when one is verified.

- The hover highlight follows the "highlight" setting and snaps to whole pixels (commit `d70b9fc`).
- A warning when the Codex model list fails after the provider was found (commit `4f14d57`).
- Import dialog: one Resume / Replay / Custom switch for all rows.
- Saved wallpapers persist, and diff statistics are aligned (commit `1edc78b`).

## Work that is not on this branch

Parked or separate. Not part of the register, listed so nobody looks for it here.

- `hari-orchestration-changes-30sept` and `park-other-orchestration-mode-changes-30sept` — parked orchestration
  work; see `docs/notes/orchestration-parking-30sept.md`.
- `feature/hari-orchestrator` (worktree `mono-clone-hari`) and `feature/remote-chat` (worktree
  `mono-clone-remote`) — leave untouched.
- `feature/mcp-hub`, `feature/scheduled-tasks`, `feature/tasks-foundation` — ideas, not merged.
- Three Git stashes — leave untouched.

## Known caveats

- Eleven upstream Rust tests in `checkpoint.rs` and `fs.rs` compare text with Unix line endings and fail on
  Windows. They are upstream's and are left alone (`docs/WINDOWS-CHANGES.md`, 6 Sept).
- `src-tauri/src/harness.rs` has a Unix-only test, `antigravity_launch_args_match_the_platform_registry`, that
  calls a function we removed. It does not compile on Linux or macOS; on Windows it is skipped.
