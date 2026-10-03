# Done — Claude live model and permission changes — spec

- Workflow status: Done — set 2026-10-01 18:20 IST by Claude at close-out. Nakul reported build 0.1.55-local5-provider-fixes fine; per-check results weren't itemized, so the Manual checks section and its caveats stay as written. Pushed to the fork at `c2c8bf6`. Earlier status: Review — updated 2026-09-30 21:35 IST by Claude; see SPECS.md.
- Tier: complex · Snapshot: `9397898` on `nakul/windows-support` plus the retained uncommitted changes listed in the umbrella plan, 2026-09-30.
- Umbrella: [provider-daily-work-improvements-plan.md](provider-daily-work-improvements-plan.md), slice 2. Research: [claude-cold-resume-warning.md](claude-cold-resume-warning.md) (restart causes; no quota promise).
- Provider version verified: Claude Code 2.1.283 (native binary, embedded control schema).

## Baseline, dependencies and worktree
- Revised 2026-09-30 after the handoff review ([provider-spec-handoff-review-30sept.md](../notes/provider-spec-handoff-review-30sept.md)). Approved by Nakul 2026-09-30 (Todo); implemented through the combined batch prompt.
- Position in the batch: second of six (umbrella slice 2). Order: slice 1 approvals → slice 2 Claude live controls → slice 4 context → slice 3 native branch → slice 5 AI helpers → slice 6 forms. Implement and integrate one slice at a time: each slice is merged into `nakul/windows-support` and verified before the next worktree is cut.
- Prerequisite baseline: the `nakul/windows-support` commit that contains the umbrella baseline checkpoint and slice 1 (session-approval-scopes) integrated and verified. Nakul gives its SHA in the handoff prompt as `<BASELINE_SHA>`, and the checkpoint SHA recorded in the umbrella plan as `a65bd4e4b0c2742cd0fc54a4087358471efc3888`.
- Dependencies: Slice 1: keep its `--allowedTools` replay working on the restart fallback. This slice is the only owner of the shared Claude control transport (`sendControl`, `pendingControls`, `requestClaudeControl`, `ClaudeControlError`, `Live.generation`); slice 4 depends on it after review and integration.
- Verify before starting: `git -C E:\Developing\OpenSource\mono-clone cat-file -e <BASELINE_SHA>^{commit}` succeeds; `git -C E:\Developing\OpenSource\mono-clone merge-base --is-ancestor a65bd4e4b0c2742cd0fc54a4087358471efc3888 <BASELINE_SHA>` succeeds; `git -C E:\Developing\OpenSource\mono-clone merge-base --is-ancestor <BASELINE_SHA> nakul/windows-support` succeeds; the SPECS.md rows for slice 1 read Done. If any check fails, or either SHA is missing from the handoff, stop and report Blocked. Don't pick a baseline yourself.
- Worktree: once this spec is Todo, you are authorized to create this slice's worktree yourself, from the verified baseline only: `git -C E:\Developing\OpenSource\mono-clone worktree add E:\Developing\OpenSource\mono-clone-claude-live-controls -b feature/claude-live-controls <BASELINE_SHA>`. Run the storage check first; the worktree needs its own `npm install` (about 400 MB). Don't create any other branch or worktree. If the path or branch already exists, stop and ask.
- Local docs and profile: `docs/` is ignored by the committed `.gitignore`, and `.agents/` by `.git/info/exclude`, which every worktree shares. The new worktree therefore has neither. Read them by absolute path from the main checkout: `E:\Developing\OpenSource\mono-clone\docs\...` and `E:\Developing\OpenSource\mono-clone\.agents\PROFILE.local.md`. Write status, retro and changelog updates to those main-checkout files only. Don't copy them into the worktree; never `git add -f` them.
- Shared resources: don't edit source, run installs or write build output (`node_modules`, `dist`, Cargo `target`) in the main checkout or any other worktree. Leave `mono-clone-hari`, `mono-clone-remote` and the stashes untouched.

