# Done — Windows compact rail and wallpaper release — spec

- Workflow status: Done. Historical snapshot status and verification notes below are retained.


- Tier: complex · Snapshot: `60cb05d`, 24 September 2026 · Status: corrected installed pass confirmed by user; fast-forward push complete
- Checkout: `E:\Developing\OpenSource\mono-clone`, branch `nakul/windows-support`.
- The user reports the requested Tauri dev-mode pointers and earlier manual checks passed. Record both as user reports, separate from automated checks.

> Installed verdict, 25 September: the original `0.1.55-local3-rail-wallpaper` installer failed to render wallpaper Halftone for two images and after restart. It is now preserved under `Installable versions\failed`. A corrected installer with the same version was built at the user's explicit request. That hold was later lifted after Nakul confirmed the corrected installer works.

> Scope extension, 25 September: the user requested all five existing chat-effect choices for Windows wallpaper. Their independent preference, legacy Halftone migration, shared worker UI, and tests are committed in `9397898`. Read `docs/specs/wallpaper-effects-plan.md` for the current state. The user reports the modes work in dev mode. The original local3 artifact facts below are historical; the corrected same-version artifact is identified by its distinct SHA-256 below.

> Release amendment, 25 September: the user's explicit instruction to keep version `0.1.55-local3-rail-wallpaper` overrides this spec's earlier unique-counter and no-reuse steps. The corrected unsigned installer was built from `9397898c923491a9ee1e9cd77c4bcc917634c888` and archived at `E:\Developing\Installable versions\MonoCode_0.1.55-local3-rail-wallpaper_x64-setup.exe` (10,577,371 bytes; SHA-256 `B768793BFD7B5EA7C3F0F67D2451D1CC1B2F0A7F942B23C9BBA6E9B104E1A30E`). The failed original is at `E:\Developing\Installable versions\failed\MonoCode_0.1.55-local3-rail-wallpaper_x64-setup.exe` (SHA-256 `5E59FDF78B0B17AB46549BAB63F4209F387B83FF5B84ABB6ACAD98CE86A99663`). Full isolated-source web, TypeScript, Rust, production web, and NSIS checks passed. Both unrelated `systemBreakdown` files and `src-tauri/Cargo.toml` retained their starting SHA-256 hashes. Nakul later confirmed the corrected installed build passes, and the verified fork push is recorded below. Later release-order text describing the first local3 candidate is historical where it conflicts with this amendment.

## Goal and user story

As the Windows fork owner, I want an installable version of the integrated compact-rail hover and wallpaper Halftone changes, then a push to my fork after the installed build works.

## Scope

Prepare the corrected unsigned Windows NSIS installer at the existing version as explicitly requested; run the required gates against exactly the intended source; preserve the failed installer separately; document the build; commit the intended changes on the existing branch; and push that branch to the `personal` fork only after the user confirms the corrected installed build works. Work directly in the existing checkout. Do not create a worktree or branch.

## Out of scope

No new features, UI redesign, installer signing, MSI, updater release, GitHub release, upstream push, or cleanup of other branches/worktrees. The optional native-window smoke test below can run in a separate session and is not an additional prerequisite to build, since the user already completed dev-mode testing.

## Handoff facts at spec creation

- `docs/WORKING-AGREEMENT.md` requires manual dev verification before an installer and installed-build confirmation before pushing. Nakul confirmed the corrected installed build works, satisfying the installed gate; the fork push is complete.
- `package.json:4,10-21`, `Cargo.toml:6`, `src-tauri/tauri.conf.json:4`, and the local `monocode` entry in `Cargo.lock` currently use `0.1.55-local2-upstream-import`. `src-tauri/Cargo.toml:3` inherits the workspace version. The existing `scripts/bump-version.mjs:7-11` rejects suffixed versions, so do not use it for this release.
- `package.json:21` has `build:windows`, and the installed Tauri CLI accepts `--no-sign`. `src-tauri/tauri.windows.conf.json` selects NSIS and disables updater artifacts. The versioned NSIS file should be `MonoCode_0.1.55-local3-rail-wallpaper_x64-setup.exe`; no matching archive file existed at spec time. Recheck before writing.
- `scripts/archive-installer.mjs` scans all `.exe` and `.msi` files in several bundle directories. For this release, copy only the exact fresh versioned NSIS file to `E:\Developing\Installable versions` and compare SHA-256; do not run that broad script.
- At spec handoff the checkout contained intended uncommitted rail/wallpaper changes and tests; those features are now committed on nakul/windows-support. It also contains unrelated uncommitted `src/features/sessions/model/systemBreakdown.ts` and `.test.ts` changes. `src-tauri/Cargo.toml` is status-marked but has no content diff against HEAD (line-ending artifact). Preserve those files byte-for-byte and exclude the `systemBreakdown` work from this installer and commits.
- The local branch was 214 commits ahead of `personal/nakul/windows-support` at spec time. A push will include those existing commits too. Verify the actual remote and commit range again before pushing. `docs/` is gitignored and its release notes stay local.
- Recent final-source checks: focused wallpaper suite 31 passed; one full web run passed 3,643 tests, while repeat runs intermittently failed existing Composer attachment tests; standalone TypeScript passed; Rust formatting/Clippy/415 tests passed with `CARGO_BUILD_JOBS=1`; production web build passed. ESLint 10 cannot find `eslint.config.*`. These are history, not a substitute for release-source checks.

