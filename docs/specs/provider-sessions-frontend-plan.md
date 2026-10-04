# Todo — Provider conversations, Remote Control and cloud UI handoff

Created: 2026-10-04 (IST). Branch:
`nakul/windows-support-upstream-0.7.0-provider-sessions-backend`.
Base: `9effbed3c2fc2e5945d98bb33dce0655e0bfcc3c`.
Implemented backend/source commit: `67eb8c4028ea87826bcb29ab80cb9a7a174ece7c`.
Backend: [implementation/checkpoint](provider-sessions-backend-plan.md).
Status: Review (frontend built; desktop/phone manual checks pending). Backend APIs
below are implemented on this branch; the UI wiring below is now built. Start from this branch, not the original 0.7.0 or
the separate upstream-latest branch.

## Idea

Use existing UI components to expose the backend built on this branch. This is
the next frontend agent's task, not part of backend implementation. Read
AGENTS.md/WORKING-AGREEMENT.md and load the frontend-ui/design skill first.
The requested skill is not installed here and its earlier Windows source is
offline; locate the user's skill in the frontend execution environment.

## Research

- `src/app/shell/Sidebar.tsx`: main rail/navigation and secondary session lists.
- `src/app/App.tsx`: session open/send/archive and shell/sidebar wiring.
- `src/features/settings/ui/SettingsToggle.tsx`: existing audible settings switch.
- `src/shared/ui/Toggle.tsx`: shared toggle outside Settings.
- `src/features/sessions/ui/HarnessIcon.tsx`: existing Claude/Codex provider marks.
- Existing shared icons, buttons, tooltips, Popover, Menu and header chips should
  be located/reused. SharedHoverHighlight supplies established hover behavior.
- Current QuickComposer and session composer flows, drafts, model/permission
  choices, Windows shortcuts and saved-prompt behavior must survive.

## Plan

### Main sidebar and secondary sidebar

When each provider is enabled, show a distinctive provider folder-style entry
for Claude/Codex below projects in the main sidebar, with provider mark and a
refresh icon at the far right. Selecting it opens its automatically discovered
local conversations in the secondary sidebar. Do not create per-project folders
or put all chat rows in the primary rail. No plus button in phase 1.

Load metadata automatically after the provider is enabled and on appropriate
app/refocus refresh; refresh explicitly on button click. Do not spawn an agent
during discovery. Preserve selected row/scroll during quiet refresh; stale
requests cannot overwrite the selected provider's list. Show loading/empty/error
states truthfully. Support pagination for large local stores.

Open a row through the native-resume controller. Reuse an existing MonoCode
session mapped to the same native source rather than duplicate it. Preserve the
original provider/cwd; use its models only. No migration wizard, replay or summary
transfer. Do not claim simultaneous control of another running client.

Archive/unarchive must use MonoCode-only visibility records and remain sticky
across refresh/restart. Do not archive/delete the original Claude/Codex chat.
Wire restored sessions back to their native source identity before sending.

### Claude Remote Control

Local Claude chats get a per-session RC on/off action/switch. No Codex/remote-host
RC control in this phase. Settings gets the existing SettingsToggle for
"Turn on Remote Control for new Claude chats" (default off). Preserve per-chat
overrides; defaults apply only to new chats. Do not start all enabled chats at
app launch. Desired choice is different from confirmed live connection status.

Use existing header chip/button/menu patterns for Connecting, On, Paused,
Needs setup and Failed. Copy link is optional UI utility; automatically opening
the phone or browser is not requested. Only display the URL actually returned.
Consent copy tells users to run `claude`, `/remote-control`, accept and Retry.
Display actual error reason; retry and on/off actions must not interrupt a turn.
Phone-originated work must not corrupt local busy/approval state. Complete the
account/phone probe and determine phase-2 live rendering before promising a
mirrored transcript.

### Normal versus Cloud

