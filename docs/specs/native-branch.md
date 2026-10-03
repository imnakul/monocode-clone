# Done — Native Branch (provider-owned fork) — spec

- Workflow status: Done — set 2026-10-01 18:20 IST by Claude at close-out. Nakul reported build 0.1.55-local5-provider-fixes fine; per-check results weren't itemized, so the Manual checks section and its caveats stay as written. Pushed to the fork at `c2c8bf6`. Earlier status: Todo — updated 2026-09-30 21:35 IST by Claude; see SPECS.md.
- Tier: complex · Snapshot: `9397898` on `nakul/windows-support` plus the retained uncommitted changes listed in the umbrella plan, 2026-09-30. The earlier 26 Sept snapshot (orchestration WIP) and its direct-checkout exception are retired.
- Provider versions verified 2026-09-30: Claude Code 2.1.283, codex-cli 0.159.0, OpenCode 1.18.30.
- The cold-resume spec's "New chat from summary" action is not part of this batch. This spec therefore no longer defines a forced-summary option; that spec can add one later.

## Baseline, dependencies and worktree
- Revised 2026-09-30 after the handoff review ([provider-spec-handoff-review-30sept.md](../notes/provider-spec-handoff-review-30sept.md)). Approved by Nakul 2026-09-30 (Todo); implemented through the combined batch prompt.
- Position in the batch: fourth of six (umbrella slice 3). Order: slice 1 approvals → slice 2 Claude live controls → slice 4 context → slice 3 native branch → slice 5 AI helpers → slice 6 forms. Implement and integrate one slice at a time: each slice is merged into `nakul/windows-support` and verified before the next worktree is cut.
- Prerequisite baseline: the `nakul/windows-support` commit that contains the umbrella baseline checkpoint and slices 1, 2 and 4 integrated and verified. Nakul gives its SHA in the handoff prompt as `<BASELINE_SHA>`, and the checkpoint SHA recorded in the umbrella plan as `a65bd4e4b0c2742cd0fc54a4087358471efc3888`.
- Dependencies: Slice 1: build the fork flags on its version of `buildClaudeSpawnArgs` (with `allowedTools`). Slice 2: a fork spawn is a fresh spawn, so initialize slice 2's `Live` fields (`liveKey`, `pendingControls`, `generation`) for it the same way as any spawn; live switching never applies to a fork spawn. Slice 4: its `context.stale` event and freshness fields must keep working in a branch.
- Verify before starting: `git -C E:\Developing\OpenSource\mono-clone cat-file -e <BASELINE_SHA>^{commit}` succeeds; `git -C E:\Developing\OpenSource\mono-clone merge-base --is-ancestor a65bd4e4b0c2742cd0fc54a4087358471efc3888 <BASELINE_SHA>` succeeds; `git -C E:\Developing\OpenSource\mono-clone merge-base --is-ancestor <BASELINE_SHA> nakul/windows-support` succeeds; the SPECS.md rows for slices 1, 2 and 4 read Done. If any check fails, or either SHA is missing from the handoff, stop and report Blocked. Don't pick a baseline yourself.
- Worktree: once this spec is Todo, you are authorized to create this slice's worktree yourself, from the verified baseline only: `git -C E:\Developing\OpenSource\mono-clone worktree add E:\Developing\OpenSource\mono-clone-native-branch -b feature/native-branch <BASELINE_SHA>`. Run the storage check first; the worktree needs its own `npm install` (about 400 MB). Don't create any other branch or worktree. If the path or branch already exists, stop and ask.
- Local docs and profile: `docs/` is ignored by the committed `.gitignore`, and `.agents/` by `.git/info/exclude`, which every worktree shares. The new worktree therefore has neither. Read them by absolute path from the main checkout: `E:\Developing\OpenSource\mono-clone\docs\...` and `E:\Developing\OpenSource\mono-clone\.agents\PROFILE.local.md`. Write status, retro and changelog updates to those main-checkout files only. Don't copy them into the worktree; never `git add -f` them.
- Shared resources: don't edit source, run installs or write build output (`node_modules`, `dist`, Cargo `target`) in the main checkout or any other worktree. Leave `mono-clone-hari`, `mono-clone-remote` and the stashes untouched.

## In plain words
Today, **Branch from here** opens a new chat with a copy of the transcript and puts a text summary of the conversation in the message box, which you then send. The new chat starts a fresh provider conversation that only knows what the summary says. After this change, for Claude, Codex and OpenCode, the branch continues the provider's own conversation up to the turn you clicked, with all tool output and files it had read. The message box starts empty, and a small divider says what happened. Other providers keep exactly today's behavior. When a native branch isn't possible, the divider says why and you get today's copied summary instead. If the provider refuses the branch before it gets your first message, MonoCode sends that message once with a copied summary and says so. If MonoCode can't tell whether the provider got your message, it never sends it again on its own: the divider says the message wasn't confirmed, and you decide whether to send it again.

## Storage-full hard blocker (mandatory)
Before installs, builds or large test runs, check free space on every required drive, including TEMP/TMP, caches and Cargo/build outputs. If storage is full, a write fails with ENOSPC, disk-full or insufficient space, or the verified space cannot support the operation, stop task work immediately. Do not retry, keep editing, relocate temp/cache/output directories or delete anything automatically. Safely cancel task-owned operations and preserve existing work. Report the affected drive/path, the measured space or error, the last completed step and the remaining work. Mark this spec and its index row Blocked only if that is safe to write; otherwise report Blocked without further writes. Resume only after space is restored and rechecked and partial outputs are assessed. Any cleanup needs Nakul's explicit authorization.

## Goal and user story
As a MonoCode user, when I click **Branch from here** on a Claude Code, Codex or OpenCode turn, I want the new chat to continue the provider's own conversation history up to that turn, so that the branch keeps full memory (tool output, files read, plans) instead of a truncated text copy pasted into the composer.

Routing:

```
Branch from here
  ├─ Claude Code → claude --resume <src> --fork-session --session-id <new> [--resume-session-at <uuid>]
  ├─ Codex       → app-server thread/fork { threadId, lastTurnId? }
  ├─ OpenCode    → POST /session/<src>/fork { messageID? }   (messageID = the next user message, exclusive)
  ├─ Claude/Codex/OpenCode, native not possible at click → today's copied summary in the composer + divider with the reason
  └─ any other provider → exactly today's flow (copied summary in the composer, no divider)
```