## In plain words
Today, changing the Claude model or permission mode in a chat quietly restarts Claude before the next message. That costs a few seconds and resumes the conversation from disk. After this change, a model or permission-mode change is applied to the running Claude process when it is safe, so the next message goes straight out. The earlier answers stay as they are. Thinking, effort and fast-mode changes keep today's restart; making them live is a separate, optional follow-up that stays off. When anything is uncertain or fails, MonoCode falls back to today's restart, so nothing is lost. This does not promise lower usage or a warm server cache. Under the hood, this slice also builds the one shared way MonoCode sends a control message to a running Claude process and waits for its answer; the context-breakdown slice reuses it.

## Storage-full hard blocker (mandatory)
Before installs, builds or large test runs, check free space on every required drive, including TEMP/TMP, caches and Cargo/build outputs. If storage is full, a write fails with ENOSPC, disk-full or insufficient space, or the verified space cannot support the operation, stop task work immediately. Do not retry, keep editing, relocate temp/cache/output directories or delete anything automatically. Safely cancel task-owned operations and preserve existing work. Report the affected drive/path, the measured space or error, the last completed step and the remaining work. Mark this spec and its index row Blocked only if that is safe to write; otherwise report Blocked without further writes. Resume only after space is restored and rechecked and partial outputs are assessed. Any cleanup needs Nakul's explicit authorization.

## Goal and user story
As a MonoCode user, when I switch Claude model or permission mode between messages, I want the change applied without restarting Claude, so that my next message isn't delayed and the conversation identity stays the same. If a live change isn't possible, the old restart must still work.

## Scope
1. The shared Claude control transport: `sendControl`, the per-process `pendingControls` map, and their response, timeout, cancellation and process-replacement contracts (see Shared control transport). This slice is its only owner. Later slices call it and must not reimplement it.
2. Live `set_model` for model changes and live `set_permission_mode` for runtime-mode and plan-intent changes, applied in `ensureLive` before the next turn.
3. Mismatch detection after a live model change.
4. Treat `ultrathink` as a prompt-only effort that needs no restart.
5. Thinking, normalized effort and fast-mode changes always restart, as today. `CLAUDE_LIVE_FLAGS_VERIFIED` is not added in this slice.

## Out of scope
- Changing settings in the middle of a running turn. The registry already serializes operations (`queueSessionOperation`, `registry.ts:93-109`), so settings apply at the next send, as today.
- Cold-resume warnings, keep-warm pings, quota or cost claims.
- Other providers.
- Any `update_settings` control request, which writes Claude settings files.
- UI changes beyond one status row on fallback or mismatch.
- The optional live effort, thinking and fast-mode probe and any live path for those settings. See Optional follow-up (not part of this handoff).

## Current behavior (confirmed in source)
- `sendClaudeTurn` (`claude.ts:178-203`) calls `ensureLive(input)` before queueing `runTurn` on `live.turns`. Registry sends are serialized per session, so `ensureLive` runs after the previous turn settles.
- `ensureLive` (`claude.ts:342-477`) reuses the child only when `cwd`, `settingsKey` and `planning` match. Otherwise it calls `stopClaudeSession` and respawns with `--resume <claudeSessionId>` when cwd and account match (`claude.ts:356-385`). The resume entry is deleted only on a cwd or account change.
- `settingsKeyFor` (`claude.ts:1415-1425`) folds account, model, raw effort, fast, thinking, context, runtime mode and hooks into one string (`claudeSettingsKey`, `claudeProtocol.ts:991-1009`). Any difference restarts, including `effort: "ultrathink"`, which `normalizeClaudeCliEffort` (`claudeProtocol.ts:138-149`) maps to no CLI effort; it is a prompt prefix applied in `buildClaudeUserMessage` (`claudeProtocol.ts:~159-196`).
- `launchOptions` (`claude.ts:1427-1466`):
  - `model: resolveClaudeApiModelId(native, context)`, `effort: normalizeClaudeCliEffort(effortRaw, native)`
  - `settings.alwaysThinkingEnabled` when thinking is `"true"`, `settings.fastMode` when fast is `"true"`, `settings.ultracode` for ultracode, `settings.disableAllHooks` when hooks are off
  - `permissionMode: "plan"` for plan intent, else `runtimeModeToPermission(runtimeMode)` (`claudeProtocol.ts:107`)
  - `buildClaudeSpawnArgs` adds `--allow-dangerously-skip-permissions` only for `bypassPermissions`.
