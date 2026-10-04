# Review — Provider lists, reversible Operator and phone transcript streaming

Created: 2026-10-04 (IST).
Branch: `nakul/windows-support-upstream-0.7.0`.
Base: `c48060148b9505f2009c3b59fd12526acc4f8922`.
Tier: Large (provider event lifecycle, saved access state and session visibility).

## Idea

Show ten recent provider conversations initially, page older rows with the existing
Show more action, remove duplicate folder refresh buttons, retain cloud icons and
show honest per-chat Claude RC status. Add real Operator Off without deleting
history. Stream phone-started Claude turns into the same MonoCode chat while
preserving independent lifecycle/approvals. Investigate missing Session Manager
cards for the two screenshot sessions.

## Research

- Provider discovery currently requests 100 rows per account and merges all of
  them. Ten means ten total per provider, including multiple accounts; preserve
  cursors and merge ordering rather than losing undisplayed account rows.
- Folder and secondary-list refresh buttons duplicate the same refresh. Keep
  automatic discovery and the secondary-list control; remove the folder action.
- MonoCode-retained cloud sessions already have a Cloud tasks section/icon.
  User explicitly confirmed: only MonoCode-created cloud sessions for now.
  Other-device/account-wide cloud discovery stays out of scope.
- List summaries contain no RC state; local Claude panes already have the chip.
  Join native rows through MonoCode session mapping/current provider ID/account
  and use saved intent separately from confirmed live status (Paused after exit).
- Operator access currently derives from any saved activation turn, so hiding a
  pill does not revoke it. Add a persisted explicit override, preserving legacy
  behavior when absent, and enforce current turn grants at the backend boundary.
- The Claude adapter explicitly discards external-turn transcript activity and
  resolves phone completion independently. User has confirmed RC reaches phone
  and works, but no real stdout capture is available here. Live stream support
  must use native events and isolated external-turn lifecycle, with unit protocol
  coverage and honest manual phone verification remaining.
- Session Manager reads independent session_board_cards storage. Screenshot
  says Gemini directly inserted completed sessions into sessions/monocode.db
  instead of using the supported live session launch path. Board projection deliberately excludes idle history with no observed run
  outcome. Pinning is not consulted. Supported app/session-manager launch APIs
  create live workers and their run receipts; direct SQL inserts bypass them. Never
  invent a successful provider run or modify the user's unavailable Windows DB.

## Plan

1. Save this spec/index before source edits; preserve unrelated untracked notes
   and existing local features. Work on the same branch with existing components.
2. Implement ten-row aggregate paging across configured accounts; Show more
   retains order/dedup, handles refresh, failure/retry and stale results. Reuse
   the present list/button UI and keep MonoCode-created cloud task icons.
3. Remove only folder-inline refresh. Add compact RC labels to Claude list rows
   using confirmed connection state plus saved intent. Codex gets no false RC.
4. Persist an ordered system-block Operator override through existing JSON
   storage; legacy chats retain saved activation behavior. Off waits for any
   active local/phone turn, revokes the backend app grant, then saves the marker.
   New submissions cannot race the revocation. Re-enable with existing Operator
   controls. No SQL migration or changes to other permissions.
5. Route phone events separately from local submit-generation callbacks. Capture
   native user/assistant/tool activity and completion; deduplicate replayed blocks,
   persist real messages, isolate usage/busy/completion/approvals and queue waits.
   Do not resubmit phone prompts or manufacture an agent result. Handle process
   exit, disable, reconnect and delayed init. Verify actual CLI/phone behavior
   manually; do not claim tests prove the undocumented CLI wire format.
6. Diagnose Session Manager filtering, pinning, saved-session reconstruction and
   supported sessions.start/session_manager.start. Fix a verified visibility bug
   with regression coverage; show unknown outcomes honestly. Document why raw
   SQL insertion bypasses real launches and the supported path for future workers.
7. Run focused model/UI/protocol/storage tests and tsc; full npm run check, cargo
   check for Rust edits and production build. Attribute failures before changing.