Add the execution choice to new Claude/Codex session creation using existing
picker/toggle/button patterns. Preserve normal Task/Session/Draft/Start flows.
Cloud submission calls the cloud launch API, not local `sendHarnessTurn`.
Record the returned ID/URL and display an existing cloud icon. No auto-open
browser/phone action. Select environment/branch where supported; unsupported
local model/options must not be silently advertised as honored in cloud.

Cloud session views show retained metadata and supported actions. Codex:
status/diff/apply/list where the installed CLI supports them; show why sending
a follow-up is unavailable. Claude: follow-up where capability checks allow;
teleport is explicitly unavailable in this backend and belongs to phase 2.
Do not fabricate live responses/status. Never show an always-empty chat
as a successful live cloud transcript. Requests retain failed/pending states.
Diff apply requires user action and clear dirty-checkout errors; no
automatic stash/reset/commit. Document any follow-up for full cloud attachment.

### Implemented API map (use these; do not rebuild provider transports)

| File / export | UI responsibility |
|---|---|
| `src/features/provider-sessions/model/providerSessions.ts` → `listProviderConversations(provider, options)` | Fetch metadata for each enabled provider and configured account; options: `accountId`, `includeArchived`, `limit` (default 100; max 500), `offset`. Merge by `key`, sort by `updatedAt` (epoch seconds). Continue using `nextOffset`. Render `diagnostics`, even when valid rows exist. |
| Same → `openProviderConversation(row, dependencies?, options?)` | Default dependencies use the real MonoCode session store, including pre-existing saved chats matched by provider native ID/cwd/account. Await, insert/reuse returned `Session` in App state, then open with existing tab/opening preference logic. Optional `findSession` should consult live/cache then `getSession`; `findNativeSession(row)` matches a live chat by exact `providerSessionId`, harness, cwd and account (including blank phone-only chats); `saveSession` must await `upsertNativeResumeSession`, not ordinary blank-chat persistence. Options allow a model from the same provider and runtime mode. No process starts until send/RC enable. |
| Same → `prepareProviderNativeInput(harness, input)` | Await before every native chat send, compact, rewind or RC enable path. Restores exact native ID after restart and checks account/root/original cwd. Pass returned input to existing registry API; do not ignore failure or retry as a fresh chat. It returns ordinary inputs unchanged when no native binding exists. |
| Same → `setProviderConversationArchived(key, boolean)` | Durable MonoCode visibility only. If a row has `monocodeSessionId`, synchronize existing MonoCode Archive UI/state with `setSessionArchived` as well; surface/reconcile partial failure. Never invoke the provider's own archive/delete command. |
| Same → `detachProviderConversation(sessionId)` | On actual MonoCode chat deletion, clear the native mapping (after existing stop/forget/deletion flow); keep provider files and sticky archive flag. Call `removeClaudeRemoteControlPreference` too for a deleted Claude chat. Closing a tab is not deletion. |
| `src/features/provider-sessions/model/remoteControl.ts` → `restoreClaudeRemoteControlPreferences(sessions)` | After adapters register, seed saved intent for restored/lazily loaded Claude chat identities. No process fan-out. Unknown/closed saved IDs are retained. Do not repeatedly reseed a running toggle request. |
| Same → `initializeNewClaudeRemoteControlPreference(session)` | Call once for a genuinely new local Claude chat, before its first send. Applies the saved global default (off initially). Do not call for discovered/resumed/cloud chats or hydrate existing chats. |
| Same → `changeClaudeRemoteControl(input)` | Per-chat on/off/Retry. Input is `HarnessSessionInput` plus `enabled` and optional `name` (title). Persists intent, validates native source and calls the existing adapter outside the normal turn queue. Catch/display errors. Consent preserves intent; current hard failures clear it. No user prompt is sent for enable. |
| Same → `persistClaudeRemoteControlEvent(sessionId, event)` | Route every Claude harness event here before the normal App event reducer, including auto-enable on first send and events after turn completion. Hard failures clear the saved preference; off/exit/consent preserve it. Use a session-scoped RC event callback rather than a callback discarded by `turnGen` on the next turn. |
| Same → `removeClaudeRemoteControlPreference(sessionId)` | Delete/harness replacement cleanup only; does not stop the child by itself. Existing `forgetHarnessSession` handles process cleanup. |
| `src/features/settings/model/settings.ts` → `loadClaudeRemoteControlDefault`, `saveClaudeRemoteControlDefault`, `loadRemoteControlSessions` | Existing SettingsToggle for default; saved set determines desired per-chat switch position. Re-read/update UI state when an action/event changes the set. Live state is distinct and transient. |
| `src/integrations/harness/core/registry.ts` → `canHarnessRemoteControl`, `setHarnessRemoteControl`, `syncHarnessRemoteControlDesired` | Lower-level adapter capability and control seams. Prefer the orchestration model above for persistence. RC is implemented only for local Claude. |
| `src/features/provider-sessions/model/cloudSessions.ts` → `probeCloudCapabilities(provider, cwd, accountId)` | Probe installed CLI help and render supported actions/reasons. Help support does not prove account eligibility or service access. Re-probe after CLI upgrade/account change; avoid probing repeatedly during render. |
| Same → `launchProviderCloudSession({provider, prompt, cwd, accountId?, environmentId?, branch?, signal?})` | Submit exactly once. Codex requires a configured environment ID, optional branch. Claude uses its configured cloud environment and rejects explicit environment/branch selection. Returns retained provider ID/URL and metadata. Treat as a cloud view, not a local Session/native binding. |
| Same → `listRetainedCloudSessions(provider, accountId)` | Restore MonoCode-launched cloud records after restart. Does not discover every account/cloud chat or give a live transcript. |
| Same → `runCloudSessionAction(record, action, options)` | Claude message or Codex status/diff/apply, when supported. Options: `message`, `signal`, `confirmApply`. `apply` requires explicit confirmation and checks `git_diff_index` for a clean checkout; no automatic stash/reset. Output is actual CLI text, not a normalized/live transcript. Teleport and Codex message reject with explanations. |
| Same → `fetchCodexCloudTasks(cwd, accountId)` | Optional provider task refresh via public CLI `cloud list --json`; result is `unknown`, validate its real CLI shape before rendering. No private APIs. |

