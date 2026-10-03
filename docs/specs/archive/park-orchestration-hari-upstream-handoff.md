# Done — Park Hari and orchestration work before upstream intake — spec

- Tier: complex — overlapping Git changes, ignored documents, remote backup and destructive cleanup ordering.
- Snapshot: `9397898c923491a9ee1e9cd77c4bcc917634c888`, branch `nakul/windows-support`, 2026-09-30.
- Main checkout: `E:\Developing\OpenSource\mono-clone`.
- Hari parking branch: `hari-orchestration-changes-30sept`.
- Four-feature parking branch: `park-other-orchestration-mode-changes-30sept`.
- Use two independent branches from the same pinned base from the start. This supersedes the earlier combined-branch plan; do not create `orchestration-changes-parking-30sept` for this handoff.
- Fork remote: `personal`, currently `https://github.com/imnakul/monocode-clone.git`.

## In plain words

Keep unfinished Hari and the four orchestration features safe on two separate GitHub branches so we can resume either later.
Leave the independent fixes and local documentation on windows-support for everyday manual orchestration.
Verify both GitHub copies before deleting the local parking branches, and leave a clear warning to retain each remote branch.
Then report the remaining small changes and build prerequisites; wait for the user's exact minor-change list, version and upstream feature list before starting those stages.

## Goal and user story

As Nakul, I want a recoverable remote archive of unfinished orchestration work, with current development separated from it, so that I can focus on new upstream features without losing this work.

## Scope and authorization

Setup prerequisite resolved on 30 September 2026: the approved local settings are recorded in `.agents/PROFILE.local.md` in the main checkout, excluded from Git. Read it before execution; do not rerun repo-setup questions. This profile does not get committed into either archive. Parking worktrees do not automatically inherit ignored profile/docs files: consult the main-checkout profile and handoff, or copy them locally with matching exclusions if needed. Do not create a public profile or regenerate the existing docs layout.

The user requested separate Hari and four-feature archives to avoid combining overlapping edits. Use the two named branches from the start, push both to their GitHub fork, and delete only their local branches once remote preservation is verified. This authorizes the executor's archive commits, those two branch pushes and verified local branch deletions; do not ask again for these exact actions. It does not authorize a push/commit on windows-support, a force push, remote branch deletion, or disposal of any original stash.

Nakul approved execution of Phases A-D on 30 September 2026. The archive names and purpose override older default feature-branch naming. The archival WIP commits are clearly labeled as unverified; they are not production-ready feature commits. See the execution report at the end of this file and [the local parking record](../../notes/orchestration-parking-30sept.md).

## Out of scope

- Fixing the four features, adding a lifecycle recovery action, changing auth/control-token injection, or continuing desktop tests.
- Copying or merging the older `feature/hari-orchestrator` worktree into the current source layout.
- Applying the other historical stashes just because they mention uncommitted work.
- Deleting app history/databases, retained test workers, existing worktrees, stashes, backups or remote branches.
- Building an installer, choosing a new version, or importing unspecified upstream changes in this first stage.
- Changing `.gitignore` or force-adding private `docs/`, credentials, `.env` files or screenshots to GitHub.

## Current inventory and evidence

### Hari layer

Use the pinned stash object, not a movable stash index:

`966680850080b052aaf4dcd13d12a8c5062831f3` — `hari-isolation-20260925-orch-spec`.

Its first parent is the snapshot commit above. Its tracked delta covers:

- `src/app/App.tsx`
- `src/app/shell/ProjectRail.tsx`
- `src/app/shell/Sidebar.tsx`
- `src/features/orchestration/model/orchestrationSummary.ts`
- `src/features/sessions/ui/Composer.test.ts`
- `src/features/sessions/ui/Composer.tsx`
- `src/features/sessions/ui/SessionPane.tsx`
- `src/features/settings/model/appearance.test.ts`
- `src/features/settings/model/appearance.ts`

Its third parent contains seven previously untracked files:

- `src/app/shell/HariModeAction.test.tsx`
- `src/app/shell/HariModeAction.tsx`
- `src/features/orchestration/model/hari.test.ts`
- `src/features/orchestration/model/hari.ts`
- `src/features/orchestration/model/orchestrationSummary.test.ts`
- `src/features/orchestration/ui/HariView.test.tsx`
- `src/features/orchestration/ui/HariView.tsx`

Retain the unrelated stash objects `5b1a97b8b01c488e63c9c6e6e264cb79bcf4f763` and `d15a6077cf2111145eb68c0096645d0f9bafce3f` unchanged. They include older layouts/history and are not additional Hari layers to apply. Verify the pinned Hari stash still matches this inventory at execution.

