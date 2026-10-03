# Provider batch — prompts (2026-09-30)

> Frozen on 2026-10-01. This file is history only; no new prompts are added here.
> A handoff is now a spec in `docs/specs/` plus the short handover prompt given in chat.
> The fix prompt that was here is replaced by [provider-batch-followup-fixes.md](../specs/archive/provider-batch-followup-fixes.md).

All work happens in the main checkout on `nakul/windows-support`. No worktrees.
Slice 1 (session approvals) is committed as `bf41013`, on top of checkpoint `a65bd4e`.

Flow: the worker builds features 2–6, then another agent reviews them, then Claude checks the review and the fixes.
After that, Nakul does manual checks (in dev mode, or directly on the installed build), then the version gets built and installed.
Then the team moves on to syncing features from upstream MonoCode.

## Review prompt (reusable — run after any feature lands)

```text
Review the provider-batch commits on nakul/windows-support in E:\Developing\OpenSource\mono-clone.
This is a review only: don't edit source, don't commit, don't run the app.

Scope: every commit in  git log --oneline a65bd4e..nakul/windows-support
Each commit message names its feature. Its spec is in E:\Developing\OpenSource\mono-clone\docs\specs\:
  feat(approvals) -> session-approval-scopes.md      feat(claude)  -> claude-live-controls.md
  feat(context)   -> context-accuracy.md              feat(branch)  -> native-branch.md
  feat(helpers)   -> ai-helper-model-settings.md      feat(codex)   -> codex-mcp-forms.md
The docs folder is git-ignored; read it by absolute path. Also read E:\Developing\OpenSource\mono-clone\AGENTS.md.

For each commit (git show <sha>), check it against its spec:
  - every acceptance criterion: implemented and covered by a test that would fail without the change;
  - the spec's Invariants and Ordering contracts, especially: fail-closed approval handling, no writes to provider
    settings files, no automatic resend of a message that may have been accepted, helpers can't use tools or
    touch the active chat, nothing transient persisted to saved sessions;
  - real bugs: races, stale async results, missing cleanup, wrong error handling, type holes (any, unchecked casts);
  - interactions with the earlier features in the range (shared files: claude.ts, claudeProtocol.ts, codex.ts,
    registry.ts, App.tsx, sessionStore.ts).
You may run  npx tsc --noEmit  and  npx vitest run <files>  to confirm a suspicion.

Write findings to E:\Developing\OpenSource\mono-clone\docs\notes\provider-batch-review.md
(append a new dated section if the file exists). For each finding give: commit sha, file:line, severity
(bug / spec gap / test gap / nit), what goes wrong with a concrete scenario, and a suggested fix.
Separate confirmed findings from suspicions. Skip style preferences. End with a per-commit verdict: ok / needs fixes.
```

## Single-feature prompt: Context Accuracy (Sol 6.1 Low trial)

```text
Implement ONE feature, Context Accuracy, in E:\Developing\OpenSource\mono-clone on branch nakul/windows-support.
Stop after its commit. Do not start any other feature.

Read (git-ignored, use absolute paths): E:\Developing\OpenSource\mono-clone\AGENTS.md,
E:\Developing\OpenSource\mono-clone\.agents\PROFILE.local.md, and the spec
E:\Developing\OpenSource\mono-clone\docs\specs\context-accuracy.md. Read other docs only if the spec points you there.

Start: confirm git branch --show-current is nakul/windows-support and git status --short is empty.
Don't create worktrees or branches. Don't touch mono-clone-hari, mono-clone-remote or the stashes.

This prompt replaces the spec's "Baseline, dependencies and worktree" section, its "Handoff prompt" section and the
baseline/SHA/SPECS-Done parts of step 0. Its dependency is already committed: requestClaudeControl,
ClaudeControlError and Live.generation are in src/integrations/harness/providers/claude/claude.ts (commit 9dfeaa0).
Use them; don't reimplement the control transport.

Steps:
1. Set the spec to Progress (its heading, and move its row to Progress in docs\specs\SPECS.md). Load the skills it lists.
2. Implement the spec exactly.
3. Run npx tsc --noEmit and the spec's Verification tests (the focused files, not the full suite). All must pass.
4. Run npm test once. If the only failure is in a test file you didn't touch, and it passes when run alone, it's a
   known flaky test: note its name and continue. Any other failure: fix it.
5. Commit only this feature's files (git add <paths>, never -A) as:
   feat(context): accurate context breakdown for Claude and Codex
   You are authorized to commit on this branch. Don't push, bump the version or build.
6. Set the spec to Review (heading and SPECS.md row), and add one entry to the current changelog file listed in
   docs\changelog\CHANGELOG.md, with the commit's short sha.
If you can't finish: save the diff to docs\notes\context-accuracy-partial.patch, git restore the source files,
set the spec to Blocked with the reason, and stop.

Don't run the app or drive the desktop window. Storage: check free space on C: and E: before npm test; if it's low,
stop and report.

Report briefly: done or blocked, commit sha, tests run with results, any deviation from the spec, and the spec's
Manual checks section copied unchanged.
```

