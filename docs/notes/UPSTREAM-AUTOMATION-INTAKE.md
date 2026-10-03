# Upstream automation intake contract

This file controls the daily, read-only comparison of upstream MonoCode with
`nakul/windows-support`. The result is an evidence-backed intake report for
Nakul and a later spec writer. It is not a merge plan or permission to merge.

## Boundaries and sources

- Leave this checkout untouched, including `.git`: no fetch, merge, checkout,
  stash, reset, generated report, test, build, commit, push, or edit. Do not
  disturb uncommitted or ignored files. GitHub access is read-only: no push,
  branch or tag creation, PR, issue, comment, gist, release, upload, or
  mutating API call to either `origin` or `personal`.
- Return the report in the automation response only. Do not save a Markdown,
  JSON, or other report artifact in the checkout, MonoCode's brain/artifact
  folders, GitHub, or another persistent location. If a complete manifest
  cannot fit, continue in response parts or report it as incomplete.
- A disposable analysis clone **outside** this repository is allowed only
  when needed for current upstream source or a merge simulation. Put it in a
  uniquely named scratch directory, record its exact path, and remove only
  that directory after verifying it is the one this run created. Do this on
  success and failure. If cleanup fails, report the path and size as leftover
  local data; never claim the run left no files behind. Do not delete any
  pre-existing artifact or another session's scratch directory.
- Read `AGENTS.md`, `docs/WORKING-AGREEMENT.md`, `docs/NOTES.md` (the upstream
  intake runbook), the latest relevant `docs/upstream-merge-*.md` decisions,
  `docs/changelog/LOCAL-CHANGELOG.md`, and `docs/WINDOWS-CHANGES.md`. These records are
  background; verify present behavior against current source and tests.
- Use `origin` = `hardbeat920/monocode` only as upstream and
  `nakul/windows-support` as the local integration branch. Record `HEAD`,
  upstream `main` SHA, the source of that SHA, comparison base, tag SHAs, and
  observation time. Compare `git ls-remote origin refs/heads/main` with the
  cached `origin/main` before calling that cached ref current. If remote
  inspection fails, say so; never call stale cached data the latest release.
- Pin the verified upstream SHA at the start of the run. If `main` advances
  during analysis, finish the pinned snapshot and mention the newly seen SHA
  as a later delta; do not restart the full report indefinitely. If a prior
  automation result is available and both upstream and local SHAs are
  unchanged, return a short no-change notice instead of repeating the full
  inventory.
- Determine the last *integrated upstream tag* from Git ancestry and the merge
  logs. Give the merge-base SHA separately. A version in `package.json` or a
  tag pointing at a common ancestor is not, by itself, proof of the last
  integrated release.
- Report committed local changes and uncommitted working-tree changes
  separately. A clean branch merge simulation cannot predict how uncommitted
  work or ignored local files will integrate. Name path collisions without
  printing sensitive file contents. Do not inspect `.env*` values or secrets.

## Version and feature inventory

1. List each stable tag after the last integrated tag through the newest
   verified tag, then the exact post-tag `main` range. Give both endpoint SHAs
   for every range. If an upstream release has no new feature, say so.
2. Use release notes, commit subjects, and current upstream source/tests to
   describe user-visible features in plain language. Give the version where
   each first appeared, platform applicability (especially Windows versus
   macOS/Linux), and a source citation (commit or upstream blob at a SHA).
   Separate bug fixes, maintenance, and packaging from features. Do not
   duplicate a feature in later versions just because its files changed.
3. State uncertainty. Do not invent speedups, compatibility, safety, or
   implementation details from a filename or release title. Performance
   numbers require a benchmark in the source material. Do not call a feature
   available on Windows based only on a macOS implementation.

## Complete file inventory and truthful statuses

Build the inventory mechanically from Git for each adjacent version range.
Use exact, repository-relative paths, including tests, configuration, assets,
and docs. Preserve rename old/new paths. Union the ranges for an overall
unique-path count; a path changed in multiple versions appears once in the
overall manifest with all version labels. Reconcile every subtotal to the Git
output before responding. Never use `/**`, `...`, `and tests`, or examples
instead of a complete requested list.

For each path, show upstream status (`A`, `M`, `D`, `R` or other Git status),
version(s), local committed overlap, local working-tree overlap, and one of
these comparison outcomes:

| Outcome | Meaning |
| --- | --- |
| New upstream path | Added upstream and absent from committed local tree. Flag a same-path local untracked file as a collision. New files may still need integration wiring. |
| Upstream-only existing change | An existing path changed upstream but not in local commits since the merge base. Flag any working-tree overlap. This is a textual status, not a behavioral safety guarantee. |
| Both changed, clean merge | Both branches changed the path, but an actual three-way merge simulation completed without a file conflict. Still review behavior and tests. |
| Actual Git conflict | A three-way merge simulation reported an unmerged path or rename/delete/add collision. Identify the conflict kind. |
| Both changed, unverified | The path overlaps, but no valid merge simulation was possible. This is a forecast, not an actual Git conflict. |
| Delete/rename/special | Preserve Git's exact action and explain its likely effect; do not hide it inside an add or modify bucket. |

