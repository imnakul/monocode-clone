# UltraContext Integration Plan for MonoCode

Status: design only; no application code changed.
Verified against MonoCode and UltraContext on 2026-09-06.

## Goal

Improve normal provider switching so Claude -> Codex -> OpenCode -> Cline -> Antigravity can continue with richer shared context than today's short handoff summary.

Do **not** replace MonoCode's explicit Handoff or Second Opinion features. Those intentionally create a new side session with a focused continuation/review packet and should remain separate UX.

## Important distinction

MonoCode currently has three different behaviors:

1. Normal provider switch: same MonoCode session, new provider, compact handoff context.
2. Handoff button: new side session that continues work from a selected point using a synthesized handoff packet.
3. Second Opinion: new side session that reviews/fixes one completed turn using a focused review packet.

UltraContext should target **#1 first**. It is a continuity layer, not a replacement for #2 or #3.

## Current normal-switch flow

```text
current provider conversation
  -> planComposerSwitch()
  -> optionally requestOutgoingHandoff()
  -> outgoing provider generates <120-word recap
  -> deterministic recap is fallback
  -> handoff card is stored
  -> wrapHandoffPrompt() injects recap into first turn on new provider
  -> new provider continues
```

## Existing files involved

- `src/lib/handoff.ts`
  - `planComposerSwitch()` decides whether a provider change needs a handoff.
  - `buildOutgoingHandoffPrompt()` asks the outgoing model for the short recap.
  - `buildDeterministicHandoff()` provides the no-LLM fallback packet.
  - `chooseHandoffBrief()` selects model recap vs deterministic fallback.
  - `wrapHandoffPrompt()` gives the resulting recap to the incoming provider.
- `src/lib/handoffTurn.ts`
  - `requestOutgoingHandoff()` performs the extra model turn used only to create the recap.
- `src/App.tsx`
  - owns provider switching and consumes the handoff packet.
- `src/lib/secondOpinion.ts`
  - leave unchanged for V1.

## UltraContext facts relevant to the design

UltraContext's CLI requires Node 22+ and can run `ultracontext` / `ultracontext sync` as a daemon with a dashboard. Its public README says it auto-ingests Claude Code, Codex and OpenClaw sessions and exposes an MCP server. It is Apache-2.0.

Its hosted Context API exposes create/get/append/update/delete and the JS SDK examples currently use an API key. The public README does **not** clearly document a writable localhost SDK endpoint for the daemon.

Therefore V1 must not assume that `new UltraContext()` can directly write to a local daemon without authentication. Keep the transport behind a MonoCode adapter so we can use local MCP/CLI when verified, or the free hosted Context API if explicitly chosen.

## Decision gate before coding

MonoCode already persists a normalized transcript (`Session.blocks`) containing user/assistant text, plans, tasks and tool activity. For an in-app provider switch we already possess much of the context that the next provider needs.

So first compare these two approaches:

### A. Better MonoCode-native handoff

Build a richer bounded packet directly from `Session.blocks` instead of the current very short recap. No new dependency, no daemon and no external storage.

### B. UltraContext-backed handoff

Use UltraContext when it can recover useful provider-native context that MonoCode does not preserve, or when continuity must extend to sessions created outside MonoCode.

If A performs almost as well as B for MonoCode-only sessions, keep UltraContext optional rather than required.

## Step 0 - zero-code UltraContext test

1. Install Node 22+ and `npm install -g ultracontext`.
2. Run `ultracontext` and leave the local sync daemon active.
3. Run one Claude and one Codex task through MonoCode.
4. Confirm in UltraContext's dashboard that those provider sessions are detected.
5. Check whether the captured data contains materially more useful history than `Session.blocks`.
6. Only continue with app integration if that additional context improves a provider-switch test.

## V1 implementation shape

Add an optional provider-neutral context abstraction; do not import UltraContext directly into `App.tsx`.

Suggested new files:

```text
src/lib/sharedContext/types.ts
src/lib/sharedContext/index.ts
src/lib/sharedContext/ultraContext.ts
src/lib/sharedContext/ultraContext.test.ts
```

Minimal contract:

```ts
export type SharedContextProvider = {
  available(): Promise<boolean>;
  capture(session: Session): Promise<void>;
  contextForSwitch(session: Session, to: HarnessId): Promise<string | null>;
};
```

`contextForSwitch()` must return a bounded plain-text/Markdown packet. The rest of MonoCode should not know whether it came from local MCP, CLI, hosted API, or a future replacement.

