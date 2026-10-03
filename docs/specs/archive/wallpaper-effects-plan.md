# Done — Wallpaper effects — plan

- Workflow status: Done (historical spec, labeled at Nakul's request). Existing verification caveats below are preserved.


- Checkout/worktree: `E:\Developing\OpenSource\mono-clone` (existing checkout; no new worktree)
- Branch: `nakul/windows-support`
- Base commit: `5948d47` (`0.1.55-local3-rail-wallpaper`)

## Release closeout - 25 Sept 2026

- Installed verdict: user-confirmed pass for the corrected unsigned installer. This is the user's installed-app report, not an automated or agent-observed UI check.
- Source/version: `9397898c923491a9ee1e9cd77c4bcc917634c888` / `0.1.55-local3-rail-wallpaper`.
- Installer: `E:\Developing\Installable versions\MonoCode_0.1.55-local3-rail-wallpaper_x64-setup.exe`; 10,577,371 bytes; SHA-256 `B768793BFD7B5EA7C3F0F67D2451D1CC1B2F0A7F942B23C9BBA6E9B104E1A30E`. The earlier failed installer remains in `E:\Developing\Installable versions\failed\`.
- Push: `personal` (`https://github.com/imnakul/monocode-clone.git`) accepted only `nakul/windows-support` as a fast-forward without force. The fetched remote started at `6f1d2f7851be7ea644e11f4daf2b2b9da29b7770`; local was 217 commits ahead and 0 behind. Verified remote SHA and local HEAD both equal `9397898c923491a9ee1e9cd77c4bcc917634c888`.
- Protected WIP remains unstaged and byte-identical: `src-tauri/Cargo.toml` SHA-256 `894B5D3441D93D8DF11F311AE37FCAD767C2A254C9BDC5B1C0A5BFA7DA6CFCE6`; `systemBreakdown.ts` SHA-256 `54B9DFA03305CA37E99B95035910A8C339106ED47C8583E2E1D8DC9EC3072A1F`; `systemBreakdown.test.ts` SHA-256 `7363FC14EDA1002A995D3193A8EE116778D3C8D4E6260D6A7F1068613345A708`.

## Initial Idea

Replace the Windows wallpaper's Halftone switch with the same five choices offered for chat backgrounds: None, Dither, ASCII, Halftone, and Scanlines. Keep wallpaper and chat choices independent. New effect ideas are a separate decision.

## Research

The five algorithms, names, descriptions, and worker preparation already exist in `src/features/settings/model/appearance.ts` and `newThreadBackgroundEffects.worker.ts`. The wallpaper path currently hardcodes Halftone inside `renderWallpaper`; Settings stores a separate boolean and shows a Toggle. The chat UI already uses `Segmented` for these exact choices. `Segmented` needs an optional disabled state to preserve the wallpaper control's current no-image behavior. The installed local3 build failed because its CSP omitted `connect-src blob:`; that fix is already in the working tree and passed automated gates, and the user has confirmed the corrected installed build works.

## Discussion

Use the shared effect set and renderer, but store the wallpaper selection under its own key. When the new key is absent, interpret the old `monocode.wallpaperHalftone=true` preference as Halftone and false/missing as None. After a new choice, persist the new key and remove the old one. The displayed source image and generated object URL keep their existing commit/release ordering. A render error shows the original wallpaper with a generic effect message and keeps the selected preference for retry. Choosing None restores the original image.

## Implementation plan

1. `appearance.ts`: add wallpaper effect load/save with legacy boolean migration; change wallpaper rendering, theme refresh, init, and managed-choice callbacks from boolean to the shared effect type. Keep revision and URL ownership intact.
2. `SettingsView.tsx`: replace the switch with a disabled-when-empty Segmented control and the five existing descriptions; adapt busy/error text and Restore defaults. Keep the chat control independent.
3. `SettingsView.tsx` shared `Segmented`: add optional disabled support with no behavior change for current consumers.
4. Update wallpaper model and Settings regression tests for storage migration, every effect, None, rapid choices, failures, restart and Remove. Keep the prior ownership-race coverage; do not delete tests to make them pass.
5. Run focused and full web gates, TypeScript, Rust checks, and production web build. Update local changelogs. After Tauri dev-mode visual testing, rebuild the installer at the same `0.1.55-local3-rail-wallpaper` version as the user requested; installed confirmation is required before fork push.

## Todos

- [x] Trace current worker, state, UI, and tests
- [x] Implement effect selection and migration
- [x] Run required automated checks
- [x] Manual dev-mode verification (user report)
- [x] Same-version installer build and archive
- [x] Corrected installer installed verification (user-confirmed pass)
- [x] Fast-forward push to personal after installed verdict

## Issues in Dev (+ fixes)

The shared worker already renders all five choices, so no worker algorithm or dependency changed. A Settings test first exposed that a mounted hook does not reload `localStorage` merely because the test wrote a path; the test now remounts before exercising enabled controls. Focused wallpaper and Settings tests passed (54). The user reports that the five wallpaper effects work in Tauri dev mode. On isolated release source, the full web gate passed (326 files / 3,649 tests and TypeScript); Rust fmt, Clippy, and tests passed (415 / 4 ignored with one Cargo job); production web build passed with existing CSS highlight, mixed-import, and chunk warnings. Changed-file ESLint remains blocked because the repository has no `eslint.config.*`.

## Issues in Installed (+ fixes)

The failed local3 installer is preserved under `E:\Developing\Installable versions\failed\` with SHA-256 `5E59FDF78B0B17AB46549BAB63F4209F387B83FF5B84ABB6ACAD98CE86A99663`. The user explicitly requested a corrected installer without a version bump, overriding the usual new-counter rule. Commit `9397898c923491a9ee1e9cd77c4bcc917634c888` contains the CSP correction and five wallpaper effect choices. The corrected unsigned NSIS installer is at `E:\Developing\Installable versions\MonoCode_0.1.55-local3-rail-wallpaper_x64-setup.exe`, 10,577,371 bytes, SHA-256 `B768793BFD7B5EA7C3F0F67D2451D1CC1B2F0A7F942B23C9BBA6E9B104E1A30E`. The corrected installed-build pass was user-confirmed; the verified fast-forward push is recorded in the release closeout above.

## Learnings

The wallpaper and chat effect choices can share the worker and names while keeping independent preferences, rendered URLs, and CSS variables. Migrating the old boolean only when the new key is absent preserves existing Halftone users.

## Done

Dev-mode visual check reported passed by the user; automated release gates and same-version installer build passed. The corrected installed build passed by user report and the verified fast-forward fork push is complete; see the release closeout above.
