# Review — Upstream 0.8.0 synchronization

Created: 2026-10-06. Tier: Large (upstream merge/provider changes).
Requested output: `nakul/windows-support-upstream-0.8.0` in
`imnakul/monocode-clone`; create from the existing 0.7.0 fork.
Working branch: `nakul/windows-support-upstream-0.8.0`.
Published fork base: `2a35625e110efdfec47ab34ded0e146d8c79a5f1`.
Exact upstream target: `9ccfc094615aa3170c01ae77a44298aefacdc9de`.

## Idea

Bring current upstream Main, including all new files, into a new fork branch.
Keep every existing local feature, Windows behavior and the pending native
Claude Code/Codex Add session implementation. Ask before resolving conflicts.
Only push to the personal fork. Record each decision and checkpoint here so
another session can resume without repeating or dropping work.

## Research

- Fork base: `origin/nakul/windows-support-upstream-0.7.0` at
  `eaedb3cde2ac2574933c4d57906f983875fd97b0`. Its latest six commits add Task
  Manager week strip/history/timeline and toolbar/board styling.
- Upstream: `https://github.com/hardbeat920/monocode`, Main at
  `9ccfc094615aa3170c01ae77a44298aefacdc9de` (`Release v0.8.0`). Annotated tag
  `v0.8.0` dereferences to the same commit. No post-tag commits at intake.
- Merge base: `00d68d342eff3adf23a320fa5e2be97d5e212683`.
- Incoming: 38 upstream commits and 244 changed paths, including persistent Monos with memory/habits,
  asynchronous Codex questions, transcript/stream/scroll optimizations,
  sidebar/worktree actions, GitHub polling/backoff, file/terminal/IME fixes,
  Pi catalogs, skills cap and colorblind diff palettes.
- At intake, native Add session was uncommitted. It has since been published
  with all six remote Task Manager commits; source overlap was absent.
  Combined gates passed: 5,710 web tests / 526 files, 630 Rust tests (two
  ignored), TypeScript, format, Clippy, cargo check and frontend build.
- The user approved the documentation union: Task Manager remains L-70 and
  native Add session is L-71. Both were published on 0.7.0 before branching.
- Recovery: `/tmp/monocode-native-session-before-sync`, including SHA-256
  manifests, archive, binary patch, proposed documentation unions and recovery
  stash `fff46de99c2f`. Existing untracked `UPSTREAM-0.7.0-PROGRESS.md` and
  `UPSTREAM-0.7.0-SYNC.md` are unrelated legacy records; leave them untouched.

## Plan

1. Fetch/inspect exact upstream and fork heads; read AGENTS/agreement/intake
   runbook and local-feature register. Write this spec before merging.
2. Forecast conflicts without changing working files, including the pending
   native-session implementation. One Luna 6 Max agent assists read-only
   inventory/feature-preservation review until resolutions are approved.
3. Present simple incoming-versus-local choices, with file lists, consequences
   and a recommended way to keep both. Get approval before resolving.
4. Create the requested new branch from the verified fork base, preserving
   pending work and recovery copies. Do not rewrite original 0.7.0 history.
5. Incorporate upstream with full ancestry and all additions. Apply only
   approved conflict resolutions; document each hunk/group and repair imports,
   provider/storage interfaces, mocks and tests without dropping local behavior.
6. Run strict TypeScript, targeted regressions, full `npm run check`, cargo
   check and production build. Attribute pre-existing/environment failures.
7. Publish the new branch normally, verify remote hash and both ancestries,
   and leave separate signed-in Windows/provider/UI verification for humans.

## Todos

- [x] Fetch/review fork and upstream heads and confirm release/tag relationship.
- [x] Write tracking spec before implementation.
- [x] Add spec-index/changelog tracking entries.
- [x] Forecast textual and semantic conflicts with one Luna 6 Max agent.
- [x] Confirm prior documentation resolution and upstream conflict choices.
- [x] Create and record the new branch/base/worktree.
- [x] Incorporate pending local implementation and approved upstream changes.
- [x] Verify all upstream-added paths and local feature preservation.
- [x] Pass full checks/build; update feature register and conflict notes.
- [x] Push new branch and verify remote commit/ancestry.
- [x] Record separate manual desktop/provider checklist.

