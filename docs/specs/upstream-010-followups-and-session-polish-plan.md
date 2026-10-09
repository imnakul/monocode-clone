# Review — Upstream 0.10 follow-ups and session polish

Created: 2026-10-09. Tier: Large (upstream integration, provider support and session/task UI).
Working branch: `nakul/windows-support-upstream-0.10.0`.
Source base: `8ea88359bf7c1c14e2c8b7889e1fbcd71bef525f`, the published and remotely verified 0.10.0 snapshot.
Approved upstream target: `7d099eb8e1d3a544a9221cda66de251f25e6c4a0` (six commits after the prior pinned snapshot). Do not chase later upstream commits in this task.
Publication: this reviewed merge is approved for normal push to `origin/nakul/windows-support-upstream-0.10.0`. Recheck the live branch before pushing and report the verified remote SHA in the task handoff. Preserve the two untracked legacy specs `docs/specs/UPSTREAM-0.7.0-PROGRESS.md` and `docs/specs/UPSTREAM-0.7.0-SYNC.md`.

## Idea

Bring the six approved upstream commits after the published 0.10.0 checkpoint into the existing Windows branch, retain all local fork behavior, and deliver the requested task/session polish. Treat the upstream merge and the user-facing behavior as one reviewable follow-up. Keep Windows/provider desktop verification in the human handoff; no installer is requested.

## Research

- The current branch starts at the remotely verified `8ea88359` merge of upstream `416396c1`. The fork branch `nakul/windows-support-upstream-0.8.0` remains at `82907ac`; do not alter it.
- The approved next target is exactly `7d099eb8e1d3a544a9221cda66de251f25e6c4a0`. The six commits add Windows checkpoint/path/temp-directory repairs, collapsed-rail Mono pins, Devin CLI over ACP, selected-file Git context/commit support, and associated upstream changes.
- The read-only three-way preview from the previous pinned snapshot covers 83 paths: 17 additions and 66 modifications. It reports 24 content conflicts and one modify/delete conflict. These paths are now merged into the working tree with focused keep-both resolutions; no source path from the approved target was discarded. Temporary preview artifacts are under `/tmp/monocode-upstream-0.10.0-intake`; the previous intake report remains the durable record for the 204-path `416396c1` sync.
- Conflict paths: `host/child-backend.ts`, `host/process.ts`, `host/provider-transport.test.ts`, `host/providers.ts`, `host/server.ts`; `src-tauri/src/harness.rs`, `src-tauri/src/lib.rs`, `src-tauri/src/mcp.rs`; `src/app/App.tsx`, `src/app/shell/Sidebar.tsx`, `src/app/shell/UsageFooter.tsx`, `src/app/shell/UsageProviderChip.tsx`; `src/features/connections/model/protocol.ts`, `src/features/providers/model/rateLimits.ts`, `src/features/providers/model/rateLimitsCache.ts`, `src/features/sessions/model/models.ts`, `src/features/sessions/model/session.ts`, `src/features/sessions/ui/HarnessIcon.tsx`, `src/features/sessions/ui/ModelPicker.test.ts`, `src/features/settings/ui/SettingsView.tsx`; `src/integrations/harness/core/availability.ts`, `availabilityState.ts`, `child.ts`, `register.ts`; and modify/delete `src/integrations/harness/providers/antigravity/antigravityProtocol.ts`.
- The Antigravity modify/delete is not a missing addition from the previous sync: the fork already replaced that old provider implementation with `core/antigravity*`. For Devin, retain the incoming module only as a reusable ACP parser/helper if its API remains appropriate; retain the local Antigravity ACP core and CLI registrations, and do not restore or register a second old ACP provider.
- Keep all L-01–L-73 behavior, including the 0.8 base's task aliases/focus history, Settings Resume and compaction-summary hiding, startup provider check/Refresh all, and local provider/session controls. Conflict work must use focused unions and retain local behavior, not whole-file ours/theirs selection.
- User decisions: sidechats remain separate saved chats and appear in Chats after closing; they are not embedded in the source chat's messages. Keep the existing behavior of adding the latest source context on every sidechat send. Persist the source link and a bounded source-context fallback so a sidechat can reopen after its parent closes or the app restarts; do not resubmit old prompts or duplicate parent turns in the sidechat's visible history. Keep the real project cwd for tool access and existing cross-provider context transfer.
- User decisions: Markdown images are local-project-only. Resolve relative paths against the actual current project cwd carried in Markdown context, including Windows drive/backslash paths and URI encoding. Reuse the existing canonical project-file resolver, attachment preview and image lightbox; verify containment after canonicalization to reject `..`, symlinks or junctions outside the project. Keep alt text and the existing file link/action when a preview is missing or invalid. Allow only byte-sniffed image formats supported by the existing preview helper; do not treat SVG/HTML as images by extension. Do not broaden CSP or access to the whole filesystem, leak raw file URIs, or claim support for remote-machine images.
- User decision: the working-card close affordance belongs on busy project-conversation cards in the sidebar list. It only hides presentation for the current run and cannot stop, archive or delete a session. Keep the separate global live-agents widget unchanged. Use a stable active-turn/run key so a later run can appear again; do not persist dismissal across app restarts. For Claude RC, use `busy || externalTurnId` for presentation while preserving local queue, stop and auto-resume guards.

