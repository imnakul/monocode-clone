# Done — Provider batch follow-up fixes — spec

- Workflow status: Done — set 2026-10-01 18:20 IST by Claude at close-out. Nakul reported build 0.1.55-local5-provider-fixes fine; per-check results weren't itemized, so the Manual checks section and its caveats stay as written. Pushed to the fork at `c2c8bf6`. Earlier status: Review. Implemented and committed on 2026-10-01. Claude's code review passed the same day (see Handoff retro); Nakul's manual checks remain.
- Tier: complex (two fixes depend on event order) · Snapshot: `b937b11` on `nakul/windows-support`, 2026-10-01.
- Provider versions checked: codex-cli 0.159.0, Claude Code 2.1.283.
- Parent specs: [session-approval-scopes.md](session-approval-scopes.md) (fixes A, B, C) and [native-branch.md](native-branch.md) (fixes D, E). Both stay in Review.
- This spec replaces `docs/notes/provider-batch-fixes.md` and the fix prompt in `docs/notes/provider-batch-prompt.md`. Don't take instructions from those two files.

## In plain words
For Nakul, not the implementer.

- Today, when Codex asks to run a SocratiCode tool in Supervised mode, the card shows only Allow and Deny. After this work it also shows "Allow for session", and the same tool stops asking for the rest of the chat.
- In Plan mode, MonoCode no longer answers for you from an earlier "Allow for session". You only notice this after Codex restarts, because until then Codex itself remembers the choice.
- If you stop a chat at the exact moment you click "Allow for session", nothing is remembered.
- A Claude branch keeps working if Claude gives the branch a different id than the one MonoCode asked for.
- The small provider icon on the "Branched from" line matches the provider named in its text.
- No screen layout changes. The approval buttons keep their current size.

## Goal and user story
- Goal: finish the session approvals and Native Branch features by fixing one real bug found in manual testing and four small review findings.
- User story: As a Codex user in Supervised mode, I want "Allow for session" on MCP tool approvals so that repeated SocratiCode searches stop interrupting me.

## Scope
| Fix | What | Kind |
|---|---|---|
| A | Codex offers "Allow for session" when the request has no `_meta.tool_name` | Real bug, found in build 0.1.55-local4 |
| B | A Plan turn doesn't reuse a stored MCP session grant | Review finding, low risk |
| C | No session grant is stored after the session was stopped, replaced or cancelled | Review finding, defensive |
| D | A pending Claude fork adopts the session id Claude reports | Review finding, defensive |
| E | The divider icon for a "different provider" branch matches its text | Cosmetic |
| F | Optional: find the cause of one flaky Composer test | Test hygiene |

## Out of scope
- "Always allow" (`persist: "always"`). Codex would write `~/.codex/config.toml`. Don't add it.
- Any change to button layout or classes in `AgentTranscript.tsx` or `ApprovalToasts.tsx`.
- Whether the session option is offered during a Plan turn. It stays as it is today.
- The Full Access auto-accept for Computer Use (`codex.ts:1141–1151`). Leave it unchanged.
- Rust code, version files, builds, pushes, and anything about the upstream sync.
- Running the app or driving the desktop window.

## Current behavior
Facts confirmed in source at `b937b11`.

**Fix A**
- `codexMcpToolGrant` (`codexElicitation.ts:565–614`) returns a grant only if `_meta.tool_name` is a non-empty string of at most 200 characters (`:601–610`).
- Real Codex 0.159.0 request, captured on 2026-10-01 (Supervised, SocratiCode):
  ```json
  {"serverName":"socraticode","mode":"form",
   "_meta":{"codex_approval_kind":"mcp_tool_call","persist":["session","always"],
            "tool_description":"...","tool_params":{},"tool_params_display":[]},
   "message":"Allow the socraticode MCP server to run tool \"codebase_status\"?",
   "requestedSchema":{"type":"object","properties":{}}}
  ```
  There is no `tool_name` and no `threadId`.
