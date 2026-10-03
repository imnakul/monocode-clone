# Done — Accurate context breakdown for Claude and Codex — spec

- Workflow status: Done — set 2026-10-01 18:20 IST by Claude at close-out. Nakul reported build 0.1.55-local5-provider-fixes fine; per-check results weren't itemized, so the Manual checks section and its caveats stay as written. Pushed to the fork at `c2c8bf6`. Earlier status: Review — updated 2026-09-30 22:26 IST; committed `11981c0`, automated verification passed; manual checks remain.
- Tier: standard (with one async fetch path, so ordering contracts are included) · Snapshot: `9397898` on `nakul/windows-support` plus the retained uncommitted changes listed in the umbrella plan (these include `systemBreakdown.ts` and its test), 2026-09-30.
- Umbrella: [provider-daily-work-improvements-plan.md](provider-daily-work-improvements-plan.md), slice 4. Reference only: [context-dialog-plan.md](context-dialog-plan.md) (its file paths, pricing and model assumptions are obsolete) and [claude-cold-resume-warning.md](../claude-cold-resume-warning.md) (the tool_result residual finding).
- Provider versions verified: Claude Code 2.1.283, codex-cli 0.159.0.

## Baseline, dependencies and worktree
- Revised 2026-09-30 after the handoff review ([provider-spec-handoff-review-30sept.md](../../notes/provider-spec-handoff-review-30sept.md)). Approved by Nakul 2026-09-30 (Todo); implemented through the combined batch prompt.
- Position in the batch: third of six (umbrella slice 4). Order: slice 1 approvals → slice 2 Claude live controls → slice 4 context → slice 3 native branch → slice 5 AI helpers → slice 6 forms. Implement and integrate one slice at a time: each slice is merged into `nakul/windows-support` and verified before the next worktree is cut.
- Prerequisite baseline: the `nakul/windows-support` commit that contains the umbrella baseline checkpoint and slices 1 and 2 integrated and verified. Nakul gives its SHA in the handoff prompt as `<BASELINE_SHA>`, and the checkpoint SHA recorded in the umbrella plan as `a65bd4e4b0c2742cd0fc54a4087358471efc3888`.
- Dependencies: Hard dependency on slice 2's reviewed control transport. Use only `requestClaudeControl`, `ClaudeControlError` and `Live.generation` from `claude.ts`. Don't add, copy or wrap a second `sendControl` or `pendingControls`.
- Verify before starting: `git -C E:\Developing\OpenSource\mono-clone cat-file -e <BASELINE_SHA>^{commit}` succeeds; `git -C E:\Developing\OpenSource\mono-clone merge-base --is-ancestor a65bd4e4b0c2742cd0fc54a4087358471efc3888 <BASELINE_SHA>` succeeds; `git -C E:\Developing\OpenSource\mono-clone merge-base --is-ancestor <BASELINE_SHA> nakul/windows-support` succeeds; the SPECS.md rows for slices 1 and 2 read Done; `requestClaudeControl`, `ClaudeControlError` and `generation` appear in `src/integrations/harness/providers/claude/claude.ts` at `<BASELINE_SHA>` (`git -C E:\Developing\OpenSource\mono-clone grep -n "requestClaudeControl\|ClaudeControlError\|generation" <BASELINE_SHA> -- src/integrations/harness/providers/claude/claude.ts`). If they are missing, stop and report Blocked. Don't implement the transport here.. If any check fails, or either SHA is missing from the handoff, stop and report Blocked. Don't pick a baseline yourself.
- Worktree: once this spec is Todo, you are authorized to create this slice's worktree yourself, from the verified baseline only: `git -C E:\Developing\OpenSource\mono-clone worktree add E:\Developing\OpenSource\mono-clone-context-accuracy -b feature/context-accuracy <BASELINE_SHA>`. Run the storage check first; the worktree needs its own `npm install` (about 400 MB). Don't create any other branch or worktree. If the path or branch already exists, stop and ask.
- Local docs and profile: `docs/` is ignored by the committed `.gitignore`, and `.agents/` by `.git/info/exclude`, which every worktree shares. The new worktree therefore has neither. Read them by absolute path from the main checkout: `E:\Developing\OpenSource\mono-clone\docs\...` and `E:\Developing\OpenSource\mono-clone\.agents\PROFILE.local.md`. Write status, retro and changelog updates to those main-checkout files only. Don't copy them into the worktree; never `git add -f` them.
- Shared resources: don't edit source, run installs or write build output (`node_modules`, `dist`, Cargo `target`) in the main checkout or any other worktree. Leave `mono-clone-hari`, `mono-clone-remote` and the stashes untouched.

