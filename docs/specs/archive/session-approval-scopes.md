# Done — Session approvals for Claude and Codex — spec

- Workflow status: Done — set 2026-10-01 18:20 IST by Claude at close-out. Nakul reported build 0.1.55-local5-provider-fixes fine; per-check results weren't itemized, so the Manual checks section and its caveats stay as written. Pushed to the fork at `c2c8bf6`. Earlier status: Review. Manual check SA-1 failed on 2026-10-01 in build 0.1.55-local4: Codex never offers "Allow for session" for MCP tools. The rework is its own spec, [provider-batch-followup-fixes.md](provider-batch-followup-fixes.md) (fixes A, B and C). This spec stays in Review until that one is verified.
- Earlier: Approved by Nakul on 2026-09-30 after the first handoff stopped on missing SHAs. Implemented from checkpoint `a65bd4e` in the authorized feature worktree; automated checks pass and Nakul's manual checks remain.
- Tier: complex · Snapshot: `9397898` on `nakul/windows-support` plus the retained uncommitted changes listed in the umbrella plan, 2026-09-30.
- Umbrella: [provider-daily-work-improvements-plan.md](provider-daily-work-improvements-plan.md), slice 1.
- Provider versions verified: Claude Code 2.1.283, codex-cli 0.159.0.

## Baseline, dependencies and worktree
- Revised 2026-09-30 after the handoff review ([provider-spec-handoff-review-30sept.md](../../notes/provider-spec-handoff-review-30sept.md)). Approved by Nakul 2026-09-30 (Todo).
- Position in the batch: first of six (umbrella slice 1). Order: slice 1 approvals → slice 2 Claude live controls → slice 4 context → slice 3 native branch → slice 5 AI helpers → slice 6 forms. Implement and integrate one slice at a time: each slice is merged into `nakul/windows-support` and verified before the next worktree is cut.
- Prerequisite baseline: the `nakul/windows-support` commit that contains the umbrella baseline checkpoint (the retained changes reviewed and committed). No other slice is required. For this slice the baseline is the checkpoint commit itself: baseline = checkpoint = `a65bd4e4b0c2742cd0fc54a4087358471efc3888` (recorded in the umbrella plan).
- Dependencies: None. Later slices build on this one: slice 2 and slice 5 extend `buildClaudeSpawnArgs` after its `allowedTools` change, and slice 6 adds the form path after this slice's `codexMcpConfirmation` grant logic.
- Verify before starting: `git -C E:\Developing\OpenSource\mono-clone cat-file -e a65bd4e4b0c2742cd0fc54a4087358471efc3888^{commit}` succeeds; `git -C E:\Developing\OpenSource\mono-clone merge-base --is-ancestor a65bd4e4b0c2742cd0fc54a4087358471efc3888 a65bd4e4b0c2742cd0fc54a4087358471efc3888` succeeds; `git -C E:\Developing\OpenSource\mono-clone merge-base --is-ancestor a65bd4e4b0c2742cd0fc54a4087358471efc3888 nakul/windows-support` succeeds. If any check fails, or either SHA is missing from the handoff, stop and report Blocked. Don't pick a baseline yourself.
- Worktree: once this spec is Todo, you are authorized to create this slice's worktree yourself, from the verified baseline only: `git -C E:\Developing\OpenSource\mono-clone worktree add E:\Developing\OpenSource\mono-clone-session-approval-scopes -b feature/session-approval-scopes a65bd4e4b0c2742cd0fc54a4087358471efc3888`. Run the storage check first; the worktree needs its own `npm install` (about 400 MB). Don't create any other branch or worktree. If the path or branch already exists, stop and ask.
- Local docs and profile: `docs/` is ignored by the committed `.gitignore`, and `.agents/` by `.git/info/exclude`, which every worktree shares. The new worktree therefore has neither. Read them by absolute path from the main checkout: `E:\Developing\OpenSource\mono-clone\docs\...` and `E:\Developing\OpenSource\mono-clone\.agents\PROFILE.local.md`. Write status, retro and changelog updates to those main-checkout files only. Don't copy them into the worktree; never `git add -f` them.
- Shared resources: don't edit source, run installs or write build output (`node_modules`, `dist`, Cargo `target`) in the main checkout or any other worktree. Leave `mono-clone-hari`, `mono-clone-remote` and the stashes untouched.

## In plain words
Today every approval in a Claude or Codex chat is one-time. A tool you have already allowed, such as a SocratiCode search, asks again on every call. After this change, approval prompts that support it get a third button, **Allow for session**. After you click it, matching requests in that chat stop asking. Claude chats keep the grant even when MonoCode restarts the Claude process. Codex keeps it for MCP tools; Codex commands and file edits ask again after Codex restarts. Nothing is written to your Claude or Codex settings files, and grants end when the chat is closed or MonoCode quits. This is not "Always allow": nothing is remembered across chats or restarts of MonoCode. For Codex MCP tools, the button appears only when the request matches a shape MonoCode has verified; anything unrecognized stays a normal one-time approval. The repeated SocratiCode prompt in Codex counts as fixed only after a live check confirms its request shape and the response.