- Root cause: without `tool_name` the function returns `undefined`, so `approval.requested` carries no `sessionScope` (`codex.ts:1180–1186`) and the card shows only Allow and Deny.
- Evidence that it is the cause and not a symptom: every other check in the function passes for this payload (form mode, empty properties, one approval-kind key equal to `mcp_tool_call`, `persist` containing `"session"`, non-empty `serverName`).
- Before the request, Codex sends `item/started` with `item: {type: "mcpToolCall", id, server, tool, status: "inProgress"}`. After the tool finishes it sends `item/completed` for the same `id`. Both arrive on the parent thread and pass through `handleNotification` (`codex.ts:757`). `Live` doesn't keep them today.

**Fix B**
- The stored-grant check (`codex.ts:1153–1164`) accepts automatically without checking `live.planning`. The Computer Use auto-accept just above it does check `!live.planning` (`:1141–1144`).

**Fix C**
- Codex: the grant is stored after `await live.rpc.respond(...)` (`codex.ts:1200–1209`). `stopCodexSession` (`:411–424`) removes the `Live` from `liveByThread` but keeps `mcpGrantsByThread`. `forgetCodexSession` (`:427–431`) deletes the grants and then stops. A response that finishes after either call still stores the grant.
- Codex command, file and permission approvals store nothing in MonoCode (`codex.ts:1305–1385`), so they need no change.
- Claude: the rules are stored after `await writeJson(...)` (`claude.ts:1169–1185`) through `addClaudeSessionRules` (`:1875–1897`). It has one caller.

**Fix D**
- `handleLine` adopts a reported session id only when `!live.forkPending` (`claude.ts:735`). During a pending fork, MonoCode keeps the id it passed as `--session-id` (`:506–516`) and binds it on the first result (`:995–998`).
- That is correct only if Claude honours `--session-id` together with `--fork-session`. If it doesn't, MonoCode saves an id that doesn't exist, and the next resume fails. This is unverified, so the fix is defensive.

**Fix E**
- `planBranch` sets `origin.harness` to `source.harness` (`branchPlan.ts:66`), but for `reason === "different-provider"` the divider text names the turn's provider (`:74`). `BranchOriginDivider` draws the icon from `origin.harness` (`AgentTranscript.tsx:3538`).
- Other readers of `origin.harness` (`branchFlow.ts:21`, `:35`, `branchPlan.ts:89`, `apply.ts:161`) only read origins whose status isn't `done`. A different-provider origin is created with status `done` (`branchPlan.ts:67`).

## Proposed behavior and invariants
- I-1: A session grant key is always `serverName + "\u0000" + toolName`. `serverName` comes from the request. `toolName` comes from `_meta.tool_name`, or from an in-progress `mcpToolCall` item. The `message` text is used only to confirm an item, never as the only source.
- I-2: When the tool can't be identified with certainty, there is no grant. The card then shows Allow and Deny, as today.
- I-3: Every other check in `codexMcpToolGrant` stays exactly as it is.
- I-4: A Plan turn never accepts an MCP request from the stored grants.
- I-5: A grant is stored only while the `Live` that asked is still the registered one and isn't cancelled.
- I-6: A pending Claude fork emits `session.providerBound` once, on the first result, never earlier.

## States and transitions
In-progress MCP tools on a Codex `Live` (new field `inProgressMcpTools`):

| State | Event | Next state | Effect |
|---|---|---|---|
| any | `item/started`, parent thread, `item.type === "mcpToolCall"`, with string `id`, non-empty `server` and `tool` | entry `id → {server, tool}` added | none visible |
| has entry `id` | `item/completed`, parent thread, same `id` | entry removed | none visible |
| any | a turn starts (`runTurn`) | empty | none visible |
| any | a turn ends (`finishActiveTurn`) | empty | none visible |
| any | notification from a child thread | unchanged | child items are never tracked |

Tool name used for the grant:

| `_meta.tool_name` | In-progress candidates | Result |
|---|---|---|
| valid string (non-empty, ≤ 200) | ignored | grant with that name |
| present but not valid (empty, too long, not a string) | ignored | no grant |
| absent or `undefined` | exactly one distinct tool name | grant with that name |
| absent or `undefined` | none, or two or more distinct names | no grant |

