# Review — Advanced automation schedule meaning

Branch: `nakul/windows-support-upstream-0.7.0`
Base: `4466f8ce97fc01874de08f3c7c698b5623dc9b4f`
Created: 2026-10-06 (IST)

## Goal and decisions
- Show the actual meaning of a valid advanced cron expression beside the existing next-run preview.
- User clarified minute-by-minute execution was correct. Preserve scheduler, catch-up, storage and existing definitions.
- Record only four Antigravity CLI follow-ups: usage footer, MCP discovery, Remote Control toggle/link, native fork. Other ideas are explanation only.

## Plan and files
- `model/cronSchedule.ts`: describe parsed minute/hour/calendar selections in plain language using the same parser as scheduling. Preserve day OR/AND semantics and Sunday aliases.
- `ui/AutomationsView.tsx`: render the explanation using existing text styles; add a once-every-two-hours example to the existing selector. Keep next run and timezone.
- Tests: demonstrate every-minute versus once-per-two-hours, lists/ranges, day OR/AND, invalid input, and live editor updates.
- Records: this spec/index, L-65, current changelog and `PLANNED.md`.

## Risks and checks
- Avoid implying interval schedules when cron actually selects clock hours.
- Invalid expressions show the existing error instead of a misleading meaning.
- Use the existing parser; no new dependency or component.
- TypeScript, targeted tests, full web suite and frontend build. No Rust changes.
- Manual: open Advanced, edit both full expression and fields; verify meaning and next run update. Scheduler remains unchanged.

## Todos
- [x] Implement description and editor wiring.
- [x] Test and update records.
- [x] Explain CLI feature research; leave four future items unimplemented.

## Verification and handoff
- TypeScript passes; targeted tests 29/29; full web suite 5,627/5,627 across 518 files; production frontend build passes (existing warnings).
- `git diff --check` clean. No Rust/scheduler/provider implementation changes, commit, push or installer.
- Manual desktop check remains: full expression and individual fields update the readable meaning; invalid input hides it; Next run remains present.

## 2026-10-06 timezone follow-up
- Removed the duplicate GMT prefix from both advanced and simple trigger previews.
- India local timezones use a single IST suffix; other computers retain their own timezone.
- Added regression cases for Asia/Kolkata, Asia/Calcutta and UTC; TypeScript and all 50 targeted automation tests pass; diff check clean. Manual India desktop check remains.

## Publication — approved 2026-10-06 (IST)
- Carried reviewed edits onto remote `fda6d39` by fast-forward; kept local5 metadata and all incoming release records. No source conflicts.
- Retained both pre-existing untracked upstream-sync specs unchanged and excluded them from this publication.
- Final-source TypeScript, all 5,630 web tests across 518 files and production frontend build pass. Diff check is clean; no Rust source changed. Publishing the source commit containing this record on the original 0.7.0 branch; no new installer.
