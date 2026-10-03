# Draft — Claude cold-resume warning — spec

- Workflow status: Draft. Historical snapshot status and verification notes below are retained.

- Tier: complex · Snapshot: `9397898` + uncommitted orchestration WIP, 2026-09-26 18:49 IST · Status: draft
- Branch/worktree: directly in `E:\Developing\OpenSource\mono-clone` on `nakul/windows-support`, no worktree (Nakul's instruction of 26 Sept 2026 overrides the working agreement's worktree step).
- Depends on: `docs/specs/native-branch.md` (implement that first). This spec uses its `onBranch(sessionId, turn, { forceSummary: true })`.

## Goal and user story
As a MonoCode user on a Claude subscription, when I return to a large Claude chat after its prompt cache has expired, I want to be warned before my next message and offered cheaper options, so that one message does not silently consume a large share of my 5-hour limit.

## Diagnosis — what the evidence shows (26 Sept 2026)
Sources: Claude Code session logs in `~/.claude/projects` (per-request `usage`), Nakul's screenshots in `C:\Users\gclna\Pictures\ShotHub` (17:33–17:56 IST), the installed Claude Code 2.1.281 binary, and `~/.claude.json` cached feature flags.

| Run | Time (IST) | Idle before | Context | First request: cache write / TTL / cache read | Requests in turn | Turn totals: cache write · cache read · output |
|---|---|---|---|---|---|---|
| MonoCode, capkit `19bb5ac9` | 26 Sept 17:35 | 6 h 45 m | ~407K | 391,059 / 1 h / 16,893 | 19 | 422,834 · 7,664,029 · 19,322 |
| Claude Desktop, rigorup `5d494a11` | 26 Sept 17:51 | 25 h | ~381K | 339,566 / 1 h / 41,565 | 25 | 363,992 · 9,477,499 · 14,207 |
| MonoCode, capkit `19bb5ac9` | 26 Sept 10:48 | 8 h (auth failure at 10:46) | ~390K | 385,537 / **5 min** / 0, then 8 s later 390,514 / 1 h / 0 | — | ≥ 776,051 cache write |

Findings:
1. A cold resume costs one full-context cache write in both apps: same model (Opus 5.5), same effort, same 1-hour TTL chosen by Claude Code. The 17:35 MonoCode turn and the 17:51 Desktop turn did almost the same work.
2. UNRESOLVED. Nakul confirms both usage readings were refreshed manually and were correct, so the 25% (MonoCode) vs 11% (Desktop) gap is real. The session transcripts record similar token usage for the two turns, but Anthropic does not publish the conversion from these counters to subscription-limit percentage. Hidden requests, different request metadata, or server-side weighting are hypotheses, not established causes. Known asymmetry: Desktop started its Claude process at 17:45:56 when the chat was opened (process creation time), about 5 minutes before the message; MonoCode starts it only on send. Any work Claude Code does at resume time could fall before Desktop's baseline but inside MonoCode's measured window. A same-state request-level comparison across both surfaces would be needed to distinguish these possibilities.
   - Follow-up metadata comparison (27 Sept): all 19 MonoCode and 25 Desktop response records in those turns show Opus 5.5, High effort, `speed: standard`, `service_tier: standard`, `inference_geo: not_available`, and zero server-side web search/fetch requests. Applying published API prices to the recorded cache writes, reads and outputs yields about $5.30 for MonoCode versus $5.09 for Desktop (comparison only, not actual plan billing). The salient recorded difference is `entrypoint: sdk-cli` versus `entrypoint: claude-desktop`; the later `human` origin flag did not change MonoCode's entrypoint. This strengthens the server-side request-classification hypothesis, but does not prove Anthropic assigns either path a different subscription-quota weight.
