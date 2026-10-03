# Upstream merge — 2026-10-03, seven commits after 0.7.0

Status: Review; all proposed combinations approved and implemented; full gates pass.
Plan: [upstream-main-after-070-plan.md](../../specs/upstream-main-after-070-plan.md).
New branch: `nakul/windows-support-upstream-0.7.0-latest-2026-10-03`.
Base: `670568689a027c26cefeb2cc1e4b40389339593c`.
Incoming: `00d68d342eff3adf23a320fa5e2be97d5e212683`.
Common ancestor: `6bd432cada0f492f076cc93f7ccb3027f4ff7102`.

`git merge-tree --write-tree` produced a preview only: eight conflicted
files. It has not changed the source worktree or started a merge. All six
new upstream files are in the preview. Both parent lines must be retained.

## Choices requiring approval

The user approved every recommended combination below on 2026-10-03,
after receiving the simple seven-improvement comparison: "Yes do it".

| File | Our behavior | Incoming behavior | Recommended combination and consequence |
|---|---|---|---|
| `src/app/shell/Sidebar.tsx` | Grouped session lists, collapsed Drafts, continuous gliding hover | New-session insertion and title animations | Keep our grouping/Drafts/hover; add upstream animated wrappers inside each group. Taking upstream wholesale would lose Drafts grouping. |
| `src/features/inbox/ui/InboxView.tsx` | Local Inbox hover and existing work-item panels | PR overview imports, activity timeline and animated linked panel | Add the new imports/features while retaining local hover; this is an import conflict, not a choice to remove a feature. |
| `src/features/quick-composer/ui/QuickComposer.tsx` | Task/Session switch, Save to Draft/Start, task fields, embedded workspace controls, Windows shortcut labels | Permissions move out of model selection into a separate picker; header/layout change | Keep our layout and controls, insert the separate permissions picker in Session mode, preserve Task mode and keyboard behavior; avoid duplicate close buttons. |
| `src/features/quick-composer/ui/useQuickPickerMotion.ts` | Supports embedded and native Windows composer sizing | New permissions-picker type | Add permissions to the accepted picker types; retain native/embedded sizing. Taking upstream alone would lose the embedded sizing guard. |
| `src/features/sessions/data/sessionHistory.ts` | Live provider/model tracking, including active-turn model | Live title and linked-work-item updates before save | Update both sets of fields; taking either side alone would lose the other's live updates. |
| `src/features/workspace/ui/PaneTree.tsx` | Existing branch/sidechat actions and local pane behavior | Split pane entry animation wrapper | Put existing pane children/actions inside the upstream animation wrapper; retain local callbacks and pane types. |
| `src/app/shell/UsageProviderChip.tsx` | Remaining quota setting controls compact text, with explicit used/left labels | Show remaining usage setting also controls compact text; detailed captions update live | Decision needed: recommended retain our compact setting/wording, add upstream live detailed captions and retain its meter setting. Alternative: let upstream's setting control compact text, changing the current display default. |
| `src/features/providers/model/rateLimits.ts` | Shared locale-safe quota helpers and used/left tooltip text | Used/remaining tooltip text | Follow the quota decision above; retain local format helpers and other callers. Don't silently replace the existing setting or wording. |

No incoming Rust, dependency, host or database changes. MCP controls and
approval adapters are outside the incoming changed paths, but remain on
the preservation checklist. App source merges cleanly in the preview;
upstream's output-flush ordering is added alongside local queue/terminal
and task-composer wiring. Shared styles add animation rules without
removing local model-row, wallpaper or hover rules.

## Decisions received

Approved: combine all seven upstream improvements with our local features.
Preserve our compact Remaining quota setting, default and used/left wording;
add upstream live detailed captions while retaining its meter preference.
Keep Task/Session, drafts, embedded/Windows sizing, active-model metadata,
branch/sidechat/form/review callbacks and hover behavior. Integrate the
separate permissions picker in Session mode; retain one existing close button.
If a new conflict or incompatible behavior is discovered, stop and explain it
before resolving it. This approval covers the eight inspected paths.

## Implementation and verification

All eight approved resolutions are staged. The rate-limit tooltip retains
the exact local implementation; upstream clamping/countdown tests retain
their assertions with the approved `left` wording. Live preference tests
check that compact text stays independent while meters and detailed captions
change. Additional regressions cover simultaneous title/model/provider/work
item updates, clearing the active model after a turn, Session-only permission
selection in saved drafts, and local pane actions within animation wrappers.

Root checked the L-01–L-59 register against unchanged feature areas and
reviewed affected App/Sidebar/Inbox/composer/history/pane/style wiring.
Windows/Rust, host, provider approval adapters, MCP Settings/backend, Task
Manager, Session Manager, saved session storage, Drafts model, wallpaper,
menus, full model picker and performance overlay are unchanged from `6705686`
in the pinned intake. App adds upstream preloading/output-flush ordering
without dropping local queue, terminal, task-composer or human-message wiring.

`npm run check` passes: 5,286 frontend tests / 483 files, TypeScript clean,
fmt/Clippy clean, 596 Rust tests passed / 2 ignored. Production build passes
(43.47s) with the prior CSS optimizer and chunk-size warnings. Diff and
unresolved-file checks are clean. Source merge
`1f399abecb6fc6529b0a39532ddd0322785c0c92` is published and verified on the
new remote branch. Both baseline/upstream parents are ancestors; zero pinned
upstream commits are absent. Final read-only upstream-main check still
returns `00d68d3`. Documentation handoff follows the source merge without
source changes. No manual desktop testing or installer build performed.

## Concurrent local updates — decision pending

The original integration remote advanced to `9effbed3c2fc2e5945d98bb33dce0655e0bfcc3c`
while implementation was underway:

- `7ac8a79`: saved prompts, including the `!` composer picker and Settings page.
- `f63494d`: Task/MCP polish, hover reflow and in-place MCP switches.
- `25cde00`: centered Task Focus control and saved-prompt picker hover.
- `9effbed`: Claude Remote Control draft spec (planning only).

Read-only incremental preview against the resolved upstream source reports
only QuickComposer imports and top changelog entries as text conflicts.
Recommendation: include all four, preserve both permissions/saved-prompt
imports and keep both newest changelog records. The user has been asked;
no new overlap is approved or resolved yet. This is separate from the eight
original approved resolutions.
