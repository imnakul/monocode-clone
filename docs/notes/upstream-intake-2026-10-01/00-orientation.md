# Stage 0 — Orientation and evidence

All facts below are **Verified** by the named command unless marked otherwise. Observation: 2026-10-01 18:46–18:51 IST (`Get-Date -Format "yyyy-MM-dd HH:mm"`).

## Evidence header

| Fact | Value | Command / evidence |
|---|---|---|
| Local HEAD | `c2c8bf6c2127521b55f3a16e4a1ae58e25014eb6` | `git rev-parse HEAD` |
| Branch | `nakul/windows-support` | `git worktree list --porcelain` |
| Tracked and untracked status | empty | `git status --porcelain` |
| Cached upstream | `43aac9d216c323a7e04c9037eb0b251dd840cc7a` | `git rev-parse refs/remotes/origin/main` |
| Remote main | same `43aac9d216c323a7e04c9037eb0b251dd840cc7a` | `git ls-remote origin refs/heads/main`; no later delta at observation |
| Merge base | `3344bea70341d8ea4d6dea414aa15c13683372e9` | `git merge-base c2c8bf6 43aac9d` |
| Ahead from base | local 98; upstream 128 | `git rev-list --left-right --count c2c8bf6...43aac9d` |
| Last fully integrated stable tag | `v0.1.55`, peeled SHA equals merge base | `git tag --merged c2c8bf6 --sort=-version:refname`; `git show -s --format='%H %cI' 'v0.1.55^{commit}'`; `60cb05d` merge log; archive record 2026-09-24 |
| C: free before clone | 7,610,978,304 bytes | `Get-PSDrive -Name C,E` |
| E: free before clone | 19,266,637,824 bytes (>5 GB) | same; storage gate passed |
| Output ignored | yes | `git check-ignore docs/notes/upstream-intake-2026-10-01/run-log.md` |
| Scratch refs | upstream `43aac9d…`, local `c2c8bf6…` | scratch `git rev-parse upstream-main origin/nakul/windows-support`; exact full SHAs match above |

Tag ranges: `git show -s --format='%H %cI' '<tag>^{commit}'` and `git rev-list --count <previous>..<tag>`. Dates below are commit dates with source offset, not a guessed release-publication time. Annotated tags are peeled.

| Endpoint | Peeled commit | Commit date | Commits from previous endpoint |
|---|---|---|---:|
| v0.1.55 (start) | 3344bea70341d8ea4d6dea414aa15c13683372e9 | 2026-09-23T15:38:57+01:00 | — |
| v0.1.56 | 611e05bcde80c096433ef65f3b085693a1be18c5 | 2026-09-24T14:12:04+01:00 | 19 |
| v0.2.0 | 19b992283debd03664dd5eb07aa820c5034b6338 | 2026-09-25T16:38:07+01:00 | 15 |
| v0.3.0 | c9cdc577996efe71d33d321483521b9de6902004 | 2026-09-27T13:40:37+01:00 | 21 |
| v0.4.0 | 7288fb6ebd1a27758eaec779d95b25797d214e17 | 2026-09-28T17:03:56+01:00 | 21 |
| v0.4.1 | 413d699a39436a03c6fc244f381c41eb3c71a680 | 2026-09-28T17:57:37+01:00 | 1 |
| v0.4.2 | e3220ca6bc466022d3b0b3196fbc911b3fa10d54 | 2026-09-28T18:45:11+01:00 | 2 |
| v0.4.3 | 6ffc99589be087d16bb6d764afdc3502e5046750 | 2026-09-28T19:12:21+01:00 | 1 |
| v0.5.0 | b46230eec3d7854e414dd24135dad95db31e148f | 2026-09-29T13:09:09+01:00 | 13 |
| v0.6.0 | 48fe62a869658929025b0c67cb386b8a59a39d3e | 2026-09-30T13:38:32+01:00 | 26 |
| post-tag (v0.6.0..pinned upstream) | 43aac9d216c323a7e04c9037eb0b251dd840cc7a | pinned range | 9 |

Reconciliation: 19+15+21+21+1+2+1+13+26+9 = **128**.

Names only (`git stash list --format='%gd'`, `git worktree list --porcelain`, `git for-each-ref --format='%(refname:short)' refs/heads`):