## Storage-full hard blocker (mandatory)
Before installs, builds or large test runs, check free space on every required drive, including TEMP/TMP, caches and Cargo/build outputs. If storage is full, a write fails with ENOSPC, disk-full or insufficient space, or the verified space cannot support the operation, stop task work immediately. Do not retry, keep editing, relocate temp/cache/output directories or delete anything automatically. Safely cancel task-owned operations and preserve existing work. Report the affected drive/path, the measured space or error, the last completed step and the remaining work. Mark this spec and its index row Blocked only if that is safe to write; otherwise report Blocked without further writes. Resume only after space is restored and rechecked and partial outputs are assessed. Any cleanup needs Nakul's explicit authorization.

## Goal and user story
As a MonoCode user in Supervised mode, when I trust a tool for the rest of a chat, I want one click that stops the repeat prompts, so that long SocratiCode- or test-heavy sessions don't need dozens of identical approvals.

## Scope
1. A provider-neutral "session" approval scope carried from the UI to the Claude and Codex adapters.
2. Claude: answer `can_use_tool` with session-scoped `updatedPermissions`, and replay the grants when the process respawns.
3. Codex: `acceptForSession` for command and file-change approvals, `scope: "session"` for permission requests, and `_meta.persist: "session"` for MCP tool-call approvals whose shape is verified, plus a MonoCode ledger for MCP tool grants that survives Codex restarts. Unverified or unrecognized MCP request shapes keep today's one-time approval.
4. A sanitized diagnostic line for Codex MCP elicitations (method, key names and value types; values only for known enum fields), so the SocratiCode repetition can be confirmed from a live trace.
5. UI: an **Allow for session** button in the transcript approval row and the approval toast, shown only when the provider supports session scope for that request.

## Out of scope
- "Always allow" or any write to Claude settings files, `~/.codex/config.toml` or Codex execpolicy (`persist: "always"`, `acceptWithExecpolicyAmendment`, `applyNetworkPolicyAmendment`, `destination` other than `"session"`).
- Persisting grants across MonoCode restarts, or showing or revoking granted rules in the UI.
- Other providers. Their approval flow must stay byte-for-byte the same.
- Changing the full-access, auto or plan-mode auto-decisions.
- Desktop UI verification by the implementing agent (see Manual checks).

## Current behavior (confirmed in source)
- `ApprovalDecision = "allow" | "deny"` (`src/integrations/harness/core/types.ts:131`). The `approval.requested` and `approval.resolved` events are at `types.ts:72-86`. Consumers include `registry.ts:42-46` and `registry.ts:290-297` (`respondHarnessApproval`), `App.tsx:7804-7811` (`onApproval`) and `App.tsx:8185` (the toast path), `SessionPane.tsx`, `PaneTree.tsx`, `ApprovalToasts.tsx` and `AgentTranscript.tsx`. `ApprovalControls` is at `AgentTranscript.tsx:3429-3457`; the toast buttons are at `ApprovalToasts.tsx:122-138`. `Block.approval` is `{ requestId, decided? }` (`session.ts:273-276`).
- Claude: `handleControlRequest` (`claude.ts:833-966`) prompts through `waitApproval`, then writes `toClaudePermissionResult(decision, input)` (`claudeProtocol.ts:369-380`). That returns only `{ behavior: "allow", updatedInput }` or a deny, so no permission rules are ever added. `parseControlRequest` (`claudeProtocol.ts:382-411`) ignores `permission_suggestions`.
- Claude 2.1.283's control schema (read from the installed binary):
  - `can_use_tool` carries `permission_suggestions?: PermissionUpdate[]`, `mcp_server?`, `blocked_path?` and `decision_reason?`.
  - The allow response accepts `updatedPermissions?: PermissionUpdate[]` and `decisionClassification?: "user_temporary" | "user_permanent" | "user_reject"`.
  - `PermissionUpdate` is one of these types, each with `destination: "userSettings" | "projectSettings" | "localSettings" | "session" | "cliArg"`:
    - `addRules | replaceRules | removeRules {rules: {toolName, ruleContent?}[], behavior: "allow" | "deny" | "ask"}`
    - `setMode {mode}`
    - `addDirectories | removeDirectories {directories}`