## Plan

1. Merge only the pinned `7d099eb8` target with `--no-commit --no-ff`; resolve the 25 preview conflicts under the approved keep-both contracts below and record any changed outcome.
2. Register Devin across exhaustive HarnessId maps, host/native launch and protocol, usage/MCP/settings surfaces while retaining local Cline and Antigravity ACP plus CLI. Account profile support remains Claude/Codex only. Preserve `devinAskEdits` after `codexStore`, strict Mono-only Codex storage, and helper read-only/tool isolation.
3. Integrate selected-file Git context/commit while preserving regular commit behavior, editable-message cancellation and abort cleanup. Integrate collapsed-rail Mono pins while retaining local Tasks/session entries and actions. Keep Windows path, temp-directory, checkpoint and process-tree safeguards.
4. Implement the user polish with existing components: add a display-only close button to busy project-conversation cards, scoped to the current run; show one busy card without changing the global live-agents minimum. Add File > New task with all projects and scrolling, while leaving the Notes project-choice cap unchanged. Add New task inside the opened right TaskPeekPane. Ctrl/Cmd+Shift+Enter must flush pending editor autosaves, save the current task, create a blank task in the same project and focus its title; handle IME, reentrancy, in-flight saves, failures and repeated key events without losing or duplicating data. Keep the New task button in the existing TaskEditor header if it fits the current controls.
5. Give Claude Remote Control activity the same phone-working shimmer as normal activity using an explicit presentation predicate for an external turn; do not alter local turn submission, queue or auto-resume guards. Show actual model and effort metadata for RC and imported native Claude chats only when known; do not replace a user's selected future model with stale imported history or duplicate prompts. Wrap tool output and fenced code by default without changing exact Copy source, logical line numbers, highlighting/cache identity or streaming performance. Preserve diff/table/terminal horizontal behavior.
6. Set second-opinion chat title to `Second opinion — <source chat title>`. Keep sidechats as separately persisted chats listed in Chats, with parent linkage and bounded source-context recovery. Preserve source context on each send, use the original project cwd for tools, resume the sidechat's own provider identity, and do not replay old prompts into its visible history.
7. Render local-project Markdown images through the canonical project-file resolver, byte-validated attachment preview and existing lightbox. Reject traversal/out-of-project paths after canonicalization. Keep fallback alt text and the current file link/action when preview cannot load; do not accept remote URLs, arbitrary file URLs or unverified SVG/HTML.
8. Add focused regressions, then run `npm run check`, workspace `cargo check`, production build, host build/tests, and `node --test scripts/release-channel.test.cjs`. Use the Rust environment wrapper and concurrent-reaping subreaper. Attribute the known unchanged-base host Antigravity parity failure; do not expand remote AGY support as part of this work.
9. Update this spec, the changelog, SPECS index and local feature register where a new fork-only behavior warrants it. Audit L-01–L-73 as source preservation, automated coverage, and outstanding manual checks separately. Commit/push only after primary review and explicit go-ahead.

## Todos