A candidate is an in-progress entry where `server === params.serverName`, `tool.length <= 200`, and `message` contains the tool name wrapped in double quotes (`"` + tool + `"`). Two entries with the same tool name count as one distinct name.

## Acceptance criteria
Fix A
- AC-1: Given a Supervised, non-plan Codex turn and an `item/started` `mcpToolCall` `{id: "call_1", server: "socraticode", tool: "codebase_status", status: "inProgress"}` on the parent thread, when the request shown under Current behavior arrives, then `approval.requested` carries `sessionScope.hint === "Stop asking for this tool until the chat closes."`.
- AC-2: Given AC-1, when the user answers allow with scope `session`, then the response is `{action: "accept", content: {}, _meta: {persist: "session"}}`. After `stopCodexSession` and a new turn, the same item and request are answered with that same response and no `approval.requested` is emitted. An item and request for `codebase_search` emit `approval.requested`.
- AC-3: Given no in-progress item, when the request arrives, then `approval.requested` has no `sessionScope`.
- AC-4: Given `item/started` then `item/completed` for `call_1`, when the request arrives, then `approval.requested` has no `sessionScope`.
- AC-5: Given in-progress items `call_1` (`socraticode`, `codebase_status`) and `call_2` (`socraticode`, `codebase_search`), when the request for `"codebase_status"` arrives, then the grant key is `socraticode\u0000codebase_status`. Given an in-progress item for server `other` with tool `codebase_status` only, there is no `sessionScope`.
- AC-6: Given an `item/started` in turn 1 with no `item/completed`, then `turn/completed`, then a new turn, when the request arrives in turn 2 with no new item, then there is no `sessionScope`.
- AC-7: Given `_meta.tool_name: "codebase_search"`, the grant key uses `codebase_search` whatever the in-progress items are. Given `_meta.tool_name: ""` or a 201-character name, there is no grant even when an in-progress item matches.

Fix B
- AC-8: Given a stored grant for `socraticode` / `codebase_status`, when a turn with `intent: "plan"` receives the same item and request, then `approval.requested` is emitted and no response is written before the user decides.

Fix C
- AC-9 (Codex): Given the user answered allow with scope `session` and the response write hasn't finished, when `stopCodexSession` runs and the write then finishes, then no grant is stored: a new turn with the same item and request emits `approval.requested`.
- AC-10 (Claude): Given the user answered allow with scope `session` and the control response write hasn't finished, when `stopClaudeSession` runs and the write then finishes, then no rule is stored: the next spawn has no `--allowedTools` entry for that rule.

Fix D
- AC-11: Given a pending fork from source id `source`, when a line reports session id `forked-real` (different from `source` and from the id passed as `--session-id`), then no `session.providerBound` is emitted before the result, and on the first result `session.providerBound` carries `forked-real`.
- AC-12: Given a pending fork, when a line reports `source`, then on the first result `session.providerBound` carries the id passed as `--session-id`.

Fix E
- AC-13: Given a Claude chat and a turn that came from Codex, `planBranch` returns `kind: "copied"` with `origin.reason === "different-provider"` and `origin.harness === "codex"`. For every other reason, `origin.harness === source.harness`.

## Ordering contracts
- Codex approval with a session grant: `item/started` is recorded → request arrives → the tool name is resolved from the entries present at that moment → the user decides → `await live.rpc.respond` → check `liveByThread.get(live.sessionId) === live && !live.cancelled` → store the grant. If the check fails, drop the grant silently. The response isn't retried or undone.
- Out-of-order cases:
  - Request before `item/started`: no entry, so no grant (AC-3).
  - `item/completed` before the request: entry gone, so no grant (AC-4).
  - Stop or forget while the response write is pending: no grant (AC-9).
- Claude approval: `await writeJson` → the same liveness check → `addClaudeSessionRules`.
- Claude fork: lines before the first result may change `live.claudeSessionId` and `resumeByThread`, but the bound event is emitted only in `handleResult`.

## Implementation plan
Work in this order. Each group is one commit.