## Issues and fixes

- User approved both questions on 2026-10-06: “Yes, keep both as proposed”
  (all six conflict-review groups) and “Yes, publish both on 0.7.0 first”.
  Retain Task Manager L-70, native Add session L-71; complete the original
  publication, then create the new 0.8.0 branch. These decisions authorize the
  documented weaves; ask only for newly discovered choices outside that scope.
- Read-only `git merge-tree` preview of pending local work against exact
  upstream Main reports 46 conflicted paths. Snapshot commit
  `efb7c50ce8c40307e9c5d12b3eba893e8d8826c3` is an unreferenced preview object,
  not a branch/publication. Manifest, preview output and conflicted-file copies
  are in `/tmp/monocode-upstream-0.8.0-intake`. That preview did not edit working source. Approved implementation now uses
  the active merge checkpoint below.
- One Luna 6 Max agent completed read-only semantic review. All 46 paths and
  118 hunks are mapped to six proposed keep-both groups in the
  [conflict review](../notes/upstream-0.8.0-conflict-review.md). Includes
  single-send/Stop/queues, distinct Operator/Mono permissions, provider
  identity/MCP/RC/cloud, additive navigation/settings, shared appearance and
  Windows/storage preservation. Version proposal is
  `0.8.0-local1-upstream-sync`; 99 upstream-added paths must be retained.
- User explicitly required questions before conflict resolution. The approved
  six-group plan permits current implementation; new choices still need questions.
- Incoming Main touches App, composers/transcripts, native Codex/Claude,
  session storage, agent-app control and shared UI. These carry local Operator,
  single-send/Stop/queue, RC/cloud/default, server MCP approval, native resume,
  usage/settings/Windows features. Taking entire files from either side is unsafe.
- Branch creation/publishing is authorized. Preserve previous task objectives;
  if base-publication ordering matters, ask and record the accepted sequence.

## Learnings

- Tag and Main are currently identical. Refetch before final publication and
  record any newly arrived commits rather than silently changing the target.
- Current working-tree code contains both Task Manager updates and native Add
  session. Their pre-sync source preservation was proven with exact hashes.

## Done

Approved keep-both source merge and native Find follow-up are implemented,
fully checked and normally published on the new 0.8.0 branch. Source merge
commit is `4589270762bbcd06f2185fecd8d4c9255e0dcaf3`; its remote hash and both
parents/ancestries were verified. Remaining work is the separate signed-in
Windows/provider/phone checklist. Earlier checkpoints below are historical;
read the final publication checkpoint before resuming. No merge remains active.

## Approved base publication checkpoint

Native Add session plus all six remote Task Manager commits were normally
pushed and remote-verified on 0.7.0 at
`8ac5bc0cddebff2496774a16a69f294c70cf41d8`. L-70/L-71 records and all intake
docs are retained. All original combined-source preservation hashes match
the passed 5,710 web/630 Rust gates; two unrelated untracked upstream-sync
records remain untouched. Next: branch from the ensuing documentation
checkpoint and perform approved source merge with the same Luna agent.

## New branch checkpoint

Created `nakul/windows-support-upstream-0.8.0` from published 0.7.0
documentation checkpoint `2a35625e110efdfec47ab34ded0e146d8c79a5f1`.
Worktree remains `/workspace/monocode-windows-upstream-0.7.0`; its directory
name is historical, while the active Git branch is the new 0.8.0 branch.
Upstream target is still exact `9ccfc09`. Publish this initial tracking
checkpoint on the new branch, then merge approved source changes. The
checkpoint is a starting point, not a finished 0.8.0 implementation.

## Historical active merge checkpoint