### Four current features to park

1. Exact ignored-file handoff and integration/recovery.
2. Lead Stop versus run Cancel, model continuation and paused Resume and send.
3. Efficient/Live supervision, quiet-wait limits and wake behavior.
4. Composer pending/failure/attachment reliability added with that work.

Candidate paths covering this layer:

```text
src-tauri/src/control_cli.rs
src-tauri/src/lib.rs
src-tauri/src/handoff.rs                         new
src/app/App.tsx                                mixed: retain humanAuthored caller
src/features/orchestration/model/orchestration.ts
src/features/orchestration/model/orchestrationPlan.ts
src/features/orchestration/model/orchestrationPlan.test.ts
src/features/orchestration/model/orchestrationState.ts
src/features/orchestration/model/orchestrationSummary.ts
src/features/orchestration/model/leadControls.ts new
src/features/orchestration/model/orchestrationLeadControl.test.ts new
src/features/orchestration/model/resumeAndSend.ts new
src/features/orchestration/ui/OrchestrationFlow.test.ts
src/features/orchestration/ui/OrchestrationPreview.tsx
src/features/orchestration/ui/OrchestrationSidebarAgents.tsx
src/features/sessions/model/session.ts
src/features/sessions/ui/AgentTranscript.tsx
src/features/sessions/ui/Composer.test.ts
src/features/sessions/ui/Composer.tsx
src/features/sessions/ui/SessionPane.tsx
src/features/workspace/ui/PaneTree.tsx
```

This list is a discovery map, not permission to overwrite entire files. Refresh the current diff before partitioning and classify every hunk. Unexpected source changes must be surfaced rather than silently swept into the archive.

Relevant current contracts: `App.tsx:6684` passes `humanAuthored: !options?.managed`; `types.ts:156` defines that independent flag. `leadControls.ts:3` owns Stop/Resume/Cancel labels; `orchestration.ts:1695` owns quiet waits, line 2176 run cancellation, line 2461 lead Stop. The same App/Composer/summary files overlap the Hari stash.

### Changes to retain on windows-support

- Codex disabled MCP/plugin context-count fix: `src/features/sessions/model/systemBreakdown.ts` and `.test.ts`.
- Claude human-origin tagging: `src/integrations/harness/core/types.ts`, `providers/claude/claude.ts`, `claudeProtocol.ts` and `.test.ts`, plus only the associated `humanAuthored` call-site change in `src/app/App.tsx`.
- Antigravity ACP regression coverage: `src/integrations/harness/core/antigravityAcpLive.test.ts`.
- Local docs/index/changelog organization, existing AGENTS guidance, and Jira relocation. The tracked `docs/jira.md` deletion currently represents a move to ignored `docs/notes/jira.md`; keep its content and flag this tracking issue in the final report rather than changing Git ignore behavior.
- Existing committed Windows/wallpaper/upstream support stays in history.
- `src-tauri/Cargo.toml` is listed dirty but has no textual diff in the current snapshot. Preserve its raw bytes and investigate representation separately; do not treat it as orchestration source or normalize it opportunistically.

Recent retained test evidence: 78/78 across systemBreakdown (8), claudeProtocol (42) and antigravityAcpLive (28), on 30 September. This supports retention, not live provider verification.

## Known unfinished behavior to preserve with the archive

- Desktop report at `E:\Developing\Temptesting\evidence\report.md`: T1 producer wrote ignored content; consumer never started; integration not independently proved; Antigravity lead lacked control environment; other cases blocked/untested; current-app provenance not established.
- Shared Antigravity runtime versus per-lead control grants is a strong suspected connectivity cause, not a reproduced fix.
- Terminal workers can coexist with an active run when actual finish/cancel has not completed. Removing source does not clear this persisted app state.
- Test project, evidence and `E:\Developing\Temptesting\project-worktrees` must remain intact.
- Existing full-suite attachment flakiness and missing ESLint flat config remain documented limitations. Never present the remote archive as tested release-ready work.

## Acceptance criteria