### Commit 1 — fix A
`src/integrations/harness/providers/codex/codexElicitation.ts`
- Export `type CodexInProgressMcpTool = { server: string; tool: string }`.
- `codexMcpConfirmation(params, inProgressTools: readonly CodexInProgressMcpTool[] = [])` passes the list to `codexMcpToolGrant`.
- In `codexMcpToolGrant`, replace only the tool-name part (`:600–610`):
  1. Keep the `hasSessionPersist` and `serverName` checks. If they fail, return `undefined`.
  2. If `meta.tool_name !== undefined`: it must be a non-empty string (after `trim`) of at most 200 characters, otherwise return `undefined`. Use it.
  3. Otherwise read `params.message`. If it isn't a string, return `undefined`. Build the candidates as defined under States and transitions. If the set of distinct tool names has exactly one member, use it. Otherwise return `undefined`.
- Don't parse the tool name out of `message` with a pattern. Only test `message.includes('"' + tool + '"')`.

`src/integrations/harness/providers/codex/codex.ts`
- `Live` (`:98–136`): add `inProgressMcpTools: Map<string, CodexInProgressMcpTool>` with a one-line doc comment. Initialise it where the `Live` object is built (near `:635`).
- `handleNotification` (`:757`): after the child-thread return (`:790–793`) and before `mapCodexNotification`, track the item. For `item/started`, set the entry when `rec.item` is a record with `type === "mcpToolCall"`, a string `id`, and non-empty string `server` and `tool`. For `item/completed` with that type and a string `id`, delete the entry. Use `asRecord` and `stringField`; no type assertions.
- Clear the map in `runTurn` next to the other per-turn resets (`:696–699`) and in `finishActiveTurn` (`:1039`).
- Elicitation handler (`:1138`): call `codexMcpConfirmation(params, threadId === live.threadId ? [...live.inProgressMcpTools.values()] : [])`.
- Don't change `logCodexElicitation`.

### Commit 2 — fixes B and C
`codex.ts`
- B: the condition at `:1154–1157` becomes `!live.planning && grantKey && mcpGrantsByThread.get(live.sessionId)?.has(grantKey)`.
- C: the condition at `:1205` becomes `sessionGrant && liveByThread.get(live.sessionId) === live && !live.cancelled`.

`src/integrations/harness/providers/claude/claude.ts`
- C: at the top of `addClaudeSessionRules` (`:1875`), return when `liveByThread.get(sessionId) !== live || live.cancelled`.

### Commit 3 — fixes D and E
`claude.ts`
- `Live` (`:144`): add `forkSourceSessionId?: string`, set from `fork?.sourceProviderSessionId` where the `Live` is built (`:519`).
- `handleLine` (`:734–747`): adopt `sessionIdFromLine` when it is set, differs from `live.claudeSessionId`, and, while `live.forkPending`, also differs from `live.forkSourceSessionId`. Adopting sets `live.claudeSessionId` and `resumeByThread` as today. Emit `session.providerBound` there only when `!live.forkPending`.
- Don't change `handleResult` (`:995–998`) or the exit handling (`:570–573`).

`src/features/sessions/model/branchPlan.ts`
- `:66`: `harness: reason === "different-provider" ? turnHarness : source.harness`.

### Commit 4 — fix F (optional, at most about 20 minutes)
- `src/features/sessions/ui/Composer.test.ts:397`, "preserves attachment ownership when a resend is restored". It fails only in some full runs and passes alone. Look for state shared between tests: module-level maps, fake timers, unawaited promises, a missing cleanup.
- Fix the cause in the test setup or in the real code. Don't skip, weaken or retry the test.
- If the cause isn't found in time, change nothing and report what was ruled out.

## Skills to load
`spec-implement` and `testing`, when they are installed. If they aren't, follow Worker rules below.

