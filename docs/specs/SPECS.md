# Specs index

Read this index first, then open the relevant spec. Add a row whenever a spec is created.
Done specs live in [archive/](archive/) (moved there when marked Done; links point into it). Open one only when a
task needs its history; do not search the archive by default.

Allowed workflow statuses: **Todo**, **Progress**, **Done**, **Blocked**, **Review**, **Draft**.
The status appears before each spec name below and in its heading; filenames stay stable.
Draft means a proposal is still being shaped. Review means implementation awaits review or manual verification.
Imported historical feature plans are labeled Done at Nakul's request; their original caveats remain in the documents.
Uncertain and superseded material lives in [notes/archive](../notes/archive/README.md).

Display order: Draft → Review / Blocked → Todo → Progress → Done. Review and Blocked share one section while retaining their individual status labels. Each group is newest first by the date in its Created column (the date the spec was written; no filesystem lookup needed).
Small tasks have no spec (see the tier table in `docs/WORKING-AGREEMENT.md`).

## Draft

| Created (IST) | Spec | Notes |
|---|---|---|
| 2026-10-04 23:48:33 | [Draft — Repeatable Windows installer build — delegation runbook](repeatable-windows-installer-build.md) | Reusable lower-cost-agent checklist and copyable prompt: dynamic version, checks, storage/failure stops, archive verification and per-run records. Explicit build invocation approves that run; keep this standing document for reuse. |
| 2026-10-03 | [Draft — Claude Remote Control for MonoCode sessions — spec](claude-remote-control-plan.md) | Phase 0 manual probe (Nakul, phone) gates Phase 1. Uses the CLI's undocumented stream-json `remote_control` request. Cloud sessions, remote hosts and Codex are follow-ups. |
| 2026-09-27 02:47:38 | [Draft — Prepare for a break — spec](prepare-for-break.md) | Depends on Native Branch and Claude cold-resume warning. |
| 2026-09-27 00:57:16 | [Draft — Claude cold-resume warning — spec](claude-cold-resume-warning.md) | Depends on Native Branch. |

## Review / Blocked

| Created (IST) | Spec | Notes |
|---|---|---|
| 2026-10-06 | [Review — New chat execution default](new-chat-execution-default-plan.md) | Local / Remote / Cloud preference, visible draft defaults and explicit quick-composer delivery. Automated verification and manual checks recorded in the spec. |
| 2026-10-05 | [Review — Duplicate submission and recent control regression review](submission-duplicate-repair-plan.md) | Single complete prompt submission with Operator/branch/Stop preservation; refresh-safe paging and hidden Claude RC retention. Full web gate passed (5,572 / 512 files), TypeScript and build passed. Source `89cc8e0`; approved publication merge with newer remote `c966e80` passed full checks (5,585 web, 613 Rust / 2 ignored) and build. Publication merge `150e79c` pushed and remote-verified. Manual desktop/phone checks remain. |
| 2026-10-04 | [Review — Provider lists, reversible Operator and phone transcript streaming](provider-control-followups-plan.md) | Ten-row paging, one refresh, RC labels, real Operator Off and isolated phone streaming on combined 0.7.0. MonoCode-created cloud only. Full check (5,547 web / 612 Rust), cargo check and build passed; manual phone/desktop checks remain. Session Manager direct-SQL diagnosis documented. Source `da14888` pushed and remote-verified. |
| 2026-10-04 | [Review — Advanced automation schedules and Operator option](automation-custom-triggers-plan.md) | Custom cron editor/validation/persistence, automation Operator switch and saved-chat status chip on combined original 0.7.0. Full check (5,530 web / 612 Rust) and build passed; manual checks remain. Plugin compatibility research only. |
| 2026-10-04 | [Review — Provider controls and upstream motion repairs](provider-controls-motion-repair-plan.md) | Normal/quick Cloud, normal-pane RC, retained cloud refresh/errors and shared motion repaired on combined 0.7.0. Full check (5,499 web / 609 Rust) and build passed; manual desktop/provider checks remain. |
| 2026-10-04 | [Review — Provider conversations, RC and cloud UI](provider-sessions-frontend-plan.md) | Parts A–D are built and merged into combined original 0.7.0. Normal/quick cloud controls and cloud refresh repaired in the current checkpoint; desktop/phone checks and compact-rail/phase-2 work remain. |
| 2026-10-04 | [Review — Provider conversations, RC and cloud backend](provider-sessions-backend-plan.md) | Backend from original 0.7.0 `9effbed`; full gates/build passed. Native provider/phone/cloud checks remain. UI handoff is separate. |
| 2026-10-03 | [Review — Upstream main after 0.7.0](upstream-main-after-070-plan.md) | Both complete lines (`9effbed` + main `00d68d3`) combined and published as `68c1edb`; 5,317 web / 599 Rust tests and build pass. Native desktop checks remain. |
| 2026-10-03 | [Review — MCP controls and server approvals](mcp-controls-plan.md) | Implemented and full gates passed on latest 0.7.0 branch; native desktop/provider checks remain. |
| 2026-10-03 | [Review — Task Manager focus/archive, one composer, Drafts group](task-focus-composer-plan.md) | Implemented on `nakul/windows-support-upstream-0.7.0`; manual desktop checks listed in the spec. |
| 2026-10-02 21:06 | [Review — Windows 0.6.0 build](windows-060-build-plan.md) | Unsigned installer built and archived; exact version requested by Nakul. Three existing test failures documented; desktop verification remains. |
| 2026-09-30 07:30:13 | [Blocked — Orchestration desktop computer-use test — spec](orchestration-desktop-computer-use-test.md) | Four-feature source is archived on `park-other-orchestration-mode-changes-30sept`; T1 remains inconclusive and the desktop cases are untested. |
| 2026-09-25 17:37:20 | [Blocked — Local handoff files and lead control — implementation spec](orchestration-local-artifacts-lead-control.md) | Unfinished implementation is preserved on `park-other-orchestration-mode-changes-30sept`; desktop verification remains. Checkout chooser reverted. |
| 2026-09-25 09:44:34 | [Blocked — Hari on the current orchestration engine — spec](hari-current-orchestration-integration.md) | Hari source is preserved on `hari-orchestration-changes-30sept`; review and desktop verification remain. |
| 2026-09-23 16:53:12 | [Review — Providers initial loading](providers-initial-loading.md) | Implementation recorded; manual visual verification remains. |