- Control plumbing:
  - `nextControlId` returns `monocode_<n>` (`claude.ts:1403-1406`).
  - `buildControlRequest` (`claudeProtocol.ts:294-303`); `parseControlResponse` (`claudeProtocol.ts:326-~352`) returns `{requestId, ok, payload, error?}`.
  - `handleLine` treats every `control_response` as the initialize reply: `markInitialized(live); return;` (`claude.ts:589-592`). No response is matched to its request.
- Claude 2.1.283 control schema (embedded in the binary):
  - `set_model {model?: string | null, system_prompt?}`. The CLI's own description says some transports and older builds acknowledge success without applying the change.
  - `set_permission_mode {mode}`, where mode is `default`, `acceptEdits`, `bypassPermissions`, `plan`, `dontAsk` or `auto`.
  - `set_max_thinking_tokens {max_thinking_tokens?: int | null, thinking_display?}`. This sets a thinking-token limit. It is not the same setting as the `alwaysThinkingEnabled` toggle MonoCode passes at spawn, and nothing verified shows that one can stand in for the other.
  - `apply_flag_settings {settings}` merges into the flag layer. One handler path returns "not supported in this context (callback not registered)".
  - `get_settings` returns the effective settings.
  - Settings schema: `effortLevel: "low" | "medium" | "high" | "xhigh"`, `fastMode: boolean`, `alwaysThinkingEnabled: boolean`.

## Proposed behavior and invariants
1. A live switch is attempted only when all of these hold:
   - an existing live child and `live.initialized === true`
   - `live.activeTurn === false` and `live.turnEndPending === false`
   - `live.approvals.size === 0` and `live.questions.size === 0`
   - `live.manualCompaction === false`
   - same `cwd`, same provider account and same hooks flag
   - the only differences are in the live-switchable fields.
   Otherwise, today's restart path runs unchanged.
2. Live-switchable fields:
   - `model` (native id), when the normalized CLI effort, the ultracode flag and `context` are all unchanged
   - `runtimeMode` and `planning`, except any transition into or out of `bypassPermissions`, which restarts because it needs a spawn flag
   - raw `effort` changes whose normalized CLI effort and ultracode flag are unchanged (for example `ultrathink` ↔ none, or `high` → `max` on a model where both normalize the same). These need no control request at all.
   - `thinking`, normalized `effort` and `fast` are never live-switchable in this slice. Any change to them restarts.
3. Each control request goes through `sendControl` and waits for its own `control_response` with the matching `request_id`, with a 5-second timeout. Initialize keeps its own wait.
4. Any `ok: false`, timeout, write error or child exit during a switch falls back to the restart path within the same `ensureLive` call. The user turn is sent exactly once: `runTurn` runs only after `ensureLive` resolves.
5. After a successful switch, `live.settingsKey` and `live.planning` are updated to the new values. Nothing else on the live object is reset, so usage totals and the session id stay.
6. A live model switch never rewrites or regenerates earlier assistant messages.
7. If the first assistant message after a live model switch reports a `message.model` that is not the requested API model id, MonoCode emits one status row, and sets `live.settingsKey = "stale"` so the next `ensureLive` restarts.

### Key comparison
Replace the single `settingsKey` equality with a structured key. Keep `settingsKeyFor` for the string, and add:

```ts
type ClaudeLiveKey = {
  account: string; model: string; cliEffort?: string; ultracode: boolean;
  fast?: string; thinking?: string; context?: string;
  runtimeMode: RuntimeMode; planning: boolean; hooks: boolean;
};
```