Initial new-branch checkpoint `dbb3264` was normally published with upstream
tracking to `origin/nakul/windows-support-upstream-0.8.0`. Source merge
`git merge --no-commit --no-ff upstream/main` is active with
`MERGE_HEAD=9ccfc094615aa3170c01ae77a44298aefacdc9de`. Actual conflicts match
the preview: 46 files / 118 hunks; upstream additions are in the merge index.
The same Luna 6 Max agent `upstream_080_review` owns all source/test/manifest
resolutions and necessary repairs under G1–G6. Primary owns documentation,
review, full validation, merge commit and publication. Approved per-file
integration contracts are recorded in [the merge decisions](../notes/archive/upstream-merge-2026-10-06-080.md). No source merge commit
or finished 0.8.0 publication yet. Do not abort/reset/restart this merge on
resume; inspect Git status and agent messages, then continue remaining work.

Original 0.7.0 remote is preserved at
`2a35625e110efdfec47ab34ded0e146d8c79a5f1` and includes published native
source `8ac5bc0`, all Task Manager commits and the approved records. This
work is now exclusively on the new 0.8.0 branch. Two pre-existing untracked
legacy upstream-sync documents remain outside all commits.

## Review and validation checklist

Automated/source review after Luna finishes:

- Verify all 99 upstream additions against the saved added-path manifest.
- Compare the 70 protected dedicated local files with their saved hashes;
  inspect any deliberate change rather than assuming source equality alone
  proves shared wiring.
- Review ordinary/Operator submit, Stop during prompt preparation, native
  branch handling, queue edit/steer and cancellation/deletion durability.
- Confirm blank native resume persistence and Mono transcript suffix writes
  both preserve provider-account identity, queues and old database upgrades.
- Check one approval reply path per provider, Plan/Stop gates, scoped MCP
  grants, asynchronous Codex questions and Claude RC UUID routing.
- Check Mono assigned-project guards independently from Operator permissions;
  no implicit Mono access or transcript rotation in ordinary native chats.
- Confirm all providers, dynamic model-picker width, Prompts/Chat/Tasks/Session
  Manager, embedded title bars and the stable-frame hover/glass contract.
- Run full `npm run check`, cargo check, production build and diff checks.

Separate human checks (not implementation-agent desktop driving):

- On Windows, start ordinary and Operator chats; send/queue/steer, Stop,
  restart with held attachments and remove a session with its terminal.
- Find a saved Claude Code and Codex conversation, compare names/ages with the native picker, and resume in the same account;
  confirm historical text stays display-only and failed resume stays explicit.
- Test Claude RC from the phone: one message/response on each surface, stopping
  and toggling without duplicate dispatch or stale transcript.
- Open Mono memory/habits/projects and test completion notices; then verify
  normal chats still have their own controls, permissions and context.
- Check providers/MCP/quota footers, saved prompts, Tasks week strip, embedded
  tabs, wallpaper/menus and shared sliding hover in the native desktop build.

## Implementation ownership update

The single Luna agent reached its usage limit during storage repairs. Primary
has taken all remaining source ownership and continues the approved merge;
no additional subagent is needed. App's 19 conflicts and the remaining source
markers are resolved; TypeScript/behavior repair is now in progress. Luna's
session-store, Mono queue and assigned-project guard work remains preserved.
Initial host runs were blocked by known incomplete source markers, not an
attributed host regression; rerun after repair. User also authorized the explicit
Add session Find-picker follow-up; plan is appended to the native-session spec.

## Final repair checkpoint

All 46 conflict paths are resolved in source under the approved per-file
contracts. The single agent stopped at its usage limit; primary finished
integration and repairs. The authorized native Find picker is implemented
with the existing Modal, SearchableSelect and ProviderConversationList.
Read-only filtering happens before ten-row pagination, and selecting a row
uses the same exact-account native binding without sending a prompt.