## Scope
1. Decide the branch kind when the user clicks Branch (pure planner, unit tested): `native`, `copied` or `legacy`.
2. Persist a native or copied decision on a visible "Branched from …" divider block (no database migration). Legacy branches get no divider.
3. Perform the native fork lazily, on the branch's first send, inside the three adapters.
4. If a native branch can't fork at first send, and the adapter proves the failure happened before the user's message was written (`NativeForkError`), fall back automatically to a copied summary sent once as a hidden prefix, disclose it on the divider and in a status row, and deliver the user's message once.
5. If the first native send fails in any other way, MonoCode can't know whether the provider accepted the message. The branch enters an explicit "not confirmed" recovery state, resends nothing, and tells the user what to do.
5. Record the provider positions needed to fork at earlier turns:
   - Claude: the transcript entry uuid per turn (new).
   - OpenCode: the user message id per turn (new).
   - Codex: the turn id (already recorded).

## Out of scope
- Branching into a different provider (use Handoff).
- Eager forking at click time, a "Show copied summary" viewer, branch trees or navigation UI.
- Native fork for Cursor, Grok, Pi, omp, fx, Antigravity, Cline and Hermes. They keep today's flow exactly.
- A forced-summary option (cold-resume spec, not selected).
- Any Rust, SQLite schema, Tauri command, dependency, version bump, installer, commit or push.
- Desktop UI verification by the implementing agent (see Manual checks).

## Current behavior (confirmed in source, 2026-09-30)
- `onBranch` in `src/app/App.tsx:7700-7728`:
  - finds the source in `sessionsRef`
  - copies blocks through the turn's last block with `forkThreadBlocks` and builds `buildForkBundle`
  - creates `newSession(harness, session.cwd, model, runtimeMode, modelSettings)` with `title: "<title> (branch)"`, `blocks: copied` and `composerSeed: bundle.text`
  - appends a tab and focuses the composer.
  The copy does not carry `providerAccountId`, `worktreeCwd` or `branch`, and the new chat has no provider session, so the first send starts a fresh native session.
- `src/features/sessions/model/fork.ts`:
  - `forkThreadBlocks` gives blocks fresh ids, drops undecided approvals and preparing handoffs, clears `streaming`, and copies every other field including `providerTurnId`.
  - `buildForkBundle` includes user and assistant text only. It caps `MAX_FORK_TURNS = 200`, 4,000 characters per turn and 100,000 characters total; tool output is dropped.
- `composerSeed` is only an initial draft (`SessionPane.tsx:497-501`, read when the composer mounts), so the bundle lands in the composer and the user must send it. There is no channel to refill a mounted composer.
- Branch button: `TurnDuration` (`AgentTranscript.tsx:1016`), rendered for every settled turn (`AgentTranscript.tsx:926`), wired through `SessionPane.tsx` and `PaneTree.tsx` to `App.onBranch(sessionId, turn)`.
- Branch is a local fork feature; upstream has no native branch. Nothing to port.
- Provider facts (verified 2026-09-30 against the installed CLIs and pinned sources):
  - Claude Code 2.1.283:
    - `--fork-session` and `--resume-session-at <message id>` are present in the binary.
    - The binary contains the error "--session-id can only be used with --continue or --resume if --fork-session is also specified."
    - Stream-json `assistant` messages carry a `uuid` field.
  - Codex 0.159.0 `ThreadForkParams` (generated schema):
    - `threadId` (required)
    - `lastTurnId`: "Optional last turn id to fork through, inclusive … The referenced turn cannot be in progress."
    - `excludeTurns`: "return only thread metadata and live fork state without populating `thread.turns`" — response size only; it does not change what is forked.
    - Also `cwd`, `model`, `modelProvider`, `approvalPolicy`, `approvalsReviewer`, `sandbox`, `serviceTier`, `config`, `baseInstructions`, `developerInstructions`, `ephemeral` and `threadSource`. There is no `sandboxPolicy` field.
    - The response requires `thread`, `model`, `modelProvider`, `cwd`, `approvalPolicy`, `approvalsReviewer` and `sandbox`.
  - OpenCode 1.18.30 `Session.fork` (`packages/opencode/src/session/session.ts:691-730` at tag `v1.18.30`):
    - It copies messages strictly before the message whose id equals `messageID`, so the fork point is exclusive.
    - When `messageID` is not found, the index is -1 and every message is copied.
    - Without `messageID`, everything is copied.
    - The fork gets a new id and the title "(fork #N)".
- Adapters today:
  - Claude `ensureLive` (`claude.ts:342-477`):
    - reuses a live child when cwd, settingsKey and planning match; otherwise spawns with `--resume <id>` from `resumeByThread`, or with `--session-id <new uuid>`
    - sets `resumeByThread` before init, then writes `{subtype:"initialize"}`
    - `waitForInit` resolves on init, on child exit or after 8 s; after it, `session.providerBound` and `session.started` are emitted unconditionally.
    `launchOptions` is at `claude.ts:1427-1466`; `buildClaudeSpawnArgs` at `claudeProtocol.ts:240-290`; `handleResult` at `claude.ts:~800`.
  - Codex `ensureLive` (`codex.ts:392-~590`):
    - `thread/resume` when a resume entry exists (`codex.ts:509`), else `thread/start` (`codex.ts:531`) with `buildThreadStartParams` (`codexProtocol.ts:97`, includes `sandboxPolicy`)
    - emits `session.providerBound` (`codex.ts:581`).
    `turn.started` events carry the Codex turn id (`codex.ts:266,636`), stored on the latest user block as `providerTurnId` by `apply.ts:133`.
  - OpenCode `resolveSession` (`opencode.ts:526-553`):
    - adopts `resume.sessionId`, forks only when the directory differs, and otherwise creates.
    - `OpenCodeClient.forkSession(sessionID, directory)` (`opencodeClient.ts:79-91`) sends an empty body.
    - `OpenCodeClient.getMessages(sessionID)` (`opencodeClient.ts:47-52`) returns `{info?, parts?}[]`.
    - `message.updated` handling (`opencode.ts:645-657`) records user message ids in `messageRoleById` but emits nothing for them.
