# 0.1.55-local4-provider-batch — manual checks

This build contains the six provider features (commits bf41013 → f1a4712). Automated tests already cover the logic.
These checks cover what only a real Claude, Codex or OpenCode session can show. The full lists are in each spec's
"Manual checks" section. This file keeps the ones that matter for daily use.

Mark each check ✅ or ❌. For a ❌, write down what you saw; a screenshot helps.

**Closed 2026-10-01 18:20 IST.** Nakul reported build 0.1.55-local5-provider-fixes fine. The boxes below weren't
ticked one by one, so they stay as a reference for later debugging.

## Run these on 0.1.55-local5-provider-fixes

Local5 is local4 plus the follow-up fixes (`3f5834b` → `d691035`). Use it for every check in this file.
Do these four first; they are the ones local5 changes
([spec](../specs/provider-batch-followup-fixes.md#manual-checks)):

- [ ] F-1 Codex, Supervised, SocratiCode on: ask for two codebase searches. The card shows Allow,
      Allow for session and Deny, all at text width. Click "Allow for session". The second search doesn't ask.
      (This is SA-1, which failed on local4.)
- [ ] F-2 Same chat: ask for a different SocratiCode tool. It asks.
- [ ] F-3 Same chat: switch to Plan and ask for a search. Codex may not ask, because Codex itself remembers the
      choice until it restarts. That's expected.
- [ ] F-4 Branch from a Claude turn (NB-1), send a message, close and reopen the app, and send another.
      The branch continues.

## Must test (about 45 minutes)

### Native Branch (newest, riskiest)
- [ ] NB-1 Claude: in a chat with a few tool turns, click Branch on the latest turn. Before you send anything, the
      divider reads "… keeps Claude Code's full history". Send "What did we just do?". The answer mentions details
      from tool output (a summary wouldn't have them). The original chat is unchanged.
- [ ] NB-2 Claude: send two new turns, branch the first of them, and ask "What is the last thing I asked you?".
      The answer names the first turn, not the second. This is the check nothing offline can prove.
- [ ] NB-3 Codex: repeat NB-1 and NB-2.
- [ ] NB-4 Cursor (or another non-native provider): Branch behaves as before. The summary appears in the message box.
- [ ] NB-5 Branch the latest turn, restart MonoCode, then send in the branch. It still keeps the full history.
- [ ] Watch: after the branch's first reply, send a second message. It must continue without an error such as
      "session not found" (this is fix 3 in the fix list).

### Session approvals
- [ ] SA-1 Codex, Supervised, SocratiCode on: ask for two codebase searches. Click "Allow for session" on the
      first. The second must not ask.
- [ ] SA-2 Claude, Supervised: the same with SocratiCode. Wait more than 5 minutes idle, ask again, and it must not
      ask.
- [ ] SA-3 Codex: "Allow for session" on a command, then run the same command (no prompt) and a different
      command (prompt).
- [ ] SA-4 Afterwards, the modification times of `~/.claude/settings*.json`, the project's
      `.claude/settings.local.json` and `~/.codex/config.toml` haven't changed.

### Claude live controls
- [ ] CL-1 Claude chat: send, switch Sonnet → Opus, send again. The reply comes without the few-second restart
      pause.
- [ ] CL-2 Switch Supervised → Auto-accept edits → Supervised between messages. Approvals follow each change.
- [ ] Watch: a status line such as "Claude answered with X instead of Y" after a switch. If it appears every time,
      note the exact text.

### Context accuracy
- [ ] CA-1 Claude chat after several tool-heavy turns: the context popover says "Reported by Claude Code" and
      lists MCP server sizes. Compare with `/context` in a terminal Claude session; the totals should be close.
- [ ] CA-2 The same chat after 5+ idle minutes: it says "Estimated", and MCP servers read "size not reported".
- [ ] CA-3 Codex chat: `/compact` shows "Out of date" until the next reply.
- [ ] Watch: "Free space" shown as a coloured bar segment rather than empty space.

### AI helpers
- [ ] AH-1 Settings → Chat → AI helper shows Automatic. "Choose a model" shows the model row. The account select
      appears only for Claude and Codex.
- [ ] AH-2 Helper set to Codex with a specific model: generate a commit message, then start a new chat so it gets
      a title. Both work.
- [ ] AH-3 Helper set to Claude with a Sonnet model: the same two checks work.
- [ ] AH-4 Back on Automatic: titles and commit messages work as before.

## Test if you have time

- Native Branch: OpenCode NB-1/NB-2, branching an old turn (from before this build), NB 6, 7a and 8 in the spec.
- Context: after a restart it shows "Out of date"; a new chat shows the Unknown copy; the popover fits a narrow window.
- Claude live controls: Full access and effort changes still restart (expected).
- AI helpers: the backup model is used only after a model error, not after a sign-in error; typing during Generate
  keeps your text. Check 9 in the spec creates a real GitHub PR, so use a scratch repo.
- Codex MCP forms: needs an MCP server that sends forms (elicitation form mode). Skip unless you have one.
  Everything else about forms is covered by tests.
- Approvals: approving with "Allow for session" from the toast.