`live.liveKey` is stored next to `settingsKey`. `planClaudeLiveSwitch(prev, next): { kind: "reuse" } | { kind: "switch"; steps: ClaudeSwitchStep[] } | { kind: "restart"; reason: string }` is a pure function in `claudeProtocol.ts`. Step types:
- `{ type: "set_model"; model: string }`, where `model = resolveClaudeApiModelId(next.model, next.context)`
- `{ type: "set_permission_mode"; mode }`, where `mode = next.planning ? "plan" : runtimeModeToPermission(next.runtimeMode)`

Step order: permission mode first, then model, so a failed model switch never leaves a permission change unapplied. If any step fails, restart; the restart applies every field from argv, so a half-applied state cannot survive.

### Shared control transport (owned by this slice)
This is the single implementation every slice uses to send a control request to a running Claude chat process. Slice 4 ([context-accuracy.md](context-accuracy.md)) depends on it as merged and reviewed here; it must not add a second copy.

```ts
// claude.ts
type PendingControl = { resolve: (payload: Record<string, unknown>) => void; reject: (error: ClaudeControlError) => void; timer: ReturnType<typeof setTimeout>; cleanup: () => void };
// Live gains: pendingControls: Map<string, PendingControl>; generation: number;
export type ClaudeControlFailure = "error" | "timeout" | "cancelled" | "stopped" | "write-failed" | "unavailable";
export class ClaudeControlError extends Error { readonly reason: ClaudeControlFailure; }
function sendControl(live: Live, request: Record<string, unknown>, opts?: { timeoutMs?: number; signal?: AbortSignal }): Promise<Record<string, unknown>>;
export function requestClaudeControl(sessionId: string, request: Record<string, unknown>, opts?: { timeoutMs?: number; signal?: AbortSignal; requireIdle?: boolean }): Promise<{ payload: Record<string, unknown>; generation: number }>;
```

Contracts:
1. **Request id and matching.** `sendControl` takes a fresh id from `nextControlId`, registers the pending entry in `live.pendingControls` before writing, then writes `buildControlRequest(id, request)`. In `handleLine`, a `control_response` is parsed with `parseControlResponse`. If its id is pending, the entry is removed and settled: `ok: true` resolves with the payload (`{}` when absent); `ok: false` rejects with reason `"error"` and Claude's error text. Ids that aren't pending are ignored. `markInitialized(live)` still runs for every response, as today.
2. **Timeout.** Default 5000 ms. On expiry the entry is removed and the promise rejects with `"timeout"`. A response that arrives later finds no entry and is ignored. Timers are cleared whenever an entry settles.
3. **Cancellation.** If `opts.signal` is already aborted, reject with `"cancelled"` without writing. If it aborts while pending, remove the entry, clear the timer and reject with `"cancelled"`. MonoCode sends nothing to Claude on cancel; a late response is ignored. The abort listener is removed on every settle.
4. **Write failure.** If the write throws, remove the entry and reject with `"write-failed"`.
5. **Process replacement.** `live.generation` is a number that increases for every spawned child (module counter). `pendingControls` belongs to one `Live` object. `stopClaudeSession` and the child-exit handler (`claude.ts:430-443`) reject every pending entry with `"stopped"` (message `"Claude Code stopped"`) and clear the map. A respawned child starts with an empty map, so a response from an old child can never settle a new request.
6. **Caller entry point.** `requestClaudeControl` looks up `liveByThread.get(sessionId)`. It never spawns or wakes a process. It rejects with `"unavailable"` when there is no live child or it isn't initialized, and, when `requireIdle` is true, when `activeTurn`, `turnEndPending`, `manualCompaction`, pending approvals or pending questions are present. On success it returns the payload and the `generation` of the process that answered, so callers can discard results from a replaced process.
7. **Allowed requests.** Callers may send only read-only subtypes (`get_context_usage`, `get_settings`) plus this slice's `set_model` and `set_permission_mode` from `ensureLive`. `update_settings` and `apply_flag_settings` are never sent.

`ensureLive` uses `sendControl` directly on the live object it is switching; other slices use `requestClaudeControl`.