### App integration sequence and failure handling

1. Keep `Sidebar.tsx` presentational. Hold provider/account page state and request
   generations in App/a small existing-style hook. Use provider enable/account
   settings already used by pickers. This library does not watch the filesystem;
   automatically list on enable/startup/focus and explicit refresh. Large listings
   can be paged. Missing provider dirs are a valid empty result; corruption and
   unsupported formats have diagnostics. Discovery scans local metadata without
   launching a CLI or rendering/importing transcript history. Native provider
   archive files remain discoverable; MonoCode's separate archive flag controls
   this list.
2. For row open, supply live-aware dependencies if needed:
   `findSession` checks `sessionsRef`/cache then `getSession`; `saveSession` awaits
   `upsertNativeResumeSession` and treats a null return as removal/failure. The
   default controller already does this against storage. Optional
   `findNativeSession` checks live sessions by all four identity fields;
   the controller rejects mismatches before claiming a binding. This reuses a
   still-open phone-only chat even if it has no locally saved user messages.
   Ordinary `upsertSession` refuses empty chats, so do not use it for the first
   metadata-only save. Keep
   `blocks` empty; native context remains in the provider. Inform the user that
   old transcript rendering is not loaded in this phase, although continuation
   uses original context. Do not insert a made-up user turn or summary.
3. In App's `sendTurn` closure around `sendHarnessTurn`, prepare the session
   input before dispatch. Apply the same boundary to compact/rewind and any other
   operation that opens a native session. Do not route these chats through
   `createNativeResumeSession`, handoff/wrap/summary fallback or migration. Pin
   original provider/account/project even while the MonoCode view has no user
   blocks; the existing empty-chat account switch must not retarget it. Reject
   an attempt to pass a fork and a strict resume together. A newly branched chat
   is a separate native fork, not a changed binding for the original row.