## Test matrix
| AC | Level | Test file | Scenario |
|---|---|---|---|
| AC-1, AC-2 | provider live | `codexLive.test.ts` | Change the existing test at `:1035` ("replays an MCP session grant after a Codex restart…") to the real payload: send `item/started` with `notify`, no `tool_name`, real message |
| AC-3, AC-4, AC-6 | provider live | `codexLive.test.ts` | One test each, real payload |
| AC-5, AC-7 | unit | `codexElicitation.test.ts` | Call `codexMcpConfirmation(params, tools)`. Keep the existing `tool_name` cases (`:32–118`) passing |
| AC-8 | provider live | `codexLive.test.ts` | Grant in a normal turn, then a turn with `intent: "plan"` |
| AC-9 | provider live | `codexLive.test.ts` | Make the mocked child write (`vi.mock("../../core/child")`, `:9`) return a promise the test resolves for that one response. Stop, resolve, start again. The test must fail without the fix |
| AC-10 | provider live | `claudeLive.test.ts` | Same method. Assert the way the replay test at `:598–625` does, inverted |
| AC-11, AC-12 | provider live | `claudeLive.test.ts` | Extend the "Claude native fork" block (`:138`) |
| AC-13 | unit | `branchPlan.test.ts` | Extend the different-provider case (`:23–31`) |

## Worker rules
- Work in `E:\Developing\OpenSource\mono-clone` on `nakul/windows-support`. No worktrees, no new branches, no `npm install`.
- Start: `git branch --show-current` is `nakul/windows-support`, `git status --short` is empty, HEAD is `b937b11`. If not, stop and report.
- Don't touch `mono-clone-hari`, `mono-clone-remote` or the stashes.
- Before any code: set this spec to Progress (heading, Workflow status line, and its row moved to Progress in `SPECS.md`).
- Nakul authorized these commits on this branch. Stage only the files you changed (`git add <paths>`, never `-A`). Never stage anything under `docs/` or `.agents/`. Don't push, bump the version or build.
- Commit messages:
  1. `fix(codex): offer Allow for session when Codex omits the tool name`
  2. `fix(approvals): keep session grants out of Plan mode and stopped sessions`
  3. `fix(branch): bind to Claude's reported fork id and match the divider icon`
  4. `test(composer): <what you fixed>` (only if fix F succeeded)
- When done: set this spec to Review (heading, Workflow status line, row moved to Review / Blocked with the short shas in Notes). Never set Done. Add the shas to the Notes of the session approvals and Native Branch rows; leave both in Review.
- Add one entry to the current changelog file listed in `docs\changelog\CHANGELOG.md`. Get the time with PowerShell `Get-Date`; Git Bash prints UTC on this PC.
- If you can't finish a fix: `git restore` its source files, write the reason under Open questions, set the spec to Blocked, and report. Commits already made stay.

## Verification
- Before each commit: `npx tsc --noEmit`, and `npx vitest run <the test files you changed>`. Both pass.
- After commit 3: `git diff --stat b937b11 -- src-tauri` is empty.
- After the last commit: check free space on C: and E: (stop and report if either is nearly full), then run `npm test` once. If the only failure is the Composer test named in fix F and it passes when run alone, note it and continue. Fix any other failure.
- There is no ESLint config in this repo; lint isn't run.
- Not for the implementer: production build and the installed-app check.

## Manual checks
For Nakul, on the next installed build. The implementer doesn't run them.
1. Codex chat, Supervised, SocratiCode on: ask for two codebase searches. The card shows Allow, Allow for session and Deny. Click "Allow for session". The second search doesn't ask.
2. Same chat: ask for a different SocratiCode tool. It asks.
3. Same chat, switch to Plan and ask for a search. Codex may not ask, because Codex itself remembers the choice until it restarts. That's expected.
4. Branch from a Claude turn (Native Branch check NB-1 in `docs/notes/local4-manual-checks.md`), send a message, close and reopen the app, and send another. The branch continues.

Unverified until then: whether Claude honours `--session-id` with `--fork-session` (fix D covers both cases).

## Facts, decisions, assumptions
- Facts: the payload and the notification order were captured from a real Codex 0.159.0 app-server turn on 2026-10-01. All file and line references were read at `b937b11`.
- Decisions:
  - Take the tool name from the in-progress item and use `message` only to confirm it. Parsing the name out of the text alone would depend on wording Codex can change.
  - Two in-progress calls to the same tool count as one name, because the grant key is per tool, not per call.
  - Fix C also drops the grant after a plain stop. The user is asked once more, which is the safe result.
  - Fix B stays minimal: only the stored-grant check changes.