- [x] Confirm repository guidance, working agreement, current branch/base and clean tracked source state.
- [x] Record the exact pinned target, conflict preview, product contracts and resolved user choices before source edits.
- [x] Merge the six approved commits without dropping any additions. The approved source range is applied in the current uncommitted working tree; no publication commit has been created.
- [x] Resolve the 25 preview conflicts under the approved keep-both provider, Windows, session and task contracts. Continue auditing preservation while integrating requested changes.
- [x] Complete and review the L-01–L-73 source-preservation audit, distinguishing retained source from automated and manual verification.
- [x] Add project-list working-card dismissal scoped to an active run; the global live-agents widget remains unchanged.
- [x] Add all-project New task choices with scrolling, TaskPeekPane New task, and save/flush-aware Ctrl/Cmd+Shift+Enter creation; focused task regressions pass.
- [x] Persist sidechats as separate chats with bounded source recovery, regular saved-chat selection/actions and provider identity; source lookup, fallback, duplicate, cancel, failure and single-submit regressions pass.
- [x] Use the source title for second-opinion chats (`Second opinion — <title>`).
- [x] Finish Claude RC activity/model/effort and imported native Claude model seeding; avoid stale effort and duplicate metadata.
- [x] Wrap tool output and fenced code without changing copy, line numbers or streaming behavior.
- [x] Add canonical project-scoped Markdown image preview/lightbox, including cache containment and invalid-path fallback.
- [x] Add focused regressions for the changed polish paths, including sidechat source lookup and task-save acknowledgement/recovery.
- [x] Run the full agreed validation matrix and document known environment/base failures.
- [x] Prepare manual Windows/provider handoff, update feature/changelog/archive records, and complete primary source review.
- [x] Publish this reviewed merge normally to the authorized origin branch; verify parentage and the remote SHA in the task handoff.

## Issues and fixes

The 25 preview conflicts and their approved resolutions are:

| Area | Paths | Required resolution |
|---|---|---|
| Host and provider process | `host/child-backend.ts`, `host/process.ts`, `host/provider-transport.test.ts`, `host/providers.ts`, `host/server.ts` | Add Devin host transport/provider support while preserving Windows hidden process creation, process-tree/job handling, remote/provider allowlists, local Cline and local-only AGY ACP/CLI identities. |
| Native runtime and registration | `src-tauri/src/harness.rs`, `src-tauri/src/lib.rs`, `src-tauri/src/mcp.rs` | Add Devin's native spawn/account/usage/MCP wiring. Keep `devinAskEdits` after `codexStore`; preserve strict Mono Codex store selection and helper isolation, existing provider registrations and Windows path/process protections. |
| App, sidebar and usage | `src/app/App.tsx`, `src/app/shell/Sidebar.tsx`, `src/app/shell/UsageFooter.tsx`, `src/app/shell/UsageProviderChip.tsx` | Add Devin and collapsed Mono pin behavior while retaining task/session sidebar controls, local provider UX and correct usage visibility. |
| Provider models and settings | `src/features/connections/model/protocol.ts`, `src/features/providers/model/rateLimits.ts`, `src/features/providers/model/rateLimitsCache.ts`, `src/features/sessions/model/models.ts`, `src/features/sessions/model/session.ts`, `src/features/sessions/ui/HarnessIcon.tsx`, `src/features/sessions/ui/ModelPicker.test.ts`, `src/features/settings/ui/SettingsView.tsx` | Extend exhaustive provider/model/settings maps for Devin; keep Claude/Codex as the only providers with account profiles and preserve local labels, settings, Cline and AGY behavior. |
| Harness availability and provider core | `src/integrations/harness/core/availability.ts`, `availabilityState.ts`, `child.ts`, `register.ts` | Add Devin availability and ACP launch while retaining the Windows process/identity gates and all local provider setup. The Antigravity modify/delete path is a utility reuse decision described in Research; never register duplicate ACP providers. |

If implementation reveals a contract conflict not covered here, stop that specific resolution and report the concrete behavior before choosing a product change.

The six-commit source merge is resolved in the current working tree. Conflict decisions and reasons are recorded in [the upstream merge archive note](../notes/archive/upstream-merge-2026-10-09-010-followups.md). The branch still has no merge commit; the pinned upstream commit is `MERGE_HEAD`.