## States and transitions
| State | Event | Next state | User sees |
|---|---|---|---|
| Idle live, model changed | Send | switching → sent | Message sends; no restart delay |
| Idle live, supervised → auto-accept edits | Send | switching → sent | Same |
| Idle live, → full access | Send | restart (today) | Same as today |
| Switching | `ok: false`, timeout or write error | restart (today) | One status row: "Claude couldn't switch live, so it restarted with the new settings." |
| Live with pending approval (not reachable through the send queue, but defended) | Send | restart (today) | Same as today |
| After a live model switch, mismatch | First assistant message | turn continues, next send restarts | Status row: "Claude answered with <actual> instead of <requested>. The next message restarts Claude with the selected model." |
| No live child (parked) | Send | spawn (today) | Same as today |

## Acceptance criteria
- AC-1 Given an idle, initialized live child on `claude-sonnet-4-6` with no approvals, when the next send selects `claude-opus-4-7` with the same effort, context, cwd and account, then MonoCode writes `{type:"control_request", request_id:"monocode_<n>", request:{subtype:"set_model", model:"<resolveClaudeApiModelId result>"}}`, does not call `stopClaudeSession` or spawn, and writes the user message only after the matching success response arrives.
- AC-2 Given AC-1, when the response for a different request id arrives first, then it does not resolve the `set_model` wait.
- AC-3 Given AC-1, when no matching response arrives within 5000 ms (fake timers), then MonoCode stops the child, respawns with `--resume <same claudeSessionId>` and `--model <new>`, emits the fallback status once, and writes the user message exactly once, to the new child.
- AC-4 Given AC-1, when the response is `{subtype:"error", error:"…"}`, then the same fallback as AC-3 runs.
- AC-5 Given runtime mode `supervised` → `auto-accept-edits`, then one `set_permission_mode` with `mode:"acceptEdits"` is sent and there is no spawn. Given plan intent toggled on, the mode is `"plan"`, and off returns to the runtime mapping.
- AC-6 Given a transition to or from `full-access`, then there is no control request; the restart runs as today (the argv includes or omits `--allow-dangerously-skip-permissions`).
- AC-7 Given a model change plus a normalized-effort change (for example `high` → `low`), then there is no control request and the restart runs as today, with the new model and effort in argv.
- AC-8 Given only `effort` undefined → `"ultrathink"` (both normalize to no CLI effort and no ultracode), then there is no control request and no restart; the next user message text carries the ultrathink prefix as today.
- AC-9 Given a context, thinking or fast change, a cwd change, an account change or a hooks change, then the restart path runs, byte-identical to today. The source contains no `CLAUDE_LIVE_FLAGS_VERIFIED`, `apply_flag_settings` or `set_max_thinking_tokens` usage.
- AC-10 Given a live model switch to API id X, when the first `assistant` record carries `message.model` Y ≠ X (ignoring a trailing `[1m]` suffix on X), then one `status` event is emitted with the copy above, and the next send restarts. When Y equals X, no status is emitted.
- AC-11 Given a live switch in progress, when the child exits, then the waiting request rejects immediately (no 5-second wait), and the restart path runs.
- AC-12 Given a `control_response` for `initialize`, then `markInitialized` still runs, and the pending-control map ignores unknown ids without throwing.
- AC-13 (transport, cancellation) Given `sendControl` with an `AbortSignal`, when the signal aborts before the response, then the promise rejects with `ClaudeControlError` reason `"cancelled"`, the entry and timer are gone, nothing further is written to stdin, and a later response with that id is ignored. Given a signal that is already aborted, nothing is written.
- AC-14 (transport, process replacement) Given a pending `sendControl` on child A, when A exits and a new child B spawns for the same session, then the A request has rejected with reason `"stopped"`, B's `pendingControls` is empty, B's `generation` is greater than A's, and a response line carrying A's request id delivered to B settles nothing.
- AC-15 (transport, timeout cleanup) Given three sequential `sendControl` calls that each succeed, then no timers remain (fake-timer count is 0) and the map is empty. Given a write that throws, then the call rejects with `"write-failed"` and the map is empty.
- AC-16 (caller entry point) Given `requestClaudeControl(sessionId, {subtype:"get_context_usage"}, {requireIdle:true})`: with no live child, it rejects with `"unavailable"` and spawns nothing; with an uninitialized child, `"unavailable"`; with an active turn or a pending approval, `"unavailable"` and nothing is written; with an idle initialized child, it writes one control request and resolves `{payload, generation}` with the answering child's generation.