4. Attach RC events to a durable per-session callback using the existing App
   batched event dispatcher / `applyHarnessEvent`. The new event updates only
   `remoteControlStatus`, `remoteControlUrl`, `remoteControlMessage`; it does not
   set busy/finish a turn. Desired+off means paused/stopped; reconnect on an
   explicit Retry or the next normal send. RC enabled chats stay exempt from
   idle parking. Disabling restores normal parking; do not stop a running turn
   to toggle. Phone work is isolated from local results and sends wait for the
   phone-originated turn's result. Live mirrored transcript is out of scope.
5. Cloud mode bypasses local queue/handoff/send logic. Render its own retained
   record identity `{provider, providerAccountId, id}` using existing tab/view
   infrastructure and cloud icon. Never give `id` to local `--resume`/thread
   resume. No automatic browser/phone open. A cloud task can survive cancelling
   the local launcher after server creation; a timeout does not prove no task
   was started. Tell users to check the provider before retrying ambiguous
   failures. `CloudRetentionError` contains the already-started record/ID; offer
   retry of `invoke("provider_cloud_save", {session: error.session})` or copy ID,
   never submit a second launch to recover a local storage failure.
6. Keep read-only status/diff output separate from local files. Apply is an
   explicit action against the original checkout and configured account. The
   clean-tree check cannot prevent another process editing after the check;
   surface actual CLI apply errors. Do not promise local unsaved files, chosen
   model, permission mode or MCP setup are carried into cloud execution.

### Backend transport/storage details for debugging

Tauri commands are registered in `src-tauri/src/lib.rs`:
`provider_sessions_list`, `provider_sessions_set_archived`,
`provider_sessions_bind`, `provider_sessions_for_session`,
`provider_sessions_unbind`, `provider_sessions_validate_source`,
`provider_cloud_save`, `provider_cloud_list`. Prefer TypeScript services above.
The native key is JSON `[provider, canonical source root, native ID]`; treat it
as opaque. `provider_sessions_bind` also requires `cwd`.
Pass its `accountId` from the discovered row. Existing MonoCode metadata and
archive flags are reused by matching harness/native ID/cwd/account, before an
explicit provider visibility override. Bind re-checks the current saved rows,
so stale listing metadata cannot force a newly generated duplicate view.
`provider_sessions_for_session` returns `{key,cwd}` or null. New tables live in
MonoCode's SQLite database; provider JSONL/SQLite stores are opened read-only.
Default roots honor `CLAUDE_CONFIG_DIR` / `CODEX_HOME`; named accounts use
MonoCode's existing account-home resolution. Unknown future layouts are not a
promise; report diagnostics and test new fixtures rather than inventing rows.
The session-store lock is acquired only after filesystem scanning completes.

### Manual checklist (separate desktop/phone follow-up)

- Enabled-provider entries appear in the requested locations; automatic refresh
  works across projects/profiles without duplicates or selection/scroll loss.
- Stop/close the other local client, resume a real Claude and Codex chat, ask a
  question needing earlier context, and confirm the native ID did not change.
  Test a missing/deleted native conversation; errors must not start a fresh one.
- Archive/unarchive/restart keeps MonoCode visibility while originals remain in
  provider apps. Deleting a MonoCode view preserves the original provider files.
- Claude: enable without a user turn, consent/setup error and Retry, phone turn,
  approval/cancel, local send waiting for a phone turn, disable while busy, idle
  beyond two minutes, process exit and restart/reconnect. Real RC request and
  error formats are undocumented and still require this account/phone probe.
- Launch one cloud task per supported provider; verify retained ID after restart,
  no auto-open browser, Claude follow-up when CLI supports it, Codex unavailable
  message explanation, status/diff/explicit apply, dirty checkout refusal.