- Assumptions:
  - Codex sends `item/started` for the tool before its approval request in every Supervised MCP call. Seen once in the capture. If it doesn't hold, the result is AC-3: no session option.
  - A request from a child thread carries a `threadId`. The captured parent request had none.

## Open questions
None blocking.

## Implementer report format
- Per fix (A–F): done, partial or not done.
- Per AC: the test name that covers it.
- Commit shas.
- Checks run, with results.
- Deviations from this spec, and why.
- Anything changed beyond these fixes.

## Handoff retro
Filled in by the spec writer (Claude) after review, 2026-10-01 16:02 IST.

**Verdict:** code review passed. AC-1 to AC-13 and I-1 to I-6 hold. No rework. The spec stays in Review until the Manual checks above pass on an installed build.

**How it was checked**
- Read all four diffs against the Implementation plan. The source changes match it line for line. `src-tauri`, `AgentTranscript.tsx` and `ApprovalToasts.tsx` are untouched.
- Reran `npx tsc --noEmit` (pass) and the five changed test files (217 tests, pass).
- Removed each fix by hand, one at a time, ran its test file, and restored the file. Result:

| Fix removed | Test that failed |
|---|---|
| B: `!live.planning` | "does not reuse a stored MCP grant during a Plan turn" |
| C: Codex liveness check | "does not save a Codex session grant when the session stops during the response write" |
| C: Claude early return | "does not save a Claude session rule when the session stops during the response write" |
| D: adopt the reported id while the fork is pending | "delays binding until result and records the last top-level assistant uuid" |
| D: ignore the source id | "ignores the source session id reported during a pending fork" |
| D: no bound event while pending | "delays binding until result…" and "exit after the user write is a generic failure…" |
| A: delete on `item/completed` | "offers no session scope after the matching item completes" |
| A: clear the map at turn start and end | "does not carry an in-progress MCP item into the next turn" |
| A: `threadId === live.threadId` on the request | none (see gaps) |

**What the implementer got wrong or asked about**
- Asked nothing and reported no deviations. The code is right.
- The `SPECS.md` row was labelled Review but left under the Progress heading, with the "no specs" line still below it. The spec did say where the row goes, so this is a worker slip. Fixed in review.
- The implementer wrote its summary into this section (kept below). Spec gap: the section didn't say who fills it. Next time the template line should read "Filled in by the spec writer after review".

**Test gaps, each caused by the spec**
- AC-13, second sentence ("for every other reason, `origin.harness === source.harness`") has no assertion. The Test matrix only said "extend the different-provider case". The code is plainly right (`branchPlan.ts:67`). One line in the "copies with %s" test would close it. Closed in `d691035` at Nakul's request; the line fails when the icon is wrong.
- I-6 says the bound event is sent once. The test uses `toContainEqual`, which also passes for two events. AC-11 should have said "exactly one".
- A request that carries a child `threadId` isn't tested. The spec listed that only as an assumption, with no AC.

**What went better than the spec asked**
- An extra test, "does not use child-thread items to scope a parent MCP approval".
- More fail-closed unit cases than AC-5 and AC-7 required (unquoted tool name, a 201-character item name, two quoted tools).
- Fix F found a real cause: the test waited a fixed 20 ms for the real `FileReader`, which is slower in a full run. The test now uses a `FileReader` double and checks that the pasted file is shown before it continues. Only the test changed, and it is stricter than before.

**Implementer's summary (kept as written)**
Fixes A–E are implemented in `b905b8c`, `0a27328`, and `4423fd8`. Optional fix F made the Composer attachment ownership test deterministic in `35b1f2b`. Per-commit TypeScript and focused Vitest checks passed. The final `npm test` passed (342 files, 3,944 tests). The branch is clean; no push, package build, app run, or desktop check was performed. Nakul's manual checks remain below. Claude's reported fork-id behavior remains unverified in an installed build.