- Stashes: `stash@{0}`, `stash@{1}`, `stash@{2}`. Contents never opened.
- Worktrees: `mono-clone`, `mono-clone-hari`, `mono-clone-remote`. Other worktrees never opened.
- Local branches: `codex/antigravity-acp`, `feat/windows-token-usage-and-context`, `feature/antigravity-acp`, `feature/cline-provider`, `feature/compact-rail-hover`, `feature/hari-orchestrator`, `feature/mcp-hub`, `feature/queue-durability-local5`, `feature/remote-chat`, `feature/scheduled-tasks`, `feature/session-migration`, `feature/tasks-foundation`, `feature/wallpaper-halftone`, `fix/titles-and-token-usage`, `main`, `nakul/windows-support`, `temp-backup-context`.

## Rules of this run in my words

1. Freeze the two SHAs; stop if HEAD/cache/tracked status or scratch refs fail their gates.
2. Main checkout Git is read-only; authorized ignored documentation is the only write exception.
3. Simulate only in the one external scratch clone; leave it for review.
4. No source edits, installs, tests, builds, merge resolution, commits, pushes or UI access.
5. Network reads only from upstream; no contact with personal.
6. Protect existing stashes, worktrees and secrets; never read env files.
7. Owner decides product changes; historical standing calls need citations.
8. Distinguish Verified, Inferred and Not checked; overlap alone proves no conflict.
9. Keep stable IDs and exhaustive ledgers/manifests; use PowerShell for timestamps.
10. Complete stages in order, log work and post each completion; preserve a precise resume point if room runs low.

## Doc disagreements and stale instructions

| Where | What it says | What is true now | Follow |
|---|---|---|---|
| Automation contract, boundaries | No saved reports; delete scratch | Trial expressly requires saved notes and no deletion | Trial rules 2/4 |
| NOTES phase 0 / mechanics | Fetch in checkout, merge autonomously | Trial prohibits both; pinned cache suffices | Trial 1/3/5 |
| NOTES companion paths; agreement merge-record path | `docs/upstream-merge-*`, `LOCAL-CHANGELOG.md` | Records under `docs/notes/archive`; LOCAL-CHANGELOG is pointer; numbered current file | indexes and actual archive paths |
| Agreement lifecycle vs trial/worker preference | one feature per worktree, cleanup after verification | No feature implemented here; stage 6 must consider direct worker preference | Trial stage 6; later implementation approval remains required |
| Agreement quality gates/global definition of done | test/build before done | Analysis expressly runs no checks | Trial verification and user instruction |
| Changelog index rollover | >1500 lines roll over | Trial specifically authorizes only entry in CHANGELOG-01 and no index edit | Trial rule 2/stage 8; note rollover needed later |
| SPECS trial row | waiting for approval before handoff | User explicitly invoked trial | Current user instruction; do not edit old row |
| Local profile version | local3 | manifests/HEAD are local5-provider-fixes | Git pinned state; profile correction later |
| FEATURES terminal / MCP / skills and PLANNED current state | 6 Sept statuses, old `src/lib` / `src/surfaces` paths | terminal/MCP/skills status requires current review; tree reorganized | Verify current source; keep old records unchanged |
| NOTES Antigravity paths | omits `src/` prefix | paths under `src/integrations` | Actual pinned tree |
| 23 Sept merge record icon | refreshed upstream icons, but conflict table says keep ours | Internal contradictory decision summary | Do not infer renewed icon approval; flag if touched |
| 24 Sept merge record | deferred two post-tag streaming fixes | Those commits are now part of 128 candidates | Inventory once in their first subsequent release; no assumption that previously integrated |
| Parking record “Next” | provider work pending / local3 / no branch commit | Done specs and 1 Oct local5/push record supersede that dated status | newest records; no personal contact |

## Open questions

- Not checked: remote release publication timestamps; commit dates above are sufficient ancestry evidence but not publication evidence.
- Owner questions for stage 5: selected features versus whole release series; include nine post-tag commits; next local version/build kind.
- Rule breach recorded in run log: unpeeled annotated-tag read emitted public identity metadata; fixed command form prevents recurrence. No saved identity values.
