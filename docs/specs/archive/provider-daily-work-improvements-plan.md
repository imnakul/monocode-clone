# Done — Provider improvements for daily work

- Workflow status: Done — the six child specs were built and closed on 2026-10-01 (build 0.1.55-local5-provider-fixes). Kept as the record of the selected scope.
- Recorded: 2026-09-30 10:56 IST.
- Base snapshot: nakul/windows-support at 9397898; re-inventory after parking finishes before cutting implementation branches.
- Branch/worktrees: separate feature worktrees per module, following WORKING-AGREEMENT; no branches/worktrees created for this planning task. Native Branch's historical direct-checkout exception must be reviewed against concurrent parking before implementation.

## Initial Idea

Improve normal chats and manual orchestration using only the user's selected items 1–6. Merge context display item 11 into item 4. No other gaps from the earlier audit are selected.

Scope confirmed again by Nakul on 30 September: implement only this plan's
six selected slices. Prepare for a break, cold-resume warnings and other
unselected features remain deferred. Existing specs are research/reference
material; their feature scopes or dependency lists do not expand this batch.
The context-inspector accuracy findings from the Claude research are included
in slice 4 for both Claude and Codex.

- Goal: fewer repeated approvals, reliable native branching, truthful context information, and user-selected AI helper models.
- User story: As a MonoCode user, I want these controls to work across my chosen providers so that routine work needs fewer interruptions and has clear state.

## Research

- Current Branch from here: src/app/App.tsx onBranch copies forkThreadBlocks and puts buildForkBundle in composerSeed. Existing draft: native-branch.md.
- OpenCodeClient.forkSession already calls POST /session/:id/fork but sends an empty body; selected-turn branching needs messageID and persisted provider message identity.
- Official OpenCode server docs confirm messageID-based fork: https://opencode.ai/docs/server/.
- Harness registry routes title/commit/PR generation to provider-specific adapters. A cross-provider helper selection requires explicit routing separate from the chat's provider.
- Codex approvals, permission grants, MCP forms and question options are distinct wire shapes: https://learn.chatgpt.com/docs/app-server.
- ContextMeter/systemBreakdown already exist; preserve their meters and label estimates rather than presenting reconstructed categories as measured data.

## Discussion

### Handoff review gate — 30 September 13:08 IST

The six new child drafts require corrections before implementation approval.
See [handoff review](../../notes/provider-spec-handoff-review-30sept.md): preserve
Antigravity helper scope, settle tool isolation and PR failure behavior, label
native context estimates honestly, give shared control transport one owner,
verify approval metadata rather than guessing, and reconcile probes/fallbacks.
Keep all children Draft until these findings and the baseline checkpoint are
resolved. Their short implementation prompts are not authorization to start.

### Existing specs to reuse (reviewed 30 September)

- native-branch.md is the detailed starting point for slice 3: new provider identity, selected-turn boundaries, persisted pending forks, account/cwd inheritance, cancellation/retry and restart recovery. Reconcile its hidden summary-prefix/empty-composer proposal with the newer requirement to preserve today's fallback flow for unsupported providers. Revalidate old line numbers, raw protocol fields and capability floors. Do not blindly carry its historical orchestration-WIP snapshot or direct-checkout exception forward.
- claude-cold-resume-warning.md provides research for slices 2 and 4. It documents settings/idle restarts, but its main feature is a cold-resume warning, not live model controls. Its controlled origin retest did not show quota savings. Keep origin handling described as provenance, not a subscription-cost fix. A warm process does not guarantee a warm server-side cache; live setters must not promise quota savings.
- That same cold-resume spec identifies a concrete context-display failure: historical tool_result content absent from visible-message estimates falls into the System & tools residual. Slice 4 must avoid attributing unexplained residuals to tool definitions/MCP servers; include an unclassified-history/unknown category when native data cannot classify them.
- context-dialog-plan.md supplies the existing UI/telemetry/estimate distinction. Reuse the current inspector, not its obsolete file paths/pricing/model assumptions. Current context, per-turn processed usage, cumulative usage and subscription quota remain distinct.
- prepare-for-break.md is a separate branch-then-compact workflow depending on Native Branch and the cold warning. It is not selected for this batch. No cold-warning UI, keep-warm pings, compacted-copy workflow or pricing update is implicitly authorized by this plan.