## In plain words
The context popover next to the message box shows how full the model's memory is and what fills it. Today the total is real, but the breakdown is partly guessed. Anything MonoCode can't explain, such as old tool output, gets counted as "System & tools" and spread across your MCP servers, so SocratiCode or other servers can look huge when they aren't. After this change:
- For a Claude chat with a running Claude process, the popover asks Claude for its own breakdown and labels it "Reported by Claude Code". Some of Claude's categories are Claude's own estimates, so the popover never calls them exact.
- Otherwise, the guessed parts are labeled "Estimated", and the unexplained remainder shows as "Unclassified history" instead of being blamed on tools.
- The popover also says when a reading is out of date or missing.

## Storage-full hard blocker (mandatory)
Before installs, builds or large test runs, check free space on every required drive, including TEMP/TMP, caches and Cargo/build outputs. If storage is full, a write fails with ENOSPC, disk-full or insufficient space, or the verified space cannot support the operation, stop task work immediately. Do not retry, keep editing, relocate temp/cache/output directories or delete anything automatically. Safely cancel task-owned operations and preserve existing work. Report the affected drive/path, the measured space or error, the last completed step and the remaining work. Mark this spec and its index row Blocked only if that is safe to write; otherwise report Blocked without further writes. Resume only after space is restored and rechecked and partial outputs are assessed. Any cleanup needs Nakul's explicit authorization.

## Goal and user story
As a MonoCode user, I want the context popover to show where my context actually goes, and how sure it is, so I can decide when to compact or branch without chasing phantom MCP costs.

## Scope
1. Claude: a native breakdown via the `get_context_usage` control request (`detail: "summary"`) when the popover opens and an idle live process exists.
2. Estimated path (Codex, or Claude without a usable live process):
   - count tool output in the message estimate
   - stop splitting the residual across MCP servers and plugins
   - add an "Unclassified history" segment
   - label every estimated segment.
3. Freshness: Current, Updating, Stale and Unknown states for the reading, including after compaction and after an app restart.
4. Clear separation of current context from cumulative processed tokens in the popover headings.

