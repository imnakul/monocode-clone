# Review — Provider controls and upstream motion repairs

Created: 2026-10-04 (IST).
Branch: `nakul/windows-support-upstream-0.7.0`.
Base: `47778ddcd9a8ca87135c71fe7580b25bdf7fd982`.
Worktree: `/workspace/monocode-windows-upstream-0.7.0`.
Tier: Large (provider creation flow and merged UI integration).

## Idea

Repair the missing Local | Cloud and Claude Remote Control controls on the
normal new-chat screen, complete the cloud creation/list wiring, and inspect
the seven previously integrated upstream improvements for missing behavior.
Preserve all existing fork features and use existing UI components.
User authorized: "Yes, fix them all" and investigate absent title/slide effects.

## Research

Remote 0.7.0 now combines provider frontend `ff70130` and upstream intake
`fa566bc`. Both lines are complete ancestors. The local worktree was safely
fast-forwarded from `6705686` to the combined base; two unrelated untracked old
sync documents remain untouched. No merge/conflict resolution is requested.

Confirmed defects before implementation:
- App supplies the cloud outcome/RC handlers but PaneTree neither declares nor
  forwards them to SessionPane. Normal chats therefore hide both controls.
- QuickComposer does not offer the cloud execution choice or route cloud sends.
- Provider refresh reloads local conversations only. Cloud-load errors are not
  shown. Cloud records are only retained MonoCode launches; external cloud
  discovery/teleport remains outside this repair.
- Incoming motion exists in source; inspect actual rendered fork surfaces and
  reduced-motion gates before changing it. Do not disable accessibility settings.

Frontend design skill is not available in the installed cloud/executor catalog
or local skill roots. This task repairs established components and contracts,
without a new visual design. SocratiCode tools are not exposed in this runtime;
use repository text search and direct source review.

## Plan

1. Save this spec/index before source edits; keep checkpoints current.
2. Use one user-authorized Luna 6 Max agent for the quick creation and cloud-list
   paths. Primary agent owns PaneTree/normal composer wiring and motion audit.
   Shared source ownership: agent owns App/QuickComposer/cloud hooks; primary
   owns PaneTree/session cards/Sidebar/TitleBar. Coordinate before overlap.
3. Fix normal-pane controls and native-session eligibility; preserve local
   send, drafts, Task/Session, model/permissions, saved prompts and RC intent.
4. Add Local | Cloud to Session-mode quick creation using the existing switch
   and launcher; never launch a local turn for a cloud submit. Retain failures
   and exactly-once IDs; do not convert saved local/native history into cloud.
5. Refresh retained cloud records with the provider list, surface read failures
   and retain loaded records on failures. Account changes/late results must not
   overwrite newer state. Keep external cloud discovery limitations explicit.
6. Audit title particles, inserted session rows, live usage, linked panel reveal,
   dedicated permission picker, pane entry, and PR/issue timeline. Fix only
   confirmed missing wiring/rendered surfaces; keep reduced motion respected.
7. Run affected integration tests/tsc, full `npm run check`, production build
   and diff checks. Existing failures need attribution before repairs.
8. Update changelog/register/specs, commit and push this combined 0.7.0 branch
   to the fork. Recheck remote before publishing; ask before any new conflicts.

## Todos

- [x] Pin branch/base and preserve unrelated local files.
- [x] Write this spec and index before implementation.
- [x] Connect cloud/RC through normal PaneTree, with an integration regression.
- [x] Complete quick Session cloud execution/retention without local send.
- [x] Fix cloud refresh/error/account behavior with meaningful regression tests.
- [x] Audit all seven upstream changes and fix confirmed motion omissions.
- [x] Run targeted checks, complete gates and production build.
- [x] Update preservation evidence, records and checkpoint.
- [ ] Commit/push and verify remote contains both original parent lines.
- [ ] Hand over separate manual desktop/provider checks.

## Issues and fixes

Checkpoint: spec saved before edits. Native desktop automation is prohibited by
AGENTS.md; source review and automated integration tests verify wiring, while
actual Windows motion and real cloud/phone behavior remain manual checks.
Installer/version changes are not requested.

Primary checkpoint: normal PaneTree now forwards the cloud callback, RC desired
set and RC action to every normal/split chat. Native IDs and sidechat context
are excluded from new-cloud eligibility. Shared SessionCard now uses the existing
ParticleText; SessionListItem was extracted unchanged from Sidebar and reused
for ChatPanel/provider lists. Scratch chat rows overlay live titles/models while
preserving saved ordering, pin/archive flags and identity. All 126 primary
integration/audit tests pass (9 files). An earlier new assertion mistakenly
expected a pinned row after an unpinned row; corrected the test to preserve the
existing pin-first behavior. Initial tsc was run before the subagent added the
agreed nativeResume hook field, so that intermediate contract error is expected;
repeat after source freeze. Single Luna agent owns cloud creation/refresh edits.

Source freeze: Luna's focused cloud/quick/provider suite passed 164 tests in
26 files and `npx tsc --noEmit` passed. QuickComposer tests exercise the real
launcher boundary: one provider launch, no local submit, local-worktree guard,
and retention of an unsaved returned ID/prompt even if cross-window delivery
resolves. Final primary composer suite passed 42 tests; session history passed
35 tests including cold-placeholder protection. Final `npm run check` passed
against the frozen combined source: 5,499 web tests / 508 files, TypeScript,
Rust fmt/Clippy (all targets, warnings denied), 609 Rust passed / 2 ignored.
Production `npm run build` passed; `git diff --check` clean. Existing test
fixture stderr and build chunk-size warnings did not fail the gates; no
unrelated source changes were made. Evidence logs are outside the repository
under `/workspace/monocode-validation/provider-controls-{full-check,build}.log`.

Upstream feature audit / where to verify:
| Incoming change | Actual location and trigger | Source status |
|---|---|---|
| Title particles | Visible session row, when its title changes after first paint; not the top tab | Project Sidebar already wired; shared provider/chat cards and scratch live overlay repaired |
| Inserted row | Start a fresh session after the list is displayed; below rows push down | Project list preserved; reused on chat/provider list |
| Live usage | Provider usage chip/details while CLI rate limits update | Present, preserving local used/remaining preference |
| Linked panel slide/reveal | Open the PR/issue linked to a session | Present; panel slides, then fetched content reveals |
| Dedicated permissions | Session mode permission picker in QuickComposer | Present; Task mode unchanged |
| Pane entry | Add a file/chat beside an existing pane | Present; initial panes/tab switches intentionally do not replay |
| PR/issue activity | Inbox detail timeline, including interleaved commits | Present with overview/timeline regressions |

User reports Windows Animation effects ON and `npm run tauri dev`; model-pill
motion is visible. We do not blame reduced-motion settings or change them.
Manual visual verification remains separate from the automated DOM/CSS audit.

## Learnings

Successful feature tests are insufficient if the normal app container drops
optional callbacks. Test the rendered integration path, not only the controls.

## Done

Implementation and automated gates complete on combined 0.7.0; commit/push
verification is the final publication step. No merge conflicts occurred.
Both original parent lines and existing local features remain included.
Manual follow-up: new blank
Claude/Codex chat and quick Session Cloud launch; per-chat Claude RC consent/
retry/phone; cloud records after refresh/restart; title update/new row/split
panel motion with Windows motion enabled and reduced motion respected.