## Release invariants and ordering

1. The installed binary must correspond to an identifiable commit on `nakul/windows-support` plus the one version string below. No unrelated `systemBreakdown` work enters that commit or binary.
2. Preserve both unrelated file contents and hashes. Before any temporary isolation, capture hashes and a patch/back-up of those two files. Use a path-limited reversible stash to isolate them while gates and bundling run; identify the exact stash by its object ID, never pop an arbitrary stash. Restore with `git stash apply` after the build, verify both hashes match, then drop only that stash. If isolation or restoration is uncertain, stop before committing or pushing and report it. Leave the `Cargo.toml` line-ending artifact alone unless the build itself normalizes it; do not stage it unless it has a real intended diff.
3. Use `0.1.55-local3-rail-wallpaper` in `package.json`, root `Cargo.toml`, Tauri config, and their tool-generated lockfiles. Use `npm version 0.1.55-local3-rail-wallpaper --no-git-tag-version` for the npm files; edit the two source manifests; let Cargo regenerate its own lock entry through its normal command. Check that lockfile diffs touch the local package version only. Do not hand-edit generated lockfiles or run the suffix-rejecting version script.
4. Run all release gates while the unrelated WIP is isolated and against the final versioned source. Do not overlap Rust compilers; set `CARGO_BUILD_JOBS=1` for `npm run check:rust` because the parallel build previously exhausted memory. A Composer failure must be reported with its exact test and rerun evidence; do not delete or weaken it or call an all-green gate if the final run is red.
5. Stage exact intended paths, inspect `git diff --cached --stat` and `git diff --cached --check`, then make logical feature and release-version commits. A clean release commit must precede the installer build. Confirm the source HEAD has not changed between build and archive. Preserve unrelated WIP after restoration.
6. Build `npm run build:windows -- --no-sign` (NSIS only). Verify the exact expected filename, newly produced timestamp, size, version, and SHA-256. If absent or ambiguous, stop. Preserve the failed installer under the archive's `failed` directory, then copy the corrected same-version file to the normal archive path without overwrite; compare hashes. This is the user's explicit exception to the normal counter rule.
7. Report the archived installer path and the commit SHA. The user installs and tests this build. Only after they confirm it works, fetch the `personal` fork, verify its URL is the user's fork and the push is fast-forward, then push **only** `nakul/windows-support` to `personal` with no force. Never push to `origin` or upstream. If remote history diverges or the extra local commits are unexpected, stop and explain before pushing.

## Acceptance criteria

- AC-1: Given the existing WIP, when the release gates and installer run, then neither `systemBreakdown` file is in the staged diff or installer source, and their post-restore SHA-256 hashes equal the recorded starting hashes.
- AC-2: Given the version bump, when each package/manifest/lockfile is inspected, then every local app version is `0.1.55-local3-rail-wallpaper`, with no third-party dependency churn.
- AC-3: Given the final versioned release commit, when web, TypeScript, Rust, and production/NSIS build gates run, then each result is recorded accurately; any failure is attributed with evidence and remains a gate until resolved.
- AC-4: Given a successful NSIS build, when the installer is archived, then only the new exact-version `.exe` is copied, its source and archive SHA-256 values match, and no prior archive file is overwritten.
- AC-5: Given the newly archived installer, when the user has **not yet** reported an installed-build verdict, then no push occurs; when they confirm it works, only the fast-forward `personal/nakul/windows-support` push occurs and the resulting remote SHA is reported.
- AC-6: Given release notes, then `docs/changelog/LOCAL-CHANGELOG.md`, `docs/WINDOWS-CHANGES.md`, and the existing feature plan record the user's dev-test pass, exact build/version/hash, installed verdict when available, gate results, and push SHA. These docs remain local and untracked.

## Implementation plan

