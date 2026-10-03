# Provider batch — fixes to apply together

> Superseded on 2026-10-01 by the spec [provider-batch-followup-fixes.md](../specs/provider-batch-followup-fixes.md).
> This file keeps the review history. The spec is the only source of instructions; where they differ, the spec wins.

These fixes come from verified review findings. They are applied in one pass after all features are reviewed. The full reasoning is in [provider-batch-review.md](provider-batch-review.md).

## From the review of `bf41013` (session approvals), checked by Claude on 2026-09-30

### 1. Plan mode: a cached MCP grant skips consent (review F2, real, low risk)
- Where: `src/integrations/harness/providers/codex/codex.ts` (about line 1089), the branch that checks `mcpGrantsByThread.get(live.sessionId)?.has(grantKey)`.
- Fix: add `!live.planning &&` to that condition, the same way the computer-use auto-accept above it does. During a Plan turn, the user is asked again.
- Test: in `codexLive.test.ts`, grant a tool for the session in a normal turn, switch to Plan, and send the same elicitation. Assert that the user is prompted and that no automatic `accept` is written.

### 2. A late write can save a grant after cleanup (review F1, practically unreachable, cheap guard)
- Where:
  - Codex: `codex.ts`, after `await live.rpc.respond(...)` in the MCP consent path (about line 1141), and the same step in the command, file and permissions session paths.
  - Claude: `claude.ts` (about lines 1025 and 1561), where session rules are added after the response write.
- Fix: before saving the grant, save it only if `liveByThread.get(live.sessionId) === live && !live.cancelled`. Use the Claude equivalent of the live-session map and its cancelled flag. Otherwise drop the grant silently.
- Test: optional. One deferred-write test is enough: cancel while `respond` is pending, then assert the grant is absent.

### Skipped on purpose
- F3 and F4 (extra lifecycle and Bash-replay tests). The code is correct today, and the cost isn't worth it for this local build. Revisit only if a regression shows up.

## From later reviews
(Add verified fixes for features 2–6 here.)

- `84fbe89` AI helpers (Claude review, 8.5/10): nothing to fix.
- claude-live-controls patch (Claude review, 8/10, not committed yet): nothing to fix. One thing to watch during manual
  testing: after switching model mid-chat, the app should not show "Claude answered with X instead of Y". If it does
  every time, the model name Claude reports doesn't match the name MonoCode sends (for example a date suffix).
  Loosen the comparison in `handleAssistant` (claude.ts, `expectModel` check). Not verifiable without running Claude.
- `11981c0` context accuracy (Sol 6.1 Low, Claude review 8.5/10): nothing to fix. Watch during manual check 1:
  if the popover shows "Free space" as a coloured bar segment, Claude doesn't send `kind` on its categories.
  The parser then treats every category as "used". Fix by mapping by name in `parseClaudeContextUsage`
  (claudeProtocol.ts). Optional polish: drop the per-row "Estimated/Reported" labels, since the badge already says it.
- `f1a4712` native branch (Sol 6.1 Low, Claude review 8.5/10), checked 2026-10-01:

### 3. Claude fork: adopt the id Claude actually reports (NB-1, defensive)
- Where: `claude.ts`, `handleLine`, the `!live.forkPending && sessionIdFromLine && ...` condition.
- Today, while a fork is pending, MonoCode keeps the id it passed with `--session-id` and ignores the id in Claude's output.
  That is correct only if Claude honours `--session-id` together with `--fork-session`. If it doesn't, the branch saves
  an id that doesn't exist, and the next resume fails.
- Fix: store the fork source id on `Live` (for example `forkSourceSessionId`). While `forkPending`, adopt a reported id only
  when it differs from both `live.claudeSessionId` and the source id. Lines that repeat the source id stay ignored.
- Test: in `claudeLive.test.ts`, a fork whose init line reports a third id binds to that id on the first result.
  A line that reports the source id doesn't change the binding.

### 4. Divider icon for a "different provider" branch (NB-3, cosmetic)
- Where: `branchPlan.ts`, `planBranch`. The divider text names the provider of the clicked turn, but
  `origin.harness` (and so the icon) is the original chat's provider.
- Fix: for `reason === "different-provider"`, set `origin.harness` to the turn's provider. Such an origin is created with
  status `done`, so the pending-fork code never reads it.
- Test: in `branchPlan.test.ts`, a branch from a Codex turn in a Claude chat has `origin.harness === "codex"`.

### 5. Codex never shows "Allow for session" for MCP tools (found in manual testing of local4, 2026-10-01; real bug)
- Symptom: with Codex in Supervised mode, a SocratiCode tool approval shows only Allow and Deny.
- Root cause (confirmed with a real Codex 0.159.0 payload, recorded in session-approval-scopes.md → Facts): Codex's
  `_meta` has no `tool_name`. `codexMcpToolGrant` (codexElicitation.ts, about line 601) requires one, returns
  undefined, and the session option is never offered. The tool name is only in `message` and in the `mcpToolCall`
  item, which starts before the approval request (`item/started`: `server`, `tool`, `status: "inProgress"`).
- Fix:
  - codex.ts: keep the in-progress `mcpToolCall` items of the current turn on `Live` (id → {server, tool}). Add an item
    on `item/started`, remove it on `item/completed`, and clear the list at turn start, turn end and stop.
  - codexElicitation.ts: `codexMcpToolGrant` takes the tool name from `_meta.tool_name` when present. Otherwise the
    caller passes the in-progress tools. Use one only if exactly one in-progress item has
    `server === params.serverName`, and `message` contains that tool name in double quotes. Zero or several matches
    mean no grant, so the card shows Allow/Deny as today. That's a safe failure.
  - Keep every other check (form mode, empty schema, `codex_approval_kind`, `persist` containing "session").
- Tests (codexElicitation.test.ts and codexLive.test.ts): use the real payload shape from the spec's Facts (no `tool_name`).
  - With one matching in-progress item, `approval.requested` carries `sessionScope`.
  - With two in-progress calls to the same server, no `sessionScope` is offered.
  - With no in-progress item, no `sessionScope` is offered.
  - After "Allow for session", the same tool is auto-accepted after a Codex restart (AC-10), and a different tool
    prompts.
  - Update fixtures that invented `_meta.tool_name` so at least one uses the real shape.
- Upstream doesn't cover this (checked origin/main on 2026-10-01): it has no session grants at all (no `persist`,
  `mcpToolGrant` or `sessionScope`). Its MCP work (e691b46, fec434a, e322b7f) is settings, discovery and the composer
  picker. 879ae4b makes Full Access auto-accept every MCP consent, not only Computer Use. Supervised still prompts.
  At the upstream sync, 879ae4b conflicts with our elicitation branch in codex.ts. Keep our grant path and take
  upstream's broader Full Access condition, keeping `!live.planning`.
- Button layout: don't change it. The transcript buttons are text-width again since `3f5834b`, and the row wraps
  (`flex-wrap`) when the third button doesn't fit.
- Not included: "Always allow" (`persist: "always"`). Codex would write the approval to `~/.codex/config.toml`, and the
  spec left config writes out on purpose. Add it only if Nakul asks.

### Kept as is
- NB-2: if a summary send fails after the provider already received it, the next send repeats the summary.
  Repeating costs some tokens. The only alternative is risking a branch with no history, so we keep this behaviour.
