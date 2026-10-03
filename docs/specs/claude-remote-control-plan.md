# Draft — Claude Remote Control for MonoCode sessions — spec

- Tier: complex (async process control, persistence, a protocol change, turns started from another device)
- Branch: `nakul/windows-support-upstream-0.7.0` · Snapshot: `25cde00`, 2026-10-03 · Status: Draft
- Phases: **Phase 0** (Nakul, manual probe) → **Phase 1** (implementer, this spec) → **Phase 2** (written into this spec after Phase 0)

## Idea

Let a MonoCode Claude session be continued from the Claude phone app and claude.ai/code, while it stays live in MonoCode.
Both sides can send messages; MonoCode keeps running the session on this machine.

User story: "I start a Claude chat in MonoCode, turn on Remote Control, leave my desk, and keep steering it from my phone.
When I come back, MonoCode shows what happened."

## Research (2026-10-03)

### What exists, and what we may use

- The official rule we follow: MonoCode only drives the official `claude` binary. We never read the claude.ai login token
  or call Anthropic's private web API. Anthropic has said since 2026-02-19 that using subscription login tokens in
  third-party tools breaks their terms, and has blocked it since 2026-04-04.
- `claude --remote-control` (alias `--rc`) and `claude remote-control` (server mode) are documented, but only for
  **interactive** sessions and server mode (https://code.claude.com/docs/en/remote-control).
- MonoCode runs Claude headless: `-p --input-format stream-json --output-format stream-json`
  (`buildClaudeSpawnArgs`, `src/integrations/harness/providers/claude/claudeProtocol.ts:465-532`).
- The installed CLI (2.1.288) has a built-in, **undocumented** stream-json control request for this. Its own SDK client sends:
  `{ subtype: "remote_control", enabled, name?, reattach_session_id?, keep_session_on_exit?, work_secret? }`
  and reads a response shaped as
  `{ session_url, connect_url, environment_id, bridge_epoch, bridge_session_id }`.
  This is the path Claude Desktop uses for its own SDK-hosted sessions (source tag `remote-control-sdk` in the binary).
  It is not in the public Agent SDK reference, so it can change between CLI versions. Facts come from `strings` on the binary,
  not from a live run.
- A headless session cannot show the one-time Remote Control consent. The CLI then prints:
  "Remote Control asks for a one-time confirmation before it's first enabled, and this session can't show it.
  Run /remote-control from an interactive Claude Code session."
- Documented requirements: claude.ai subscription login (not an API key); `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`
  and `DISABLE_GROWTHBOOK` unset; on Team/Enterprise an Owner enables Remote Control; one Remote Control session per process.
  If the same conversation is resumed elsewhere while Remote Control is on, the CLI reports it "ended elsewhere".

### Why not watch Anthropic cloud sessions instead (answered for Nakul)

- Claude: the CLI can create a cloud session (`claude --cloud "task"`), send one message to it
  (`claude -p "msg" --cloud <id>`, JSON result `{ok, session_id, url}`), or teleport a copy into a local checkout with full
  history (`claude --teleport <id>`). Live attach (`claude --cloud <id>` without `-p`) answers
  "Attaching to an existing cloud session is not enabled for your account". No CLI command lists cloud sessions.
- Codex: `codex cloud` has `exec`, `list`, `status`, `diff`, `apply`. There is no live log stream and no follow-up message
  command; both are only requested in openai/codex issue #24777 (open, 2026-05-27).
  So Codex cloud tasks cannot be watched or steered live from MonoCode either.
- Other harnesses (Munder Difflin, Orca, T3 Code, Pi web tools, CloudCLI) solve "from my phone" by running the agent on a
  machine they control plus Remote Control or their own relay. Munder Difflin uses Claude's `/remote-control`.
  Only a 2-star reverse-engineered project (`claude-rc-api`) reads cloud sessions live, through the private API we will not use.
- Cloud start / open-by-link and Codex remote control are separate follow-up specs (see Out of scope).

## Scope (Phase 1)

1. A per-session Remote Control switch for **local** Claude sessions: on, off, status, link to open on the phone.
2. A one-time-consent error that tells the user exactly what to run.
3. The Claude process of a session with Remote Control on is not idle-parked.
4. Remote Control is turned back on automatically when MonoCode restarts that session's Claude process.
5. A turn started from the phone never corrupts MonoCode's own turn state (safe minimum; full rendering is Phase 2).
6. A global default in Settings: "Turn on Remote Control for new Claude chats".

## Out of scope

- Rendering phone-started turns live in the transcript (Phase 2, after Phase 0 findings).
- Remote hosts (`host/engine.ts` runs its own provider engine). Follow-up spec after Phase 1 works locally.
- Starting Claude cloud sessions or opening one by link (`--cloud`, `-p --cloud`, `--teleport`). Follow-up spec.
- Codex (`codex remote-control start|pair` is experimental; official phone setup targets the Codex desktop app).
- QR code rendering (Phase 1 shows the link with Copy and Open; a QR can follow).
- Starting Claude processes at app launch for sessions that had Remote Control on (see Decisions D4).

## Phase 0 — manual probe (Nakul, about 15 minutes)

Not an implementer task. It registers a real Remote Control session on Nakul's account and needs the phone.
Record every answer in the table below before Phase 1 starts. Phase 1 needs F1–F3; Phase 2 needs all of them.

1. One-time consent: run `claude` in any trusted folder, type `/remote-control`, accept, then disconnect from the panel and exit.
2. In a terminal in the same folder:
   `claude -p --input-format stream-json --output-format stream-json --verbose --permission-prompt-tool stdio | tee ~/rc-probe.jsonl`
3. Paste these lines one at a time (Enter after each):
   - `{"type":"control_request","request_id":"p1","request":{"subtype":"initialize"}}`
   - `{"type":"control_request","request_id":"p2","request":{"subtype":"remote_control","enabled":true,"name":"MonoCode probe"}}`
4. Open the `session_url` from the `p2` response on the phone. Send "say hi" from the phone.
5. From the phone: "create a file probe.txt with the word hi". Answer the permission prompt on the phone.
6. In the terminal paste: `{"type":"user","message":{"role":"user","content":"say bye"}}` and watch the phone.
7. Paste `{"type":"control_request","request_id":"p3","request":{"subtype":"remote_control","enabled":false}}`.
8. Separately try `claude -p --remote-control --input-format stream-json --output-format stream-json` and note any error.
9. Send `~/rc-probe.jsonl` (remove anything private).

| ID | Question | Answer |
|---|---|---|
| F1 | Did `p2` return `control_response` success? Exact keys in its `response`? | |
| F2 | Without step 1 (fresh machine or after revoking), what does `p2` return? Exact error text? | |
| F3 | Does `p3` (enabled false) succeed, and does the phone show the session as disconnected? | |
| F4 | For the phone's "say hi": which stdout lines appear, in order? Is there a `type:"user"` line with the text? Any field marking it as remote? | |
| F5 | For the permission in step 5: did stdout get a `can_use_tool` `control_request`, and then a `control_cancel_request` after the phone answered? | |
| F6 | Did the terminal's "say bye" (step 6) and its reply appear on the phone? | |
| F7 | Step 8: is `--remote-control` accepted with `-p`? | |
| F8 | After killing the process and starting again with `--resume <id>` and the `p2` request, is the phone link the same or new? | |

## Current behavior (confirmed in source at `25cde00`)

- Claude spawn arguments: `buildClaudeSpawnArgs` `claudeProtocol.ts:465` (`--permission-prompt-tool stdio` at line 488).
- Control request envelope: `buildControlRequest` `claudeProtocol.ts:534-544`; response parsing `parseControlResponse` `claudeProtocol.ts:565`.
- Live process state: `type Live` `claude.ts:165-225`. `ensureLive(input: HarnessSessionInput)` `claude.ts:563` starts or reuses a process,
  sends `initialize` and waits for it (`claude.ts:786-791`), then emits `session.providerBound` and `session.started`.
- `sendControl(live, request, opts)` `claude.ts:2222` sends any control request with a timeout (`CONTROL_TIMEOUT_MS` 5 s, `claude.ts:233`).
  `requestClaudeControl` `claude.ts:2309` only allows read-only subtypes (`READ_ONLY_CLAUDE_CONTROL_SUBTYPES` `claude.ts:2304`), so it cannot be reused.
- stdout handling: `handleLine` `claude.ts:874`. Control requests from Claude (approvals) are handled whether or not a MonoCode turn is active
  (`claude.ts:898-914`). Cancel requests resolve pending approvals (`claude.ts:881-896`). Turn end needs `live.activeTurn`
  (`claude.ts:2003`, `2119-2129`); `noteClaudeTurnStarted` returns early without an active turn (`claude.ts:2003`).
- Stop: `stopClaudeSession` `claude.ts:478`, `forgetClaudeSession` `claude.ts:505`.
- Idle parking: `HARNESS_IDLE_PARK_MS` 5 minutes `registry.ts:136`; `scheduleIdlePark` `registry.ts:194`, called after each send,
  compaction, rewind and cancel (`registry.ts:256, 281, 311, 337`). `stopHarnessSession` `registry.ts:376`.
  App also stops the process after a failed turn (`App.tsx:7616`, `7640`).
- Adapter interface: `HarnessAdapter` `registry.ts:61-128`; Claude's adapter object `claudeAdapter.ts:28`.
- Events: `HarnessEvent` union `core/types.ts:15`; reducer `applyHarnessEvent` `core/apply.ts:60`.
- Session persistence goes through the Rust session store (`sessionStore.ts:143` `persistableMeta`). Adding a field there needs a Rust schema change.
- Settings flags pattern: `loadClaudeHooks` / `saveClaudeHooks` `settings.ts:1187-1197`; UI row `SettingsView.tsx:4271-4283`.
- Session context menu: `sessionMenuItems` `Sidebar.tsx:1130`, handler near `Sidebar.tsx:1325`.

## Proposed behavior and invariants

- I1. MonoCode never reads, copies or sends the claude.ai login token. Remote Control is only turned on through the `claude` process.
- I2. Remote Control state shown in MonoCode comes from the Claude process (control response or process exit), never assumed.
- I3. While a session's Remote Control is on, its Claude process is not idle-parked. Turning it off restores normal parking.
- I4. A MonoCode turn is never ended by the `result` of a turn the phone started, and a phone turn never leaves MonoCode stuck busy.
- I5. Turning Remote Control on or off never interrupts a running turn.
- I6. The user's choice survives app restart; the live link does not (a new process gives a new link unless F8 says otherwise).
- I7. Only `harness === "claude"` local sessions show the switch. Remote-host projects (globe) hide it in Phase 1.

## States and transitions

Runtime status (in memory, per MonoCode session id): `off | connecting | on | needs-consent | failed`.
Desired choice (persisted): `boolean`.

| State | Event | Next | User sees |
|---|---|---|---|
| off | User turns on | connecting | Menu item shows "Connecting…"; switch disabled |
| connecting | Control response success with `session_url` | on | Status pill "Remote Control on" with Copy link / Open |
| connecting | Error text contains "one-time confirmation" | needs-consent | Notice with exact steps (UI copy below); desired stays true |
| connecting | Any other error or 10 s timeout | failed | Notice "Couldn't turn on Remote Control: <error>"; desired set false |
| on | User turns off | off (after success) | Pill removed |
| on | Process exits (any reason) | off, desired unchanged | Pill shows "Remote Control paused — reconnects when this chat runs again" |
| off with desired true | `ensureLive` starts a process | connecting | As above |
| needs-consent | User clicks "Try again" | connecting | As above |
| any | Session deleted or harness switched away from Claude | off, desired removed | — |

## Acceptance criteria

- AC-1 Given a local idle Claude session with a live process, when the user picks "Turn on Remote Control",
  then MonoCode writes exactly one `control_request` with `request.subtype === "remote_control"`, `enabled: true`, `name` = session title,
  and on success shows "Remote Control on" with the returned `session_url`.
- AC-2 Given a local Claude session with no live process, when the user turns it on, then MonoCode calls `ensureLive` first
  (same settings as the next send would use), then sends the request. No user message is written.
- AC-3 Given the request fails with the one-time-consent text, then status is `needs-consent`, the notice shows the exact copy below,
  and desired stays true.
- AC-4 Given status `on`, when the user picks "Turn off Remote Control", then MonoCode sends `enabled: false`; on success status is `off`,
  desired is false, and normal idle parking is scheduled if no turn is running.
- AC-5 Given desired true, when 5 minutes pass with no MonoCode turn, then the process is still running (no idle park).
- AC-6 Given desired true and status `on`, when the process exits, then status becomes `off` with the "paused" text, desired stays true,
  and the next `ensureLive` for that session sends the enable request again after `initialize`.
- AC-7 Given a MonoCode turn is running, when the user toggles Remote Control, then the control request is sent without waiting
  for the turn and the turn continues normally.
- AC-8 Given Remote Control is on and no MonoCode turn is active, when Claude emits a `system` `init`, `assistant` or `stream_event`
  line (a phone-started turn), then MonoCode marks `live.externalTurn = true`, emits one `status` event
  "Claude is answering a message sent from another device.", and emits no message deltas for that turn (Phase 1 minimum).
- AC-9 Given `live.externalTurn` is true, when Claude emits `result`, then `externalTurn` becomes false, one `status` event
  "The other device's turn finished. Reopen this chat to load it." is emitted, and no MonoCode turn state changes.
- AC-10 Given `live.externalTurn` is true, when the user sends from MonoCode, then `sendClaudeTurn` waits until the external
  `result` before writing the user message; the MonoCode turn then runs normally and ends on its own `result`.
- AC-11 Given an external turn asks for a permission (`can_use_tool`), then MonoCode shows the approval as it does today;
  if the phone answers first and Claude sends a cancel request, the MonoCode approval closes (existing path `claude.ts:881-896`).
- AC-12 Given the Settings switch "Turn on Remote Control for new Claude chats" is on, when a new Claude session sends its first turn,
  then Remote Control is requested right after `initialize` and before the user message is written.
- AC-13 Given app restart, when a session that had desired true is opened and runs, then AC-6's re-enable happens; no Claude process
  starts at app launch only because of this setting.
- AC-14 Given a non-Claude session or a remote-host project, then no Remote Control menu item or pill is shown.

## Ordering contracts

- Enable: `ensureLive` → wait initialized → `sendControl(remote_control, enabled true)` → on success set status `on` and emit event →
  persist desired true (already persisted when the user clicked). Ignore the response if `live.generation` changed meanwhile
  (process replaced); in that case the new process's own re-enable owns the state.
- Disable: set desired false → `sendControl(enabled false)` → status `off` → `scheduleIdlePark` if no active turn.
  If the process is gone, skip the request and set `off`.
- Re-enable after restart: inside `ensureLive`, after `waitForInit` and before returning `live`, if desired true then send enable.
  A failure here must not fail `ensureLive`; it only sets status `failed` or `needs-consent`.
- Rapid on/off/on: each user action increments a per-session `remoteControlGeneration`. A response is applied only if its generation
  is still current. The last action wins; the process may briefly enable then disable, which is acceptable.
- External turn vs MonoCode send: `externalTurn` is set only when `!live.activeTurn`. `sendClaudeTurn` awaits
  `live.externalTurnDone` (a promise resolved by the external `result` or by process exit) before writing.

## Implementation plan (Phase 1)

1. `src/integrations/harness/providers/claude/claudeProtocol.ts` (near `buildSetPermissionModeRequest`, line 391):
   - `buildRemoteControlRequest(enabled: boolean, name?: string): Record<string, unknown>` — omit `name` when empty; trim to 80 chars.
   - `parseRemoteControlResponse(payload: Record<string, unknown>): { sessionUrl: string; bridgeSessionId?: string } | null` —
     null when `session_url` is not an `https://` string.
   - `isRemoteControlConsentError(message: string): boolean` — true when the text contains "one-time confirmation".
   Pure; tests in `claudeProtocol.test.ts`.
2. `src/integrations/harness/core/types.ts`: add
   `| { type: "remoteControl.changed"; status: RemoteControlStatus; url?: string; message?: string }` and export
   `type RemoteControlStatus = "off" | "connecting" | "on" | "needs-consent" | "failed"`.
3. `src/integrations/harness/providers/claude/claude.ts`:
   - Add to `Live`: `remoteControl: { status: RemoteControlStatus; url?: string; generation: number }`,
     `externalTurn: boolean`, `externalTurnDone: (() => void) | null`, `externalTurnWait: Promise<void> | null`.
   - Module map `remoteControlDesired: Map<string, boolean>` filled by the adapter call below (the persisted list is owned by the app layer).
   - `export async function setClaudeRemoteControl(input: HarnessSessionInput & { enabled: boolean; name?: string }): Promise<void>`
     implementing the Enable/Disable contracts with `sendControl(live, buildRemoteControlRequest(...), { timeoutMs: 10_000 })`.
   - In `ensureLive` after `waitForInit` (`claude.ts:~791`): re-enable when desired.
   - In `handleLine`: before `noteClaudeTurnStarted` for `system/init`, `stream_event`, `assistant` (`claude.ts:946-989`), if
     `!live.activeTurn && live.remoteControl.status === "on"` then begin the external turn (AC-8) and return without emitting deltas.
     On `result` with `live.externalTurn` true, finish it (AC-9) and return before `handleResult`.
   - In `sendClaudeTurn` (`claude.ts:327`): await `live.externalTurnWait` before the write (AC-10).
   - On process exit and in `stopClaudeSession`: resolve `externalTurnDone`, set status `off`, emit `remoteControl.changed`.
4. `src/integrations/harness/core/registry.ts`:
   - Add optional adapter method `setRemoteControl?(input: HarnessSessionInput & { enabled: boolean; name?: string }): Promise<void>`.
   - `idleParkExempt: Set<string>`; `scheduleIdlePark` returns early for exempt ids.
   - `export function setHarnessRemoteControl(input & { harness }): Promise<void>` — runs outside `queueSessionOperation`
     (AC-7), updates `idleParkExempt`, calls the adapter, and on disable calls `scheduleIdlePark` when the session is not in `activeTurnSessions`.
   - `export function canHarnessRemoteControl(id: HarnessId): boolean`.
5. `claudeAdapter.ts`: wire `setRemoteControl: setClaudeRemoteControl`.
6. `src/features/settings/model/settings.ts` (next to `loadClaudeHooks`, line 1191):
   - `loadClaudeRemoteControlDefault()` / `saveClaudeRemoteControlDefault(value)` with key `monocode.claudeRemoteControlDefault`, default false.
   - `loadRemoteControlSessions(): Set<string>` / `saveRemoteControlSessions(ids)` with key `monocode.claudeRemoteControlSessions`
     (JSON array of MonoCode session ids). Decision D2 explains why not the Rust store.
7. `src/features/sessions/model/session.ts`: in-memory only fields on `Session`:
   `remoteControlStatus?: RemoteControlStatus; remoteControlUrl?: string; remoteControlMessage?: string`.
   `core/apply.ts`: handle `remoteControl.changed` by setting these three fields.
8. App wiring (`src/app/App.tsx`): pass desired state into the harness input before the first send (AC-12, AC-13); handle the menu action by
   building the same `HarnessSessionInput` the next send would use and calling `setHarnessRemoteControl`; remove the id from the
   persisted list on session delete and harness switch.
9. UI:
   - `Sidebar.tsx` `sessionMenuItems` (line 1130): item `remote-control` with label "Turn on Remote Control" or "Turn off Remote Control",
     only for single local Claude sessions; disabled while `connecting`.
   - A small status pill in the session header (reuse the existing header chip component used for branch or model; implementer locates it)
     showing the states below, with "Copy link" and "Open" (`openUrl` from the existing opener plugin).
   - `SettingsView.tsx` Advanced group (line 4271): a `Row` + `Toggle` for the global default.

## UI details

- Menu: "Turn on Remote Control" / "Turn off Remote Control". Description line: "Continue this chat from the Claude app or claude.ai".
- Pill states: "Remote Control on" (accent dot) · "Connecting…" · "Remote Control paused — reconnects when this chat runs again" ·
  "Remote Control needs a one-time setup" · "Remote Control failed".
- Consent notice: "Remote Control needs a one-time confirmation that MonoCode can't show. Open a terminal, run `claude`, type
  `/remote-control`, accept, then come back and click Try again."
- Failure notice: "Couldn't turn on Remote Control: <message>". Common causes line: "Check that you're signed in with a Claude
  subscription (not an API key) and that Remote Control is allowed for your organization."
- Settings row label: "Turn on Remote Control for new Claude chats". Description: "New Claude chats can be continued from the Claude app
  and claude.ai. The chat keeps running on this computer, so it must stay on and online."
- Accessibility: the pill's buttons have `aria-label` "Copy Remote Control link" and "Open Remote Control link".

## Skills to load

frontend-ui (menu item, pill, settings row), testing conventions from the repo.

## Test matrix

| AC or risk | Level | File | Scenario |
|---|---|---|---|
| AC-1, AC-3 parsing | unit | `claudeProtocol.test.ts` | request shape with and without name; response with and without `session_url`; consent text detection |
| AC-1, AC-2 | live adapter | `claudeControl.test.ts` (existing fake-process harness) | enable on live process writes one control request; enable with no process starts it and writes no user message |
| AC-4, AC-5 | registry | `core/registry.test.ts` | exempt id is not parked after send; disable schedules park when idle and not when a turn is active |
| AC-6 | live adapter | `claudeControl.test.ts` | exit sets `off` with desired kept; next `ensureLive` sends enable after `initialize` |
| AC-7 | live adapter | `claudeControl.test.ts` | toggle during an active turn: control request written, turn ends on its own `result` |
| Rapid toggles | live adapter | `claudeControl.test.ts` | on/off/on with deferred responses resolving out of order; final status matches last action |
| Generation change | live adapter | `claudeControl.test.ts` | process replaced before response arrives: stale response ignored |
| AC-8, AC-9 | live adapter | `claudeLive.test.ts` | lines with no active turn while on: one status event, no deltas; `result` ends external turn without touching MonoCode turn |
| AC-10 | live adapter | `claudeLive.test.ts` | send during external turn waits for its `result`; process exit also releases the wait |
| AC-11 | live adapter | `claudeLive.test.ts` | approval during external turn, then cancel request closes it |
| AC-12, AC-13 | app model | test beside the App wiring helper | default on: enable sent after initialize and before the first user message; app restart does not spawn |
| AC-14 | component | `Sidebar` test | menu item absent for Codex and for remote-host sessions |
| apply | unit | `core/apply.test.ts` | `remoteControl.changed` sets and clears the three fields |

## Verification

- Implementer runs: `npx tsc --noEmit`, `npx vitest run src/integrations/harness src/features/settings src/app/shell`, ESLint on changed files.
- Later (not the implementer): full `npx vitest run`, `npm run check`.

## Manual checks (Nakul, desktop and phone)

1. Turn on in a local Claude chat; open the link on the phone; send from both sides.
2. Leave it idle 10 minutes; the phone can still send.
3. Turn off; the phone shows the session ended.
4. Fresh machine without consent: the consent notice and Try again work.
5. Quit MonoCode with it on; reopen the chat and send; a new link appears.
6. Windows: no console window flashes when toggling.

## Facts, decisions, assumptions

Facts: everything in Research and Current behavior, with the noted exception that the control request shape comes from the binary, not a run.

Decisions:
- D1. Use the stream-json `remote_control` control request, not the `--remote-control` flag, because the flag is documented for interactive sessions only
  and the request is what the CLI's own SDK client uses. Revisit if F1 fails and F7 succeeds.
- D2. Persist the per-session choice in localStorage, not the Rust session store, to avoid a schema change for one flag. Lost only if local storage is cleared.
- D3. Phase 1 does not render phone-started turns; it only keeps state correct and tells the user. Rendering waits for F4.
- D4. No Claude processes start at app launch for this feature; on Windows that would spawn hidden processes at boot, and it may surprise users.
- D5. Remote-host projects are excluded until the local version is proven.

Assumptions (to be confirmed by Phase 0):
- A1. The enable response contains `session_url` (F1).
- A2. Phone-started turns produce normal stream-json lines on stdout (F4).
- A3. When the phone answers a permission first, Claude sends a cancel for MonoCode's pending request (F5).

## Open questions

- Q1 (Nakul): Should sessions with Remote Control on start automatically when MonoCode launches, so the phone works without touching the desktop? (D4 says no for Phase 1.)
- Q2: After Phase 0, should Phase 2 render phone turns live in the transcript, or reload them from Claude's transcript file when the turn ends?
- Q3: Keep the same phone link across process restarts using `reattach_session_id` (depends on F8)?

## Phase 2 (to be written after Phase 0)

Placeholder. Will cover: rendering phone-started turns, approval arbitration details, and link reuse across restarts.

## Todos

- [ ] Phase 0 probe answered (F1–F8)
- [ ] Phase 1 implemented
- [ ] Manual checks
- [ ] Phase 2 written

## Issues and fixes

## Learnings

## Implementer report format

Per AC: done / partial / not done with file:line or test name · deviations · open questions · checks run with results · files changed.

## Handoff retro

(Filled in after implementation.)

## Done
