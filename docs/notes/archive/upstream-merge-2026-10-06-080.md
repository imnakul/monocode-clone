# Upstream 0.8.0 merge decisions — approved keep-both integration

Date: 2026-10-06. Branch: `nakul/windows-support-upstream-0.8.0`.
Base: published 0.7.0 `2a35625`, followed by tracking checkpoint `dbb3264`.
Target: upstream Main/release `9ccfc094615aa3170c01ae77a44298aefacdc9de`.

The user approved G1–G6: “Yes, keep both as proposed”. They also approved
publishing Task Manager L-70 and native Add session L-71 on 0.7.0 first.
The 46-path / 118-hunk inventory below records the approved implementation
contracts. This table records the intake decisions; implementation and final automated
verification are completed in the checkpoints below. No whole-file side selection or
duplicate dispatch/query/approval route is authorized.

## File decisions

| File | Hunks | Approved integration contract |
|---|---:|---|
| `Cargo.lock` | 1 | Union dependency graph and local package version; keep vendored portable-pty resolution. |
| `Cargo.toml` | 1 | Upstream release base with local prerelease version; retain workspace/vendor exclusions. |
| `package-lock.json` | 2 | Preserve dependency graph and align both root versions with package.json. |
| `package.json` | 1 | Upstream 0.8.0 with local version; preserve Windows build scripts and all dependencies. |
| `src-tauri/src/control_cli.rs` | 4 | One action registry/help path for Mono Soul/memory/habits/cards plus Operator tasks and Session Manager. |
| `src-tauri/src/lib.rs` | 1 | Register Mono modules/commands once alongside local providers, MCP controls and native-session commands. |
| `src-tauri/src/session_store.rs` | 2 | Union metadata/schema/indexes and SQL bind/map order; preserve native/account/draft/automation fields and durable queue semantics. |
| `src-tauri/tauri.conf.json` | 1 | Align local version; preserve platform/window/build settings. |
| `src/app/App.tsx` | 19 | Integrate Mono lifecycle, hooks and controls into existing shell. Prepare context before one branch-aware submission; retain Stop generation, queues, RC, native resume, launch receipts and Operator revocation. |
| `src/app/shell/ProjectRail.tsx` | 6 | Add Mono rail while preserving navigation/compact hover, explicit native Add session and retained cloud access. |
| `src/app/shell/SettingsRail.tsx` | 1 | Keep Prompts and add Monos destinations in the settings union. |
| `src/app/shell/Sidebar.tsx` | 7 | Add Mono sidebar props/actions without removing Chat/Tasks/Session Manager, drafts or native/cloud controls. |
| `src/app/shell/TitleBar.tsx` | 4 | Mono title only on Mono views; retain embedded manager tabs, menu/default controls and pane close behavior. |
| `src/features/agent-app/model/agentApp.ts` | 2 | Union Mono tools/project selection with tasks and Session Manager; assigned-project guards for Mono, existing Operator permissions preserved. |
| `src/features/notes/ui/NotesView.tsx` | 3 | Keep sliding hover and local controls while adding incoming note draft/project behavior. |
| `src/features/projects/ui/SearchableProjectPicker.tsx` | 1 | Keep searchable local picker/hover and add Mono rows. |
| `src/features/sessions/data/sessionHistory.ts` | 1 | Keep local account/queue metadata in history alongside Mono paging metadata. |
| `src/features/sessions/data/sessionStore.test.ts` | 1 | Keep native binding, queue durability and local schema tests alongside Mono persistence coverage. |
| `src/features/sessions/data/sessionStore.ts` | 3 | Share ordered writes between native blank-history and Mono changed-suffix saves; retain account identity, durable attachments/hold reasons and safe restart state. |
| `src/features/sessions/model/messageQueue.test.ts` | 2 | Retain held/paused/cancel and attachment regressions; add upstream acceptance and Mono completion queue cases. |
| `src/features/sessions/model/session.ts` | 2 | One session/block/queued-message model containing local RC/native/account/hold metadata and incoming Mono/turn-ready fields. |
| `src/features/sessions/model/transcriptActivity.ts` | 1 | Combine Mono work status/activity and local usage/activity calculations. |
| `src/features/sessions/ui/AgentMarkdown.tsx` | 1 | Incoming render optimization with local selection/edit/transcript actions retained. |
| `src/features/sessions/ui/AgentTranscript.test.ts` | 1 | Retain local approval/usage/control expectations with incoming Mono/render cases. |
| `src/features/sessions/ui/AgentTranscript.tsx` | 8 | Add Mono bubbles/status and optimized turn rendering while preserving approvals, history immutability, selection and footer metrics. |
| `src/features/sessions/ui/Composer.tsx` | 3 | Use extracted queue component with local edit/steer hooks; keep Stop, Operator Off, prompts/cloud/defaults and one guarded submission. |
| `src/features/sessions/ui/MessageQueue.test.ts` | 1 | Keep local editing/steering callbacks plus extracted upstream component/completion cases. |
| `src/features/sessions/ui/ModelPicker.tsx` | 1 | Keep sliding hover and dynamic HARNESSES sizing with upstream picker changes and all local providers. |
| `src/features/sessions/ui/SessionPane.tsx` | 5 | Wire Mono transcript/composer alongside native history, RC/cloud controls and existing pane actions. |
| `src/features/sessions/ui/SessionReview.tsx` | 1 | Keep local diff actions with incoming accessible palette/render changes. |
| `src/features/settings/model/appearance.test.ts` | 1 | Retain local wallpaper/glass/menu defaults and incoming macOS/light appearance cases. |
| `src/features/settings/model/settings.test.ts` | 1 | Keep local defaults/prompts/experiments plus incoming Mono and appearance cases. |
| `src/features/settings/model/settings.ts` | 2 | Union Mono and local settings/defaults with unchanged ordinary-chat preferences. |
| `src/features/settings/ui/SettingsView.tsx` | 5 | Add Mono settings/palette choices without removing saved prompts, wallpaper/menu or provider execution defaults. |
| `src/features/source-control/ui/GitChangesPanel.test.ts` | 1 | Keep local full-row and deleted-file behavior; include incoming literal-path/staging cases. |
| `src/features/terminal/ui/TerminalView.test.ts` | 1 | Keep lazy start/cleanup expectations alongside worktree-aware terminal cwd cases. |
| `src/features/terminal/ui/TerminalView.tsx` | 1 | Use correct selected worktree cwd while retaining lazy terminal startup and cleanup. |
| `src/integrations/harness/core/apply.ts` | 3 | Combine Mono/acceptance event handling with isolated external Claude RC turns, usage and Stop lifecycle guards. |
| `src/integrations/harness/core/registry.test.ts` | 1 | Keep all provider/native/RC/usage regressions plus incoming Mono and turn-ready cases. |
| `src/integrations/harness/core/types.ts` | 1 | Union async questions/turn-ready contracts with local MCP forms/scopes and exact native resume metadata. |
| `src/integrations/harness/providers/claude/claude.ts` | 1 | Preserve RC external UUID/dedup routing and approval scopes while adopting upstream turn lifecycle behavior. |
| `src/integrations/harness/providers/codex/codex.ts` | 3 | Keep native identity/account, token accounting and MCP forms/server scopes; add async question lifecycle once. |
| `src/integrations/harness/providers/codex/codexLive.test.ts` | 2 | Retain server-scope/native/token tests and add upstream async question/turn-ready checks. |
| `src/integrations/harness/providers/opencode/opencode.ts` | 2 | Use one permission reply path with turn-ready behavior, preserving Plan/Stop and verified MCP server grants. |
| `src/shared/ui/Popover.tsx` | 2 | Incoming radius/layering with local stable-frame glass wash and shared hover contract. |
| `src/styles/index.css` | 4 | Union Mono/accessibility/scroll styles with wallpaper/menu/hover and Settings-style manager board surfaces. |

