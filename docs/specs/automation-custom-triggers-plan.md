# Review — Advanced automation schedules and Operator option

Created: 2026-10-04 (IST).
Branch: `nakul/windows-support-upstream-0.7.0`.
Base: `f79364f3313bc0fd1def304a32b8c85a7c47cb2b`.
Tier: Large (schedule persistence/validation and automation launch boundary).

## Idea

Add an Advanced custom time trigger with a usable numeric five-field cron UI.
Check Operator automations and current Operator persistence. Research plugin
compatibility and a chat-only/project scope design; do not implement plugins.
Reuse existing automation rows, inputs, selects, switches and scheduler.

## Research

- Existing time kinds: hourly, daily, weekdays, weekly. Multiple time triggers
  feed one earliest-occurrence scheduler with missed-run grace and backend
  compare-and-swap claims. Definitions are JSON; optional fields can be added
  with serde defaults without a table migration.
- The renderer calculates next occurrences in the computer's local timezone.
  Keep that convention. Cron has minute resolution, no seconds/year fields.
- Operator already accepts a leading `/operator` in automation instructions.
  App's submit path marks that user turn and grants local app CLI access to
  later turns. The composer chip resets after submission; access does not.
  There is currently no thread-level revoke control.
- App CLI already lists/updates tasks, starts sessions with model/settings,
  lists/creates worktrees, and manages Session Manager drafts. Confirm scopes
  and exact model/effort IDs before claiming an arbitrary task fan-out.
- User confirmed: add the Operator switch if clean and follow the working
  agreement; keep the chat chip visible so actual Operator access is clear.
  Reuse ModeCommandPill as a persistent status (no misleading remove button)
  driven by the existing saved user-turn marker, including compact composers.
- Direct official website fetches were denied by this environment's network
  policy. Context7 successfully returned Claude Code and OpenAI Apps SDK
  documentation with official source URLs; retain findings in a research note.
- Frontend design skill is unavailable in this execution environment, as
  recorded in the preceding repair. No new visual components are needed.
  SocratiCode tools are unavailable; use repository searches.

## Plan

1. Save this spec/index before implementation; preserve the two unrelated old
   untracked UPSTREAM-0.7.0 documents and all existing local features.
2. Add optional `cron` to trigger/legacy definition/draft; add `custom` kind.
   Backend defaults preserve old JSON and validate the same grammar as UI.
3. Support five numeric fields, `*`, lists, ranges, steps and Sunday 0/7.
   Reject malformed/out-of-range values, zero steps, aliases and impossible
   calendar dates. Bound parsing and next-date searches; no minute-by-minute
   multi-year scans on each keystroke. Day-of-month/weekday use cron semantics.
4. Reuse Add Trigger's Scheduled menu for Advanced custom. Time rows also get
   an Advanced switch. Show the complete expression and five labeled fields,
   syntax help, examples, local timezone and next-run preview. Invalid input
   is editable but cannot be saved, and never crashes rendering.
5. Preserve simple schedules, multiple triggers, event triggers, run/recovery,
   session reuse, worktrees, permissions, missed-run grace and manual Run now.
   DST: skip nonexistent local times; repeated wall-clock minutes run once at
   the first occurrence, consistent with existing local daily scheduling.
6. Implement the confirmed Operator option, default it off for old/new definitions,
   persist it, and route manual/scheduled/event/recovered launches through the
   existing `/operator` activation. Do not elevate run permissions, spawn tasks
   automatically, or alter ordinary chat Operator persistence. Explain that
   reused Operator threads keep access when the automation option is disabled.
7. Research Claude Code plugin bundles, ChatGPT apps/MCP and custom GPTs;
   distinguish reusable tool servers from provider/host-specific UI, auth,
   hooks/agents and subscription access. Propose real process/tool isolation
   for Chat only versus Chat + projects; no plugin implementation.
8. Run focused TS/UI/scheduler/Rust validation tests and tsc, full `npm run
   check`, cargo check (Rust changed), production build and diff checks.
9. Update register/changelog/specs, commit/push the existing fork branch, verify
   remote and hand over manual desktop checks. No installer/version changes.

## Todos

- [x] Inspect existing schedule, persistence and Operator paths.
- [x] Save plan/index before source edits.
- [x] Implement and test cron parsing/next dates and legacy preservation.
- [x] Persist/validate custom definitions in Rust with compatibility tests.
- [x] Reuse automation controls for Advanced UI, errors and previews.
- [x] Settle Operator preference; implement switch and persistent indicator.
- [x] Finish plugin research and feasibility/edge-case note.
- [x] Run complete checks/build and update records.
- [ ] Commit/push and verify the remote checkpoint.
- [x] Provide manual dev-mode checklist (execution pending).

## Issues and fixes

Custom parser/next-run integration, backend grammar/defaults and UI are built;
the Operator switch prefixes the existing App submission path and the composer
derives its persistent indicator from saved blocks. Focused checks passed:
162 tests / 9 files, including rendered UI, storage/default compatibility,
DST/leap-day/bounded catch-up and Operator access regressions; tsc and 13
targeted Rust tests passed. Final full check passed (5,530 web / 509 files,
612 Rust passed / 2 ignored, fmt/Clippy/tsc), cargo check and production build.
Final review found a valid eleven-year gap for `0 0 */100 2 1` (February 1st
when Monday). A regression failed with the eight-year bound, then passed with
a bounded 400-year Gregorian calendar-cycle search (still skipping by day).
The updated cron/model/UI tests passed (45 / 3 files). Full check and build
were repeated successfully for that last source change; Rust source is unchanged.
Final logs are in `/workspace/monocode-validation/automation-custom-full-check-final.log`,
`automation-custom-build-final.log` and `automation-custom-cargo-check.log`.
Staged diff check and the new documents' relative-link check passed.
Research is recorded in
[the Operator/plugin note](../notes/automation-operator-plugin-feasibility-2026-10-04.md).
No plugin/app installation or actual automation task has been created.
Desktop automation is prohibited by AGENTS.md; tests exercise models/DOM and
people check the Tauri window.

## Learnings

A disappearing mode chip does not imply revoked thread permissions; persistent
Operator access is derived from the saved user-turn marker.
Calendar weekday constraints can exceed the usual leap-day gap; eight years
was not a safe bound for all valid numeric cron expressions.

## Done

Implementation and final gates are complete; publication and manual review remain.
No plugin runtime/scope setting, installer/version bump or actual scheduled
task/ClickUp operation was created. Existing local features L-01–L-64 remain
on this branch; new behavior is registered as L-65–L-66.

Manual dev-mode checks (`npm run tauri dev`, people only):

- Add Trigger → Scheduled → Advanced custom, or enable Advanced on an existing
  time row. Enter `0 21 * * *`; check the five fields, local timezone and next
  run. Change through an example; save/reopen and confirm the same expression.
- Enter `* * 2 *` (only four fields), `*/0 * * * *` or `0 0 30 2 *`.
  Confirm a useful error and disabled Save; correct it and save again.
- Toggle a simple schedule to Advanced and back; keep a second time/event
  trigger and confirm all rows/model/worktree/permission settings survive.
- Enable Operator mode, select Run now, and inspect its chat. The Operator chip
  stays after submission, a plain follow-up, reopening the chat and compact
  presentation. An unsent Operator draft chip can still be removed.
- Disable Operator in an automation continuing that chat: the chat status stays
  enabled as the note explains. Choose Start fresh to start a normal new chat.
- Verify actual available models, app CLI permissions and isolated worktrees
  before running any task fan-out; ClickUp also requires its own configured MCP.