An intersection of changed-file lists is **overlap**, not proof of a Git
conflict. To claim an actual conflict, simulate a three-way merge of the
recorded committed SHAs in a disposable clone outside this checkout and
inspect its unmerged paths. The simulation excludes local working-tree edits;
show those separately. If a simulation is unavailable, use `Both changed,
unverified`. Do not run `git merge-tree --write-tree` in this checkout because
it can write Git objects even though it leaves working files alone.

Flag **semantic risk** for files that merge cleanly but touch a preserved
local behavior, shared state, migrations, command registration, provider
discovery, persistence, permissions, UI ownership, build/CI, or moved imports
and `vi.mock` targets. The preservation list in `docs/NOTES.md` section 0 is
the starting point, not a substitute for current source review. Include
feature IDs next to file paths so a spec writer can trace impact in both
directions. If a manifest exceeds one response, continue in numbered parts;
if continuation is unavailable, mark the report incomplete with the exact
number of omitted paths. Do not claim completeness for a summarized list.

## User-facing decision table

Cover every actual conflict and every material semantic risk, grouping paths
only when they represent the same product decision. A mechanical version or
import issue can use a short separate row. Explain the current local
behavior, the incoming behavior, and the consequence of choosing each side
in terms a user can recognize. Cite local source/test and upstream source at
the recorded SHA, plus the involved paths. Historical merge decisions may
inform the recommendation, but verify they still describe the live code.

Use these exact action labels:

1. `Keep local change` — upstream behavior would remove an intentional local
   behavior and there is no justified way to retain both.
2. `Bring and overwrite with new change` — source review shows the old local
   behavior can be replaced, including its Windows and persistence cases.
3. `Merge both to keep both functionalities` — the behaviors are compatible;
   state the integration seam and the main regression to test.
4. `Something else` — defer, skip the platform-specific change, split the
   intake round, request a product decision, or investigate an unresolved
   contract. Say which one and why.

Recommendations are provisional. Never mark a product conflict decided on
Nakul's behalf. Where evidence is insufficient, use `Something else — source
review needed` with the missing fact. Do not default all rows to “merge both.”
Do not present committing or stashing another session's uncommitted work as a
required preparation step. Identify its collisions and recommend an isolated
integration checkout with a later, explicit WIP handoff decision.
Call out separately any auth, provider/API contract, database migration,
permission, dependency, CI, or Windows-platform change that needs an explicit
decision or deeper review under the working agreement. The later spec writer
owns edge cases and final integration design.

## Required response format

Start with a short evidence header: local SHA and dirty-tree path count;
last integrated tag and merge-base SHA; upstream main SHA and freshness check;
version ranges; whether a real merge simulation ran; limitations. Then use
these exact sections with visible `---` dividers:

### 1. New upstream features by version

One short, sourced description per feature. Label platform-only changes and
put fixes/maintenance in a separate compact list under the same section.

---

### 2. Complete changed-file inventory

Give counts by Git action and comparison outcome, then **every exact path**
grouped by version and outcome. Recommended row columns: `Path | Version(s) |
Git action | Outcome | Local WIP? | Semantic risk / feature ID`. Include
deletions and renames. Paths that do not exist in the local checkout should
link to an upstream blob at the pinned SHA if links are provided; never make
`file://` links to absent local paths.

---

### 3. Decisions for conflicts and semantic risks

Table columns: `Current local experience | Incoming experience | Evidence
and tradeoff | Suggested action | Paths / confidence`. Keep the first two
columns non-technical. Explain any action other than “merge both” plainly.
End with a brief list of facts the later spec writer must verify and the
product decisions Nakul must make. Do not include implementation code or
execute a merge.

## Final self-check before sending

- All ref SHAs and tag boundaries are explicit; cached data is labeled.
- Every feature is assigned to one first-release range and has evidence.
- Every changed path is present exactly as Git reported; subtotals reconcile.
- Each path has one overall outcome row, even if it changed in several
  versions; added-then-modified still counts as a new upstream path. No path
  appears twice with contradictory working-tree overlap labels.
- “Actual conflict” means a simulated Git conflict, not file overlap.
- Working-tree changes and clean-merge semantic risks remain visible.
- Every displayed commit abbreviation matches its linked full SHA; source
  links resolve to the correct repository, commit, and path.
- Risk and confidence labels distinguish reviewed evidence from unknowns;
  marking every path “Review” or every suggestion “High” is not analysis.
- No code, Git ref, index, or working file in the local checkout was changed.
- No persistent report was written, no GitHub write was made, and the run's
  exact scratch clone was removed or identified as leftover local data.