- Claude processes restart on any settings change (`settingsKeyFor`, `claude.ts:1415-1425`) and after 5 idle minutes (`HARNESS_IDLE_PARK_MS`, `registry.ts:87`). Session rules live inside the process, so without a replay they are lost on restart. `claude --help` (2.1.283) lists `--allowedTools, --allowed-tools <tools...>`.
- Codex (`codex.ts:1039-1178`):
  - Command and file-change approvals respond `toCodexApprovalDecision(decision, kind)`. That function always returns `"accept"` for allow (`codexProtocol.ts:248-258`, with a comment saying session grants can be added later).
  - Supervised permission requests respond `scope: "turn"` (`codex.ts:1128-1147`).
  - MCP elicitations go through `codexMcpConfirmation` (`codexElicitation.ts`) and always respond `_meta: null` (`codex.ts:1067-1084`).
- Codex 0.159.0 app-server schema (`codex app-server generate-json-schema`):
  - `CommandExecutionApprovalDecision` includes `acceptForSession`: "future prompts in the same session-scoped approval cache should run without prompting".
  - `FileChangeApprovalDecision` includes `acceptForSession`: "future changes to the same files".
  - `PermissionsRequestApprovalResponse.scope` is `"turn" | "session"`.
  - The command and file-change params have no `availableDecisions` field, so `acceptForSession` is always valid for them.
- Codex 0.159.0 source (`codex-rs/core/src/mcp_tool_call.rs`, `codex-rs/protocol/src/mcp_approval_meta.rs`):
  - An MCP tool-call approval is a form elicitation with an empty `requestedSchema.properties`. The message is `Allow the {server} MCP server to run tool "{tool}"?`.
  - `_meta` carries the approval kind `"mcp_tool_call"` and `persist` (`"session"`, `"always"` or both), plus `tool_name` and other display keys.
  - Replying `accept` with `_meta.persist == "session"` remembers the approval in memory for `{server, connector, tool}`. Replying without it approves once.
  - Unless a tool is annotated read-only, Codex requires approval for it.
  - The installed Codex 0.159.0 binary uses `codex_approval_kind`. Current upstream main source also defines `codex_approval_kind`.

### SocratiCode repetition — root cause status
Probable, not confirmed, and not claimed fixed by this slice until manual check 1 passes. MonoCode answers both providers' approvals as one-time only. If Codex offers `persist: "session"` for the SocratiCode MCP tool calls, MonoCode's `_meta: null` reply would explain the repeated prompt. On the Claude side, `mcp__…socraticode…` tools prompt in Supervised mode and MonoCode never adds a rule. The local Codex rollout logs record items and MCP attribution, not the elicitation request, so the wire shape has not been observed. Implementation step 1 adds the sanitized diagnostic; manual check 1 captures the real request shape and confirms whether the session response stops the repeat. Until then, the implementer's report and the changelog must say "SocratiCode repetition: unverified".

## Proposed behavior and invariants
1. A session grant only ever adds allow rules scoped to the running provider session (`destination: "session"`, `acceptForSession`, `persist: "session"`, `scope: "session"`). No settings file, config or execpolicy is written.
2. **Allow for session** appears only when the adapter has marked the request as session-capable. Otherwise the UI is unchanged.
3. `ApprovalDecision` keeps its two values. The scope travels separately, so every existing `=== "allow"` check keeps its meaning. An allow without a scope is exactly today's one-time allow.
4. Grants belong to a MonoCode session id. They are cleared when that chat is forgotten, when its working folder or provider account changes, and when MonoCode quits (memory only).
5. A Claude bash grant never widens beyond the rule Claude itself suggested. MonoCode never invents a bare `Bash` rule.
6. The diagnostic logs only: the method; the server name; the sorted `_meta` key names (at most 20, each cut to 64 characters) with each value's JSON type; the approval-kind value only when it equals `"mcp_tool_call"` (otherwise `"other"` or `"absent"`); the persist values only when they are `"session"` or `"always"` (others become `"other"`); and whether the schema has properties. It never logs messages, params, tool names, tool arguments, content or any other `_meta` value.
7. Fail closed. A Codex MCP elicitation gets a session option only when every check in the Codex algorithm passes against keys verified from the installed binary. A guessed key is never kept: if step 1 can't verify any approval-kind key, MCP session grants ship disabled and every MCP approval stays one-time.
8. "Allow for session" never sends or implies a persistent grant. MonoCode never sends `persist: "always"`, never writes a settings or execpolicy destination, and never labels a session grant "Always". A request that offers only `"always"` gets no session button.

### Contract changes
- `types.ts`:
  - Add `export type ApprovalScope = "once" | "session";`.
  - `approval.requested` gains `sessionScope?: { hint: string }`; its presence means session-capable.
  - `approval.resolved` gains `scope?: ApprovalScope`.