### Post-parking baseline and handoff prerequisites

Parking is complete per the record and current Git audit: both personal remote
tips match their archive records; disposable parking/verification worktrees and
local archive branches are gone. Existing Hari/remote-chat worktrees and three
stashes remain protected. Main HEAD is still 9397898 with retained uncommitted
fixes. Before implementation, review and checkpoint those retained changes,
document the unresolved full-web-test failure/lint limitation, and use the
resulting commit as the new baseline. No baseline commit is authorized by this
planning/review task. Detailed specs and implementer handoffs still need work.

**Checkpoint recorded 2026-09-30:** Nakul approved committing the retained
changes as `a65bd4e4b0c2742cd0fc54a4087358471efc3888` on `nakul/windows-support`
(local only, not pushed). This is `<CHECKPOINT_SHA>` for all six slices and
slice 1's `<BASELINE_SHA>`. Before committing, I ran typecheck and the three
changed test files (78 tests); both passed. The full web suite was not rerun, so its
known failure stays unresolved. There is no lint configuration.

Selected scope:

1. Session approvals for Claude/Codex. Add explicit session-scoped choices where supported. Investigate the repeated SocratiCode prompt's actual request before choosing its response mechanism. Persistent Always allow is distinct from Allow for this session and must follow supported provider/server semantics; no blanket automatic approval.
2. Claude live model/permission changes, then capability-verified effort/thinking/fast settings. Match responses to requests, preserve pending turns and approvals, and retain a safe restart/resume fallback when unsupported. Changing model need not replace an already-generated response.
3. Replace the internals of existing Branch from here with native Claude/Codex/OpenCode forks. Preserve the current flow for unsupported providers. Existing draft's proposed changes to summary fallback do not override this newer user instruction. New conversation identity, exact clicked-turn boundary, preserved account/cwd/model, no source mutation, no duplicate sends. Explicit safe fallback when exact native branching is unavailable.
4. Accurate context breakdown in the existing context inspector/menu for both Claude and Codex. Fetch native information when available, distinguish current context from cumulative processed tokens, and label unavailable/estimated categories and freshness. Do not promise exact per-category counts if the provider does not expose them. Quota/cost remain separate from context. Unrelated status/voice/review event coverage is outside this item.
5. AI helper settings: one primary provider/account/model and optional fallback provider/account/model for chat titles, commit messages and PR descriptions. User prefers model selection over a simple enable/disable toggle. Selection independent of chat provider; e.g. Claude chat may use an Antigravity helper if that adapter supports safe isolated text generation. Native schemas where supported, otherwise request JSON and validate it locally. Bounded repair/fallback, cancellation/timeout, no editing tools, no mutation of the chat session. No automatic commit, PR creation or push. No automatic replacement of user-edited titles/text. Only send necessary task context to the explicitly chosen provider. If no AI result, use first-message excerpt for title; commit/PR fields stay editable and show the failure.
6. Codex MCP forms: support validated text, choices and multiple fields, with unsupported-form explanation. This alone does not fix repeated approval; that is item 1's investigation. No automatic acceptance of arbitrary consent or secret forms.

## Implementation plan

### Mandatory blocker: Windows storage full