## Ordering contracts
- `ensureLive(input)` → compute next key → `planClaudeLiveSwitch` → for `switch`, run the steps sequentially: for each, write the request, then await the matching response (a 5-second timer; child exit rejects) → on all ok, update `live.liveKey`, `live.settingsKey`, `live.planning`, `live.onEvent`, `live.runtimeMode` → return `live` → `sendClaudeTurn` queues `runTurn`.
- On any failure: record the reason → `await stopClaudeSession` (clears pending controls, rejecting them) → continue today's path from `claude.ts:364` → after spawn succeeds, emit the fallback status → return the new live.
- Stale work: responses whose id is not pending are ignored. Timers are cleared on resolve, reject and stop. `stopClaudeSession` rejects every pending control with `ClaudeControlError` reason `"stopped"` (message "Claude Code stopped").
- `pendingControls` lives on the `Live` object; a respawned child starts with an empty map, so a late response from the old child can't resolve a new request.
- `sendControl` order: aborted-signal check → register entry and timer → attach abort listener → write → await. Every settle path (response, timeout, abort, write failure, stop) removes the entry, clears the timer and detaches the listener before resolving or rejecting.

## Implementation plan
0. Storage check (see blocker). Then the baseline checks and worktree creation in Baseline, dependencies and worktree, and `npm install` in the new worktree. Confirm `git rev-parse HEAD` in the worktree equals `<BASELINE_SHA>` and `git status --short` is empty.
1. `claudeProtocol.ts`:
   - add `ClaudeLiveKey`, `claudeLiveKey(input, hooks)` and `planClaudeLiveSwitch`
   - add `buildSetModelRequest(model)` and `buildSetPermissionModeRequest(mode)`, returning the `request` bodies
   - leave `claudeSettingsKey` unchanged (the catalog and tests use it).
