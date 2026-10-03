# Upstream merge — 24 Sept 2026 (round 3 of 3)

Merge of `v0.1.55` (17 commits, "MonoCode 0.1.55", published 2026-09-23) into
`nakul/windows-support`. Previous rounds: `docs/notes/archive/upstream-merge-2026-09-23.md`
(rounds 1–2, up to v0.1.54). Process runbook: `docs/NOTES.md` — follow it.

## Scope (decided this round)

| Item | Decision | Why |
|---|---|---|
| `v0.1.55` tag | **take it** | the release the user asked for |
| `main` post-tag commits ("Reconcile streamed Claude tool inputs", "Deduplicate Codex text by item", 4 files) | **defer to a follow-up** | runbook default = tag only; both are stream-handling fixes, cheap to take later once 0.1.55 settles |
| Light CLI update notice | **build in parallel** (own plan doc `docs/cli-update-check-plan.md`) | user's call: toaster + update command + copy button |
| `reveal_path` test seam (Explorer windows on `cargo test`) | **landed first** as `fix(reveal): test the reveal contract without launching Explorer` | prerequisite: v0.1.55 touches `fs.rs`, merge needs clean tree |

## Standing product calls (from rounds 1–2, still binding)

Recorded in `docs/NOTES.md` §0 and `docs/notes/archive/upstream-merge-2026-09-23.md`: Composer
send action = ours (Queue/Steer label + Stop visible); menu bar = ours, always
visible; Antigravity = ours (ACP `agy_acp_server.par`, "Antigravity ACP",
`antigravity:default`); Cline = our 11th harness; Queue/Steer + lazy terminals +
terminal cleanup = ours; wallpaper & menus rows = ours; hover pill = wash on the
Popover frame. Where v0.1.55 conflicts on these seams, **ours wins** unless noted
below.

## v0.1.55 content inventory (what's coming in)

- **Jira Cloud Inbox** (biggest): `src-tauri/src/jira.rs` (new, ~1,250 lines),
  `inbox/model/jira.ts` + tests, `JiraSettings.tsx`, `docs/notes/jira.md`, inbox filters
  extended, "Issue appeared" automation trigger (`automations.rs`, `automationEvents`),
  background notifications, per-site project mutes.
- **Transcript Find**: `transcriptFind/highlights/jump.ts`, `TranscriptFind.tsx`,
  `TranscriptPool.tsx` (kept-across-switches transcripts), `AgentTranscript.search.test`.
- **Session navigation**: Cmd/Ctrl+Up/Down prev-next session (`tabKeys.ts`,
  `workspaceTabGroups.ts`, `SurfaceTabs.tsx`, `PaneTree.tsx`), pane swap for
  already-visible sessions.
- **Session sidebar toggle** (`Sidebar.tsx`, `TitleBar.tsx`, `MenuBar.tsx`,
  `TitleBarStatus.test`) — conflicts with our always-visible menu bar seam.
- **Background effects** (`newThreadBackgroundEffects.ts` + `.worker.ts`,
  `ProjectBackgroundDialog` extended, `projectChatBackground.ts`, `appearance.ts`)
  — conflicts with our wallpaper/appearance rows seam.
- **Opus 5.5 welcome scene** (`OpusWelcome.tsx/.css`, `opusWelcome.ts`) +
  **motion work** (`wordFade.tsx`, `useComposerDockMotion.ts`, `promptRise`
  tests, `AgentTranscript.firstPaint.test`) — `AgentTranscript.tsx` (+399/−19)
  and `SessionPane.tsx` (+218/−107) = the two heaviest conflicts.
- Changed default: **chat transcript layout is default** (`appearance.ts`),
  perf work (`SessionPane`, `appSearch.ts` slimmed), explorer natural sort
  (`FilePane`? via `fs.ts` +118/−5), file-action errors (`FileActionError.tsx`).
- `index.css` +193/−8 — conflicts with our hover-pill CSS contract.

## Conflict forecast (files carrying both their changes and our divergences)

`App.tsx`, `SessionPane.tsx`, `AgentTranscript.tsx`, `SettingsView.tsx`,
`appearance.ts`, `settings.ts`, `InboxView.tsx`, `Sidebar.tsx`, `index.css`,
`fs.ts`, `models/session`-adjacent. Resolution policy per `docs/NOTES.md` §3:
mechanical picks proceed with stated assumption; product calls on the seams above
= ours (already decided); anything new = STOP and ask.

## File-by-file decisions

(filled in during resolution — one row per conflicted file)

| File | Decision | Why |
|---|---|---|
| … | … | … |

## Deferred / follow-ups

- The 2 post-tag `main` commits (stream reconciliation / codex text dedupe).
- Jira = new provider surface: after merge, check it doesn't drag provider
  discovery onto our lazy Antigravity policy (Jira should never spawn ACP).
- Update `docs/NOTES.md` §0 if the sidebar-toggle lands (new divergence #2 nuance:
  sidebar show/hide is now upstream-feature; menu bar stays always visible).

## Verification (fill when gates run)

- `npx tsc --noEmit` / `npx vitest run` / `npm run check:rust` / `npm run build`
  / `git diff --cached --check` / snapshot-truth check.

### Round 3 verification + resolutions (24 Sept 2026)

Gates: tsc 0; vitest 324 files / 3,625 tests (0 failed); check:rust 413 passed / 4 ignored; build clean; `git diff --cached --check` clean; snapshot truth = only the parallel session's 2 `systemBreakdown` WIP files unstaged.

Conflict resolutions (13 UU): version files + `tauri.conf.json` = ours' label `0.1.55-local1-upstream-import`; `capabilities/default.json` = ours (keep `opener:allow-reveal-item-in-dir` + `allow-open-path` for reveal/open); `App.tsx` = both-rev on persistSession (their early-return dedupe + our `queueKeyWritten`); `AgentTranscript.tsx` = both (imports); `appearance.ts` = both (app-mode + sidebar-open keys/fns); `SettingsView.tsx` = their `JiraSettings` import only (NOT their `SecondaryButton` = our local declaration wins) + both for background-effect imports/Segmented props; `index.css` = both-rev (their prompt-rise rules above our body-glass selector list); `SessionPane.tsx` = theirs (`PooledTranscript` + `TranscriptFind`) + our `:1->:2` delta replayed (review-fix/sidechat/branch + usage memos + canSteer); `InboxFiltersMenu.tsx` = theirs (tracker gates, Jira projects, Clear filters) + our delta replayed (3 continuity wraps + dot markers + `disambiguateProjectNames` + 248 width). Also fixed: `saveAppMode` missing `}` from the appearance union; duplicate `useMemo` in `Sidebar.tsx` imports.

Round-3 additions: `docs/cli-update-check-plan.md` (plan), `src/integrations/harness/core/cliVersions.ts` + tests, `src/features/settings/ui/UpdateToasts.tsx` + tests, ProvidersPage wiring (discovery + Recheck triggers, once per provider). `fs.rs::reveal_path` test seam (`a8e43b8`).