- Session fields are SQLite columns (`src/features/sessions/data/sessionStore.ts` `persistableMeta`, line 121), so a new top-level Session field would need a Rust migration. Block fields persist as JSON through `sanitizeBlock` (`sessionStore.ts:505`), which copies only known fields.
- Turn grouping: `groupTurns` (`transcriptActivity.ts:210`) gives a `handoff` block its own group; a trailing `system` block joins the previous turn. System blocks render at `AgentTranscript.tsx:1517`; `HandoffDivider` (`AgentTranscript.tsx:3460`) is the divider style to mirror.

## Proposed behavior and invariants
1. History is copied, never shared. A native branch always gets a new provider conversation id; the source's provider conversation is never resumed or modified by the branch.
2. The branch never contains provider turns that happened after the clicked turn. If that cannot be guaranteed, the branch uses a copied summary.
3. The user's first message in a branch reaches exactly one provider conversation, exactly once.
4. The visible transcript is exactly today's copy (`forkThreadBlocks`), plus one divider block at the end for native and copied branches.
5. Nothing is sent to any provider when Branch is clicked. All provider work happens on the branch's first send.
6. Every copied branch of a Claude, Codex or OpenCode chat states why on its divider.
7. Legacy branches (any provider other than Claude, Codex and OpenCode) behave exactly as today: same title, blocks, `composerSeed: bundle.text`, no divider, no `branchOrigin`, no copied account or worktree, no prompt wrapping.
8. A copied branch of a supported provider made at click time behaves like today (bundle in the composer, first send unwrapped) plus the divider.
9. A hidden summary prefix is used only for the first-send fallback of a native branch, where the composer was empty. It is sent once and disclosed.
10. MonoCode never resends automatically when the message might already have been accepted. The only automatic resend is the single prefix send after `NativeForkError`, which adapters throw only before the user message is written. Every other first-send outcome without `session.providerBound` goes to `native/uncertain`, and only a new user action sends again.

### Data model (all in `src/features/sessions/model/session.ts`)
Add to `Block`:
```ts
/** Claude Code transcript entry uuid that ends this user turn (last top-level assistant message). Used to fork at this turn. */
providerForkPoint?: string;
/** "Branched from …" divider; present only on the system block that opens a native or copied branch. */
branchOrigin?: BranchOrigin;
```
Add types:
```ts
export type BranchSummaryReason =
  | "different-provider"   // the clicked turn was answered by another provider
  | "not-started"          // source has no provider conversation id
  | "pending-switch"       // source is mid provider switch
  | "orchestration-worker" // source is an internal orchestration worker
  | "no-fork-point"        // an earlier turn without a recorded provider position
  | "source-continued"     // whole-conversation fork, but the source moved on before the first send
  | "branch-changed"       // provider, account or working folder of the branch changed before the first send
  | "fork-failed";         // the provider rejected the fork at first send

export type BranchOrigin = {
  /** MonoCode id of the branch session that owns this divider. Copies in later branches carry an old id and are inert. */
  sessionId: string;
  sourceSessionId: string;
  sourceTitle: string;
  harness: HarnessId;              // branch provider at creation
  mode: "native" | "summary";
  /** summary only: "composer" = decided at click (today's flow); "prefix" = first-send fallback of a native branch. */
  summaryDelivery?: "composer" | "prefix";
  /** native and prefix: pending until the first send binds a provider conversation; composer: always "done".
   *  "uncertain" (native only): the first send ended without a binding and without NativeForkError, so the provider may have accepted the message. */
  status: "pending" | "uncertain" | "done";
  reason?: BranchSummaryReason;    // required when mode === "summary"
  /** Native only (kept while "pending" or "uncertain"); removed when status becomes "done", on conversion to summary, or when copied into another branch. */
  fork?: {
    sourceProviderSessionId: string;
    forkPoint?: string;            // see NativeForkRequest
    providerAccountId?: string;    // source account at click time
    workCwd: string;               // sessionWorkCwd(source) at click time
    sourceLastUserBlockId?: string; // only for whole-conversation forks (forkPoint absent)
  };
};
```

### Harness contract (`src/integrations/harness/core/types.ts`)
```ts
export type NativeForkRequest = {
  /** Claude session id, Codex thread id, or OpenCode session id to copy. */
  sourceProviderSessionId: string;
  /** Claude: transcript entry uuid kept (inclusive). Codex: turn id kept (inclusive). OpenCode: first message id left out (exclusive). Absent: copy everything. */
  forkPoint?: string;
};
```
- `HarnessSessionInput` gains `fork?: NativeForkRequest`. Adapters honor it only when they have neither a live child nor a resume entry for `input.sessionId`; otherwise they ignore it.
- New exported error class `NativeForkError extends Error` in `types.ts`, re-exported from `integrations/harness/index.ts`. Adapters throw it only for failures that happen before the user message is written to the provider. After the first byte of the user message is written (Claude stdin, Codex `turn/start`, OpenCode prompt request), an adapter must never throw `NativeForkError`; it uses its existing error path.
- `sendHarnessTurn` awaits the adapter's `sendTurn` (`registry.ts:186-209`), so its settlement marks the end of the first send's turn. The App uses that settlement to decide between done, fallback and uncertain.
- `HarnessEvent` gains `{ type: "turn.forkPoint"; providerForkPoint: string }`.

## Branch planner (pure) — `src/features/sessions/model/branchPlan.ts` (new)
`planBranch(input: { source: Session; turn: Block[]; newSessionId: string }): BranchPlan | null`

```ts
type BranchPlan =
  | { kind: "legacy"; blocks: Block[]; bundleText: string }
  | { kind: "copied"; blocks: Block[]; bundleText: string; origin: BranchOrigin }
  | { kind: "native"; blocks: Block[]; origin: BranchOrigin };
```

It returns `null` when `turn` has no blocks or the copy is empty (the same early returns as today).

Algorithm, in this order:
1. `copied = forkThreadBlocks(source.blocks, lastBlockId(turn))`; `bundleText = buildForkBundle(copied).text`. Return `null` if `copied.length === 0`.
2. If `source.harness` is not one of `"claude"`, `"codex"` or `"opencode"`, return `{ kind: "legacy", blocks: copied, bundleText }`.
3. `userBlock = turn.find(b => b.role === "user")`; `turnHarness = harnessForTurn(source.blocks, turn, source.harness)` (`secondOpinion.ts:19`).
4. The first matching rule gives a copied branch with that reason (skip to step 6):
   - `turnHarness !== source.harness` → `different-provider`
   - `source.orchestrationLeadId` set → `orchestration-worker`
   - `source.pendingSwitch` set → `pending-switch`
   - `!source.providerSessionId` → `not-started`
