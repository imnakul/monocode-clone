# Review — Add native Claude Code / Codex session

Branch: `nakul/windows-support-upstream-0.7.0`
Base: `147aea750718969dff37014dae24856d40cea2f3`
Created: 2026-10-06. Tier: Large (provider work).

## Idea

Replace automatic local-conversation folders with an explicit **Add session**
entry for Claude Code and Codex. Paste a local session ID or native resume
command, resolve it in the selected provider/account, and continue that exact
conversation. Do not summarize, copy context into a prompt, or create a new
provider conversation on failure. Keep MonoCode-created cloud-session access.
Antigravity and OpenCode are excluded.

## Research

- Existing `provider_sessions` discovery, validation, durable bindings and
  strict native-resume adapters already implement identity preservation.
- Existing native-history viewer reads provider JSONL as display-only blocks;
  it does not inject old messages into the next prompt.
- Migration's summary/composer seed is deliberately outside this flow.
- Claude Code local CLI conversations can be reopened in Claude Code Desktop
  on supported versions. Codex uses `thread/resume` on the same stored ID.
  Same local account/profile and session files are required in both apps.
- Another app must release the conversation's writer before MonoCode sends.
  Switching the active tab alone does not necessarily release Codex's writer.
- Public share links and cloud IDs are not proof of a locally resumable chat.
- Existing folders also expose MonoCode-created cloud sessions; preserve that
  access while removing automatic local history browsing.

## Plan

1. Add read-only native-ID lookup reusing backend root/profile validation.
2. Parse raw IDs and supported Claude/Codex resume commands without executing
   pasted input. Reject missing/ambiguous/foreign/cloud inputs clearly.
3. Reuse existing Modal, buttons and selectors for Add session; bind using
   `openProviderConversation`, including live-session deduplication.
4. Replace local rail folders with Add session; retain cloud-only navigation.
5. Reuse native-history loading, invalidate it when explicitly reopening a
   native chat, and check history reconciliation and request races.
6. Test lookup, parser, exact identity, error handling and UI integration.
7. Run full checks/build and document human signed-in desktop verification.

## Todos

- [x] Read repository agreement; preserve unrelated untracked merge documents.
- [x] Write spec before code.
- [x] Backend lookup and tests.
- [x] Input parsing and tests.
- [x] Add session UI and sidebar/cloud integration.
- [x] Native history/reopen edge-case verification.
- [x] Full automated gates and production build.
- [x] Fork register, changelog and manual checklist.

## Issues and fixes

- Provider-native history can omit images, tool payloads or compressed stores
  unsupported by the existing reader. Surface that limitation; native context
  still belongs to the provider, not the rendered transcript.
- Replaced first-turn cutoff in the rendered native view with turn-group
  reconciliation: keep rich local turns, insert external turns by timestamp,
  and match phone turns by stable native identity. Prompt text plus time
  are required for ordinary local-turn matching; close but different prompts
  and repeated text on another day must stay visible. Ambiguous undated native
  records are retained rather than falsely suppressing a distinct prompt.
- Reload and earlier-page requests have generation identities so an older
  response cannot overwrite a freshly reopened conversation.
- First Rust compile caught a connection-guard coercion error in the new
  lookup; using an explicit guard fixed it. Targeted Rust tests then passed.
- User explicitly requested no push on 2026-10-06: another agent is working
  on this branch. Leave this task's changes local and uncommitted as well.
- Additional edge review found the production Operator wrapper is appended
  after the user prompt (`<monocode_app>`). Recognize that suffix when matching
  displayed native history so the saved local turn/answer appear only once.
  This is display deduplication, never a send/replay transformation.
- A second full gate hit the unchanged Linux process cleanup test
  `harness::tests::kill_all_reaps_term_ignoring_children_before_return` once.
  The first full gate, isolated rerun and subsequent full Rust rerun passed.
  No `harness.rs` changes were made for this task.
- Windows native metadata can use backslashes while MonoCode saves slash
  paths. Exact string comparisons could reject restore/resume or miss an
  existing chat. Lookup/binding and frontend live/save/send checks now compare
  project identity, preserving original paths and provider/account checks.
  Drive roots, UNC, case, separators and distinct Unix paths are tested.

## Learnings

- New flow reuses strict adapters/bindings, not Migration's composer summary.
- Local discovery is no longer mounted at startup/focus; metadata is scanned
  only on explicit Add session lookup. Cloud retention refresh stays separate.
