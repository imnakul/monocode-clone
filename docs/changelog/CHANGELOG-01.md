# Changelog 01

Newest first. One entry per task. Local-only history for `nakul/windows-support`.
Read [the changelog index](CHANGELOG.md) to find the current file.

## 2026-10-02 21:24 IST — Verify the 0.6.0 integration branch and fork copies
- Type: docs
- What: Confirmed exact local branch name `nakul/windows-support-upstream-0.6.0`. Its local head and the live fork head both equal `a07c7af03e6c901147122f1185cf6486fc192412`; no local-only commits. Local `nakul/windows-support` contains the entire branch plus one AGENTS.md-only commit (`18ab934`). Its committed runtime source matches that branch; the five uncommitted version files from the 0.6.0 build remain in the active checkout.
- Why: Nakul asked whether the 0.6.0 branch was fully pushed and whether Windows support was at the same level.
- Verified: live `git ls-remote personal` for both branches; local refs, commit counts and tree diff. The fork's `nakul/windows-support` remains at `c2c8bf6`, 156 commits behind local Windows support. No switch, merge, commit, push or source edit. Tests/build not rerun for this Git-only audit.
- Commit: uncommitted local-only changelog entry.

## 2026-10-02 21:21 IST — Build Windows 0.6.0 with the current branch changes
- Type: chore
- What: Changed the version from 0.6.0-local1-upstream-sync to exactly 0.6.0, generated an unsigned Windows NSIS installer, and preserved it in the usual installer archive. npm and Cargo updated their own lockfile metadata; dependencies and runtime source are unchanged.
- Why: Nakul requested a new build at the exact version already incorporated into this branch. Fresh upstream main is 0.7.0, with 17 commits absent here; after clarification Nakul selected 0.6.0. This explicitly overrides the usual local suffix and authorizes the installer build before separate desktop checks.
- Files: [package.json (line 4)](../../package.json:4), [package-lock.json (line 3)](../../package-lock.json:3), [Cargo.toml (line 7)](../../Cargo.toml:7), [Cargo.lock (line 2345)](../../Cargo.lock:2345), [tauri.conf.json (line 4)](../../src-tauri/tauri.conf.json:4); [build spec](../specs/windows-060-build-plan.md), [results and logs](../notes/windows-060-build/README.md), Windows changes log, local feature row L-39 and planning status.
- Installer: E:\Developing\Installable versions\MonoCode_0.6.0_x64-setup.exe; 11,446,927 bytes; SHA-256 D882E9B35CABD9C2D19EB3509311EE677770B51B1DB0DF4FC36B50179DFF50E2. Archive copy verified; FileVersion and ProductVersion both 0.6.0; NotSigned.
- Commit: uncommitted version files on `nakul/windows-support`, HEAD `18ab934`; no push or merge. Tauri's content-identical Cargo manifest rewrite was restored after normalized-hash verification.
- Verified: typecheck ✅ Rust format/check/Clippy ✅ host build ✅ host tests ✅ after sandbox permission rerun (aggregate 93 passed / 7 skipped) production/Windows build ✅ diff ✅ lint unavailable (existing missing config). Web tests ❌ 5,080 passed / 2 existing Mac-default assertions failed. Rust tests ❌ 574 passed / 1 existing MCP fixture-ancestor failure / 5 ignored. No tests modified or skipped for this task; desktop verification pending.

## 2026-10-02 15:46 IST — Investigate installed MonoCode exits after power loss
- Type: docs
- What: Recorded read-only crash diagnostics for installed `0.1.55-local5-provider-fixes`. Its current process stayed responsive for more than five minutes; no recovery or app change was made. Database integrity, transcript JSON and migration checks passed. No contemporary MonoCode/WebView crash event or dump was found; informational WebView events were verified through their XML.
- Why: Nakul reported automatic exits even while idle after a power cut, shortly after switching the source checkout branch.
- Files: [diagnostic record](../notes/monocode-post-power-loss-2026-10-02.md)
- Commit: uncommitted (local-only docs)
- Verified: SQLite read-only checks, installed version, executable comparison and Windows log/process checks. Typecheck / lint / tests / build not run: no runtime code changed.
- Status: root cause unresolved; current launch stable during observation. Manual idle/reopen checks and exit-code capture on recurrence are recorded. Existing Cargo.toml modification and app data left untouched.