3. The 10:48 IST double write (385,537 at a 5-minute TTL, then 390,514 at 1 hour, 8 s apart) was caused by stopping the turn while it was re-caching and prompting again (Nakul). Not a MonoCode defect.
4. Warm restarts: MonoCode stops an idle Claude process after 5 minutes (`HARNESS_IDLE_PARK_MS`, `registry.ts:87`). It also restarts it on a model, effort, fast, thinking, context, permission, hooks, Plan-mode or folder change (`claude.ts` `ensureLive`, `settingsKeyFor`). Across all MonoCode logs, 17 restarts happened less than 55 minutes after the previous request: 13 reused the cache, 4 rewrote most of the context (for example, 15 Sept 09:31 IST: 625,354 tokens rewritten 46 s after the previous request). Ruled out: file edits between restarts (cache hits occurred after up to 13 edits). Still possible: effort or thinking changes; MCP servers still connecting when the first request is sent. Desktop logs show 1 such restart and 0 misses.
5. Every Desktop cold start reads exactly 41,565 cached tokens, which suggests a static system prompt and tool list that is identical across sessions. MonoCode cold starts read 0–19K. Desktop does not pass `--exclude-dynamic-system-prompt-sections` (checked on its live command line: `--effort high --model claude-opus-5-5 --resume=… --permission-mode auto --include-partial-messages --await-initialize --thinking-display omitted --replay-user-messages --setting-sources=user,project,local --settings {deniedMcpServers…}`). The flag exists in Claude Code 2.1.281 and would let MonoCode share the static prefix; worth about 25K tokens per cold start, so it is minor.
7. Keeping a process alive does not keep Anthropic's cache warm; the 1-hour expiry is server-side. Desktop's process for the rigorup chat was still running 7 hours later (≈480 MB private memory), yet its 17:51 request still re-cached 339,566 tokens.
6. Claude Code's native "resume from summary" dialog (`resume_return`) exists. Its thresholds are 70 minutes and 100,000 tokens (`CLAUDE_CODE_RESUME_THRESHOLD_MINUTES`, `CLAUDE_CODE_RESUME_TOKEN_THRESHOLD`), and it is gated by server flags. On this account `tengu_gleaming_fair` is false and `tengu_gleaming_fair_reuse` is true, so the dialog only appears when Claude Code already has a precomputed compact summary. Otherwise it is skipped silently (`skipped_no_summary`). Declaring support will rarely show anything here, so MonoCode's own warning is the real protection.

Conclusion: once the 1-hour cache expires, the full history must be processed again, and that cannot be avoided. It can be sidestepped (compact, or a new chat from a summary) and kept from doubling. This spec covers the warning and the choices. Follow-ups F1–F5 address the doubling.

### Controlled origin-label retest (27 Sept 2026, 14:27 IST)

- The dev build sent the user's "radhe radhe" into the existing `d4ddf97f` Opus 5.5 chat after about 1 h 46 m idle. The 5-hour reading went from 76% used (24% left) at 14:25 to 100% used (0% left) at 14:28; the weekly reading moved from 90% to 92% used. Screenshots: `C:\Users\gclna\Downloads\Claude Usage Analysis\CapKit_2026-09-27_14-25-31-613.png` and `CapKit_2026-09-27_14-28-00-740.png`.
- The session JSONL records exactly three model responses for this turn. The first wrote 624,000 tokens to the 1-hour cache and read 16,893; the next two wrote 2,038 and 1,224 while reading 640,893 and 642,931. Outputs were 687, 762 and 657 tokens. No other local Claude project transcript changed during this interval. The debug log records three API requests, all with `cc_turn_origin=human`; it does not show another large cache write or a model-request retry.
- Verdict: adding `origin: { kind: "human" }` changed the attribution header but did not reduce plan usage. The result matches earlier MonoCode cold-resume observations (527K re-cached for 19%; 694K for 25%). The earlier Desktop comparison (366K for 8%) still shows a different effective quota rate; Anthropic's subscription weighting is not exposed in the transcript, so its cause is not established. Do not present `cc_turn_origin` as a quota fix.
- Public-source check (27 Sept): Anthropic's Agent SDK types describe `origin` as message provenance, not a quota control (`https://github.com/anthropics/claude-agent-sdk-python/blob/main/src/claude_agent_sdk/types.py`). Anthropic's support page says Agent SDK, `claude -p`, and third-party app usage still draw from subscription limits after a proposed separate credit was paused (`https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan`). Neither source documents a different quota conversion for `sdk-cli` and Desktop. The earlier claim that Anthropic necessarily meters `sdk-cli` more harshly was unsupported.
- Separate UI diagnosis: `computeContextBreakdown` calls `usedTokens - (estimated visible messages + memory + skills)` "System & tools", and `computeSystemAndToolsBreakdown` distributes that residual among tools/MCP servers. This session JSONL has 222 historical `tool_result` blocks (about 6.7 MB serialized), which the visible-message estimate does not classify. The inspector's roughly 615K "System & tools" is therefore not evidence that tool definitions occupy 615K. Claude's approximately 640K total context telemetry is real; its category attribution is an estimate and misleading for this chat.