- `registry.ts`: `HarnessAdapter.respondApproval(sessionId, requestId, decision, scope?: ApprovalScope)` and `respondHarnessApproval(harness, sessionId, requestId, decision, scope?)`. Adapters that ignore the fourth argument behave as today.
- `session.ts`: `Block.approval` gains `sessionScopeHint?: string` (set from the event) and `scope?: ApprovalScope` (set on resolve). Persist both through `sanitizeBlock` (`sessionStore.ts:505`) as plain strings with a length cap of 200 characters for the hint.

### Claude algorithm
`claudeSessionRules(toolName: string, suggestions: unknown): ClaudeSessionGrant | null`, a new pure function in `claudeProtocol.ts`:
1. Parse `suggestions` as an array. Keep entries where either:
   - `type === "addRules"`, `behavior === "allow"` and `rules` is a non-empty array of `{toolName: string, ruleContent?: string}`; or
   - `type === "addDirectories"` and `directories` is a non-empty string array.
   Drop every other entry, including `setMode`, `replaceRules`, `removeRules`, deny or ask rules, and malformed entries.
2. Rewrite each kept entry's `destination` to `"session"`.
3. If nothing was kept and `toolName` starts with `mcp__`, return a grant with `updates: [{ type: "addRules", rules: [{ toolName }], behavior: "allow", destination: "session" }]`.
4. If nothing was kept otherwise, return `null`.
5. Return `{ updates, rules }`, where `rules` is the flattened `addRules` rules; these are replayable.

In `handleControlRequest`, before emitting `approval.requested`: compute the grant, store it on the pending approval, and set `sessionScope: { hint: "Stop asking for this in this chat." }` when the grant is non-null. On resolve with `decision === "allow"` and `scope === "session"` and a grant:
- Write `{ behavior: "allow", updatedInput: input, updatedPermissions: grant.updates }` through `toClaudePermissionResult(decision, input, grant.updates)`.
- Append `grant.rules` to `sessionGrantsByThread.get(sessionId)` (a new module-level `Map<string, { cwd: string; providerAccountId?: string; rules: {toolName: string; ruleContent?: string}[] }>`). De-duplicate by `toolName + "\u0000" + (ruleContent ?? "")`.
- A session scope without a grant (a stale UI) is treated as a one-time allow.

Replay: `launchOptions` (`claude.ts:1427-1466`) adds `allowedTools: string[]` from the ledger entry when its `cwd` and `providerAccountId` match the input. Each rule is formatted as `toolName` or `` `${toolName}(${ruleContent})` ``. `buildClaudeSpawnArgs` (`claudeProtocol.ts:240-290`) pushes `--allowedTools` followed by each rule as its own argv entry, placed before `--setting-sources` so that the next token is always an option. The ledger is not part of `settingsKeyFor`. Clear the ledger entry:
- in `forgetClaudeSession`;
- in `ensureLive` wherever `resumeByThread.delete(input.sessionId)` runs for a cwd or account mismatch;
- in `__claudeTestReset`.
Directory grants are not replayed; they last only as long as the process.

### Codex algorithm
- `toCodexApprovalDecision(decision, kind, scope?: ApprovalScope)`: `"decline"` for deny; `"acceptForSession"` when scope is `"session"` and kind is command or file change; otherwise `"accept"`.
- `mapApprovalRequest` sets the session scope on command and file-change events:
  - command: `sessionScope: { hint: "Stop asking for this command until Codex restarts." }`
  - file change: `sessionScope: { hint: "Stop asking for changes to these files until Codex restarts." }`
  - The Supervised permissions event gets `sessionScope: { hint: "Keep these permissions for the rest of this Codex session." }`, and on session allow responds `{ scope: "session", permissions }`.
- MCP: add `CODEX_MCP_APPROVAL_KIND_KEYS: readonly string[]` in `codexElicitation.ts`. It holds only the key names that implementation step 1 found in the installed `codex.exe`, with the version recorded next to it in a comment. If step 1 found none, it is `[]`, and no MCP request is ever session-capable.
- Extend `codexMcpConfirmation` to return `mcpToolGrant?: { key: string }`. It is set only when every check passes:
  - `mode` is `"form"` and `requestedSchema` is `{type: "object", properties: {}}` (no properties, or an empty object);
  - `_meta` is a plain object;
  - exactly one key in `CODEX_MCP_APPROVAL_KIND_KEYS` is present in `_meta`, and its value is `"mcp_tool_call"`;
  - `_meta.persist` is `"session"`, or an array of strings containing `"session"`;
  - `_meta.tool_name` is a non-empty string of at most 200 characters;
  - `serverName` is a non-empty string.
  Any failed check means no grant and today's one-time behavior. The key is `` `${serverName}\u0000${tool_name}` ``. When it is set, the event carries `sessionScope: { hint: "Stop asking for this tool until the chat closes." }`.