5. Fork point. Let `endIndex` be the index in `source.blocks` of the turn's last block, and `laterUsers` the user blocks after `endIndex` with `!draft`. Internal blocks count, because they were sent to the provider.
   - Codex: if `userBlock.providerTurnId` exists and no block in `laterUsers` has the same `providerTurnId`, then `forkPoint = userBlock.providerTurnId`.
   - Claude: if `userBlock.providerForkPoint` exists, then `forkPoint = userBlock.providerForkPoint`.
   - OpenCode: if `laterUsers[0]?.providerTurnId` exists, then `forkPoint = laterUsers[0].providerTurnId` (exclusive: the next user message and everything after it is left out).
   - If there is no fork point, `laterUsers.length === 0` and `!source.busy`, it is a whole-conversation fork: `forkPoint` absent, `sourceLastUserBlockId = userBlock.id`.
   - Otherwise it is a copied branch with `no-fork-point`.
6. Copied origin: `mode: "summary"`, `summaryDelivery: "composer"`, `status: "done"`, `reason`, no `fork`. Native origin: `mode: "native"`, `status: "pending"`, `fork: { sourceProviderSessionId: source.providerSessionId, forkPoint?, providerAccountId: source.providerAccountId, workCwd: sessionWorkCwd(source), sourceLastUserBlockId? }`.
7. For copied and native, append a divider block to `copied`: `{ id: crypto.randomUUID(), role: "system", text: branchDividerText(origin, …), branchOrigin: origin }`. `branchDividerText` is the plain-text form of the divider copy, used by search, export and copy.

`forkThreadBlocks` changes (`fork.ts`): on each copied block, delete `providerTurnId` and `providerForkPoint`; on a copied `branchOrigin`, delete `fork` and set `status: "done"`. Reason: those positions belong to the source's provider conversation. A Codex edit-last-turn on a copied turn would otherwise revert a turn id that does not exist in the new thread. This also applies to legacy branches; the fields are not used by those providers, so today's behavior is unchanged.

## States and transitions
| State | Event | Next state | User sees |
|---|---|---|---|
| Source chat (other provider), settled turn | Click Branch | legacy (no divider) | Exactly today: copied transcript, summary in the composer |
| Source chat (Claude/Codex/OpenCode), native not possible | Click Branch | `summary/composer/done` | Copied transcript, summary in the composer, divider with the reason |
| Source chat (Claude/Codex/OpenCode), native possible | Click Branch | `native/pending` | Copied transcript + divider; empty focused composer |
| `native/pending` | First send, preflight ok, fork succeeds | `native/done`; `providerSessionId` = new id | Normal streaming reply |
| `native/pending` | First send, preflight fails (`source-continued` or `branch-changed`) | `summary/prefix/pending` → same send with the prefix → `summary/prefix/done` | Divider switches to the summary text with the reason; status row; reply streams |
| `native/pending` | First send, adapter throws `NativeForkError` | `summary/prefix/pending` (`fork-failed`) → one resend with the prefix → `summary/prefix/done` | Divider switches; status row |
| `native/pending` | First send settles (resolved or rejected with a non-`NativeForkError`) without `session.providerBound`, and the user didn't press Stop | `native/uncertain` | Existing error notice (if any); divider changes to the not-confirmed text; status row; nothing is resent; the user's message stays visible |
| `native/uncertain` | User sends again | same as `native/pending` first send (preflight, fork, fallback rules) | Normal send; the divider updates on the outcome |
| `native/uncertain` | App restart | unchanged (persisted) | Same not-confirmed divider |
| `native/pending` | User presses Stop during the first send | unchanged | No resend; divider unchanged |
| `summary/prefix/pending` | First send fails with any error | stays `summary/prefix/pending` | Existing error notice; the next send carries the prefix again |
| `*/pending` | App restart before the first send | unchanged (block JSON persisted) | Same divider |
| `*/done` | Later sends | unchanged | Normal chat |

## Acceptance criteria
- AC-1 Given a Claude chat bound to provider session `S`, idle, whose last turn T is clicked, when Branch is clicked, then:
  - a new chat opens with the copied blocks plus one divider: `mode: "native"`, `status: "pending"`, `fork.sourceProviderSessionId === "S"`
  - `fork.forkPoint` equals T's user block `providerForkPoint` if present; otherwise it is absent and `sourceLastUserBlockId` is T's user block id
  - `composerSeed` is undefined, and no adapter function is called.
- AC-2 Given that branch, when the user sends "hello", then:
  - the Claude child is spawned with args containing `--resume S --fork-session --session-id <N>` (N is a new uuid, not S), plus `--resume-session-at <uuid>` exactly when a fork point exists
  - the text written to stdin is "hello" with no bundle
  - after the first `result`, `session.providerBound` with N is emitted, and the divider becomes `status: "done"` without `fork`.
- AC-3 Given a Codex chat with thread `T1` and a clicked earlier turn whose user block has `providerTurnId = "turn-2"`, with no later user block sharing it, when the branch sends its first message, then:
  - the app-server receives `thread/fork` with `{ threadId: "T1", lastTurnId: "turn-2", excludeTurns: true, cwd, approvalPolicy, approvalsReviewer, sandbox, model?, serviceTier? }` and no `sandboxPolicy`
  - then `turn/start` on the returned `thread.id`
  - `thread/start` and `thread/resume` are not called.
- AC-4 Given an OpenCode chat with session `O1` and a clicked turn followed by a user block with `providerTurnId = "msg_9"`, when the branch sends its first message, then:
  - `GET /session/O1/message` is called first, and its result contains an entry with `info.id === "msg_9"`
  - then `POST /session/O1/fork?directory=<workCwd>` is called with body `{ "messageID": "msg_9" }`
  - the permission update is applied to the returned session, and the prompt goes to the returned session id.
- AC-5 Given AC-4, when the message list does not contain `msg_9`, then no fork request is made, and the adapter throws `NativeForkError("OpenCode couldn't find where this turn ends.")`. The App fallback (AC-10) follows.
- AC-6 Given a source on Cursor (or any provider other than the three), when Branch is clicked, then:
  - the new session equals today's: `title: "<source title> (branch)"`, `blocks` equal to the `forkThreadBlocks` output with no divider, `composerSeed === buildForkBundle(copied).text`, no `providerAccountId`, `worktreeCwd` or `branch` copied
  - the first send's provider prompt equals the composer text unchanged.
