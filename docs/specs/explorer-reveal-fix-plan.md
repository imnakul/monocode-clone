# Done — Explorer reveal fix — plan

- Workflow status: Done (historical spec, labeled at Nakul's request). Existing verification caveats below are preserved.


Header: worktree `E:\Developing\OpenSource\mono-clone`, branch `nakul/windows-support`, base `437cd34061d60c373b5208623c3f93c2f3371cdc`.

## Initial Idea

`Could not reveal in File Explorer` shows even though Explorer opens at the right path. Fix success criterion on Windows.

## Research

`src-tauri/src/fs.rs:3955` `reveal_path`: Windows branch uses `Command::new("explorer").arg("/select,...").status()` then checks `status.success()`. Explorer's exit code is not a reliable result for `/select` dispatch — operation succeeds, exit status still nonzero, UI reports false error. macOS (`open -R`) and Linux (`xdg-open`) branches are unaffected and stay unchanged.

Repo pattern: Windows children hidden via `CREATE_NO_WINDOW` (`src-tauri/src/harness.rs:1181` `hide_console_window`). Scanners do pure reads, no shell-string concat — this change keeps that (single arg, no shell).

## Discussion

Change only the Windows branch: dispatch via `spawn()` with `CREATE_NO_WINDOW`, return `Ok` when spawn succeeds. Keep path-exists validation above. Launch failure (`spawn` Err) still returns Err. No behavior change on macOS/Linux.

## Implementation plan

1. Edit Windows branch in `reveal_path` to `spawn()` + `CREATE_NO_WINDOW`, map spawn success to `Ok(())`.
2. Add `#[cfg(target_os = "windows")]` tests: existing file → Ok, existing dir → Ok, missing path → Err. Launch-failure path is the `spawn().map_err` line (not force-failed in test; explorer missing is the only trigger on real Windows).
3. Gates: `cargo fmt --check`, `cargo check`, `cargo test reveal`, plus `npx tsc --noEmit` + focused vitest (no frontend change, full vitest at end).

## Todos

- [x] Windows branch uses spawn-based dispatch
- [x] Windows-gated tests added
- [x] cargo fmt/check + relevant tests green
- [ ] Manual dev check: reveal file, reveal folder, no false error

## Issues in Dev (+ fixes)

_To be filled during `npm run tauri dev` manual check._

## Issues in Installed (+ fixes)

_To be filled after installer test (not built until dev passes)._

## Learnings

_To be filled after landing._

## Done

_8 Sept 2026: implemented, gated green, built as
`0.1.35-local3-reveal-tabs` (NSIS-only, dirty-tree build — see LOCAL-CHANGELOG
caveats). Installed-test verdict pending user run._