- AC1: Given current dirty files, four untracked feature files, ignored docs and the Hari stash, before any source removal, a timestamped external backup exists with hashes, base SHA, exact patch layers and untracked bytes; restore checks prove those layers are recoverable.
- AC2: `hari-orchestration-changes-30sept` contains only the 16-path pinned Hari layer and its preservation note; `park-other-orchestration-mode-changes-30sept` contains only the four-feature layer and its note. Both start at the pinned base. None of the retained independent fixes, local workflow guidance, private docs or other historical-stash contents are accidentally included in either delta. Do not merge the two branches.
- AC3: Before removing any local feature source, both exact fork remote branch refs match their respective reviewed archive tips. Fresh fetch/reconstruction verifies each committed layer and its preservation note.
- AC4: After source separation, the active checkout is still `nakul/windows-support` at its original commit, retaining the independent fixes and local docs. The parked layer is absent from its diff and new feature files are safely relocated/backed up, not left as active untracked source.
- AC5: Only after both remote copies are verified and source separation is complete, the new parking worktrees are clean and removed, and the two exact local parking branches are deleted. Both remote SHAs remain unchanged, and all original stashes still exist by pinned object SHA.
- AC6: A local resume record lists both remote branches with their own tip/base SHAs, backup path, layer manifests, original Hari stash and known failures, plus explicit remote-retention warnings. It explains how to fetch/restore each independently without applying onto a dirty future checkout. Any integration conflict is deferred to a future resumption task.
- AC7: Retained-code checks are run and honestly reported. Unresolved unrelated failures do not trigger broad fixes. No minor feature, version bump or upstream import begins until its scope is supplied.

## Implementation plan and ordering contracts

### Phase A — Freeze and back up before mutation

1. Read current instructions and docs; inventory branch/HEAD/status, index state, untracked files and existing stashes/worktrees. Verify no other agent is editing the same files. If a dev app is running, coordinate a safe pause with Nakul before source separation; do not kill unrelated sessions.
2. Verify remote `personal` still points to `imnakul/monocode-clone`. Do not assume `origin` is safe. Check whether either exact local/remote parking branch already exists. If an existing ref has a different tip, stop; no overwrite or force push. If another agent already began the superseded combined plan, retain its work and report the state before proceeding.
3. Create a new timestamped backup under `E:\Developing\OpenSource\mono-clone-backups\orchestration-parking-<actual-time>`. Copy only scoped dirty/untracked source, local docs and scoped test evidence/artifacts; do not copy credentials, app databases, `.env` values, node_modules, target or provider caches. Capture deletion markers, raw bytes/SHA-256 and Git-normalized blob hashes separately so CRLF changes cannot masquerade as lost edits.
4. Export binary-capable tracked patches, all four new files, the exact Hari tracked patch and all seven third-parent files. Preserve a local Git bundle/ref archive for the pinned stash objects and base if needed for independent Git-object recovery. Backups remain local; do not push them. Test-read and rehash every copied file.
5. Record retained versus parked hunks in a manifest. For App preserve the exact humanAuthored caller separately from the orchestration hunks. Keep the current full snapshot as an additional recovery source even if later splitting is mistaken.

### Phase B — Construct two independent archives outside the dirty main checkout

1. Create `E:\Developing\OpenSource\mono-clone-hari-parking-30sept` on `hari-orchestration-changes-30sept`, and `E:\Developing\OpenSource\mono-clone-other-orchestration-parking-30sept` on `park-other-orchestration-mode-changes-30sept`. Both branch from the pinned base, not from one another. Do not switch the dirty main checkout or affect existing Hari/remote-chat worktrees.
2. In the clean Hari worktree only, apply stash `966680850080b052aaf4dcd13d12a8c5062831f3` with `apply`, never `pop`, including its seven third-parent files. Verify the 9 tracked deltas and 7 new files against the stash tree. Do not overlay current orchestration changes here. Same-base application should avoid cross-feature conflicts; if it still conflicts, stop and investigate instead of auto-resolving.
3. In the other orchestration worktree only, materialize the current four-feature layer, including all four new files. Partition App.tsx to omit the retained humanAuthored caller. Verify this branch contains no Hari files/deltas and no independent retained fix hunks. Splitting retained hunks still requires care, even though combining Hari is no longer required.
4. Commit each scoped archival layer independently with a Conventional Commit message identifying unverified WIP. Stage reviewed paths/hunks explicitly, never `git add .`. No private docs/AGENTS changes or generated artifacts enter these commits.
5. Add branch-only `PARKED-ORCHESTRATION.md` to each archive. For the Hari branch use: `This branch contains parked Hari orchestration changes for later resumption. Do not delete this remote branch.` For the other branch use: `This branch contains the four parked orchestration-mode changes for later resumption. Do not delete this remote branch.` Include each branch's scope, base, counterpart branch name, unfinished/test status and that unrelated fixes remain on windows-support. Do not include personal paths, credentials or private evidence.
6. Run archive typecheck/focused tests if dependencies are available through npm and the lockfile. Use independent Cargo targets if Rust checks run. Record failed/unrun checks rather than repairing unfinished features. These are explicit WIP backup commits, not production-ready releases.
7. Compare each archive's Git-normalized blobs/delta with its own layer manifest. Hari should match the stash source independently. The four-feature branch should match the partitioned current layer. Record CRLF differences separately. There is no requirement for the two archive trees to compile together or be merged now; future overlap resolution belongs to resumption.

