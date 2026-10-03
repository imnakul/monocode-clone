# Done — Compact rail hover and wallpaper Halftone — plan

- Workflow status: Done (historical spec, labeled at Nakul's request). Existing verification caveats below are preserved.


- Temporary implementation worktrees: `E:\Developing\OpenSource\mono-clone-compact-rail-hover` and `E:\Developing\OpenSource\mono-clone-wallpaper-halftone` (used for isolated implementation; transfers are verified and the worktrees are removed)
- Feature branches: `feature/compact-rail-hover` and `feature/wallpaper-halftone` (used during isolated implementation; feature changes are now committed on `nakul/windows-support`)
- Base commit of `nakul/windows-support`: `60cb05d` (planning snapshot and base used for both temporary implementation worktrees)

## Release closeout - 25 Sept 2026

- Installed verdict: user-confirmed pass for the corrected unsigned installer; this is Nakul's installed-app report, not an automated or agent-observed UI check.
- Source/version: `9397898c923491a9ee1e9cd77c4bcc917634c888` / `0.1.55-local3-rail-wallpaper`.
- Corrected installer: `E:\Developing\Installable versions\MonoCode_0.1.55-local3-rail-wallpaper_x64-setup.exe`; 10,577,371 bytes; SHA-256 `B768793BFD7B5EA7C3F0F67D2451D1CC1B2F0A7F942B23C9BBA6E9B104E1A30E`.
- Push: fast-forward, without force, only to `personal/nakul/windows-support` (`https://github.com/imnakul/monocode-clone.git`). Remote started at `6f1d2f7851be7ea644e11f4daf2b2b9da29b7770`; 217 commits ahead, 0 behind; remote SHA now equals local HEAD `9397898c923491a9ee1e9cd77c4bcc917634c888`.
- The three protected WIP files remain modified and unstaged with their recorded starting hashes; neither installer was rebuilt, changed, or deleted during closeout.

## Initial Idea

Add MonoCode's shared sliding hover background to the collapsed project rail. Give the Windows app wallpaper an independent Halftone on/off switch using the effect already available for chat backgrounds.

## Research

- `CompactProjectRail` in `src/app/shell/Sidebar.tsx` renders `CompactRailAction` buttons with a static hover background. Its `<nav>` does not mount `SharedHoverHighlight`; the expanded sidebar and project rail already do.
- `CwdPicker.tsx` marks its trigger with `data-shared-hover-item` and preserves its open background. `RailAction.tsx` shows the active-item contract to follow: shared-hover item plus preserve-on-active.
- Windows wallpaper settings and the original-image object URL are owned by `SettingsView.tsx` and `appearance.ts`. `src/styles/index.css` paints `--app-wallpaper-image` behind the app shell.
- Halftone is already implemented in `newThreadBackgroundEffects.worker.ts`. The current client in `newThreadBackgroundEffects.ts` applies output directly to `--chat-background-image`, so wallpaper needs an independent consumer and lifecycle; it must not change the chat setting.
- The current checkout is `nakul/windows-support` at `60cb05d`. `src-tauri/Cargo.toml` and two `systemBreakdown` files are already modified by other work and remain untouched.
- The main SocratiCode index was healthy and used for discovery; source reads and tests provide implementation verification.

## Discussion

Use the existing shared hover marker inside the compact rail, with its buttons registered as targets. Keep selected backgrounds visible by following the existing preserve contract. For wallpaper, use a separate boolean setting, rather than reusing the chat effect selection, because the two images have independent purposes and lifecycles. Reuse the existing worker's Halftone render and cache logic while keeping separate output URLs and stale-result protection.

## Implementation plan

1. In the compact-rail worktree, update `src/app/shell/Sidebar.tsx`: mount a shared marker under the compact rail and register `CompactRailAction` buttons with active preservation. Ensure the compact project picker and bottom Settings action participate without adding a second marker.
2. Add focused compact-rail regression coverage and run the full required gates. Manual Tauri dev-mode checks remain for the integrated main checkout.
3. In the wallpaper worktree, update `src/features/settings/model/appearance.ts`: persist and apply the wallpaper Halftone preference, refresh on image/theme changes, handle failed renders with original-image fallback, and dispose superseded generated URLs. Keep the Windows guard and existing wallpaper persistence.
4. In `src/features/settings/model/newThreadBackgroundEffects.ts`, expose only the worker preparation needed by wallpaper without sharing chat's CSS variable or active object URL. Reuse the Halftone algorithm in the worker.
5. In `src/features/settings/ui/SettingsView.tsx`, add the Windows-only switch, processing/error feedback, and restore-defaults behavior. Make the option visible but disabled without a wallpaper, matching the existing opacity row.
6. Add focused wallpaper regression coverage and run the full required gates. Both features are now directly integrated into `nakul/windows-support`; the user reported the requested Tauri dev-mode checks passed before the installer build.

## Todos

- [x] Inspect existing hover and wallpaper paths
- [x] Write combined spec and manual test pointers
- [x] Obtain spec approval (Nakul requested implementation)
- [x] Cut one worktree per feature from `60cb05d`
- [x] Implement and test compact rail hover
- [x] Implement and test wallpaper Halftone
- [x] Fix Settings wallpaper choice ownership and managed-file commit order
- [x] Run required gates and record local changelog
- [x] Corrected installed-build verification (user-confirmed pass) and fast-forward fork push

## Issues in Dev (+ fixes)

The direct integration passed the main checkout's complete web, Rust, and
production-build gates. The compact-rail suite initially hit one unchanged
`Composer.paste.test.ts` failure; the focused test and the final full suite
passed. An initial wallpaper Rust attempt hit a Windows
`STATUS_STACK_BUFFER_OVERRUN` while compiling generated bindings during
concurrent builds; the isolated retry passed. ESLint cannot run because this
checkout has no `eslint.config.*`.

Compact-rail follow-up: the shared marker still dropped while the pointer
crossed the `gap-1.5` between shortcuts because the action stack had no
`data-shared-hover-continuity` ancestor. The hover resolver already retains its
target inside such a marked region. Added continuity to the main shortcut group
and a separate region around Settings; the rail and flexible spacer remain
outside both regions. The focused regression assertion failed before the fix
and passed after it.

Wallpaper review follow-ups: a pending render now keeps the displayed URL alive
until a replacement is painted; image selection checks ownership after each
async step; managed wallpaper persist/clear calls are serialized; slow Halftone
renders cannot override the latest toggle; and theme-triggered render failures
reach the Settings error state while retaining the original image. Focused
regressions cover these paths. On the integrated checkout, `npm run check:web`
passed (326 files / 3,636 tests and TypeScript), `npm run check:rust` passed
(fmt, clippy, 413 tests / 4 ignored), and `npm run build` passed. Build emitted
CSS highlight pseudo-element, mixed-import, and large-chunk warnings. ESLint
remains blocked by the missing `eslint.config.*`.

## Wallpaper ownership race follow-up — 24 Sept 2026

The commit invariant is: the displayed wallpaper, saved path, Settings state,
retained managed file, and live object URL all describe the same choice whose
managed copy, image read, and required render succeeded. Canceling a picker
does not revoke a pending choice. A failed newer choice leaves the prior
successful choice intact. A successful newer choice or Remove fences older
work.

Root cause: opening a second picker advanced the Settings action revision
before a path had been selected. Separately, native persistence replaced the
currently retained managed image before image read/render could establish a
successful choice. Settings could then refuse to save the path even as the
appearance model painted its URL.

Fix: picker requests now have a separate cancellation epoch; choice ownership
advances only when a path is selected and becomes committed only with the CSS
swap. New files are staged under unique managed paths, then the app retains the
successfully committed file and removes superseded candidates once overlapping
operations settle. Failed staged reads/renders discard their candidate URLs
and files. Settings reports a newer failure even while an older valid render
continues. Focused Settings tests cover cancellation, persistence/read/render
failure, success/Remove fencing, reload path restoration, object-URL lifetime,
and managed-file operation order.

Final ownership-fix verification: the focused wallpaper/settings/filesystem
suite passed (31 tests). Full `npm run check:web` was flaky in unrelated
Composer tests: one full run passed (326 files / 3,643 tests), while the first
run failed two Composer cases and the final repeat failed one
(`Composer.test.ts`, attachment ownership). Standalone `npx tsc --noEmit`
passed after the final source change. `npm run check:rust` passed formatting,
Clippy, and 415 tests (4 ignored) with `CARGO_BUILD_JOBS=1`; the default
parallel attempt hit an LLVM out-of-memory /
`STATUS_STACK_BUFFER_OVERRUN` compiler failure. `npm run build` passed with the
existing CSS highlight pseudo-element, mixed-import, and large-chunk warnings.
The final `git diff --check` passed. ESLint remains blocked by the missing
`eslint.config.*`. Manual Tauri checks remain for the user; no browser or Tauri
UI has been opened.

## Release build - 24 Sept 2026

The feature commit is 4a57b5685cdeba325f7e7a1df5cbea74554f7980 and the release-version commit is 5948d47c15a95e17540561402129048500cba0cd. The release gates passed: web 326 files / 3,642 tests and TypeScript, Rust fmt + Clippy + 415 tests / 4 ignored with one Cargo job, production web build, and unsigned NSIS build. Existing CSS highlight, mixed-import, and large-chunk build warnings remain. ESLint was not attempted because the repository has no root eslint.config.*.

Installer: E:\Developing\Installable versions\MonoCode_0.1.55-local3-rail-wallpaper_x64-setup.exe; 10,582,617 bytes; SHA-256 5E59FDF78B0B17AB46549BAB63F4209F387B83FF5B84ABB6ACAD98CE86A99663. It reports version 0.1.55-local3-rail-wallpaper and is NotSigned.

The user reports the requested dev-mode pointers and earlier checks passed. This agent did not open Tauri UI. Installed-build behavior remains unverified; no push until the user confirms it works. The two systemBreakdown WIP files and src-tauri/Cargo.toml retain their starting SHA-256 values; the systemBreakdown changes are unstaged and excluded from both commits.

## Issues in Installed (+ fixes)

The 0.1.55-local3-rail-wallpaper unsigned NSIS installer was built and archived. Installed-app testing found that Halftone always falls back to the original image, including with a disposable second image and after restart. The other observed settings and native picker behavior passed or were explicitly untested. This build is rejected and must not be pushed.

Root-cause trace: `applyWallpaperPath` makes a `blob:` object URL from the native image bytes; `renderWallpaper` passes it to `prepareNewThreadBackgroundEffect`, whose `ensureSource` calls `fetch(src)`. The production `connect-src` policy in `src-tauri/tauri.conf.json` allows neither the app origin nor `blob:`. The dev policy allows the localhost origin, explaining the dev/installed difference. The worker catches the failed source load and Settings shows the generic Halftone error. Fix only the necessary `connect-src` source (`blob:`) in both policies. Add a regression assertion against the shipped config, run focused and full checks, then repeat dev and installed testing with a new local version. Keep the local3 installer archived as the failed candidate. No push until the corrected installed build passes.

## Learnings

- The compact rail lacks the marker entirely; the hover system already supports the needed active-row contract.
- Hover continuity must cover each compact shortcut group, while the flexible spacer between groups stays outside the marked regions.
- The existing Halftone worker is reusable, but its chat-specific output ownership must remain separate from wallpaper output.

## Done

Both features and their regression tests are directly integrated in the main
checkout on `nakul/windows-support`, committed as 4a57b56; release version committed as 5948d47.
Both temporary implementation worktrees were removed after source-content and
test verification in the main checkout.
The unrelated `src-tauri/Cargo.toml` and two `systemBreakdown` edits remain
untouched. The original local3 installer failed installed Halftone testing and is preserved under `Installable versions\failed`. The CSP correction and five wallpaper effect choices are committed as `9397898`; the user reports dev-mode success. A corrected same-version installer is built and archived, with SHA-256 `B768793BFD7B5EA7C3F0F67D2451D1CC1B2F0A7F942B23C9BBA6E9B104E1A30E`. The corrected installed build passed by user report and the verified fast-forward fork push is complete; see the release closeout above. See `docs/specs/archive/wallpaper-effects-plan.md` for the current release record.
