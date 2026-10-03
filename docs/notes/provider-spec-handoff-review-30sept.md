# Provider spec handoff review — 30 September

- Review time: 2026-09-30 13:08 IST.
- Main HEAD remains 9397898; retained checkpoint is still staged, not committed.
- Verdict: all six remain Draft. Do not send their implementation prompts yet.
- This review changes docs only; it does not approve implementation or commits.

## Corrections required before approval

1. AI helper scope: Antigravity was explicitly requested as an example of cross-provider helper routing. The spec excludes it and asks whether to include it later. Investigate and specify a safe isolated Antigravity text path now, or report it as a concrete blocker requiring a scope decision. Do not silently defer it.
2. AI helper isolation: Decisions claims Claude isolation is confirmed, but Assumptions says write-tool refusal is unverified. Absence of a permission prompt tool is not a deny-all contract. Define explicit tool restrictions and test refusal before offering that helper path. No helper may mutate the project/chat.
3. AI helper PR failure: the plan says failure is visible and fields remain editable; the child spec silently substitutes content and continues the existing PR path. Reconcile explicitly. Recommended custom-mode behavior is a visible failure and no gitPrCreate on helper failure; preserve any already-completed push and provide retry/manual continuation, rather than treating partial success as a reason to publish fallback text.
4. Context data provenance: the draft says Claude summary responses include local estimates. Native/provider-reported is not synonymous with exact. Label provider-reported data accurately, preserve estimate semantics, and do not claim exact per-category token counts without evidence.
5. Shared control owner: context-accuracy names sendControl/pendingControls from claude-live-controls but allows independently implementing it. Choose slice 2 as sole owner, make slice 4 depend on its reviewed implementation, and use that merged baseline. Context-only refresh must not mutate settings and must invalidate replies on process/turn replacement.
6. Approval metadata: session-approval-scopes implementation step 1 says keep a guessed key if neither is found. Fail closed for unknown approval metadata, render ordinary one-time approval, and collect only sanitized method/key/type diagnostics. Resolve versioned metadata using fixtures/source and an actual MonoCode request before claiming the SocratiCode repetition is fixed. Binary string presence alone does not prove the request shape.
7. Probe claims: no user message does not by itself establish zero account/network side effects. Make optional probing bounded, isolated, with cleanup, and describe its limits. Base live-model/mode implementation can keep optional effort/fast/thinking probes out of scope. Token-limit setters are not automatically equivalent to toggling thinking.
8. Branch fallback: preserve today's flow for unsupported providers. For native-provider first-send failure, make the selected hidden-summary fallback an explicit reviewed decision, never retry if a user message might already have been accepted. Existing acceptance/cancellation contracts must prove that boundary.
9. Worktree instruction: after a spec is approved and baseline committed, explicitly authorize creation of its scoped worktree in the handoff; do not require user-precreation without a reason. Ignored docs/profile must be accessible to the worker, with exclusions preserved. No shared checkout or Cargo target writes.
10. Forms: broad secret keyword matching in descriptions can block harmless token-budget/pin fields. Use a precise documented policy and positive/negative tests. Slice 6 must preserve slice 1's MCP grant metadata instead of routing grant confirmations into generic forms.

## SocratiCode usage

This repo is currently indexed green; reviewer used codebase_status and
codebase_search. The author's progress says index healthy, but its final footer
says not used/not needed. The provided text does not establish which tools were
actually called or why search was omitted. Request tool-call names and a short
usage inventory from that session; do not infer a service outage or duplicate
configuration. If only status was checked, that is not semantic exploration.
Known-path rg/read investigation is still useful, but shared dependency discovery
should follow repo SocratiCode guidance before finalizing these handoffs.

## Execution order

Safest default after corrections/approval/checkpoint: slice 1 approvals → slice 2
live controls/shared control transport → slice 4 context → slice 3 native branch
→ slice 5 helpers → slice 6 forms. Integrate and verify one slice before cutting
the next worktree from the updated baseline. Specs/research can be revised in
parallel with one owner for shared docs/index.

Optional two-worker implementation needs explicit shared-file ownership and
merge planning first. Context/helpers are a possible pair after slices 1/2,
but both change registry/provider adapters; they are not conflict-free. Never
run all six against the main checkout. Observe per-drive storage checks and
stop-on-full; cap concurrent heavy builds.

## Checks

Git status/HEAD inspected; current specs and targeted source inspected;
SocratiCode healthy and search used. No executable code edited, no tests/builds
run, and staged baseline left untouched. Existing commit-agent reply remains
applicable; send these corrections to the spec author, not the commit worker.
