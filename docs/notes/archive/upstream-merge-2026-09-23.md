# Upstream import merge — 23 Sept 2026

Merge of `v0.1.45..v0.1.51` (staged import, round 1 of 2) into `nakul/windows-support`.
Round 2 (`v0.1.51..v0.1.54`, the `src/` reorganize + remaining features) still pending.
Conflict total: 55 files. All decisions recorded here per the working agreement.

## Product calls (made by Nakul, 23 Sept 2026)

| Topic | Decision | Consequence |
|---|---|---|
| Project mute menu | **Main's** | "Resume notifications" leads the project menu; hover marker moved to the popover frame so Main's child-order contract holds while the sliding hover keeps working |
| Composer send action | **Ours (intentional)** | While busy, the send button keeps its Queue/Steer-aware label and Stop stays visible. Main's replace-Stop-with-Send behavior was NOT taken. Test adapted; recorded in LOCAL-CHANGELOG so this stays a conscious choice |
| Settings row order | **Main's slots, keep all functionality** | Our Wallpaper/Menu rows re-homed under a "Wallpaper & menus" group between Main's Color and Translucency groups; wallpaper-opacity row now always renders (disabled until a wallpaper is chosen) so search can find it |

## Theme decisions (suggested here, accepted)

- **App icon**: Main's refreshed icon set.
- **Version label**: our scheme rebased on Main's number → `0.1.51-local1-upstream-import`.
- **Engine parts** (dependency lists): union of both (our registry/file-system extras + their toast notifications).
- **Token/cost meters**: both kept — our context/dollar inspector (`usage` events) and Main's per-turn metrics (`turn.metrics`) share one feed (`src/lib/harness/codexProtocol.ts`, `apply.ts`).
- **Menu-bar look**: Main's border style.
- **Model picker**: Main's grouped list, our unavailable-provider greying kept.

## File-by-file (55 conflicts)