## Out of scope
- Exact per-category numbers for Codex (Codex 0.159.0 exposes no breakdown API).
- Spawning or waking a provider process to inspect context.
- Pricing, quota, rate limits (unchanged) and status, voice or review event coverage.
- Persisting native breakdowns.
- Other providers (they keep today's popover; they gain only the Estimated labels because they share the estimate path).

## Current behavior (confirmed in source)
- `ContextMeter` (`src/features/sessions/ui/ContextMeter.tsx`), rendered from `Composer.tsx:1911-1922`:
  - It computes `messagesTokens = estimateBlocksTokens(blocks)`, then `computeContextBreakdown({ usedTokens: usage?.used ?? turnUsage?.input ?? messagesTokens, … })` (`ContextMeter.tsx:281-288`).
  - It then calls `computeSystemAndToolsBreakdown({ totalTokens: breakdown.systemAndTools, … })` (`ContextMeter.tsx:291-299`).
  - Memory files and skills are loaded and estimated when the popover opens (`ContextMeter.tsx:~190-253`).
- `estimateBlocksTokens` (`src/features/sessions/model/tokenCosting.ts:170-178`) counts only `block.text`. Tool output (`block.output`) is ignored, and blocks from before a compaction are still counted.
- `computeContextBreakdown` (`tokenCosting.ts:210-~300`):
  - `systemAndTools = max(0, used − (memory + skills + messages))`: the whole residual.
  - A fixed autocompact ratio: 0.165 for Claude, 0.15 otherwise.
  - A default window of 200,000.
  - Segment labels: "System & tools", "Memory files", "Skills", "Messages", "Autocompact buffer", "Free space".
- `computeSystemAndToolsBreakdown` (`src/features/sessions/model/systemBreakdown.ts:147-~240`): when the residual exceeds the fixed base, it allocates `residual − base` across MCP servers and plugins by name weight. This is the root cause of "large MCP" readings: unexplained history becomes MCP tokens.
- `ContextUsage` (`contextUsage.ts`) is `{used, window?}`. `mergeContextUsage` (`contextUsage.ts:64-71`) keeps the level. Only `contextUsed` and `contextWindow` are persisted (`sessionStore.ts:143-146`, restored by `contextFromRecord` at `sessionStore.ts:900-915`).
- Compaction:
  - Claude sets `live.compactionConfirmed = true` (`claude.ts:623`) and emits no context event of its own.
  - Codex 0.159.0 sends `thread/compacted` (`ContextCompactedNotification`) and a `contextCompaction` thread item. MonoCode's Codex adapter does not handle the notification.
- Claude 2.1.283 `get_context_usage` (embedded schema):
  - Request: `{subtype: "get_context_usage", detail?: "summary" | "full"}`. The summary mode answers from the last response's usage plus local estimates, without token-count API calls.
  - Response:
    - `categories[{name, tokens, color, isDeferred?, kind?: "used" | "free" | "buffer" | "deferred"}]`
    - `totalTokens`, `maxTokens`, `rawMaxTokens?`, `percentage`, `model`
    - `memoryFiles[{path, type, tokens}]`
    - `mcpTools[{name, serverName, tokens, isLoaded?}]`
    - `skills?{totalSkills, includedSkills, tokens}`
    - `autoCompactThreshold?`, `isAutoCompactEnabled`
    - `messageBreakdown{toolCallTokens, toolResultTokens, attachmentTokens, assistantMessageTokens, userMessageTokens, redirectedContextTokens, unattributedTokens}`
    - plus fields not used here.
- Codex 0.159.0 reports only `thread/tokenUsage/updated` (`codexProtocol.ts:380`) and compaction notifications.

## Proposed behavior and invariants
1. The popover's total ("Current context") always comes from the provider's reported level (`usage.used`), or, on the native path, from Claude's `totalTokens`. It never comes from `turnUsage` or session totals. If there is no level, the state is Unknown, and no percentage is computed from estimates. This replaces today's fallback to `turnUsage?.input ?? messagesTokens`.
2. The estimated segments always sum to exactly the current context. Order of attribution:
   1. system and built-in tools (fixed estimate)
   2. memory files
   3. skills
   4. messages, clamped to what is left
   5. Unclassified history = the remainder.
3. No estimate assigns tokens to a named MCP server or plugin. MCP servers and plugins are listed by name with "size not reported". Only the Claude native path shows per-server tokens.
4. Every segment carries a source label: `reported` (native) or `estimated`. `reported` means "Claude Code reported this number", not "measured" or "exact": in summary mode Claude combines the last response's usage with its own local estimates. No UI copy on either path uses the words "exact", "measured" or "actual" for a category.
5. Cumulative processed tokens (per turn and per chat) stay in their own sections, with headings that say "processed", never "context".
6. Opening the popover never starts a provider process and never sends a model request. The Claude native request goes only to an existing idle, initialized process.
7. Unexplained tokens are never distributed across MCP servers or plugins as tool-definition usage, on either path. On the estimated path they are Unclassified history. On the native path, Claude's `messageBreakdown.unattributedTokens` shows as its own "Unattributed" row, and MCP server rows show only Claude's per-server `mcpTools` numbers.
8. The Estimated, Unknown, Updating and Stale states apply to Claude and Codex alike. A native breakdown never makes a stale or unknown reading look current: it is requested and shown only while freshness is `current`.
9. A context refresh is read-only. It sends only `get_context_usage` and never changes the model, permission mode or any other setting.

### Freshness (in memory, not persisted)
`ContextUsage` gains optional `measuredAtUserBlockId?: string` and `stale?: boolean`. Only `used` and `window` stay persisted.
- `apply.ts` `context` case: after `mergeContextUsage`, set `measuredAtUserBlockId` to the id of the latest non-draft user block (or leave it undefined if there is none), and set `stale: false`.
- New `HarnessEvent` `{ type: "context.stale" }`. `apply.ts` sets `context.stale = true` when `context` exists.
  - Claude emits it where `compactionConfirmed = true` (`claude.ts:623`).
  - Codex emits it on `thread/compacted`.
- `mergeContextUsage` preserves `measuredAtUserBlockId` and `stale` from `previous` unless they are passed. Update its signature to accept them.
- `contextFreshness(usage, blocks, busy): "unknown" | "updating" | "stale" | "current"`, a pure function in `contextUsage.ts`:
  - `unknown` when `usage` is undefined or `used <= 0`
  - `updating` when `busy`
  - `stale` when `usage.stale`, or `measuredAtUserBlockId` is undefined (a restored reading), or it differs from the latest non-draft user block id
  - `current` otherwise.

### Claude native path
- New optional adapter method `inspectContext?(sessionId: string): Promise<NativeContextBreakdown | null>` on `HarnessAdapter` (`registry.ts:28`), and a registry wrapper `inspectHarnessContext(harness, sessionId)`. The wrapper returns `null` for adapters without the method.
- Claude implementation (`claude.ts`, exported as `inspectClaudeContext`):
  1. Call slice 2's `requestClaudeControl(sessionId, { subtype: "get_context_usage", detail: "summary" }, { timeoutMs: 5000, requireIdle: true, signal })`. This slice does not add, copy or wrap its own `sendControl` or `pendingControls`; it uses the reviewed transport from [claude-live-controls.md](claude-live-controls.md) (Shared control transport). `requireIdle` covers: no live process, not initialized, an active turn, a pending turn end, manual compaction, and pending approvals or questions.
  2. A `ClaudeControlError` of any reason (`unavailable`, `timeout`, `error`, `cancelled`, `stopped`, `write-failed`) returns `null`. Other errors are rethrown.
  3. On success, if `liveByThread.get(sessionId)?.generation !== generation` (the process was replaced while waiting), return `null`.
  4. Return `parseClaudeContextUsage(payload)`. It returns `null` on a parse failure.
- The adapter method signature is `inspectContext?(sessionId: string, signal?: AbortSignal)`, and the registry wrapper passes the signal through.
- `parseClaudeContextUsage` (`claudeProtocol.ts`, a hand-written guard in the style of the other `claudeProtocol.ts` parsers, since the repo has no Zod; unknown keys ignored; all nested arrays optional and defaulted to `[]`) returns `NativeContextBreakdown`, defined in `src/features/sessions/model/contextBreakdown.ts` (new):

```ts
type NativeContextBreakdown = {
  source: "claude";
  totalTokens: number; windowTokens: number; model?: string;
  categories: { name: string; tokens: number; kind: "used" | "free" | "buffer" | "deferred" }[];
  mcpServers: { serverName: string; tokens: number; toolCount: number; deferredTools: number }[];
  memoryFiles: { path: string; tokens: number }[];
  skills?: { count: number; tokens: number };
  messages?: { toolCalls: number; toolResults: number; attachments: number; assistant: number; user: number; unattributed: number };
  autoCompactThreshold?: number;
};
```

  - `kind` defaults to `"used"`.
  - `mcpServers` are grouped from `mcpTools` by `serverName`; `deferredTools` counts `isLoaded === false`.
  - Claude's `color` strings are terminal theme names and are ignored.
  - The response is rejected (returns `null`) if `totalTokens` or `maxTokens` is not a finite non-negative number.

### Estimated path
`computeContextBreakdown` changes:
- Input `usedTokens` becomes `number | undefined`. When it is undefined, return `{ state: "unknown" }`, and the popover renders the Unknown copy with no segments.
- `systemEstimate = baseInstructions + environment + builtinToolsTotal + globalRulesTotal`, using the constants that already exist in `systemBreakdown.ts` (move their computation into an exported `estimateSystemBase(harness, globalRules)`).
- Attribution per invariant 2. Each step takes `min(itsEstimate, remaining)`.
- New segment `{ id: "unclassified", label: "Unclassified history", colorClass: "bg-violet-400" }`, placed after Messages.
- The "System & tools" segment keeps its id `"system"` and its label.
- Each segment gains `source: "estimated" | "reported"`. The autocompact and free segments keep today's math on the estimated path and are `estimated`.

`estimateBlocksTokens` counts `block.text` plus `block.output` (string) for every block. Messages are clamped by invariant 2, so pre-compaction blocks can no longer inflate other segments.

`computeSystemAndToolsBreakdown` drops the weight allocation: `mcpServers` and `plugins` keep their names, with `tokens: undefined`, and `overhead` is removed. Update the `SystemAndToolsBreakdown` type accordingly, and delete `getMcpWeight` if nothing else uses it.

### Native mapping in the popover
When a native breakdown is present for the current session and was fetched after the latest context event:
- Segments come from `categories` in Claude's order.
  - `kind: "used"` → segments with `source: "reported"`, using a fixed palette by index from the existing classes (`bg-sky-400`, `bg-amber-500`, `bg-emerald-400`, `bg-rose-400`, `bg-violet-400`, `bg-cyan-400`, then repeat).
  - `kind: "buffer"` → `bg-content/20`; `kind: "free"` → `bg-content/5`.
  - `kind: "deferred"` → listed below the bar as "Deferred (not in context)", with no segment.
- The "System & tools" expansion becomes "MCP servers" with per-server tokens and "N tools deferred" when `deferredTools > 0`. Memory files come from the native list.
- The Messages row expands into tool calls, tool results, attachments, assistant, user and unattributed when `messages` is present.

## States and transitions
| State | Event | Next state | User sees |
|---|---|---|---|
| No reading | — | unknown | "No context reading yet. It appears after the first reply." No bar |
| Reading current, Claude live idle | Popover opens | loading native → native | Estimated view with "Checking with Claude Code…", replaced by the native view with the "Reported by Claude Code" badge and the note "Some of these numbers are Claude Code's own estimates." |
| Reading stale or unknown, Claude live idle | Popover opens | stale / unknown | No native request; the stale or unknown view as below |
| Loading native | Timeout, error or `null` | estimated | Estimated view; small note "Claude Code's breakdown wasn't available." |
| Reading, Codex or no Claude process | Popover opens | estimated | "Estimated" badge; Unclassified history segment |
| Any | Turn starts (`busy`) | updating | Badge "Updating…"; last values kept |
| Any | Compaction confirmed | stale | Badge "Out of date — updates after the next reply" |
| Restored after app restart | — | stale | Same badge |
| Native shown | New `context` event, turn start, compaction or process replaced | native discarded | Estimated, updating or stale view until reopened |

## Acceptance criteria
- AC-1 Given `usage = {used: 120_000, window: 200_000}`, memory 5,000, skills 3,000, messages estimated 40,000 and a Claude system estimate S, then:
  - the segments are system = S, memory 5,000, skills 3,000, messages 40,000, unclassified = 120,000 − S − 48,000
  - the sum of the used segments equals 120,000
  - no MCP server has tokens.
- AC-2 Given messages estimated at 150,000 and `used` = 60,000, then messages are clamped to `60,000 − S − memory − skills`, and unclassified is 0.
- AC-3 Given a block with `text: ""` and `output` of 38,000 characters, then `estimateBlocksTokens` returns 10,000.
- AC-4 Given `usage` undefined and `turnUsage.input = 50,000`, then the popover shows the Unknown copy and no percentage; the session totals section still shows 50,000 under "Processed this turn".
- AC-5 Given a Claude session with an idle, initialized live process and a `current` reading, when the popover opens, then exactly one `requestClaudeControl` call with `{subtype:"get_context_usage", detail:"summary"}` and `requireIdle: true` is made (one control request line written), and the parsed categories render with the "Reported by Claude Code" badge, the note "Some of these numbers are Claude Code's own estimates.", per-server MCP tokens and an "Unattributed" row when `unattributedTokens > 0`.
- AC-6 Given a Claude session with no live process, or with an active turn, when the popover opens, then no control request is written and no process is spawned; the estimated view shows.
- AC-7 Given the native request times out (5,000 ms, fake timers) or returns an error or an unparseable payload, then the estimated view shows with the note "Claude Code's breakdown wasn't available."
- AC-8 Given the popover is closed, or the session changes, before the native response arrives, then the late response is ignored (not rendered for another session, no state update after unmount).
- AC-9 Given a `context` event arrives after the latest user block, then freshness is `current`. When a new user block is appended, it becomes `stale` (idle) or `updating` (busy). After Claude confirms compaction or Codex sends `thread/compacted`, it becomes `stale` until the next `context` event.
- AC-10 Given a session restored from storage with `contextUsed` set, then freshness is `stale`.
- AC-11 Given `computeSystemAndToolsBreakdown` with three MCP servers and a large residual, then every server has `tokens === undefined` and the popover lists them with "size not reported".
- AC-13 Given the native response arrives after the Claude process was replaced (the answering generation differs from the current one), then `inspectClaudeContext` returns `null` and the estimated view shows.
- AC-14 Given a stale reading (after compaction or a restore), when the popover opens on a Claude session with an idle live process, then no control request is written and the stale badge shows.
- AC-15 Given the popover closes while the native request is pending, then its `AbortSignal` aborts, the transport rejects with `"cancelled"`, and no state update happens.
- AC-16 No rendered copy on either path contains "exact", "measured" or "actual" for a category (string check over the ContextMeter fixtures). No estimated-path MCP row carries a number.
- AC-17 This slice adds no `pendingControls` map and no second control-request writer; its only control call is `requestClaudeControl` (checked in review and by a grep in the report).
- AC-12 Popover headings: "Current context" for the gauge section, "Processed this turn" and "Processed this chat" for the usage sections (replacing "Session tokens" and "Session total tokens").

## Ordering contracts
- Popover open (ContextMeter effect keyed on `isOpen`, `sessionId`, `harness` and `usage` identity):
  1. Increment a local request token.
  2. If the harness is `claude`, `sessionId` is set, `!busy` and freshness is `current`, create an `AbortController` and call `inspectHarnessContext("claude", sessionId, controller.signal)`.
  3. On resolve, apply only if the token is unchanged and the effect is still active.
  4. Store `{ breakdown, forUsage: usage }`. Render native only while `forUsage === usage` (same object) and `!busy`.
- Cleanup on close, on a session change, or when a new `usage` arrives: mark inactive and abort the controller. The transport sends nothing to Claude on abort and ignores a late reply.
- Claude side: slice 2's transport owns request ids, the timeout, cancellation, stop rejection and process replacement. This slice only calls `requestClaudeControl` and checks the returned `generation`.
- Freshness is derived at render time; there is no timer.

## Implementation plan
0. Storage check, baseline check and worktree creation (see Baseline, dependencies and worktree). Confirm that `requestClaudeControl`, `ClaudeControlError` and `Live.generation` exist in `src/integrations/harness/providers/claude/claude.ts` on the baseline. If any is missing, stop and report Blocked: this slice must not implement the transport itself.
1. `contextUsage.ts`: extend `ContextUsage`, `mergeContextUsage` and `contextFreshness`.
2. `types.ts`: add the `context.stale` event. `apply.ts`: the `context` case sets freshness fields; add the `context.stale` case.
3. `tokenCosting.ts`: `estimateBlocksTokens` counts output; `computeContextBreakdown` attribution, the unclassified segment, `source`, and the unknown state.
4. `systemBreakdown.ts`: `estimateSystemBase`; remove the weight allocation; update the types. Keep `loadSystemAndToolsConfig` unchanged.
5. `contextBreakdown.ts` (new): the `NativeContextBreakdown` type and the pure `nativeSegments(breakdown)` mapping.
6. `claudeProtocol.ts`: `parseClaudeContextUsage` (hand-written guard; no Zod in the repo). `claude.ts`: `inspectClaudeContext` built on `requestClaudeControl`, and emit `context.stale` where `compactionConfirmed = true` is set (`claude.ts:623` at the old snapshot; find it by name). `claudeAdapter.ts`: wire `inspectContext`.
7. `codexProtocol.ts` / `codex.ts`: map `thread/compacted` to `context.stale`.
8. `registry.ts`: the optional `inspectContext` and `inspectHarnessContext`.
9. `ContextMeter.tsx`: a `sessionId` prop (pass it from `Composer.tsx:1911`), the native fetch effect, badges, unknown copy, the unclassified row, "size not reported" MCP rows, renamed headings.
10. Must not change: rate-limit fetching, pricing and cost math, the compact button, the gauge ring for other providers (aside from the Unknown state), persisted columns.

## UI details
- Badges (text `text-[10px]`, pill `rounded-full bg-content/10 px-1.5`):
  - `Reported by Claude Code`, with this note below the bar: `Some of these numbers are Claude Code's own estimates.`
  - `Estimated`
  - `Updating…`
  - `Out of date — updates after the next reply`
- Checking copy: `Checking with Claude Code…`. Fallback note: `Claude Code's breakdown wasn't available.`
- Unknown copy: `No context reading yet. It appears after the first reply.`
- Unclassified history row tooltip (`title`): `Tokens the provider counted that MonoCode can't attribute, usually older tool output and replies.`
- MCP rows on the estimated path: `<name> · size not reported`.
- Estimated segment values are prefixed with `~` (for example `~12K`).
- Reduced motion: no new animation.

## Skills to load
`frontend-ui`, `testing`, `desktop-app`.

## Test matrix
| AC / risk | Level | File | Scenario |
|---|---|---|---|
| AC-1, 2, 3 | unit | `tokenCosting.test.ts` | Attribution table; clamping; output counted; segments sum to used |
| AC-11 | unit | `systemBreakdown.test.ts` | No weight allocation; names kept; `estimateSystemBase` values |
| AC-9, 10 | unit | `contextUsage.test.ts`, `apply.test.ts` | `contextFreshness` table; apply sets `measuredAtUserBlockId`; `context.stale`; merge preserves fields |
| AC-5 parser | unit | `claudeProtocol.test.ts` | `parseClaudeContextUsage`: full payload, missing optionals, bad totals → null, MCP grouping |
| AC-5, 6, 7, 13 | adapter | `claudeLive.test.ts` | Idle live → one control request; active turn → none; timeout → null; error → null; generation changed → null |
| AC-14, 15, 16 | component | `ContextMeter.test.ts` | Stale reading → no inspect call; close aborts the signal; copy check for "exact", "measured" and "actual"; unattributed row |
| Codex stale | adapter | `codexLive.test.ts` | `thread/compacted` → `context.stale` event |
| AC-4, 12, native render | component | `ContextMeter.test.ts` | Static render: unknown copy, headings, badges, unclassified row, native segments from a fixture |
| AC-8 | component | `ContextMeter.test.ts` (or a new `contextMeterNative.test.ts` using the same render approach with a controlled promise) | Late response after close is ignored |

## Verification
- Implementer runs: `npx tsc --noEmit`; `npx vitest run src/features/sessions src/integrations/harness/providers/claude src/integrations/harness/providers/codex src/integrations/harness/core/apply.test.ts`; `npm test`; `git diff --check`. There is no ESLint config, so report lint as unavailable.
- Later (not the implementer): `npm run check:web`, a production build and the manual checks.

## Manual checks (Nakul or a desktop-access Codex session; not the implementer)
1. Claude chat with SocratiCode enabled, after a few tool-heavy turns: open the popover. It shows "Reported by Claude Code" with the estimates note, MCP servers with the sizes Claude Code reports, and a message breakdown. Compare with `/context` in a terminal Claude session on the same project; the totals should be close.
2. The same chat after 5+ idle minutes (process parked): the popover shows "Estimated" with Unclassified history, and MCP servers read "size not reported".
3. Codex chat: "Estimated" badge; after `/compact`, "Out of date" until the next reply.
4. Restart MonoCode and open a chat: "Out of date".
5. New chat before the first reply: the Unknown copy.
6. Check that the popover fits and scrolls at the narrowest window width.

## Facts, decisions, assumptions
- Facts: Current behavior above (source, and the schemas of Claude 2.1.283 and Codex 0.159.0).
- Decisions:
  - Native only from an existing idle process: no spawn, no quota use.
  - Show the residual as its own segment instead of distributing it.
  - Freshness is in memory, so there is no schema change.
  - Native categories are rendered by Claude's own names, so the UI doesn't hard-code a category list that can drift.
  - Native numbers are labeled as reported by Claude Code, with a note that some are Claude's estimates, not as exact.
  - The control transport belongs to slice 2. This slice depends on it and never implements its own copy.
- Assumptions (unverified):
  - `get_context_usage` with `detail: "summary"` answers during idle without an API call (the CLI description says so; manual check 1).
  - The exact category names Claude returns (rendered verbatim, so not load-bearing).

## Open questions
None blocking. Future: a Claude "full" detail mode (it makes token-count API calls, so it would need an explicit user action).

## Implementer report format
Per AC: done / partial / not done, with file:line or test name · deviations and why · confirmation that the transport was reused from slice 2 (grep result for `pendingControls` and `control_request` writers) · open questions · checks run with exact results · files changed · the manual checklist above as a follow-up.

## Handoff prompt
Use only after Nakul approves this contract, moves it to Todo and fills in `<BASELINE_SHA>` and `a65bd4e4b0c2742cd0fc54a4087358471efc3888`.

```text
Implement umbrella slice 4 of the provider batch: Accurate context breakdown for Claude and Codex.

Spec: E:\Developing\OpenSource\mono-clone\docs\specs\context-accuracy.md

1. Read, by absolute path from the main checkout (they are git-ignored, so the new worktree won't have them; don't copy them and never git add -f them):
   E:\Developing\OpenSource\mono-clone\.agents\PROFILE.local.md, E:\Developing\OpenSource\mono-clone\AGENTS.md, E:\Developing\OpenSource\mono-clone\docs\WORKING-AGREEMENT.md,
   E:\Developing\OpenSource\mono-clone\docs\changelog\CHANGELOG.md (then its Current numbered file), E:\Developing\OpenSource\mono-clone\docs\specs\SPECS.md,
   E:\Developing\OpenSource\mono-clone\docs\WINDOWS-CHANGES.md, then the spec above.
2. Baseline: <BASELINE_SHA> on nakul/windows-support, containing the umbrella baseline checkpoint and slices 1 and 2 integrated and verified.
   Checkpoint: a65bd4e4b0c2742cd0fc54a4087358471efc3888. Dependencies: see "Baseline, dependencies and worktree" in the spec.
   Run every check in that section. If one fails, stop and report Blocked.
3. Storage-full hard blocker (mandatory): Before installs, builds or large test runs, check free space on every required drive, including TEMP/TMP, caches and Cargo/build outputs. If storage is full, a write fails with ENOSPC, disk-full or insufficient space, or the verified space cannot support the operation, stop task work immediately. Do not retry, keep editing, relocate temp/cache/output directories or delete anything automatically. Safely cancel task-owned operations and preserve existing work. Report the affected drive/path, the measured space or error, the last completed step and the remaining work. Mark this spec and its index row Blocked only if that is safe to write; otherwise report Blocked without further writes. Resume only after space is restored and rechecked and partial outputs are assessed. Any cleanup needs Nakul's explicit authorization.
4. After the storage check, you are authorized to create exactly one worktree from the verified baseline:
   git -C E:\Developing\OpenSource\mono-clone worktree add E:\Developing\OpenSource\mono-clone-context-accuracy -b feature/context-accuracy <BASELINE_SHA>
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
- Implemented and committed `11981c0` on `nakul/windows-support` at 2026-09-30 22:26 IST. Only Context Accuracy was implemented; no branch/worktree, push, version bump, build or desktop run.
- AC-1/2/3/11: ordered attribution, clamping, tool output and unnamed extension sizes covered by tokenCosting and systemBreakdown tests.
- AC-4/5/6/7/8/12/14/15/16: popover unknown/current/updating/stale states, reported details, unavailable fallback, headings, no inspection while stale/busy, cancellation and late-response suppression covered by contextMeterNative.test.ts and Claude live tests.
- AC-9/10: contextFreshness and apply tests cover submitted user identity, drafts, restored readings and compaction. Claude and Codex live tests verify stale events.
- AC-13: successful transport response followed by process stop is rejected by the generation guard; existing transport handles replacement and stale replies.
- AC-17: reused requestClaudeControl, ClaudeControlError and Live.generation. Source diff adds no pendingControls and no control_request writer; the existing pendingControls map and sendControl writer remain unchanged.
- Verification: npx tsc --noEmit passed; spec focused command passed (129 files / 1,487 tests); npm test run once passed (340 files / 3,860 tests); final targeted recheck passed (3 files / 19 tests); git diff --check passed. Lint unavailable; build intentionally not run.
- Storage before npm test: C: 9,190,576,128 bytes free; E: 20,619,251,712 bytes free; TEMP/TMP on C:.
- Source adaptation: Block output in this checkout is tool.preview.output or tool.detail. The estimator counts that representation and also accepts the spec's output fixture without adding persisted fields. Codex compaction is handled in codexProtocol.ts through the existing codex.ts notification dispatch, so codex.ts needed no edit.
- Open questions: none. The unchanged Manual checks remain for Nakul or a desktop-access session.
