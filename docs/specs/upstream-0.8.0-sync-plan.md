# Progress — Upstream 0.8.0 synchronization

Created: 2026-10-06. Tier: Large (upstream merge/provider changes).
Requested output: `nakul/windows-support-upstream-0.8.0` in
`imnakul/monocode-clone`; create from the existing 0.7.0 fork.

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
- Local Add session work is still uncommitted. The previous publication task
  combined its code with the six remote commits without source overlap.
  Combined gates passed: 5,710 web tests / 526 files, 630 Rust tests (two
  ignored), TypeScript, format, Clippy, cargo check and frontend build.
- Previous publication remains blocked only by documentation confirmation:
  Task Manager and native Add session both used L-70. Proposed resolution is
  retain remote Task Manager L-70 and rename Add session L-71, keeping both
  records. Do not assume that unanswered question has been approved.
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
- [ ] Create and record the new branch/base/worktree.
- [ ] Incorporate pending local implementation and approved upstream changes.
- [ ] Verify all upstream-added paths and local feature preservation.
- [ ] Pass full checks/build; update feature register and conflict notes.
- [ ] Push new branch and verify remote commit/ancestry.
- [ ] Record separate manual desktop/provider checklist.

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
  are in `/tmp/monocode-upstream-0.8.0-intake`. Working source/index/branch are
  unchanged; conflict resolutions have not begun.
- One Luna 6 Max agent completed read-only semantic review. All 46 paths and
  118 hunks are mapped to six proposed keep-both groups in the
  [conflict review](../notes/upstream-0.8.0-conflict-review.md). Includes
  single-send/Stop/queues, distinct Operator/Mono permissions, provider
  identity/MCP/RC/cloud, additive navigation/settings, shared appearance and
  Windows/storage preservation. Version proposal is
  `0.8.0-local1-upstream-sync`; 99 upstream-added paths must be retained.
- User explicitly requires questions before conflict resolution. Preview may
  write temporary Git objects/files but must not resolve or edit source hunks.
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

Intake and read-only conflict forecast complete; both questions approved.
Next action: complete the original 0.7.0 base publication, then create, merge
and publish the new branch using the six approved keep-both groups. The same single Luna 6 Max
agent `upstream_080_review` is idle and available for approved implementation;
do not spawn another implementation agent.

No upstream source merge, new branch or new publication has happened yet.
Only spec/index/changelog/conflict-review documents changed during intake.
Existing native-session source and 0.7.0 remote history remain preserved.