1. Read repo instructions and the three required local docs; confirm branch/HEAD/status, remotes, WIP hashes, target version availability, and the exact intended feature file list. The current intended feature paths are `src-tauri/src/fs.rs`, `src-tauri/src/lib.rs`, `src/app/shell/Sidebar.tsx`, `src/app/shell/SidebarRename.test.ts`, `src/features/projects/ui/SearchableProjectPicker.tsx`, `src/features/settings/model/appearance.ts`, `appearance.test.ts`, `appearance.wallpaper.test.ts`, `settings.ts`, `src/features/settings/ui/SettingsView.tsx`, `SettingsView.wallpaper.test.ts`, `src/platform/tauri/fs.ts`, and `fs.test.ts`. Reconcile this list with the actual diff before staging.
2. Back up and isolate only the two `systemBreakdown` files as described above. Verify `git status` and that the isolated files match HEAD. Preserve all other user changes.
3. Bump the version via the exact tools/order above. Run `npm run check:web`, `npm run check:rust` serially with one Cargo job, and `npm run build`; inspect and document any flaky failure. TypeScript is included in `check:web` only if Vitest finishes; run `npx tsc --noEmit` separately if it does not. Attempt changed-file ESLint only if a usable config exists; record the existing config blocker without introducing CI/config changes.
4. Commit only the approved feature paths, then the version files, with clear Conventional Commit messages. Check both commit diffs and `git status` before building. If commits or staging include the unrelated WIP, correct them before building.
5. Build and archive the new NSIS artifact, update the local docs with actual results, restore/verify WIP, and hand the installer to the user for installed testing. On a failed installed test, fix the source, rerun gates, build a new counter version, and archive it without deleting the old file.
6. After user confirmation, recheck branch/remote/fast-forward, push the fork branch, verify remote SHA, and finish the local docs/report.

## Test and verification matrix

| Risk | Check |
| --- | --- |
| Feature regressions | `npm run check:web` on isolated release source; report total and any Composer flake exactly. |
| Type errors | The TypeScript phase of `check:web`, or standalone `npx tsc --noEmit` if Vitest stops first. |
| Native regressions/resource exhaustion | `npm run check:rust` with `CARGO_BUILD_JOBS=1`, no parallel Cargo job. |
| Frontend and installer compilation | `npm run build`, then `npm run build:windows -- --no-sign`. |
| Unintended content | Exact staged diff, WIP hashes before/after, `git diff --check`, version consistency, build commit SHA. |
| Wrong/stale archive | Exact NSIS filename, fresh timestamp, SHA-256 equality, no pre-existing destination. |
| Wrong push target | Inspect `personal` URL, fetch, fast-forward check, push explicit branch ref, compare remote SHA. |

## Optional native Tauri UI smoke test in a separate session

The installed `computer-use` skill exposes native Windows window capture and input through `@oai/sky` in `node_repl`; this is different from browser-only computer use. The agent may run `npm run tauri -- dev`, select the unique MonoCode window from returned app/window objects, and inspect screenshots/accessibility. Keep the test short: collapse the rail and move across adjacent shortcuts and the gap before Settings; open Appearance and inspect wallpaper Halftone on/off and theme changes without changing chat background; verify Remove and a canceled picker if the user has a disposable test image. Record observed outcomes and restore the starting preference/image. Do not claim unobserved failure/race paths passed. Do not build or push from this optional smoke-test thread.

## Facts, decisions, assumptions, and open questions

- Handoff fact: the user had reported manual dev pointers passed; the corrected installed pass is confirmed in the closeout below.
- Decision: the first candidate version is `0.1.55-local3-rail-wallpaper`, NSIS unsigned, archived by an exact-file copy. This makes the build identifiable and avoids broad archive-script copying.
- Decision: temporary, hash-verified isolation of two unrelated WIP files is necessary for a release binary containing only intended changes, while staying in the same checkout.
- Verified fact: `personal` points to the user's fork; its URL and fast-forward state were checked before the push.
- Closed 25 Sept: Nakul confirmed the corrected installed artifact works; this user confirmation satisfied the sole release gate. No extra dev-mode repeat is required.

## Release execution - 24 Sept 2026