### Phase C — Push and prove remote recovery before cleanup

1. Push each reviewed archive tip to its exact branch on `personal` with explicit refspecs and upstream tracking. No push to `origin`, no force, no windows-support push, no PR.
2. Read `git ls-remote personal refs/heads/hari-orchestration-changes-30sept refs/heads/park-other-orchestration-mode-changes-30sept` and require each SHA to equal its corresponding local archive tip. A successful push message alone is insufficient.
3. Fetch both refs and reconstruct each independently into disposable verification worktrees/checkouts. Compare tree/blob hashes against the reviewed tips: Hari's seven new files belong on the Hari branch; the four new orchestration files belong on the other branch; each must contain its warning note. Do not run archive apps or copy app state.
4. Record both remote verifications in the resume document and manifest. If one push succeeds and the other fails, retain the successful remote branch and all local state; do not roll it back. No source removal/local branch deletion follows until both archives are verified. Network/auth/fetch failures preserve source, worktrees and backups for retry.

### Phase D — Separate windows-support, verify and delete only the two local parking branches

1. Compare current main files against Phase A hashes again. If another process changed any scoped file, stop and back up that newer state before deciding how to continue. Never overwrite concurrent edits with the older snapshot.
2. Remove only the four-feature hunks using the verified base and partition manifest. Restore complete scoped tracked files only where their entire delta is parked; rebuild mixed App from base plus retained humanAuthored hunk. Move the four untracked feature files into the external backup only after verifying identical backed-up bytes; resolve every absolute target before moving on Windows. No `reset --hard`, broad clean or recursive workspace deletion.
3. Hari is already stashed, so do not remove paths from the active checkout merely because the stash contains them. Existing base/manual orchestration behavior must stay; this parks new enhancements, not all upstream orchestration.
4. Revalidate that independent retained file bytes/hunks, AGENTS guidance, Jira content and all local docs remain. Expected active source delta is context-count fix, Claude origin caller/types/provider changes and ACP tests. Account for the Cargo representation-only status without changing its bytes.
5. Run retained-code gates below, record results, and inspect direct App/harness consumers. If parking caused a new failure, restore from the full backup or correct only the separation; do not alter retained feature semantics or weaken tests.
6. Write `docs/notes/orchestration-parking-30sept.md` with both remote/base/tip/commit lists, per-layer backup/manifest paths, original stash IDs, retained-hunk decisions, checks, known bugs and remote warnings. Update Hari specs to point to the Hari branch and four-feature/test specs to the other branch; use Blocked for paused unfinished work, no invented Parked workflow status. Preserve current index grouping/creation sorting. Add a current numbered changelog entry and update `docs/PLANNED.md` with next stages; preserve the five-file docs root layout.
7. Verify both archive worktrees are clean with no unique ignored artifacts. Remove only newly created clean archive/verification worktrees without force. Delete each exact local parking branch with `git branch -d` after checking it tracks its verified remote tip. If deletion refuses, investigate rather than broadening cleanup. Confirm both remote refs remain at the same SHAs immediately afterwards.
8. Retain all original stashes, external backups and test artifacts. Report windows-support's final status and that its HEAD was not rewritten/committed/pushed.

## Verification matrix

| Risk / AC | Required evidence |
|---|---|
| Lost untracked Hari or handoff files | Third-parent/new-file manifests with hashes; local backups and fetched archive reconstruction contain all files. |
| Lost overlap in App/Composer/summary | Each original layer independently preserved; retained-hunk partition checked; no merge between archives. |
| Wrong remote / overwriting archive | Fork identity checked; preflight for both refs; two explicit named pushes; no force. |
| False remote safety | Exact ls-remote SHA, fresh fetch and reconstructed tree comparison before source removal. |
| Accidental retained-change loss | Before/after retained-file hashes and App caller diff. |
| Concurrent source edits | Recheck main hashes immediately before separation; stop on mismatch. |
| Missing docs/evidence | Local backup inventory; original docs/evidence preserved and not pushed. |
| Unsafe branch cleanup | Clean worktrees removed; only the two exact local parking refs deleted after both verify; both remote SHAs and original stashes unchanged. |
| Manual-work regressions | Retained focused tests, full web/type/Rust gates and production web build; desktop smoke remains a user follow-up. |