- On session allow, respond `{ action: "accept", content, _meta: { persist: "session" } }` and add the key to `mcpGrantsByThread` (a new `Map<string, Set<string>>` in `codex.ts`, keyed by MonoCode session id).
- Before prompting, if the key is already in the ledger, respond with the same session accept without emitting approval events. This covers requests after a Codex restart.
- Clear the ledger in the Codex forget path and test reset, and when the thread's cwd or account changes (the same places the resume entry is deleted).
- Unchanged: the computer-use auto-accept in full-access, the unsupported-form cancel (slice 6 changes that separately), plan and cancel handling.

## States and transitions
| State | Event | Next state | User sees |
|---|---|---|---|
| Request pending, session-capable | Click Allow for session | resolved, `scope: "session"` | Row shows "Allowed for session"; tool runs |
| Request pending, session-capable | Click Allow | resolved, `scope: "once"` | Row shows today's allowed state |
| Request pending, not session-capable | — | — | Allow and Deny only (today) |
| Claude grant held | Process respawns (idle park, model change) | grant replayed via `--allowedTools` | No prompt for the same rule |
| Codex MCP grant held | Codex restarts, same tool asks | auto-accepted with `persist: "session"` | No prompt |
| Codex command grant held | Codex restarts | grant lost | Prompt appears again (hint said so) |
| Codex MCP request with an unverified or unrecognized shape | — | — | Allow and Deny only (today); diagnostic line logged |
| Any grant | Chat forgotten, cwd or account changes, app quits | cleared | Next request prompts |

## Acceptance criteria
- AC-1 Given a Claude `can_use_tool` for `mcp__plugin_socraticode_socraticode__codebase_search` with no suggestions in Supervised mode, when the request arrives, then `approval.requested` includes `sessionScope.hint === "Stop asking for this in this chat."`.
- AC-2 Given AC-1, when the user picks Allow for session, then the control response is exactly `{ behavior: "allow", updatedInput: <input>, updatedPermissions: [{ type: "addRules", rules: [{ toolName: "mcp__plugin_socraticode_socraticode__codebase_search" }], behavior: "allow", destination: "session" }] }`, and `approval.resolved` carries `decision: "allow", scope: "session"`.
- AC-3 Given a Claude `Bash` request whose suggestions are `[{ type: "addRules", rules: [{ toolName: "Bash", ruleContent: "npm test:*" }], behavior: "allow", destination: "localSettings" }, { type: "setMode", mode: "acceptEdits", destination: "session" }]`, then the session updates are exactly one addRules entry with `destination: "session"` and `ruleContent: "npm test:*"`; the setMode entry is dropped.
- AC-4 Given a Claude `Bash` request with no suggestions, then there is no `sessionScope`, and only Allow and Deny are shown.
- AC-5 Given a session grant `Bash(npm test:*)` for session S in cwd C, when the Claude process for S respawns in cwd C with the same account, then the spawn args contain `--allowedTools` followed by `Bash(npm test:*)`. With a different cwd, the ledger is cleared and the flag is absent.
- AC-6 Given a plain Allow (`scope` absent or `"once"`) on any Claude request, then the response is byte-identical to today's (no `updatedPermissions`).
- AC-7 Given a Codex command approval in Supervised mode, when the user picks Allow for session, then the response is `{ decision: "acceptForSession" }`; the same for file change. A plain Allow is `{ decision: "accept" }`.
- AC-8 Given a Supervised Codex permissions request, Allow for session responds `{ scope: "session", permissions: <requested> }`, and a plain Allow responds with `scope: "turn"` as today.
- AC-9 Given `CODEX_MCP_APPROVAL_KIND_KEYS = [K]` (K is the key step 1 verified; tests set it through a test-only override), and a Codex MCP elicitation with `requestedSchema: { type: "object", properties: {} }` and `_meta: { [K]: "mcp_tool_call", persist: ["session", "always"], tool_name: "codebase_search" }` from `serverName: "socraticode"`, then the event has `sessionScope`; Allow for session responds `{ action: "accept", content: {}, _meta: { persist: "session" } }`. It never contains `"always"`.
- AC-10 Given AC-9 granted, when Codex restarts and sends the same elicitation for the same MonoCode session, then MonoCode responds with the same session accept and emits no `approval.requested`. A different `tool_name` prompts.
- AC-11 (fail closed) Given any of the following, then there is no `sessionScope`, only Allow and Deny are shown, and a plain Allow responds exactly as today (`_meta: null`):
  - `persist` is only `"always"`;
  - the approval kind is missing, or is under a key not in `CODEX_MCP_APPROVAL_KIND_KEYS`;
  - `CODEX_MCP_APPROVAL_KIND_KEYS` is empty;
  - two listed keys are both present;
  - `requestedSchema.properties` is non-empty;
  - `tool_name` is missing, empty or longer than 200 characters.