## 2026-10-01 21:42 IST — Add the local features register and make the research prompts a read-and-follow file
- Type: docs
- What: Wrote one register of everything this fork has that upstream MonoCode does not: 40 rows, each with the feature in plain words, the file and function where it lives, and the test that fails if it is removed (or "no locking test exists"). The top of the file carries today's date and the rules for agents who update it: append new rows, never renumber or delete, change the date. `AGENTS.md` got one appended section pointing to it; nothing already written there was changed. The two long prompts are no longer pasted: the note is now one file with "Part A — Codex" and "Part B — Claude", and Nakul only types "you are Codex / you are Claude, read this file, follow the instructions for you only" plus the requirement. Recorded Nakul's answer to question 8 (one merge, including the nine later commits) and five short confirmations needed before the spec.
- Why: Nakul asked for a fixed list of local features so agents stop exploring the whole codebase for it, and found the prompts too long to copy by hand.
- Files: [local features register](../LOCAL-FEATURES.md), [AGENTS.md (lines 18–20)](../../AGENTS.md:18), [research flow instructions](../notes/analyst-and-claude-prompts.md), [notes index](../notes/README.md), [owner decisions](../notes/upstream-intake-2026-10-01/09-owner-decisions.md)
- Commit: uncommitted (`AGENTS.md` is tracked and waits for Nakul's OK to commit; docs are local only)
- Verified: no source change, so no typecheck or tests. Every row's location and test name was searched with `git grep` at `c2c8bf6`. Rows that the earlier analyst list had anchored on an import line or an unrelated test were corrected (for example L-02, L-12, L-18, L-26), and twelve features were added (L-29 to L-40). One row (L-37) has its test marked "not checked".
- Note: the "ignored files in `@` mentions" feature recorded on 8 Sept is not on the branch; the register says so instead of listing it. Free space now: C: 8.7 GB, E: 20.2 GB.

## 2026-10-01 21:20 IST — Save the two standing prompts for the research flow
- Type: docs
- What: Wrote one note with two prompts. Prompt A is for the analyst (Codex): Nakul pastes his raw requirement and this prompt, and it returns one short research file. Prompt B is for Claude: it says which parts of that research to trust, which to spot-check and which to review, and that Claude then explains the work and writes the worker's spec. The note also holds a track record so the trust levels can change if a later run goes badly. Added an eighth open question to the intake decisions: one merge to the pinned upstream main, or seven rounds.
- Why: Nakul wants Claude's token use reduced by moving research to the second agent, with prompts he can reuse for any feature, fix or upstream update without Claude writing a new spec each time.
- Files: [prompts note](../notes/analyst-and-claude-prompts.md), [notes index](../notes/README.md), [owner decisions](../notes/upstream-intake-2026-10-01/09-owner-decisions.md)
- Commit: uncommitted (docs are local only)
- Verified: no source change. The nine later upstream commits were listed read-only with `git log 48fe62a..43aac9d`; neither `43aac9d` nor v0.6.0 is an ancestor of our branch. Free space now: C: 8.9 GB, E: 20.2 GB.

## 2026-10-01 20:25 IST — Record the upstream-intake scope and the open owner questions
- Type: docs
- What: Nakul chose the scope: take every upstream release through v0.6.0 and also the nine later commits. That gives seven merge rounds. A new file records this answer, the round list, the seven questions still open for Nakul (each with a suggestion), and the engineering points Claude decided as reviewer.
- Why: The analyst's brief mixed product questions with procedure. Nakul needs one short place to answer from.
- Files: [owner decisions](../notes/upstream-intake-2026-10-01/09-owner-decisions.md)
- Commit: uncommitted (docs are local only)
- Verified: no source change. Upstream facts used in the questions were read from the pinned commit `43aac9d`.

## 2026-10-01 20:15 IST — Review and rate the second agent's upstream-intake analysis
- Type: docs
- What: Checked the second agent's nine-stage analysis against Git and source, and rated it on the eleven aspects from the trial spec: 45 of 55. Its facts are exact (all 527 files classified correctly, every count right). Its judgement work is usable but generic: the decision brief and the round-1 spec need Claude's edit before Nakul answers or a worker starts. The trial spec now holds the scores, the mistakes with the spec gap behind each, and the list of what can be delegated to that agent.
- Why: Nakul asked how the agent did per aspect, to decide which of Claude's analysis work it can take over.
- Files: [trial spec — Handoff retro](../specs/archive/upstream-intake-analyst-trial.md), [specs index](../specs/SPECS.md)
- Commit: uncommitted (docs are local only)
- Verified: no source change, no code checks needed. Git recomputation done read-only; hunk counts recounted inside the retained scratch clone. Main checkout unchanged (HEAD `c2c8bf6`, cached upstream `43aac9d`, clean status).
- Note: C: has about 7 GB free (not the 21 GB written in the trial spec). Upstream moved one commit past the pin (`1e97594`). The scratch clone is still on E: and is removed only with Nakul's OK.

## 2026-10-01 19:58 IST — Analyse pinned upstream intake and draft round 1
- Type: docs
- What: Saved the nine ordered analyst stages: preservation list, complete upstream ledger, exact file/conflict manifest, hidden risks, owner decision brief, release-round strategy, a Draft round-1 worker spec and self-review. Coverage gaps and open decisions are explicitly labelled; the Draft is not executable until reviewer/tooling prerequisites are closed.
- Why: Give Nakul a reviewable intake picture without changing the app, and let Claude rate each analyst stage.
- Files: [final report](../notes/upstream-intake-2026-10-01/08-final-report.md), [run log](../notes/upstream-intake-2026-10-01/run-log.md), [round-1 Draft](../specs/archive/upstream-intake-round-1.md), [specs index](../specs/SPECS.md)
- Commit: uncommitted (docs are local only)
- Verified: read-only Git/source checks and scratch-only merge-tree simulations;128-commit ledger,527-path manifest and80 conflicts reconcile. Final tracked checkout/HEAD/cache/branch/stash/worktree names unchanged. No code checks were run because no code changed. Public tagger identity output breach and incomplete source audits are disclosed in the report. Scratch retained; nothing deleted.

## 2026-10-01 18:40 IST — Write the staged upstream-intake trial spec for a second agent
- Type: docs
- What: Wrote a Draft spec that hands the whole upstream-intake analysis to a second agent in nine separate stages: orientation, the list of local features that must survive, the upstream feature list per release, a classification of every changed file (new, upstream-only edit, both changed but clean, real conflict), conflict and hidden-risk analysis, a plain-language decision brief for Nakul, the strategy and round plan, a draft worker spec for round 1, and a self-review. Each stage writes its own file and has its own "judged on" list, so the agent can be rated per kind of work. The agent changes no code and runs no merge; simulations happen in a scratch clone outside the checkout.
- Why: Nakul wants to see which parts of Claude's analysis, planning and spec-writing work another agent can take over. Upstream is 128 commits ahead (v0.1.56 to v0.6.0 plus 9 later commits).
- Files: [trial spec](../specs/archive/upstream-intake-analyst-trial.md), [specs index](../specs/SPECS.md)
- Commit: uncommitted (docs are local only)
- Verified: no source change. The scratch-clone recipe in the spec was run once in a temp folder and reproduced both pinned commits; the temp clone was removed and `git status` stayed clean. Claude's expected findings for the rating are kept outside the repo.

## 2026-10-01 18:20 IST — Close out the provider batch and push to the fork
- Type: chore
- What: Nakul reported the local5 build fine, so the six provider features and the follow-up fixes are closed. The branch was pushed to the fork (15 commits, fast-forward, no force). All seven specs are now Done, and the Windows changes log has the full record with learnings.
- Why: Finish this batch before bringing in upstream's new features.
- Files: [Windows changes log](../WINDOWS-CHANGES.md), [specs index](../specs/SPECS.md), the seven spec files (heading and status line), [manual checklist](../notes/local4-manual-checks.md)
- Commit: none new. Pushed `9397898..c2c8bf6` to `personal/nakul/windows-support`; remote SHA verified equal to local HEAD.
- Verified: no source change in this task. Push verified with `git ls-remote`. Upstream untouched.
- Note: "fine" is Nakul's word for the build as a whole; the individual manual checks weren't itemized. Codex MCP forms were never tried against a real form-sending server.
- Next: upstream sync (128 commits behind `origin/main` after a fetch on 1 Oct 2026 18:20 IST). Known conflict point: upstream `879ae4b` in `codex.ts`.

## 2026-10-01 18:05 IST — Build 0.1.55-local5-provider-fixes for manual testing
- Type: chore
- What: Built an unsigned Windows installer that contains the follow-up fixes and the narrow approval buttons, so they can be checked in the installed app. Before the build, one test line was added: branches copied for other reasons keep the original provider's icon. The manual checklist now starts with the four checks this build changes.
- Why: The fixes weren't in any installed build. "Allow for session" on Codex failed on local4 and has to be checked again before the upstream sync.
- Files: [branchPlan.test.ts (line 45)](../../src/features/sessions/model/branchPlan.test.ts:45), [manual checklist](../notes/local4-manual-checks.md), [follow-up spec — Handoff retro](../specs/archive/provider-batch-followup-fixes.md). The version was bumped by hand in package.json, package-lock.json, Cargo.toml, Cargo.lock and src-tauri/tauri.conf.json.
- Installer: E:\Developing\Installable versions\MonoCode_0.1.55-local5-provider-fixes_x64-setup.exe, 10,591,804 bytes, SHA-256 363B255A40640B03426E7518DF0B8018081F5C2EA3552FAB399801338F0ADB77.
- Commit: `d691035` (test line), `c2c8bf6` (version)
- Verified: typecheck ✅ branch planner tests ✅ (26; the new line fails when the icon is wrong) build:windows --no-sign ✅ (usual CSS highlight and chunk-size warnings). Full suite not rerun since the worker's run (342 files, 3,944 tests); only one test line changed after it. check:rust not run; no Rust changes since local3. Manual checks pending.

## 2026-10-01 16:02 IST — Review the follow-up fixes
- Type: docs
- What: Claude reviewed the four follow-up commits against the spec. Every acceptance criterion and invariant holds and nothing needs rework. Removing each fix by hand made its test fail in 8 of 9 tries, so the tests are real. The spec stays in Review until Nakul's manual checks on an installed build. Its row in the specs index was moved to the right section, and the handoff retro is filled in.
- Why: A worker's report is checked before a spec is trusted.
- Files: [follow-up spec — Handoff retro](../specs/archive/provider-batch-followup-fixes.md), [specs index](../specs/SPECS.md)
- Commit: none (docs are local only; no source change)
- Verified: typecheck ✅ focused tests ✅ (5 files, 217 tests) full suite — (the worker ran it: 342 files, 3,944 tests) build —
- Follow-up: two small test gaps noted in the retro (other branch reasons keep the source icon; the bound event is sent exactly once). A new build is needed before the manual checks.

## 2026-10-01 15:56 IST — Fix provider approval and branch follow-ups
- Type: fix
- What: Added Codex's session approval option when its request omits a tool name, prevented session grants from crossing Plan mode or stopped sessions, and kept Claude branches attached to Claude's reported fork id. The branched-from icon now matches the source provider. Stabilized the Composer attachment ownership test.
- Why: Resolve the reviewed provider-batch findings and make the intermittent Composer test deterministic.
- Files: [Codex approval handling](../../src/integrations/harness/providers/codex/codex.ts), [Claude fork handling](../../src/integrations/harness/providers/claude/claude.ts), [branch metadata](../../src/features/sessions/model/branchPlan.ts), [follow-up spec](../specs/archive/provider-batch-followup-fixes.md)
- Commit: `b905b8c`, `0a27328`, `4423fd8`, `35b1f2b`
- Verified: TypeScript and focused tests passed before each commit; `npm test` ✅ (342 files, 3,944 tests). Lint, build, installed-app, and desktop checks not run per spec.
- Follow-up: Nakul to perform the Manual checks in the spec; Claude's `--session-id` behavior with `--fork-session` remains unverified until then.

## 2026-10-01 14:31 IST — Write the follow-up fixes as a spec
- Type: docs
- What: The six small fixes for the provider batch are now one spec with status Todo, ready for a worker. It replaces the fix list in notes and the fix prompt. The prompts file is frozen: a handoff is now a spec plus a short handover prompt given in chat. The session approvals spec is back in Review and points to the new spec.
- Why: Nakul asked for a spec and a handover prompt instead of a maintained prompts file.
- Files: [provider-batch-followup-fixes.md](../specs/archive/provider-batch-followup-fixes.md), [SPECS.md](../specs/SPECS.md), [session approvals spec](../specs/archive/session-approval-scopes.md), [fix notes](../notes/provider-batch-fixes.md), [prompts (frozen)](../notes/provider-batch-prompt.md)
- Commit: uncommitted (docs only)
- Verified: every file and line reference in the spec was read at `b937b11`. No source change.

## 2026-10-01 14:18 IST — Narrow the approval buttons again and commit the local4 version
- Type: fix
- What: In a chat, the Allow and Deny buttons under a tool request are as wide as their text again. They no longer stretch across the card. The pop-up approval card is unchanged, because its buttons were full-width before too. The version number of the local4 build is now committed. The session approvals spec is back in Todo with a short rework list for the fix agent.
- Why: Nakul asked to undo the wider buttons before the fix agent starts.
- Files: [AgentTranscript.tsx (lines 3484–3510)](../../src/features/sessions/ui/AgentTranscript.tsx:3484), [session approvals spec](../specs/archive/session-approval-scopes.md), [SPECS.md](../specs/SPECS.md), [fix prompt](../notes/provider-batch-prompt.md)
- Commit: `3f5834b` (buttons), `b937b11` (version)
- Verified: typecheck ✅ lint — (no ESLint config) tests ✅ (sessions folder, 1152 passed) build — (not rebuilt)
- Note: the 13:22 entry below first carried the time 07:52. Git Bash on this PC prints UTC for `TZ=Asia/Kolkata date`. Use `Get-Date` in PowerShell instead.

## 2026-10-01 13:22 IST — Check whether upstream MCP work fixes "Allow for session"
- Type: docs
- What: Upstream MonoCode has no "Allow for session" for any tool approval. Its new MCP features cover server settings and the composer picker, so our fix 5 is still needed. The wider Allow and Deny buttons come from our own session approvals commit `bf41013`. Each button now stretches to share the row, which is sized for three buttons. With the third button missing, the two left stretch wider.
- Why: Nakul asked whether the upstream sync makes fix 5 unnecessary, and which change widened the buttons.
- Files: [fix list, section 5](../notes/provider-batch-fixes.md)
- Commit: uncommitted (docs only)
- Verified: git grep on origin/main; `git show bf41013` diff of AgentTranscript.tsx

## 2026-10-01 00:50 IST — Find why Codex shows no "Allow for session" for MCP tools

- Type: fix (diagnosis only, no source change yet)
- What: In the local4 build, a SocratiCode approval in a Codex chat showed only Allow and Deny. Claude recorded Codex's real approval request from one small Codex turn and declined the tool. Codex doesn't include the tool name where MonoCode looks for it, so MonoCode never offers the session option. The tool name is available from the running tool call, which Codex reports just before the approval request.
- Why: Manual check SA-1 failed.
- Files: [session approvals spec — Facts](../specs/archive/session-approval-scopes.md), [fix list, section 5](../notes/provider-batch-fixes.md), [fix prompt](../notes/provider-batch-prompt.md) (fix 5 added). The probe script is outside the repo, at `%TEMP%\codex-elicitation-probe.mjs`.
- Commit: uncommitted (docs only)
- Verified: root cause confirmed against the real payload. The fix hasn't been written yet.

## 2026-10-01 00:33 IST — Build 0.1.55-local4-provider-batch for manual testing

- Type: chore
- What: Built an unsigned Windows installer containing all six provider features (source f1a4712), so they can be tried in the installed app while the review fixes are made in the checkout. Added a short manual checklist.
- Why: Dev mode reloads the app whenever the fix agent saves a file, which would end live chats in the middle of testing.
- Files: [manual checklist](../notes/local4-manual-checks.md). The version was bumped by hand in package.json, package-lock.json, Cargo.toml, Cargo.lock and src-tauri/tauri.conf.json, because `set-version` accepts only plain versions.
- Installer: E:\Developing\Installable versions\MonoCode_0.1.55-local4-provider-batch_x64-setup.exe, 10,594,400 bytes, SHA-256 C6401E4953408C5542B6C8DEE56E7872885B817269641A8554E075171C54D5E5.
- Commit: uncommitted (version files only)
- Verified: build:windows --no-sign ✅ (usual CSS highlight and chunk-size warnings). check:rust not run; no Rust changes since local3. Manual checks pending.

## 2026-10-01 00:27 IST — Keep Sol's Native Branch commit

- Type: feature
- What: Branching a Claude, Codex or OpenCode chat now continues the provider's own copy of the conversation, rather than pasting a summary into the message box. Sol 6.1 Low built it in a trial worktree. Claude reviewed it (8.5/10) and it was fast-forwarded onto the main branch. The trial worktree and branch were removed. Luna was not run on this feature.
- Why: The side-by-side trial was dropped, because Sol's version already met every rule in the spec. Running Luna would have cost time and quota for little gain.
- Files: [native-branch spec](../specs/archive/native-branch.md), [SPECS index](../specs/SPECS.md), [fix list](../notes/provider-batch-fixes.md) (fixes 3–4 added), [prompts](../notes/provider-batch-prompt.md) (fix prompt added); source files listed in the commit.
- Commit: f1a4712
- Verified: Sol reported typecheck ✅ and full suite 3,927/3,927 ✅. Claude reran the branch and core tests (338/338 ✅). Build —. Manual checks remain.

## 2026-09-30 22:26 IST — Accurate context breakdown for Claude and Codex

- Type: feature
- What: Claude can report its own context categories from an existing idle process. Estimated views count tool output, show Unclassified history and stop assigning unexplained tokens to MCP servers or plugins. Readings show unknown, updating and out-of-date states; processed usage has separate headings.
- Why: Make context readings useful without misleading users about MCP costs or confusing processed tokens with current context.
- Files: [ContextMeter.tsx](../../src/features/sessions/ui/ContextMeter.tsx), [contextBreakdown.ts](../../src/features/sessions/model/contextBreakdown.ts), [tokenCosting.ts](../../src/features/sessions/model/tokenCosting.ts), [systemBreakdown.ts](../../src/features/sessions/model/systemBreakdown.ts), [contextUsage.ts](../../src/features/sessions/model/contextUsage.ts), Claude/Codex adapters and focused regression tests; complete file list in commit.
- Commit: 11981c0
- Verified: typecheck pass; focused tests 1,487/1,487 pass; npm test once 3,860/3,860 pass; final targeted tests 19/19 pass; diff whitespace pass; lint unavailable; build intentionally not run. Manual checks remain.
- Note: Tool output uses the checkout's tool.preview.output/tool.detail representation. Existing Claude control transport reused unchanged. C: and E: storage checked before the full suite.

## 2026-09-30 21:36 IST — Commit Claude live controls and Codex MCP forms from reviewed patches

- Type: feature
- What: Applied Luna's two saved patches after Claude reviewed them. Claude live controls scored 8/10 and Codex MCP forms 8.5/10. Each was committed as its own feature. Context Accuracy and Native Branch are unblocked and set to Todo.
- Why: The only blocker was the flaky Composer attachment test, which passes alone and on a rerun. It isn't related to either feature.
- Files: [claude-live-controls spec](../specs/archive/claude-live-controls.md), [codex-mcp-forms spec](../specs/archive/codex-mcp-forms.md), [context-accuracy spec](../specs/archive/context-accuracy.md), [native-branch spec](../specs/archive/native-branch.md), [SPECS index](../specs/SPECS.md), [fix list](../notes/provider-batch-fixes.md).
- Commit: 9dfeaa0 (Claude live controls), 3a47202 (Codex MCP forms)
- Verified: typecheck ✅; Claude provider tests 98/98 ✅; Codex, core and sessions tests 1,594/1,594 on rerun ✅ (the first run had one flaky failure); full suite not rerun; build —

## 2026-09-30 21:27 IST — Run the remaining provider batch

- Type: feature
- What: Committed the AI helper model settings as `84fbe89`. Claude live controls and Codex MCP forms remain preserved as partial patches after the full test suite failed on the same unchanged Composer attachment-ownership test; Context Accuracy and Native Branch were skipped because they depend on the blocked Claude slice.
- Why: Complete the provider batch under the required sequential full-suite gate.
- Files: [AI helper model settings spec](../specs/archive/ai-helper-model-settings.md), [Claude live controls partial patch](../notes/claude-live-controls-partial.patch), [Codex MCP forms partial patch](../notes/codex-mcp-forms-partial.patch), [SPECS index](../specs/SPECS.md).
- Commit: 84fbe89 (AI helper settings); blocked slices uncommitted.
- Verified: focused checks for AI helpers ✅ (43 files, 793 tests); focused checks for Codex forms ✅ (12 files, 347 tests); TypeScript ✅; Rust ✅ (416 passed, 4 ignored); full `npm test` ❌ (3,806/3,807 passed; one unchanged Composer test fails only in the full suite).
- Follow-up: Re-run the full suite after resolving the existing Composer test-order failure; Nakul to perform each spec's Manual checks.

## 2026-09-30 21:00 IST — Choose the AI helper model

- Type: feature
- What: Users can choose the provider, account and model that writes chat titles, commit messages and pull request descriptions, with a backup model for unusable replies.
- Why: Give users control over helper model choice while keeping helper actions isolated from project files and chats.
- Files: [SettingsView.tsx](../../src/features/settings/ui/SettingsView.tsx:956), [helperPipeline.ts](../../src/integrations/harness/core/helperPipeline.ts:143), [helperText.ts](../../src/integrations/harness/core/helperText.ts:1), [PrDetailsDialog.tsx](../../src/features/source-control/ui/PrDetailsDialog.tsx:1).
- Commit: 84fbe89
- Verified: focused tests ✅ (43 files, 793 tests); typecheck ✅; Rust check ✅ (416 passed, 4 ignored); lint — (no ESLint config); build —
- Follow-up: Run the spec's manual checks, including verifying provider account usage and PR retry behavior. Antigravity helper isolation remains gated off pending Nakul's separate runtime check.

## 2026-09-30 18:48 IST — Move session approvals onto nakul/windows-support; no more worktrees

- Type: chore
- What: Committed the session-approvals feature and fast-forwarded `nakul/windows-support` to it. The rest of the batch now happens directly on this branch, with one review prompt and one worker prompt.
- Why: Nakul prefers building on the main branch. Worktrees added dev-mode testing and merge overhead with no benefit, because this work is sequential.
- Files: [provider-batch-prompt.md](../notes/provider-batch-prompt.md), plus 27 source files in commit bf41013.
- Commit: bf41013
- Verified: typecheck ✅; tests ✅ (harness, sessions and notifications folders: 170 files, 1,856 tests; the worker had run the full suite, 3,692 tests) lint — (no config) build —

## 2026-09-30 18:40 IST — Approve the remaining five provider specs for one combined run

- Type: docs
- What: Nakul approved the five remaining provider specs, which moved from Draft to Todo. They'll be built by one worker in one worktree, one after another, instead of five separate handoffs with commit-hash checks.
- Why: The per-slice handoffs cost too much time. Nakul wants all six features finished and built today.
- Files: [SPECS.md (Todo section)](../specs/SPECS.md:37), the headings of the five specs.
- Decision: The AI helper spec's two open decisions take its defaults: Antigravity helpers stay switched off until verified, and Codex helpers are allowed.
- Commit: uncommitted
- Verified: typecheck — lint — tests — build — (docs only)

## 2026-09-30 18:25 IST — Implement Claude and Codex session approvals

- Type: feature
- What: Users can allow supported Claude and Codex requests for the current chat, and that choice stays limited to that chat without changing provider settings.
- Why: Reduce repeated approvals while keeping grants session-scoped and unavailable for unrecognized Codex MCP requests.
- Files: [session-approval-scopes.md](../specs/archive/session-approval-scopes.md:1), [types.ts](../../src/integrations/harness/core/types.ts:72), [claude.ts](../../src/integrations/harness/providers/claude/claude.ts:979), [codex.ts](../../src/integrations/harness/providers/codex/codex.ts:1059), [AgentTranscript.tsx](../../src/features/sessions/ui/AgentTranscript.tsx:3471), [ApprovalToasts.tsx](../../src/features/sessions/ui/ApprovalToasts.tsx:123)
- Commit: uncommitted
- Verified: typecheck ✅; focused tests 348/348 ✅; `npm test` 3692/3692 ✅; `git diff --check` ✅; lint unavailable (no ESLint config); build —.
- Follow-up: SocratiCode repetition: unverified until manual check 1. Nakul's manual checks remain.

## 2026-09-30 17:50 IST — Commit the provider-batch checkpoint and unblock session approvals

- Type: chore
- What: With Nakul's approval, the staged windows-support fixes were committed as the checkpoint for the provider batch. The session-approvals spec moved from Blocked to Todo, with its starting commit filled in. The same checkpoint was filled into the other five provider specs, which stay Draft.
- Why: The first slice 1 worker correctly stopped because the handoff still had placeholder SHAs and the checkpoint wasn't committed yet.
- Files: [session-approval-scopes.md (lines 1–14, 244–260)](../specs/archive/session-approval-scopes.md:1), [SPECS.md (Todo section)](../specs/SPECS.md:37), [provider-daily-work-improvements-plan.md (line 62)](../specs/archive/provider-daily-work-improvements-plan.md:62), the `<CHECKPOINT_SHA>` fill in the other five provider specs.
- Commit: a65bd4e (checkpoint; docs remain local and uncommitted)
- Verified: typecheck ✅ tests ✅ (3 changed files, 78 tests; full suite not run) lint — (no config) build — . Slice 1 baseline checks pass.
- Follow-up: drive C: has about 2.6 GB free and holds TEMP and the npm cache, so the worker's storage check may stop the task.

## 2026-09-30 14:30 IST — Block session approvals on missing baseline SHAs

- Type: docs
- What: Marked the session-approval spec Blocked because the handoff omitted the baseline and checkpoint SHAs, and the retained umbrella checkpoint remains staged rather than committed.
- Why: The spec requires verified commit ancestry and says not to choose a baseline; the current `nakul/windows-support` HEAD is still `9397898c923491a9ee1e9cd77c4bcc917634c888`.
- Files: [session-approval-scopes.md](../specs/archive/session-approval-scopes.md), [SPECS.md](../specs/SPECS.md).
- Commit: uncommitted
- Verified: Git HEAD/status inspected. Baseline ancestry commands could not run without the required SHAs. No worktree, install, source edit or verification suite was run.
- Follow-up: Provide both SHAs after the checkpoint is committed; rerun the baseline checks, then perform the storage check before creating the authorized worktree.

## 2026-09-30 14:14 IST — Revise the six provider specs after the handoff review

- Type: docs
- What: Corrected the six Draft provider specs using the handoff review. AI helpers keep Antigravity in the provider list but gated behind a stated missing capability, run every helper with tools off plus a stop-on-tool-attempt watchdog, and no longer create a PR with a stand-in description when a chosen helper fails. The context popover labels Claude's numbers "Reported by Claude Code" and never spreads unexplained tokens over MCP servers. Slice 2 is now the only owner of the Claude control transport, and slice 4 depends on it. Approval metadata fails closed and the SocratiCode repeat is not claimed fixed. Native Branch gets a not-confirmed state that never resends automatically. MCP forms get persistence and fingerprint tests and narrower secret detection. Every spec now has a baseline, dependencies and worktree section and a ready handoff prompt.
- Why: Nakul's ten-point revision request after the 13:08 handoff review.
- Files: [session-approval-scopes.md](../specs/archive/session-approval-scopes.md), [claude-live-controls.md](../specs/archive/claude-live-controls.md), [context-accuracy.md](../specs/archive/context-accuracy.md), [native-branch.md](../specs/archive/native-branch.md), [ai-helper-model-settings.md](../specs/archive/ai-helper-model-settings.md), [codex-mcp-forms.md](../specs/archive/codex-mcp-forms.md), [SPECS.md (Draft rows)](../specs/SPECS.md)
- Commit: uncommitted
- Verified: typecheck — lint — tests — build — (docs only; targeted source reads for `sendHarnessTurn`, `persistFingerprint` callers, Codex item types and Antigravity mode handling).

## 2026-09-30 13:18 IST — Check Claude MCP availability and discovery handling

- Type: docs
- What: Confirmed normal Claude chats inherit settings and isolated helpers alone get empty MCP config; identified a name-based native Plan-mode permission limitation for some read-only SocratiCode tools.
- Why: Distinguish the author's skipped ToolSearch step from a MonoCode integration failure.
- Files: [Investigation](../notes/claude-mcp-discovery-investigation-30sept.md).
- Commit: uncommitted
- Verified: Source branches, existing permission tests, SocratiCode status/search and official Claude MCP docs. No live Claude reproduction/source edits; tests/build not run.

## 2026-09-30 13:08 IST — Review six provider drafts before worker handoff

- Type: docs
- What: Recorded scope/contract gaps and a safe implementation order; kept child drafts unapproved. Checked the SocratiCode reporting contradiction without assuming tool history.
- Why: Nakul asked whether the new handoffs are ready and can run in parallel.
- Files: [Handoff review](../notes/provider-spec-handoff-review-30sept.md), [umbrella plan](../specs/archive/provider-daily-work-improvements-plan.md).
- Commit: uncommitted
- Verified: Current specs, targeted source, Git baseline and SocratiCode status/search. No source or staged changes; tests/build not run.

## 2026-09-30 12:23 IST — Draft implementation specs for the six provider slices

- Type: docs
- What: Wrote Draft specs for the six selected provider improvements: session approvals, Claude live controls, context accuracy, AI helper model settings and Codex MCP forms. Rewrote the Native Branch spec so Claude, Codex and OpenCode branch natively while other providers keep today's flow. Every spec contains the storage-full hard blocker, a test matrix, separate manual desktop checks, a per-slice feature worktree rule and its unresolved facts.
- Why: Nakul asked for implementation-ready handoffs for the umbrella plan's selected slices before any source changes.
- Files: [session-approval-scopes.md](../specs/archive/session-approval-scopes.md), [claude-live-controls.md](../specs/archive/claude-live-controls.md), [native-branch.md](../specs/archive/native-branch.md), [context-accuracy.md](../specs/archive/context-accuracy.md), [ai-helper-model-settings.md](../specs/archive/ai-helper-model-settings.md), [codex-mcp-forms.md](../specs/archive/codex-mcp-forms.md), [SPECS.md (lines 18–26)](../specs/SPECS.md:18).
- Commit: uncommitted
- Verified: Docs only. Facts were checked against source at 9397898 and against the installed CLIs (Claude 2.1.283, codex-cli 0.159.0, OpenCode 1.18.30). Typecheck, lint, tests and build were not run. No branches, worktrees, commits or pushes.

## 2026-09-30 12:15 IST — Review staged baseline commit groups

- Type: docs
- What: Confirmed the staged baseline contains exactly the reported ten paths and four logical groups, with no unstaged tracked changes. Recommended preserving the Composer non-reproduction caveat and clarifying the Claude provenance comment before commit approval.
- Why: Review the implementing agent's staged checkpoint report before new provider work.
- Files: Local changelog only; staged source/index left untouched.
- Commit: uncommitted
- Verified: Current status, staged stat and Claude authorship diff. Tests/build not rerun; agent-reported results remain attributed to that run. No commits or pushes.

## 2026-09-30 11:59 IST — Confirm storage rule stays outside global AGENTS

- Type: docs
- What: Checked the global AGENTS.md: it contains no disk-full stop rule, so no removal was needed. Confirmed the rule remains in the local spec-writing skill and project working agreement/spec.
- Why: Nakul wants this requirement in generated specs and project instructions, not the global working agreement.
- Files: This local changelog only; global AGENTS.md unchanged.
- Commit: uncommitted
- Verified: Exact storage-rule searches in global AGENTS.md, skill and project agreement. No executable code changed; tests/build not run.

## 2026-09-30 11:41 IST — Confirm only selected provider features are in scope

- Type: docs
- What: Explicitly deferred Prepare for a break, cold-resume warnings and other unselected features; retained the context-inspector accuracy findings in the six-item provider plan.
- Why: Nakul confirmed that existing specs should inform the selected work without adding their separate features.
- Files: [Provider improvements plan](../specs/archive/provider-daily-work-improvements-plan.md).
- Commit: uncommitted
- Verified: Scope clarification inspected. No application code changes; tests/build not run.

## 2026-09-30 11:22 IST — Review parking completion and existing spec overlap

- Type: docs
- What: Verified current remote parking tips, remaining worktrees/branches/stashes and retained diffs; added existing-spec reuse and post-parking baseline requirements to the provider plan.
- Why: Review the agent's completion report and prevent duplicate or stale implementation handoffs before new work.
- Files: [Provider improvement plan](../specs/archive/provider-daily-work-improvements-plan.md).
- Commit: uncommitted
- Verified: Git inventory, ls-remote, source diffs, parking evidence and existing Native Branch/cold-resume/context/break specs. Prior checks are reported as agent results, not rerun. No source change, commit or cleanup. Full-web-test and lint limitations remain.

## 2026-09-30 11:08 IST — Require a hard stop on storage exhaustion

- Type: docs
- What: Added a storage-full stop rule to the repo agreement, provider plan and personal spec-writing skill. Corrected the provider umbrella plan to Draft and added a specification-preparation handoff.
- Why: Workers must report blocked storage instead of repeatedly trying builds or continuing work. The selected scope is not yet six implementation-ready specs.
- Files: WORKING-AGREEMENT.md; provider-daily-work-improvements-plan.md; SPECS.md; local spec-writing/SKILL.md.
- Commit: uncommitted
- Verified: Rule and handoff text inspected; status index corrected. Typecheck/lint/tests/build not run: instructions/docs only. No source, Git or storage cleanup changes.

## 2026-09-30 11:05 IST - Park orchestration work on verified fork branches

- Type: chore
- What: Separated the unfinished Hari and four-feature orchestration layers into two independently verified fork archives, removed only the four-feature source from windows-support, and retained its unrelated context/provider fixes.
- Why: Preserve unfinished work independently while keeping the active Windows-support fixes available for the next provider improvements, version/build decision, and selected upstream intake.
- Files: [parking record](../notes/orchestration-parking-30sept.md), [parking spec](../specs/archive/park-orchestration-hari-upstream-handoff.md).
- Commit: uncommitted
- Verified: 78/78 focused retained tests, TypeScript, Rust fmt/check/Clippy, 415 Rust tests (4 ignored), external-output production web build, and git diff --check passed. Full web tests: 3,658/3,659 passed; one unchanged Composer borrowed-attachment test failed. The first cargo test attempt hit disk-full error 112; after clean worktree removal freed space, the retry passed. ESLint has no repository config.
- Limitation: No native desktop smoke test, installer, version change, or upstream intake. The four disposable worktrees and two exact local archive branches were deleted after final remote-tip verification; both remote branches remain.

## 2026-09-30 10:56 IST — Record selected provider improvement scope

- Type: docs
- What: Recorded the selected daily-work improvements, native Branch from here for three providers, combined context accuracy work, shared AI helper model/fallback selection and Codex MCP approval/form requirements.
- Why: Nakul selected items 1–6 and clarified the desired branching, context and helper behavior.
- Files: [Provider improvements plan](../specs/archive/provider-daily-work-improvements-plan.md), [spec index](../specs/SPECS.md).
- Commit: uncommitted
- Verified: Existing branch/helper/approval source, SocratiCode search and official Codex/OpenCode documentation. Typecheck/lint/tests/build not run: documentation only. No source/Git mutations.

## 2026-09-30 10:21 IST — Verify Claude and Codex integration gaps

- Type: docs
- What: Compared current provider source with official CLI/app-server documentation and saved a prioritized daily-work gap list, correcting claims about accounts, skills, transcript imports, compaction and undo.
- Why: Validate the supplied model-generated comparison before selecting new features while orchestration work is being parked.
- Files: [Provider review](../notes/claude-codex-cli-gap-review-30sept.md).
- Commit: uncommitted
- Verified: Source inspection, SocratiCode search, official documentation and installed CLI versions. Typecheck/lint/tests/build not run because no executable code changed. No live requests or desktop tests.

## 2026-09-30 10:05 IST — Complete approved local project profile

- Type: docs
- What: Created the Git-excluded local profile with Desktop app, upstream open-source contribution/fork, tests, changelog/decisions, local docs and SocratiCode enabled. General auto-commit remains off; both parking branches retain their explicit commit/push/verified-local-delete authorization.
- Why: The implementing agent correctly stopped at the missing-profile repo-setup prerequisite; Nakul approved the proposed settings.
- Files: Local .agents/PROFILE.local.md, local .git/info/exclude, [parking handoff](../specs/archive/park-orchestration-hari-upstream-handoff.md).
- Commit: uncommitted
- Verified: Locked stack versions and actual scripts inspected; profile exclusion and existing source Git status checked. No source, branch, stash, commit, push or build change. Existing docs layout retained rather than regenerating templates.
- Limitation: No lint script/config exists. Profile and docs must be read from the main checkout or copied/excluded locally in newly created worktrees.

## 2026-09-30 09:38 IST — Split parking plan into independent Hari and orchestration branches

- Type: docs
- What: Revised the handoff to preserve Hari on hari-orchestration-changes-30sept and the four current features on park-other-orchestration-mode-changes-30sept. Each starts from the same base, is pushed/verified independently, and has its own remote-retention note.
- Why: Nakul proposed separate branches to avoid merging overlapping work during parking and complete preservation more quickly.
- Files: [parking spec](../specs/archive/park-orchestration-hari-upstream-handoff.md), [SPECS.md](../specs/SPECS.md).
- Commit: uncommitted
- Verified: Reviewed branch ownership, two-ref push/recovery checks, partial-push failure handling and local-only cleanup ordering. No source, stash or branch changes; no commit/push/build.
- Decision: Use two archives from the start. Both remote copies must verify before source removal or local branch deletion; combining conflicts are deferred to future resumption.

## 2026-09-30 09:26 IST — Write Hari and orchestration parking delegation spec

- Type: docs
- What: Wrote a complex Draft handoff to combine the pinned Hari stash and four uncertain features on orchestration-changes-parking-30sept, push only that branch to Nakul's fork, verify remote recovery before source separation, and delete only the verified local branch.
- Why: Nakul wants to retain this unfinished work safely while using manual orchestration and preparing for minor changes, version/build and selected upstream features.
- Files: [parking spec](../specs/archive/park-orchestration-hari-upstream-handoff.md), [SPECS.md](../specs/SPECS.md).
- Commit: uncommitted
- Verified: Current HEAD/status, pinned stash parents and 9 tracked plus 7 new Hari files, fork remote, shared App caller and release-script constraints inspected; spec indexed. No branch/worktree created, source changed, stash applied, commit, push, version bump or build performed.
- Decision: Preserve original stashes and local docs; use external byte backups plus verified remote archive; stop for overlap conflicts. Later minor/version/upstream specifics remain a separate user handoff.

## 2026-09-30 08:53 IST — Assess parking orchestration work and retaining independent fixes

- Type: chore
- What: Reviewed local changes for separation. Proposed preserving the four orchestration features in a named recoverable snapshot before removing them from active development, retaining independent context-count and Claude message-origin fixes, documentation and Antigravity regression coverage.
- Why: Nakul wants manual orchestration for now and to focus next on selected upstream MonoCode features.
- Files: Reviewed App.tsx, orchestration/session changes, systemBreakdown tests, Claude protocol/type changes and Antigravity ACP regression tests. No application source changed.
- Commit: uncommitted
- Verified: Focused Vitest passed 78/78 across systemBreakdown, claudeProtocol and antigravityAcpLive. These are automated tests, not live provider verification. No full suite/build rerun; no stash, restoration, branch switch, commit or push performed.
- Separation note: App.tsx contains the Claude humanAuthored caller as well as orchestration changes; isolate hunks rather than restoring the entire file. Git-ignored docs and retained desktop-test artifacts need separate backups. Existing Hari stashes remain untouched.
- Follow-up: Back up exact dirty/untracked files and local docs with hashes; preserve a named Git snapshot with base SHA; verify recovery in a separate worktree; then remove only the parked changes and rerun gates. A parking-branch commit requires explicit approval under the working agreement. Retained tests passing does not resolve the existing active run in app storage.

## 2026-09-30 08:31 IST — Review blocked desktop orchestration test

- Type: docs
- What: Recorded the external test attempt, marked its spec Blocked, confirmed the test root and retained fixtures, and added app-freshness and control-connectivity stop gates.
- Why: T1 failed in the observed app and further cases were blocked; native/current-source provenance was unproven.
- Files: [test spec](../specs/orchestration-desktop-computer-use-test.md), [SPECS.md](../specs/SPECS.md).
- Commit: uncommitted
- Verified: Read external report and traced shared Antigravity runtime, session-specific control grants, checkout guard and finish/cancel lifecycle. No application code, app state, test repository, original report or credentials changed; application gates and desktop tests not rerun.
- Follow-up: Reproduce shared-runtime lead control access safely before fixing; external tester/Nakul must cancel the original run via run-level confirmation rather than delete storage or worktrees.

## 2026-09-30 07:30 IST — Write isolated desktop orchestration test handoff

- Type: docs
- What: Added a Draft test spec for a separate Codex session with native desktop access. Covers ignored-file handoff/conflicts, lead Stop/Cancel/model changes, Efficient/Live supervision, pending send/failure and restart recovery.
- Why: Nakul asked for computer-use testing with Antigravity Gemini 3.8 Flash High as lead, Super Bunny through OpenCode as worker 1 and Muse Spark 1.3 Free as worker 2.
- Files: [test spec](../specs/orchestration-desktop-computer-use-test.md), [SPECS.md](../specs/SPECS.md).
- Commit: uncommitted
- Verified: Spec indexed as Draft; existing 18 rows retained; test-root containment and source references reviewed. Native testing and application checks not run: this task writes the handoff only.
- Open questions: Confirm temporary root, worker 2 catalog/provider, current dev-app access and disposable Git seed commit before execution. Unavailable live failure cases must remain untested.

## 2026-09-30 02:50 IST — Reorder spec status groups

- Type: docs
- What: Changed the display order to Draft, Review / Blocked together, Todo, Progress, and Done. Each spec retains its individual status and each group stays sorted by creation time, newest first.
- Why: Nakul specified this order for scanning the spec index.
- Files: [SPECS.md](../specs/SPECS.md).
- Commit: uncommitted
- Verified: All 18 existing rows preserved exactly; requested group order and creation sorting checked; local documentation links checked. Application checks not run for this documentation-only change.

## 2026-09-30 02:48 IST — Group specs by status and creation time

- Type: docs
- What: Grouped the spec index under Todo, Progress, Done, Blocked, Review, and Draft, with the newest-created files first inside each group. Added a Created (IST) column and placeholders for empty groups.
- Why: Nakul requested an easier way to scan specs by workflow status and creation order.
- Files: [SPECS.md](../specs/SPECS.md).
- Commit: uncommitted
- Verified: All 18 spec rows retained with unchanged statuses, links, and notes; group order and descending creation timestamps checked; documentation links checked. Application typecheck, lint, tests, and build not run for this documentation-only change.
- Caveat: Creation times use the local Windows filesystem and may reflect copying or restoration rather than original authorship.

## 2026-09-30 02:41 IST — Organize docs and correct spec workflow statuses

- Type: docs
- What: Kept the five main reference files at the docs root, uppercased PLANNED, FEATURES, and WINDOWS-CHANGES, moved feature plans into specs, and grouped supporting records and uncertain history under notes and notes/archive. Updated document references and indexes.
- Why: Nakul requested a clearer docs layout and corrected the status vocabulary to Todo, Progress, Done, Blocked, Review, and Draft.
- Files: [SPECS.md](../specs/SPECS.md), [notes index](../notes/README.md), [archive index](../notes/archive/README.md), [WORKING-AGREEMENT.md](../WORKING-AGREEMENT.md), [PLANNED.md](../PLANNED.md), [FEATURES.md](../FEATURES.md), [WINDOWS-CHANGES.md](../WINDOWS-CHANGES.md), and the relocated documents. Updated the repo AGENTS.md paths.
- Commit: uncommitted
- Verified: All local Markdown links resolve; the root contains the five requested files; all 18 specs are indexed with allowed status headings; 918 existing source files are unchanged; git diff --check passed. Application typecheck, lint, tests, and build not run for this docs-only task.
- Status decision: Imported historical specs are Done at Nakul's request; recent proposals are Draft; implementations awaiting review are Review. Uncertain or superseded plans are archived with their historical notes intact.
- Git note: The existing tracked Jira guide moved to docs/notes/jira.md; its destination is inside the existing ignored docs tree. No staging or index change was made.

## 2026-09-30 02:31 IST — Index local changelog and specs

- Type: docs
- What: Moved the existing local changelog entries into this numbered file and added changelog and spec indexes. The old changelog path now points to the index.
- Why: Apply the updated repo-setup documentation layout so future tasks can find the relevant history or spec without reading every document.
- Files: [CHANGELOG.md](CHANGELOG.md), [CHANGELOG-01.md](CHANGELOG-01.md), [LOCAL-CHANGELOG.md](LOCAL-CHANGELOG.md), [SPECS.md](../specs/SPECS.md), [WORKING-AGREEMENT.md](../WORKING-AGREEMENT.md).
- Commit: uncommitted
- Verified: All 19 local Markdown links resolve; all eight specs are indexed; exactly one changelog file is marked Current; original historical entry text is retained; existing source and spec hashes and Git status are unchanged; new indexes remain Git-ignored. Typecheck, lint, tests, and build not run because application code did not change.
- Status decisions: All eight spec workflow labels remain Unassigned until Nakul provides Todo, Progress, or Done. Existing spec contents and filenames are preserved.

## 28 Sept 2026 14:14 IST — Revert lead checkout chooser

- Type: fix
- What: Removed the pre-planning checkout question and its branch/worktree preparation. Orchestrate again begins planning directly in the lead's existing checkout. Previously saved chooser cards become retryable invalid proposals. Kept local handoff files, Stop lead response, Cancel orchestration, Resume and send, and supervision mode.
- Why: Nakul asked to carefully revert only the “choose where lead works” change while retaining the other local orchestration work.
- Files: `src/app/App.tsx`; `src/features/orchestration/model/orchestrationPlan.ts` and test; `src/features/orchestration/ui/OrchestrationPreview.tsx` and flow test; `src/features/sessions/ui/SessionPane.tsx`; removed the four untracked checkout chooser model/test files.
- Commit: uncommitted; no push, installer or native desktop UI check.
- Verified: TypeScript and focused Vitest 67/67; `cargo fmt --check` and `cargo check` passed; production web build passed with existing CSS/mixed-import/chunk warnings; `git diff --check` passed. Changed-file ESLint remains blocked by the missing `eslint.config.*`. Two full `npm run check:web` runs each had one different Composer attachment test fail; both tests passed alone and the earlier local log also records this intermittent attachment behavior. The full gate is therefore not green.
- Follow-up: Nakul to check Orchestrate in the Tauri dev app. The attachment-test timing issue remains outside this focused revert.

## 26 Sept 2026 01:00 IST - Orchestration native-dev handoff continuation
- Type: fix / feature
- What: Completed the orchestration review handoff with retained original baselines and hash-checked 32 KiB pages for the full allowed file; fixed async Resume and send draft retention; enforced the Efficient quiet-wait limit; and added the checkout workflow question to the normal conversation question flow.
- Why: Finish the existing orchestration handoff safely enough for native dev use while preserving the parked Hari work and protected local edits.
- Files: `src/app/App.tsx`; `src-tauri/src/handoff.rs`, `control_cli.rs`, `lib.rs`; orchestration model/UI and Composer/session flow under `src/features/`; ACP serialization regression matrix in `src/integrations/harness/core/antigravityAcpLive.test.ts`.
- Recovery: Hari stash `966680850080b052aaf4dcd13d12a8c5062831f3` remains in place. The Hari backup manifest covers 16 paths and matches the stash after Git line-ending normalization; the combined backup verifies 1,371 source files with zero missing, extra, or mismatched files. Protected SHA-256 values remain `src-tauri/Cargo.toml` `894b5d3441d93d8df11f311ae37fcad767c2a254c9bdc5b1c0a5bfa7da6cfce6`, `systemBreakdown.ts` `54b9dfa03305ca37e99b95035910a8c339106ed47c8583e2e1d8dc9ec3072a1f`, and `systemBreakdown.test.ts` `7363fc14eda1002a995d3193a8ee116778d3c8d4e6260d6a7f1068613345a708`.
- Verified: `npm run check:web` 329 files / 3,716 tests plus TypeScript; focused SidebarRename 45/45; Cargo fmt clean; Clippy with warnings denied clean; Rust tests 429 passed / 4 ignored using one job; production web build passed with existing CSS, mixed-import and chunk-size warnings; `git diff --check` clean. Changed-file ESLint attempted and blocked by the existing missing `eslint.config.*`.
- Limits: Efficient wait policy and checkout selection are covered in code and automated tests, but no real lead run or native UI could be observed because this environment exposed no desktop app/window or runnable Tauri dev executable. The maximum-call-stack cause remains unresolved: the fake ACP regression matrix covers planning/chat, text/image and fresh/reused sessions, but no live Gemini reproduction or sanitized runtime stack was available. No commit, push, installer or live-repository branch/worktree change.
- Supersedes the preceding 25 Sept orchestration entry's stale limitations about the 32 KiB review cap, unavailable baseline, asynchronous draft loss and unimplemented checkout question. Native UI verification remains pending.

## 25 Sept 2026 16:22 IST — Local handoff files and lead control
- Type: feature / fix
- What: (1) A spec worker can hand an exact, Git-ignored local file to the lead and to a dependent worker; the file stays ignored and unstaged. (2) The lead's composer Stop now ends only its current response ("Stop lead response"); "Cancel orchestration" is a separate confirmed action on the run card. (3) A per-run **Efficient** (default) / **Live supervision** choice on the confirmation card, persisted with the run and injected into the lead prompt. (4) A paused run resumes from a normal lead message ("Resume and send").
- Why: `docs/specs/orchestration-local-artifacts-lead-control.md`. Observed failure: the input-area Stop called `stopForSession` → `stopRun`, which cancelled workers and disabled the control grant, so a later Sol→Luna model switch had no MonoCode connection. Git's dirty-file index skips ignored files, so a private spec never reached a dependent worker and a shell-written ignored file had no checkpoint pre-edit state.
- Contract: task `handoffFiles` = exact project-relative files (no directory/glob/`.`/`.env*`/`.git`/`node_modules`/`target`, no symlink component, regular file or missing, ≤ 8 MB), shown on the card. Baseline (hash) is recorded in the lead checkout before dispatch; fresh worker checkouts are seeded with declared files only (never over newer bytes). At review: inspect vs baseline (any write method) → refuse conflicts and undeclared ignored files in the worker (names only) → code integrate → atomic handoff integrate (preflight all, re-read before write, identical retry OK) → accept. Cleanup treats a changed declared file as a change. Errors carry relative paths, never content.
- Lead control: `stopLeadResponse` bumps a per-lead generation and stops only the lead process (grant, workers, worktrees, queued messages untouched); late callbacks from an older turn cannot pause the run; results in an interrupted turn are held for a manual continuation or a new worker event (`sync` never re-wakes on them alone); repeated Stop clicks share one stop; Stop vs Cancel settles as cancelled.
- Files: `src-tauri/src/handoff.rs` (new) + `lib.rs`; `src/features/orchestration/model/{orchestration,orchestrationPlan,orchestrationState,orchestrationSummary,leadControls}.ts`; `ui/{OrchestrationPreview,OrchestrationSidebarAgents}.tsx`; `src/features/sessions/ui/{Composer,SessionPane}.tsx`; `src/app/App.tsx`. Tests: `handoff.rs` (11 Rust), `orchestrationLeadControl.test.ts` (24), `orchestrationPlan.test.ts` (+15), `OrchestrationFlow.test.ts` (+5).
- Commit: uncommitted (no commit/push/installer per handoff).
- Verified: `tsc --noEmit` ✅; full Vitest 3703/3704 — the one failure is `SidebarRename.test.ts` "keeps project shortcuts in a compact vertical rail", caused by the unrelated uncommitted Hari rail button (not this change); `cargo fmt --check` ✅; `cargo clippy --workspace --all-targets -D warnings` ✅; `cargo test` 426 passed / 4 ignored ✅; `npm run build` ✅ (existing chunk warnings); `git diff --check` ✅; ESLint blocked (no `eslint.config.*`). Composer.paste test failed once under concurrent Cargo load and passed alone and on rerun.
- Not verified: real Tauri behaviour (see manual checks in the spec). Limitations: no dedicated UI viewer for the handoff before/after — the lead reads it via `control get` (`handoffPreview`, ≤ 32 KB per side, before shown only while the lead copy is still the baseline); "Resume and send" restores no draft if resume fails asynchronously (the status line quotes the error and says the message was not sent); a run already marked `stopped` by an older build is not reopened; the checkout chooser and idle queue capture are out of scope.

## 25 Sept 2026 15:33 IST — Hari current orchestration integration
- Type: feature
- What: Added a project-scoped Hari mode, a transient first-goal composer, a read-only board, and navigation to existing worker details.
- Why: Implement `docs/specs/hari-current-orchestration-integration.md` using MonoCode's current session and orchestration flows.
- Files: `src/app/App.tsx`, `src/app/shell/ProjectRail.tsx`, `src/app/shell/Sidebar.tsx`, `src/features/orchestration/`, `src/features/sessions/ui/`, `src/features/settings/model/appearance.ts`.
- Commit: uncommitted
- Decision: `docs/specs/hari-current-orchestration-integration.md` is authoritative; older Hive/scheduler plans are superseded.
- Verified: TypeScript ✅; focused Vitest 62/62 ✅; `git diff --check` ✅; ESLint blocked because no `eslint.config.*` exists. Full suite/build and native Tauri UI check not run under the spec-implement handoff.

## 0.1.55-local3-rail-wallpaper - 25 Sept 2026, 08:31 IST - Corrected same-version installer

- What / why: Rebuilt the installed wallpaper fix and all five wallpaper effect choices under the same app version at the user's explicit request. This overrides the usual new local counter for a rebuild.
- Source: `9397898c923491a9ee1e9cd77c4bcc917634c888`; exactly eight intended files committed, with no version-file changes. The user reports the five effects work in Tauri dev mode.
- Verification: Isolated release source passed `npm run check:web` (326 files / 3,649 tests and TypeScript), `CARGO_BUILD_JOBS=1 npm run check:rust` (fmt, Clippy, 415 passed / 4 ignored), `npm run build`, and unsigned `npm run build:windows -- --no-sign`. Existing CSS highlight, mixed-import, and large-chunk warnings remain. ESLint remains blocked by the missing flat config.
- Installer: corrected `E:\Developing\Installable versions\MonoCode_0.1.55-local3-rail-wallpaper_x64-setup.exe`; 10,577,371 bytes; SHA-256 `B768793BFD7B5EA7C3F0F67D2451D1CC1B2F0A7F942B23C9BBA6E9B104E1A30E`; unsigned. The failed previous installer is retained at `E:\Developing\Installable versions\failed\MonoCode_0.1.55-local3-rail-wallpaper_x64-setup.exe`, SHA-256 `5E59FDF78B0B17AB46549BAB63F4209F387B83FF5B84ABB6ACAD98CE86A99663`.
- Protected WIP: Both `systemBreakdown` files were isolated for release gates, then restored from byte-level backups with their original hashes. `src-tauri/Cargo.toml` retained its original hash and content-neutral status mark. The exact isolation stash was dropped after restoration.
- Installed verdict / push: user-confirmed pass for the corrected unsigned installer; not an automated UI check. Source commit `9397898c923491a9ee1e9cd77c4bcc917634c888`; version `0.1.55-local3-rail-wallpaper`; installer SHA-256 `B768793BFD7B5EA7C3F0F67D2451D1CC1B2F0A7F942B23C9BBA6E9B104E1A30E`. Fast-forward push completed only to `personal/nakul/windows-support` on `https://github.com/imnakul/monocode-clone.git`: remote `6f1d2f7851be7ea644e11f4daf2b2b9da29b7770` to `9397898c923491a9ee1e9cd77c4bcc917634c888` (217 ahead, 0 behind); remote verification matched local HEAD. Identify the corrected build by hash and source commit because both installers report the same version.

## Unreleased - 25 Sept 2026, 01:31 IST - Add all existing effects to Windows wallpaper

- What / why: Replace the Halftone-only wallpaper switch with the same None, Dither, ASCII, Halftone, and Scanlines choices available for chat backgrounds.
- Implementation: Reuse the existing worker and segmented control. Persist wallpaper effect separately from chat, read the old Halftone boolean when no new selection exists, and preserve effect/render revision, original-image fallback, and object-URL ownership. Settings search and Restore defaults now use the wallpaper effect choice. No dependency or worker algorithm was added.
- Files: `src/features/settings/model/appearance.ts`, `appearance.test.ts`, `appearance.wallpaper.test.ts`, `settings.ts`, `src/features/settings/ui/SettingsView.tsx`, `SettingsView.wallpaper.test.ts`, and local `docs/specs/archive/wallpaper-effects-plan.md`. The pending `connect-src blob:` fix and its test remain in the same working tree for the next version.
- Verification: Focused worker/wallpaper/Settings tests passed (54). `npm run check:web` passed (326 files / 3,650 tests and TypeScript). `CARGO_BUILD_JOBS=1 npm run check:rust` passed fmt, Clippy, 415 tests / 4 ignored. `npm run build` passed with existing CSS highlight, mixed-import, and chunk warnings. `git diff --check` passed. Changed-file ESLint cannot run because no flat config exists.
- Manual/release: The user reports the CSP-corrected Halftone works in dev mode. Dither, ASCII, Scanlines, rapid switching, theme/restart persistence, and chat independence still need a Tauri visual pass. No new installer, commit, or push yet; local3 remains a failed installed candidate.

## Unreleased - 25 Sept 2026, 01:10 IST - Fix installed wallpaper Halftone source read

- What / why: The installed `0.1.55-local3-rail-wallpaper` app showed "Halftone could not be applied" for both the original and a disposable wallpaper, including after restart. Treat local3 as a failed candidate; do not push it.
- Root cause: Wallpaper rendering creates a `blob:` URL, and the shared effects client reads it with `fetch`. The installed Tauri `connect-src` policy lacked `blob:`; its dev policy allowed the localhost origin, which masked the difference in dev mode. The image display itself was allowed by `img-src blob:`.
- Fix: Allow only `blob:` additionally in `connect-src` for production and development. Keep the other CSP directives and wallpaper fallback behavior unchanged.
- Files: `src-tauri/tauri.conf.json`, `src/features/settings/model/newThreadBackgroundEffects.test.ts`, and local plan/release notes.
- Verification: The CSP regression test failed before the fix and passed afterward; focused worker/wallpaper/Settings tests passed (19). `npm run check:web` passed (326 files, 3,644 tests and TypeScript); `CARGO_BUILD_JOBS=1 npm run check:rust` passed fmt, Clippy, 415 tests / 4 ignored; `npm run build` passed with existing CSS highlight, mixed-import, and chunk warnings. ESLint remains unavailable because the repo has no flat config.
- Follow-up: Recheck Halftone in Tauri dev mode, then version and build a new `local4` NSIS installer. Install and verify that candidate before any push. Keep the local3 installer archived.

## 0.1.55-local3-rail-wallpaper - 24 Sept 2026, 22:58 IST - Compact rail and wallpaper release

- What / why: Versioned Windows release for the compact rail shared hover behavior and independent wallpaper Halftone setting, including the wallpaper ownership race fixes.
- Source commits: 4a57b5685cdeba325f7e7a1df5cbea74554f7980 (feat: add compact rail hover and wallpaper halftone); 5948d47c15a95e17540561402129048500cba0cd (chore(release): bump version to 0.1.55-local3-rail-wallpaper).
- Files committed: src-tauri/src/fs.rs, src-tauri/src/lib.rs, src/app/shell/Sidebar.tsx, src/app/shell/SidebarRename.test.ts, src/features/projects/ui/SearchableProjectPicker.tsx, src/features/settings/model/appearance.ts, appearance.test.ts, appearance.wallpaper.test.ts, settings.ts, src/features/settings/ui/SettingsView.tsx, SettingsView.wallpaper.test.ts, src/platform/tauri/fs.ts, src/platform/tauri/fs.test.ts, package.json, package-lock.json, Cargo.toml, Cargo.lock, src-tauri/tauri.conf.json.
- Verification: npm run check:web passed (326 files, 3,642 tests; TypeScript phase clean). CARGO_BUILD_JOBS=1 npm run check:rust passed formatting, Clippy with warnings denied, 415 passed / 4 ignored. npm run build passed. npm run build:windows -- --no-sign passed and produced one x64 NSIS bundle. git diff --cached --check and git diff --check passed on the isolated release source.
- Build warnings: the existing CSS highlight pseudo-element warnings, mixed static/dynamic filesystem import warning, and large-chunk warning remain.
- Installer: E:\Developing\Installable versions\MonoCode_0.1.55-local3-rail-wallpaper_x64-setup.exe; 10,582,617 bytes; SHA-256 5E59FDF78B0B17AB46549BAB63F4209F387B83FF5B84ABB6ACAD98CE86A99663. Source and archive hashes match. App and installer metadata both report 0.1.55-local3-rail-wallpaper; Authenticode status is NotSigned.
- ESLint: changed-file ESLint was not attempted because no root eslint.config.* exists; the existing ESLint 10 flat-config blocker remains.
- Protected WIP: systemBreakdown.ts SHA-256 54B9DFA03305CA37E99B95035910A8C339106ED47C8583E2E1D8DC9EC3072A1F; systemBreakdown.test.ts SHA-256 7363FC14EDA1002A995D3193A8EE116778D3C8D4E6260D6A7F1068613345A708; src-tauri/Cargo.toml SHA-256 894B5D3441D93D8DF11F311AE37FCAD767C2A254C9BDC5B1C0A5BFA7DA6CFCE6. The stash apply normalized line endings, so the original byte backups were copied back and hashes reverified before dropping only stash 3967f13.
- Manual verification: the user reports the requested dev-mode pointers and earlier checks passed. This agent did not open a Tauri UI. The new installed-build verdict is pending.
- Push: none. Await installed-build confirmation, then recheck the personal remote URL and fast-forward state before pushing.

## Unreleased - 24 Sept 2026, 21:48 IST - Wallpaper choice ownership and staged commit

- **What / why:** Fixed a race where opening another wallpaper picker could invalidate the Settings save for a still-successful image render, leaving wallpaper display and restart state out of sync.
- **Invariant:** The displayed image, saved path, Settings state, retained managed file, and live object URL describe one successfully committed choice. Canceling does not revoke pending work; a failed newer choice leaves the last successful choice intact; a successful newer choice or Remove fences older work.
- **Implementation:** Assign choice ownership only after a picker returns a path; stage each managed image under a unique file; save the path and Settings state at the render/CSS commit; retain the active managed file only after overlapping choices settle. Keep the previous wallpaper and URL alive on failed persistence, image read, or required Halftone render. Surface failures while earlier work is still pending.
- **Files touched:** `docs/specs/archive/compact-rail-wallpaper-halftone.md`, `docs/specs/archive/compact-rail-wallpaper-halftone-plan.md`, `src/features/settings/model/appearance.ts`, `src/features/settings/ui/SettingsView.tsx`, `src/platform/tauri/fs.ts`, `src/platform/tauri/fs.test.ts`, `src-tauri/src/fs.rs`, `src-tauri/src/lib.rs`, and `src/features/settings/ui/SettingsView.wallpaper.test.ts`.
- **Verification:** Focused wallpaper/settings/filesystem tests passed (31). Full `npm run check:web` was flaky in unrelated Composer tests: one run passed (326 files / 3,643 tests), the first run failed two Composer cases, and the final repeat failed one (`Composer.test.ts`, attachment ownership). Standalone `npx tsc --noEmit` passed after the final source change. `npm run check:rust` passed formatting, Clippy, and 415 tests (4 ignored) with `CARGO_BUILD_JOBS=1`; the default parallel attempt hit LLVM out-of-memory / `STATUS_STACK_BUFFER_OVERRUN`. `npm run build` passed with the existing CSS highlight pseudo-element, mixed-import, and large-chunk warnings. Final `git diff --check` passed.
- **ESLint:** Changed-file ESLint is blocked because the repository has no `eslint.config.*`; ESLint 10 reports it cannot find a flat config.
- **Follow-up:** Manual Tauri checks remain; no browser/Tauri UI or installer was used. Preserve existing `src-tauri/Cargo.toml` and both `systemBreakdown` working-tree changes.

## Unreleased - 24 Sept 2026, 17:23 IST - Direct integration: compact rail + wallpaper Halftone

- **What / why:** Integrated both requested features into the main `nakul/windows-support` checkout and fixed the wallpaper review races before transfer.
- **Implementation:** Applied the compact-rail changes first, inspected the diff, then transferred the wallpaper changes and both new tests. Wallpaper retains the displayed image URL until a replacement is painted, serializes managed-file persist/clear operations, checks latest action ownership after awaits, lets the latest Halftone toggle win, and reports theme-triggered effect failures in Settings with original-image fallback. Chat background remains independent.
- **Files touched:** Compact rail: `src/app/shell/Sidebar.tsx`, `src/app/shell/SidebarRename.test.ts`, `src/features/projects/ui/SearchableProjectPicker.tsx`. Wallpaper: `src/features/settings/model/appearance.ts`, `appearance.test.ts`, new `appearance.wallpaper.test.ts`, `settings.ts`, `src/features/settings/ui/SettingsView.tsx`, new `SettingsView.wallpaper.test.ts`, `src/platform/tauri/fs.ts`, and `fs.test.ts`.
- **Verification:** `npm run check:web` passed (326 files / 3,636 tests; TypeScript clean); `npm run check:rust` passed (fmt + clippy clean, 413 passed / 4 ignored); `npm run build` passed with existing CSS highlight, mixed-import, and large-chunk warnings. Focused compact rail (45 tests) and wallpaper/filesystem (53 tests) passed. `git diff --check` passed. ESLint is blocked because the checkout has no `eslint.config.*`.
- **Caveats:** No installer or browser/Tauri UI test was run. Manual Tauri dev-mode checks remain in the main checkout. All changes remain uncommitted. Existing edits in `src-tauri/Cargo.toml` and both `systemBreakdown` files were hash-verified unchanged.

## Previous feature worktree notes

## Unreleased - 24 Sept 2026, 16:21 IST - Compact rail hover gap continuity

- **What / why:** Fixed the compact rail highlight dropping while the pointer crosses the spacing between neighboring shortcuts.
- **Root cause / implementation:** The rail action stack uses `gap-1.5`, but had no shared-hover continuity region. The hover resolver keeps the current target only when the pointer is inside a marked ancestor. Marked the main shortcut stack and a separate Settings group; the flexible empty area between them stays outside both groups.
- **Files touched:** `src/app/shell/Sidebar.tsx`, `src/app/shell/SidebarRename.test.ts` in the main `nakul/windows-support` checkout (initially implemented in the temporary compact-rail worktree).
- **Verification:** Regression assertion failed before the markup fix and passed after it. `npm run check:web` passed (324 files / 3,624 tests, TypeScript clean); `npm run build` passed; `npm run check:rust` passed (413 passed / 4 ignored); `git diff --check` passed. ESLint is unavailable because this checkout has no `eslint.config.*`.
- **Caveats:** Manual Tauri hover verification remains pending; the spec now calls out both shortcut-gap continuity and the separation before Settings.
- **Decision / tradeoff:** Keep continuity scoped to the two visible shortcut groups so the marker does not persist across the large flexible spacer.

## Unreleased - 24 Sept 2026, 15:31 IST - Compact rail hover + wallpaper Halftone

- **What / why:** Added the shared sliding highlight to the collapsed project rail and an independent Windows setting to apply the existing Halftone effect to the app wallpaper.
- **Implementation:** Initial development used separate worktrees cut from `60cb05d`: `feature/compact-rail-hover` and `feature/wallpaper-halftone`. Both changes are now directly integrated in the main checkout. The rail has one marker and targets for all compact actions plus the compact project picker; active/open items preserve their own fill. Wallpaper Halftone persists independently, reuses the existing worker, refreshes with wallpaper/theme changes, falls back to the original on errors, ignores stale renders, and releases replaced object URLs. Chat background state is untouched.
- **Files touched:** Compact rail: `src/app/shell/Sidebar.tsx`, `src/app/shell/SidebarRename.test.ts`, `src/features/projects/ui/SearchableProjectPicker.tsx`. Wallpaper: `src/features/settings/model/appearance.ts`, `appearance.test.ts`, new `appearance.wallpaper.test.ts`, `settings.ts`, and `src/features/settings/ui/SettingsView.tsx`.
- **Verification:** Compact rail: `npm run check:web` passed (324 files / 3,624 tests, TypeScript clean), `npm run check:rust` passed (413 passed / 4 ignored), and `npm run build` passed. Wallpaper: `npm run check:web` passed (325 files / 3,628 tests, TypeScript clean), `npm run check:rust` passed (413 passed / 4 ignored), and `npm run build` passed. Focused rail (45 tests) and wallpaper/settings (56 tests) suites passed. ESLint remains unavailable because the repo has no `eslint.config.*`.
- **Caveats:** No installer or manual Tauri UI verification was performed. The required manual checks are in `docs/specs/archive/compact-rail-wallpaper-halftone.md`; perform them from the main checkout.
- **Advantages / tradeoffs:** The two wallpaper effects share the proven worker algorithm but keep separate preference, rendered URL ownership, and CSS variables. The combined feature changes remain uncommitted on `nakul/windows-support` for review.
- **Learnings:** A stale worker result also needs a stale result at the settings boundary; otherwise its CSS write is ignored but an older image choice can still update UI state.

## 0.1.54-local2-upstream-import - 24 Sept 2026, 01:54 IST - Main 0.1.52-0.1.54 merged in (round 2)

- **What / why (1-2 lines):** Second and final staged import of upstream MonoCode 0.1.52-0.1.54: the `src/` reorganize, Automations, Antigravity provider, editor language modes (C/C++/Java/PHP/SQL/XML/YAML + legacy modes), schema v18 (`is_draft`/`automation_id`), and the `createSessionRemover` two-phase transaction. Plus the post-merge repairs and hover/catalog/header fixes recorded in the Unreleased entries below. Decision record: `docs/notes/archive/upstream-merge-2026-09-23.md`.
- **Intentional divergences (do not "fix" later without reading here):**
  1. **Composer send action - ours kept.** Queue/Steer-aware label + Stop stays visible; Main swaps Stop for plain "Send".
  2. **Menu bar - ours, always visible.** Main hides it behind an Alt tap.
  3. **Antigravity = ours.** ACP `agy_acp_server.par`, title "Antigravity ACP", default `antigravity:default`; Main's `providers/antigravity` + `AntigravityBinary`/`antigravity_args` dropped.
  4. **Cline stays as our 11th harness.** Main's `HARNESSES` has 10. ModelPicker test sizes updated for 11 tabs (440/442).
- **Implementation highlights:** schema v18 = our v16 queue/draft columns + their `automation_id` chain (upsert binds all 23 columns; `list_by_project`/`list_scratch` SELECTs extended to the mapper indices); `createSessionRemover` (Main's transaction) adopted with our terminal forget/kill + queue-scheduler eviction folded into `apply("removed")` behind a pure, tested `disappearedTerminalIds` helper; ~130 files had pre-reorganize import paths rewritten (sources, tests, `vi.mock` targets); `format.test.ts` moved beside `shared/lib/format.ts`; Popover hover-pill stacking fixed (glass wash on the frame, content unblurred above the marker); Providers page = one header with discovery status in the action slot; Claude catalog hardening (default slot resolves to its concrete model, 30s probe budget + warn logging, unparseable `--version` keeps the built-in list, force-Recheck) + Codex `codexModelPage` accepts both `nextCursor`/`next_cursor` and `data`/`models`; ContextMeter gauge assertions follow the runtime locale (fixes the `100,000` vs `1,00,000` en-IN failures without changing the user-facing format).
- **Files touched:** ~150 source + 30 test files from the merge plus the fix files listed below. Full trail: `docs/notes/archive/upstream-merge-2026-09-23.md`.
- **Verification (commands + results):**
  - `npx tsc --noEmit`: 0 errors (also re-run inside `build:windows`).
  - `npx vitest run`: 306 files, 3,533 tests passed, 0 failed (up from 3,319 at round-2 staging).
  - `npm run check:rust`: fmt + clippy (`-D warnings`) clean; 394 passed / 0 failed / 4 ignored (up from 345).
  - `npm run build:windows`: NSIS-only (`--bundles nsis --no-sign` + archive script) clean; `MonoCode_0.1.54-local2-upstream-import_x64-setup.exe` (10.01 MB) archived to `E:\Developing\Installable versions\`.
  - `git diff --cached --check` clean. `npx eslint` still blocked (no `eslint.config.*`, pre-existing).
- **Caveats / known issues:** Unix-only `antigravity_launch_args_match_the_platform_registry` (`src-tauri/src/harness.rs` ~4317) still calls Main's removed `antigravity_args()` - future cross-platform cleanup, not a Windows-build blocker (Nakul's call). Upstream **v0.1.55** is already out - pending its own round. The parallel session's Codex extension filtering (`parseCodexConfigToml` + its tests in `systemBreakdown`) intentionally stays unstaged/uncommitted. Installed-build manual test list in the handoff.
- **Advantages / tradeoffs:** two merge rounds kept conflicts readable (~55 + ~70 same-path files instead of one 130-file pileup). Tradeoff: two integration-testing passes and this longer repair trail.
- **Learnings:** tested code != prepared commit - after a big merge, `git status` must show nothing unstaged before the gates mean anything; `vi.mock("path")` strings are invisible to tsc (only Vitest reveals them); a CLI's `list_models` wire is the only honest source for "which models exist" (announcement banners are not catalog data); a full disk (ENOSPC) masquerades as flaky tests and "interrupted" tool runs.

## Unreleased - 24 Sept 2026 - round 3: v0.1.55 merged + CLI update notices + reveal test fix

- **What / why (1-2 lines):** Upstream v0.1.55 (Jira Cloud inbox, transcript Find, session navigation, sidebar toggle, background effects, Opus 5.5 welcome, motion work) merged in round 3. In the same round: a light CLI update notice (toaster with the update command + Copy button) and a fix so `cargo test` no longer opens real Explorer windows.
- **Intentional divergences:** unchanged from rounds 1-2 (Queue/Steer send action, always-visible menu bar, our Antigravity ACP, Cline as 11th harness) - all survived the merge; Composer test contract still green. New nuance: upstream's session-sidebar toggle and Jira inbox landed as new features without touching those seams.
- **Implementation highlights:** v0.1.55 merged `--no-commit` with 13 conflicts resolved per `docs/NOTES.md` (6 mechanical = version `0.1.55-local1-upstream-import` + capabilities opener perms kept; 7 seams = App persistSession early-return + queue key, SessionPane `PooledTranscript` wrapper + our `onReviewFix`/`onSidechat`/`onBranch` replayed from our `:1->:2` delta, InboxFiltersMenu = their tracker gates + our 3 continuity wraps + dot markers + `disambiguateProjectNames`, appearance/settings unions, index.css `both-rev`). CLI notices: `cliVersions.ts` (4 npm channels, registry `latest`, never throws) + `UpdateToasts` toaster (command + Copy) wired into ProvidersPage discovery + Recheck (once per provider per session). `fs.rs::reveal_path` tests now prove the dispatch contract via a hidden `cmd /c exit 1` child instead of launching Explorer.
- **Files touched:** 100+ from the merge (Jira `jira.rs`+`jira.ts`, transcript find/highlights/pool, `wordFade`, `useComposerDockMotion`, `OpusWelcome`, `newThreadBackgroundEffects`) + `cliVersions.ts`/`UpdateToasts.tsx` + tests + `docs/cli-update-check-plan.md`.
- **Verification (commands + results):**
  - `npx tsc --noEmit`: 0 errors.
  - `npx vitest run`: 324 files, 3,625 tests passed, 0 failed (up from 3,533).
  - `npm run check:rust`: fmt + clippy clean; 413 passed / 0 failed / 4 ignored (up from 395).
  - `npm run build` clean. `git diff --cached --check` clean; snapshot truth = only the parallel session's 2 `systemBreakdown` WIP files unstaged.
- **Caveats / known issues:** deferred the 2 post-tag `main` stream fixes (runbook default: tag only). Jira = new provider surface; its API tokens/auth were not manually tested. CLI notices cover npm channels only (grok/omp/fx/hermes/antigravity intentionally silent). Unix `antigravity_args()` test still deferred from round 2.
- **Advantages / tradeoffs:** `git checkout --theirs` on a conflicted file wipes our non-conflicted additions in that file - recovered by replaying our exact `:1->:2` delta; record this in NOTES if not already.
- **Learnings:** a merge conflict file's non-marker regions are merged content (not "shared") - diff stages `:1/:2/:3` for ground truth; their new feature files carried correct post-reorganize paths so round 3 needed almost no path repair (vs ~130 files in round 2).

## Unreleased - 23 Sept 2026 - Providers model lists: latest Claude models missing + duplicated page heading

- **What / why:** (1) The Claude/Codex model lists in Settings > Providers never showed the newest models even though the CLIs know them (Claude Code v2.1.267's own banner says "Opus 5.5 is now your default model"). (2) The Providers page printed its heading twice.
- **Root causes:** (1a) the live `list_models` catalog parse dropped every `value: "default"` row - and on v2.1.267 the default slot IS Opus 5.5 (`resolvedModel: claude-opus-5-5`), named by no other row, so the newest model never reached the picker. (1b) the version fallback gated Opus 5.5 behind `2.1.280` (hidden at 2.1.267). (1c) Claude's `list_models` probe had a 15s budget (the same Windows cold-start timeout that emptied Codex's catalog before) and failures logged at debug level, and once any catalog landed `hasLiveCatalog` blocked every Recheck. (1d) Codex `model/list` paging only read `nextCursor`/`data`, so an app-server build using `next_cursor`/`models` silently truncated at page one. (2) ProvidersPage rendered its own `PageHeader` on top of the settings shell's, printing title + description twice.
- **Implementation:** default-slot rows now resolve to their concrete `resolvedModel` (labelled "Opus 5.5", not "Default (recommended)") and are kept up front only when no other row names that model (the covered `default -> sonnet-5` + `sonnet` case still de-dupes); `MINIMUM_CLAUDE_OPUS_5_5_VERSION` = 2.1.267 with the CLI-banner evidence; unparseable `--version` keeps the built-in list instead of a gated one; Claude discovery budget 15s -> 30s and warns on failure (Codex parity); `refreshHarnessCatalogs(ids, { force: true })` used by Recheck; `codexModelPage` accepts both envelope spellings; ProvidersPage keeps only its compact discovery status row (the shell titles the section).
- **Files touched:** `src/integrations/harness/providers/claude/claudeCatalog.ts`, `claudeProtocol.ts`, `claudeProtocol.test.ts`, `src/integrations/harness/providers/codex/codexCatalog.ts`, `codexProtocol.test.ts`, `src/integrations/harness/core/registry.ts`, `registry.test.ts`, `src/features/settings/ui/SettingsView.tsx`.
- **Verification:** `npx tsc --noEmit` 0; `npx vitest run` 306 files / 3,533 tests passed (0 failures, default temp env); `npm run build` clean. Rust unchanged since the 394-passed run (not re-run).
- **Caveats / known issues:** needs a dev-app restart to see (installed build unaffected until the next installer). Codex's list is live-only by upstream design (no built-in rows) - confirm what its row shows now. Earlier Composer test "flakes" were C: disk-full (ENOSPC) artifacts, not timing - the sleep-based waits are restored and green.

## Unreleased - 23 Sept 2026 - popover hover pill invisible (Automations trigger submenu)

- **What / why:** Hovering rows in popover menus (Add Trigger > Scheduled > Hourly/Daily/Weekdays/Weekly) showed no highlighted row. Root cause: the `.popover-surface` glass wash + `backdrop-filter` lived on the animating content layer that stacks ABOVE the sliding hover marker - the blur smeared the pill away while `[data-shared-hover-active]` cleared the row's own `hover:` background, so the hovered row showed nothing at all. Sidecar lists (menu bar, sidebar, notes, inbox) were unaffected: their marker sits under transparent, unblurred rows.
- **Implementation:** `src/shared/ui/Popover.tsx` paints the wash on the stable frame (`FRAME + popover-surface`; `bare` keeps `popover-surface` alone) and the content layer above the marker stays transparent/unblurred - matching the existing comments ("Keep the backdrop-filter on a stable frame... Only this unblurred content layer moves" and "Animate content only; its sibling glass stays still"). The `.popover-surface [data-shared-hover-highlight]` highlight rule matches the marker again (now a descendant of the frame). Regression test `src/shared/ui/Popover.hover.test.ts` locks the stacking contract and row activation.
- **Files touched:** `src/shared/ui/Popover.tsx`, `src/shared/ui/Popover.hover.test.ts`.
- **Verification:** `npx tsc --noEmit` 0; full web suite 306 files / 3,529 tests passed (0 failures); `npm run build` clean; focused hover suites (Popover.hover, SharedHoverHighlight, InboxView, NotesView.hover, InboxFiltersMenu, Sidebar, ChatPanel) 41/41. Rust unchanged since the 394-green run (not re-run).
- **Caveats:** visual confirmation of the pill needs a human look (no browser per the working agreement). The same stacking bug affected every popover menu (SelectMenu, ModelPicker flyouts, tab-group submenus, project mute menu) - they all get the pill back with this fix.

## Unreleased - 23 Sept 2026 - round-2 merge staged and verified (pre-commit)

- **What / why:** The tested code was not the prepared merge snapshot: 103 tracked files plus one untracked test held unstaged merge repairs. All intended repairs are staged and re-verified now; the merge is ready for manual dev-app testing. The parallel session's Codex extension filtering (`parseCodexConfigToml` + its tests in `systemBreakdown`) stays unstaged, as they recorded below.
- **Implementation:** hunk-level staging kept only the `./fs` -> `../../../platform/tauri/fs` dynamic-import fixes in `systemBreakdown.ts`; `format.test.ts` landed at `src/shared/lib/format.test.ts` (rename resolves `src/lib/format.test.ts -> src/shared/lib/format.test.ts`); removed the duplicate `harness_resolve_antigravity` Tauri registration (`src-tauri/src/lib.rs`); `ContextMeter.test.ts` gauge expectations now build their numbers with `.toLocaleString()` (the same call the component makes) so they follow any runtime locale - honest fix for the `100,000` vs `1,00,000` failures, user-facing number format unchanged. New regressions: `disappearedTerminalIds` pure helper extracted from App's session-removal `apply("removed")` handler (+4 tests), `QueueDurabilityScheduler.removeSession` (track cleared, scheduled write cancelled), `list_scratch` carries `draft` + `automation_id`.
- **Files touched:** `src-tauri/src/lib.rs`, `src-tauri/src/session_store.rs`, `src/app/App.tsx`, `src/features/workspace/model/terminalPanes.ts` + `terminalPanes.test.ts`, `src/features/sessions/model/queueDurability.test.ts`, `src/features/sessions/ui/ContextMeter.test.ts`, plus the 103 staged repair files and the `format.test.ts` move.
- **Verification:** `npx tsc --noEmit` 0 errors; `npx vitest run` 305 files all passing (0 failures); `npm run build` clean; `npm run check:rust` fmt + clippy (`-D warnings`) clean, 394 passed / 4 ignored; `git diff --cached --check` clean; `git status` shows only the 2 WIP files unstaged.
- **Caveats / known issues:** Unix-only test `antigravity_launch_args_match_the_platform_registry` (`src-tauri/src/harness.rs` ~4317) calls the removed `antigravity_args()` and will not compile on Linux/macOS; recorded as future cross-platform cleanup (this build is Windows-only, per Nakul). Manual in-app testing pending; no installer built.

## Unreleased — 23 Sept 2026, 20:32 IST — Context meter excludes disabled Codex extensions

- **What / why:** Codex's context breakdown counted MCP servers and plugins even when their config said `enabled = false`, making the estimate appear larger than it should.
- **Implementation:** `parseCodexConfigToml` now reads each top-level MCP/plugin section and excludes disabled entries. Nested sections cannot accidentally change their parent server's state; entries without an explicit flag remain included.
- **Files touched:** `src/features/sessions/model/systemBreakdown.ts`, `src/features/sessions/model/systemBreakdown.test.ts`.
- **Verification:** Regression test failed before the fix and passed after (8/8 focused); `npm run build` clean; `npm run check:rust` clean (393 passed, 4 ignored); full web run had 3,519 passing tests and the three already documented `ContextMeter` locale-format failures (`100,000` versus `1,00,000`). TypeScript passed as part of both web check and build. ESLint is unavailable in this repo (no installed binary/config).
- **Caveat:** The category token amounts remain estimates, not provider-reported per-extension usage. The upstream merge is still open; this fix was left unstaged and uncommitted.

## Unreleased - 23 Sept 2026 - Main 0.1.52-0.1.54 merged (round 2)

- **What / why (1-2 lines):** Final upstream import: the `src/` reorganize, Automations, the Antigravity provider, editor language modes, and ~150 fixes are in. Version label `0.1.54-local1-upstream-import`. Decisions appended to `docs/notes/archive/upstream-merge-2026-09-23.md`.
- **Intentional divergences (do not "fix" later without reading here):** 1) Composer send action - ours (Queue/Steer-aware label + Stop stays visible); Main swaps Stop for plain "Send". 2) Antigravity provider - ours (`integrations/harness/core/antigravity*`, `src-tauri/src/antigravity_acp.rs`, title "Antigravity ACP", default model `antigravity:default`); Main's `providers/antigravity` + `AntigravityBinary`/`antigravity_args` dropped. 3) Menu bar - ours, always visible (Main hides it behind an Alt tap). 4) Cline remains our 11th harness (Main has 10).
- **Implementation highlights:** schema v18 = our v16 queue/draft columns + their `automation_id`/migration chain; `SessionRecord`/`SessionSummary` carry `draft` + `automation_id` end to end (the upsert INSERT now binds all 23 columns; `list_by_project`/`list_scratch` SELECTs extended to match the mappers). Main's `createSessionRemover` two-phase transaction adopted; our terminal forget/kill + queue-scheduler eviction folded into its `apply("removed")` handler. Roughly 100 source files and 30 test files had pre-reorganize import paths rewritten (including `vi.mock` targets), `shared/lib/format.ts` kept its home and `format.test.ts` moved beside it.
- **Files touched:** ~150 source files + 30 test files. Full record: `docs/notes/archive/upstream-merge-2026-09-23.md`.
- **Verification:** `npx tsc --noEmit` 0 errors; `npx vitest run` 304 files / 3,319 tests passed, 0 failed; `npm run check:rust` fmt + clippy (`-D warnings`) clean, 393 passed / 4 ignored; `npm run build` clean. ESLint remains blocked (no `eslint.config.*`, pre-existing).
- **Test-expectation updates (not weakening):** `ModelPicker.test` flyout size 404/406 -> 440/442 (the size formula counts our 11th provider tab) and the Antigravity tab selector `"Antigravity"` -> `"Antigravity ACP"` (our title).

## Unreleased — 23 Sept 2026 — Providers discovery progress

- **What / why:** Opening Settings → Providers already checks binaries and model catalogs across eligible providers. The page now shows a compact header status and keeps every Recheck disabled until those initial requests settle.
- **Implementation:** `ProvidersPage` owns both concurrent requests and reports checking, ready, or top-level failure. `ProviderRow` retains later per-row catalog refresh behavior; `PageHeader` accepts an optional action slot. No startup discovery or manual Recheck scope changed.
- **Files touched:** `src/surfaces/SettingsView.tsx`, `src/surfaces/ProvidersPage.test.ts`; local plan and spec in `docs/`.
- **Verification:** `npm run build` clean; focused Providers/availability/registry tests 15/15; full web suite excluding the unrelated locale-sensitive `ContextMeter.test.ts` 280 files / 3,075 tests passed; `cargo fmt --check`, `cargo check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test` clean (345 passed, 4 ignored); `git diff --check` clean. Full Vitest has three existing `ContextMeter` grouping assertions failing under this machine's `en-IN` locale. ESLint remains unavailable (no local package or `eslint.config.*`).
- **Caveats / known issues:** Manual in-app visual check pending. An installed build was not made. The per-row Recheck still probes all providers' availability after initial discovery, as previously identified; catalog refresh remains per selected row.
- **Advantages / tradeoffs:** Reuses the existing spinner and button primitives; waits for all initial work, including Antigravity catalog discovery, so the status and disabled controls agree. No new dependency.
- **Learnings:** Provider rows mount together; coordinating discovery at the page boundary is needed for an accurate shared progress state.

## 0.1.51-local1-upstream-import — 23 Sept 2026 — Main's 0.1.45–0.1.51 merged in

- **What / why (1–2 lines):** Staged import of upstream MonoCode 0.1.45–0.1.51 (round 1 of 2; the `src/` reorganize + 0.1.54 remain). Brings worktrees, agent orchestration, saved drafts, named provider accounts, Hermes agent, automations groundwork, settings search, Windows tray/notifications, and ~70 fixes. Decision record: `docs/notes/archive/upstream-merge-2026-09-23.md`.
- **Intentional divergences (do not "fix" later without reading here):**
  1. **Composer send action — ours kept.** While an agent is busy, the send button keeps its Queue/Steer-aware label (`actionAriaLabel`) and Stop stays visible next to it. Main replaces Stop with a plain "Send". We kept ours because the queue/steer system is a core local feature; `src/chrome/Composer.test.ts` documents the contract. — Nakul, 23 Sept 2026.
  2. **Project mute menu — Main's.** "Resume notifications" leads the menu; our hover marker moved to the popover frame so the sliding highlight survives Main's child-order contract (`src/chrome/Popover.tsx`).
  3. **Settings rows — Main's order, all functionality kept.** Our wallpaper/menu rows live in a "Wallpaper & menus" group between Main's Color and Translucency groups; wallpaper opacity always renders (disabled until chosen) so settings search can reveal it.
- **Implementation highlights:** schema v16 = our v14 queue reconciliation + their v15/16 worktree columns (`session_store.rs`); worker sessions hide from project lists inside our Windows path-compatible queries; both token feeds (`usage` + `turn.metrics`) share one cost/context pipeline; Main's grouped provider rows carry our lazy-loading flag.
- **Files touched:** 55 conflict files + 237 clean additions from Main + our re-attachments. Full file-by-file: `docs/notes/archive/upstream-merge-2026-09-23.md`.
- **Verification (commands + results):**
  - `npx tsc --noEmit`: 0 errors.
  - `npx vitest run`: 281 files, 3,082 tests passed, 0 failed (up from 2,318 pre-merge).
  - `npm run check:rust`: fmt + clippy (`-D warnings`) clean; 345 passed / 0 failed / 4 ignored (up from 267).
  - `npx eslint . --fix`: still blocked (no `eslint.config.*`, pre-existing).
- **Caveats / known issues:** round 2 (`v0.1.51..v0.1.54`, including the `src/features/*` reorganize) not yet merged — expect rename-heavy conflicts plus an Antigravity-provider reconciliation (ours vs their #314). In-app testing of the merged UI still pending.
- **Advantages / tradeoffs:** staged import kept conflicts readable (55 same-path files in round 1 vs 130 with rename noise in one shot). Tradeoff: two merge rounds mean two integration-testing passes.
- **Learnings:** merge conflicts whose sides end mid-structure need the shared tail inspected before choosing a side; `get_session`'s column indices must track the SELECT list exactly after any union; Main's tests encode DOM-order contracts (menu first/last child) that conflict with overlay markers — moving the marker to the frame layer satisfies both.



- **What / why (1–2 lines):** Cold launch restored layout but spawned a shell per saved terminal (12 PowerShell processes for 12 saved entries) and launched provider runtimes (Antigravity ACP handshake + shared runtime) merely because old conversations existed. Now restored terminals stay dormant until deliberately started, and provider discovery waits for explicit interaction.
- **Implementation:**
  1. *Terminal lifecycle controller* (`src/lib/terminalLifecycle.ts`): in-memory wanted/starting/live/failed sets. Nothing persisted — every launch starts dormant. `requestTerminalStart` dedupes concurrent spawns; failure latches until explicit retry; `forgetTerminal` on close lets cleanup kill a pending child without harming Strict Mode remounts.
  2. *TerminalView split:* dormant placeholder (folder title, "Nothing is running", Start Terminal button) vs live xterm view. Deferred first spawn, guarded cleanup (`killPty` only when unwanted), exit Restart + failure Retry via `role="status"` bar. Same component serves dock + workspace panes.
  3. *App wiring:* boot probe/catalog/model-normalization effect deleted; `startTerminal` on new-terminal creation, panel show/open (active entry only, no fan-out), dormant tab/file select, Start action; `forgetTerminal` + `killPty` on every close path (dock, pane, tab, session removal, project forget/archive). `sessionFromStub` keeps saved model/settings verbatim instead of normalizing against the fallback catalog.
  4. *Provider discovery:* `hasHarnessEvidence`/`noteHarnessEvidence` + `exclude` on `probeHarnessAvailability`; Antigravity catalog success/sign-in notes availability so the 30 s handshake and shared-runtime acquisition never run side by side; picker/Providers/second-opinion use per-harness evidence with "Checking availability…" / "Not checked yet" honesty states.
  5. *Legacy path repair* (`src/lib/legacyProjectPath.ts` + snapshot boundary): `e%3A/...` → `e:/...` only for a leading drive prefix; literal `%` filenames untouched; duplicate docks merged by `pathKey`.
- **Files touched:** `src/lib/terminalLifecycle.ts` (new), `src/lib/legacyProjectPath.ts` (new), `src/surfaces/TerminalView.tsx`, `src/App.tsx`, `src/lib/workspaceSnapshot.ts`, `src/lib/harness/availability.ts`, `src/lib/harness/antigravityCatalog.ts`, `src/chrome/ModelPicker.tsx`, `src/chrome/SecondOpinionButton.tsx`, `src/surfaces/SettingsView.tsx`, `src/lib/secondOpinion.ts`, plus 8 test files (4 new).
- **Verification (commands + results):**
  - `npx tsc --noEmit`: clean (0 errors).
  - `npx vitest run`: 205 files, 2,318 tests passed, 0 failed (42 new: 9 lifecycle, 6 path repair, 6 availability, 3 catalog evidence, 9 TerminalView render, 3 surface parity, 2 quit cleanup, 3 snapshot repair/preservation, 1 second-opinion).
  - `cargo fmt --check`: clean. `cargo check`: clean. `cargo clippy --workspace --all-targets -- -D warnings`: clean. `cargo test`: 267 passed, 0 failed, 4 ignored.
  - `git diff --check`: clean.
  - `npx eslint . --fix`: blocked, exit before linting — repo has no `eslint.config.*` (pre-existing tooling blocker, also recorded for local4/local5; no config created).
- **Build-time gate re-run (23 Sept 2026):** `npm run check:web` clean (206 files, 2,323 tests — +1 file / +5 tests vs 15 Sept; includes `src/surfaces/ProvidersPage.test.ts`, another session's WIP that appeared mid-session and was left hands-off); `npm run check:rust` clean (`cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test` 267 passed / 0 failed / 4 ignored); `npx eslint . --fix` still blocked (no `eslint.config.*`).
- **Built artifact (not yet installed or in-app tested):**
  - Version: `0.1.44-local8-lazy-terminal` (manual bump across `package.json`, `package-lock.json` x2, `Cargo.toml`, `Cargo.lock`, `src-tauri/tauri.conf.json` — `bump-version.mjs` rejects text suffixes).
  - Installer: `E:\Developing\Installable versions\MonoCode_0.1.44-local8-lazy-terminal_x64-setup.exe` (also at `target\release\bundle\nsis\`, archived by `scripts/archive-installer.mjs`).
  - Size: `9,685,825` bytes (9.24 MB).
  - UTC timestamp: `2026-09-23T03:54:43Z` (local `2026-09-23 09:24:43`).
  - SHA-256: `E15B7998D76456D1CDD050B7CD7ECC4AEFC64F6D2FB9F1357F369DA26E077BB4`.
  - Authenticode: `NotSigned`. NSIS-only (`npm run build:windows` = `tauri build --bundles nsis --no-sign`), per the MSI-rejects-text-suffixes rule.
  - Verdict: build snapshot taken as a checkpoint before the upstream import work, at Nakul's request — the 15 Sept in-app checks (docs/WINDOWS-CHANGES.md) are still outstanding; installed-runtime verdict pending.
- **Caveats / known issues:**
  - Multi-window same-terminal concurrent start is last-wins (shared backend id); no `stage_window_transfer` call sites exist, so transfer payloads restore dormant.
  - Cross-window live-terminal adoption not wired (nothing stages transfers today).
  - In-app UI verification still needed (no browser/Playwright per instructions).
- **Advantages / tradeoffs:**
  - Keep-mounted + deferred-spawn chosen over runtime/view separation: smallest change that keeps builds/dev servers alive across hide/switch; placeholder mounts are cheap. Full runtime ownership split deferred.
  - Queue recovery semantics untouched; an intentional queued dispatch may still start its provider.
- **Learnings:**
  - Snapshot restore normalized models twice (App boot effect + `sessionFromStub` via `newSession`); both had to go.
  - Updaters must stay pure — close kills live in handler bodies, never inside `setState` updaters (Strict Mode double-invokes them).
  - SocratiCode MCP tools were not registered in this session; native grep + reads covered mapping, verified against source/tests/diff.

## Template (copy for each entry)
<!--
## <version> — <date> — <title>

- What / why (1–2 lines):
- Implementation:
- Files touched:
- Verification (commands + results):
- Caveats / known issues:
- Advantages / tradeoffs:
- Learnings:
-->

## 0.1.35-local5-queue-durability — 12 Sept 2026 — Queue durability, SQLite migration 12, non-native steer cancellation, and lifecycle holds

- **What / why (1–2 lines):** Hardening release delivering full queue durability across application restarts and crashes, stopping auto-dispatch races into failed turns via an explicit `held` lifecycle state, orchestrating non-native Steer cancellation with a 15-second settlement barrier, and introducing a dedicated `QueueDurabilityScheduler` with bounded write latency and in-flight coalescing.
- **Implementation:**
  1. *Why queue durability was needed:* In local4, queued follow-ups existed purely in React memory. Restarting MonoCode or crashing lost all queued prompts; provider errors triggered auto-dispatch of the next prompt into broken turns; clicking Steer on non-native harnesses (e.g. Antigravity) raced active turns; streaming tokens postponed persistence writes indefinitely; and concurrent queue edits could corrupt state.
  2. *SQLite migration 12:* Added `queued_messages_json TEXT` and `queue_status TEXT` columns to the `sessions` table in `src-tauri/src/session_store.rs`. Empty queues store `NULL` instead of empty JSON arrays `[]` to keep database size compact and avoid covering index clutter.
  3. *Queue payload validation and corruption degradation:* `persistableQueuedMessages` in `src/lib/sessionStore.ts` strips ephemeral `previewUrl` blob URLs while preserving filesystem paths or inline base64 data. `restoreQueuedMessages` strictly validates rows on load (requiring non-empty text, valid attachments, note cards, or handoff cards) and drops orphan statuses when no valid rows remain. In `src-tauri/src/session_store.rs`, `get_session` deserializes `queued_messages_json` safely using `.ok()`, gracefully degrading corrupt or malformed queue JSON to `None` without crashing session loading, preserving transcript blocks and model settings intact.
  4. *Durable Queue/Steer states:* Extended `MessageQueueStatus` in `src/lib/session.ts` with `"steering"` and `"held"`. On persistence, transient states (`resuming`, `steering`) are normalized to `"paused"` so sessions never restore in active cancellation loops.
  5. *QueueDurabilityScheduler:* Extracted `QueueDurabilityScheduler` in `src/lib/queueDurability.ts` as the single owner for queue-triggered durability writes.
  6. *Bounded persistence while streaming:* Bounded 400ms debounced persistence triggers immediately upon queue mutations, completely decoupled from assistant streaming tokens. Streaming token updates never reset or postpone the scheduled queue write deadline.
  7. *Per-session write serialization and in-flight coalescing:* Enforces at most one scheduler write in flight per session (`track.inFlightKey`). Mutations occurring while a write is in flight are coalesced and written in a single follow-up write once the in-flight write resolves.
  8. *Retry behavior:* On SQLite upsert failure, dirty state is retained and retried autonomously with exponential backoff.
  9. *Strict Mode scheduler lifecycle:* Implemented `getOrCreateScheduler()` in `src/App.tsx`, ensuring React Strict Mode dev-mode double-invocation recreates an active scheduler, transfers known persisted keys via `getPersistedKeys()`, and observes current sessions without dropping persistence. Unmount cleanup disposes the scheduler, canceling pending retries and suppressing completion callbacks.
  10. *Failure-to-Held transition and Resume behavior:* Synchronously inspects turn completion in `orchestrateTurnCompletion` (`src/lib/messageQueue.ts`). If provider failure is detected (`session.error`, rejection, or failure text), immediately transitions non-empty queues to `"held"` and sets `busy: false` in both React state and `sessionsRef.current` BEFORE any await or event loop yield, eliminating the auto-dispatch race. On `onResumeQueue`, status `"held"` transitions to `"active"`, allowing auto-dispatch to submit the head as a fresh turn.
  11. *Non-native Steer cancellation barrier:* When clicking Steer on a queued row for non-native harnesses (Antigravity) or Plan intent: reorders the item to head, invalidates stale events with an incremented `turnGen`, requests harness cancellation, and enters transient `steering` state (`busy: true`, `queueStatus: "steering"`). Enforces a 15-second cancellation settlement barrier via `settleQueuedSteerCancellations`. On full acknowledgment, transitions to `"active"` to auto-dispatch; on timeout or failure, transitions to `"held"` with `session.error`.
  12. *Steering edit/delete locks:* Composer status banner renders `role="status"` and `aria-live="polite"`. Entering `steering` immediately clears local edit drafts and notifies parent handlers. All Edit, Delete, Steer, and Composer save actions are strictly guarded against `steering` in `MessageQueue` (`src/chrome/Composer.tsx`) and `src/App.tsx`.
- **Files touched:**
  - `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`, `src-tauri/tauri.conf.json` (version bump)
  - `src-tauri/src/session_store.rs` (SQLite migration 12, upsert/get with safe degradation, unit tests)
  - `src/lib/session.ts` (extended `MessageQueueStatus` with `steering` and `held`)
  - `src/lib/messageQueue.ts` (cancellation barrier, `orchestrateTurnCompletion`, dispatch checks)
  - `src/lib/messageQueue.test.ts` (unit tests for helpers and cancellation settlement)
  - `src/lib/sessionStore.ts` (sanitization, strict restore validation, fingerprinting)
  - `src/lib/sessionStore.test.ts` (round-trip, corruption, and validation tests)
  - `src/lib/queueDurability.ts` (QueueDurabilityScheduler with in-flight barrier and retry)
  - `src/lib/queueDurability.test.ts` (fake-timer, concurrency, streaming decoupling, Strict Mode tests)
  - `src/chrome/Composer.tsx` (status banners, accessibility, edit/delete locks during steering)
  - `src/chrome/Composer.test.ts` / `MessageQueue.test.ts` (UI state and locking tests)
  - `src/App.tsx` (scheduler wiring, synchronous failure hold, steer orchestration, unmount cleanup)
- **Commits:**
  - `8ebde6d`: `feat(session): persist queued messages across restarts in sqlite schema v12`
  - `ae0c675`: `feat(queue): add QueueDurabilityScheduler with debounced persistence, in-flight barrier, and retry`
  - `a8928e3`: `feat(queue): orchestrate steer cancellation, queue lifecycle holds, and App integration`
  - `06e3668`: `chore(release): bump version to 0.1.35-local5-queue-durability`
- **Automated verification:**
  - `npx tsc --noEmit`: Clean (0 errors).
  - `npx vitest run`: 152 test files, 1,658 tests passed (0 failures).
  - `npm run check:web`: Clean (152 test files passed, 1,658 tests passed; `tsc --noEmit` 0 errors).
  - `npm run check:rust`: Clean (`cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test` 225 passed, 4 ignored, 0 failed).
  - `git diff --check 81ade2043cbb1835246e745a64be37297dea976a..HEAD`: Clean (0 whitespace/conflict errors).
  - Search for `lastQueueKey`: Zero occurrences across codebase.
  - Stale comments/BOM: Zero UTF-8 BOMs in touched `.ts`/`.tsx` files; trailing newlines intact; no accidental `any`.
  - `npx eslint . --fix`: Reported exit code 1 due to missing `eslint.config.*` (pre-existing repository tooling limitation; zero source files modified).
- **Verified installed artifact:**
  - Version: `0.1.35-local5-queue-durability`
  - Installer path: `E:\Developing\Installable versions\MonoCode_0.1.35-local5-queue-durability_x64-setup.exe`
  - Size: `9,403,036` bytes
  - UTC Timestamp: `2026-09-11T16:25:47.4606364Z` (Local: `2026-09-11T21:55:47.4606364+05:30`)
  - SHA-256: `5F4BE05AEEE193C346304EAF4867E6256BF854757A1BEC6C718FA0CAED0541DF`
  - Authenticode: `NotSigned`
  - Installed-runtime verdict: Installed candidate verified working by Nakul; no installed-runtime issues were reported. Local5 is approved for integration and final closeout.
- **Caveats / known issues:**
  - ESLint 10.10.0 fails with exit code 1 repository-wide due to missing flat configuration (`eslint.config.*`), an untouched pre-existing repository tooling limitation.
  - Unsigned installer executable (`NotSigned`), as official code signing is deferred to upstream maintainer infrastructure.
- **Advantages / tradeoffs:**
  - Separate `QueueDurabilityScheduler` prevents streaming tokens from delaying queue persistence while eliminating redundant writes.
  - Safe deserialization (.ok()) protects transcripts against corrupted queue blobs.
  - Tradeoff: In-flight write coalescing delays persistence of subsequent rapid mutations until the current write finishes, but guarantees FIFO ordering and consistency.
- **Learnings:**
  - Asynchronous checkpoints after turn failure open hazardous auto-dispatch race windows; critical state transitions (`held`, `busy: false`) must be committed synchronously before any Promise yield.
  - React Strict Mode double-invocation in development will silently break single-instance managers unless instances are explicitly recreated or preserved across setup/cleanup/setup cycles.

## 0.1.35-local4-token-usage — 11 Sept 2026 — Token, Windows editor, diff, and interaction hardening


- **What / why (1–2 lines):** Hardening release for Windows support on the direct-integration branch (`nakul/windows-support`). Unifies newline handling across editing and staging, enables opening deleted files directly as read-only diffs, adds experimental detailed context inspection and remaining quota display, hardens turn ownership and session costing telemetry, unifies composer Queue/Steer keyboard actions, and ensures smooth shared-hover pill transitions across list gaps.
- **Implementation:**
  1. *Windows newline normalization and safe staging:* Internal LF canonicalization for CodeMirror/diffs; preserve CRLF on save when detected; Tauri Rust backend path-aware clean filter emulation matching native Git attributes during staging; elimination of CRCRLF blank lines.
  2. *Source Control navigation and deleted-file diffs:* Widen click hitboxes to full row; open deleted files directly into read-only Git diff views (`newGitDiffTab`) with staged/unstaged awareness; Windows path separator matching (`\` vs `/`); preserve tab focus and workspace snapshots.
  3. *Experimentation settings, Detailed Context, and Remaining Quota:* Settings → Experimentation page hosting toggles for Detailed Context (default OFF with clean two-line summary fallback; full segmented bar, memory files, skills, and model costing inspector when ON) and Remaining Quota (default OFF, displaying `XX% left` across ContextMeter and UsageFooter instead of consumed quota).
  4. *Telemetry lifecycle and costing correctness:* Retain latest-turn usage after completion; compute cumulative session usage; prevent active-turn double counting; ensure user steering messages do not usurp turn ownership or duration metrics from the primary turn.
  5. *Composer Queue/Steer keyboard behavior:* Shift+Enter always inserts newline; Enter executes configured Queue or Steer behavior while busy; Ctrl+Enter / Cmd+Enter executes the alternate action; unified suggestion action resolver (`resolveEffectiveSuggestionAction`) handling slash commands and mentions; bare `/` remains open; ignore IME composition; dynamic Send button tooltip and aria-label.
  6. *Shared-hover continuity and consumer integrations:* Smooth shared hover pill motion across list gaps (`data-shared-hover-continuity`) across Sidebar, Inbox filters, Chats, Sidechats, and Notes; stop transitions at section dividers and folders; preserve persistent active-row background; cache-first NotesView loading via `peekNotes()` to eliminate initial open flicker.
- **Files touched:**
  - *Area 1 (Newline/staging):* `src-tauri/src/fs.rs`, `src/lib/fs.ts`, `src/lib/format.ts`, `src/lib/format.test.ts`, `src/lib/lineEndings.ts`, `src/lib/lineEndings.test.ts`, `src/lib/unifiedDiff.ts`, `src/lib/unifiedDiff.test.ts`, `src/surfaces/editorDoc.ts`, `src/surfaces/editorDoc.test.ts`, `src/surfaces/editorGit.ts`, `src/surfaces/editorGit.test.ts`, `src/surfaces/FileEditor.tsx`
  - *Area 2 (Source Control/diffs):* `src/App.tsx`, `src/chrome/GitChangesPanel.tsx`, `src/chrome/GitChangesPanel.test.ts`, `src/chrome/SourceControl.tsx`, `src/chrome/SurfaceTabs.tsx`, `src/chrome/SurfaceTabs.test.ts`, `src/lib/layout.ts`, `src/lib/layout.test.ts`, `src/lib/workspaceSnapshot.ts`, `src/lib/workspaceSnapshot.test.ts`, `src/surfaces/FilePane.tsx`, `src/surfaces/FilePane.test.ts`, `src/surfaces/GitFileDiffView.tsx`, `src/surfaces/GitFileDiffView.test.ts`, `src/surfaces/WorkingTreeDiff.tsx`, `src/surfaces/WorkingTreeDiff.test.ts`, `src/surfaces/diffPathMatching.ts`, `src/surfaces/filePaneSelection.ts`, `src/surfaces/gitFileDiffViewState.ts`
  - *Area 3 (Experimentation/Context/Quota):* `src/chrome/ContextMeter.tsx`, `src/chrome/ContextMeter.test.ts`, `src/chrome/Experimentation.test.ts`, `src/chrome/SettingsRail.tsx`, `src/chrome/UsageFooter.tsx`, `src/lib/rateLimits.ts`, `src/lib/rateLimits.test.ts`, `src/lib/settings.ts`, `src/lib/settings.test.ts`, `src/lib/tokenCosting.ts`, `src/lib/tokenCosting.test.ts`, `src/surfaces/SettingsView.tsx`
  - *Area 4 (Telemetry/Costing):* `src/lib/harness/apply.ts`, `src/lib/harness/apply.test.ts`, `src/lib/harness/tokenUsageLifecycle.test.ts`, `src/lib/tokenAccounting.ts`, `src/lib/tokenAccounting.test.ts`, `src/surfaces/SessionPane.tsx`
  - *Area 5 (Composer Queue/Steer):* `src/chrome/Composer.tsx`, `src/chrome/composerAction.ts`, `src/chrome/composerAction.test.ts`, `src/lib/settings.ts`, `src/lib/settings.test.ts`, `src/surfaces/SessionPane.tsx`
  - *Area 6 (Shared Hover/Continuity):* `src/chrome/SharedHoverHighlight.tsx`, `src/chrome/SharedHoverHighlight.test.ts`, `src/chrome/InboxFiltersMenu.tsx`, `src/chrome/InboxFiltersMenu.test.ts`, `src/chrome/Sidebar.tsx`, `src/chrome/Sidebar.test.ts`, `src/lib/sessionFolders.ts`, `src/lib/sessionFolders.test.ts`, `src/surfaces/ChatPanel.tsx`, `src/surfaces/ChatPanel.test.ts`, `src/surfaces/InboxView.tsx`, `src/surfaces/InboxView.test.ts`, `src/surfaces/NotesView.tsx`, `src/surfaces/NotesView.test.ts`
- **Automated verification:**
  - `npm run check:web` (vitest + tsc): 150 test files, 1,595 tests passed; TypeScript clean (0 errors).
  - `npm run check:rust` (`cargo fmt --check`, `cargo clippy`, `cargo test`): clean, 221 tests passed, 0 failed.
  - `npx eslint . --fix`: reported exit code 1 due to missing `eslint.config.*` (pre-existing repository tooling limitation; no files modified).
  - `git diff --check`: clean (0 whitespace / conflict issues).
- **Installed-runtime verification:**
  - Installer: `E:\Developing\Installable versions\MonoCode_0.1.35-local4-token-usage_x64-setup.exe`
  - Size: `9,392,024` bytes
  - Timestamp: `2026-09-11 07:23:02 UTC`
  - SHA-256: `574A196841539C9F410145A2A40226408FD536B2579885140A8A6FD3A33F0068`
  - Authenticode: `NotSigned`
  - Runtime verdict: Fully verified working by Nakul on Windows, including Notes/Chats shared-hover corrections, context inspector toggles, deleted-file git diff tabs, and queue/steer composer hotkeys.
- **Caveats and known deferred work:**
  - Gitignored file mentions in chat `@` search (deferred; not in local4).
  - VS Code-style preview tabs and replace-versus-pin behavior.
  - Animated movement of persistent active selection backgrounds.
  - File context menus in Explorer.
- **Advantages / tradeoffs:**
  - Experimentation settings default OFF avoids cognitive load for casual usage while providing deep diagnostics for power users.
  - Cache-first `peekNotes()` provides instant rendering without layout shift.
  - Rust clean filter staging guarantees byte-for-byte git parity on Windows.
- **Learnings:**
  - Line-ending handling must be canonicalized at every layer (memory, UI, git index).
  - Multi-action inputs (Enter / Shift / Ctrl / IME) require a single pure resolution function to avoid edge-case regressions across platforms.

### Historical Component Detail: Quota Remaining Left Percentage Display (Included in 0.1.35-local4-token-usage)

- What / why (1–2 lines): For Claude and Codex plan quotas (5-hour and weekly limits), switch from displaying how much quota was used to showing how much quota is remaining left (e.g., `42% left`), giving users clear foresight on remaining capacity before rate limiting occurs.
- Implementation: Added `formatRemainingPercent` in `src/lib/rateLimits.ts` (`100 - usedPercent`), updated `ContextMeter.tsx` ("Plan quota" rows displaying `XX% left` alongside reset timers), updated `UsageFooter.tsx` status bar provider chip to show `XX% left 5h · YY% left wk`, and updated `rateLimitWindowTooltip`.
- Files touched: `src/lib/rateLimits.ts`, `src/lib/rateLimits.test.ts`, `src/chrome/ContextMeter.tsx`, `src/chrome/UsageFooter.tsx`, `docs/changelog/LOCAL-CHANGELOG.md`.
- Verification (commands + results): `npm run check:web` passed cleanly (136 test files, 1,420 tests passed; `tsc --noEmit` 0 errors).
- Advantages / tradeoffs: Showing remaining percentage matches user mental models ("how much do I have left?") far better than consumed percentage.

### Historical Component Detail: System & Tools Context Breakdown & Diagnostic Inspector (Included in 0.1.35-local4-token-usage)

- What / why (1–2 lines): Decompose the large "System & tools" context segment (which often takes 40–80K tokens due to MCP servers and tool declarations) into an expandable, itemized diagnosis list detailing base instructions, global rules, environment context, built-in tools, and active MCP servers/plugins.
- Implementation: Created `src/lib/systemBreakdown.ts` and `src/lib/systemBreakdown.test.ts` to discover and parse `~/.claude.json` (global & project MCP servers), `~/.claude/CLAUDE.md`, `~/.codex/config.toml` (plugins & MCP servers), `~/.codex/AGENTS.md`. Integrated with `ContextMeter.tsx` to display an expandable accordion under "System & tools", itemizing Base prompt (Claude/Codex), Global rules, Environment context, Built-in tools (Bash, FileEdit, FileRead, Agent, etc.), and active MCP Servers (Playwright, Screenpipe, Tabularis, Notion, Penpot, etc.) with proportional token weights and commands/URLs.
- Files touched: `src/lib/systemBreakdown.ts`, `src/lib/systemBreakdown.test.ts`, `src/chrome/ContextMeter.tsx`, `docs/changelog/LOCAL-CHANGELOG.md`.
- Verification (commands + results): `npm run check:web` passed cleanly (136 test files, 1,419 tests passed; `tsc --noEmit` 0 errors).
- Caveats / known issues: MCP tool weights are proportional estimations based on server tool density heuristics (e.g. Playwright ~3.5x vs basic ~1.0x) normalized against the wire telemetry context usage.
- Advantages / tradeoffs: Users can instantly identify which MCP servers or global rules consume large percentages of their context window and take corrective action (e.g., disabling unused browser or database MCP servers).
- Learnings: MCP tool declarations with JSON schemas constitute the vast majority of initial context token usage when multiple integrations are enabled.

### Historical Component Detail: Context Window & Costing Inspector Dialog (Included in 0.1.35-local4-token-usage)

- What / why (1–2 lines): Unified context window and costing inspector popover for Claude Code and Codex harness sessions, detailing token occupancy (system & tools, memory files, skills, messages, autocompact buffer, free space) and live turn / session financial costs.
- Implementation: Upgraded `ContextMeter.tsx` into a rich inspection popover featuring a segmented horizontal bar chart, itemized breakdown categories, expandable Memory Files (`CLAUDE.md`, `MEMORY.md`, `AGENTS.md`) and Skills (`.claude/skills`, `.codex/skills`, `.agents/skills`) with per-item token measurements, plan rate limits (5-hour and weekly reset countdowns via `fetchClaudeRateLimits` / `fetchCodexRateLimits`), and a costing engine in `src/lib/tokenCosting.ts` with model rates (input, cache read/write, output) calculating per-turn spend, cache savings, and cumulative session costs.
- Files touched: `src/lib/tokenCosting.ts`, `src/lib/tokenCosting.test.ts`, `src/chrome/ContextMeter.tsx`, `src/chrome/ContextMeter.test.ts`, `src/chrome/Composer.tsx`, `src/surfaces/SessionPane.tsx`, `docs/specs/archive/context-dialog-plan.md`, `docs/changelog/LOCAL-CHANGELOG.md`.
- Verification (commands + results): `npx tsc --noEmit` clean (0 errors); `npx vitest run` 104 passed (1,098 tests passed).
- Caveats / known issues: Third-party CLIs without token telemetry or prompt breakdown (Cursor, Pi, OpenCode) rely on client-side estimation; full telemetry is enabled for Claude and Codex.
- Advantages / tradeoffs: Provides transparent insight into context usage, prompt caching efficiency, and dollar spend without modifying external CLI binaries.
- Learnings: Harness adapters capture wire telemetry from CLIs, while prompt components (memory files and skills) can be accurately discovered and estimated directly from the workspace filesystem.

## Unreleased - 8 Sept 2026 - Gitignored files in chat mentions (Deferred work — not in 0.1.35-local4-token-usage)

- What / why (1-2 lines): useful local files such as
  `docs/changelog/LOCAL-CHANGELOG.md` were visible in Explorer but absent from chat `@`
  search because mentions reused Quick Open's Git-aware index. The same file
  could also open root `CHANGELOG.md` due to a filename-suffix collision.
- Implementation: added a separate, cached mention-only file listing. It keeps
  Quick Open unchanged, merges ignored files from a bounded disk scan, checks
  exact Git ignored status using `git check-ignore --stdin -z` (omitting the badge
  in non-Git or error contexts), filters sensitive candidate files via heuristic
  suggestion filters, and labels ignored picker entries visibly and accessibly.
  File-link fallback matching now checks filesystem metadata via `statFiles` so
  explicit paths immediately win over basename heuristics, while requiring a real
  path separator before suffix fallbacks. The `useComposerFiles` hook manages the
  lifecycle: picker open upgrades to mention files, and closing the picker or typing
  retains the upgraded index so selected mentions are preserved without downgrade.
- Files touched: `src-tauri/src/fs.rs`, `src-tauri/src/lib.rs`,
  `src/lib/fs.ts`, `src/lib/fileIndex.ts`, `src/lib/fileIndex.test.ts`,
  `src/lib/fileMentions.ts`, `src/lib/fileMentions.test.ts`,
  `src/chrome/Composer.tsx`, `src/chrome/useComposerFiles.ts`,
  `src/chrome/useComposerFiles.test.ts`, `src/chrome/FileMentionPicker.tsx`,
  and `src/chrome/FileMentionPicker.test.ts`; local plan and logs under `docs/`.
- Verification (commands + results): `npx tsc --noEmit` clean; full
  `npx vitest run` 133 files / 1,415 tests passed; `cargo fmt --check` clean;
  `cargo check` clean; `cargo test mention_files` 3 passed. `npx eslint . --fix`
  exits 1 because the repository has no `eslint.config.*` (tooling blocker).
- Caveats / known issues: Tauri dev-mode behavior still needs user testing.
  `@docs` remains a directory reference, not automatic expansion of every file.
  Likely secret files are intentionally absent from suggestions. No installer
  or installed-build verification was performed.
- Advantages / tradeoffs: ignored local docs become directly selectable without
  changing Git tracking or slowing/changing Quick Open. The first mention scan
  does extra bounded disk work; subsequent opens use the mention cache, and
  known large generated directories are never entered.
- Learnings: Explorer and mentions had different data sources; "visible in the
  tree" never guaranteed "available to chat." File paths must be compared by
  path segments, not raw character suffixes.

## 0.1.35-local4-hari — 8 Sept 2026 — One-button mode switcher + Hari phase-0 board

- What / why (1-2 lines): `docs/PLANNED.md` #10 + #11. The rail's three-tab mode
  control had Hari permanently disabled and burned a full row on two dead
  tabs; Hari itself had no surface. Replaced the tabs with one cycling
  button and gave Hari a real, AI-free kanban.
- Implementation: `AppMode` gains `"hari"` with a validating loader plus
  `cycleAppMode`/`appModeOrder`. `ModeSwitcher` is now its own component: a
  single button that names the current mode, cycles on click (Shift-click
  and arrow keys reverse), shows three dots for position and an accent dot
  when threads are waiting. `hariBoard.ts` derives four lanes purely from
  live thread state - `sessionNeedsInput()` -> Needs Input, `busy` -> In
  Progress, `queuedMessages` -> Todos, everything else idle-with-a-turn ->
  Done; blank tabs are not cards. `HariView` renders the lanes as a
  read-only board (a lane is a fact about a thread, not a droppable slot),
  reusing `liveAgentsFromSessions` for activity text so a card can never
  disagree with the rail. Hari is a mode, not an overlay, but a fullscreen
  overlay still wins so Settings never stacks on the board.
- Files touched: `src/lib/appearance.ts`, `src/lib/appearance.test.ts`,
  `src/lib/hariBoard.ts` (new), `src/lib/hariBoard.test.ts` (new),
  `src/chrome/ModeSwitcher.tsx` (new), `src/chrome/ProjectRail.tsx`,
  `src/chrome/Sidebar.tsx`, `src/surfaces/HariView.tsx` (new),
  `src/App.tsx`, `docs/specs/archive/hari-mode-plan.md` (new), `docs/PLANNED.md`,
  + 5 version files (manual bump; `bump-version.mjs` rejects suffixes).
- Verification (commands + results): `npx tsc --noEmit` clean; full
  `npx vitest run` 131 files / 1401 tests green (17 new: 13 board, 4 mode);
  `npm run build` (tsc + vite) clean. ESLint still unavailable repo-wide
  (no flat config, pre-existing - see the local3 entry); `prettier --check`
  drift in `App.tsx`/`Sidebar.tsx` is pre-existing and was left alone
  rather than reformatted as churn.
- Installer: `target/release/bundle/nsis/MonoCode_0.1.35-local4-hari_x64-setup.exe`
  (NSIS-only; MSI rejects text suffixes), 9,366,618 bytes,
  SHA256 56CB9206CBC5FCD30411397C52BDD46605AD5836B848279D44CA0A8262627806.
  Rust compiled in 1m23s (warm `target/`); `cargo fmt --check` clean. The
  usual updater-signature error at the end is post-bundle and pre-existing -
  the installer was already written, and the command exited 0.
- Caveats / known issues: the board covers **open threads only** (live
  sessions across tabs), not history - stated in the empty state rather
  than hidden. No drag between lanes, by design. No `session.error` source
  for Needs Input yet.
- Advantages / tradeoffs: the button costs a third of the tab row's width
  and no longer shows dead pixels; the cost is discoverability, paid back
  with the current-mode face, position dots and a next-mode tooltip. The
  board needed zero backend and zero AI - every lane is state the app was
  already tracking for the rail's live-agent preview.
- Learnings: deriving lanes from existing state (rather than storing a
  board) removes a whole class of drift bugs, and it is what forces the
  board to be read-only. Frontend-only work is also the one kind that
  survives a near-full disk: no worktree, no second `target/`.

## 0.1.35-local3-reveal-tabs — 8 Sept 2026 — Explorer reveal fix + tab-strip fade

- What / why (1–2 lines): kill the false `Could not reveal in File
  Explorer` error; keep the tab scroll buttons and add a per-side edge fade
  so hidden tabs are discoverable without a hard cutoff.
- Implementation: Windows `reveal_path` now dispatches Explorer via
  `spawn()` + `CREATE_NO_WINDOW` — success means dispatched, only a spawn
  failure is an error; macOS/Linux untouched. `TitleBar`: original
  `TabStripChevron` + `scrollTabsBy` restored verbatim, new
  `tabStripFadeMask` (mask-image + -webkit prefix as literal Tailwind
  arbitrary classes) driven by per-side overflow tracking.
- Files touched: `src-tauri/src/fs.rs`, `src/chrome/TitleBar.tsx`,
  `src/chrome/TitleBar.test.ts`, + 5 version files (`package.json`,
  `package-lock.json` x2, workspace `Cargo.toml`, `Cargo.lock`,
  `src-tauri/tauri.conf.json`). (`bump-version.mjs` rejects suffixed
  versions, so the bump was manual.)
- Verification (commands + results): `npx tsc --noEmit` clean; full
  `npx vitest run` 130 files / 1383 tests green;
  `cargo fmt --check` clean; `cargo check` clean;
  `cargo test reveal_path` 3/3 (file Ok, dir Ok — Windows-gated;
  missing-path Err). Repo-wide `npm run check` still blocked by
  pre-existing issues (ESLint 9/10 flat-config, clippy warnings in
  `pty.rs`/`fs.rs`/`harness.rs`, 11 CRLF-only Rust failures in
  `checkpoint.rs`/`fs.rs`) — attributed, untouched.
- Installer: `target/release/bundle/nsis/MonoCode_0.1.35-local3-reveal-tabs_x64-setup.exe`
  (NSIS-only; MSI rejects text suffixes), 9,365,737 bytes,
  SHA256 DCAFDB193C3F1FCEB32001379F8DF27322CF3015733376675C61FA3267D59D5C.
  (Updater-signature warning at bundle time only — same as past local
  builds; installer itself finished.)
- Caveats / known issues: built from a dirty tree that also holds another
  session's unfinished Chat WIP (`ChatPanel.tsx`, `fork.ts`,
  `SessionCard.tsx`, ~30 more files) — this is NOT a clean D+E-only
  build. A/B/C worktrees were cut from clean `437cd34` and lack D+E;
  merge `nakul/windows-support` into them after this lands.
- Advantages / tradeoffs: buttons = obvious affordance, fade = smooth
  cutoff; mask (not overlay) stays correct over glass/wallpaper and adds
  zero hitbox. Tradeoff: scroll + ResizeObserver tracking restored —
  same tiny cost as the original code.
- Learnings: Explorer's exit code after `/select` dispatch is not a result
  (opens fine, exits nonzero); Tailwind arbitrary classes must appear
  literally in source or the scanner skips them; a mask beats an overlay
  on translucent backgrounds.

## 0.1.35-local1-skills — 6 Sept 2026 — Skills build, Defender-clean rename

- What / why: same content as 0.1.34-local1, version renamed so the local
  line reads `0.1.35-*` going forward.
- Implementation: version string only (`package.json`, workspace
  `Cargo.toml`, `tauri.conf.json`).
- Files touched: 3 version files.
- Verification: NSIS bundle produced
  (`MonoCode_0.1.35-local1-skills_x64-setup.exe`, 8.9 MB).
- Caveats: installer filename carries the suffix; in-app version matches it.
- Advantages: no collision with upstream numbers; base + feature visible.
- Learnings: none (rename-only).

## 0.1.34-local1 — 6 Sept 2026 — Runner removed, first clean build

- What / why: prove the Defender flag came from the skill-import command
  runner by shipping the same tree without it.
- Implementation: deleted `run_skill_import` + shell-spawn helpers +
  timeout/output caps (backend), command registration, `runSkillImport`
  bridge, Import button + command panel (Settings). Rest of Skills kept.
  (Also: MSI bundler rejects text prerelease suffixes → local builds are
  NSIS-only via `--bundles nsis`.)
- Files touched: `src-tauri/src/skills.rs`, `src-tauri/src/lib.rs`,
  `src/lib/skills.ts`, `src/surfaces/SettingsView.tsx`.
- Verification: tsc clean, vitest 1324/1324, skills Rust 14/14, fmt/check
  clean. Installed clean — Defender silent. Theory proven.
- Caveats: Skills page cannot install from commands (list/manage only).
- Advantages: shippable build while the runner decision is pending.
- Learnings: `!ml` flags follow behavior (shell-spawning), not identity;
  real-world A/B (0.1.35 vs 0.1.37) beats lab speculation.

## 0.1.37 — 6 Sept 2026 — Skills WIP build (flagged, superseded)

- What / why: first installer containing the Skills page work.
- Implementation: Skills discovery UI + backend as built by the other
  session, including the run-import-command panel.
- Verification: installed fine functionally; Defender quarantined
  `monocode.exe` as `Trojan:Win32/Bearfoos.A!ml` at install time.
- Caveats: DO NOT distribute — superseded by local1. Kept locally only.
- Learnings: unsigned + fresh hash + shell-spawning feature = ML flag.
  Fix on machine: restore from quarantine, exclude install + `target/`
  folders, reinstall. Real fix needs a code-signing cert (upstream call).

## 0.1.36 — 5 Sept 2026 — Migration toggle UX (reconstructed note)

- What / why: session-migration UX round — global Resume|Replay|Custom
  header toggle, conditional replay-target picker, per-row toggles in
  Custom only, `+` menu rows joined to the hover system.
- Verification (as recorded then): tsc clean, migration tests green.
- Caveats: details thin — predates this changelog; see
  `docs/WINDOWS-CHANGES.md` "Other changes" roundup.

## 0.1.35 — 5 Sept 2026 — First merged-stack build (reconstructed note)

- What / why: first installer of the upstream-merged Windows stack
  (48 upstream commits + catalog fixes + home fallback + hover system).
- Caveats: details thin — predates this changelog.

---
Archived 2026-10-03: this file reached about 140 KB. New entries go to [CHANGELOG-02.md](CHANGELOG-02.md).
