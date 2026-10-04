# Review — Local provider conversations, Claude RC and cloud launch backend

Tier: Large. Created: 2026-10-04 (IST).
Branch: `nakul/windows-support-upstream-0.7.0-provider-sessions-backend`.
Base: `9effbed3c2fc2e5945d98bb33dce0655e0bfcc3c` from the original 0.7.0 branch.
Owner: root plus one `gpt-6-luna` / max implementation subagent.
UI work: separate [frontend handoff](provider-sessions-frontend-plan.md).

## Idea

Build the nonvisual foundation for automatic local Claude Code/Codex discovery
and same-provider native resume, MonoCode-only archives, local Claude Remote
Control, and supported cloud launch/actions. The next agent will connect existing
UI components to these APIs; this task does not add UI components or layouts.

User clarification: native IDs retain the provider's own context; no migration,
replay, summaries or cross-provider conversion. Users leave the other application
before continuing here. Simultaneous process sharing is outside this phase.
Cloud jobs are launched here and normally continued on the phone through the
provider. Retain their IDs/URLs and expose only supported CLI actions.

## Research

- Base includes L-01–L-60. Do not change old worktrees or the latest intake branch.
- Existing read-only scanner: `src-tauri/src/session_import.rs`.
- Existing native bindings: `core/sessionImport.ts` and `core/registry.ts`.
  Native resume must fail visibly rather than silently create a fresh chat.
- Claude RC draft: `claude-remote-control-plan.md`; request subtype
  `remote_control` is undocumented. Enable/disable and phone events still need
  the account/phone probe. Implement and mock-test the opt-in backend; report
  real control errors, never invent a successful connection.
- RC is local execution. Cloud is provider-hosted execution; represent separately.
- Codex CLI checked: 0.159.0-alpha.3. Cloud supports exec/list/status/diff/apply,
  not cloud follow-up messages or teleport. Local queue is not cloud follow-up.
- Claude draft records `--cloud`, `-p --cloud <id>` and `--teleport <id>`.
  Feature-detect installed CLI help; retained cloud ID is not a local resume ID.
- Public Claude SDK 0.3.289 has local session listing/history APIs. Direct
  browser/bridge cloud transports require credentials and are outside this work.
- Existing scanners do not cover every new Codex storage layout/custom home;
  inspect and cover known metadata formats with read-only access and fixtures.
- Requested frontend-ui skill is not installed in this executor; earlier Windows
  skill paths cannot be read while Desktop Commander is offline. No frontend
  construction here; next UI agent must load that skill before UI edits.

## Plan

1. Create this spec and its index before source edits.
2. Root: provider-scoped read-only discovery, durable local archive/cloud records,
   typed data APIs/controller, strict same-provider native resume and cloud CLI
   services. Reuse process supervision and CLI resolution; no shell strings,
   token reads, fabricated capabilities or spawns during local scanning.
3. Luna: Claude RC protocol/state/lifecycle, registry API and idle exemption,
   persisted desired settings, reducer events and meaningful regression tests.
   Root owns other files and all documentation; coordinate shared seams first.
4. Keep frontend bridge/controller APIs nonvisual. No App/sidebar/settings/menu
   rendering changes; document exact wiring and persistence responsibilities.
5. Test both independently, then run the full repository gate and build.
6. Commit the concrete backend and handoff on this new fork branch. Do not merge
   it into the original 0.7.0 or upstream-intake branch. Native desktop, CLI account
   and phone tests remain manual; no installer requested.

### Contracts and invariants

- Native source identity includes provider, source profile/root and native ID.
  Repeated refresh/open is deduplicated; archives survive refresh/restart.
- Archive/unarchive changes only MonoCode's record, never provider files or flags.
- Discovery reads metadata, not an import/replay of all conversation history.
  Missing/corrupt/unreadable sources produce honest diagnostics.
- Resume preserves the native ID and original cwd. Never fall back to summary
  or silently start a new provider conversation. Profile mismatches fail clearly.
- RC desired state survives restart; live status/URL comes from the Claude
  response/process exit. No app-launch process fan-out. Consent gets actionable
  recovery. Rapid actions/stale responses and process exits remain safe.
- RC prevents idle parking while desired/enabling/on; disabling restores normal
  parking. Phone-originated results cannot finish a MonoCode turn; sends wait
  for an external turn to finish. Existing approvals/cancellation continue working.
- Cloud action capabilities are provider/CLI-specific. Codex follow-up and
  teleport remain unavailable with reasons. Claude teleport is separate from
  native resume and cannot silently stash/change a dirty checkout.
- Cloud launch accepts a configured environment/branch only where supported.
  Do not promise the local model or unsaved files carry into cloud execution.
- No remote-host engine changes or simultaneous ownership work in this phase.