## Repairs and verification

- In progress: shared queue serialization and held-state preservation; native
  blank-history versus Mono suffix persistence; scoped Mono/Operator project
  authorization; one complete prompt per submission and one approval reply.
- All 99 incoming added paths are present at the initial merge checkpoint.
  Dedicated local feature manifest covers 70 files; all initially matched.
  Recheck both after repairs and inspect any intentional changes.
- Full gates, production build, final hash/ancestry and remote publication
  remain pending. Manual signed-in Windows/provider/phone checks are separate.

See [the tracking spec](../../specs/upstream-0.8.0-sync-plan.md) for recovery
paths, current ownership and the verification checklist.

## Implementation completion checkpoint

All source conflict markers have been removed and every file decision above
is implemented. Shared repairs were verified with targeted tests: queue
completion/optimistic metadata survives reload, held queues stay held, one
complete prompt is submitted, Stop during native validation prevents launch,
Mono tasks/board calls obey assigned projects, and Notes/table/terminal local
controls coexist with incoming rendering changes. Approval relay passes the
chosen MCP scope and has one reply path.

The authorized Find follow-up reuses the native dialog/list. A separate
provider_sessions_find command accepts structured filters while the existing
provider_sessions_list command keeps its IPC shape. All filters run before
pagination; no interactive CLI, provider write or prompt is used for discovery.
Codex updated_at_ms is converted to seconds once, preserving native title.

The 99 added paths are present. Three of the 70 dedicated protected paths
changed intentionally for Find (backend, tests and frontend API); all other
protected hashes match. Full final gates/push are still pending here; the
tracking spec is authoritative for the final publication checkpoint.


## Final validation checkpoint

Full required npm run check passed: 6,268 web tests / 576 files, TypeScript,
Rust format, Clippy (-D warnings), 661 Rust tests with two ignored. Cargo check,
production build and diff checks passed. The container requires a task-local
subreaper for unchanged process-group tests because PID 1 leaves zombie
orphans; production/test source remains unchanged. Extra host suite:
102 passed, five skipped, one pre-existing Antigravity CLI remote-provider
parity failure. See the sync spec for attribution and publication.


## Publication

Source merge `4589270762bbcd06f2185fecd8d4c9255e0dcaf3` was normally pushed to the new 0.8.0 branch
and remote-verified. Both upstream 9ccfc09 and published 0.7.0 base 2a35625 are
ancestors. The original 0.7.0 branch is unchanged. Publication/docs checkpoint
and outstanding human Windows/provider/phone checks are in the sync spec.