8. Update local register/changelog/spec status, commit/push the existing fork
   branch and verify remote/ancestry. Hand over desktop/phone checks. No installer,
   browser embedding, computer-use/plugin runtime or ClickUp operations.

## Todos

- [x] Read repository agreement and initial source paths.
- [x] Save durable implementation spec and index.
- [x] Confirm final external-cloud discovery scope (MonoCode-created only).
- [x] Implement ten-row paging and list/refresh/RC polish.
- [x] Implement persisted Operator override and real access revocation.
- [x] Implement isolated live phone transcript events with regressions.
- [x] Diagnose Session Manager omission and add supported-launch guidance; no fabricated Done runs.
- [x] Run full gates/build and update records.
- [ ] Commit/push and verify publication; provide manual checklist.

## Issues and fixes

Source and targeted regressions are implemented. Two Composer read-only status
checks initially failed because the new title replaced their saved-status label;
the source preserves that label without an Off callback. Two new busy-turn
checks exposed the button ignoring its tooltip; corrected the source. These
were introduced by this task and all now pass in the full suite. The user's Windows DB/provider processes are not available
in this environment; screenshot statements are evidence of the reported path,
not proof those sessions ran. Native desktop inspection remains a human check
per AGENTS.md. Frontend design/SocratiCode tools are unavailable; reuse existing
components and repository searches as in preceding work.

## Learnings

Activation persistence, real permission revocation and the chip's appearance are
separate concerns. Phone-turn completion must never settle a MonoCode-submitted
turn; external tool activity must not inherit the previous turn's mutable state.

## Done

Current checkpoint: implementation and automated verification complete.
Full npm run check passed: 5,547 web tests / 511 files, strict TypeScript,
Rust fmt/Clippy with warnings denied, 612 Rust passed / 2 ignored.
Separate cargo check and production build passed; git diff check is clean.
Initial targeted coverage passed 183 tests / 9 files, then the final batching,
protocol and active-turn Off additions passed in the full suite. Seven focused
Rust control tests also passed. Commit/push and publication verification remain.
Unrelated untracked UPSTREAM-0.7.0 notes are preserved.

Phone events have independent saved boundaries, isolated stream/tool state,
UUID replay protection, batched application, native-history suffix dedup and
separate completion so a phone result cannot settle a waiting local follow-up.
Assistant-only activity gets an honest system notice until real user text arrives.

The two screenshot IDs were stored as histories by direct SQL. Source confirms
that idle histories without a recorded outcome stay off Session Manager. Pinning
does not change this. Operator instructions/CLI help now explain that agents must
use sessions.start or session_manager.start, never internal SQLite writes. The
user's actual DB was not accessed or repaired; existing analysis does not prove
a worker ran. A real subsequent launch can create a recorded board run.

## Manual verification (after automated gates)

- Pull this same branch and restart npm run tauri dev. Each enabled provider
  starts with ten local rows; Show more adds ten, refresh keeps the expansion,
  and the folder-inline refresh is gone while list refresh remains.
- Confirm retained MonoCode cloud tasks carry the cloud icon; provider-account
  cloud conversations created elsewhere are intentionally absent.
- Claude list rows show RC Off/Connecting/On/Paused/Failed as appropriate.
  Confirm actual On through the provider; saved intent alone must show Paused.
- In an existing RC chat, send from the phone: actual prompt, incremental reply
  and tools/approvals should update MonoCode. Queue a local follow-up; it must
  start after phone completion and never inherit the phone result. Close/reopen
  to check persistence and no earlier-history duplicate. Disable/exit RC during
  phone work to check cleanup. This CLI wire behavior remains unprobed here.
- Operator cross/menu Off works after a completed turn, stays disabled during
  local/phone work, persists after reopening and leaves old activation history
  intact. Normal follow-ups get no app access; explicit Operator re-enables it.
- For future task workers, use the app/session-manager start API and verify real
  running/result receipts and board cards; pin/unpin must not affect visibility.
