# Upstream 0.8.0 conflict review — keep-both decisions approved

Approved by the user on 2026-10-06: “Yes, keep both as proposed” and
“Yes, publish both on 0.7.0 first”. The six groups and L-70/L-71 resolution
below are approved for implementation; new out-of-scope choices still require
questions. Forecast counts/commit IDs describe the read-only intake snapshot.

Read-only intake on 2026-10-06. Base fork `eaedb3c`; upstream `9ccfc09`
(Main equals v0.8.0). 38 incoming commits, 244 changed paths, 99 new paths.
Preview includes pending native Add session work: 46 conflicted files / 118
hunks. No working source or conflict resolution has changed. One Luna 6 Max
agent reviewed the semantic risks; primary inspected representative hunks.

## Recommended decisions

| Group | Upstream improvement | Local behavior to retain | Approved resolution |
|---|---|---|---|
| G1 — Chats, queues and storage | Mono streaming/outbox/completion notices, turn acceptance, paged transcripts, scrolling/render speed and storage indexing | Single complete prompt for ordinary/Operator sends, visible Stop and Queue/Steer, saved attachments/holds, cancellation and deletion guards, strict native identity/history | Integrate both through one guarded send path. Use the new queue component while keeping local edit/steer callbacks and durability. Keep Mono notification items separate from editable user prompts. Preserve native history as display-only and ordinary native resume without Mono summaries/rotation. Union schema fields/queries and migrations, retaining old databases and Mono pages. |
| G2 — Operator and Mono tools | Soul, memory, habits, cards, notes writes, assigned-project actions and completion reports | Operator task CRUD, Session Manager operations, worker/receipt-based starts, revoke-before-Off and retry idempotency | Add both API sets. Keep Mono ownership/project checks separate from existing Operator permissions; ordinary chats do not silently gain Operator access. Preserve existing controls, registration and launch workers. |
| G3 — Providers and approvals | Codex async questions and provider turn-ready/acceptance handling | MCP forms and server/tool approval scopes, current usage accounting, Plan/Stop guards, Claude RC phone routing, cloud defaults/actions and exact native resume/account/path validation | Weave lifecycle/events and async questions into current provider adapters. Do not auto-resend accepted prompts, replay imported history or fall back to a fresh chat on resume failure. Preserve Antigravity ACP/CLI and Cline registrations, dynamic provider-tab sizing and controls. Their dedicated source trees have no incoming changes. |
| G4 — Navigation and settings | Mono rail/title/details/settings, sidebar/worktree actions and picker changes | Existing Chat/Projects, tasks/automations/Session Manager, native Add session and retained cloud access, drafts, saved Prompts settings, Local/Remote/Cloud defaults and embedded tab strip | Add Monos alongside existing destinations. Keep menus visible by default, embedded manager tabs/one-close behavior and saved prompts. Mono title takeover applies only to Mono views. Do not reintroduce automatic native-conversation browsing. |
| G5 — UI, appearance and transcript controls | Mono bubbles/activity, diff accessibility palettes, light modals, macOS tint and scroll/render fixes | Shared gliding hover on the stable frame, wallpaper/menu effects and searchable opacity, existing provider/token/cost/footer quota displays and selection actions | Keep independent settings/styles and stable Popover surface contract; merge new radius/layering without removing the local wash. Retain transcript selection tools/history immutability and all usage metrics. |
| G6 — Other fixes and release metadata | Git/literal paths, worktree terminal cwd, Nerd Font glyphs, IME, notes drafts, Pi catalogs, skill cap and file-index fixes | Windows hidden processes/path checks, lazy terminals/cleanup, existing dependencies/build flags, Task week strip/history/Settings-style boards | Include all upstream new files/fixes and preserve existing safeguards. Proposed fork version `0.8.0-local1-upstream-sync` in all six locations. Task-week-strip dedicated sources are untouched by upstream; verify shared shell/CSS retains them. |