- AC-12 Given any Codex MCP elicitation, then exactly one `console.debug("[monocode] codex elicitation", {...})` is written, with only the keys `method`, `serverName`, `metaKeys`, `approvalKind`, `persist` and `hasSchemaProperties`. Given `_meta` containing `tool_name: "secret-tool"` and `arguments: {path: "C:/x"}`, then the logged object contains neither value; `metaKeys` lists `["arguments:object", "tool_name:string", …]`.
- AC-13 Given a Cursor, OpenCode or other provider approval, then no `sessionScope` is emitted, and `respondApproval` calls with a scope behave as without one.
- AC-14 Given a resolved session approval, when the app restarts, then the transcript row still reads "Allowed for session" (persisted `scope`), and no grant is active.

## Ordering contracts
- UI click → `onApproval(sessionId, requestId, "allow", "session")` → `respondHarnessApproval` → the adapter's `respondApproval` resolves the pending promise with `{ decision, scope }` → the adapter emits `approval.resolved` → writes the provider response → records the ledger entry. The ledger is written after the provider response write succeeds; if the write throws, nothing is recorded.
- A second click after resolve finds no pending entry, so it is a no-op (today's behavior).
- Cancellation (`live.cancelled`, `muteUpdates`) resolves as today, and nothing is recorded.
- Codex auto-accept from the ledger happens before any UI event and uses the same response write.

## Implementation plan
0. Storage check (see blocker). Then the baseline checks and worktree creation in Baseline, dependencies and worktree, and `npm install` in the new worktree. Confirm `git rev-parse HEAD` in the worktree equals `a65bd4e4b0c2742cd0fc54a4087358471efc3888` and `git status --short` is empty.
1. Verify the approval-kind key for the installed Codex: record `codex --version`, then search the installed `codex.exe` for `codex_approval_kind` and for the upstream-main alternative (read its exact string from the upstream `codex-rs/protocol/src/mcp_approval_meta.rs`). Put only the strings actually found into `CODEX_MCP_APPROVAL_KIND_KEYS`, and record the result in this spec's Facts. If neither is found, set it to `[]`; don't keep a guessed key. Report which case applied.
2. `types.ts`, `registry.ts`, `session.ts`, `sessionStore.ts`: the contract changes above.
3. `apply.ts`: `approval.requested` copies `sessionScope.hint` onto `block.approval.sessionScopeHint`; `approval.resolved` stores `scope`.
4. `claudeProtocol.ts`: `parseControlRequest` returns `permissionSuggestions` (raw), `claudeSessionRules`, the `toClaudePermissionResult` third parameter, and `buildClaudeSpawnArgs` `allowedTools`.
5. `claude.ts`: `PendingApproval` gains `grant`; `ApprovalOutcome` becomes `{ decision: ApprovalDecision; scope?: ApprovalScope } | "cancelled"`; `respondClaudeApproval` gains the scope; add the ledger, replay and clear points.
6. `codexProtocol.ts`, `codexElicitation.ts`, `codex.ts`: decision mapping, event hints, MCP grant key, ledger, diagnostic.
7. UI:
   - `AgentTranscript.tsx` `ApprovalControls`: when `approval.sessionScopeHint` is set, render a middle button "Allow for session" with `title={hint}`, using the secondary style of the Deny button with `text-content/85`.
   - Resolved rows: when `scope === "session"`, show "Allowed for session" wherever the allowed state is labeled today.
   - `ApprovalToasts.tsx`: the same third button (the notice needs the hint; extend the notice type).
   - Thread the scope through `onApproval` props in `SessionPane.tsx`, `PaneTree.tsx` and `App.tsx:7804` and `App.tsx:8185`.
   - Keep keyboard order Allow → Allow for session → Deny.
- Must not change: approval auto-decisions per runtime mode, the question flow, handoff and orchestration approval paths (`orchestration.ts`, `handoffTurn.ts`), which pass no scope.

## UI details
- Button copy: `Allow`, `Allow for session`, `Deny`.
- Resolved copy: `Allowed for session`.
- The hint appears as the native `title` tooltip and as `aria-description` on the button.
- Reduced motion: no new animation.
- Width: the three buttons wrap onto two lines under 320px (`flex-wrap`).
  In the transcript, each button is as wide as its text (changed back in `3f5834b` at Nakul's request). In the pop-up card, the buttons share the row.

## Skills to load
`frontend-ui`, `testing`, `desktop-app`.

## Test matrix
| AC / risk | Level | File | Scenario |
|---|---|---|---|
| AC-1–4, 6 | unit | `claudeProtocol.test.ts` | `claudeSessionRules` table (MCP fallback, bash suggestion, setMode dropped, malformed, empty); `toClaudePermissionResult` with and without updates |
| AC-5 | unit + adapter | `claudeProtocol.test.ts`, `claudeLive.test.ts` | Spawn args ordering; respawn after grant has `--allowedTools`; cwd change clears |
| AC-2 end-to-end | adapter | `claudeLive.test.ts` | Fake child: `can_use_tool` → respond with scope → written JSON equals AC-2 |
| AC-7, 8 | unit + adapter | `codexProtocol.test.ts`, `codexLive.test.ts` | Decision mapping; permissions scope |
| AC-9–12 | unit + adapter | `codexElicitation.test.ts`, `codexLive.test.ts` | Grant detection table including every AC-11 fail-closed row and the empty-key-list case; session accept payload never contains `"always"`; ledger auto-accept after restart; diagnostic keys (spy on `console.debug`, assert the exact key set and that no tool name or argument value appears) |
| AC-13 | adapter | existing provider tests | A fourth argument is ignored |
| AC-14 | unit | `sessionStore` round-trip test beside existing store tests | `scope` and hint persist; overlong hint trimmed |
| UI | component | `ApprovalToasts.test.ts`, `AgentTranscript` test file | Third button only with hint; click passes `"session"` |

## Verification
- Implementer runs: `npx tsc --noEmit`; `npx vitest run` on the files above; `npm test`; `git diff --check`. ESLint: there is no ESLint config in this repo, so report changed-file lint as unavailable.
- Later (not the implementer): `npm run check:web`, a production build and the manual checks.

## Manual checks (Nakul or a desktop-access Codex session; not the implementer)
1. Codex chat, Supervised, SocratiCode enabled: ask for two codebase searches. In the dev console, copy the `[monocode] codex elicitation` line into the spec's Facts (it contains no values beyond the allowed ones). It should show `approvalKind: "mcp_tool_call"`, `persist` containing `"session"` and `hasSchemaProperties: false`. Click Allow for session on the first; the second must not prompt. Only when both hold is the SocratiCode repetition recorded as fixed. If the line shows another shape, or there is no session button, record the shape, leave the repetition marked unverified, and report it; don't widen the recognizer in this slice.
2. Claude chat, Supervised: the same with SocratiCode tools. Wait more than 5 minutes idle (process park), ask again — no prompt.
3. Claude: run a test command, and check that Allow for session appears only when Claude offers a rule; a different command still prompts.
4. Codex: command Allow for session, then the same command again → no prompt; a different command → prompt.
5. Check that `~/.claude/settings*.json`, the project `.claude/settings.local.json` and `~/.codex/config.toml` modification times did not change.
6. Toast path: approve from the toast with Allow for session.

## Facts, decisions, assumptions
- Facts: Claude 2.1.283's embedded schema and Codex 0.159.0's generated schema/source were checked. Step 1 recorded `codex-cli 0.159.0`; the installed `codex.exe` contains `codex_approval_kind`, and current upstream main defines the same key in `codex-rs/protocol/src/mcp_approval_meta.rs`. `CODEX_MCP_APPROVAL_KIND_KEYS` contains only `codex_approval_kind`.
- Decisions:
  - The scope is a separate argument rather than a third `ApprovalDecision` value, so existing `=== "allow"` checks cannot silently turn a session allow into a decline.
  - Grants are session-only, with no settings writes: reversible, and no ask-first config edits.
  - The Claude replay uses `--allowedTools` so Claude's own matcher decides; MonoCode never re-implements rule matching.
  - The Codex ledger covers MCP tools only; command and file grants depend on Codex's in-memory cache, and the hint says so.
  - The Codex MCP recognizer fails closed: only keys found in the installed binary, and only the exact empty-schema approval shape. A missed session option costs one extra click; a wrong one would approve something the user didn't mean to.
- Fact (2026-10-01, captured by Claude from a real Codex 0.159.0 app-server turn in mono-clone, Supervised): the SocratiCode approval is `mode: "form"`, `requestedSchema: {type: "object", properties: {}}`, and `_meta` has the keys `codex_approval_kind: "mcp_tool_call"`, `persist: ["session", "always"]`, `tool_description`, `tool_params` and `tool_params_display`. There is **no `tool_name`**. The tool name appears only in `message` ("Allow the socraticode MCP server to run tool \"codebase_status\"?") and in the `item/started` `mcpToolCall` notification (`server`, `tool`, `status: "inProgress"`), which arrives before the elicitation. Because the recognizer requires `_meta.tool_name`, it never creates a grant, so the installed local4 build shows only Allow/Deny. Nakul saw this on 2026-10-01. Fix: [provider-batch-followup-fixes.md](provider-batch-followup-fixes.md), fix A.
- Assumptions (unverified):
  - ~~The SocratiCode MCP approval in Codex arrives as the empty-schema `mcp_tool_call` elicitation with `persist` offering `"session"`~~. Shape confirmed above, except for `tool_name`.
  - `--allowedTools` rules added at spawn behave like session allow rules in stream-json mode (manual check 2).
  - Codex keeps `acceptForSession` for the life of the app-server thread (manual check 4).

## Open questions
- The actual SocratiCode request shape and its response are unverified until manual check 1.
- Not blocking: whether Nakul also wants a persistent "Always allow" (a Claude `localSettings` rule or Codex `persist: "always"`). It is excluded here and stays a separate choice from "Allow for session".

## Implementer report format
Per AC: done / partial / not done, with file:line or test name · the step 1 result (Codex version, keys found or none) · the line "SocratiCode repetition: unverified until manual check 1" · deviations and why · open questions · checks run with exact results · files changed · the manual checklist above, unchanged, as a follow-up.

## Handoff prompt
Approved by Nakul 2026-09-30; the SHAs are filled in. Ready to send.

```text
Implement umbrella slice 1 of the provider batch: Session approvals for Claude and Codex.

Spec: E:\Developing\OpenSource\mono-clone\docs\specs\session-approval-scopes.md

1. Read, by absolute path from the main checkout (they are git-ignored, so the new worktree won't have them; don't copy them and never git add -f them):
   E:\Developing\OpenSource\mono-clone\.agents\PROFILE.local.md, E:\Developing\OpenSource\mono-clone\AGENTS.md, E:\Developing\OpenSource\mono-clone\docs\WORKING-AGREEMENT.md,
   E:\Developing\OpenSource\mono-clone\docs\changelog\CHANGELOG.md (then its Current numbered file), E:\Developing\OpenSource\mono-clone\docs\specs\SPECS.md,
   E:\Developing\OpenSource\mono-clone\docs\WINDOWS-CHANGES.md, then the spec above.
2. Baseline: a65bd4e4b0c2742cd0fc54a4087358471efc3888 on nakul/windows-support, containing the umbrella baseline checkpoint (the retained changes reviewed and committed). No other slice is required.
   Checkpoint: a65bd4e4b0c2742cd0fc54a4087358471efc3888. Dependencies: see "Baseline, dependencies and worktree" in the spec.
   Run every check in that section. If one fails, stop and report Blocked.
3. Storage-full hard blocker (mandatory): Before installs, builds or large test runs, check free space on every required drive, including TEMP/TMP, caches and Cargo/build outputs. If storage is full, a write fails with ENOSPC, disk-full or insufficient space, or the verified space cannot support the operation, stop task work immediately. Do not retry, keep editing, relocate temp/cache/output directories or delete anything automatically. Safely cancel task-owned operations and preserve existing work. Report the affected drive/path, the measured space or error, the last completed step and the remaining work. Mark this spec and its index row Blocked only if that is safe to write; otherwise report Blocked without further writes. Resume only after space is restored and rechecked and partial outputs are assessed. Any cleanup needs Nakul's explicit authorization.
4. After the storage check, you are authorized to create exactly one worktree from the verified baseline:
   git -C E:\Developing\OpenSource\mono-clone worktree add E:\Developing\OpenSource\mono-clone-session-approval-scopes -b feature/session-approval-scopes a65bd4e4b0c2742cd0fc54a4087358471efc3888
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
- Implemented in the single authorized worktree from baseline/checkpoint `a65bd4e4b0c2742cd0fc54a4087358471efc3888`; no source changes were made in the main checkout and nothing was committed.
- Step 1: `codex-cli 0.159.0`; the installed `codex.exe` contains `codex_approval_kind`. Current upstream main uses the same string, so the configured list contains only the key verified in the installed binary.
- Verification passed: `npx tsc --noEmit`; focused Vitest matrix (348/348); `npm test` (3,692/3,692); `git diff --check`. ESLint is unavailable because the repo has no ESLint config. No package build or desktop/manual checks were run.
- Storage checks passed before dependency installation and large test runs. Before the full suite: C: 15.31 GiB free (TEMP, TMP and npm cache); E: 19.02 GiB free (worktree and Cargo/build outputs); D: 134.51 GiB; F: 173.24 GiB. No disk-space errors occurred.
- Nakul's six manual checks remain. SocratiCode repetition is not claimed fixed pending manual check 1.
- Deviation: the earlier spec note said upstream main used a different approval-kind key; the current upstream source checked for step 1 defines `codex_approval_kind`, matching the installed binary.