Before installs/builds/large test runs, check free space on all required drives,
including TEMP/TMP, caches and Cargo/build outputs. If storage is full, a write
fails with ENOSPC/disk-full/insufficient space, or verified space cannot support
the operation, stop task work immediately. No retries, continued editing,
temp/cache/output relocation or automatic deletion. Safely cancel task-owned
operations and preserve existing work. Report affected drive/path, measured
space/error, last completed step and remaining work. Mark this spec and index
Blocked only if safe to write; otherwise report Blocked without more writes.
Resume after space is restored/rechecked and partial outputs are assessed.
Any cleanup needs explicit authorization. Carry this rule into every child
spec and handoff prompt.

Independent slices, in order:

1. Approval scopes and SocratiCode repetition regression.
2. Claude live controls.
3. Native Branch across three providers; update existing native-branch.md rather than duplicate its detailed contract.
4. Context accuracy for Claude/Codex.
5. Shared helper routing, model/fallback settings and output validation.
6. Codex form rendering and validation.

Likely files/areas (confirm before editing): harness core registry/types; Claude/Codex provider and protocol files; OpenCodeClient/provider; session block metadata/store sanitizer and fork planner; App onBranch; approval and question UI; ContextMeter/context usage/systemBreakdown; settings model/view; source-control gitText and provider title/text helpers. Add meaningful tests beside affected protocols/helpers. Avoid database migrations unless required and separately approved.

## Acceptance criteria and states

- Session grant stops repeated matching approvals within its supported scope; another session remains independent; denial/cancel remain distinct. Unsupported scopes stay visibly unsupported.
- Claude settings changes preserve native conversation identity where supported and cannot resolve the wrong pending request or send a user turn twice.
- Native forks contain no history after the selected boundary. Three providers route natively; unsupported providers retain existing copied-history flow. Failures leave source intact.
- Context display never treats cumulative usage as current context or fabricated breakdowns as exact; refresh, stale, unknown, loading and error are clear.
- Changing helper selection affects all three helper tasks independently of chat provider. Primary failure triggers at most one configured fallback attempt after bounded schema repair; auth/permission denial/cancel must not silently route elsewhere. Invalid output is not applied. Antigravity eligibility requires verified isolation/capability, not just catalog presence.
- Forms validate required fields and constraints; decline/cancel return the proper native response, and unrenderable forms explain the problem.
- UI states: loading, unavailable, error, success, pending/in-flight, disabled, cancelled, stale, unsupported, fallback used.

## Todos

- [ ] Finish parking and record resulting baseline.
- [ ] Trace SocratiCode approval wire shape safely; no secrets/raw personal payloads logged.
- [ ] Revalidate provider versions/capabilities for each slice.
- [ ] Write detailed module specs/tests before source changes.
- [ ] Implement each slice in its scoped worktree.
- [ ] Run required typecheck/tests/Rust checks/build; record pre-existing failures.
- [ ] Manual desktop verification by user or separate desktop-access Codex session.

## Issues in Dev (+ fixes)

Not started. This is a multi-module plan; no source changes while parking overlaps the checkout. Detailed implementation remains a separate phase.

## Issues in Installed (+ fixes)

Not tested. No build/release requested in this planning task.

## Learnings

Remembered approvals and MCP forms must not be conflated. Native capability varies by provider/version. Schema validation is required even where native constrained output is unavailable.

## Done

Scope recorded only. Implementation and runtime verification remain.

## Handoff for detailed specification (not implementation)

Read this umbrella plan, the local project profile, repo AGENTS.md, required
project docs and docs/specs/archive/native-branch.md. Use spec-writing to prepare
implementation-ready specs for the six selected slices. Verify current source
and installed provider capabilities, resolve ordering/persistence/failure
contracts, and include mapped tests and a separate manual desktop checklist.
Update the existing native-branch spec for slice 3, preserving the unsupported
provider flow required here. Include the storage-full hard blocker in every
spec and handoff. Do not implement, create branches, commit, push or build.
Do not mark a child spec Todo until its detailed contract is approved. Follow
the repo's Draft/Review/Blocked/Todo/Progress/Done status and index conventions
over conflicting generic skill templates. Report unresolved facts explicitly.
