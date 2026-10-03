# Stage 2 — Upstream inventory

Verified: 128-commit ancestry ledger from pinned merge base to `43aac9d`; `scripts/inventory.py` assigns each commit exactly once. Source of release behavior: upstream `CHANGELOG.md @ 43aac9d`, corroborating changed-source declarations in `scripts/diff-review-panels.md`. This is source analysis, not runtime verification.

## Summary

| Release range | Commits | New feature IDs | Maintenance IDs |
|---|---:|---:|---:|
| v0.1.56 | 19 | 7 | 9 |
| v0.2.0 | 15 | 4 | 7 |
| v0.3.0 | 21 | 4 | 14 |
| v0.4.0 | 21 | 7 | 9 |
| v0.4.1 | 1 | 0 | 1 |
| v0.4.2 | 2 | 0 | 2 |
| v0.4.3 | 1 | 0 | 1 |
| v0.5.0 | 13 | 3 | 9 |
| v0.6.0 | 26 | 7 | 9 |
| post-v0.6.0 | 9 | 1 | 8 |

## Features by first release

Windows expected means Inferred from shared UI/backend and code paths, not a verified desktop pass. Mac-only and Linux-only gates are separate. Dependencies below are an integration checklist, not package-install authorization.

| ID | Feature in plain words | First release | Main commits / source paths | Windows? + evidence | Depends on | Relation to our side | Confidence |
|---|---|---|---|---|---|---|---|
| U-001 | Compact rail has a temporary sidebar drawer and hidden-rail project menus | v0.1.56 | 9fb7710, 3e3a81c, c3005b0, 5548916, c01e31b, dd5c039; `src/app/shell/ProjectRail.tsx @ 43aac9d`; `src/app/shell/Sidebar.tsx @ 43aac9d`; `src/app/shell/useProjectMenu.tsx @ 43aac9d`; `src/features/projects/model/projectGroups.ts @ 43aac9d` | Cross-platform UI; Windows expected, live behavior Not checked | sidebar state, project picker, appearance settings | L-02,L-09,L-10; local compact-hover overlap | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-002 | Haze background effect with preview | v0.1.56 | 778b527; `src/features/projects/ui/ProjectBackgroundDialog.tsx @ 43aac9d`; `src/features/projects/ui/useProjectBackgroundEffect.ts @ 43aac9d`; `src/features/sessions/ui/SessionPane.tsx @ 43aac9d`; `src/features/settings/model/appearance.ts @ 43aac9d` | Cross-platform worker; Windows expected, packaged renderer needs check | gradient-blur UI/background layer and effect union; bypasses worker conversion | L-09 wallpaper renderer and effects | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-003 | Choose whether supported files are formatted when saved | v0.1.56 | 28b814a; `src/features/files/ui/FileEditor.tsx @ 43aac9d`; `src/features/settings/model/settings.ts @ 43aac9d`; `src/features/settings/ui/SettingsView.tsx @ 43aac9d` | Cross-platform editor; Windows expected | persisted formatOnSave setting; Prettier-supported languages | L-27 line-ending/editor work | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-004 | Provider defaults and picker visibility can vary by project | v0.1.56 | 26e66e3; `src/app/App.tsx @ 43aac9d`; `src/features/automations/ui/AutomationsView.tsx @ 43aac9d`; `src/features/projects/model/projectData.ts @ 43aac9d`; `src/features/sessions/model/models.ts @ 43aac9d` | Cross-platform settings; Windows expected | settings scopes, provider maps and blank-session defaults | L-04 Cline; L-18 discovery; per-instance provider plan | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-005 | Reusable preview tabs become permanent after editing or double-click | v0.1.56 | b6baa44; `src/app/App.tsx @ 43aac9d`; `src/app/shell/Sidebar.tsx @ 43aac9d`; `src/app/shell/TitleBar.tsx @ 43aac9d`; `src/features/files/ui/FilePane.tsx @ 43aac9d` | Cross-platform workspace; Windows expected | Tab preview state, workspace serialization and tab/pane actions | L-07,L-08 terminal cleanup; workspace snapshots | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-006 | Pull requests show checks, job steps and repair conversations | v0.1.56 | 3e28087; `src-tauri/src/fs.rs @ 43aac9d`; `src-tauri/src/lib.rs @ 43aac9d`; `src/app/App.tsx @ 43aac9d`; `src/features/inbox/hooks/useGithubPrChecks.ts @ 43aac9d` | Cross-platform GitHub/UI; Windows requires functioning gh | GitHub check APIs, repair state and linked session persistence | L-26 review-fix/Pull review overlap | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-007 | Floating Quick composer starts sessions over other apps | v0.1.56 | 618efe4, b3034f1; `quick-composer.html @ 43aac9d`; `src-tauri/Cargo.toml @ 43aac9d`; `src-tauri/capabilities/default.json @ 43aac9d`; `src-tauri/src/lib.rs @ 43aac9d` | Verified macOS-only entry point; Windows unavailable | new quick-composer frontend entry, macOS native global shortcut and screenshot commands (no new capability file) | new; L-04,L-19 provider/helper lists | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-008 | BTW gives a read-only side conversation on an answer | v0.2.0 | 67ad7dd, 796e03a, e611f00, 9b1ddc8; `src-tauri/src/fs.rs @ 43aac9d`; `src/app/App.tsx @ 43aac9d`; `src/app/shell/GlassBackdrop.tsx @ 43aac9d`; `src/features/sessions/data/sessionStore.ts @ 43aac9d` | Cross-provider text adapters; Windows expected, Antigravity/Cline coverage needs decision | saved BTW threads/model settings; provider text interfaces; animated sheet | duplicates/overlaps L-26 Sidechat; L-19 helper choice | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-009 | Operator grants a thread opt-in app control, later note writing and worktrees | v0.2.0 | b6f56e6, 69f602d, c576783, fce518c; `README.md @ 43aac9d`; `src-tauri/src/control.rs @ 43aac9d`; `src-tauri/src/control_cli.rs @ 43aac9d`; `src-tauri/src/lib.rs @ 43aac9d` | Cross-platform local CLI/control; Windows expected | control commands/grants, agentApp schemas, session flag and notes/worktree actions | parked orchestration handoff/lead-control overlap; L-28 human origin | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-010 | Account controls show plan and organization, later usage/readiness and hidden identity | v0.2.0 | 47db85e, 7646575, 312f781, 158ce78, adbe2db; `src-tauri/src/account_identity.rs @ 43aac9d`; `src-tauri/src/lib.rs @ 43aac9d`; `src/app/shell/UsageFooter.tsx @ 43aac9d`; `src/app/shell/UsageProviderChip.tsx @ 43aac9d` | Claude/Codex account APIs; Windows expected | account cache, per-account rate limits, polling and reveal state | L-12 quota; L-19 account-isolated helpers; provider-instance plan | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-011 | Usage-limit notice pauses a queue and can resume after reset | v0.2.0 | bb46e56; `src/app/App.tsx @ 43aac9d`; `src/features/providers/model/rateLimits.ts @ 43aac9d`; `src/features/sessions/model/messageQueue.ts @ 43aac9d`; `src/features/sessions/model/session.ts @ 43aac9d` | Cross-platform provider state; Windows expected | usage-limit session state, timer, queue scheduling and stored restore policy | L-05,L-06 durable/held queues; L-12 usage | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-012 | Custom shortcuts can be recorded, disabled and reset | v0.3.0 | ee56686; `src-tauri/src/lib.rs @ 43aac9d`; `src-tauri/src/menu.rs @ 43aac9d`; `src/app/App.tsx @ 43aac9d`; `src/app/shell/MenuBar.tsx @ 43aac9d` | Cross-platform keys; macOS native menu extras | keybinding schema/storage, app/editor/tab menus and conflict validation | menu/keyboard conventions L-01,L-02 | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-013 | Set a validated CLI binary path for each provider | v0.3.0 | fde0d84; `src-tauri/src/harness.rs @ 43aac9d`; `src-tauri/src/lib.rs @ 43aac9d`; `src/features/providers/model/providerBinaryPaths.ts @ 43aac9d`; `src/features/providers/model/rateLimitsFetch.ts @ 43aac9d` | Backend resolution includes Windows; validation untested in this run | provider override settings, native version probing and maps | duplicates existing override L-13,L-18; L-03 ACP resolver | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-014 | Editor and diff preview highlight JSON with comments | v0.3.0 | 1ce9057; `src/features/files/editor/editorLanguage.ts @ 43aac9d` | Cross-platform CodeMirror; Windows expected | JSONC language mapping | new editor language | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-015 | A tab menu archives or deletes all its conversations | v0.3.0 | 0d3db9c; `src/app/App.tsx @ 43aac9d`; `src/app/shell/TitleBar.tsx @ 43aac9d` | Cross-platform UI; Windows expected | bulk session lifecycle callbacks | L-07 queue/terminal removal ownership | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-016 | Open multiple project folders in one selection | v0.4.0 | 1dd1fc0; `src/app/App.tsx @ 43aac9d`; `src/features/projects/model/projectOpenRun.ts @ 43aac9d`; `src/platform/tauri/fs.ts @ 43aac9d` | Cross-platform dialog/UI; Windows expected | folder selection arrays, recents/activation order | project lifecycle | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-017 | Paste screenshots or copied files/folders as attachments | v0.4.0 | d836e22; `src-tauri/Cargo.toml @ 43aac9d`; `src-tauri/src/fs.rs @ 43aac9d`; `src-tauri/src/lib.rs @ 43aac9d`; `src-tauri/src/pasteboard.rs @ 43aac9d` | Native clipboard Windows branches present; Wayland handling added | clipboard paths/screenshots, tauri command wiring, main/Quick composer | L-05 queued attachments; L-23 forms unaffected | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-018 | Start sessions in adjacent split panes | v0.4.0 | daaa953; `README.md @ 43aac9d`; `src-tauri/src/control_cli.rs @ 43aac9d`; `src/app/App.tsx @ 43aac9d`; `src/app/model/quickLaunchSession.ts @ 43aac9d` | Cross-platform layout; Windows expected | pane insertion, operator target options | L-07,L-08 workspace lifecycle; Hari plan | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-019 | Pi shows subscription usage | v0.4.0 | d4a1c5d; `src-tauri/Cargo.toml @ 43aac9d`; `src-tauri/src/lib.rs @ 43aac9d`; `src-tauri/src/pi_usage.rs @ 43aac9d`; `src/app/App.tsx @ 43aac9d` | Backend supported provider configuration; Windows expected | Pi usage parser and rate-limit maps | L-12 meter provider union | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-020 | Codex-generated images persist and appear in conversations | v0.4.0 | 0bd9946; `src-tauri/src/fs.rs @ 43aac9d`; `src-tauri/src/lib.rs @ 43aac9d`; `src-tauri/src/session_store.rs @ 43aac9d`; `src/app/App.tsx @ 43aac9d` | Cross-platform asset handling; Windows expected | image materialization, protocol events, generated asset paths and cleanup | L-05 attachments; L-25 branch transcripts | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-021 | Copy the selected Explorer path with a shortcut | v0.4.0 | ec59d92; `src/features/files/ui/FileTree.tsx @ 43aac9d` | Cross-platform platform-aware key; Windows expected | Explorer focus/path resolution and keyboard mapping | new file action | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-022 | Completed plan and orchestrator turns celebrate distinctly | v0.4.0 | 38d8f58; `src/app/App.tsx @ 43aac9d`; `src/features/sessions/data/sessionStore.ts @ 43aac9d`; `src/features/sessions/model/session.ts @ 43aac9d`; `src/features/sessions/ui/AgentTranscript.tsx @ 43aac9d` | Cross-platform motion; Windows expected | saved turn intent and animations/reduced motion | parked Hari modes; L-28 intent ownership | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-023 | Persistent remote sessions and workspaces over SSH | v0.5.0 | 2515c15, 22358b5, a04624f, 8bba3cc, 6e58a42; `.gitattributes @ 43aac9d`; `.github/workflows/ci.yml @ 43aac9d`; `.github/workflows/release.yml @ 43aac9d`; `README.md @ 43aac9d` | Verified Windows bootstrap/ACL/tests exist; runtime Not checked | new host/ TS build/package, SSH pair/tunnel, native remote bridge, Connections settings, remote persistence, CI host assets | duplicates planned/local feature/remote-chat; L-03,L-04 provider support gap | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-024 | Help menu opens website, repository and issue links | v0.5.0 | a28a998; `src-tauri/src/menu.rs @ 43aac9d` | Cross-platform in-app menu; Windows expected | opener links and menu commands | L-02 menu ownership | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-025 | Cancel generated Git commit messages | v0.5.0 | a7e1f3d; `src/features/source-control/ui/GitChangesPanel.tsx @ 43aac9d`; `src/features/source-control/ui/SwitchBranchDialog.tsx @ 43aac9d`; `src/integrations/harness/core/registry.ts @ 43aac9d`; `src/integrations/harness/core/textHarness.ts @ 43aac9d` | Cross-platform async UI; Windows expected | abort and superseded-result guards | L-19 helper pipeline cancellation overlap | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-026 | Copy MonoCode or provider session ID | v0.6.0 | 16e9fea; `host/store.ts @ 43aac9d`; `src/app/shell/Sidebar.tsx @ 43aac9d`; `src/features/connections/model/protocol.ts @ 43aac9d` | Cross-platform clipboard; Windows expected | session summary native-ID cache and menu actions | L-25 native fork identity and summary fields | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-027 | Provider usage shows remaining percentage by default | v0.6.0 | d0943b1; `src/app/shell/UsageProviderChip.tsx @ 43aac9d`; `src/features/providers/ui/ProviderAccountUsage.tsx @ 43aac9d` | Cross-platform rate-limit math; Windows expected | meter format/default and tests | duplicates/competes L-12 remaining quota preference | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-028 | Editor Autosave after one idle second, off by default | v0.6.0 | 71fd1b5, 0f71918; `src-tauri/src/lib.rs @ 43aac9d`; `src-tauri/src/menu.rs @ 43aac9d`; `src/app/App.tsx @ 43aac9d`; `src/app/shell/MenuBar.tsx @ 43aac9d` | Cross-platform timers; Windows expected | autosave storage, Format on save and disk-conflict guard | L-27 editor preservation | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-029 | In-app CLI updates with installed-version verification | v0.6.0 | 1595870, 378adad; `src-tauri/src/harness.rs @ 43aac9d`; `src-tauri/src/harness_updates.rs @ 43aac9d`; `src-tauri/src/lib.rs @ 43aac9d`; `src/app/App.tsx @ 43aac9d` | Backend Windows install paths/child helper; runtime Not checked | harness_updates commands, update methods, cross-window model refresh | duplicates L-18 lightweight update toasts; L-13 binaries; L-19 helpers | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-030 | MCP settings discover/manage provider connections; /mcp selects server tags | v0.6.0 | e691b46, 1708c42, fec434a, e322b7f; `src-tauri/Cargo.toml @ 43aac9d`; `src-tauri/src/control.rs @ 43aac9d`; `src-tauri/src/harness.rs @ 43aac9d`; `src-tauri/src/lib.rs @ 43aac9d` | Backend provider CLI/config parsing; Windows branches present, CLI compatibility Not checked | new mcp Rust module/commands, toml 0.9.12 dependency, provider config writes, project cache and saved draft tags | planned feature/mcp-hub; L-03,L-04 providers unsupported; L-20,L-23 approvals/forms distinct | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-031 | Linux dark-mode glass can be enabled | v0.6.0 | 1b39ceb, 2cbd506; `src-tauri/src/macos.rs @ 43aac9d`; `src-tauri/src/window.rs @ 43aac9d`; `src-tauri/tauri.linux.conf.json @ 43aac9d`; `src/features/settings/model/appearance.ts @ 43aac9d` | Verified Linux-specific native path; Windows must retain its acrylic | body-glass preference, native transparency and reduced-motion transitions | L-09 glass CSS/platform handling | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-032 | Slash commands select Plan/Orchestrator mode or save a draft | v0.6.0 | e833e83; `src-tauri/src/quick_composer.rs @ 43aac9d`; `src-tauri/src/quick_composer/delivery.rs @ 43aac9d`; `src/app/model/quickLaunchSession.ts @ 43aac9d`; `src/features/quick-composer/model/quickComposer.ts @ 43aac9d` | Cross-platform main/Quick composer; Windows expected | command parser, inline mode pills and draft save behavior | L-01 queue/steer; L-06 holds; parked orchestration modes | Verified release description; source declarations reviewed; Windows expectation Inferred |
| U-033 | Codex effort selection animates its choices | post-v0.6.0 | 43aac9d; `src/features/sessions/ui/ModelPicker.css @ 43aac9d`; `src/features/sessions/ui/ModelPicker.tsx @ 43aac9d` | Cross-platform UI; Windows expected | picker motion; post-tag approval required | new model picker polish | Verified release description; source declarations reviewed; Windows expectation Inferred |

