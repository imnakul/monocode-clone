# Upstream merge log — version "upstreamed"

- File: `docs/notes/archive/upstream-merge-2026-09-05.md`
- Date/time: 5 Sept 2026, 5pm IST
- Branch: `nakul/windows-support`
- Our tip before merge: `dbe21cf` (fix(windows): home fallback, catalog timeouts and probe errors)
- Upstream tip merged: `cb6e2df` (origin/main — post 0.1.34, "Properly close tabs and files of archived or deleted sessions (#70)")
- Merge-base: `a8e14b4`
- Merge commit: `c2aa73f` (Merge remote-tracking branch 'origin/main' into nakul/windows-support)
- Upstream commits pulled in: 48 (releases 0.1.30 → 0.1.34)
- Our commits preserved: 11 (43381fc → dbe21cf)
- NOT pushed to fork — local only, by request.

## Why this log exists

Merging 48 upstream commits into our 11-commit Windows stack produced 6
conflicted files. Every conflict below was reviewed with Nakul file by file
before resolving — nothing auto-decided. If something breaks later, start here.

## Decisions (all: merge both)

### 1. `src-tauri/src/fs.rs` — 3 hunks — MERGE BOTH
- Incoming: image-viewer support — `read_binary_file` command (returns raw
  bytes via `ipc::Response`, no base64 inflation) + `MAX_PREVIEW_BYTES` 25 MB.
- Ours: wallpaper support — `read_wallpaper_base64`, `persist_wallpaper`,
  `clear_managed_wallpaper` + `MAX_WALLPAPER_BYTES` 64 MB.
- If theirs only: wallpaper Settings break (frontend calls missing commands).
- If ours only: upstream image viewer / FilePane preview breaks.
- Did: kept both constant lines; stacked complete wallpaper functions first,
  then complete viewer functions (Rust forbids nested fn items, so the two
  groups could not stay interleaved).

### 2. `src-tauri/src/lib.rs` — 1 hunk — MERGE BOTH
- Incoming: registered `fs::read_binary_file`.
- Ours: registered `fs::read_wallpaper_base64`, `persist_wallpaper`,
  `clear_managed_wallpaper`.
- Did: registered all four commands.

### 3. `src/chrome/MenuBar.tsx` — 1 hunk (imports) — MERGE BOTH
- Incoming: `ALT` key import (upstream shortcut uses it in 5 places).
- Ours: `SharedHoverHighlight` import (our menu hover, used in 1 place).
- If either dropped: the corresponding code breaks (undefined import).
- Did: `import { SharedHoverHighlight } ...` + `import { ALT, MOD, SHIFT } ...`.
- Note: "1x / 5x" in discussion = usage counts in the file.

### 4. `src/chrome/Popover.tsx` — 2 hunks — MERGE BOTH
- Incoming: rebuilt frame — `FRAME` + `BACKDROP` constants (isolated,
  GPU-hinted backdrop fixing flicker during animations) + positioned inner
  content div with ref wiring and maxHeight logic.
- Ours: `SURFACE` glass class + `<SharedHoverHighlight />` before children.
- Did: kept their frame/backdrop/inner-div; dropped dead `SURFACE` const
  (unused after merge); kept `<SharedHoverHighlight />` inside the inner
  content div; added `popover-surface` class to that div so our
  selected-row/option CSS in `index.css` keeps matching.
- Risk to re-check visually: highlight position inside new frame; backdrop
  blur over wallpaper.

### 5. `src/chrome/SessionReview.tsx` — 1 hunk — MERGE BOTH
- Incoming: `DiffCounts` gained a "Shared file" badge when `!file.exact`
  (file also touched by another session → unsafe to undo; part of upstream
  checkpoint-review feature; `exact: boolean` on `CheckpointFile`).
- Ours: replaced both `DiffCounts` usages (FileLabel + FileRow) with our
  `DiffStat compact` component and deleted `DiffCounts`.
- If theirs only: loses our DiffStat styling.
- If ours only: loses the unsafe-to-undo warning.
- Did: dropped the standalone `DiffCounts` fn; kept our `DiffStat` usages;
  render the "Shared file" badge instead of numbers when `!file.exact`
  (mirrors upstream logic: counts are misleading for shared files).

### 6. `src/chrome/Sidebar.tsx` — 1 hunk — MERGE BOTH
- Incoming: session card wrapped in `<div className="group relative">` plus a
  hover-reveal Archive button (`group-hover` padding trick).
- Ours: card `<button>` carries `data-shared-hover-item` +
  `data-shared-hover-preserve` for our hover highlight system.
- Did: kept their wrapper + Archive button; added our two data attributes to
  their button tag.
- Note: this file uses CRLF line endings — the Edit tool could not match
  text in it; resolved via a byte-exact Python script in TEMP (since deleted).

## Verification (after all 6 files, before commit c2aa73f)

- `npx tsc --noEmit` — clean.
- `npx vitest run` — 122 files, 1294 tests, all passed.
- `cargo fmt --check` — clean.
- `cargo check -p monocode` — no errors (pre-existing warnings only).
- ESLint — skipped, repo has no eslint config.
- 132 files auto-merged without conflicts; only the 6 above needed review.

## Still to watch

- Popover highlight placement + backdrop blur over custom wallpaper (visual).
- SessionReview "Shared file" badge vs DiffStat alignment (visual).
- Sidebar Archive button hover vs our card highlight (visual).
- Upstream moved fast (48 commits); our future upstream PRs should still go
  out as small rebased branches (PR-A/B/C plan), not from this merged stack.

## Post-merge testing notes (5 Sept 2026, evening IST)

- FINDING: composer `+` menu (Upload file / Plan mode, `Composer.tsx` ~L1270)
  DOES use `<Popover>`, but shows no slider effect. Cause: the highlight only
  tracks elements tagged `data-shared-hover-item`, and those two buttons use
  plain `hover:bg-content/10` with no tag. Future fix: tag the two buttons
  (precedent: MenuBar L229, Sidebar L1996).
- PR-READINESS TEST (scratch worktree, thrown away after): `4f14d57` (codex
  catalog warn) cherry-picks onto latest `origin/main` with zero conflicts.
  Remaining codex improvements (30s/20s timeouts, exit-code errors, legacy
  model labels) touch only `codexCatalog.ts`, which upstream never modified —
  so PR-A assembles with no conflicts. Cline parts are EXCLUDED: no cline*
  files exist upstream at all, and new providers are policy-blocked.