Target budget for the incoming context should initially be about 2k-4k tokens, not the complete raw transcript.

## Exact normal-switch replacement

Today the expensive branch is effectively:

```text
provider switch
  -> shouldAskOutgoingAgent()
  -> requestOutgoingHandoff()
  -> outgoing LLM writes short recap
  -> chooseHandoffBrief()
  -> wrapHandoffPrompt()
```

Change it to:

```text
provider switch
  -> sharedContext.contextForSwitch()
  -> if good context exists: use it
  -> else requestOutgoingHandoff() when appropriate
  -> else buildDeterministicHandoff()
  -> wrapHandoffPrompt()
```

Thus `requestOutgoingHandoff()` is **not deleted**. It becomes fallback behavior.

`wrapHandoffPrompt()` can remain initially. It already provides a clean provider-independent point for inserting context into the incoming agent's first turn.

`buildDeterministicHandoff()` also remains as the final no-service/no-LLM fallback.

## Capture strategy

Do not stream every token/delta into UltraContext. MonoCode already normalizes provider output.

Capture at stable boundaries:

- after a user turn is accepted;
- after an assistant turn completes;
- after a plan/task snapshot becomes final when useful;
- after recorded edits/tool results when they materially affect continuation.

Prefer one append per settled turn rather than dozens of event-level writes.

There are two possible UltraContext modes:

1. **Observer mode:** let the UltraContext daemon auto-ingest Claude/Codex provider-native sessions. Lowest integration effort, but not universal for MonoCode's other providers.
2. **Write-through mode:** MonoCode writes its normalized cross-provider session into one UltraContext context. This is the desired universal design, but requires a confirmed writable local interface or use of the hosted Context API.

If write-through mode is used, persist an optional `sharedContextId`/UltraContext context id with the MonoCode session so all providers append to the same context.

Never block a coding turn because UltraContext is unavailable. Capture and retrieval failures must be silent/fallback-safe.

## Files expected to change for V1

| File | Change |
|---|---|
| `src/lib/sharedContext/*` | New provider-neutral context adapter and UltraContext implementation |
| `src/App.tsx` | Small hook into normal provider-switch resolution and settled-turn capture |
| `src/lib/handoff.ts` | Small helper/refactor so an externally supplied rich brief can reuse current wrapping/fallback logic |
| `src/lib/handoffTurn.ts` | Keep unchanged or minimally change call site; it remains fallback |
| `src/lib/session.ts` | Optional context id/status metadata if write-through API mode is used |
| `src/lib/sessionStore.ts` | Persist optional context metadata if required |
| tests | Provider unavailable, successful retrieval, fallback, no duplicate capture |

Do **not** modify each harness adapter for V1. Shared context belongs above the provider registry.

## Estimated code size

- Observer-mode experiment: **0-80 LOC** in MonoCode; mostly external setup.
- Rich switch retrieval only: **~150-300 LOC** plus tests.
- Universal write-through with persistence, retries and tests: **~300-550 LOC** total.

This is substantially smaller than implementing a memory/context engine ourselves.

## Success criteria

A/B test the same multi-turn task with Claude -> Codex (and later other providers):

- incoming agent does not repeat already completed exploration;
- decisions/constraints survive the switch;
- edited files and unresolved tasks survive the switch;
- fewer clarification/re-read tool calls after switching;
- no regression when UltraContext is stopped;
- no additional LLM call for handoff when rich shared context is available.

## Handoff and Second Opinion

Leave both unchanged in V1.

They are valuable even though they are not true transcript forks:

- **Handoff** creates a new side session and asks another provider to continue from a focused packet.
- **Second Opinion** creates a new side session and asks another provider to review/fix a completed turn.

A future true-fork feature should instead clone the full MonoCode transcript/session state into a second session. UltraContext's Context API supports a fork/clone primitive, so it may become useful there later, but that is a separate feature.

## Recommended implementation order

1. Run the zero-code UltraContext capture experiment.
2. Compare UltraContext's captured context with MonoCode's own `Session.blocks`.
3. Prototype `SharedContextProvider` with current deterministic handoff as fallback.
4. Integrate only normal provider switching.
5. Measure switch quality before adding write-through capture for every provider.
6. Only after that consider using UltraContext for true chat forks or external-session continuity.

## Source

UltraContext: https://github.com/ultracontext/ultracontext

Current public docs confirm CLI daemon/sync, automatic Claude Code/Codex/OpenClaw ingestion, standalone MCP and Context API. Re-check the local writable API contract before implementing write-through mode because the public SDK example currently uses an API key.