## Todo

| Created (IST) | Spec | Notes |
|---|---|---|

## Progress

| Created (IST) | Spec | Notes |
|---|---|---|

## Done

| Created (IST) | Spec | Notes |
|---|---|---|
| 2026-10-02 | [Done — Tasks: Notes parity, List / Table / Board views, peek pane, open beside session](archive/tasks-views-redesign.md) | Built on the 0.6.0 and 0.7.0 integration branches (commits `b5bec1a`…`2990ad0`), later extended with sliding peek pane and shrink-to-fit columns. Changelog 02. Desktop checks done by Nakul. |
| 2026-10-01 | [Done — Upstream intake in one merge: v0.1.56 through v0.6.0 and nine later commits](archive/upstream-intake-one-merge.md) | Carried out as merge `9dcc239` on 2026-10-01 (Changelog 02); 0.7.0 followed in `3113550`. Added to the index 2026-10-03. |
| 2026-10-01 19:43 | [Done — Upstream intake round 1: v0.1.56 — spec](archive/upstream-intake-round-1.md) | Superseded 2026-10-03: upstream 0.6.0 and 0.7.0 were merged instead (Changelog 02). Kept as the record of the round-1 analysis. |
| 2026-09-30 10:56 | [Done — Provider improvements for daily work](archive/provider-daily-work-improvements-plan.md) | Selected scope only. The six child specs were built and closed as Done on 2026-10-01 (build 0.1.55-local5-provider-fixes). This plan stays as the record of the selected scope. Includes mandatory storage blocker. |
| 2026-10-01 18:39:35 | [Done — Upstream intake after v0.1.55: analysis, plan and round-1 spec (analyst trial) — spec](archive/upstream-intake-analyst-trial.md) | Analysis only, no merge. Run by GPT-6 based Codex in 72 minutes; output in `docs/notes/upstream-intake-2026-10-01/`. Claude's rating: 45 of 55 — exact on facts, generic on judgement; delegation list in the Handoff retro. The round-1 spec it drafted stays Draft. |
| 2026-10-01 14:30:26 | [Done — Provider batch follow-up fixes — spec](archive/provider-batch-followup-fixes.md) | Fixes A–E in `b905b8c`, `0a27328`, `4423fd8`; Composer test fix F in `35b1f2b`; AC-13 test line in `d691035`. Claude's review passed with no rework. Closed 2026-10-01: Nakul reported build 0.1.55-local5-provider-fixes fine (per-check results not itemized; caveats stay in the spec). Pushed to the fork at `c2c8bf6`. |
| 2026-09-30 21:01:07 | [Done — Codex MCP forms — spec](archive/codex-mcp-forms.md) | Committed `3a47202` from Luna's patch after Claude's review (8.5/10). Not tried against a real form-sending MCP server; covered by tests only. Closed 2026-10-01: Nakul reported build 0.1.55-local5-provider-fixes fine (per-check results not itemized; caveats stay in the spec). Pushed to the fork at `c2c8bf6`. |
| 2026-09-30 21:00:14 | [Done — AI helper model settings — spec](archive/ai-helper-model-settings.md) | Implemented in `84fbe89`; focused tests, TypeScript and Rust checks pass. Closed 2026-10-01: Nakul reported build 0.1.55-local5-provider-fixes fine (per-check results not itemized; caveats stay in the spec). Pushed to the fork at `c2c8bf6`. |
| 2026-09-30 12:09:28 | [Done — Accurate context breakdown for Claude and Codex — spec](archive/context-accuracy.md) | Committed `11981c0` by Sol 6.1 Low; Claude's review 8.5/10, nothing to fix. Closed 2026-10-01: Nakul reported build 0.1.55-local5-provider-fixes fine (per-check results not itemized; caveats stay in the spec). Pushed to the fork at `c2c8bf6`. |
| 2026-09-30 12:04:01 | [Done — Claude live model and permission changes — spec](archive/claude-live-controls.md) | Committed `9dfeaa0` from Luna's patch after Claude's review (8/10). Closed 2026-10-01: Nakul reported build 0.1.55-local5-provider-fixes fine (per-check results not itemized; caveats stay in the spec). Pushed to the fork at `c2c8bf6`. |
| 2026-09-30 12:00:30 | [Done — Session approvals for Claude and Codex — spec](archive/session-approval-scopes.md) | Umbrella slice 1, implemented in `bf41013`. SA-1 failed on local4 (no Codex session option); fixed by follow-ups A, B, C in `b905b8c` and `0a27328`. Transcript buttons narrowed again in `3f5834b`. Closed 2026-10-01: Nakul reported build 0.1.55-local5-provider-fixes fine (per-check results not itemized; caveats stay in the spec). Pushed to the fork at `c2c8bf6`. |
| 2026-09-30 09:26:16 | [Done — Park Hari and orchestration work before upstream intake — spec](archive/park-orchestration-hari-upstream-handoff.md) | Both fork archives verified; four-feature source separated; local archive branches/worktrees removed after final verification. Retained-code gate results and pending intake details recorded. |
| 2026-09-27 00:22:09 | [Done — Native Branch (provider-owned fork) — spec](archive/native-branch.md) | Committed `f1a4712` by Sol 6.1 Low; Claude's review 8.5/10. Follow-ups D and E in `4423fd8`. Whether Claude honours `--session-id` with `--fork-session` was never observed directly; fix D covers both cases. Closed 2026-10-01: Nakul reported build 0.1.55-local5-provider-fixes fine (per-check results not itemized; caveats stay in the spec). Pushed to the fork at `c2c8bf6`. |
| 2026-09-25 01:21:41 | [Done — Wallpaper effects — plan](archive/wallpaper-effects-plan.md) | Imported historical feature plan; retain its original verification caveats. |
| 2026-09-24 22:34:05 | [Done — Windows compact rail and wallpaper release — spec](archive/windows-rail-wallpaper-release.md) | Corrected installed pass confirmed by user; fork push recorded. |
| 2026-09-24 14:50:04 | [Done — Compact rail hover and wallpaper Halftone — plan](archive/compact-rail-wallpaper-halftone-plan.md) | Imported historical feature plan; retain its original verification caveats. |
| 2026-09-24 14:50:04 | [Done — Compact rail hover and wallpaper Halftone](archive/compact-rail-wallpaper-halftone.md) | Released; wallpaper choices later expanded to five effects. |
| 2026-09-23 08:23:19 | [Done — Providers initial-discovery feedback — plan](archive/providers-loading-plan.md) | Imported historical feature plan; retain its original verification caveats. |
| 2026-09-15 23:16:23 | [Done — Lazy terminal + harness startup — plan](archive/lazy-terminal-harness-plan.md) | Imported historical feature plan; retain its original verification caveats. |
| 2026-09-12 15:48:17 | [Done — Queue durability hardening (0.1.35-local5-queue-durability)](archive/queue-durability-local5-plan.md) | Imported historical feature plan; retain its original verification caveats. |
| 2026-09-09 23:31:48 | [Done — Context Window & Costing Inspector Dialog (Claude & Codex) Plan](archive/context-dialog-plan.md) | Imported historical feature plan; retain its original verification caveats. |
| 2026-09-08 20:10:29 | [Done — Gitignored file mentions + safe path resolution plan](archive/gitignored-file-mentions-plan.md) | Imported historical feature plan; retain its original verification caveats. |
| 2026-09-08 15:43:30 | [Done — Hari mode — one-button mode switcher + phase-0 kanban](archive/hari-mode-plan.md) | Imported historical feature plan; retain its original verification caveats. |
| 2026-09-07 23:12:50 | [Done — Explorer reveal fix — plan](archive/explorer-reveal-fix-plan.md) | Imported historical feature plan; retain its original verification caveats. |
| 2026-09-04 19:18:45 | [Done — Session Migration Plan — Sessions-only MVP (both resume modes)](archive/SESSION-MIGRATION-PLAN.md) | Imported historical feature plan; retain its original verification caveats. |

Dated history: [changelog index](../changelog/CHANGELOG.md).
