# Provider batch review

## 2026-09-30 18:59 IST — Review of `a65bd4e..nakul/windows-support`

### Scope and evidence

- Reviewed tip: `bf41013c9695ea01ba59777fffd1f6354df7ab79`. The requested range contains **one commit**, `feat(approvals): allow for session on Claude and Codex approvals`; all 27 changed paths were reviewed against `session-approval-scopes.md` and their surrounding consumers.
- No Claude-live-controls, context, branch, helpers or Codex-forms commit exists in this range. Those five specs are not implemented by this commit and receive no verdict here. There are no earlier feature commits within the range to test interactions against; the checkpoint and shared consumers were examined.
- Read repo instructions, local profile, working agreement, changelog/spec indexes, Windows notes and relevant approval spec/history. SocratiCode status and semantic search were used for navigation, followed by current-source inspection.
- Review only: no source edits, source test additions, commits, app launch or native UI testing. Findings below identified from source are distinguished from runtime/manual uncertainties. Passing existing tests does not reproduce or disprove the missing interleavings.

### Confirmed findings

#### F1 — A late response write can recreate an invalidated session grant

- **Commit:** `bf41013c9695ea01ba59777fffd1f6354df7ab79`
- **Severity:** bug
- **Locations:** `src/integrations/harness/providers/claude/claude.ts:1025`, `:1561`; `src/integrations/harness/providers/codex/codex.ts:1141`. Cleanup counterparts: Claude `:297`, `:344`; Codex `:340`, `:380`, `:421`.
- **Scenario:** Select Allow for session. The handler starts the asynchronous provider response write. Before that write's promise settles, cancel the turn or forget/switch the chat/account. Cleanup sets cancellation/mute flags and/or deletes the ledger. When the write completes successfully, the old handler unconditionally records its grant: it checks neither cancellation nor whether its `Live` object still owns this session. An already-resolved approval promise cannot be changed to deny by subsequent cancellation.
- **What goes wrong:** A cancelled operation still records a grant, contrary to the Ordering contract. Forget can be followed by reinsertion into the supposedly cleared map. More seriously, Codex's map has only the MonoCode session ID and tool key, so a late old-account handler can insert a grant after the same chat starts under a new account; the next matching request is auto-accepted. Claude's `addClaudeSessionRules` also appends into any existing entry without checking its cwd/account: if the new account has already recorded its own entry, old rules are merged into that new scope. These are allowed asynchronous schedules in the source; no native timing reproduction was run.
- **Suggested fix:** Capture a scope/lifecycle generation with each pending request. Invalidate it on cancel, forget and cwd/account changes; recheck ownership, generation and cancellation after awaiting the user decision and again after the response write, before recording anything. Store explicit cwd/account scope with the Codex ledger and refuse to merge Claude rules into a differently scoped entry. Do not resend an ambiguous response. Add deferred-write tests covering cancel, forget and account/cwd replacement while the response write is pending, including a new-account grant recorded before the old write resolves.

#### F2 — Codex's cached MCP grant changes Plan-mode consent behavior

- **Commit:** `bf41013c9695ea01ba59777fffd1f6354df7ab79`
- **Severity:** bug
- **Location:** `src/integrations/harness/providers/codex/codex.ts:1089` (Plan state updated at `:154`).
- **Scenario:** Grant an MCP tool for the session during a normal turn, then start a Plan turn in the same chat. If Codex asks the same verified MCP tool consent question, the new ledger branch responds `accept` with `persist: session` without prompting, because it does not check `live.planning`.
- **What goes wrong:** Before this commit, this MCP path required explicit consent in Plan mode. The existing computer-use auto-accept immediately above explicitly excludes planning; the new cache branch does not. This violates the spec's requirement to leave plan-mode auto-decisions unchanged. It can silently authorize a previously granted MCP tool while planning. This finding concerns the consent response; no claim is made that a particular MCP server actually performed a write.
- **Suggested fix:** Exclude Plan turns from the new ledger auto-accept path and preserve the baseline Plan-mode MCP consent behavior. Add a test which grants during a normal turn, switches to Plan, submits the same elicitation, and asserts that no automatic session accept is written. If grants should apply during Plan, obtain an explicit spec change defining how read-only restrictions are enforced first.