- A currently busy matching MonoCode session is focused without rebinding or
  clearing its native-history cache.
- Native transcript rendering is a read-only view: text/tool names only,
  20,000 characters per message, existing bounded JSONL chunks and Show earlier.
  Images/thinking/full tool payloads and unsupported compressed stores are
  not reconstructed. History errors remain visible; provider-native context
  is preserved by resume even when the transcript reader is unsupported.

### Human Windows verification (separate follow-up)

Use this branch with `npm run tauri dev`. Do not drive the native UI from a
MonoCode implementation agent; AGENTS.md reserves this check for a human or
a separate desktop-capable Codex session.

1. In Claude Code and Codex, create a local chat and ask it to remember a
   unique phrase. Keep its native ID. Stop/exit the agent and release the
   conversation in the original app. For Codex, merely switching tabs may
   retain its writer; quit that app/process if needed.
2. In MonoCode's main rail, click Add session. Choose the original provider
   and matching local account. Paste its ID or `claude --resume <id>` /
   `codex resume <id>`. Confirm old text is visible (Show earlier if needed),
   original cwd is used, and composer contains no summary/seeded prompt.
3. Ask for the phrase without restating it; verify the provider recalls it.
   Copy native ID from MonoCode's existing session menu and compare it with
   the original. Repeat Add session: one MonoCode session/tab identity only.
4. Close/release MonoCode's agent before reopening the same native ID through
   the provider CLI/Desktop app. Safest test is quitting MonoCode after its
   completed turn. Verify that reply and original context there. Add a new
   provider-app message, stop that agent, reopen in MonoCode and verify the
   later message appears once. Desktop must use the same local provider
   store/account and a version supporting these native conversations.
5. Try a wrong provider/profile, nonexistent ID, public URL and command with
   extra flags. Expect a clear error and no new provider chat. Test an
   archived MonoCode binding and a busy live match. If another app holds a
   writer, a send can fail; never retry as a fresh chat or kill the other app.
   Repeat after restarting MonoCode with a Windows drive-path project; confirm
   slash/case spelling differences still reuse the same native/MonoCode IDs.
6. With a MonoCode-created cloud record, verify the cloud row/icon and its
   existing actions remain. Without records, only Add session should appear.
   Confirm native folders and automatic local discovery are gone, and
   Antigravity/OpenCode selectors/resume and Claude RC still work normally.

### Automated validation

Final `npm run check` passed after the Operator and Windows identity fixes:
5,684 web tests / 523 files, TypeScript, Rust format, Clippy and 624 Rust tests
with two existing ignored. Cargo check passed during implementation. Earlier
targeted edge audit passed 282 tests covering native identities, single App
dispatch, Claude/Codex live protocol/Stop/resume, form and history; 45 additional
RC-control/submission tests passed. Windows regressions passed 27 web tests
across three files and all 15 Rust provider-session tests. Production build
after the final code changes passed (33.40s); diff check passed. Existing CSS
`::highlight` minifier and large-chunk warnings remain; no CSS was changed.

Reviewed: Add session sends no message itself, history never becomes a prompt
or composer summary, lookup failure never creates a native conversation,
strict resume verifies ID/profile/cwd before send and never falls back to a
fresh chat. Another application's active writer remains a provider error;
release it before retrying. Stop/restart retains native identity. Concurrent
form submits and stale history reads are guarded. Unknown native transcript
formats fail visibly and do not change the underlying provider context.

OpenCode Fast-mode question is research only; existing variant forwarding
and missing separate Speed setting are documented in
[validation handoff](../notes/native-add-session-validation.md).

## Done

Implementation, automated review and production build complete. Signed-in
desktop verification remains a separate human follow-up, per AGENTS.md.
Initially kept uncommitted/unpushed; the user has since authorized publication
with the remote work preserved, as tracked below.

## Remote synchronization — 2026-10-06

The user now authorizes preserving the remote work and pushing this feature
on the same branch. Remote advanced from `147aea7` to `eaedb3c` in six commits:
Task Manager week strip, focus-day history/timeline, board styling and toolbar
placement/spacing. Code paths do not overlap this implementation. Two docs
have text conflicts; both features also chose register ID L-70. Proposed
resolution: retain all entries, keep remote Task Manager at L-70 and renumber
native Add session to L-71. The user approved this resolution on 2026-10-06; all entries were
preserved and native Add session was renumbered to L-71.