2. `claude.ts`:
   - `Live` gains `liveKey: ClaudeLiveKey`, `pendingControls: Map<string, PendingControl>`, `generation: number` and `expectModel?: string`.
   - Add `ClaudeControlError`, `sendControl` and the exported `requestClaudeControl` exactly as in Shared control transport. Export `ClaudeControlError` and the `ClaudeControlFailure` type too; slice 4 imports them.
   - In `handleLine`, replace the `control_response` branch with: parse via `parseControlResponse`; if the id is pending, settle it; always call `markInitialized(live)` (keeps today's init behavior).
   - `stopClaudeSession` rejects and clears `pendingControls`. The child-exit handler (`claude.ts:430-443`) does the same.
   - Add the switch branch in `ensureLive` before the restart block at `claude.ts:356`.
   - Set `expectModel` after a live `set_model`, check it in `handleAssistant` (`claude.ts:702`) and clear it after the first top-level assistant message.
3. Leave `compactClaudeContext` (`claude.ts:205-240`) on its own settings check; it calls `ensureLive` and benefits automatically.
4. Must not change: the initialize handshake, `bindClaudeSession` / resume seeding, the catalog probe in `claudeCatalog.ts`, the approval and question flow.
5. Don't add `CLAUDE_LIVE_FLAGS_VERIFIED`, `apply_flag_settings`, `set_max_thinking_tokens` or any probe script. That work is described under Optional follow-up and is not part of this handoff.

## UI details
No new controls. Status copy is exactly as in the state table. The status goes through the existing `{ type: "status" }` harness event.

## Skills to load
`testing`, `desktop-app`.

## Test matrix
| AC / risk | Level | File | Scenario |
|---|---|---|---|
| Key planning, AC-5–9 | unit | `claudeProtocol.test.ts` | Table over `planClaudeLiveSwitch`: each field change → reuse / switch steps / restart reason |
| AC-1, 2 | adapter | `claudeLive.test.ts` | Fake child: two sends with different models; assert written lines in order; out-of-order foreign response |
| AC-3, 4, 11 | adapter | `claudeLive.test.ts` | Deferred responses + fake timers; error response; child exit mid-switch; assert one spawn, one user message |
| AC-10 | adapter | `claudeLive.test.ts` | Assistant record with a mismatching `message.model` → status + next send restarts |
| AC-12 | adapter | `claudeLive.test.ts` | The existing init tests keep passing; a stray response is ignored |
| Double send | adapter | `claudeLive.test.ts` | Count user-message writes across fallback = 1 |
| AC-13–16 | adapter | `claudeControl.test.ts` (new) | Fake child and fake timers: abort before and during wait; exit then respawn with a stale id; timer and map cleanup; write throw; `requestClaudeControl` unavailable cases and success with generation |

## Verification
- Implementer runs: `npx tsc --noEmit`; `npx vitest run src/integrations/harness/providers/claude`; `npm test`; `git diff --check`. There is no ESLint config, so report lint as unavailable.
- Later (not the implementer): `npm run check:web`, a production build and the manual checks.

## Manual checks (Nakul or a desktop-access Codex session; not the implementer)
1. Claude chat: send, switch Sonnet → Opus, send again. The reply arrives without the multi-second restart pause, and the Claude session id in the session info is unchanged.
2. Switch Supervised → Auto-accept edits → Supervised between messages. The approval behavior follows each change.
3. Switch to Full access: expect today's restart; the conversation continues.
4. Toggle thinking or fast, or change effort: expect today's restart.
5. Switch to a model your account can't use: expect the mismatch or fallback status copy, and the chat keeps working.

## Facts, decisions, assumptions
- Facts: Current behavior above.
- Decisions:
  - Switch only at the send boundary and only when idle; the registry already guarantees the boundary.
  - Permission mode goes before the model.
  - Bypass transitions restart because the spawn flag is required.
  - Any doubt falls back to restart.
- Assumptions (unverified):
  - `set_model` success is a real switch on 2.1.283 stream-json. The mismatch check (AC-10) is the runtime guard.
  - `set_model` accepts the `[1m]`-suffixed id; context changes restart anyway, so only same-context ids are sent.
  - Headless `apply_flag_settings` support for `effortLevel` and `fastMode`: unverified. This slice doesn't use it.
  - `set_max_thinking_tokens` sets a token limit; whether it can stand in for the `alwaysThinkingEnabled` toggle is unverified, and this spec does not treat them as equivalent.
  - Whether Claude replies to a control request after MonoCode stops waiting for it (cancel or timeout): unknown. The transport ignores late replies, so either answer is safe. MonoCode sends no cancel message, because none is verified.
- Decision: this slice is the only owner of the control transport. Slice 4 depends on it being merged and reviewed, and must not implement its own.

## Open questions
- Not blocking: should the mismatch status also switch the model picker back? This spec keeps the picker unchanged.

## Implementer report format
Per AC: done / partial / not done, with file:line or test name · deviations and why · optional probe: "not part of this slice" · open questions · checks run with exact results · files changed · the manual checklist above as a follow-up.

## Optional follow-up (not part of this handoff)
A later, separately approved task may probe whether effort, thinking and fast mode can change on a live Claude process. Until then these paths stay disabled and always restart.
- The probe would spawn `claude` once. Its network and quota effects are unmeasured, so no one may describe it as free or offline.
- It would test `apply_flag_settings` for `effortLevel` and `fastMode` and read them back with `get_settings`. A read-back only shows that the setting was stored, not that the next turn uses it; a live turn check would be needed too.
- `set_max_thinking_tokens` is a thinking-token limit. It is not the `alwaysThinkingEnabled` toggle, and a probe result for one says nothing about the other.
- Any path that the probe doesn't verify stays disabled. A live path for a verified setting needs its own spec change and review.

## Handoff prompt
Use only after Nakul approves this contract, moves it to Todo and fills in `<BASELINE_SHA>` and `a65bd4e4b0c2742cd0fc54a4087358471efc3888`.

```text
Implement umbrella slice 2 of the provider batch: Claude live model and permission changes.

Spec: E:\Developing\OpenSource\mono-clone\docs\specs\claude-live-controls.md

1. Read, by absolute path from the main checkout (they are git-ignored, so the new worktree won't have them; don't copy them and never git add -f them):
   E:\Developing\OpenSource\mono-clone\.agents\PROFILE.local.md, E:\Developing\OpenSource\mono-clone\AGENTS.md, E:\Developing\OpenSource\mono-clone\docs\WORKING-AGREEMENT.md,
   E:\Developing\OpenSource\mono-clone\docs\changelog\CHANGELOG.md (then its Current numbered file), E:\Developing\OpenSource\mono-clone\docs\specs\SPECS.md,
   E:\Developing\OpenSource\mono-clone\docs\WINDOWS-CHANGES.md, then the spec above.
2. Baseline: <BASELINE_SHA> on nakul/windows-support, containing the umbrella baseline checkpoint and slice 1 (session-approval-scopes) integrated and verified.
   Checkpoint: a65bd4e4b0c2742cd0fc54a4087358471efc3888. Dependencies: see "Baseline, dependencies and worktree" in the spec.
   Run every check in that section. If one fails, stop and report Blocked.
3. Storage-full hard blocker (mandatory): Before installs, builds or large test runs, check free space on every required drive, including TEMP/TMP, caches and Cargo/build outputs. If storage is full, a write fails with ENOSPC, disk-full or insufficient space, or the verified space cannot support the operation, stop task work immediately. Do not retry, keep editing, relocate temp/cache/output directories or delete anything automatically. Safely cancel task-owned operations and preserve existing work. Report the affected drive/path, the measured space or error, the last completed step and the remaining work. Mark this spec and its index row Blocked only if that is safe to write; otherwise report Blocked without further writes. Resume only after space is restored and rechecked and partial outputs are assessed. Any cleanup needs Nakul's explicit authorization.
4. After the storage check, you are authorized to create exactly one worktree from the verified baseline:
   git -C E:\Developing\OpenSource\mono-clone worktree add E:\Developing\OpenSource\mono-clone-claude-live-controls -b feature/claude-live-controls <BASELINE_SHA>
   If the path or branch already exists, stop and ask. Run npm install inside that worktree only. Work only there.
5. Load the skills listed in the spec and the spec-implement skill.
6. Set this spec's status to Progress (its heading and its row in the main-checkout SPECS.md) when you start, Review when you finish,
   or Blocked with the reason if you stop.
7. Implement the spec exactly. Run its Verification commands in the worktree.
8. Add the changelog entry to the Current numbered changelog file in the main checkout (Commit: uncommitted).
9. Don't commit, push, merge, build a package, run native desktop or smoke tests, or drive the Tauri window.
   Don't touch the main checkout's source, mono-clone-hari, mono-clone-remote or the stashes.
10. Report in the spec's Implementer report format. Copy the spec's Manual checks unchanged as a separate follow-up for Nakul;
    they are not your task.
```

## Handoff retro
- Implementation and focused Claude verification completed; TypeScript, the complete Claude provider directory tests (95/95), and `git diff --check` passed.
- The required full `npm test` run failed at `src/features/sessions/ui/Composer.test.ts > Composer question focus > preserves attachment ownership when a resend is restored` (3,716 passed, 1 failed). The file is unchanged by this feature, the same Composer attachment failure is recorded in the existing changelog, and the named test passed alone.
- Per the batch stop policy, the implementation was saved to `docs/notes/claude-live-controls-partial.patch` and its source files were restored. Context Accuracy depends on this feature and is therefore blocked; other independent batch features can continue.