#### F3 — The required Bash replay criterion is only tested in disconnected pieces

- **Commit:** `bf41013c9695ea01ba59777fffd1f6354df7ab79`
- **Severity:** test gap
- **Locations:** `src/integrations/harness/providers/claude/claudeLive.test.ts:161`; `src/integrations/harness/providers/claude/claudeProtocol.test.ts:161`.
- **Scenario:** A future regression drops `ruleContent` when adding a real Bash approval to the ledger or when converting that ledger into spawn arguments. The current live test grants a bare MCP tool, while the spawn-builder test passes a preformatted `Bash(npm test:*)` string directly. Both can still pass.
- **What goes wrong:** AC-5 specifically requires the actual scoped Bash grant to survive a same-cwd/account respawn without widening its rule. That complete path has no test that would catch the above regression. The implementation appears to format the rule correctly today; this is a missing regression check, not a demonstrated widening bug.
- **Suggested fix:** Grant Bash with `npm test:*` through the live approval path, stop/respawn in the same cwd/account, and assert the precise `--allowedTools` argv entry. Repeat with changed cwd/account and assert absence.

#### F4 — Approval lifecycle and fail-closed wire contracts lack complete regression coverage

- **Commit:** `bf41013c9695ea01ba59777fffd1f6354df7ab79`
- **Severity:** test gap
- **Locations:** `src/integrations/harness/providers/claude/claudeLive.test.ts:160`; `src/integrations/harness/providers/codex/codexLive.test.ts:998`; `src/integrations/harness/providers/codex/codexElicitation.test.ts:85`; `src/features/sessions/data/sessionStore.test.ts:583`.
- **Scenario:** A stale/cancelled/write-failed session approval accidentally enters a ledger, or grants survive forget/account changes or a restored transcript is treated as authorization. Existing tests exercise successful grants and pure metadata rejection, but do not drive those grant lifecycle cases. Existing broken-pipe tests use one-time approvals, so they do not assert that session grants remain absent.
- **What goes wrong:** The critical cancellation/write-before-ledger/cleanup contracts are not protected, which allows F1/F2 to coexist with 348 passing tests. AC-11's negative shapes are tested for absence of `mcpToolGrant`, but not through the live event and wire response. AC-14's saved label is tested through sanitization and rendering, but not by granting, resetting provider memory, restoring the transcript and verifying that a fresh request still prompts.
- **Suggested fix:** Add session-grant failure/cleanup tests with deferred and rejected writes, duplicate clicks, server cancellation and Plan transitions; assert the next request prompts or the next spawn has no replay flag. For supported negative MCP confirmations, assert no session hint and `_meta: null` on one-time allow; retain existing cancellation for unsupported forms. Add a restore/reset test proving that historical scope labels do not restore authorization.

### Acceptance-criterion audit

“Covered” means a directly relevant assertion was found in the committed tests and passed in this review; no mutation-testing claim is made. “Partial” identifies a missing part of the specified scenario. All ACs were checked, including those without findings.

| AC | Implementation | Test evidence / limits |
|---|---|---|
| 1 | Implemented | Claude live MCP request asserts exact session hint. Covered. |
| 2 | Implemented | Same live test asserts exact permission response and resolved scope. Covered. |
| 3 | Implemented | `claudeSessionRules` asserts exact rescope and dropping `setMode`. Covered. |
| 4 | Implemented | Parser returns null for Bash without valid updates and UI is hint-gated. Partial: no live no-suggestions Bash test asserting absent hint; generic toast two-button test is present. |
| 5 | Implemented in source | Partial: live MCP replay/cwd reset plus preformatted Bash spawn test; no complete Bash grant replay. F3. |
| 6 | Implemented | Pure permission-result test asserts unchanged absent-scope payload; existing one-time live paths pass. Partial: explicit `once` and live no-updates assertion not exercised as a matrix. |
| 7 | Implemented | Live command response and pure command/file mapping assert `acceptForSession`; one-time paths remain. Partial: no explicit live file-change session response test. |
| 8 | Implemented | Live supervised session response asserts permissions and scope. Partial: explicit one-time supervised permissions response is not paired with it in a regression test. |
| 9 | Implemented | Live MCP event and exact session response, plus verified-key recognition test. Covered. |
| 10 | Implemented on normal restart | Live same-tool replay with no prompt and different-tool prompt. Covered for normal restart; invalidation race is F1. |
| 11 | Implemented metadata guard | Pure negative-shape/key-override tests. Partial: full event/UI/wire negative matrix missing; unsupported forms intentionally retain baseline cancellation. F4. |
| 12 | Implemented | Live spy asserts sanitized diagnostic fields, exactly one call and no secret values. Covered. |
| 13 | Other adapters unchanged | Registry stub proves an ignored scope preserves decision. Partial: no real Cursor/OpenCode approval event test; no changed code adds hints to those providers. |
| 14 | Historical scope persists; ledgers are memory-only | Sanitizer and rendered-label tests. Partial: no restore-to-fresh-provider authorization test. F4. |