- AC-7 Given a clicked turn answered by Codex in a chat now on Claude, when Branch is clicked, then the branch is `summary/composer/done` with reason `different-provider`, `composerSeed` equals the bundle text, and the divider is the last block.
- AC-8 Given an earlier Claude turn without `providerForkPoint` (recorded before this feature), when Branch is clicked, then the branch is `summary/composer/done` with reason `no-fork-point`.
- AC-9 Given a native whole-conversation branch, when the source gets a new user turn before the branch's first send, then the first send runs with the prefix, reason `source-continued`, and no fork request reaches any adapter. The same applies with reason `branch-changed` when the branch's provider, account or `sessionWorkCwd` changed.
- AC-10 Given a native branch whose adapter throws `NativeForkError`, when the user sends "hello", then:
  - exactly one more `sendHarnessTurn` call is made, with no `fork` and the prompt `wrapBranchSummaryPrompt(bundleText, "hello")`
  - the divider shows `summary/prefix` with reason `fork-failed`
  - a status row "Couldn't reopen <Provider>'s original conversation. Continued from a copied summary." is added
  - the transcript shows one user block "hello".
- AC-11 Given a native branch whose first send rejects with an error that is not `NativeForkError`, or resolves without `session.providerBound`, and the turn was not stopped, then:
  - exactly one `sendHarnessTurn` call was made (no automatic resend, with or without prefix)
  - the divider becomes `status: "uncertain"`, keeping `mode: "native"` and `fork`
  - the status row "Couldn't confirm that {Provider} received your first message in this branch. MonoCode didn't resend it. If no reply appears, send your message again." is added once
  - when the user later sends "again", that send runs the first-send flow (preflight, then `fork` unless the adapter already has a resume entry), and the transcript shows both user blocks as sent.