Focused verification includes the final Claude-seed race suite (29 tests), standalone `tsc --noEmit`, and a standalone FilePane navigation rerun (9/9) after one transient blur assertion in an earlier overlapping full run. The final, non-overlapping `npm run check` passed with 6,728 web tests across 606 files, TypeScript, Rust format/Clippy, and 731 Rust tests (2 ignored). Workspace cargo check, production build, host build and release-channel tests passed. The host suite reports 111 passed, 1 failed and 5 skipped; its only failure is the unchanged assertion equating the remote-provider allowlist with every local provider, which conflicts with the intentionally local-only `antigravity-cli`. The Devin transport suite passed 14/14. Detailed logs are under `/tmp/monocode-upstream-0.10.0-intake/followups/`; see Verification results below. The remote branch remains at `8ea88359bf7c1c14e2c8b7889e1fbcd71bef525f`, matching the source base; the pinned upstream target remains `7d099eb8e1d3a544a9221cda66de251f25e6c4a0`.

## Learnings

- A clean textual auto-merge does not certify provider or Windows behavior. Audit identity, scope, lifecycle and process contracts explicitly, especially where new provider maps are exhaustive.
- Product choices are resolved: sidechats are distinct saved chats; Markdown images are limited to validated paths inside the active local project.
- Automated tests can cover resolution, state changes and safety rules, but native Windows launch/menus/provider behavior and visual spacing remain a separate human check.

## Verification results

- `npm run check` passed: Vitest 6,728 tests / 606 files; TypeScript; Rust formatting and Clippy with warnings denied; Rust tests 731 passed / 2 ignored. Log: `/tmp/monocode-upstream-0.10.0-intake/followups/full-check-final.log`.
- `cargo check --workspace` passed using the repository Rust environment wrapper. Log: `/tmp/monocode-upstream-0.10.0-intake/followups/cargo-check-final.log`.
- The native imported-Claude seed race regression passed (29 tests), standalone `npx tsc --noEmit` passed, and FilePane navigation passed 9/9 in isolation after a transient blur assertion during an earlier overlapping run. Logs: `/tmp/monocode-upstream-0.10.0-intake/followups/history-seed-race-final.log`, `tsc-seed-race-final.log`, and `file-pane-navigation-focused.log`.
- Production build and host build passed. The production build retains existing CSS highlight/minifier and large-chunk warnings. Logs: `/tmp/monocode-upstream-0.10.0-intake/followups/production-build-final.log` and `host-build.log`.
- Host tests: 111 passed, 1 failed, 5 skipped; Devin transport focused suite: 14/14 passed. The only host failure is the unchanged `REMOTE_PROVIDERS === HARNESSES` assertion, which includes local-only `antigravity-cli`; that test was not modified. Logs: `/tmp/monocode-upstream-0.10.0-intake/followups/host-test-final.log` and `host-devin-focused.log`.
- `node --test scripts/release-channel.test.cjs` passed 8/8. Log: `/tmp/monocode-upstream-0.10.0-intake/followups/release-channel.log`.
- One earlier concurrent full-suite run hit a transient FilePane blur assertion. Its isolated rerun and the final full run passed. Do not describe L-01–L-73 as runtime-tested solely because files were preserved or a suite passed.

## Manual Windows handoff

Native/manual checks remain outstanding. Checklist: Devin availability/launch and usage/settings; collapsed Mono pin with Tasks/session actions; Windows hidden child/process lifetime; all-project task menu selection and scroll; TaskPeekPane New task; shortcut save/create/focus behavior while fields are focused or composing; display-only working-card dismissal and one-card visibility; Claude RC activity shimmer and actual model/known effort; imported Claude model/effort; wrapped output with exact Copy and line highlighting; second-opinion title; sidechat persistence/native resume in Chats after parent closure and restart; local project image preview/lightbox, in-project invalid/unreadable alt+Open fallback, and out-of-project alt-only behavior; existing L-01–L-73 controls. Automated tests do not replace these checks.

## Done

Implementation, focused regressions, full automated validation, documentation updates and primary source review are complete. This merge is approved for normal publication; native Windows/provider checks remain outstanding.