## Single-feature prompt: Native Branch (Luna 6 Max)

```text
Implement ONE feature, Native Branch, in E:\Developing\OpenSource\mono-clone on branch nakul/windows-support.
Stop after its commit. Do not start any other feature.

Read (git-ignored, use absolute paths): E:\Developing\OpenSource\mono-clone\AGENTS.md,
E:\Developing\OpenSource\mono-clone\.agents\PROFILE.local.md, and the spec
E:\Developing\OpenSource\mono-clone\docs\specs\native-branch.md. Read other docs only if the spec points you there.

Start: confirm git branch --show-current is nakul/windows-support, git status --short is empty, and HEAD is 11981c0.
Work in this main checkout. Don't create worktrees or branches, and don't run npm install.
Don't touch mono-clone-hari, mono-clone-remote, mono-clone-native-sol (another agent's trial) or the stashes.

This prompt replaces these parts of the spec: "Baseline, dependencies and worktree" (except its Dependencies bullet,
which still applies), the "Handoff prompt" section, the baseline/worktree/npm install part of Implementation plan
step 0, and the word "commit" in Out of scope (you are authorized to commit this feature, see step 5).
Its dependencies are all committed on this branch: session approvals bf41013 (buildClaudeSpawnArgs with allowedTools),
Claude live controls 9dfeaa0 (Live.liveKey, pendingControls, generation), Context Accuracy 11981c0 (context.stale and
the freshness fields). AI helpers 84fbe89 and Codex MCP forms 3a47202 are also committed; keep their tests passing.

Steps:
1. Set the spec to Progress (its heading, and move its row to Progress in docs\specs\SPECS.md). Load the skills it lists.
2. Implement the spec exactly. No Rust changes.
3. Run npx tsc --noEmit and the spec's Verification tests (the changed and new test files, not the full suite).
   All must pass. Also run git diff --check, and git diff --stat -- src-tauri must be empty.
4. Run npm test once. If the only failure is in a test file you didn't touch, and it passes when run alone, it's a
   known flaky test: note its name and continue. Any other failure: fix it.
5. Commit only this feature's files (git add <paths>, never -A) as:
   feat(branch): native fork for Claude, Codex and OpenCode
   You are authorized to commit on this branch. Don't push, bump the version or build.
6. Set the spec to Review (heading and SPECS.md row), and add one entry to the current changelog file listed in
   docs\changelog\CHANGELOG.md, with the commit's short sha.
If you can't finish: save the diff to docs\notes\native-branch-partial.patch, git restore the source files,
set the spec to Blocked with the reason, and stop.

Budget: usage is limited. Read only what the spec needs, use targeted searches, and keep updates short.
Don't run the app or drive the desktop window. Storage: check free space on C: and E: before npm test; if it's low,
stop and report.

Report briefly: done or blocked, commit sha, tests run with results, any deviation from the spec, and the spec's
Manual checks section copied unchanged.
```

## Single-feature prompt: Native Branch (Sol 6.1 Low, side-by-side trial)

Claude created the worktree `E:\Developing\OpenSource\mono-clone-native-sol` on branch `trial/native-branch-sol` from `11981c0`
and ran `npm ci` there. Luna works in the main checkout at the same time. Afterwards Claude reviews both, one is kept, and
the trial worktree and branch are removed.

```text
Implement ONE feature, Native Branch, in the worktree E:\Developing\OpenSource\mono-clone-native-sol
on branch trial/native-branch-sol. Stop after its commit. Do not start any other feature.

This is a side-by-side trial: another agent is implementing the same spec in E:\Developing\OpenSource\mono-clone
at the same time. Don't read, edit, run commands in, or commit to that main checkout, except for reading the docs listed
below. Don't touch mono-clone-hari, mono-clone-remote or the stashes. Don't create other worktrees or branches.

Read only (git-ignored, they exist only in the main checkout; don't copy them and never git add -f them):
E:\Developing\OpenSource\mono-clone\AGENTS.md, E:\Developing\OpenSource\mono-clone\.agents\PROFILE.local.md, and the spec
E:\Developing\OpenSource\mono-clone\docs\specs\native-branch.md. Read other docs only if the spec points you there.
Don't edit any docs file: no spec status, SPECS.md or changelog changes. The other agent owns those. Report instead.

Start: in the worktree, confirm git branch --show-current is trial/native-branch-sol, git status --short is empty,
and HEAD is 11981c0. Dependencies are already installed there; don't run npm install.

This prompt replaces these parts of the spec: "Baseline, dependencies and worktree" (except its Dependencies bullet,
which still applies), the "Handoff prompt" section, the baseline/worktree/npm install part of Implementation plan
step 0, and the word "commit" in Out of scope (you are authorized to commit this feature, see step 4).
Its dependencies are all committed on this branch: session approvals bf41013 (buildClaudeSpawnArgs with allowedTools),
Claude live controls 9dfeaa0 (Live.liveKey, pendingControls, generation), Context Accuracy 11981c0 (context.stale and
the freshness fields). AI helpers 84fbe89 and Codex MCP forms 3a47202 are also committed; keep their tests passing.

Steps (all commands inside E:\Developing\OpenSource\mono-clone-native-sol):
1. Load the skills the spec lists. Implement the spec exactly. No Rust changes.
2. Run npx tsc --noEmit and the spec's Verification tests (the changed and new test files, not the full suite).
   All must pass. Also run git diff --check, and git diff --stat -- src-tauri must be empty.
3. Run npm test once. If the only failure is in a test file you didn't touch, and it passes when run alone, it's a
   known flaky test: note its name and continue. Any other failure: fix it.
4. Commit only this feature's files (git add <paths>, never -A) on trial/native-branch-sol as:
   feat(branch): native fork for Claude, Codex and OpenCode
   You are authorized to commit on this branch only. Don't push, merge, bump the version or build.
If you can't finish: leave the changes uncommitted in the worktree and report what's missing.

Budget: usage is limited. Read only what the spec needs, use targeted searches, and keep updates short.
Don't run the app or drive the desktop window. Storage: check free space on C: and E: before npm test; if it's low,
stop and report.

Report briefly: done or blocked, commit sha, tests run with results, any deviation from the spec, and the spec's
Manual checks section copied unchanged.
```