### Mechanical picks
| File | Decision |
|---|---|
| `src-tauri/icons/icon.ico` | **ours** (Nakul's call: "App icon - keep ours") |
| `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`, `src-tauri/tauri.conf.json` | our label `0.1.51-local1-upstream-import` |
| `src-tauri/Cargo.toml` | union of both dependency lists |
| `src/chrome/MenuBar.tsx` | Main's |
| `src/lib/harness/register.ts`, `fs.ts`, `skills.ts`, `HarnessIcon.tsx`, `models.ts`, `session.ts` | both providers kept (Antigravity, Cline, Hermes) |
| `src/lib/layout.ts`, `TabGroupMenu.tsx`, `PaneTree.tsx`, `githubTasks.test.ts`, `appearance.test.ts`, `workspaceSnapshot.test.ts`, `settings.test.ts`, `appLifecycle.test.ts` | both sides kept |

### Weaves (both kept, hand-merged)
| File | What was woven |
|---|---|
| `src-tauri/src/lib.rs`, `main.rs`, `fs.rs` | our Windows home fallback + sign-in URL handling with their control mode + background-command helper |
| `src-tauri/src/harness.rs` | our Windows CLI discovery/job cleanup with their accounts + Hermes resolver |
| `src-tauri/src/pty.rs` | our ConPTY/replay kept; Main's duplicate spawn dropped; working-dir carried on the live terminal |
| `src-tauri/src/session_store.rs` | schema v16 = our v14 queue reconciliation + their v15/16 worktree columns; worker sessions hide from project lists (their rule) inside our path-compatible queries |
| `src-tauri/src/control.rs` | their grant check, simplified to satisfy clippy |
| `src/App.tsx` | Main's render block + our migration entry, pull-review, chat/sidechat wiring |
| `src/surfaces/SettingsView.tsx` | appearance page rebuilt: our typography + Main's theme/color + our wallpaper/menus + Main's translucency/layout; Main's grouped provider rows + our lazy-loading flag |
| `src/chrome/ProjectRail.tsx` | Main's groups/mute menu + our working-agents preview (adopted Main's component) |
| `src/chrome/Composer.tsx` | **ours** send/Stop contract + Main's drafts/worktree guards |
| `src/chrome/SecondOpinionButton.tsx`, `src/lib/harness/availability.ts` | Main's probe API + our honest not-checked states |
| `src/surfaces/InboxView.tsx` | Main's fixed header owns the external action; our Pull review + tabs + hover continuity kept |
| `src/surfaces/SessionPane.tsx`, `AgentTranscript.tsx` | Main's model-target signatures + our review-fix/sidechat/branch |
| `src/chrome/Popover.tsx` | hover marker lifted to the frame layer (Main's first/last child contracts) |
| `src/lib/harness/apply.ts`, `types.ts`, `codex.ts`, `codexProtocol.ts` | both usage feeds |
| `src/surfaces/NotesView.tsx` + `.hover.test.ts` | Main's move-note picker + our hover polish (test kept as its own file) |
| `src/lib/settings.ts`, `appearance.ts`, `sessionStore.ts`, `sessionHistory.ts`, `workspaceSnapshot.ts`, `index.css`, `InboxView.test.ts`, `ModelPicker(.test)`, `UsageFooter(.tsx)`, `Sidebar`, `TitleBar`, `FilePane`, `SecondOpinionButton` | unions as listed in the decision table above |

### Adjusted tests (behavior intentionally merged)
- `Composer.test.ts`: rewritten to our Queue/Steer contract (decision above).
- `settings.test.ts`: "glass" ranking now includes "Glass strength" (our row, functionality kept).
- session_store tests: schema version 16 (names updated from v14).

## Verification (23 Sept 2026)

- `npx tsc --noEmit`: 0 errors.
- `npx vitest run`: 281 files, 3,082 tests passed, 0 failed.
- `npm run check:rust`: fmt + clippy (`-D warnings`) clean; 345 passed, 0 failed, 4 ignored.

---

## Round 2 - Main 0.1.52 -> 0.1.54 (23 Sept 2026)

Scope: the `src/` reorganize, Automations, Antigravity, editor language modes, session `draft`/`automation_id` columns, and the `createSessionRemover` transaction. Version: `0.1.54-local1-upstream-import`.

### Decisions (keep these when touching the same areas)

1. **Antigravity = ours.** Kept `integrations/harness/core/antigravity*` + `src-tauri/src/antigravity_acp.rs` + `resolve_antigravity_acp`/`resolve_antigravity` in `harness.rs` (PATH/PATHEXT discovery, ACP runtime validation). Deleted Main's `integrations/harness/providers/antigravity/*`, their `AntigravityBinary`/`antigravity_args`/second `harness_resolve_antigravity`, and their `resolve_antigravity`. Title stays "Antigravity ACP"; default model stays `antigravity:default`.
2. **Composer send action = ours** (same as round 1). Queue/Steer label + Stop visible.
3. **Menu bar = ours, always visible.** Main hides it behind an Alt tap.
4. **Cline = ours, the 11th harness.** Main's `HARNESSES` has 10; ours has 11. `ModelPicker.test` flyout pixel sizes were updated from the 10-tab constants (404/406) to the 11-tab ones (440/442) and its Antigravity tab selector now reads `Antigravity ACP`.
5. **`createSessionRemover` = Main's transaction**, with two of our behaviors folded into `workspace.apply({type:"removed"})`: terminal `forgetTerminal`+`killPty` for terminals that disappear, and `queueSchedulerRef.removeSession`. Our old `updateSession`/`persist`/`commit` option keys were removed (they duplicated the apply handler).
6. **Settings/mute-menu/wallpaper** = round-1 decisions unchanged.

### Mechanical notes (for the next merge)

- The reorganize left pre-move import specifiers in ~100 files; source and test imports plus `vi.mock("...")` targets all needed basename-based rewrites. `vi.mock("x")` strings are invisible to `tsc` - only Vitest reveals them.
- `src/shared/lib/format.ts` is Main's home for `format`; `format.test.ts` (ours) lives beside it now.
- Schema version asserts read 18; `list_by_project` needed `is_draft, automation_id` appended to all three of its SELECTs (the mappers already indexed 16/17).
- `session.ts` `HARNESSES` and the harness title/slug maps each had a duplicated `antigravity` entry from the both-splice; the second copy was removed.

### Round 2 completion pass (23 Sept 2026, pre-commit)

- Staging repaired: 103 unstaged repair files + `src/shared/lib/format.test.ts` staged (rename resolves to `src/lib/format.test.ts -> src/shared/lib/format.test.ts`). `git diff --cached --check` clean.
- `systemBreakdown.ts` staged only for the `./fs` -> `../../../platform/tauri/fs` import fixes (hunk-level). The parallel session's `parseCodexConfigToml` rewrite + its tests remain unstaged (their call).
- `lib.rs`: duplicate `harness_resolve_antigravity` registration removed (kept the one beside `harness_resolve_cline`).
- New regression tests: `disappearedTerminalIds` (+4 tests), `QueueDurabilityScheduler.removeSession`, `list_scratch` draft/automation round-trip.
- `ContextMeter.test.ts` gauge assertions made locale-deterministic (test-side only; user-facing number format unchanged).
- Deferred: Unix-only `antigravity_args()` test at `harness.rs` ~4317 (Main leftover) - future cross-platform cleanup, not a Windows-build blocker (Nakul's call).

### Upstream check (23 Sept 2026, read-only ls-remote)

`hardbeat920/monocode` has **v0.1.55** tagged - one release past our 0.1.54 base (round 2 covers up to v0.1.54). Nothing above v0.1.55. Plan: land round 2 first (staged + gates green), then a small v0.1.55 round. Not fetched yet (needs the word).

### Hover-pill provenance (for the record)

The submenu hover bug predates round 2: `c2b0db5` (feat(ui): improve navigation hover and Antigravity models) moved the sliding marker into the Popover frame, while the glass work (`49eb636` feat(appearance): customizable glass and typography; `d70b9fc` fix(windows): hover marker honors highlight setting) keeps the `.popover-surface` wash + backdrop-filter on the content layer above the marker - the blur erased the pill. Differential symptom: `SelectMenu` rows have no hover background (`hover:text-content` only), so they still looked fine; `ModelPicker` rows rely on `hover:bg-content/5`, which `[data-shared-hover-active]` zeroes out (`background-color: transparent !important`) = hover showed nothing. Fixed this round: wash moved to the frame (`src/shared/ui/Popover.tsx`) + `Popover.hover.test.ts`.