## Scope
A. A MonoCode-owned notice above the composer of a stale, large Claude chat, with four choices.
B. Native `resume_return` dialog support in the Claude adapter (T3 PR #8144 parity), coordinated with A so the user is never asked twice.
C. A Settings → Providers toggle, on by default.

## Out of scope
Follow-ups F1–F6 below; Codex/OpenCode cache warnings; automation, orchestration and queued auto-dispatch sends (they never show the notice); an auto-compact threshold setting; any Rust, schema, dependency, commit, push, version or installer work.

## Current behavior (confirmed in source)
- Claude `initialize` is sent bare: `buildControlRequest(nextControlId(live), { subtype: "initialize" })` in `claude.ts` `ensureLive` (~`claude.ts:459-462`).
- `handleControlRequest` (`claude.ts:832-843`) answers every subtype other than `can_use_tool`/`permission` with an empty success response. For `request_user_dialog` this would violate the protocol: a host must not answer kinds it did not declare, and must answer declared kinds with `{ behavior: "completed", result }` or `{ behavior: "cancelled" }`.
- AskUserQuestion path (`claude.ts:859-896`) shows how to raise `question.asked`, await `waitQuestion`, emit `question.resolved`, and respond. `questionsFromUnknown` honors `allowCustom: false` (`userQuestion.ts:202-212`).
- Manual compaction exists: `App.onCompactContext(sessionId)` (`App.tsx:7636-7715`) → `compactHarnessContext` → `compactClaudeContext` (`claude.ts:~203-240`) runs `/compact` on the live or resumed process; it sets `busy` and a "Compacting context…" status, and returns `false` when busy.
- Context level: `session.context.used` (`contextUsage.ts`), persisted as `contextUsed`. Turn timing: user blocks `startedAt` + `durationMs`. `formatTokens` gives "407K".
- Docked composer wrapper: `SessionPane.tsx:871-879`. `onCompactContext` and `onBranch` are already SessionPane props.
- Setting pattern: `DETAILED_CONTEXT_*` in `settings.ts:874-905+`; Claude hooks row in `SettingsView.tsx` ProvidersPage (`~2880`); settings search registry entry `claude-hooks` at `settings.ts:~370`.
- No existing minute-clock hook (`useNow`/`useMinute*` not found).

## Proposed behavior and invariants
1. The notice appears only when all of these hold: the Settings toggle is on; `session.harness === "claude"`; `session.providerSessionId` is set; `context.used >= 100_000`; `now - lastActivityAt >= 70 min`; the session is not busy and has no pending question, `pendingSwitch`, `inboxAsk` or `ephemeral`; and this idle period is not dismissed.
2. An idle period is identified by `key = "<session.id>:<lastActivityAt>"`. A new turn changes the key, so each return is judged afresh. Dismissals are kept in memory for the app run (T3 parity).
3. The notice never blocks typing or sending. Sending without choosing behaves like "Keep full history".
4. The user is asked at most once per idle period. If they chose in MonoCode, a native `resume_return` dialog for that period is answered `continue` automatically. MonoCode's own compaction always auto-answers `continue`.
5. "Don't ask again" in either place turns the MonoCode setting off, so both the notice and the native dialog stop.
6. Only undeclared dialog kinds go unanswered; `resume_return` is declared only when the setting is on.

## States and transitions
| State | Event | Next | User sees |
|---|---|---|---|
| Hidden | Minute tick or focus crosses 70 min while other rules hold | Shown | Notice above composer |
| Shown | Compact first | Dismissed + compaction running | Notice gone; "Compacting context…"; meter drops after |
| Shown | New chat from summary | Dismissed + new tab | New branch with summary divider (reason "chosen to save usage") |
| Shown | Keep full history | Dismissed | Notice gone |
| Shown | Don't warn again | Setting off | Notice gone everywhere; toggle off in Settings |
| Shown | User sends a message | Busy → turn completes → new key | Notice hidden during turn; not shown after (fresh activity) |
| Shown | Session becomes busy / question pending / provider switch | Hidden | — |
| Dismissed (compact) | Compaction fails | Dismissed | Existing error row; notice stays hidden (Compact remains in the context meter) |
| Native dialog arrives, mode ask | User answers | Response sent | Question card in composer area |
| Native dialog arrives, mode auto-continue | — | `continue` sent | Nothing |

## Acceptance criteria
- AC-1 Given a Claude session with `providerSessionId`, `context.used = 100_000`, and the last turn ended exactly 70 minutes ago, when the pane is visible, then the notice renders with "Idle for 1h 10m with 100K tokens of context…". With 99,999 tokens or 69 min 59 s, it does not render.
- AC-2 Given the notice, when the minute clock ticks or the window regains focus after the threshold is crossed, then the notice appears without other interaction.
- AC-3 Given the notice, when "Keep full history" is clicked, then it disappears and does not reappear for the same key; after the next completed turn, the old dismissal has no effect.
- AC-4 Given the notice and an idle session, when "Compact first" is clicked, then `onCompactContext(session.id)` is called once, the key is dismissed, and the compaction input carries `claudeResumeDialog: "auto-continue"`. When the session is busy the button is disabled with the title "Compacting is unavailable while Claude is working".
- AC-5 Given the notice, when "New chat from summary" is clicked, then `onBranch(session.id, lastTurn, { forceSummary: true })` is called once with the last turn group that contains a user block, and the key is dismissed.
- AC-6 Given the notice, when "Don't warn again" is clicked, then `saveColdResumeWarning(false)` runs, every open notice hides, and Settings → Providers shows the toggle off; turning it on shows the notice again for stale chats.
- AC-7 The notice never renders for non-Claude sessions, sessions without `providerSessionId`, busy sessions, sessions with a pending question or `pendingSwitch`, inbox asks, or ephemeral sidechats.
- AC-8 Given the setting is on, when MonoCode spawns Claude, then the initialize request is `{ subtype: "initialize", supportedDialogKinds: ["resume_return"] }`; with the setting off, it is `{ subtype: "initialize" }`.
- AC-9 Given mode `ask`, when Claude sends `control_request { subtype: "request_user_dialog", dialog_kind: "resume_return", payload: { sessionAgeMinutes: 332, estimatedTokens: 407000 } }`, then a `question.asked` event shows header "Resume session", the question "This session is 5h 32m old and uses 407,000 tokens. Compact it before continuing?", and the three options, with no custom answer. The responses are exactly `{ behavior: "completed", result: "compact" }`, `"continue"` or `"never"` for the three options, and `{ behavior: "cancelled" }` when skipped.
- AC-10 Given mode `auto-continue`, the same request is answered `{ behavior: "completed", result: "continue" }` with no question event.
- AC-11 Given a `request_user_dialog` with any other `dialog_kind`, no control response is written.
- AC-12 Given a pending resume question, when Claude sends `control_cancel_request` for it, then the question resolves as cancelled and no response is written.
- AC-13 Given a native answer "Don't ask again", `saveColdResumeWarning(false)` is called.
- AC-14 The mode passed to Claude on a user send is `off` when the setting is off, `auto-continue` when the current idle period's key is dismissed, and `ask` otherwise. Sends that do not come from the user's composer omit the field, which the adapter treats as `off`.

## Ordering contracts
- Notice actions: record the dismissal first (synchronous, hides the notice), then call the action handler. Buttons are disabled after the first click until unmount (`acting` state), which prevents a double branch or double compaction.
- Claude mode: `live.resumeDialog` is set at spawn and refreshed on every `ensureLive` reuse, like `live.runtimeMode`. `supportedDialogKinds` is fixed at spawn, and a later change takes effect on the next spawn. When a dialog arrives, it reads the current `live.resumeDialog`.
- Dialog response: parse, then kind check (unknown kinds: return without writing), then mode (`auto-continue` answers immediately), then question flow. When the question settles: if it was cancelled by a control cancel, return without writing; otherwise write the response once. `never` also saves the setting before writing.
- Stale answers: if `live.muteUpdates` or `live.cancelled` is set when the answer arrives, write `{ behavior: "cancelled" }` only if the request is still pending (not cancelled by the CLI); never throw.

## Implementation plan
1. `src/features/sessions/model/coldResume.ts` (new, pure):
   - `COLD_RESUME_MINUTES = 70`, `COLD_RESUME_TOKENS = 100_000`.
   - `lastActivityAt(blocks: Block[]): number | null` — maximum of `startedAt + (durationMs ?? 0)` over user blocks with `!draft` and a finite `startedAt`; `null` if none.
   - `coldResumeCandidate(session: Session, now: number): { idleMs: number; tokens: number; key: string } | null` — every rule of invariant 1 except the setting and dismissal.
   - `formatIdleDuration(ms)`: below 60 min `"<m>m"`; below 48 h `"<h>h <m>m"`; otherwise `"<d>d <h>h"`.
   - `formatResumeReturnQuestion(minutes: number, tokens: number): string` — T3 copy, `toLocaleString("en-US")`.
   - Dismissal store: `dismissColdResume(key)`, `isColdResumeDismissed(key)`, `subscribeColdResumeDismissals(listener)`, `getColdResumeDismissalsVersion()` (for `useSyncExternalStore`), `__resetColdResumeDismissals()` for tests.
   - `claudeResumeDialogMode(session, now, enabled): "off" | "ask" | "auto-continue"`.
2. `settings.ts`: `loadColdResumeWarning` (default `true`), `saveColdResumeWarning`, `COLD_RESUME_WARNING_CHANGE_EVENT`, `subscribeColdResumeWarning`, mirroring `DETAILED_CONTEXT_*`; storage key `monocode.claudeColdResumeWarning`. Registry entry `{ id: "claude-cold-resume-warning", section: "providers", label: "Warn before resuming idle Claude chats", keywords: "cache cold resume compact tokens usage limit" }`.
3. `SettingsView.tsx` ProvidersPage: a `Row` + `Toggle` directly after the Claude Code hooks row. Description: "Before you continue a Claude chat that has been idle for over 70 minutes with more than 100K tokens of context, offer to compact it or start a new chat from a summary."
4. `src/shared/hooks/useMinuteNow.ts` (new): `useMinuteNow(enabled: boolean): number` — interval 60,000 ms and a `focus`/`visibilitychange` refresh while enabled; clears on disable or unmount.
5. `src/features/sessions/ui/ColdResumeNotice.tsx` (new) and `SessionPane.tsx`: render it inside the docked composer wrapper, above `{composer}`, when `dockComposer && visible` and the candidate/setting/dismissal rules pass. SessionPane wires the actions to its existing `onCompactContext` and `onBranch` props. `lastTurn` = last group from `groupTurns(session.blocks)` containing a user block.
6. `types.ts`: `HarnessSessionInput.claudeResumeDialog?: "off" | "ask" | "auto-continue"`.
7. `App.tsx`: in the user send path (`sendTurn` closure) pass `claudeResumeDialog: claudeResumeDialogMode(current, Date.now(), loadColdResumeWarning())` for Claude. In `onCompactContext` pass `"auto-continue"` when the setting is on, `"off"` otherwise. Extend `onBranch` only as the branch spec defines.
8. `claudeProtocol.ts`: `buildClaudeInitializeRequest(dialogMode)` (returns the `request` object) and `parseUserDialogRequest(rec)` → `{ requestId, dialogKind, sessionAgeMinutes?, estimatedTokens? } | null` (reads nested `request.subtype`, `request.dialog_kind`, `request.payload`; numbers must be finite and ≥ 0).
9. `claude.ts`: `Live.resumeDialog`; use `buildClaudeInitializeRequest`; in `handleControlRequest` handle `request_user_dialog` before the generic branch per Ordering contracts. Map labels exactly: "Compact and continue" → `compact`, "Keep full history" → `continue`, "Don't ask again" → `never`.

Must not change: the existing AskUserQuestion, permission and ExitPlanMode paths, queue behavior, `compactClaudeContext` semantics, the protected files and Hari stash listed in the branch spec.

## UI details
Placement: inside the docked composer wrapper, above the composer, full composer width, normal flow (not absolute). Match the surface, border, radius and text tokens of `LinkedWorkItemUpdateNotice` (`src/features/inbox/ui/LinkedWorkItemUpdateNotice.tsx`) and its small action button classes. Enter with opacity and a 4 px upward move over 150 ms ease-out, with `motion-reduce:transition-none`. Semantics: `<section aria-label="Claude will re-read this chat" aria-live="polite">`; real `<button type="button">` elements; visible focus rings from the existing button classes; keyboard order: Compact first, New chat from summary, Keep full history, Don't warn again.

Copy:
- Title: **Claude will re-read this whole chat**
- Body: "Idle for {idle} with {tokens} tokens of context. Claude's cache lasts about an hour, so your next message re-processes everything and uses a large share of your plan limit."
- Buttons and `title` tooltips:
  - **Compact first** — "Claude reads the history once to summarize it. This and later messages then use a much smaller context."
  - **New chat from summary** — "Opens a new chat with a summary MonoCode writes locally. Nothing old is re-read; tool output and fine detail are left out."
  - **Keep full history** — "Continue as is. The next message pays the full cost once; later ones reuse the cache again."
  - **Don't warn again** (text button) — "Turn this warning off. You can turn it back on in Settings → Providers."
- Disabled Compact title: "Compacting is unavailable while Claude is working".

## Skills to load
`frontend-ui`, `testing`, `desktop-app`.

## Test matrix
| AC / risk | Level | File | Scenario |
|---|---|---|---|
| AC-1, AC-7, AC-14, formatting | unit | `src/features/sessions/model/coldResume.test.ts` | Boundaries 69:59/70:00 and 99,999/100,000; each exclusion rule; key changes after a new turn; mode mapping; `formatIdleDuration` 45m / 1h 10m / 5h 32m / 2d 3h |
| AC-6 setting | unit | settings test beside existing settings tests | Default true; save dispatches event; subscribe fires |
| AC-2 | hook | `src/shared/hooks/useMinuteNow.test.ts` | Fake timers: tick after 60 s; focus refresh; cleanup on disable |
| AC-3,4,5,6 | component | `src/features/sessions/ui/ColdResumeNotice.test.ts` | Each action calls its handler once and the notice hides; double click → one call; disabled compact when busy |
| AC-8,9,10,11,12,13 | adapter | `claudeProtocol.test.ts`, `claudeLive.test.ts` | Initialize payloads; dialog request → question → exact response; auto-continue; unknown kind → nothing written; cancel → nothing written; never → setting saved |

## Verification
- Implementer runs: `npx tsc --noEmit`; the test files above with `npx vitest run <files>`; then `npm run check:web`; `git diff --check`; protected-hash check (as in the branch spec). Report the ESLint flat-config blocker if still present.
- Later (not the implementer): Tauri dev checks, installer, installed verdict.

## Manual checks (Nakul, dev mode)
1. Open the capkit Claude chat (idle > 70 min, > 100K): the notice shows the right idle time and tokens.
2. Keep full history → send → normal; the notice does not return after the turn.
3. Compact first → status "Compacting context…", then the context meter drops and the notice is gone.
4. New chat from summary → new tab with divider "…starts from a copied summary (chosen to save usage)"; the reply knows the context.
5. Don't warn again → notices gone; Settings → Providers toggle off; toggle on → notice back.
6. Leave a chat open past 70 minutes → notice within a minute, or on window focus.
7. Native dialog (may never appear on this account because it is flag-gated): if Claude asks "Resume session", all three answers work.
8. Optional evidence: after a cold resume with and without Compact, compare the first request's `cache_creation_input_tokens` in `~/.claude/projects/<project>/<session>.jsonl`, and compare plan usage read from claude.ai → Settings → Usage immediately before and after, with nothing else running.

## Follow-ups (recommended, separate specs)
- F1 Log the reason for every Claude process restart (idle park, settings key change, Plan toggle, folder, crash) to explain the 4 warm misses out of 17.
- F2 Consider a longer idle park for Claude than 5 minutes (per-harness), trading memory per process.
- F3 Instrument a cold resume with `--debug-file` (API category) in MonoCode to find requests the transcript does not record — the open 25% vs 11% question.
- F4 Evaluate `--exclude-dynamic-system-prompt-sections` for cross-session prefix reuse (~25K tokens per cold start; one-time miss on warm sessions when enabled).
- F5 Refresh plan quota right after each Claude turn (at most once per 60 s) so percentages reflect the turn that just ran.
- F6 Unrelated display issues seen in the screenshots: the context breakdown attributes about 376K to "System & tools" versus Desktop's 322.7K messages (protected WIP `systemBreakdown.ts`), and Opus 5.5 costing shows "$3.00/M in · $15.00/M out"; verify the price table.

## Facts, decisions, assumptions
Facts: the Diagnosis and Current behavior sections (verified 26 Sept 2026).
Decisions: 70 min / 100K thresholds match Claude Code and T3; dismissals are in memory per app run (T3 parity); the notice is non-blocking; the setting defaults to on; "New chat from summary" reuses the branch summary mode (no model call).
Assumptions: the Claude adapter receives `request_user_dialog` as a `control_request` with nested `request.subtype`, `dialog_kind` and `payload`, as the 2.1.281 schema describes; not exercised live, because the account's flags suppress the dialog.

## Open questions
None blocking.

## Implementer report format
Same as the branch spec: per AC status with file:line or test name, deviations, open questions, exact check results, files changed, then the manual checklist for Nakul.

## Handoff retro
(Filled in after implementation.)
