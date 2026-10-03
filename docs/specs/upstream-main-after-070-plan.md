# Review — Upstream main after 0.7.0

Created: 2026-10-03 (IST). Large task: upstream intake.
Branch: `nakul/windows-support-upstream-0.7.0-latest-2026-10-03`
Worktree: `/workspace/monocode-windows-upstream-0.7.0-latest`
Base branch: `origin/nakul/windows-support-upstream-0.7.0`
Base commit: `670568689a027c26cefeb2cc1e4b40389339593c`
Previously included upstream: `6bd432cada0f492f076cc93f7ccb3027f4ff7102`
Incoming main: `00d68d342eff3adf23a320fa5e2be97d5e212683` (version 0.7.0)
Push target: `origin` = `https://github.com/imnakul/monocode-clone.git` only.

## Idea

Create a separate remote branch from the latest 0.7.0 integration branch and
include every newer upstream commit and file. Preserve Windows support and
all local behavior, including the recent Task Manager, unified composer,
Drafts group, MCP toggles and per-chat MCP-server approvals.

User authorization: create and push the new fork branch, integrate all main
changes, and use one Luna 6 Max implementation agent. User requires a spec
before implementation and a question before resolving any merge conflict.
The old integration branch remains the baseline; upstream is read-only.

## Research

Fetched the fork baseline and upstream main on 2026-10-03. Local baseline
equals the remote baseline. Their common ancestor is the previously included
upstream commit above. Upstream has seven absent commits, affecting 28 files
(2,378 additions / 523 deletions) and adding six files. No dependencies, Rust,
host, package-version or database files changed in this incoming range.

| Commit | Incoming behavior |
|---|---|
| `929c45b` | Particle animation when a session title updates |
| `f4868d4` | Sidebar animation for newly inserted sessions |
| `3ab724d` | Live remaining-usage display in provider chip |
| `ce656ba` | Slide/reveal animations for linked work-item panel |
| `dcaba3d` | Permissions move to a dedicated picker modal |
| `45c9a22` | Pane entry animation from the split edge |
| `00d68d3` | PR/issue activity timeline with interleaved commits |

Read AGENTS.md and WORKING-AGREEMENT.md; intake decisions in NOTES §0 stay
decided. Read the local-feature index and relevant rows, specs/changelog
indexes, and Windows index. Incoming overlaps include App, Sidebar, quick
composer/pickers, PaneTree, usage accounting, Inbox and shared styles.

Preservation priorities: L-01–L-29 (send/Stop, providers, queues, lazy
terminals, hover, usage, approvals and Windows behavior); L-41–L-46
(Tasks, Session Manager, drafts and Windows composer); L-51–L-59
(reply layout, hover/performance, speed/model selection, recent task/composer
features and MCP controls). Audit all L-01–L-59 after integration.

The original worktree contains two unrelated untracked old sync documents;
they stay there untouched. The new worktree starts from the exact base.

## Plan

1. Save this spec and its index row before any source edits.
2. Use read-only merge analysis to list every conflict. One existing Luna
   6 Max agent may audit overlap without edits or conflict resolution.
3. Explain each conflict in simple language: incoming behavior, our behavior,
   consequence and recommended combination. Obtain the user's decisions
   before resolving any conflict, including mechanical conflicts.
4. Record approved decisions in
   `docs/notes/archive/upstream-merge-2026-10-03-after-070.md`.
5. Merge the pinned incoming commit, weave only approved conflicts, include
   all newly added files and audit clean merges for lost local behavior.
6. Run targeted tests/tsc, then the complete upstream `npm run check` gate
   and production build. Attribute failures before repairs. Do not weaken
   tests or silently fix unrelated pre-existing problems.
7. Update this spec, changelog and preservation evidence. Register changed
   local behavior if any; otherwise record that existing rows remain active.
8. Commit and push this new branch to the fork. Verify ancestry and the
   remote commit. Hand over native desktop checks separately; no installer
   or automated desktop inspection is requested.

## Todos

