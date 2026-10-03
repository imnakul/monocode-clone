# Specs index

Read this index first, then open the relevant spec. Add a row whenever a spec is created.

Allowed workflow statuses: **Todo**, **Progress**, **Done**, **Blocked**, **Review**, **Draft**.
The status appears before each spec name below and in its heading; filenames stay stable.
Draft means a proposal is still being shaped. Review means implementation awaits review or manual verification.
Imported historical feature plans are labeled Done at Nakul's request; their original caveats remain in the documents.
Uncertain and superseded material lives in [notes/archive](../notes/archive/README.md).

Display order: Draft → Review / Blocked → Todo → Progress → Done. Review and Blocked share one section while retaining their individual status labels. Each group is sorted by local file creation time, newest first.
Creation times come from the Windows filesystem, not the last edit date. Copies or restored files can have different creation times.

## Draft

| Created (IST) | Spec | Notes |
|---|---|---|
| 2026-10-01 19:43 | [Draft — Upstream intake round 1: v0.1.56 — spec](upstream-intake-round-1.md) | 23 measured conflicts; all local behaviors retained. Owner D answers, capability/dependency review and suffix lock/version tooling are required before implementation. |
| 2026-09-30 10:56 | [Draft — Provider improvements for daily work](provider-daily-work-improvements-plan.md) | Selected scope only. The six child specs were built and closed as Done on 2026-10-01 (build 0.1.55-local5-provider-fixes). This plan stays as the record of the selected scope. Includes mandatory storage blocker. |
| 2026-09-27 02:47:38 | [Draft — Prepare for a break — spec](prepare-for-break.md) | Depends on Native Branch and Claude cold-resume warning. |
| 2026-09-27 00:57:16 | [Draft — Claude cold-resume warning — spec](claude-cold-resume-warning.md) | Depends on Native Branch. |

## Review / Blocked

| Created (IST) | Spec | Notes |
|---|---|---|
| 2026-10-02 21:06 | [Review — Windows 0.6.0 build](windows-060-build-plan.md) | Unsigned installer built and archived; exact version requested by Nakul. Three existing test failures documented; desktop verification remains. |
| 2026-09-30 07:30:13 | [Blocked — Orchestration desktop computer-use test — spec](orchestration-desktop-computer-use-test.md) | Four-feature source is archived on `park-other-orchestration-mode-changes-30sept`; T1 remains inconclusive and the desktop cases are untested. |
| 2026-09-25 17:37:20 | [Blocked — Local handoff files and lead control — implementation spec](orchestration-local-artifacts-lead-control.md) | Unfinished implementation is preserved on `park-other-orchestration-mode-changes-30sept`; desktop verification remains. Checkout chooser reverted. |
| 2026-09-25 09:44:34 | [Blocked — Hari on the current orchestration engine — spec](hari-current-orchestration-integration.md) | Hari source is preserved on `hari-orchestration-changes-30sept`; review and desktop verification remain. |
| 2026-09-23 16:53:12 | [Review — Providers initial loading](providers-initial-loading.md) | Implementation recorded; manual visual verification remains. |

## Todo

| Created (IST) | Spec | Notes |
|---|---|---|
_No specs in this status._

## Progress

| Created (IST) | Spec | Notes |
|---|---|---|
_No specs in this status._

## Done