- AC-11a Given a Claude fork spawn that initialized, whose child wrote the user message and then exited before the first `result`, then the adapter does not throw `NativeForkError`, the App reaches `native/uncertain` (AC-11), and no second spawn happens until the user sends again.
- AC-11b Given a Codex branch where `thread/fork` succeeded (`session.providerBound` emitted) and `turn/start` then fails, then the divider is `done` (the fork exists), the existing error notice shows, and nothing is resent.
- AC-11c Given the user presses Stop while the first native send is in flight, then no resend happens and the divider does not change to uncertain or summary.
- AC-11d Given a `native/uncertain` divider, when the app restarts, then the divider restores as `uncertain` with its `fork`, and the next user send follows AC-11.
- AC-12 Given a Claude fork spawn where the child exits before init, then the adapter throws `NativeForkError`, deletes the `resumeByThread` entry for that MonoCode session, and emits no `session.providerBound`.
- AC-13 Given a Claude fork spawn that initialized but whose child exits before the first `result`, then `resumeByThread` for that session is deleted, so the next send spawns with the fork flags again (with a new `--session-id`).
- AC-14 Given a Claude turn that completes, then a `turn.forkPoint` event carries the uuid of the last top-level (non-subagent) `assistant` message of that turn; the latest user block stores it as `providerForkPoint`, and it survives save and reload.
- AC-15 Given an OpenCode turn, then the first `message.updated` for a non-hidden user message of the main session during an active turn emits `turn.started` with that message id, once per turn; the latest user block stores it as `providerTurnId`.
- AC-16 Given a branch made from a branch, then copied blocks have no `providerTurnId` and no `providerForkPoint`; any copied divider has `status: "done"` and no `fork`; only the divider whose `sessionId` equals the current session id is honored.
- AC-17 Given an app restart between Branch and the first send, then the divider (with `fork`) is restored, and AC-2, AC-3 and AC-4 still hold.
- AC-18 The divider renders as its own row after the copied turns (not inside the last turn's action row), with the copy under UI details, `role="separator"` and an `aria-label` equal to its text.
- AC-19 Given the Codex fork succeeds, when the next send happens in the branch, then `thread/resume` is used with the forked thread id, and `thread/fork` is not called again.

## Ordering contracts
Branch click (synchronous, in App):
1. Read the source from `sessionsRef.current` → `planBranch`.
2. For `legacy`: create exactly today's session (`App.tsx:7700-7728` body).
3. For `copied`: today's session plus `blocks: plan.blocks` (with the divider) and `composerSeed: plan.bundleText`.
4. For `native`: `{ ...newSession(source.harness, source.cwd, source.model, source.runtimeMode, source.modelSettings), id: newSessionId, title: "<source title> (branch)", blocks: plan.blocks }`, plus `providerAccountId`, `worktreeCwd` and `branch` copied from the source, with no `composerSeed`.
5. `setSessions` → `appendTab` → focus the composer. There is no await.

First send (App send path, the `sendTurn` closure at `App.tsx:6627`):
1. `origin = pendingBranchOrigin(session)`: the last block whose `branchOrigin.sessionId === session.id` and `status` is `"pending"` or `"uncertain"`. An uncertain origin is handled exactly like a pending native one; reaching this step always means a new user send.
2. If `origin.mode === "native"`, run the preflight synchronously on current state:
   - `session.harness === origin.harness`
   - `sameProviderAccountId(session.providerAccountId, origin.fork.providerAccountId)`
   - `sessionWorkCwd(session) === origin.fork.workCwd`
   - if `forkPoint` is absent: the source is found in `sessionsRef.current` (else `await getSession(sourceSessionId)`), the source is `!busy`, and the source's last non-draft user block id equals `sourceLastUserBlockId`.
   A failed check converts the divider to `summary/prefix/pending` with `branch-changed` or `source-continued`, and appends the status row "Continued from a copied summary because <reason text>." before sending.
3. Native: call `sendHarnessTurn({ ...input, fork: { sourceProviderSessionId, forkPoint } })` with the plain user text.
4. On rejection with `NativeForkError` (checked with `instanceof`):
   - If the turn generation is stale (the user pressed Stop), do nothing more.
   - Otherwise convert the divider to `summary/prefix/pending` (`fork-failed`), append the status row, then call `sendHarnessTurn` once more, without `fork` and with the wrapped prompt.
   Any other rejection follows the existing error path unchanged, then step 4a.
4a. After the native send settles (resolve or non-`NativeForkError` rejection): if the turn generation is stale (Stop), do nothing. Otherwise, if the owned divider is still `native` and not `done` (no `session.providerBound` arrived), set it to `status: "uncertain"` (`markBranchUncertain`) and append the not-confirmed status row once. Never call `sendHarnessTurn` from this step.
5. Prefix delivery: the provider prompt is `wrapBranchSummaryPrompt(bundleTextFromBlocksBeforeDivider, promptText)`; the visible user block is unchanged. Apply it after the existing orchestration, inbox and handoff wrapping, and only when none of those wrappers applies. If one does, skip the branch prefix and keep the divider pending.
6. `session.providerBound` (apply reducer, `apply.ts:131`): set `providerSessionId`; also, if a pending divider owned by this session exists, set `status: "done"` and delete `fork`. This is the only place that ends `pending`.
7. Stale work: events are already dropped when `turnGen` changes (`routeTurnEvent`). A Stop during the fork leaves the divider pending and never triggers a resend. The adapter's resume entry, if the fork completed, makes the next send resume instead of forking again (Codex, OpenCode). Claude follows AC-13.

Claude adapter fork path (`claude.ts` `ensureLive`):
1. Only when there is no live child, no `resumeByThread` entry, and `input.fork` is set.
2. `newId = crypto.randomUUID()`. Build the spawn args with `buildClaudeSpawnArgs({ ..., resume: fork.sourceProviderSessionId, forkSession: true, sessionId: newId, resumeSessionAt: fork.forkPoint })`. Update `buildClaudeSpawnArgs` so `--session-id` is emitted with `--resume` only when `forkSession` is true, and `--fork-session` and `--resume-session-at` are appended.
3. Set `live.claudeSessionId = newId`, `live.forkPending = true`; the exit callback sets `live.exited`.
4. After `waitForInit`, before writing the user message: if `live.exited`, then `resumeByThread.delete(sessionId)`, stop, and throw `NativeForkError("Claude Code could not open the original conversation.")`. Do not emit `session.providerBound` here while `forkPending`. Once the user message is written, no `NativeForkError` may be thrown for this turn.
5. In `handleResult`, for the first non-subagent result while `forkPending`: set `forkPending = false`, emit `session.providerBound` with `newId`, then continue normal result handling.
6. If the child exits while `forkPending` (after init): `resumeByThread.delete(sessionId)`.
7. If [claude-live-controls.md](claude-live-controls.md) is implemented, the fork spawn is a fresh spawn; live switching never applies to it.

Codex adapter fork path (`codex.ts` `ensureLive`): when `!canResume && input.fork`, call `rpc.request("thread/fork", buildThreadForkParams({ threadId, lastTurnId: forkPoint, cwd, runtimeMode, controlsAgents, model, serviceTier }))`.
- `buildThreadForkParams` (new, `codexProtocol.ts`) returns `{ threadId, lastTurnId?, excludeTurns: true, cwd, approvalPolicy, approvalsReviewer, sandbox, model?, serviceTier? }`, with the same values as `buildThreadStartParams` but without `sandboxPolicy`.
- Any rejection, or a missing `thread.id`, throws `NativeForkError(<message>)`.
- On success, continue exactly like the `thread/start` path: set `resumeByThread` and emit `session.providerBound`.

OpenCode adapter fork path: `resolveSession` gains `fork?: NativeForkRequest`. When there is no `resume` and `fork` is set:
1. If `fork.forkPoint` is set, call `client.getMessages(fork.sourceProviderSessionId)` and check that some entry has `info.id === fork.forkPoint`. If none does, throw `NativeForkError("OpenCode couldn't find where this turn ends.")`. This guard exists because OpenCode 1.18.30 copies every message when the id is unknown.
2. Call `client.forkSession(fork.sourceProviderSessionId, cwd, fork.forkPoint)`. Extend the client with a third optional parameter, sent as body `{ messageID }` when present and `{}` otherwise.
3. Apply the same permission `updateSession` as the existing fork branch.
4. Errors from steps 1-2, including not-found, throw `NativeForkError`. Do not fall back to `createSession` inside the adapter.

## Implementation plan
0. Storage check (see blocker). Then the baseline checks and worktree creation in Baseline, dependencies and worktree, and `npm install` in the new worktree. Confirm `git rev-parse HEAD` in the worktree equals `<BASELINE_SHA>` and `git status --short` is empty.
1. `session.ts`: add `providerForkPoint`, `branchOrigin`, `BranchOrigin` and `BranchSummaryReason` (see Data model). No other Session field.
2. `fork.ts`: strip positions and make copied dividers inert in `forkThreadBlocks`. Add `wrapBranchSummaryPrompt(bundleText: string, userText: string): string` returning `` `${bundleText}\n\nContinue from the conversation above. The user's new message:\n\n${userText}` ``.
3. `branchPlan.ts` (new):
   - `planBranch`, `pendingBranchOrigin(session)`, `branchDividerText(origin, providerTitle)`
   - `convertToPrefixSummary(session, reason): Session` (pure; sets `mode: "summary"`, `summaryDelivery: "prefix"`, `status: "pending"` and `reason`, deletes `fork`, and rewrites the divider text).
   - `markBranchUncertain(session): Session` (pure; only for an owned `native` divider that isn't `done`; sets `status: "uncertain"`, keeps `fork`, rewrites the divider text).
4. `sessionStore.ts` `sanitizeBlock`: persist `providerForkPoint` (user blocks, `isPersistableId`) and `branchOrigin` (system blocks). Validate every string and enum field; drop `fork` if any id fails `isPersistableId`; keep `workCwd` as-is. Add a restore-time guard: an invalid `branchOrigin` is dropped, not thrown.
5. `types.ts` / `index.ts`: `NativeForkRequest`, `NativeForkError`, `fork?` on `HarnessSessionInput`, the `turn.forkPoint` event.
6. `apply.ts`: `turn.forkPoint` sets `providerForkPoint` on the latest user block (same lookup as `turn.started`); `session.providerBound` finishes the pending divider (Ordering contracts, first send, step 6).
7. Claude:
   - `claudeProtocol.ts` `buildClaudeSpawnArgs`: add `forkSession` and `resumeSessionAt`.
   - `claude.ts` `Live` gets `lastAssistantUuid`, `forkPending` and `exited`.
   - `runTurn` resets `lastAssistantUuid`; `handleAssistant` records `stringField(rec, "uuid")` for non-subagent messages.
   - `handleResult` emits `turn.forkPoint` before `maybeFinishTurn` (skip when `manualCompaction`).
   - Fork path per Ordering contracts.
8. Codex: `buildThreadForkParams` and the fork path.
9. OpenCode:
   - `forkSession(sessionID, directory, messageID?)`, and the `resolveSession` fork path with the message check.
   - Add a per-turn `turnUserMessageId` on `Live`, reset in `runTurn`.
   - Emit `turn.started` from `message.updated` per AC-15 (main session only, not hidden agents).
10. `App.tsx` `onBranch`: replace the body with `planBranch` and the three creation paths per Ordering contracts. Keep the `(sessionId, turn)` parameters.
11. `App.tsx` send path: preflight, fork injection, `NativeForkError` fallback, the uncertain step and prefix (Ordering contracts, first send, steps 1-5 and 4a).
12. `transcriptActivity.ts` `groupTurns`: a block with `branchOrigin` gets its own group, like `handoff`.
13. `AgentTranscript.tsx`: in the system branch (`~1517`), render `<BranchOriginDivider block={block} />` when `block.branchOrigin` is set; a new component beside `HandoffDivider`.

Must not change: Handoff, Sidechat (`sidechatContextBlock`), Second opinion, edit-last-turn behavior for non-branch chats, queue durability, orchestration, the legacy branch output for other providers, any Rust file (including `src-tauri/Cargo.toml`), and any stash or other worktree.

## UI details
Divider (mirrors the `HandoffDivider` classes; `HarnessIcon` for the provider; text `text-[12px] text-content/55`; no animation beyond the existing ones):
- Native: `Branched from “{sourceTitle}” · keeps {Provider}'s full history`
- Summary, composer: `Branched from “{sourceTitle}” · starts from a copied summary in the message box ({reason text})`
- Summary, prefix: `Branched from “{sourceTitle}” · continued from a copied summary sent with your first message ({reason text})`
- Native, not confirmed: `Branched from “{sourceTitle}” · {Provider} may not have received your first message. Nothing was resent.`
- Not-confirmed status row: `Couldn't confirm that {Provider} received your first message in this branch. MonoCode didn't resend it. If no reply appears, send your message again.`

Reason text:
| reason | text |
|---|---|
| different-provider | this turn came from {TurnProvider} |
| not-started | the original chat had no {Provider} conversation yet |
| pending-switch | the original chat was switching providers |
| orchestration-worker | agent workers can't be copied |
| no-fork-point | {Provider} didn't record where this turn ends |
| source-continued | the original chat continued before this branch's first message |
| branch-changed | this branch's provider, account or folder changed |
| fork-failed | {Provider} couldn't reopen the original conversation |

`{Provider}` uses `HARNESS_TITLE`. Truncate `sourceTitle` to 60 characters with `…`. The Branch button, its tooltip and placement stay unchanged.

## Skills to load
`frontend-ui`, `testing`, `desktop-app`.

## Test matrix
| AC / risk | Level | File | Scenario |
|---|---|---|---|
| AC-1, 6, 7, 8 + rule order | unit | `src/features/sessions/model/branchPlan.test.ts` (new) | Table of sources: each provider incl. Cursor legacy, turnHarness mismatch, worker, pendingSwitch, unbound, busy source, Codex shared providerTurnId, Claude/OpenCode with and without positions |
| AC-6 exactness | unit | `branchPlan.test.ts` | Legacy plan blocks deep-equal today's `forkThreadBlocks` output (except stripped positions) and `bundleText` equals `buildForkBundle` |
| AC-16 | unit | `fork.test.ts` | Copies drop positions; copied divider inert; `wrapBranchSummaryPrompt` exact output |
| AC-14, 15 persistence, AC-17 | unit | `sessionStore` test beside the existing store tests | Round-trip `providerForkPoint` and `branchOrigin`; invalid ids and enums dropped |
| AC-2, 12, 13, 14 | adapter | `claudeLive.test.ts`, `claudeProtocol.test.ts` | Spawn args; exit before init → `NativeForkError`, no providerBound, resume entry cleared; exit after init before result → next send re-forks with a new id; `turn.forkPoint` uuid from the last non-subagent assistant |
| AC-3, 19 | adapter | `codexLive.test.ts`, `codexProtocol.test.ts` | `thread/fork` params exact, no `thread/start`; rejection → `NativeForkError`; second send resumes the fork |
| AC-4, 5, 15 | adapter | `opencodeLive.test.ts`, `opencodeClient.test.ts` | Message check then fork URL/body; unknown id → no fork call + `NativeForkError`; `turn.started` once per turn with the user message id; hidden agent ignored |
| AC-9, 10, 11, 11b, 11c + single delivery | app-level | `src/features/sessions/ui/branchFlow.test.ts` (new; follow the harness-mocking style of `handoffProductionFlow.test.ts`) | Deferred promises: fork rejects with `NativeForkError` → exactly two send calls, the second without fork; generic error → one send call, divider `uncertain`, one status row; resolve without providerBound → uncertain; Stop → no resend, divider unchanged; next user send from uncertain → fork again; preflight failures |
| AC-11a | adapter | `claudeLive.test.ts` | Exit after the user message write → no `NativeForkError`, one spawn |
| AC-11d | unit | `sessionStore` test | `uncertain` round-trips with `fork`; unknown status values dropped |
| AC-18 | component | `AgentTranscript.test.ts` | Divider group separate from the last turn; label text for native, composer and prefix |

## Verification
- Implementer runs: `npx tsc --noEmit`; `npx vitest run` on the changed and new test files above; `npm test`; `git diff --check`; `git diff --stat -- src-tauri` shows no changes. There is no ESLint config in this repo, so report changed-file lint as unavailable. No Rust changes, so `check:rust` is not required.
- Later (not the implementer): `npm run check:web`, the Tauri dev-mode checks below, installer build, installed-build verdict.

## Manual checks (Nakul or a desktop-access Codex session; not the implementer)
1. Claude chat: branch the latest turn and send "What did we just do?". The answer should cite tool output from the source that the copied summary would not contain. Confirm the source chat is unchanged.
2. Claude: send two new turns in a chat, then branch the first of them, and ask "What is the last thing I asked you?". It must name that first turn, not the second. This confirms that stream `uuid` values are valid `--resume-session-at` targets, which is not verifiable offline.
3. Codex and OpenCode: the same as 1 and 2.
4. Cursor (or another non-native provider): the branch looks and behaves exactly like before this change (summary in the composer, no divider).
5. Claude chat with an old turn from before this feature: branch it; the divider says "copied summary in the message box", and the composer holds the summary.
6. Branch the latest turn, then continue the source, then send in the branch. The divider changes to "…continued from a copied summary sent with your first message (the original chat continued …)".
7. Restart the app between Branch and the first send; the native branch still forks.
7a. Claude branch: send the first message and end the `claude` process in Task Manager before the reply finishes. The divider shows the not-confirmed text, one status row appears, and nothing is sent again until you send.
8. Look at `~/.claude/projects/<project>/` after a Claude branch: a new `<N>.jsonl` exists, and the source file's modification time did not change because of the branch.

## Facts, decisions, assumptions
Facts: listed under Current behavior, all checked on 2026-09-30 against source and the installed CLIs (Claude Code 2.1.283, Codex 0.159.0, OpenCode 1.18.30 source at the matching tag).

Decisions:
- Lazy fork at first send for all three providers: one state model, an instant click, no background provider processes, and Claude cannot fork before a turn anyway.
- Fork details live on a visible divider block, not a new Session column. This avoids a SQLite migration (ask-first) and tells the user which kind of branch they got.
- Other providers keep today's flow exactly (umbrella plan, 30 Sept). Supported providers that can't fork at click also keep today's composer flow, plus a divider explaining why. This replaces the earlier draft's hidden-prefix rule for these cases.
- The hidden prefix is used only for the first-send fallback of a native branch, because the composer is empty and there is no refill channel. It is disclosed on the divider and in a status row. Nakul confirmed this fallback on 30 September for failures before message acceptance.
- When acceptance is unknown, MonoCode never resends. It moves to `native/uncertain` and waits for the user; a duplicate message is worse than one extra click.
- Native branches copy `providerAccountId`, `worktreeCwd` and `branch` from the source, because Claude transcripts are stored per account and per working folder.
- OpenCode fork point: the next user message id (exclusive), checked against the source's message list first, because an unknown id silently copies everything.
- Codex `excludeTurns: true` only trims the response payload.

Assumptions (unverified):
- Claude `--resume-session-at` accepts stream-json `assistant.uuid` values (the Agent SDK uses the same mode for `resumeSessionAt`). Manual check 2.
- Claude writes the forked transcript no later than the first turn's `result`, which is why providerBound is delayed until then.
- OpenCode's `message.updated` user message id equals the id `Session.fork` compares against (both come from the same message table).

## Open questions
- Future: show the copied summary behind a disclosure on the divider; per-provider branching into a different provider.

## Implementer report format
Per AC: done / partial / not done, with file:line or test name · deviations from this spec and why · open questions · checks run with exact results (tsc, vitest counts, `npm test`, diff check) · files changed. Then the desktop manual checklist above, unchanged, as a follow-up for Nakul.

## Handoff prompt
Use only after Nakul approves this contract, moves it to Todo and fills in `<BASELINE_SHA>` and `a65bd4e4b0c2742cd0fc54a4087358471efc3888`.

```text
Implement umbrella slice 3 of the provider batch: Native Branch (provider-owned fork).

Spec: E:\Developing\OpenSource\mono-clone\docs\specs\native-branch.md

1. Read, by absolute path from the main checkout (they are git-ignored, so the new worktree won't have them; don't copy them and never git add -f them):
   E:\Developing\OpenSource\mono-clone\.agents\PROFILE.local.md, E:\Developing\OpenSource\mono-clone\AGENTS.md, E:\Developing\OpenSource\mono-clone\docs\WORKING-AGREEMENT.md,
   E:\Developing\OpenSource\mono-clone\docs\changelog\CHANGELOG.md (then its Current numbered file), E:\Developing\OpenSource\mono-clone\docs\specs\SPECS.md,
   E:\Developing\OpenSource\mono-clone\docs\WINDOWS-CHANGES.md, then the spec above.
2. Baseline: <BASELINE_SHA> on nakul/windows-support, containing the umbrella baseline checkpoint and slices 1, 2 and 4 integrated and verified.
   Checkpoint: a65bd4e4b0c2742cd0fc54a4087358471efc3888. Dependencies: see "Baseline, dependencies and worktree" in the spec.
   Run every check in that section. If one fails, stop and report Blocked.
3. Storage-full hard blocker (mandatory): Before installs, builds or large test runs, check free space on every required drive, including TEMP/TMP, caches and Cargo/build outputs. If storage is full, a write fails with ENOSPC, disk-full or insufficient space, or the verified space cannot support the operation, stop task work immediately. Do not retry, keep editing, relocate temp/cache/output directories or delete anything automatically. Safely cancel task-owned operations and preserve existing work. Report the affected drive/path, the measured space or error, the last completed step and the remaining work. Mark this spec and its index row Blocked only if that is safe to write; otherwise report Blocked without further writes. Resume only after space is restored and rechecked and partial outputs are assessed. Any cleanup needs Nakul's explicit authorization.
4. After the storage check, you are authorized to create exactly one worktree from the verified baseline:
   git -C E:\Developing\OpenSource\mono-clone worktree add E:\Developing\OpenSource\mono-clone-native-branch -b feature/native-branch <BASELINE_SHA>
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
2026-10-01: Implemented by Sol 6.1 Low in a trial worktree as `f1a4712` (about 30 min, 4.53M tokens), fast-forwarded onto `nakul/windows-support`. Luna was not run on this spec. Claude's review: 8.5/10, every invariant holds. Two deviations, both improvements: the first-send logic lives in `branchFlow.ts` (`sendBranchTurn`), and a summary prefix stays pending until it is delivered. Sol also guarded a Claude exit right before the user write and an OpenCode fork without an id. Spec gaps it exposed: the spec did not say where the first-send logic should live, or what happens to a prefix when another wrapper (orchestration, inbox, handoff) takes the first send. Three small follow-ups are in [provider-batch-fixes.md](../notes/provider-batch-fixes.md).

Earlier (before the rerun), blocked before implementation: this slice requires slice 2's `Live` generation/control state and slice 4's context freshness behavior. Slice 2 is blocked by the required full-suite failure in the unchanged Composer attachment ownership test; context accuracy is consequently blocked as well. No feature source changes or tests were made for this slice.