## Commands and checks

Use repo npm scripts and lockfile. From the separated windows-support checkout:

```text
npm test -- src/features/sessions/model/systemBreakdown.test.ts src/integrations/harness/providers/claude/claudeProtocol.test.ts src/integrations/harness/core/antigravityAcpLive.test.ts
npm run check:web
npx tsc --noEmit
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test
npm run build
git diff --check
```

Run Rust checks with one Cargo job if needed and ensure no other build is competing for the target directory. Attempt changed-file lint using the installed ESLint/tooling only if supported; report the known missing `eslint.config.*` blocker without introducing a new dependency/config or disabling rules. One sufficient typecheck result is enough; `check:web` already includes it if tests succeed. Existing full-suite failures must be attributed, not ignored or repaired through unrelated edits.

## Later stages: minor changes, version/build and upstream intake

These are explicit follow-ups, not implementation scope inferred by the executor:

1. Ask Nakul for the actual minor-change list and handle each with its own short spec/checks. They were not supplied in this conversation.
2. Ask for/agree the next version and whether the build is web/dev validation or an installable NSIS package. Current version is `0.1.55-local3-rail-wallpaper`. `scripts/bump-version.mjs` currently accepts only plain `X.Y.Z`, although the repo uses local suffixes; do not assume it supports a local version. Verify the existing release workflow and generate lockfile updates through package tools rather than hand-editing generated files.
3. Complete dev-mode manual validation with Nakul or a separate desktop Codex session before any installer build. The MonoCode executor cannot perform native UI smoke. Preserve the earlier unfinished run in app storage; clearing it requires a separate lifecycle recovery task, not database deletion here.
4. Obtain Nakul's upstream feature/details list. Review the exact official upstream commits/diffs and their overlap with local Windows support before selecting intake. Do not perform an all-upstream merge as a shortcut. Any conflict follows the working agreement's stop-and-explain rule.
5. Future windows-support commit/push or release is not included in the two parking branches' authorization. Obtain the applicable approval when concrete reviewed changes/build are ready.

## Skills to load

- `spec-implement`, for executing this approved Git/docs separation spec.
- `socraticode:codebase-exploration`, for current shared-source impact analysis where indexed.
- `frontend-ui`, `desktop-app`, and `testing`, before removing UI/Tauri feature wiring and verifying retained behavior.
- No computer-use or live model calls are required for the parking operation.

## Facts, decisions and open questions

- Facts: named stash parent matches current base; 9 tracked and 7 new Hari paths; four-feature layer includes 4 new files; personal remote pointed to Nakul's fork during execution. Both named archive refs were checked and independently reconstructed before source separation.
- Decision: two independent archive worktrees/branches from the same base, per-layer commits and retention notes, external byte backups, both remote fetch verifications before source removal. Preserve stashes after remote verification. This avoids merging overlapping work during parking; it defers integration conflicts to resumption.
- Decision: leave retained fixes uncommitted on windows-support; only archive commit/push is authorized. Local docs remain Git-ignored.
- Decision: speculative model-control fixes and live-run storage recovery are deferred.
- Unknowns that do not block spec delivery: unexpected same-base restoration problems, remote existing refs/network access, minor-change scope, next version/build target and upstream feature list. Unexpected conflicts still block execution until resolved with the user; cross-layer merge conflicts are avoided by independent archives.
- Documentation convention: the user's Progress/status-prefix/grouped-index requirements override the skill's In progress/index-only convention. This spec is Done for the approved parking operation; later intake stages remain unstarted. Index/changelog edits follow the user's requirements despite the skill's blanket spec-only-file instruction.

## Executor report format

Report AC1–AC7 as done/partial/not done with evidence. For each branch include base/tip/remote SHAs, archive commits and fork link, manifest/backup/resume paths, checks, local deletion and remote survival proof. Report retained changes, unexpected conflicts, exact main status and unchanged stash SHAs. List future minor/version/upstream questions separately. Never claim installer readiness from archive preservation.

## Handoff prompt

> Completed: Nakul approved this handoff on 2026-09-30 and Phases A-D have been executed. Use the execution report below; recheck current source and remote refs before any future resumption.