- AC-1: done. The release source was built with both systemBreakdown files isolated; neither appears in either commit. After the build their original byte hashes were restored and verified: systemBreakdown.ts 54B9DFA03305CA37E99B95035910A8C339106ED47C8583E2E1D8DC9EC3072A1F; systemBreakdown.test.ts 7363FC14EDA1002A995D3193A8EE116778D3C8D4E6260D6A7F1068613345A708. src-tauri/Cargo.toml retained hash 894B5D3441D93D8DF11F311AE37FCAD767C2A254C9BDC5B1C0A5BFA7DA6CFCE6.
- AC-2: done. package.json, package-lock.json, root Cargo.toml, Cargo.lock, and src-tauri/tauri.conf.json all use 0.1.55-local3-rail-wallpaper. Cargo generated a local package version-only lock diff.
- AC-3: done. Web: 326 files / 3,642 tests and TypeScript passed. Rust: fmt and Clippy passed; 415 passed / 4 ignored with CARGO_BUILD_JOBS=1. Production web build and NSIS build passed. Existing build warnings are CSS highlight pseudo-elements, mixed static/dynamic filesystem imports, and large chunks. Changed-file ESLint was not attempted because no root eslint.config.* exists.
- AC-4: done. The exact x64 NSIS installer was copied without overwrite; source/archive SHA-256 match.
- AC-5: partial. The original local3 installed test failed. The corrected same-version installer is built from `9397898` and archived; its installed verdict is pending. No push was made.
- AC-6: partial. The local changelog, Windows tracking note, and feature plan contain the user-reported dev-mode pass, artifact/version/hash, gate results, pending installed verdict, and push status. Installed verdict and push SHA remain pending.
- Commits: 4a57b5685cdeba325f7e7a1df5cbea74554f7980 feature; 5948d47c15a95e17540561402129048500cba0cd release version.
- Installer: E:\Developing\Installable versions\MonoCode_0.1.55-local3-rail-wallpaper_x64-setup.exe; 10,582,617 bytes; SHA-256 5E59FDF78B0B17AB46549BAB63F4209F387B83FF5B84ABB6ACAD98CE86A99663; version 0.1.55-local3-rail-wallpaper; Authenticode NotSigned.
- Native UI: a separate agent tested the installed local3 app. Halftone rendering failed for two images and after restart; picker Cancel and theme switching passed. Rail hover and Remove were untested in that installed session.
- Push: not attempted. No remote fetch or remote SHA check was done because the installed-build confirmation gate remains.

## Release closeout - 25 Sept 2026

- AC-1: done. All three protected files retain their starting SHA-256 values and remain the only working-tree modifications; all are unstaged.
- AC-2: done. Version remains `0.1.55-local3-rail-wallpaper`; no version change or installer rebuild occurred during closeout.
- AC-3: done from the recorded isolated release run: web 326 files / 3,649 tests and TypeScript passed; Rust fmt/Clippy and 415 tests passed (4 ignored); production web and unsigned NSIS builds passed. Existing CSS highlight, mixed-import, and large-chunk warnings remain. ESLint is blocked by the missing flat config.
- AC-4: done. Corrected installer is 10,577,371 bytes with SHA-256 `B768793BFD7B5EA7C3F0F67D2451D1CC1B2F0A7F942B23C9BBA6E9B104E1A30E`; the failed installer remains preserved with SHA-256 `5E59FDF78B0B17AB46549BAB63F4209F387B83FF5B84ABB6ACAD98CE86A99663`.
- AC-5: done. Nakul confirmed the corrected installed build works. This is user-confirmed behavior, distinct from automated checks.
- AC-6: done. Updated release notes remain local and gitignored.
- Source commit/version: `9397898c923491a9ee1e9cd77c4bcc917634c888` / `0.1.55-local3-rail-wallpaper`.
- Push: `personal` URL verified as `https://github.com/imnakul/monocode-clone.git`; fetched branch began at `6f1d2f7851be7ea644e11f4daf2b2b9da29b7770`; range was 217 commits ahead and 0 behind. Pushed only `nakul/windows-support`, fast-forward without force. `git ls-remote` verified remote SHA equals local HEAD `9397898c923491a9ee1e9cd77c4bcc917634c888`.
- Protected working-tree files and hashes: `src-tauri/Cargo.toml` `894B5D3441D93D8DF11F311AE37FCAD767C2A254C9BDC5B1C0A5BFA7DA6CFCE6`; `systemBreakdown.ts` `54B9DFA03305CA37E99B95035910A8C339106ED47C8583E2E1D8DC9EC3072A1F`; `systemBreakdown.test.ts` `7363FC14EDA1002A995D3193A8EE116778D3C8D4E6260D6A7F1068613345A708`.
- Ignored docs: `.gitignore` excludes `docs/`, while `docs/notes/jira.md` is tracked. The file tree can show ignored entries through Settings > Appearance > Show excluded files.
- No tests, build, or installer rebuild were run in this closeout turn; automated results above are from the prior isolated release validation.

## Skills to load

`spec-implement`, `desktop-app`, and `testing` for any behavior fixes. Use `computer-use:computer-use` only in the optional native UI test thread.

## Implementer report format

Report AC-1 through AC-6 as done/partial/not done with evidence; exact changed and committed files; gate command/result totals; installer path, size, SHA-256, and commit SHA; WIP hash restoration; installed verdict; remote/branch/remote SHA if pushed; and any deviation or unresolved failure. Separate source reasoning, automated checks, native UI observation, and user-confirmed installed behavior.

## Handoff retro

Fill after the implementer's report is reviewed.
