# Review — Duplicate submission and recent control regression review

Created: 2026-10-05 (UTC).
Branch: `nakul/windows-support-upstream-0.7.0`.
Base: `728ab243b9490c89eee3564ca40bb96c6d16fd27`.
Tier: Medium (shared submission flow and focused adjacent regression review).

## Goal and evidence

The user observed the same Claude prompt answered twice with Remote Control on.
App.tsx awaits sendBranchTurn, which submits normal and branched prompts, then
unconditionally awaits sendTurn again. This shared local submission defect is
independent of RC and affects other harnesses. Operator instructions currently
appear only in the second prompt, so removing that send alone loses behavior.

## Plan and files

- Prepare the complete prompt, including Operator instructions, before the one
  branch-aware send in src/app/App.tsx. Keep native fork/summary recovery and
  explicitly requested orchestration repair turns intact.
- Add regressions exercising the production submission section, including
  ordinary/Operator sends, failures, native branches, summary fallback, Stop,
  and handoff/inbox wrappers. Use existing components and session machinery.
- Review recent phone event lifecycle, Operator revocation, provider paging,
  cloud launch and automation scheduling for concrete adjacent defects. Fix
  only verified issues with focused regression coverage; record other findings.
- Update LOCAL-FEATURES.md and Current changelog. Preserve unrelated untracked
  upstream notes. Do not build a mobile interface, installer, or new bridge.

## Risks and verification

Do not remove safe pre-delivery native-fork fallback or intentional proposal
repair. Do not resend unknown delivery failures. Phone completion must not
settle local submissions. Native phone/desktop testing remains a human follow-up
per AGENTS.md; automated checks do not prove the provider's undocumented wire.
Run focused tests, strict TypeScript, full web suite and production build.
Rust gates apply only if Rust source changes. No push requested for this task.

## Checklist

- [x] Read agreement, inspect branch and confirm duplicate submission.
- [x] Save spec and index before edits.
- [x] Add failing production regression.
- [x] Repair single submission without losing Operator or branch behavior.
- [x] Review adjacent recent changes and cover confirmed defects.
- [x] Complete verification and update records.
- [x] Hand over concise desktop/phone checks.

## Findings and progress

- App's production dispatch is executed in a regression harness, not copied
  into a test-only flow. Before the repair, ordinary sends for all eleven
  harnesses sent twice; native rejection fallback sent three times. The complete
  Operator prompt now goes through one branch-aware dispatch. Stop-generation
  checks protect asynchronous prompt preparation and post-turn follow-up work.
- Show more could start after a refresh incremented the generation but before
  it replaced old cursors, then mix old paging results with the refreshed list.
  The store rejects paging during refresh and the existing button is disabled.
- Hidden idle-session detachment bypassed the registry's RC idle-park exemption
  and called forgetHarnessSession, killing opted-in RC processes. The hook now
  retains desired/connecting/on Claude RC sessions and independent phone turns.
  Disabling RC or finishing a phone turn restores ordinary detachment.
- Before-fix regressions reproduced duplicate sends, overlapping paging and
  four hidden-RC detachment failures. Focused submission/control/cloud/cron
  checks passed (311 tests); the final four repaired areas passed (64 tests).
- The first broad suite overlapped newly added RC regressions while still red;
  those failures belong to this task. Run a fresh complete gate after the fix.
- Reviewed cloud launch single-flight/retention handling, saved Operator
  Off/re-enable, phone lifecycle isolation, paging failure/cursor preservation
  and automation cron/claim paths. No further confirmed defect in those paths.
- Current unrelated untracked files are UPSTREAM-0.7.0-PROGRESS.md and
  UPSTREAM-0.7.0-SYNC.md; they remain untouched.

## Manual follow-up

1. Send once in a new local Claude chat with RC on; verify one prompt/answer on
   phone and desktop. Repeat with RC off and a second supported harness.
2. Start Operator once, confirm one response with working app tools, turn it
   Off and confirm a plain follow-up stays off. Check a native branch as well.
3. Close the RC chat's tab, send from phone, then reopen it; verify the process
   stays connected and transcript updates. Disable RC and verify idle cleanup.
4. Refresh a provider folder while expanded; Show more waits, then adds older
   chats once without duplication or lost rows.

## Verification checkpoint

Fresh full `npm run check:web` passed: 5,572 tests / 512 files and strict
TypeScript. Production `npm run build` passed; `git diff --check` is clean.
The first broad run had exactly four red hidden-RC regressions (5,568 passed);
all four passed after the fix, including in the fresh complete suite. Existing
test stderr includes React act/DNS warnings; they did not fail tests. Build
reports the existing chunk-size warning. No Rust source changes.
Source changes are local and uncommitted; no push/installer requested.