### Invariants, ordering and shared consumers

- Normal response ordering matches the spec: decision -> resolved event -> provider write -> ledger insert. Rejected writes skip insertion by throwing. The lifecycle recheck missing across those awaits is F1.
- No new writes to provider settings/config/execpolicy files were found. Claude updates are filtered to session destinations; Codex sends only session persistence, not always. Diagnostic values are filtered as specified.
- Codex malformed/unverified MCP metadata cannot create a grant through the checked guard. Actual installed-version/live request recognition remains a manual uncertainty below.
- Ledger maps are module memory, not session fields. `sessionStore` persists validated historical scope/hint only and drops stale pending prompts. `persistFingerprint` operates on sanitized session data; no ledger is serialized.
- Scope is threaded through registry, App, pane tree, session pane, transcript and toast. Existing provider adapters ignore the extra argument; no unrelated provider implementation is changed.
- No new automatic message resend, helper execution or active-chat helper mutation is introduced. Helper isolation is outside this one-commit range and has not been reviewed as an implemented feature.
- No new production `any` or newly introduced unchecked assertion requiring a separate finding was identified. New test assertions/casts do not prove runtime payload validity; the production grant parsers were inspected directly.

### Suspicions and manual uncertainties — not confirmed bugs

1. **Real SocratiCode request compatibility:** The live Codex/SocratiCode request was not captured in this review. Recognition is deliberately limited to the verified metadata shape. Whether it stops the user's actual repetitive prompt remains unverified, as the spec itself states. Capture the sanitized diagnostic and verify the response in a separately authorized desktop session; do not infer success from fixtures.
2. **Native Claude replay semantics:** Tests prove the argv is constructed, not that an installed Claude process honors each rule after respawn. The spec's native manual check remains required. Directory grants are expressly process-only in this spec and therefore are not reported as an implementation defect.
3. **Native Codex session cache lifetime:** Fixture tests prove wire choices, not the installed server's lifetime behavior for commands/files/permissions. Complete the spec's manual checklist separately. No speculative `availableDecisions` finding was raised: the reviewed contract is the documented installed 0.159.0 shape.

### Checks run

- `npx.cmd tsc --noEmit`: **pass**, exit 0.
- `npx.cmd vitest run` on the ten changed test files below: **348/348 pass**, 10/10 files. Uses mocked child processes; no app/CLI session launched.
  - Claude `claudeLive.test.ts`, `claudeProtocol.test.ts`.
  - Codex `codexLive.test.ts`, `codexProtocol.test.ts`, `codexElicitation.test.ts`.
  - Core `apply.test.ts`, `registry.test.ts`.
  - Sessions `sessionStore.test.ts`, `AgentTranscript.test.ts`, `ApprovalToasts.test.ts`.
- Storage checked before tests: approximately C: 20.3 GiB and E: 19.4 GiB free.
- No build, full-suite rerun, lint, app run or manual desktop test was needed for this scoped review. No claim of desktop readiness.
- `git status --short` remained empty after checks; only this ignored review report is written. No changes were staged or committed.

### Per-commit verdict

| Commit | Feature | Verdict | Reason |
|---|---|---|---|
| `bf41013c9695ea01ba59777fffd1f6354df7ab79` | Session approvals | **needs fixes** | F1 lifecycle race and F2 Plan-mode behavior change; add missing coverage F3/F4 before relying on session grants. |

SocratiCode: used (codebase_status, codebase_search).