| Created (IST) | Spec | Notes |
|---|---|---|
| 2026-10-01 18:39:35 | [Done — Upstream intake after v0.1.55: analysis, plan and round-1 spec (analyst trial) — spec](upstream-intake-analyst-trial.md) | Analysis only, no merge. Run by GPT-6 based Codex in 72 minutes; output in `docs/notes/upstream-intake-2026-10-01/`. Claude's rating: 45 of 55 — exact on facts, generic on judgement; delegation list in the Handoff retro. The round-1 spec it drafted stays Draft. |
| 2026-10-01 14:30:26 | [Done — Provider batch follow-up fixes — spec](provider-batch-followup-fixes.md) | Fixes A–E in `b905b8c`, `0a27328`, `4423fd8`; Composer test fix F in `35b1f2b`; AC-13 test line in `d691035`. Claude's review passed with no rework. Closed 2026-10-01: Nakul reported build 0.1.55-local5-provider-fixes fine (per-check results not itemized; caveats stay in the spec). Pushed to the fork at `c2c8bf6`. |
| 2026-09-30 21:01:07 | [Done — Codex MCP forms — spec](codex-mcp-forms.md) | Committed `3a47202` from Luna's patch after Claude's review (8.5/10). Not tried against a real form-sending MCP server; covered by tests only. Closed 2026-10-01: Nakul reported build 0.1.55-local5-provider-fixes fine (per-check results not itemized; caveats stay in the spec). Pushed to the fork at `c2c8bf6`. |
| 2026-09-30 21:00:14 | [Done — AI helper model settings — spec](ai-helper-model-settings.md) | Implemented in `84fbe89`; focused tests, TypeScript and Rust checks pass. Closed 2026-10-01: Nakul reported build 0.1.55-local5-provider-fixes fine (per-check results not itemized; caveats stay in the spec). Pushed to the fork at `c2c8bf6`. |
| 2026-09-30 12:09:28 | [Done — Accurate context breakdown for Claude and Codex — spec](context-accuracy.md) | Committed `11981c0` by Sol 6.1 Low; Claude's review 8.5/10, nothing to fix. Closed 2026-10-01: Nakul reported build 0.1.55-local5-provider-fixes fine (per-check results not itemized; caveats stay in the spec). Pushed to the fork at `c2c8bf6`. |
| 2026-09-30 12:04:01 | [Done — Claude live model and permission changes — spec](claude-live-controls.md) | Committed `9dfeaa0` from Luna's patch after Claude's review (8/10). Closed 2026-10-01: Nakul reported build 0.1.55-local5-provider-fixes fine (per-check results not itemized; caveats stay in the spec). Pushed to the fork at `c2c8bf6`. |
| 2026-09-30 12:00:30 | [Done — Session approvals for Claude and Codex — spec](session-approval-scopes.md) | Umbrella slice 1, implemented in `bf41013`. SA-1 failed on local4 (no Codex session option); fixed by follow-ups A, B, C in `b905b8c` and `0a27328`. Transcript buttons narrowed again in `3f5834b`. Closed 2026-10-01: Nakul reported build 0.1.55-local5-provider-fixes fine (per-check results not itemized; caveats stay in the spec). Pushed to the fork at `c2c8bf6`. |
| 2026-09-30 09:26:16 | [Done — Park Hari and orchestration work before upstream intake — spec](park-orchestration-hari-upstream-handoff.md) | Both fork archives verified; four-feature source separated; local archive branches/worktrees removed after final verification. Retained-code gate results and pending intake details recorded. |
| 2026-09-27 00:22:09 | [Done — Native Branch (provider-owned fork) — spec](native-branch.md) | Committed `f1a4712` by Sol 6.1 Low; Claude's review 8.5/10. Follow-ups D and E in `4423fd8`. Whether Claude honours `--session-id` with `--fork-session` was never observed directly; fix D covers both cases. Closed 2026-10-01: Nakul reported build 0.1.55-local5-provider-fixes fine (per-check results not itemized; caveats stay in the spec). Pushed to the fork at `c2c8bf6`. |
| 2026-09-25 01:21:41 | [Done — Wallpaper effects — plan](wallpaper-effects-plan.md) | Imported historical feature plan; retain its original verification caveats. |
| 2026-09-24 22:34:05 | [Done — Windows compact rail and wallpaper release — spec](windows-rail-wallpaper-release.md) | Corrected installed pass confirmed by user; fork push recorded. |
| 2026-09-24 14:50:04 | [Done — Compact rail hover and wallpaper Halftone — plan](compact-rail-wallpaper-halftone-plan.md) | Imported historical feature plan; retain its original verification caveats. |
| 2026-09-24 14:50:04 | [Done — Compact rail hover and wallpaper Halftone](compact-rail-wallpaper-halftone.md) | Released; wallpaper choices later expanded to five effects. |
| 2026-09-23 08:23:19 | [Done — Providers initial-discovery feedback — plan](providers-loading-plan.md) | Imported historical feature plan; retain its original verification caveats. |
| 2026-09-15 23:16:23 | [Done — Lazy terminal + harness startup — plan](lazy-terminal-harness-plan.md) | Imported historical feature plan; retain its original verification caveats. |
| 2026-09-12 15:48:17 | [Done — Queue durability hardening (0.1.35-local5-queue-durability)](queue-durability-local5-plan.md) | Imported historical feature plan; retain its original verification caveats. |
| 2026-09-09 23:31:48 | [Done — Context Window & Costing Inspector Dialog (Claude & Codex) Plan](context-dialog-plan.md) | Imported historical feature plan; retain its original verification caveats. |
| 2026-09-08 20:10:29 | [Done — Gitignored file mentions + safe path resolution plan](gitignored-file-mentions-plan.md) | Imported historical feature plan; retain its original verification caveats. |
| 2026-09-08 15:43:30 | [Done — Hari mode — one-button mode switcher + phase-0 kanban](hari-mode-plan.md) | Imported historical feature plan; retain its original verification caveats. |
| 2026-09-07 23:12:50 | [Done — Explorer reveal fix — plan](explorer-reveal-fix-plan.md) | Imported historical feature plan; retain its original verification caveats. |
| 2026-09-04 19:18:45 | [Done — Session Migration Plan — Sessions-only MVP (both resume modes)](SESSION-MIGRATION-PLAN.md) | Imported historical feature plan; retain its original verification caveats. |

Dated history: [changelog index](../changelog/CHANGELOG.md).