## Todos

- [x] Pin 0.7.0 base and create the requested isolated branch/worktree.
- [x] Read working agreement, feature index and relevant provider spec.
- [x] Search required frontend skill and record its unavailable source.
- [x] Write backend and UI handoff specs before source implementation.
- [x] Inspect discovery/profile formats and source-error behavior.
- [x] Implement provider-scoped discovery and durable MonoCode archive state.
- [x] Implement direct native resume/deduplication and strict failure behavior.
- [x] Implement Claude RC connection/lifecycle/settings/events.
- [x] Implement cloud launch/retained records and supported action boundaries.
- [x] Finish frontend API/component wiring handoff with actual symbols/files.
- [x] Focused tests and TypeScript pass.
- [x] Cargo fmt/check, full npm run check and production build pass.
- [x] Review preservation, update changelog/local features and checkpoint.
- [x] Commit and verify new branch; hand off UI/account/phone manual checklist.

## Issues and fixes

Checkpoint: new branch based on `9effbed`; specifications preceded source edits.
Root discovery/storage/native-resume/cloud service implementation is in place;
focused native/cloud/process/orchestration and session-store suites pass. Native
bindings retain original cwd after restart. Metadata-only native views have an
explicit verified save path without fake user blocks. Storage scanning occurs
before taking the main session-store lock. Cloud retention/retry and supervised
process cleanup have regression tests. One Luna completed RC, including cancel/
stop during phone-turn waiting and pending-start input validation: 423 focused
tests and TypeScript pass. Discovery reuses pre-existing MonoCode chat identities
and archive metadata; live-only matching is an optional frontend dependency.
Eight focused Rust tests and 36 root controller/store tests pass. Final full gate
passes: 5,365 web tests/488 files; 607 Rust passed/2 ignored; fmt/Clippy/TypeScript.
Final production build and explicit cargo check pass. Host build and complete
confirmation pass: 96 tests/5 skipped. One host Codex effort-between-turns fixture
failed once during parallel validation (`low,low` versus `low,high`); focused
repeats pass on this branch and untouched base, and full branch rerun passes.
No host code/test was changed or weakened. Cause is not confirmed; ordinary
Codex inputs have no `nativeResume`, so the new strict-resume branches are inactive.
Diagnostic logs live under `/workspace/monocode-validation/provider-sessions-*`.
An initial temporary baseline full run omitted its host pre-build and was
invalid for the two build-artifact-dependent tests; it is not regression evidence.
The proper baseline command includes `npm run test:host` and its pre-build.
That proper untouched-base run also passed all 96 tests/5 skipped. The single
effort failure was not reproduced; preserve this evidence if it reappears.
The actual frontend API map, App wiring and error/manual checklist are written.
Backend/source committed and pushed to the new branch at
`67eb8c4028ea87826bcb29ab80cb9a7a174ece7c`; local/remote SHA verified.
Next: frontend agent follows its Todo plan; user/separate desktop session performs
the real CLI/account/phone checklist. No merge/source conflict. RC probe is unavailable
here; automated checks prove state contracts, not account eligibility or phone UI.

## Learnings

An automatic native browser needs only source metadata plus a local visibility
record. It must not call the existing replay/migration UI to continue sessions.

Claude may acknowledge initialization before emitting `system/init`; requiring
that line before writing the first message would reject valid native resumes.
The strict path uses the exact native `--resume` ID, cached identity/account/cwd,
initialize/error/exit checks and rejects a mismatched ID when emitted. The real
CLI/account behavior remains a manual check. Codex uses exact `thread/resume`
response identity and rejects all native resume failures without `thread/start`.

Auto RC enable must wait for its control write, not for the 10-second bridge
response before allowing a normal first send. Explicit enable still awaits the
confirmed response. Saved desired settings must not be pruned merely because
only open tabs have loaded. Live RC status/URL are transient; desired state and
native/cloud IDs are durable and distinct.

## Done

Backend implementation and automated validation are complete; this spec is
Review because real CLI/account/phone checks remain. The frontend plan is Todo
with actual APIs, existing component locations, App integration sequence and
manual checklist. No UI rendering, remote-machine engine or installer changes.
Backend/source commit: `67eb8c4028ea87826bcb29ab80cb9a7a174ece7c`, published on
`origin/nakul/windows-support-upstream-0.7.0-provider-sessions-backend`.
Verified original remote 0.7.0 stays at `9effbed`; upstream-latest stays at
`fa566bc`. Original local worktrees/changes/stashes were left untouched.
No `.tsx`, dependency/lockfile, version or installer changes. All source tests
were completed before committing; this documentation checkpoint changes no source.
Frontend implementation and real provider/phone checks remain explicitly pending.