## Fixes and maintenance by release

Verified commit identity and changed declarations; subjects alone are not proof of full behavior. The diff panels distinguish the inspected source from runtime claims.

| ID | Release | Change | Commit | Evidence |
|---|---|---|---|---|
| U-034 | v0.1.56 | Reconcile streamed Claude tool inputs | 81486bd | Verified diff-panel declarations; `src/integrations/harness/providers/claude/claude.ts @ 43aac9d`; runtime Not checked |
| U-035 | v0.1.56 | Deduplicate Codex text by item | ef17ac0 | Verified diff-panel declarations; `src/integrations/harness/providers/codex/codex.ts @ 43aac9d`; runtime Not checked |
| U-036 | v0.1.56 | Show background work when Claude yields | 4504eb0 | Verified diff-panel declarations; `src/app/App.tsx @ 43aac9d`; runtime Not checked |
| U-037 | v0.1.56 | Preserve assistant message boundaries in streamed output | b8e9a7f | Verified diff-panel declarations; `src/integrations/harness/core/apply.test.ts @ 43aac9d`; runtime Not checked |
| U-038 | v0.1.56 | Remember the terminal dock side across projects (#400) | e724cdf | Verified diff-panel declarations; `src/app/App.tsx @ 43aac9d`; runtime Not checked |
| U-039 | v0.1.56 | fix: open the file that match the activity log label, not preview.path (#330) | 38a797e | Verified diff-panel declarations; `src/features/sessions/model/transcriptActivity.test.ts @ 43aac9d`; runtime Not checked |
| U-040 | v0.1.56 | Fix Codex Full Access MCP approvals (#402) | 879ae4b | Verified diff-panel declarations; `CHANGELOG.md @ 43aac9d`; runtime Not checked |
| U-041 | v0.1.56 | fix(pi): ignore tool progress updates after the tool ends (#391) | bffe301 | Verified diff-panel declarations; `src/integrations/harness/providers/omp/ompLive.test.ts @ 43aac9d`; runtime Not checked |
| U-042 | v0.1.56 | Release v0.1.56 | 611e05b | Verified diff-panel declarations; `CHANGELOG.md @ 43aac9d`; runtime Not checked |
| U-043 | v0.2.0 | fix: make composer controls responsive (#414) | 0f8da85 | Verified diff-panel declarations; `src/features/quick-composer/ui/QuickPermissions.tsx @ 43aac9d`; runtime Not checked |
| U-044 | v0.2.0 | Fix model selection when resuming interrupted sessions (#422) | dc5345a | Verified diff-panel declarations; `src/app/shell/SidebarRename.test.ts @ 43aac9d`; runtime Not checked |
| U-045 | v0.2.0 | fix: exit app when last window closes on Linux (#419) | 762f1f8 | Verified diff-panel declarations; `src-tauri/src/lib.rs @ 43aac9d`; runtime Not checked |
| U-046 | v0.2.0 | Remember the selected sidebar tab per project | 8257a97 | Verified diff-panel declarations; `src/app/App.tsx @ 43aac9d`; runtime Not checked |
| U-047 | v0.2.0 | Defer Escape handling past later keydown listeners | 2242bcd | Verified diff-panel declarations; `src/features/workspace/model/tabKeys.test.ts @ 43aac9d`; runtime Not checked |
| U-048 | v0.2.0 | Add stableDiff utilities to prevent unnecessary re-renders | 5725987 | Verified diff-panel declarations; `src/features/source-control/model/stableDiff.test.ts @ 43aac9d`; runtime Not checked |
| U-049 | v0.2.0 | Release v0.2.0 | 19b9922 | Verified diff-panel declarations; `CHANGELOG.md @ 43aac9d`; runtime Not checked |
| U-050 | v0.3.0 | Restore Claude shell commands in session transcripts | f028d9e | Verified diff-panel declarations; `src-tauri/src/fs.rs @ 43aac9d`; runtime Not checked |
| U-051 | v0.3.0 | Support macOS terminal editing shortcuts | ed3c44c | Verified diff-panel declarations; `src/features/terminal/model/terminalKeys.test.ts @ 43aac9d`; runtime Not checked |
| U-052 | v0.3.0 | Drop word-fade spans when fade animation finishes | fd3ee03 | Verified diff-panel declarations; `src/features/sessions/ui/AgentMarkdown.tsx @ 43aac9d`; runtime Not checked |
| U-053 | v0.3.0 | Run the same claude the user's shell does (#448) | d2a625e | Verified diff-panel declarations; `src-tauri/src/harness.rs @ 43aac9d`; runtime Not checked |
| U-054 | v0.3.0 | Fix completed GitHub issue status icon (#455) | c43c209 | Verified diff-panel declarations; `src-tauri/src/fs.rs @ 43aac9d`; runtime Not checked |
| U-055 | v0.3.0 | Remove redundant Explorer changes button (#466) | da554f5 | Verified diff-panel declarations; `src/app/App.tsx @ 43aac9d`; runtime Not checked |
| U-056 | v0.3.0 | fix(files): preserve CRLF line endings in the editor (#412) | 3fb4c11 | Verified diff-panel declarations; `CHANGELOG.md @ 43aac9d`; runtime Not checked |
| U-057 | v0.3.0 | Clash a keybinding against the modifier the platform uses (#453) | 4186e97 | Verified diff-panel declarations; `src/features/settings/model/settings.test.ts @ 43aac9d`; runtime Not checked |
| U-058 | v0.3.0 | fix(git): keep diff file paths relative to nested workspaces (#465) | 7aa645d | Verified diff-panel declarations; `CHANGELOG.md @ 43aac9d`; runtime Not checked |
| U-059 | v0.3.0 | fix: offer a second opinion from the same harness when only one is enabled (#421) | 90c5a65 | Verified diff-panel declarations; `src/features/sessions/ui/AgentTranscript.tsx @ 43aac9d`; runtime Not checked |
| U-060 | v0.3.0 | Clarify second opinion disabled state | ed696cc | Verified diff-panel declarations; `src/features/sessions/ui/AgentTranscriptSecondOpinion.test.ts @ 43aac9d`; runtime Not checked |
| U-061 | v0.3.0 | fix: don't crash pty-data listener on a malformed chunk (#472) | 8463340 | Verified diff-panel declarations; `src/platform/tauri/pty.test.ts @ 43aac9d`; runtime Not checked |
| U-062 | v0.3.0 | Let the turn go once an inline subagent has reported back (#452) | 6b313ab | Verified diff-panel declarations; `src/app/App.tsx @ 43aac9d`; runtime Not checked |
| U-063 | v0.3.0 | Release v0.3.0 | c9cdc57 | Verified diff-panel declarations; `CHANGELOG.md @ 43aac9d`; runtime Not checked |
| U-064 | v0.4.0 | perf: bound and cancel work across search hot paths (#462) | 04da09f | Verified diff-panel declarations; `src-tauri/Cargo.toml @ 43aac9d`; runtime Not checked |
| U-065 | v0.4.0 | Clear terminal on Cmd+K when App: Search is disabled or rebound (#491) | bef7c90 | Verified diff-panel declarations; `src/features/terminal/model/terminalKeys.test.ts @ 43aac9d`; runtime Not checked |
| U-066 | v0.4.0 | Let git find gpg when MonoCode is launched from Finder (#484) | 4f6c17e | Verified diff-panel declarations; `src-tauri/src/fs.rs @ 43aac9d`; runtime Not checked |
| U-067 | v0.4.0 | Fedora rpm packaging (#362) | 52640dc | Verified diff-panel declarations; `.github/workflows/ci.yml @ 43aac9d`; runtime Not checked |
| U-068 | v0.4.0 | Disable persisted checkout credentials in release workflow | f8769ee | Verified diff-panel declarations; `.github/workflows/release.yml @ 43aac9d`; runtime Not checked |
| U-069 | v0.4.0 | Keep Claude versioned models on their full native ids (#488) | 6b8376f | Verified diff-panel declarations; `src/features/sessions/model/models.test.ts @ 43aac9d`; runtime Not checked |
| U-070 | v0.4.0 | Preserve unknown Claude model versions | 79ca374 | Verified diff-panel declarations; `src/features/sessions/model/models.test.ts @ 43aac9d`; runtime Not checked |
| U-071 | v0.4.0 | fix(projects): keep project name visible in picker when parent path is long (#507) | 4171683 | Verified diff-panel declarations; `src/features/projects/ui/SearchableProjectPicker.tsx @ 43aac9d`; runtime Not checked |
| U-072 | v0.4.0 | Release v0.4.0 | 7288fb6 | Verified diff-panel declarations; `CHANGELOG.md @ 43aac9d`; runtime Not checked |
| U-073 | v0.4.1 | Fix project rail reopening lag and release v0.4.1 | 413d699 | Verified diff-panel declarations; `CHANGELOG.md @ 43aac9d`; runtime Not checked |
| U-074 | v0.4.2 | Reduce startup and transcript UI performance costs | 9eebd89 | Verified diff-panel declarations; `CHANGELOG.md @ 43aac9d`; runtime Not checked |
| U-075 | v0.4.2 | Add performance regression guards and release v0.4.2 | e3220ca | Verified diff-panel declarations; `CHANGELOG.md @ 43aac9d`; runtime Not checked |
| U-076 | v0.4.3 | Make startup regression test work on Windows and prepare v0.4.3 | 6ffc995 | Verified diff-panel declarations; `CHANGELOG.md @ 43aac9d`; runtime Not checked |
| U-077 | v0.5.0 | Publish updater feed after host release assets (#528) | 67ffc0b | Verified diff-panel declarations; `.github/workflows/release.yml @ 43aac9d`; runtime Not checked |
| U-078 | v0.5.0 | Wait for provider guard before Windows test cleanup | 553b1a2 | Verified diff-panel declarations; `host/child-backend.test.ts @ 43aac9d`; runtime Not checked |
| U-079 | v0.5.0 | Improve automation card layout and accessibility | d8377d2 | Verified diff-panel declarations; `src/features/automations/ui/AutomationsView.tsx @ 43aac9d`; runtime Not checked |
| U-080 | v0.5.0 | Prevent auto-scroll re-pinning when scrolling away from bottom | 6c4b1c6 | Verified diff-panel declarations; `src/features/sessions/ui/AgentTranscript.tsx @ 43aac9d`; runtime Not checked |
| U-081 | v0.5.0 | Hold reader's place when turns above viewport resize | 52cc279 | Verified diff-panel declarations; `src/features/sessions/ui/AgentTranscript.tsx @ 43aac9d`; runtime Not checked |
| U-082 | v0.5.0 | Simplify turn removal handling in scroll anchor | 70bb586 | Verified diff-panel declarations; `src/features/sessions/ui/AgentTranscript.tsx @ 43aac9d`; runtime Not checked |
| U-083 | v0.5.0 | Optimize app startup and batched harness updates | 1a3215d | Verified diff-panel declarations; `src/app/App.tsx @ 43aac9d`; runtime Not checked |
| U-084 | v0.5.0 | Increase Windows integration test timeouts | bf32549 | Verified diff-panel declarations; `host/vitest.config.ts @ 43aac9d`; runtime Not checked |
| U-085 | v0.5.0 | Prepare v0.5.0 release | b46230e | Verified diff-panel declarations; `CHANGELOG.md @ 43aac9d`; runtime Not checked |
| U-086 | v0.6.0 | Stop triple-click in agent replies from running to the end of the reply (#535) | af4c01d | Verified diff-panel declarations; `src/features/sessions/ui/AgentMarkdown.tsx @ 43aac9d`; runtime Not checked |
| U-087 | v0.6.0 | Show one row per background subagent (#536) | 877ab2c | Verified diff-panel declarations; `src/integrations/harness/providers/claude/claude.ts @ 43aac9d`; runtime Not checked |
| U-088 | v0.6.0 | Fix launch crash on macOS 12 caused by empty Window menu (#509) | dad02c1 | Verified diff-panel declarations; `src-tauri/src/menu.rs @ 43aac9d`; runtime Not checked |
| U-089 | v0.6.0 | Fix/claude subagent error output (#569) | 41b0b8e | Verified diff-panel declarations; `src/features/sessions/data/sessionStore.test.ts @ 43aac9d`; runtime Not checked |
| U-090 | v0.6.0 | fix: highlight text and untagged code fence as js (#471) | c9892f0 | Verified diff-panel declarations; `src/features/sessions/ui/AgentMarkdown.test.ts @ 43aac9d`; runtime Not checked |
| U-091 | v0.6.0 | Use dashboard icon for session sidebar toggle | cdc1441 | Verified diff-panel declarations; `src/app/shell/TitleBar.tsx @ 43aac9d`; runtime Not checked |
| U-092 | v0.6.0 | Fix interface scale breaking the UI while dragging (#559) | b4f5bef | Verified diff-panel declarations; `CHANGELOG.md @ 43aac9d`; runtime Not checked |
| U-093 | v0.6.0 | fix(claude): show TaskCreate/TaskUpdate in the todo panel (#513) | 2cfc178 | Verified diff-panel declarations; `src/app/App.tsx @ 43aac9d`; runtime Not checked |
| U-094 | v0.6.0 | Prepare v0.6.0 release | 48fe62a | Verified diff-panel declarations; `CHANGELOG.md @ 43aac9d`; runtime Not checked |
| U-095 | post-v0.6.0 | Fix ARM64 Linux build: use libc::c_char for the ptsname_r buffer (#584) | 7ce63cb | Verified diff-panel declarations; `src-tauri/src/pty.rs @ 43aac9d`; runtime Not checked |
| U-096 | post-v0.6.0 | Improve navigation responsiveness with idle preloading | 4e876a8 | Verified diff-panel declarations; `src/app/App.tsx @ 43aac9d`; runtime Not checked |
| U-097 | post-v0.6.0 | Restore previous view after closing settings | 8fae566 | Verified diff-panel declarations; `src/app/App.tsx @ 43aac9d`; runtime Not checked |
| U-098 | post-v0.6.0 | Scope the Changes review to the section it was opened from (#582) | fea2c0a | Verified diff-panel declarations; `src/app/App.tsx @ 43aac9d`; runtime Not checked |
| U-099 | post-v0.6.0 | Diff whole files line by line in the changes view (#590) | 5c00fe2 | Verified diff-panel declarations; `src/features/files/editor/editorGit.ts @ 43aac9d`; runtime Not checked |
| U-100 | post-v0.6.0 | Fix chat bubbles overflowing narrow session panes (#575) | 4bb4a00 | Verified diff-panel declarations; `src/features/sessions/ui/AgentTranscript.bubbleWidth.test.ts @ 43aac9d`; runtime Not checked |
| U-101 | post-v0.6.0 | Recover Codex commands for bare Shell rows (#581) | 36bb26c | Verified diff-panel declarations; `src/features/sessions/data/sessionStore.test.ts @ 43aac9d`; runtime Not checked |
| U-102 | post-v0.6.0 | fix(markdown): keep a document's lines on their own lines (#595) | a67e614 | Verified diff-panel declarations; `src/features/notes/ui/NotesView.test.ts @ 43aac9d`; runtime Not checked |

## New dependencies, permissions, commands, settings and stored-data changes

- Verified candidate areas: host/ build/package/tests; new quick composer Vite entry; Rust remote/SSH/bootstrap/askpass; mcp and harness_updates native modules and command registrations. Exact names and package deltas are recorded below after manifest review.
- Settings/data: preview-tab state, provider defaults by project, format-on-save, keybindings, BTW conversation state, Operator access flag, usage-limit restore state, remote connections/projects/sessions, autosave, MCP draft tags and project/cache selection, session-summary provider IDs, Linux glass. Preserve local queues, helper preferences, native-fork blocks and wallpaper keys.
- Not checked: compatibility of these shapes with every older on-disk data version; stage 4 examines the material risks.

## Commit ledger

Verified: one row per commit; **128 rows**; `git rev-list --count 3344bea..43aac9d` = 128. Full SHAs ensure repeatable attribution.

| Commit | Range | U ID | Subject |
|---|---|---|---|
| 81486bd746c787af126d4993c8bb8811c3e07c92 | v0.1.56 | U-034 | Reconcile streamed Claude tool inputs |
| ef17ac02348949c724ad733adc7df2cfdc12ae59 | v0.1.56 | U-035 | Deduplicate Codex text by item |
| 9fb7710f21c71c1e6380a5a51f78afdc31bf89d2 | v0.1.56 | U-001 | Add slide-out sidebar drawer in compact rail |
| 4504eb0d435895a247e914747d1f19a1115672ed | v0.1.56 | U-036 | Show background work when Claude yields |
| 778b527b005e29308eee2eb0079c700af458b80f | v0.1.56 | U-002 | feat(appearance): add Haze chat background effect (#390) |
| 3e3a81ce1500ed5df0cb74eb9ebcf746b3aad842 | v0.1.56 | U-001 | feat(sidebar): open project context menu while the rail is hidden (#389) |
| c3005b04f65af9d59a30a43b6b8a8e0981c40681 | v0.1.56 | U-001 | Default collapsed project rail to icon mode |
| 55489167bb4068d5d0431e2f6e262a4165292752 | v0.1.56 | U-001 | Adjust sidebar spacing and hide empty action groups |
| b8e9a7fc166313d9fd4b55b1874890a53a5dad88 | v0.1.56 | U-037 | Preserve assistant message boundaries in streamed output |
| 28b814a89b2a89f41af9f0ca36da67f15c364057 | v0.1.56 | U-003 | Added format on save toggle in settings (#396) |
| 26e66e37403fe35190b7aead5037bc93c1269a75 | v0.1.56 | U-004 | feat(settings): scope the Providers defaults to a project or globally (#395) |
| e724cdf0628a9a9ca53e4e11736ac121c6b5d8d9 | v0.1.56 | U-038 | Remember the terminal dock side across projects (#400) |
| 38a797e86384a5136f26e5350421df5482d86968 | v0.1.56 | U-039 | fix: open the file that match the activity log label, not preview.path (#330) |
| 879ae4b819d928f632ce74fd9a3d5258b71bbe3a | v0.1.56 | U-040 | Fix Codex Full Access MCP approvals (#402) |
| b6baa44f051596f0b383a4bb66da245d66b00a8d | v0.1.56 | U-005 | feat(workspace): add preview tabs that reuse one temporary tab (#385) |
| bffe301020bfc6ff963fb7021bed995a5dcfef4b | v0.1.56 | U-041 | fix(pi): ignore tool progress updates after the tool ends (#391) |
| 3e28087b55e04f78bf21324ec46acd1bf430555d | v0.1.56 | U-006 | Add GitHub PR checks, job details, and AI repair tracking (#364) |
| 618efe437f73debd2439460d7a7c3d1586dc3dc9 | v0.1.56 | U-007 | Add macOS floating quick composer (#398) |
| 611e05bcde80c096433ef65f3b085693a1be18c5 | v0.1.56 | U-042 | Release v0.1.56 |
| 0f8da85290cd34fe2c8f6f34d1e14a4c410f45fb | v0.2.0 | U-043 | fix: make composer controls responsive (#414) |
| 67ad7dd47465f8492446b52534ca061533ce5d5f | v0.2.0 | U-008 | Add a BTW conversation feature on every agent message (#353) |
| 47db85e8c2d69578a16f82718efc3a56745c82d3 | v0.2.0 | U-010 | Show plan, email and org on provider accounts (#372) |
| 796e03ab20dd7c8cdcbc2b8aabc902638cd452a6 | v0.2.0 | U-008 | Embed BTW controls within transcript metadata |
| dc5345a20b2d5794c7148e0b7a418c97fad20949 | v0.2.0 | U-044 | Fix model selection when resuming interrupted sessions (#422) |
| 762f1f820b7b1ffdc71e217616578da0a9172b5f | v0.2.0 | U-045 | fix: exit app when last window closes on Linux (#419) |
| b6f56e6883bf047816247e52c7cb59f6e288ba47 | v0.2.0 | U-009 | Add opt-in MonoCode app CLI for agent sessions (#423) |
| 8257a975e83b3ba03cb35a313581bac26435a197 | v0.2.0 | U-046 | Remember the selected sidebar tab per project |
| 2242bcd75932f61b5271f54777f4e459ea39e696 | v0.2.0 | U-047 | Defer Escape handling past later keydown listeners |
| bb46e56aca5e199809209b66f52bbcb148f00d15 | v0.2.0 | U-011 | Add usage limit handling with auto-resume option |
| e611f0091b7795c6cee6b11c4838b5f5b9fc6254 | v0.2.0 | U-008 | Refine metrics badge and BTW popover button styling |
| 69f602db40b5eb7dae0ff1d16bcba632378860aa | v0.2.0 | U-009 | Rename the MonoCode command to /operator |
| b3034f16fd84a6a2c55fc8973fb42036fc0a3333 | v0.2.0 | U-007 | Add customizable Quick Composer global shortcut |
| 5725987fe0968bc2787086a9f2349937f83ca51c | v0.2.0 | U-048 | Add stableDiff utilities to prevent unnecessary re-renders |
| 19b992283debd03664dd5eb07aa820c5034b6338 | v0.2.0 | U-049 | Release v0.2.0 |
| 0d3db9c26a460f1354dcf350969d87a6896b8bf0 | v0.3.0 | U-015 | Add archive and delete actions to title tab menus |
| f028d9e6cfe162f7b11552a7288ffc94900b48f2 | v0.3.0 | U-050 | Restore Claude shell commands in session transcripts |
| ed3c44c60b2b388f5afd77e616ca8076fc215fb2 | v0.3.0 | U-051 | Support macOS terminal editing shortcuts |
| fde0d8419617df48113b85c1578da186ae7c093b | v0.3.0 | U-013 | feat(settings): add configurable Agent CLI binary paths (#407) |
| 1ce9057c5b5d07b733c2900340851391c637c3ea | v0.3.0 | U-014 | feat(editor): highlight .jsonc files (#382) |
| fd3ee03f233c3d26ad1f6e09405588fb8eb74a9c | v0.3.0 | U-052 | Drop word-fade spans when fade animation finishes |
| ee56686471cdbe2db2a7d2b8c6bf655a9bf3ecbb | v0.3.0 | U-012 | Feat/customizable keybindings (#438) |
| c01e31b3506ff7941160e24b64a6d4283734f1f6 | v0.3.0 | U-001 | Refine compact sidebar icons and activity indicator |
| d2a625e4c32fbc4c9aab65374462cbea6c650ae2 | v0.3.0 | U-053 | Run the same claude the user's shell does (#448) |
| c43c209dac67e2d06f512a6b7785b7c23677abd1 | v0.3.0 | U-054 | Fix completed GitHub issue status icon (#455) |
| da554f570050733356baf6ed18c27ce36959b1e7 | v0.3.0 | U-055 | Remove redundant Explorer changes button (#466) |
| 3fb4c1134ca538c24902d1efe76ec2fff12f361c | v0.3.0 | U-056 | fix(files): preserve CRLF line endings in the editor (#412) |
| 4186e976ed6bff6e337bb938229702a00fe4ce74 | v0.3.0 | U-057 | Clash a keybinding against the modifier the platform uses (#453) |
| 7aa645dbfeb1839ff935f0706668c237cea3d609 | v0.3.0 | U-058 | fix(git): keep diff file paths relative to nested workspaces (#465) |
| 90c5a655c0f62224543f1e3654d05c5cf9178664 | v0.3.0 | U-059 | fix: offer a second opinion from the same harness when only one is enabled (#421) |
| ed696cc39e65924d1b645ed14644e7736bd0a435 | v0.3.0 | U-060 | Clarify second opinion disabled state |
| dd5c039354ea3b0aef3f54557d227ab9d84a9dd9 | v0.3.0 | U-001 | Reduce compact project picker mascot size |
| 9b1ddc8dfa9b1d6e4cf77f0f1ba35b890bec597e | v0.3.0 | U-008 | Move BTW side conversations into an animated sheet (#476) |
| 8463340613ef6a3a24db5e15abd4b3b4b83bd7b2 | v0.3.0 | U-061 | fix: don't crash pty-data listener on a malformed chunk (#472) |
| 6b313ab951cd891a0adb144384e193152d0ad2f4 | v0.3.0 | U-062 | Let the turn go once an inline subagent has reported back (#452) |
| c9cdc577996efe71d33d321483521b9de6902004 | v0.3.0 | U-063 | Release v0.3.0 |
| c576783ac14a50a0998222146fd9838d85d52ffb | v0.4.0 | U-009 | Add Operator note writing support |
| 1dd1fc060310c3ca2453a5413ebd329c827e80ad | v0.4.0 | U-016 | Open several projects from one folder picker (#443) |
| 04da09f4c8417cbc7b326888ac5275255b017d15 | v0.4.0 | U-064 | perf: bound and cancel work across search hot paths (#462) |
| d836e225e3c8fd17d5602a1b2d2af8dc6107de78 | v0.4.0 | U-017 | Paste a screenshot into the composer, and attach a copied file or folder (#479) |
| bef7c90bb9730f0af0bdb4cf5820c8a1070e38db | v0.4.0 | U-065 | Clear terminal on Cmd+K when App: Search is disabled or rebound (#491) |
| 76465752fb6cf255f416e6d57d7b4370779dd0b9 | v0.4.0 | U-010 | Show per-account usage and readiness in Settings and the footer picker (#492) |
| 4f6c17ea835a593a4003ebdfa63f2e13bcca7355 | v0.4.0 | U-066 | Let git find gpg when MonoCode is launched from Finder (#484) |
| daaa9537f395cacfc66ea7253139686efd3851b7 | v0.4.0 | U-018 | Support splitting new sessions into adjacent panes |
| 52640dcaa67cf1dd85f95b13d9742c8dbdbbfa1a | v0.4.0 | U-067 | Fedora rpm packaging (#362) |
| 312f781243a162922bbb509a1ebc143338db0d00 | v0.4.0 | U-010 | Cache provider rate limits across views and remounts |
| f8769ee103783b0e744685677874c19daa749f90 | v0.4.0 | U-068 | Disable persisted checkout credentials in release workflow |
| d4a1c5d63af35dceb472d72a34516d63b67da464 | v0.4.0 | U-019 | Add pi usage (#431) |
| fce518ce2e2f73b727d260d13e7d53b5c8e33be1 | v0.4.0 | U-009 | Add worktree management to agent app CLI |
| 158ce7803fe75e6b9297ffec0f7d638866d562cd | v0.4.0 | U-010 | Add rate limit polling intervals |
| 6b8376f95eef8275a79635665133941dc9294fd7 | v0.4.0 | U-069 | Keep Claude versioned models on their full native ids (#488) |
| 79ca3747d02b98dcc75243ebacec3ddf774a6749 | v0.4.0 | U-070 | Preserve unknown Claude model versions |
| 417168326a57615271ce6efcf24aa4c252d75ef5 | v0.4.0 | U-071 | fix(projects): keep project name visible in picker when parent path is long (#507) |
| 0bd994638ade391ccc99615bcf84eb6730641195 | v0.4.0 | U-020 | fix(codex): persist and render generated images (#399) |
| ec59d92edc2a37b16d7f74d016ee6687c92f188f | v0.4.0 | U-021 | Add `Cmd/Ctrl+Shift+C` to copy the explorer path (#404) |
| 38d8f587a252e8d0261c1ead88dca32f5af9bd81 | v0.4.0 | U-022 | Add plan and orchestrator turn celebrations |
| 7288fb6ebd1a27758eaec779d95b25797d214e17 | v0.4.0 | U-072 | Release v0.4.0 |
| 413d699a39436a03c6fc244f381c41eb3c71a680 | v0.4.1 | U-073 | Fix project rail reopening lag and release v0.4.1 |
| 9eebd8948a3b0d5268ac79d7c38a30cb5b3f9d76 | v0.4.2 | U-074 | Reduce startup and transcript UI performance costs |
| e3220ca6bc466022d3b0b3196fbc911b3fa10d54 | v0.4.2 | U-075 | Add performance regression guards and release v0.4.2 |
| 6ffc99589be087d16bb6d764afdc3502e5046750 | v0.4.3 | U-076 | Make startup regression test work on Windows and prepare v0.4.3 |
| 2515c1504d940456dc1df6565d0460b4f55c6b7c | v0.5.0 | U-023 | Add remote agent sessions with SSH setup for Windows, macOS, and Linux (#432) |
| 67ffc0b42d0e1411ec5402d2ebc971bab71dbb7e | v0.5.0 | U-077 | Publish updater feed after host release assets (#528) |
| 553b1a2235562a9e98dd9eeb9b94583d34c84f7e | v0.5.0 | U-078 | Wait for provider guard before Windows test cleanup |
| d8377d2df086a1d11f8a8d65c6caa61a33bee978 | v0.5.0 | U-079 | Improve automation card layout and accessibility |
| 6c4b1c660f15ace288fb6aede93eadafdb49de8f | v0.5.0 | U-080 | Prevent auto-scroll re-pinning when scrolling away from bottom |
| 52cc279957b624653595301896e7667ddc1711a7 | v0.5.0 | U-081 | Hold reader's place when turns above viewport resize |
| 70bb58691c084b34b04129c871a2e1f5c9f20180 | v0.5.0 | U-082 | Simplify turn removal handling in scroll anchor |
| 22358b5e4772b2f9e980204571ca9b780a65f019 | v0.5.0 | U-023 | Add remote access support for remaining providers (#539) |
| 1a3215d8f1d45207843da89383369ba8039664d2 | v0.5.0 | U-083 | Optimize app startup and batched harness updates |
| bf32549a991d90e718ec4d1b69910db7226a3067 | v0.5.0 | U-084 | Increase Windows integration test timeouts |
| a28a998573004532f689a75a5dd21c007142d692 | v0.5.0 | U-024 | Add Help menu links for website and GitHub |
| a7e1f3dfda1f565820a2043735b71e4b10673631 | v0.5.0 | U-025 | Allow canceling generated commit messages |
| b46230eec3d7854e414dd24135dad95db31e148f | v0.5.0 | U-085 | Prepare v0.5.0 release |
| 16e9fea62e697043fc5173b770a5708662f3c91e | v0.6.0 | U-026 | Add session ID copying to the sidebar |
| d0943b175237813722cf9403de7a9c675486480e | v0.6.0 | U-027 | Show remaining usage in provider meters |
| a04624faef8d9720d2160b4b4a83fb7d6cb8e309 | v0.6.0 | U-023 | Fix Windows host ACLs, PowerShell errors, and stale remote catalogs (#567) |
| af4c01df66b4e1172be8594b60fece51f1986ed6 | v0.6.0 | U-086 | Stop triple-click in agent replies from running to the end of the reply (#535) |
| 877ab2c91590730849b02b00661ba7291e0df36b | v0.6.0 | U-087 | Show one row per background subagent (#536) |
| dad02c13bb318dd77e5895e1f221e0c25c6d82e9 | v0.6.0 | U-088 | Fix launch crash on macOS 12 caused by empty Window menu (#509) |
| 41b0b8ea3b7ad7109bbb6ee3fa4277d2fd818bec | v0.6.0 | U-089 | Fix/claude subagent error output (#569) |
| c9892f0d84275810be50fff2ab61a8c1028af722 | v0.6.0 | U-090 | fix: highlight text and untagged code fence as js (#471) |
| 71fd1b54beca76bfb9f273af518352f9f3f32fcd | v0.6.0 | U-028 | Add configurable file editor autosave (#475) |
| 1595870fd7abce8fdfea1894f0202791aa02101f | v0.6.0 | U-029 | Add harness update detection and in-app update UI |
| cdc1441dc51e3709cd843e5c316608a123f323c6 | v0.6.0 | U-091 | Use dashboard icon for session sidebar toggle |
| adbe2dbd67251a1fecbb2cee2177bec54267736e | v0.6.0 | U-010 | Protect provider account emails until revealed |
| b4f5befbc27d148f08125a060980ea4a446d578d | v0.6.0 | U-092 | Fix interface scale breaking the UI while dragging (#559) |
| 0f71918063823bcf8dfcb128deebec4be65b60da | v0.6.0 | U-028 | Use fake timers before mounting the file editor |
| e691b4658cea8d1d80a5ea47be7cd3ad4abd23be | v0.6.0 | U-030 | feat(mcp): add provider-wide MCP settings and server modal (#458) |
| 2cfc17889a54897f6c52045a2aa305afffd5c200 | v0.6.0 | U-093 | fix(claude): show TaskCreate/TaskUpdate in the todo panel (#513) |
| 8bba3cc0ff2776e82e77937f3ee65b7b6d23ff1b | v0.6.0 | U-023 | Preserve host session creation timestamps |
| 1b39ceb95bff9f2b68a62f0753014885759044b6 | v0.6.0 | U-031 | Enable transparent glass on Linux in dark mode (#561) |
| 2cbd5067ebdcdbea2631bd6be433c7d621d66657 | v0.6.0 | U-031 | Preserve glass transitions for reduced-motion tabs |
| 1708c42dbc41b74d3f8bec568c3f0141bfdc4d03 | v0.6.0 | U-030 | fix(mcp): allow OpenCode 2 global timeout settings (#580) |
| fec434a00a5a1954cedd9243d30d46a7f051d492 | v0.6.0 | U-030 | Cache MCP settings and add project selection |
| 6e58a42064dd753de2b3ff2a56e651908f51ddd9 | v0.6.0 | U-023 | Normalize Unix bootstrap scripts to LF line endings |
| e322b7f0f070403d3730aea0c239a1a778aa56ba | v0.6.0 | U-030 | Cache MCP discovery and honor provider binary settings |
| 378adad9f5e5fb8ead308473f63057544e67085b | v0.6.0 | U-029 | Broadcast harness updates across windows |
| e833e83db2ce90b2c9dd5608ef817bf8613f21d6 | v0.6.0 | U-032 | Add mode commands (/plan, /orchestrator, /draft) |
| 48fe62a869658929025b0c67cb386b8a59a39d3e | v0.6.0 | U-094 | Prepare v0.6.0 release |
| 7ce63cb80e2afc48a170358f1d86381da238d802 | post-v0.6.0 | U-095 | Fix ARM64 Linux build: use libc::c_char for the ptsname_r buffer (#584) |
| 4e876a880d7cbd1f79fa8a124a05ce4d5e8ecfb1 | post-v0.6.0 | U-096 | Improve navigation responsiveness with idle preloading |
| 8fae56666a903bf1232828293e73df51f90d7578 | post-v0.6.0 | U-097 | Restore previous view after closing settings |
| fea2c0a5d08fc710bfa29b6f00de581f83a10303 | post-v0.6.0 | U-098 | Scope the Changes review to the section it was opened from (#582) |
| 5c00fe2a2ca829fb41da0cf83c282d93eb22771e | post-v0.6.0 | U-099 | Diff whole files line by line in the changes view (#590) |
| 4bb4a0007493cdd1bb1aef87fdd858c21e03c568 | post-v0.6.0 | U-100 | Fix chat bubbles overflowing narrow session panes (#575) |
| 36bb26c64393692d92144ff5dad834ae4d585c9a | post-v0.6.0 | U-101 | Recover Codex commands for bare Shell rows (#581) |
| a67e614fbed50524f2f8ea03d825fbdc43de1a1d | post-v0.6.0 | U-102 | fix(markdown): keep a document's lines on their own lines (#595) |
| 43aac9d216c323a7e04c9037eb0b251dd840cc7a | post-v0.6.0 | U-033 | Add cool animations for Effort selection in Codex (#516) |


## Manifest and platform evidence supplement

Verified by `git diff 3344bea 43aac9d -- package.json src-tauri/Cargo.toml src-tauri/capabilities/default.json vite.config.ts .gitattributes`:

- Rust additions: `toml 0.9.12`, `time 0.3` (parsing), `arboard 3.6` (wayland-data-control), `png 0.18`; rusqlite adds `hooks`; macOS adds `tauri-plugin-global-shortcut 2` and `NSPanel` to objc2-app-kit. No new frontend runtime dependency in package.json; dev additions `@types/node 26.5.0`, `esbuild 0.28.2`. Approval still needed before adopting them; registry provenance/security review Not checked in this analysis.
- Package scripts: `host:build`, `host:package`, `host`, `pretest:host`, `test:host`, `setup:linux:fedora`, `build:fedora`. Vite builds `index.html` and `quick-composer.html`. Tauri adds Linux rpm dependency declarations.
- Default capability adds `core:window:allow-set-theme`. No `quick-composer.json` capability exists (an attempted path read failed; do not invent it). Screenshot commands are platform-gated registrations, not evidence of a new capability file.
- `.gitattributes` adds `*.sh text eol=lf`; upstream CI changes Node host-build versions, rpm verification, host release packaging, release ordering and persisted checkout credentials.
- Exact new native registrations verified at `src-tauri/src/lib.rs @ 43aac9d`: remote_machines/remote_connect/remote_disconnect/remote_request and remote_ssh_begin/reconnect/poll/answer/cancel (:261); clipboard_file_paths/clipboard_image (:398); mcp_discover/mcp_add (:427); harness_latest_version/harness_update_check_claim/harness_update (:447). Quick composer init (:240–242) and its commands (:507–532) are macOS gated. Existing command lists must be unioned with local ACP/import/wallpaper registrations.
- Remote Windows source proof: `src-tauri/src/remote_ssh.rs:213,638 @ 43aac9d`; `host/windows.test.ts`, `host/windows-bootstrap.test.ts`, `host/windows-acl.ps1`. This verifies Windows implementation/tests exist, not successful live pairing.
- Verified: session_store migration sequence remains through 18, not a new v19 migration. New session JSON and summary fields still change stored shapes. Local v14 queue reconciliation must survive the weave.
- Source-review limits: all commit panels were read, but the panels deliberately sample declarations/guards, not every line of the largest changes. Complete new remote-host and MCP contract audits and live CLI-version compatibility are Not checked; stage 4 must retain these gaps. Commit ledger attribution is Verified mechanically; runtime Windows predictions remain Inferred.
- Verified doc disagreement: upstream CHANGELOG omits a 0.4.2 section; its 0.4.3 notes describe fixes whose source arrives in 0.4.2. The ledger follows Git boundaries: U-074/U-075 are 0.4.2 and U-076 is 0.4.3. New-feature counts do not duplicate later maintenance.