- [x] Fetch and pin the fork baseline and upstream main.
- [x] Inventory all seven incoming commits, changed paths and new files.
- [x] Create the separate branch/worktree from the exact base.
- [x] Write the spec and add its specs-index row before code.
- [x] Inspect all eight conflict paths; the single Luna read-only audit of
      affected behavior and clean quick-picker merges is complete.
- [x] Receive and record all required conflict decisions: user approved the
      recommended combinations and existing compact quota setting/wording.
- [x] Merge the pinned upstream commit and resolve only approved conflicts.
- [x] Check all six new files and incoming behaviors are retained, with the
      approved compact quota setting/wording divergence.
- [x] Audit the local feature register and add meaningful regression coverage
      for merge-touched behavior where needed.
- [x] Affected regressions pass as part of the full suite; TypeScript passes.
- [x] Full `npm run check` passes (web + fmt/Clippy/Rust tests).
- [x] Production build and diff checks pass.
- [ ] Records updated; commit contains the exact tested source.
- [ ] Push the new fork branch and verify both parents are ancestors.
- [ ] Hand over the manual desktop checklist; mark Review until verified.

## Issues and fixes

Current checkpoint: user replied "Yes do it" after the seven improvements
and preservation choices were explained. All eight resolutions are approved.
Remote branch exists at the unchanged base; source integration is staged.
Read-only preview and approved choices are recorded in
[`upstream-merge-2026-10-03-after-070.md`](../notes/archive/upstream-merge-2026-10-03-after-070.md).
Next action: root commits/pushes the tested pinned integration and hands off
desktop checks. Source integration and root preservation review are
complete; further local updates await the separate user's choice below.
Conflict decisions: approved before source merge on 2026-10-03.
Validation: `npm run check` passed in this new worktree: 5,286 web tests in
483 files, TypeScript clean, fmt/Clippy clean, 596 Rust tests passed / 2
ignored. Production build passed (43.47s) with the existing CSS optimizer
and chunk-size warnings. Diff/unresolved-file checks are clean. Logs:
`/workspace/monocode-validation/upstream-after-070-check.log` and
`/workspace/monocode-validation/upstream-after-070-build.log`.

Concurrent fork update discovered during preservation review: the original
base remote advanced from `6705686` to
`9effbed3c2fc2e5945d98bb33dce0655e0bfcc3c`. Four commits add saved prompts,
Task/MCP polish, Focus/prompt-picker hover, and a Claude Remote Control draft
spec. These commits are not yet included. An incremental read-only preview
finds two new text conflicts: QuickComposer imports (saved prompts versus
permissions imports), and newest changelog entries. App and composer tests
weave cleanly. User has been asked whether to include all four and keep
both sides, or finish the originally pinned baseline. Do not incorporate
or resolve the new overlaps until that choice arrives. Original approved
upstream merge work can continue independently.

Resume by reading this spec, `git status --short --branch`, and the conflict
decision record when present. Check the exact branch/worktree before edits
or commands. Existing Rust validation helper hardcodes the old worktree;
use a task-specific helper that targets this new worktree. Reuse caches
without changing the old worktree. Keep this checkpoint current.

## Learnings

Upstream main remains 0.7.0, so the new branch uses a dated suffix instead
of implying a new release. Incoming changes are frontend-only, but the
merge still requires the complete upstream validation gate.

## Done

Source integration and automated verification are complete for the seven
pinned incoming commits. Commit/push is the next step. Four newer local
commits remain excluded pending the separate inclusion/conflict decision;
they are preserved on the original remote branch. Native desktop verification
is pending, so this spec is Review rather than Done.
Manual checklist after automated gates: new permissions picker with
Task/Session + Save to Draft/Start flows; collapsed Drafts and sidebar hover
with title/insertion animations; usage chip; split pane entry; PR/issue
timeline and panel motion; Windows lazy terminals/Stop/Queue/Steer; MCP
toggles and per-chat server approvals. Run manually in a separate desktop
session or by the user, following AGENTS.md.