Recovery copy: `/tmp/monocode-native-session-before-sync` (full dirty-file
archive, SHA-256 manifest, binary patch and overlapping-file previews).
Unrelated untracked upstream-sync documents are excluded from our commit.

- [x] Fetch and review remote commits; preserve a recovery copy.
- [x] Approve documentation conflict resolution; preserve both histories.
- [x] Integrate remote commits and this feature without force pushing.
- [x] Run combined checks/build and confirm incoming source files unchanged.
- [x] Push and verify remote hash/ancestry; retain Windows handoff.

Synchronization checkpoint: branch fast-forwarded to `eaedb3c`; our
non-overlapping files are restored from recovery stash `fff46de99c2f`.
All 25 incoming code/test files and 24 native-session code/test files match
their pre-sync SHA-256 snapshots. The two pre-existing untracked upstream-sync
documents remain untouched. Three documentation merge previews are prepared
outside the checkout; the user approved retaining both entries with Task
Manager L-70 and native Add session L-71 on 2026-10-06. Approved doc unions
were applied, preserving new upstream-0.8.0 planning records. Combined
`npm run check` passed: 5,710 web tests / 526 files, TypeScript, Rust format,
Clippy and 630 Rust tests (two existing ignored). Separate cargo check passed.
Production build passed in 32.16s with the same existing CSS minifier and
large-chunk warnings. Diff check passed. Implementation commit `8ac5bc0cddebff2496774a16a69f294c70cf41d8` was
normally pushed to `origin/nakul/windows-support-upstream-0.7.0`; remote hash
matched exactly. Remote Task Manager head `eaedb3c` remains its ancestor and
all incoming/native-session source SHA-256 checks passed. Separate signed-in
Windows tests remain pending. User approved creating 0.8.0 from this published
base next. Recovery archive/stash is retained; two unrelated untracked
upstream-sync documents were excluded and remain untouched.

## 2026-10-06 follow-up — Find native conversations

User requested an explicit Find picker instead of requiring a pasted session
ID or restoring automatic provider folders. Implement on the active
`nakul/windows-support-upstream-0.8.0` branch after shared merge repair.

- Use the existing Add session Modal, provider/account selectors, session list
  rows, search/filter controls and Show more button. Choose Claude Code/Codex,
  click Find, then select a conversation and resume its exact native ID.
- Discover read-only from the selected account's local provider session files,
  the same source used by native resume pickers. Do not start an interactive
  `claude --resume`/`codex resume` process just to list chats: those commands
  can claim the native writer. Native resume itself remains unchanged.
- Show provider title where available, otherwise a useful first user message;
  never invent a title from an assistant reply or show an internal wrapper.
  Show project and correct local activity age with absolute timestamp tooltip.
- Keep search/project/archive filters supported by the current discovery API,
  ten-row initial paging and request-staleness/error handling. Show missing
  folders/accounts and read errors honestly; no scan until Find is clicked.
- Preserve same account/project identity checks, existing-live identity reuse,
  busy guards, display-only history and no fresh-chat/summary fallback.
- Test discovery title/time handling, explicit Find, filtering/paging, stale
  provider/account responses and one native resume per selection. Human Windows
  checklist: recognizable names/ages against native provider picker, select an
  older chat, resume once, then close the writer before returning via provider app.

Status: implemented on the 0.8.0 branch; final merge gate passed (6,268 web,
661 Rust with two ignored, TypeScript, format and Clippy), and cargo check/build
passed. Publication is tracked in the upstream sync spec. Uses the existing list and modal. Find
starts no native process; full-result name/ID/folder search and project
filtering run before paging, with archived visibility in the existing list
filter. Provider/account changes invalidate prior results. Native timestamps
stay in seconds until the existing card formatter converts them once; Codex
metadata with updated_at_ms is normalized on read. No migration, seed prompt
or fresh-session fallback was added.

Verification: nine dialog tests cover manual ID, explicit Find, pagination,
stale reads, discovery failures and wrong-account selection. Native Rust
discovery has eighteen tests, including full-result filtering, original
names, Windows project identity and millisecond metadata. Shared App dispatch
regressions now also cover Stop during source validation. Human Windows
checks remain separate: compare names and ages with CLI pickers, resume an
older chat once, and close the active writer before returning via provider app.