No whole-file ours/theirs picks. “Keep both” means merge the named behavior,
not concatenate two send handlers, storage queries or approval routes. Ask
again if repair discovers a behavior change outside these approved scopes.
Version naming, imports, dependency unions and test/moved-file repairs are
mechanical once the feature decisions above are approved.

## Prior task documentation decision

Keep remote Task Manager at L-70 and rename pending native Add session to L-71,
retaining every record/changelog/spec entry. Previous publication was awaiting
that unanswered question. Recommended sequence: finish that validated 0.7.0
publication, then branch from its new head for this 0.8.0 intake. This preserves
the prior request to have both native-session and Task Manager changes on 0.7.0.

## File-by-file forecast

Each row references the approved behavior groups above. Implementation remains
pending; the preview itself did not resolve source files.

| File | Conflict hunks | Groups | Proposed choice |
|---|---:|---|---|
| `Cargo.lock` | 1 | G6 | Keep both / weave; preserve named local guards and incoming additions |
| `Cargo.toml` | 1 | G6 | Keep both / weave; preserve named local guards and incoming additions |
| `package-lock.json` | 2 | G6 | Keep both / weave; preserve named local guards and incoming additions |
| `package.json` | 1 | G6 | Keep both / weave; preserve named local guards and incoming additions |
| `src-tauri/src/control_cli.rs` | 4 | G2 | Keep both / weave; preserve named local guards and incoming additions |
| `src-tauri/src/lib.rs` | 1 | G2/G3 | Keep both / weave; preserve named local guards and incoming additions |
| `src-tauri/src/session_store.rs` | 2 | G1 | Keep both / weave; preserve named local guards and incoming additions |
| `src-tauri/tauri.conf.json` | 1 | G6 | Keep both / weave; preserve named local guards and incoming additions |
| `src/app/App.tsx` | 19 | G1–G4 | Keep both / weave; preserve named local guards and incoming additions |
| `src/app/shell/ProjectRail.tsx` | 6 | G4 | Keep both / weave; preserve named local guards and incoming additions |
| `src/app/shell/SettingsRail.tsx` | 1 | G4 | Keep both / weave; preserve named local guards and incoming additions |
| `src/app/shell/Sidebar.tsx` | 7 | G4 | Keep both / weave; preserve named local guards and incoming additions |
| `src/app/shell/TitleBar.tsx` | 4 | G4 | Keep both / weave; preserve named local guards and incoming additions |
| `src/features/agent-app/model/agentApp.ts` | 2 | G2 | Keep both / weave; preserve named local guards and incoming additions |
| `src/features/notes/ui/NotesView.tsx` | 3 | G6 | Keep both / weave; preserve named local guards and incoming additions |
| `src/features/projects/ui/SearchableProjectPicker.tsx` | 1 | G4 | Keep both / weave; preserve named local guards and incoming additions |
| `src/features/sessions/data/sessionHistory.ts` | 1 | G1 | Keep both / weave; preserve named local guards and incoming additions |
| `src/features/sessions/data/sessionStore.test.ts` | 1 | G1 | Keep both / weave; preserve named local guards and incoming additions |
| `src/features/sessions/data/sessionStore.ts` | 3 | G1 | Keep both / weave; preserve named local guards and incoming additions |
| `src/features/sessions/model/messageQueue.test.ts` | 2 | G1 | Keep both / weave; preserve named local guards and incoming additions |
| `src/features/sessions/model/session.ts` | 2 | G1/G3 | Keep both / weave; preserve named local guards and incoming additions |
| `src/features/sessions/model/transcriptActivity.ts` | 1 | G1/G5 | Keep both / weave; preserve named local guards and incoming additions |
| `src/features/sessions/ui/AgentMarkdown.tsx` | 1 | G5 | Keep both / weave; preserve named local guards and incoming additions |
| `src/features/sessions/ui/AgentTranscript.test.ts` | 1 | G1/G5 | Keep both / weave; preserve named local guards and incoming additions |
| `src/features/sessions/ui/AgentTranscript.tsx` | 8 | G1/G5 | Keep both / weave; preserve named local guards and incoming additions |
| `src/features/sessions/ui/Composer.tsx` | 3 | G1/G3/G4 | Keep both / weave; preserve named local guards and incoming additions |
| `src/features/sessions/ui/MessageQueue.test.ts` | 1 | G1 | Keep both / weave; preserve named local guards and incoming additions |
| `src/features/sessions/ui/ModelPicker.tsx` | 1 | G3/G4 | Keep both / weave; preserve named local guards and incoming additions |
| `src/features/sessions/ui/SessionPane.tsx` | 5 | G1/G3/G4 | Keep both / weave; preserve named local guards and incoming additions |
| `src/features/sessions/ui/SessionReview.tsx` | 1 | G5 | Keep both / weave; preserve named local guards and incoming additions |
| `src/features/settings/model/appearance.test.ts` | 1 | G5 | Keep both / weave; preserve named local guards and incoming additions |
| `src/features/settings/model/settings.test.ts` | 1 | G4/G5 | Keep both / weave; preserve named local guards and incoming additions |
| `src/features/settings/model/settings.ts` | 2 | G4 | Keep both / weave; preserve named local guards and incoming additions |
| `src/features/settings/ui/SettingsView.tsx` | 5 | G4/G5 | Keep both / weave; preserve named local guards and incoming additions |
| `src/features/source-control/ui/GitChangesPanel.test.ts` | 1 | G6 | Keep both / weave; preserve named local guards and incoming additions |
| `src/features/terminal/ui/TerminalView.test.ts` | 1 | G6 | Keep both / weave; preserve named local guards and incoming additions |
| `src/features/terminal/ui/TerminalView.tsx` | 1 | G6 | Keep both / weave; preserve named local guards and incoming additions |
| `src/integrations/harness/core/apply.ts` | 3 | G1/G3 | Keep both / weave; preserve named local guards and incoming additions |
| `src/integrations/harness/core/registry.test.ts` | 1 | G1/G3 | Keep both / weave; preserve named local guards and incoming additions |
| `src/integrations/harness/core/types.ts` | 1 | G1/G3 | Keep both / weave; preserve named local guards and incoming additions |
| `src/integrations/harness/providers/claude/claude.ts` | 1 | G3 | Keep both / weave; preserve named local guards and incoming additions |
| `src/integrations/harness/providers/codex/codex.ts` | 3 | G3 | Keep both / weave; preserve named local guards and incoming additions |
| `src/integrations/harness/providers/codex/codexLive.test.ts` | 2 | G3 | Keep both / weave; preserve named local guards and incoming additions |
| `src/integrations/harness/providers/opencode/opencode.ts` | 2 | G3 | Keep both / weave; preserve named local guards and incoming additions |
| `src/shared/ui/Popover.tsx` | 2 | G5 | Keep both / weave; preserve named local guards and incoming additions |
| `src/styles/index.css` | 4 | G5/G6 | Keep both / weave; preserve named local guards and incoming additions |

## Validation and recovery

Run targeted regressions and full `npm run check`, cargo check and frontend
build after integration. Required extra assertions: one prompt per submit,
Stop during preparation, queued attachments across restart, exact native IDs
and no fresh fallback, RC phone duplicate events, scoped server approval,
Operator Off/re-enable, Mono versus ordinary-chat access, old DB migrations,
all upstream-added files and local provider/Task Manager registration.

Primary recovery archive/stash and read-only merge-tree previews are recorded
in [the tracking spec](../specs/upstream-0.8.0-sync-plan.md). Preserve both
parent histories; no force push. Native Windows UI, provider-account round
trips and phone RC are separate human checks under AGENTS.md.


## Implementation follow-through

All six approved groups are implemented and the full automated merge gate
passed. The original forecast above is retained as intake history. Current
file decisions, tests and publication are in the [merge record](archive/upstream-merge-2026-10-06-080.md)
and [tracking spec](../specs/upstream-0.8.0-sync-plan.md).