Integration repairs preserve Mono completion/optimistic queue metadata and
held state, restart attachment bytes, one ordinary/Operator submit, Stop
across async native validation, one approval reply with its chosen scope,
Mono assigned-project guards, Notes Markdown actions/labels and upstream
finished-Mono labels. Terminal font defaults retain Nerd Font fallbacks and
Windows Cascadia/Consolas; custom font settings still apply. Shared diff
counts use the incoming accessible palette while keeping local compact counts.

Audit: all 99 upstream additions exist. Of 70 protected dedicated local
paths, only three deliberately change for Find: provider_sessions.rs,
provider_sessions/tests.rs and providerSessions.ts. All others match their
pre-merge hashes. All six version locations are 0.8.0-local1-upstream-sync.
Main and the peeled release tag were checked again and remain 9ccfc09.

Validation is in /tmp/monocode-upstream-0.8.0-intake. Focused repair suites,
Find (including stale reads/account guards), native dispatch, queue reload,
Mono task/board authorization, Rust provider discovery and production build
pass. Final full npm run check passed; source is ready for the merge commit and normal publication.
The first broad run exposed integration/test-fixture gaps subsequently
repaired. The unchanged Linux orphan-reaping test failed because this container's PID 1
leaves orphaned zombies, so kill(0) still observes their process group. The
production source and assertions are unchanged. A task-local validation
subreaper (`validation-subreaper.py`, outside the repo) provides normal parent
reaping: the isolated test and full Rust suite pass (661 passed, two ignored).
The final literal npm run check uses that wrapper and two Vitest workers;
no repository test configuration or assertions were relaxed.

Extra host suite: 102 passed, 5 skipped, one pre-existing providers-parity
failure because the existing remote host omits Antigravity CLI. Its registry,
protocol provider list and parity test are unchanged from the 0.7.0 base;
the local HARNESSES list also has the same twelve members. The test remains
intact. Do not advertise remote-host Antigravity CLI support from this merge.
This extra host result is separate from the required npm run check bar.


## Final automated verification

The final literal `npm run check` passed: 6,268 web tests in 576 files,
TypeScript, Rust format, Clippy with warnings denied, and 661 Rust tests
(two existing ignored). Log: `final-check-reaped.log` in the recovery directory.
Standalone cargo check and production build passed; existing CSS `::highlight`
minifier and chunk-size warnings remain. No source or test assertion was
changed for the container's process-reaping limitation; see the wrapper
explanation above. The extra host gap remains documented and out of scope.

All source markers are gone; stage the 46 resolved paths plus the new upstream
files, our archive record and MessageQueue.completion.test.ts. Keep the two
legacy untracked 0.7.0 spec files untouched. Merge commit message:
`merge(upstream): sync main through 0.8.0 and preserve local features`.
Next: normal push to origin/new 0.8.0 branch, verify both upstream/fork ancestry
and remote head, then record publication. Windows/provider/phone visual
checks remain separate and are not claimed as performed.


## Final publication checkpoint

Source merge `4589270762bbcd06f2185fecd8d4c9255e0dcaf3` was normally pushed to
`origin/nakul/windows-support-upstream-0.8.0`, then verified with ls-remote.
It has two parents: `dbb32644a7e52a0b661e2b4520d7aa61721dab94` (fork checkpoint)
and `9ccfc094615aa3170c01ae77a44298aefacdc9de` (upstream Main/v0.8.0).
Ancestry checks prove inclusion of that upstream target and the published
0.7.0 base `2a35625e110efdfec47ab34ded0e146d8c79a5f1`. Original 0.7.0 remote
still matches that base. Main/tag were rechecked before publication and still
match 9ccfc09, with no later commits at that check.

Staged preservation audit: no unmerged entries/markers, all 99 additions,
67/70 protected files byte-identical and three intentional Find changes,
six aligned version fields. Two pre-existing untracked legacy specs remain
untouched. This ensuing documentation-only checkpoint records publication;
its application source/tests are byte-identical to the fully passed merge.
The remote branch's latest documentation hash is obtainable with git log;
no further code changes or merge work remain. Status stays Review for human
Windows/provider/phone checks, not another implementation-agent UI session.