## Worker prompt — features 2 to 6 on the main branch

```text
Build the remaining five provider features, one after another, on nakul/windows-support.

Read first (git-ignored, read by absolute path):
E:\Developing\OpenSource\mono-clone\.agents\PROFILE.local.md, E:\Developing\OpenSource\mono-clone\AGENTS.md,
E:\Developing\OpenSource\mono-clone\docs\WORKING-AGREEMENT.md, E:\Developing\OpenSource\mono-clone\docs\specs\SPECS.md,
E:\Developing\OpenSource\mono-clone\docs\changelog\CHANGELOG.md (then its Current file).

Where to work: the main checkout E:\Developing\OpenSource\mono-clone, branch nakul/windows-support.
Feature 1 (session approvals) is already committed there (bf41013). Don't create worktrees or branches.
Don't touch mono-clone-hari, mono-clone-remote, mono-clone-session-approval-scopes or the stashes.
Confirm first: git branch --show-current is nakul/windows-support and git status --short shows no changes to tracked files.

This prompt replaces every spec's "Baseline, dependencies and worktree" and "Handoff prompt" sections, and the
baseline/worktree part of each spec's step 0. Skip those SHA and SPECS-Done checks. Keep each spec's other step 0 checks
(for example the git grep for symbols from an earlier feature).

Storage: before the full test run, check free space on C: (TEMP, npm cache) and E:. If a write fails for lack of space,
stop, don't delete anything, and report.

Budget: usage is limited, so work economically. Read only the current feature's spec, not all five at once.
Use targeted reads and searches instead of broad exploration. Run the spec's own tests per feature and the full suite
only once at the end. Keep status updates and the final report short. If you run out of usage mid-feature, stop cleanly:
the next session continues from the first spec that isn't Review.

Implement these specs in this order, each fully before the next (all in E:\Developing\OpenSource\mono-clone\docs\specs\):
  1. claude-live-controls.md       -> feat(claude): switch model and permission mode live
  2. context-accuracy.md           -> feat(context): accurate context breakdown for Claude and Codex
  3. native-branch.md              -> feat(branch): native fork for Claude, Codex and OpenCode
  4. ai-helper-model-settings.md   -> feat(helpers): choose the AI helper model
  5. codex-mcp-forms.md            -> feat(codex): MCP forms
  AI helper spec, open decisions: take its defaults (Antigravity helpers stay switched off until verified;
  Codex helpers are allowed). Its "Remaining blockers" section doesn't stop you.

For each feature:
  a. Set its status to Progress (heading and SPECS.md row). Load the skills the spec lists.
  b. Implement the spec exactly.
  c. Run npx tsc --noEmit and the spec's Verification tests. All pass.
  d. Commit on nakul/windows-support with the message above, staging only that feature's files (git add <paths>,
     never git add -A). You are authorized to commit on this branch. Don't push.
  e. Set the spec to Review and add one changelog entry (Commit: the short sha).
Flaky tests: if the full suite fails only in a test file your feature didn't touch, and that file passes when run alone,
treat it as a known flaky test. Note its name in the report and continue; it doesn't block the feature.
Where a spec's Verification asks for the full suite per feature, run it once at the end instead.
If a feature can't be finished: set it Blocked with the reason, save its uncommitted diff to
E:\Developing\OpenSource\mono-clone\docs\notes\<spec-name>-partial.patch, run git restore on its files, and continue.
Skip only the features that depend on it (context-accuracy needs claude-live-controls).

After all five: run npm test (full suite) and npx tsc --noEmit. Run npm run check:rust only if a Rust file changed.
Don't bump the version or build an installer; that comes after review.
Don't run the app, desktop smoke tests or drive the Tauri window.

Report, briefly:
  - one line per feature: done / blocked, commit sha, tests run and results, anything you deviated from;
  - full-suite and typecheck results;
  - one combined manual checklist: every spec's Manual checks section, grouped by feature, copied unchanged.
    Those are Nakul's checks, not yours.
```