- Keyboard access, labels/focus, light/dark/wallpaper/compact layouts, and all
  existing Task/Session/Draft, prompt picker, MCP and provider/account features.

### Phase 2 (not part of this handoff implementation)

Plus button for adding an RC/cloud link; safe link parsing, resolve supported
IDs and explain unsupported attach paths. Claude cloud-to-local teleport.
Link reuse and full phone transcript rendering after real protocol findings.

## Todos

- [x] Locate/load frontend design skill; read backend checkpoint and APIs.
- [x] Provider navigation rows and secondary conversation list/refresh (`ProviderRail`, `ProviderConversationList`, `ProviderConversationStore`).
- [x] Native open/deduplication and MonoCode-only archive/unarchive wiring (`liveNativeDependencies`, `archiveProviderConversationRow`).
- [x] D. Read-only earlier history for opened conversations (`provider_sessions_history`, `NativeHistoryStore`, divider, Show earlier).
- [x] RC settings/per-chat controls and confirmed-status presentation (`SessionProviderStrip`, `remoteControlView`, Settings → Providers).
- [x] Normal/cloud creation (session composer) and cloud metadata/action presentation (`useCloudLaunch`, `CloudSessionDialog`, Cloud tasks section in the provider list).
- [x] Test races, errors, accessibility, existing composer/provider behavior (vitest: stale responses, dedupe, archive sync/rollback, RC states, launch-once, history parsing/paging/trim).
- [x] Run required gates (tsc, full vitest 5,455 / 500 files, build, cargo fmt, cargo test --lib 609); manual desktop/phone checks handed to the user.
- [ ] Remaining: QuickComposer Local|Cloud choice, a provider entry in the compact rail, Codex layouts without a JSONL rollout (history shows the reason), teleport/phase 2.

## Issues and fixes

Backend verified first: tsc clean, 1,619 focused web tests, 8 Rust provider_sessions tests; no backend bugs found.
Design notes and deviations:
- Provider entries live in `ProjectRail`; the list replaces the secondary panel through a `providerPanel` slot in `Sidebar` (same pattern as chat mode). The compact rail has no provider entry yet.
- Rows reuse `SessionCard` through a synthetic summary (native key as id, project folder in the model slot, epoch seconds converted to ms).
- RC events reach sessions through `routeRemoteControlEvent` (not turn-generation gated) from both the turn callback and the enable/retry callback; only RC fields change, never busy. New Claude chats take the saved default once before first send (`initializeNewClaudeRemoteControlPreference`), skipped for resumed/native chats and chats the user already toggled.
- Directive D replaced the "older transcript not shown" note. History is composed in `SessionPane` above `session.blocks`, trimmed at the chat's first MonoCode turn so continued chats never repeat turns; Branch/Sidechat/Second opinion/Handoff ignore history turns.
- The cloud task view is a modal dialog (no tab infrastructure for non-session views); Open in browser is an explicit click. Cloud launch lives in the session composer only.
- The first A+B commit was one commit because App wiring was shared.

## Learnings

RC describes local execution reachable from a phone; cloud is a different
execution target. Local archive is visibility metadata, not provider deletion.

## Done

Frontend implemented and automatically validated. Not marked Done until the manual
desktop/phone checklist above (plus the additions below) is run:
- Open a real Claude and Codex conversation: earlier messages appear under the "Earlier in Claude Code/Codex" divider, Show earlier works on a very long chat, a moved/deleted file shows a reason and resuming still continues the same native ID, continued chats do not repeat turns after restart.
- Cloud: Local|Cloud switch only on new Claude/Codex sessions; Codex requires an environment ID; one task per Send; retained task appears under the provider and after restart; no browser opens by itself; apply asks for confirmation and refuses a dirty checkout.
- Remote Control chip states, Retry after consent, Copy link only with a real URL; turning it on/off during a running turn does not stop the turn.