Read `docs/specs/archive/park-orchestration-hari-upstream-handoff.md`, repo instructions and the listed skills, including spec-implement. Execute phases A–D only after Nakul hands off/approves this Draft. Use two independent same-base branches: hari-orchestration-changes-30sept for the pinned Hari stash, and park-other-orchestration-mode-changes-30sept for the four current features. The user authorizes their archive commits, fork pushes and local deletion only after both remote archives verify. Do not combine or merge them. Preserve original stashes and independent windows-support fixes. Stop for unexpected conflicts. No windows-support commit/push, installer, app-storage cleanup or upstream import is authorized. Report per branch, then collect later minor/version/upstream details.

## Handoff retro

### 2026-09-30 - Approved phases A-D execution report

- **AC1 - Done:** Phase A snapshot, tracked patches, four untracked-file copies, exact layer map, App review, SHA manifest, and base/stash Git bundle are preserved under `E:\Developing\OpenSource\mono-clone-backups\orchestration-parking-20260930-101340`. Late concurrent docs were separately snapshotted and rechecked before editing.
- **AC2 - Done:** Hari archive starts at `9397898c923491a9ee1e9cd77c4bcc917634c888`; source WIP commit `31442977bb210fa0f168ae90103f9c6a5415fd99`; preservation-note tip `5620894a64b88b042833d98f62c07f1e2b77d1ed`. Four-feature archive starts at the same base; source WIP commit `54bdbee65fbfd40ec8ff58e0580cec1cc613f647`; preservation-note tip `ac546f3769ab2b69dc1c6df31a1b33ef94378e2c`. Each archive contains only its own layer and warning note.
- **AC3 - Done:** Both `personal` refs matched their exact tips through `ls-remote`; fresh fetched reconstructions matched each tip, tree, changed-path blobs, and retention note before source separation. Remote verification details are in `remote-verification.md` in the external backup.
- **AC4 - Done:** Only the four-feature source was removed from `nakul/windows-support`; all four untracked feature files were moved to the external backup after hash comparison. All 16 whole-file candidate paths match the pinned base. `App.tsx` retains the distinct Claude caller `humanAuthored: !options?.managed`. The independent Codex context, Claude origin/protocol, and Antigravity ACP test changes remain. Hari's stash was not applied to or removed from the active checkout.
- **App partition correction:** The stored candidate patch included the retained Claude-origin line even though the reviewed archive commit did not. The post-separation audit caught this. The exact line was restored from the Phase A App snapshot and the resulting App diff contains only that caller. `patches/retained-app-caller.patch` records the correction; the four-feature remote App blob was separately confirmed not to contain the caller.
- **AC5 - Done:** Both archive worktrees and both fetched verification worktrees were clean with no untracked or ignored files, then were removed without force. The two exact local branches were deleted with `git branch -d` after fresh remote-tip checks; Git confirmed each was merged to its matching `personal` upstream. Both remote refs still match their verified SHAs. The older Hari/remote-chat worktrees, original stashes, and external backup remain.
- **AC6 - Done:** [The local parking record](../../notes/orchestration-parking-30sept.md) records both bases/tips/commits, remote proof, layer backups, stash IDs, retained-hunk decision, checks, resumption guidance, and the warning to retain each remote branch.
- **AC7 - Partial:** Focused retained tests passed 78/78; standalone TypeScript, Rust formatting, `cargo check`, Clippy, external-output production web build, and `git diff --check` passed. Full web verification had 3,658/3,659 tests pass; the unchanged base `Composer.test.ts` borrowed-attachment test failed because its remove-button query returned null. The first `cargo test` attempt hit Windows error 112 at 0.49 GB free; after cleanup restored space, the retry passed 415 tests with 4 ignored. Changed-file ESLint could not run because no `eslint.config.*` exists. No native desktop smoke test was run.
- The web build output is under `E:\Developing\OpenSource\mono-clone-backups\orchestration-parking-20260930-101340\phase-d-web-build`; the existing `dist/` was not overwritten and no `cargo clean` was run. No windows-support commit/push, installer, version change, upstream intake, app-storage cleanup, stash change, or remote-branch deletion was performed.
- Main `HEAD` remains `9397898c923491a9ee1e9cd77c4bcc917634c888`. Original stash SHAs remain `966680850080b052aaf4dcd13d12a8c5062831f3`, `5b1a97b8b01c488e63c9c6e6e264cb79bcf4f763`, and `d15a6077cf2111145eb68c0096645d0f9bafce3f`.
