# Draft — Prepare for a break — spec

- Workflow status: Draft. Historical snapshot status and verification notes below are retained.

- Tier: complex · Snapshot: `9397898` + uncommitted orchestration WIP, 2026-09-27 · Status: draft
- Branch/worktree: directly in `E:\Developing\OpenSource\mono-clone` on `nakul/windows-support`, no worktree (Nakul's instruction, 26 Sept 2026).
- Depends on, in order: `docs/specs/native-branch.md` (native fork, divider block, `fork` on `HarnessSessionInput`) and `docs/specs/claude-cold-resume-warning.md` (`ColdResumeNotice`, `coldResume.ts`, the warning setting). Implement those first.

## Goal and user story
As a MonoCode user about to step away from a large chat, I want one button that makes a compacted copy of the chat while the provider's prompt cache is still warm, so that when I come back I can continue cheaply from the compacted copy or keep the full history, and see whether the full history is still warm.

Why a compacted branch and not a stored summary: the copy is a real provider conversation produced by the provider's own compaction (built to be continued), it needs no new summarizer, and it costs about the same to prepare. Its summary text lives in the copy's own history if a cross-provider use is ever needed (UltraContext is the planned route for that).

## Scope
1. "Prepare for a break" action on Claude Code, Codex and OpenCode chats: native branch of the chat, then provider compaction of the branch, in the background.
2. A record of the prepared copy on the original chat (visible marker row), with sizes and times.
3. Cache warmth for Claude chats: "Warm for about N more minutes" / "Cold since HH:MM", computed from the last request time and the cache lifetime Claude reports. Other providers show "Last active N min ago" only.
4. A return notice on the original chat offering: Open compacted copy, Keep full history, Compact now, Don't show again. It replaces spec 2's cold notice while a prepared copy is ready.
5. A setting for what happens to the copy after "Keep full history", with a note explaining how copies fall behind.

## Out of scope
- Keep-warm pings, schedules or cloud jobs (see "Experiment not in scope" at the end).
- Summary-only preparation; cross-provider copies; UltraContext.
- Other providers (Cursor, Grok, Pi, omp, fx, Antigravity, Cline, Hermes).
- Rust, SQLite schema, dependency, version, installer, commit, push. Desktop UI checks stay with Nakul.

## Current behavior (confirmed in source)
- Compaction adapters exist: `compactClaudeContext` (`claude.ts:~203-240`, runs `/compact`, requires Claude's compaction confirmation), `compactCodexContext` (`codex.ts:160`, `thread/compact/start` at `codex.ts:663`), `compactOpenCodeContext` (`opencode.ts`, `summarizeSession` at `opencode.ts:605`). `canCompactHarnessContext` (`registry.ts:211-214`) and `compactHarnessContext` (`registry.ts:216+`, serialized per session through `queueSessionOperation`). `App.onCompactContext` (`App.tsx:7636-7715`) sets `busy`, shows "Compacting context…", returns `false` when busy.
- `CompactContextInput = HarnessSessionInput` (`types.ts:157`), so the `fork` field added by the branch spec reaches compaction too.
- Native fork per provider: see the branch spec (Claude `--fork-session`, Codex `thread/fork`, OpenCode `/session/:id/fork`).
- Claude usage per request carries `cache_creation.ephemeral_1h_input_tokens` and `ephemeral_5m_input_tokens` (seen in `~/.claude/projects` logs: 1-hour on this Pro account; 5-minute when the account is in extra usage). MonoCode parses usage in `parseClaudeUsage` (`tokenAccounting.ts`) but does not keep the cache lifetime or the request time.
- After `/compact`, Claude's result reports the summarizer call, not the new level (`claude.ts` `handleResult` comment), so the copy's size is only known after its next report.
- Automations are stored in the app's SQLite (`src-tauri/src/automations.rs`) and run from the app.

## Proposed behavior and invariants
1. The original chat is never modified by preparing, except for one appended marker row. Its provider conversation is never resumed for preparation (the fork copies it).
2. At most one ready or preparing copy per original chat. Preparing again archives the previous copy (never deletes) after the new one succeeds.
3. Preparation never runs on a Claude chat whose cache is estimated cold; the button explains why and points to Compact now.
4. Warmth is an estimate and is labeled as one ("about"). No warm/cold claim is made for Codex or OpenCode.
5. Only one notice at a time on a chat: prepared-break notice wins over spec 2's cold notice.

## Data (JSON on blocks; no migration)
`src/features/sessions/model/session.ts`:
```ts
/** Claude cache observation for the turn this user block starts. */
cacheObservation?: { lastRequestAt: number; ttlMs: number };
/** Marker row on the original chat for a prepared break. */
preparedBreak?: PreparedBreak;

export type PreparedBreak = {
  copySessionId: string;
  harness: "claude" | "codex" | "opencode";
  status: "preparing" | "ready" | "failed" | "archived";
  preparedAt: number;               // epoch ms when preparation started
  readyAt?: number;
  fullTokens: number;               // original context.used at start
  compactTokens?: number;           // copy context.used once reported
  sourceLastUserBlockId: string;    // last non-draft user block of the original at start
  failure?: string;                 // user-facing reason
};
```
Persist both in `sanitizeBlock` (ids through `isPersistableId`; numbers finite and ≥ 0; unknown `status` dropped). On load, a marker with `status: "preparing"` becomes `failed` with failure "Preparation was interrupted".

## Cache warmth (pure) — `src/features/sessions/model/cacheWarmth.ts` (new)
- Claude adapter emits `{ type: "cache.observed"; lastRequestAt: number; ttlMs: number }` for every non-subagent assistant message that carries usage: `lastRequestAt = Date.now()`; `ttlMs = 3_600_000` if `ephemeral_1h_input_tokens > 0`, `300_000` if `ephemeral_5m_input_tokens > 0`, otherwise the previous `ttlMs` of this live session (default `3_600_000`). `apply.ts` stores it on the latest user block as `cacheObservation`.
- `lastCacheObservation(blocks)` = the latest user block's `cacheObservation`.
- `cacheWarmth(session, now)`:
  - non-Claude or no observation → `{ kind: "unknown", lastActivityAt }` (`lastActivityAt` from `coldResume.ts`; null allowed).
  - `expiresAt = lastRequestAt + ttlMs - margin`, where `margin = 300_000` for the 1-hour lifetime and `60_000` for the 5-minute lifetime. `now < expiresAt` → `{ kind: "warm", remainingMs: expiresAt - now }`, else `{ kind: "cold", since: expiresAt }` (never a future time).
- Copy: warm → "Warm for about {m} more min" (round down, minimum 1); cold → "Cold since {HH:MM}" (local time via `Intl.DateTimeFormat` with `hour`/`minute`); unknown → "Last active {n} min ago" / "{h}h {m}m ago".

## Flow and ordering contracts
Prepare (App, new `onPrepareForBreak(sessionId)`):
1. Read the original from `sessionsRef.current`. Preconditions, in order, each with a disabled-button reason: supported harness (`claude`, `codex`, `opencode`); `providerSessionId` set ("Send a message first"); not busy, no pending question, no queued messages ("Wait for the current turn to finish"); no marker with `status: "preparing"` ("Already preparing"); Claude and `cacheWarmth` is `cold` → "The cache is already cold, so preparing now would re-read the whole chat. Use Compact now instead."
2. `plan = planBranch({ source, turn: lastTurn, newSessionId })` (branch spec). If `plan.origin.mode !== "native"` → show the reason as an error toast and stop (no copy, no marker).
3. Create the copy session exactly like a native branch (branch spec ordering), title `"<source title> (compacted)"`, but do not append a tab or change focus. Append the marker block to the original: `role: "system"`, text "Preparing a compacted copy…", `preparedBreak: { status: "preparing", copySessionId, harness, preparedAt: Date.now(), fullTokens: source.context?.used ?? 0, sourceLastUserBlockId }`.
4. Call the compaction path for the copy: same as `App.onCompactContext(copyId)` but passing the copy's pending `fork` (from its divider) on `CompactContextInput`. The adapter forks, then compacts, in one `queueSessionOperation`.
5. On success: marker → `ready`, `readyAt`, text "Compacted copy ready · {compact size or 'size after first message'}". If a previous `ready` marker for this original exists, set it to `archived` and archive its copy session through the existing archive action.
6. On failure: marker → `failed` with `failure` (the adapter error message, shortened to one line), text "Couldn't prepare a compacted copy: {failure}". Archive the partial copy. Do not retry automatically.
7. Stale results: tag the run with a generation per original; if the original's marker was replaced or the copy was deleted meanwhile, ignore the result.
8. `compactTokens`: set from the copy's first `context` event after compaction (any time later, including after the user opens it).

Return notice (`src/features/sessions/ui/PreparedBreakNotice.tsx`, placed where spec 2's notice is placed; spec 2's notice is suppressed while this one renders):
- Shows when the original has a `ready` marker and the notice is not dismissed for this marker (in-memory key `"<original id>:<preparedAt>"`) and the warning setting from spec 2 is on.
- Lines: "Full history · {fullTokens now} · {warmth}"; "Compacted copy · {compactTokens or '—'} · prepared {HH:MM}"; when the original has non-draft user blocks after `sourceLastUserBlockId`: "Compacted copy is {n} turn(s) behind".
- Buttons: **Open compacted copy** (append/focus its tab; dismiss), **Keep full history** (dismiss; then apply the setting below), **Compact now** (spec 2 behavior on the original), **Don't show again** (spec 2 setting off).

Setting (Settings → Providers, below spec 2's toggle): "After Keep full history, the compacted copy is" — Segmented or Select with **Kept until the next Prepare** (default) and **Archived**. Description: "A compacted copy is made from the chat as it was when you pressed Prepare for a break. If you keep working in the full chat, the copy falls behind; MonoCode shows how many turns behind it is. Preparing again replaces the old copy. Archived copies can be restored from history."

Button placement: in the context meter popover (`ContextMeter.tsx`, next to the existing Compact action at `~414-420`) as "Prepare for a break", with the disabled reason as its title; also in the chat tab's context menu if that menu already lists session actions. Show it only for supported providers.

## Acceptance criteria
- AC-1 A warm, idle Claude chat with a provider session: pressing Prepare creates one hidden copy session and one `preparing` marker, then calls compaction with `fork` set; on success the marker is `ready` and no tab changed.
- AC-2 Last observation at 12:00 with a 1-hour lifetime: at 12:50 the text is "Warm for about 5 more min" and Prepare is enabled; at 12:56 the text is "Cold since 12:55" and Prepare is disabled with the cold reason.
- AC-3 A 5-minute observation (account in extra usage) at 12:00: at 12:02 the text is "Warm for about 2 more min" and Prepare is enabled; at 12:04 it is "Cold since 12:04" and Prepare is disabled.
- AC-4 Codex and OpenCode chats: Prepare works via `thread/fork` + `thread/compact/start` and `/session/:id/fork` + `summarize`; the notice shows "Last active …" and no warm/cold text.
- AC-5 Preparing again after a `ready` copy archives the old copy only after the new one is `ready`; a failed new attempt leaves the old copy `ready`.
- AC-6 Compaction failure marks `failed` with the reason, archives the partial copy, and leaves the original unchanged apart from the marker.
- AC-7 App restart during preparation turns the marker into `failed` ("Preparation was interrupted").
- AC-8 The notice shows "{n} turns behind" exactly when the original has n non-draft user blocks after `sourceLastUserBlockId`.
- AC-9 Keep full history with setting "Archived" archives the copy and sets the marker `archived`; with "Kept…" nothing changes except dismissal.
- AC-10 While a `ready` marker exists and its notice is showing, spec 2's cold notice does not render on that chat.
- AC-11 Pressing Prepare twice quickly creates one copy (the second press sees the `preparing` marker).

## Implementation plan (files)
- `session.ts` (types), `sessionStore.ts` (`sanitizeBlock`, restore rule), `types.ts` (`cache.observed` event), `apply.ts` (store observation), `claude.ts` (`cache.observed` from assistant usage; parse `cache_creation`), `tokenAccounting.ts` only if the TTL parse belongs beside `parseClaudeUsage`.
- `cacheWarmth.ts` (new, pure), `preparedBreak.ts` (new, pure: `latestPreparedBreak`, `turnsBehind`, `markerText`).
- `App.tsx`: `onPrepareForBreak`, compaction call with `fork`, marker updates, archive calls, notice actions; pass through `PaneTree`/`SessionPane` props like `onCompactContext`.
- `PreparedBreakNotice.tsx` (new), `SessionPane.tsx` (placement and suppression of spec 2's notice), `ContextMeter.tsx` (button), `settings.ts` + `SettingsView.tsx` (setting and note), `transcriptActivity.ts`/`AgentTranscript.tsx` (marker row renders like the branch divider).
- Must not change: normal compaction, branch behavior from spec 1, protected files, Hari stash.

## Skills to load
`frontend-ui`, `testing`, `desktop-app`.

## Test matrix
| AC | Level | File | Scenario |
|---|---|---|---|
| AC-2,3 + copy | unit | `cacheWarmth.test.ts` | 1 h and 5 min lifetimes, margin boundary, unknown providers, local time text |
| AC-8 | unit | `preparedBreak.test.ts` | Turns-behind counting, drafts excluded |
| AC-1,5,6,7,11 | app flow | `src/features/sessions/ui/prepareForBreakFlow.test.ts` | Mocked harness with deferred promises: success, failure, re-prepare order, double press, restart restore |
| AC-4 | adapter | `codexLive.test.ts`, `opencodeLive.test.ts` | Fork then compact in one operation |
| cache.observed | adapter | `claudeLive.test.ts` | 1 h, 5 min, and no-write requests; subagent ignored |
| AC-9,10 | component | `PreparedBreakNotice.test.ts` | Buttons, setting behavior, spec 2 notice suppressed |

## Verification
Implementer: `npx tsc --noEmit`, the tests above, `npm run check:web`, `git diff --check`, protected-hash check, ESLint attempt. Later (Nakul): dev-mode checks, installer.

## Manual checks (Nakul, dev mode)
1. Large warm Claude chat → Prepare → marker "ready"; open `~/.claude/projects/<project>/<copy>.jsonl` and confirm the compaction request read most tokens from cache (high `cache_read_input_tokens`, small `cache_creation_input_tokens`).
2. Come back within the hour → notice says "Warm for about …"; after the hour → "Cold since …".
3. Open compacted copy → first reply costs little (compare usage before/after) and knows the work.
4. Keep working in the full chat → notice shows turns behind; Prepare again → old copy archived.
5. Codex and OpenCode chats → Prepare works; notice shows "Last active …".

## Facts, decisions, assumptions
- Facts: listed under Current behavior (verified 27 Sept 2026).
- Decisions: compacted branch over summary (fidelity, no new summarizer); archive instead of delete; warmth margin 5 min (1-hour lifetime) or 1 min (5-minute lifetime); one notice at a time; Codex/OpenCode get no warmth estimate because their cache lifetime is not reported.
- Assumptions: forking a warm Claude conversation reads the parent's cached prefix (same model, tools and system prompt) — manual check 1; archive action exists and is reusable for the copy session (verify the exact App function name before use).

## Experiment not in scope: keep-warm pings
Idea: an automation sends a tiny message every ~50 minutes so the cache never expires.
- Official Opus 5.5 API prices (platform.claude.com pricing page, checked 27 Sept 2026): base input $4/MTok, 1-hour cache write $8/MTok (2×), cache hit and refresh $0.20/MTok (0.05×), output $20/MTok. A cache read refreshes the entry's timer at no extra cost; the entry keeps its original lifetime.
- For a 400K chat: one cold return (1-hour write) ≈ $3.20; one ping ≈ $0.08 read + a tiny write and a short reply (Opus 5.5 always thinks) ≈ $0.09. Break-even ≈ 35 pings ≈ 30 hours at one ping per 50 minutes. Overnight (8–10 hours) costs about $1 in pings versus $3.20 cold. Plan-limit weighting is not published; measure one ping first.
- A normal message becomes part of the chat. A throwaway fork (`claude -p <tiny prompt> --resume <id> --fork-session --no-session-persistence` with the chat's model and effort) reads the chat's cached prefix, which refreshes it, and adds nothing to the chat. It only works if the fork's prefix matches exactly (same model, effort, tools, MCP servers, system prompt); a mismatch turns every ping into a full re-cache (≈ $3.20). Any implementation must stop itself when a ping's `cache_read_input_tokens` is below ~90% of the context. Creating a branch alone sends no request and refreshes nothing; only the branch's first model request does.
- Cloud or PC-off pings are not recommended: they need the local transcript and the Claude login token outside this machine, and the exact local prompt. MonoCode automations run only inside the running app.
- Decide after the debug test and one measured manual ping (usage reading before/after).

## Open questions
None blocking.

## Implementer report format
Per AC status with file:line or test name, deviations, open questions, exact check results, files changed, then the manual checklist for Nakul.

## Handoff retro
(Filled in after implementation.)
