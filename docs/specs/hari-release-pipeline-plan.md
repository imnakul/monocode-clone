# Draft — Hari: branded builds, CI releases and auto-update — spec

- Tier: complex · Snapshot: `4466f8c` on `nakul/windows-support-upstream-0.7.0`, 2026-10-06 · Status: Draft
- Branch for the source changes: `nakul/hari-kripa` (created in Phase 1 from the latest `origin/nakul/windows-support-upstream-0.7.0`)
- Repos: `imnakul/monocode-clone` (public fork, source of truth) · `imnakul/Hari-harness` (private, branding and the build pipeline) · `imnakul/hari-releases` (public, release files only)

## Goal and user story

Nakul keeps developing in `monocode-clone`: he takes upstream MonoCode changes, builds features, and tests them in dev mode. When a change is ready he pushes it to `nakul/hari-kripa`. From that point everything is automatic:

1. A private CI pipeline takes that exact commit and renames the product to Hari (app name, window titles, package and binary names, installer, icons, logo, splash).
2. It runs all the tests on the renamed code and checks that "MonoCode" appears nowhere a person can see it.
3. It builds a signed Windows installer and publishes it.
4. The installed Hari app shows "Update to <version>" in the sidebar. One click installs it and restarts.

The first Hari install copies Nakul's existing MonoCode data (sessions, settings, appearance, board) once, so nothing is lost.

## Scope

- Phase 0 (Nakul, manual): repos, tokens, signing key, logo.
- Phase 1 (`monocode-clone`, branch `nakul/hari-kripa`):
  - create the branch and update the repo's agent docs (AGENTS.md and others) for the new main branch;
  - the one-time data copy from MonoCode to Hari;
  - rewriting stored paths that contain the old data folder;
  - a periodic update check;
  - the dispatch workflow;
  - records.
- Phase 2 (`Hari-harness`):
  - `brand/` assets;
  - the rebrand script and the brand guard, each with tests;
  - the build-and-release workflow;
  - a README runbook.
- Phase 3: the first end-to-end run and the hand-off of the manual checks.

## Out of scope

- macOS and Linux Hari builds. Windows x64 NSIS only.
- Authenticode code signing (installer SmartScreen warning stays; see Manual checks).
- Renaming internal identifiers. Internal means any of these:
  - `monocode.*` localStorage keys;
  - the `monocode.db` file name;
  - `monocode:` and `monocode-` event and CSS names;
  - `MONOCODE_*` environment variables;
  - the `~/.monocode/` folder;
  - the `monocode_lib` crate name;
  - agent prompt tags such as `<monocode_assignment>`.

  Renaming them would break saved data and agent protocols, and users never see them. "No MonoCode in names" in this spec means names a person sees: product, window, installer, executable, install folder, data folder, package names, UI text.
- Migrating remote hosts that MonoCode installed on other machines (see Edge cases, E-12).
- Renaming the existing parked "Hari" orchestration lens (`src/app/shell/ProjectRail.tsx:149`); see Open questions.
- Changing upstream's `.github/workflows/ci.yml` and `release.yml`.

## Current behavior (facts confirmed in source at `4466f8c`)

**Identity**
- `src-tauri/tauri.conf.json:3-5`: `productName` is "MonoCode" and `identifier` is "com.monocode.desktop".
- `tauri.conf.json:15`: the window title is "MonoCode".
- `tauri.conf.json:72-77`: updater `pubkey: ""` and `endpoints: []`.
- `tauri.conf.json:52`: `bundle.createUpdaterArtifacts: true`.
- `src-tauri/tauri.windows.conf.json`: merged on Windows. It:
  - repeats the window list with `"title": "MonoCode"`;
  - sets `bundle.createUpdaterArtifacts: false`, so Windows builds today produce no updater signature;
  - sets NSIS `installMode: "currentUser"`, `sidebarImage: "icons/installer-sidebar.bmp"` (164×314 24-bit BMP) and `installerIcon: "icons/icon.ico"`.
- Package names:
  - `package.json:2` is `monocode-desktop`;
  - `src-tauri/Cargo.toml:2` is package `monocode` (the binary becomes `monocode.exe`) and `:12` is lib `monocode_lib` (used by `src-tauri/src/main.rs`);
  - the root `Cargo.toml:7` holds the workspace version.
- `scripts/bump-version.mjs`: accepts only `X.Y.Z`. It rewrites the versions in `package.json`, `package-lock.json` (matched by name `monocode-desktop`), `Cargo.toml`, `tauri.conf.json` and `Cargo.lock` (matched by `name = "monocode"`).
- Brand text: "MonoCode" appears 182 times in 82 non-test TS/TSX files and 98 times in Rust. It also appears in `index.html`, `quick-composer.html`, the three `src-tauri/tauri*.conf.json` files, `src-tauri/Cargo.toml` and `src-tauri/Info.plist`. The built `dist/` holds 162 occurrences.
- The logo and splash are `public/monocode.png`, referenced from:
  - `index.html:6` (favicon) and `index.html:117` (boot splash image);
  - `src/app/shell/UpdateRailCard.tsx:25`;
  - `src/features/sessions/ui/AgentTranscript.tsx:3322`.
- Icons are in `src-tauri/icons/` (32x32, 128x128, 128x128@2x, icon.ico/.icns/.png, the Square*Logo set, StoreLogo, installer-sidebar.bmp).

**Updater** (already built, upstream)
- `src/app/model/updater.ts` has three entry points:
  - `probeForUpdate()` (silent);
  - `runUpdateFlow(manual)`, used by the menu and Settings; the manual path asks "Install now?";
  - `installPendingUpdate()`, which downloads, installs, saves `monocode.installedUpdate` and relaunches.
- With no endpoints set, the check quietly returns `idle`, and a manual check points to `https://github.com/hardbeat920/monocode/releases/latest` (`updater.ts:90-100`, tested in `updaterConfig.test.ts`).
- `src/app/shell/SidebarUpdate.tsx:34-60`: probes once on mount, shows the button `Update to <version>` (`:116-118`), and stays silent when a probe fails.
- `src-tauri/src/lib.rs:280` registers `tauri_plugin_updater`.
- `src-tauri/capabilities/default.json:25` grants `updater:default`.

**Data locations** (Windows, Tauri v2)
- `app_data_dir` is `%APPDATA%\<identifier>`. It holds:
  - `monocode.db`, SQLite in WAL mode (`session_store.rs:42,91`);
  - `wallpaper/`, `backgrounds/` and generated images (`fs.rs` around `:5256-5575`, `chat_background.rs:10-15`);
  - `antigravity-helper/` (`antigravity_acp.rs:26-35`);
  - the window-state file.
- The WebView2 user data (localStorage, IndexedDB) is in `%LOCALAPPDATA%\<identifier>\EBWebView`. This is uncertain: it is the Tauri/wry default and is not confirmed in this repo; the implementer verifies it in Phase 3 on Windows.
- `persist_wallpaper` returns an absolute path inside `app_data_dir`, and the frontend stores it. Stored paths therefore contain `com.monocode.desktop`.
- `~/.monocode/` (scratch, Antigravity profile; `fs.rs:5474-5498`, `antigravity_acp.rs:132`) does not depend on the identifier.

**Rust entry**
- `src-tauri/src/main.rs` handles CLI subcommands, then calls `monocode_lib::run()`.
- `lib.rs:275-280`: `run()` calls `windows::initialize()`, then `tauri::Builder::default()…`. Windows declared in config are created by the builder.
- Dependencies already present: `rusqlite 0.40.2` (features `bundled`, `hooks`) and `windows-sys 0.61` with `Win32_System_Diagnostics_ToolHelp` (process enumeration without spawning). `Win32_UI_WindowsAndMessaging` (MessageBoxW) is not enabled yet.

**Remote host** (`host/`)
- `host/service.ts:87` uses `Description=MonoCode Host`.
- `host/windows.ts:99` names the scheduled task `MonoCode Host-<sid>`.

**Repo**
- `monocode-clone` is a public fork (GitHub reports `private: false, fork: true`). Forks have Actions disabled until the owner enables them.
- Upstream's `ci.yml` runs only on `main` and on PRs.
- `docs/WORKING-AGREEMENT.md:79-82` names `nakul/windows-support` as the main branch. `docs/NOTES.md:1-4` also names it.

## Proposed behavior and invariants

Architecture:

```
monocode-clone (public)            Hari-harness (private)                         hari-releases (public)
push nakul/hari-kripa ──dispatch──► build.yml                                       Release v0.7.0-hari.N
 (paths-ignore docs/**, **/*.md)     1 prepare (ubuntu): checkout sha, rebrand,     ├─ Hari_0.7.0-hari.N_x64-setup.exe
                                       web tests, host tests, source + dist guard  ├─ …setup.exe.sig
                                     2 windows: rebrand, clippy, cargo test,        └─ latest.json
                                       tauri build (signed), artifact guard        ▲
                                     3 publish (ubuntu): head check → draft →       │ Hari app polls
                                       upload → verify → publish                    └ releases/latest/download/latest.json
```

Invariants:

- I-1: `monocode-clone` source stays MonoCode-branded. Hari branding exists only inside the CI workspace and is never committed to `monocode-clone`. The rebrand runs on a fresh checkout every build, so it never causes merge conflicts.
- I-2: a release is published only if every check passes on the rebranded tree: web tests, `tsc`, host tests, `cargo fmt`, `cargo clippy -D warnings`, `cargo test`, and all brand guards.
- I-3: `latest.json` becomes visible to the app only after the installer and `.sig` it points to are uploaded and verified. The release is created as a draft and published last.
- I-4: an older commit never becomes the newest release. Publish is skipped unless the build's sha equals the current head of `nakul/hari-kripa`.
- I-5: Hari versions strictly increase: `<X.Y.Z of the source>-hari.<run_number of build.yml>`.
- I-6: updates install only after a click. The app never installs or restarts by itself, because a restart would end running agent sessions.
- I-7: the data copy never modifies or deletes MonoCode's folders. It copies, and it only renames folders aside; it never deletes Hari folders.
- I-8: in MonoCode builds (`identifier == "com.monocode.desktop"`) the copy code and the path rewrite do nothing. Dev mode in `monocode-clone` therefore keeps using MonoCode's own data and never touches Hari's.
- I-9: secrets (signing key, tokens) never appear in logs, in the repo, or in this spec.

## Rebrand rules (exact)

`Hari-harness/scripts/rebrand.mjs <checkoutDir> --version <v> --pubkey-file brand/updater.pub` applies these, in this order, to a fresh checkout.

**R-1 file set.** Run `git ls-files` in the checkout. Keep text files (no NUL byte in the first 8 KB) under these paths:
- `src/`, `src-tauri/` (excluding `src-tauri/icons/`, `src-tauri/gen/`, `src-tauri/target/`), `host/`;
- `index.html`, `quick-composer.html`, `package.json`.

Exclude everything else, in particular `docs/`, `vendor/`, `.github/`, `LICENSE`, `NOTICE`, the root `*.md` files, `package-lock.json` and `Cargo.lock` (both handled in R-4).

**R-2 text replacements**, case-sensitive, in order:

| # | Find | Replace |
|---|---|---|
| a | `Mono's Code` | `Hari` |
| b | `MonoCode` | `Hari` |
| c | `Mono Code` (whole words) | `Hari` |
| d | `https://github.com/hardbeat920/monocode/releases` | `https://github.com/imnakul/hari-releases/releases` |
| e | `monocode.png` | `hari.png` |

**R-3 files.**
- Copy `brand/hari.png` to `public/hari.png` and delete `public/monocode.png`.
- Copy `brand/icons/*` over `src-tauri/icons/*`, file by file with the same names, including `installer-sidebar.bmp`.

**R-4 package names and version.**
- `package.json` `name` becomes `hari-desktop`. The root and `packages[""]` names in `package-lock.json` change the same way.
- In `src-tauri/Cargo.toml`, `[package] name` becomes `hari`. Leave `[lib] name = "monocode_lib"` unchanged.
- In `Cargo.lock`, `name = "monocode"` becomes `name = "hari"`.
- Set version `<v>` in `package.json`, both `package-lock.json` entries, the root `Cargo.toml`, `tauri.conf.json` and the `hari` entry in `Cargo.lock`.
- Do not call `bump-version.mjs`: it rejects prerelease versions and matches the old names.

**R-5 config** (parse as JSON, edit, write back; no merge overlay, because JSON merge patch replaces arrays):
- `tauri.conf.json`:
  - set `productName: "Hari"`, `mainBinaryName: "hari"`, `identifier: "com.nakul.hari"`;
  - set every `app.windows[*].title` to `"Hari"`;
  - set `bundle.licenseFile` to `"../LICENSE"` (MIT notice, which does not contain the word MonoCode);
  - set `plugins.updater` to:
    ```
    { "pubkey": <contents of brand/updater.pub>,
      "endpoints": ["https://github.com/imnakul/hari-releases/releases/latest/download/latest.json"],
      "windows": { "installMode": "passive" } }
    ```
- `tauri.windows.conf.json`: set every window title to `"Hari"` and `bundle.createUpdaterArtifacts: true`.

**R-6 idempotent.** Running the script twice on the same checkout produces the same tree as running it once. It exits non-zero on any of these:
- a missing brand file;
- a JSON parse error;
- zero replacements made by R-4 (it prints the file it expected to change).

**R-7 report.** Print counts per rule and per file to the log. Use no colors, so the log stays easy to search.

## Brand guard (exact)

`Hari-harness/scripts/brand-guard.mjs --stage source|dist|artifacts <dir>` exits 1 and prints every hit as `file:line: text`.

**Banned pattern B:** `/MonoCode|Mono Code|Mono's Code|MONOCODE(?!_)/`. The negative lookahead keeps `MONOCODE_*` environment variables allowed.

- `source`: no B match in the R-1 file set. In addition:
  - `package.json` name is `hari-desktop`;
  - `src-tauri/Cargo.toml` package name is `hari`;
  - the `tauri.conf.json` fields are exactly as R-5 sets them, and `pubkey` is non-empty;
  - every window title in both conf files is `Hari`;
  - Windows `createUpdaterArtifacts` is `true`;
  - `public/monocode.png` is absent and `public/hari.png` is present.
- `dist`: no B match in `dist/**/*.{js,css,html}`, and no file under `dist/` whose name contains `monocode` (any case).
- `artifacts` (Windows):
  - exactly one `target/release/bundle/nsis/Hari_<v>_x64-setup.exe` and its `.sig`;
  - no file under `target/release/bundle` whose name contains `monocode` (any case);
  - `target/release/hari.exe` exists;
  - `(Get-Item target/release/hari.exe).VersionInfo.ProductName` equals `Hari` (run from the workflow step in PowerShell and pass the value in as `--product-name`).

Lowercase internal tokens (`monocode.boardWidth`, `monocode:ui-ready`, `<monocode_assignment>` and similar) are allowed by design (see Out of scope). The guard's `--help` text says so, so a later reader doesn't "fix" it.

## Edge cases and decisions

- E-1 upstream adds new "MonoCode" text: R-2 renames it automatically, and the source guard catches anything R-2 cannot reach (for example a new image file name). Nothing needs maintaining per string.
- E-2 a test asserts brand text: R-2 runs on test files too, so expectations and sources stay consistent. If a test still fails after the rebrand, fix the rebrand rules, not the test in `monocode-clone`.
- E-3 docs-only push: `paths-ignore: ['docs/**', '**/*.md']` means no dispatch and no release.
- E-4 two pushes close together (A then B):
  - the build jobs use concurrency group `hari-build` with `cancel-in-progress: true`, so A's build is cancelled if it is still running;
  - the publish job uses group `hari-publish` with `cancel-in-progress: false`;
  - publish first reads the current head with `git ls-remote https://github.com/imnakul/monocode-clone refs/heads/nakul/hari-kripa`. If that is not the build's sha, it logs `Superseded by <sha>; not publishing.` and exits 0.
- E-5 re-running an old workflow run: the same head check skips it. A re-run of the current head with the same `run_number` finds the existing tag:
  - same sha: replace the draft's assets, or exit 0 if already published;
  - different sha: fail with `Tag v<v> already exists for <other sha>`.
- E-6 tests fail: no release. The app stays on its version, and GitHub emails Nakul about the failed run. A failure in the first job stops the Windows job (`needs:`).
- E-7 the dispatch token is missing or expired: the `monocode-clone` workflow fails with `HARI_DISPATCH_TOKEN is missing or rejected (HTTP <code>)`. Recovery: fix the secret, then run `build.yml` by hand with `workflow_dispatch` input `sha`.
- E-8 signing key lost or replaced: installed apps reject new updates (signature mismatch). The only fix is a manual reinstall. Nakul keeps the key and password in a password manager (Phase 0). The updater error message shows in the manual check (`updater.ts:104-110`).
- E-9 bad release: updates only move forward. To roll back, revert the commit on `nakul/hari-kripa` and push; this ships a higher version with the old code. The README in Hari-harness says this.
- E-10 Hari and MonoCode installed side by side: they have separate data folders after the copy. They still share:
  - `~/.monocode/` (scratch, Antigravity profile), which is acceptable;
  - a global Quick Composer shortcut, which collides if both run. The README says to run one at a time.
- E-11 the base version changes (upstream 0.8.0 merged): the version becomes `0.8.0-hari.<n>`, which is greater than any `0.7.0-hari.*`. If the base were ever lowered, the updater would not offer the build. The prepare job then fails when the new X.Y.Z is lower than the X.Y.Z in the last published `latest.json`, with `Base version went down (<old> → <new>)`.
- E-12 remote hosts: Hari's host task becomes `Hari Host-<sid>`. A host that MonoCode installed on another machine is not reused, and connecting from Hari installs a new one. This is documented, not migrated.
- E-13 SmartScreen: the first manual install of an unsigned installer shows a warning. Updates downloaded by the updater carry no Mark-of-the-Web and normally don't warn (uncertain; check in M-6).
- E-14 the GitHub Actions budget for the private repo: 2,000 minutes a month, with Windows minutes counting double. The estimate is ~10–12 Linux plus ~15 Windows minutes per release with caches warm, so roughly 45 releases a month. This is an estimate to confirm on the first runs. Cache `~/.cargo` and `target/` with `Swatinem/rust-cache@v2` (Windows job) and npm through `setup-node` `cache: npm`.

## Data copy from MonoCode (first Hari launch)

New Rust module `src-tauri/src/brand_migration.rs`. It is called from `lib.rs` `run()` before `tauri::Builder::default()`. Restructure `run()` to build the context first (`let context = tauri::generate_context!();`), read `context.config().identifier`, run the copy, then call `.run(context)`. Windows only (`#[cfg(windows)]`); other platforms skip it.

Constants:
- `OLD_ID = "com.monocode.desktop"`;
- `MARKER = ".brand-migration.json"`, written inside the new roaming folder.

Paths:
- `oldRoaming = %APPDATA%\com.monocode.desktop`, `newRoaming = %APPDATA%\<id>`;
- `oldLocal = %LOCALAPPDATA%\com.monocode.desktop`, `newLocal = %LOCALAPPDATA%\<id>`.

Read them from the `APPDATA` and `LOCALAPPDATA` environment variables (no hardcoded user paths).

Ordering contract:

1. If `id == OLD_ID`, return (I-8). If `newRoaming\MARKER` exists, return.
2. If neither old folder exists, create `newRoaming`, write `MARKER` `{ "result": "nothing-to-copy", "at": <ISO time> }`, and return.
3. If `newRoaming` or `newLocal` exists without `MARKER`, an earlier attempt was interrupted. Rename each one aside to `<dir>.stale-<yyyyMMddHHmmss>`. Do not delete them.
4. Check whether MonoCode is running: enumerate processes with ToolHelp (`CreateToolhelp32Snapshot`, no spawned processes), looking for `monocode.exe`, case-insensitive. If it is running, show a `MessageBoxW` with:
   - title `Hari`;
   - text `Hari needs to copy your MonoCode data once. Close MonoCode (including any dev build), then choose Retry.`;
   - buttons Retry / Cancel. Retry repeats step 4. Cancel shows the step 7 choice.
5. Copy `oldRoaming` to `newRoaming.migrating` and `oldLocal` to `newLocal.migrating`. Exclude these caches (they rebuild themselves), anywhere under EBWebView: `Cache`, `Code Cache`, `GPUCache`, `DawnCache`, `GrShaderCache`, `ShaderCache`, `Service Worker\CacheStorage`, `Crashpad`. Copy the `monocode.db-wal` file whenever it exists (WAL mode); skip `monocode.db-shm`. Any file error aborts: delete both `.migrating` folders and go to step 7, passing the error text.
6. Rewrite paths inside the copies:
   - Let P be `oldRoaming`, with these variants: as is; with `/` separators; with doubled backslashes (JSON-escaped). Q is the matching `newRoaming` variant. Do the same for `oldLocal` and `newLocal`.
   - In `newRoaming.migrating\monocode.db`: for every table and every column declared `TEXT` (read `sqlite_master` and `pragma table_info`), run `UPDATE t SET c = replace(c, P, Q) WHERE instr(c, P) > 0` for each variant, in one transaction.
   - In every `*.json` file under `newRoaming.migrating`: replace each variant as text.
   - localStorage cannot be edited from Rust. It is handled by the frontend step below.
   - Rename `newLocal.migrating` to `newLocal` first, then `newRoaming.migrating` to `newRoaming`.
   - Write `MARKER` last: `{ "result": "copied", "from": OLD_ID, "oldRoaming": …, "oldLocal": …, "at": … }`.
7. On failure or Cancel: show `MessageBoxW`, title `Hari`, text `Couldn't copy your MonoCode data: <error>. Choose Retry to try again, or Cancel to start Hari without it.`, buttons Retry / Cancel.
   - Retry repeats from step 3.
   - Cancel writes `MARKER` `{ "result": "skipped", "error": … }` and continues startup with empty data.

   The README explains how to retry later: quit Hari, delete `%APPDATA%\com.nakul.hari` and `%LOCALAPPDATA%\com.nakul.hari`, then reopen.
8. Never write to or delete anything under the old folders (I-7).

Frontend localStorage path rewrite:
- New Tauri command `brand_migration_paths`. It returns `{ oldRoaming, newRoaming, oldLocal, newLocal }` only when `MARKER.result == "copied"`, and `null` otherwise.
- New `src/app/model/brandMigration.ts` `rewriteMigratedPaths(store = localStorage)`. Call it in `src/main.tsx` before the app renders.
  - If `monocode.brandPathsRewritten` is `"1"`, return.
  - Otherwise, for every key, replace all path variants as in step 6, case-insensitively for the drive letter, in string values. This works whether or not the value is JSON.
  - Then set `monocode.brandPathsRewritten = "1"`.
  - If the command returns `null`, set the flag and return.
  - Errors are logged with `console.warn("[brand-migration]", error)` and never block startup.

The copy and rewrite code compiles into MonoCode builds as well, and does nothing there (I-8). This is fork-only, so add a `LOCAL-FEATURES.md` row.

## Periodic update check

In `src/app/shell/SidebarUpdate.tsx`, keep the probe on mount and add another every `UPDATE_PROBE_INTERVAL_MS = 6 * 60 * 60 * 1000` while the app runs. Clear the timer on unmount.

- Skip a scheduled probe while `snapshot.phase` is `"available"` or `"downloading"`.
- A failed probe stays silent, as today.
- In MonoCode builds the probe resolves to `idle` (no endpoints), so nothing changes for them.

## States and transitions (app)

| State | Event | Next | User sees |
|---|---|---|---|
| idle/current | startup or 6 h timer → `latest.json` newer | available | Sidebar button `Update to 0.7.0-hari.N` |
| idle/current | probe fails (offline, 404 while a draft is in progress) | unchanged | Nothing (silent) |
| available | click the button | downloading | Progress, then passive NSIS installer window |
| downloading | install ok | relaunch → What's New | Existing What's New notice (`updateNotice.ts`) |
| downloading | signature or download error | error | Existing error message (`updater.ts:155`) |
| available | newer release appears | available (new version) | The button label updates on the next probe |

## States and transitions (pipeline)

| State | Event | Next |
|---|---|---|
| push to hari-kripa (code) | dispatch ok | Hari prepare queued |
| dispatch | token error | `monocode-clone` run red (E-7) |
| prepare | any check fails | stop; no release (E-6) |
| prepare ok | — | windows build |
| windows build | newer dispatch arrives | cancelled (E-4) |
| windows ok | — | publish |
| publish | head ≠ sha | exit 0, "Superseded" (E-4) |
| publish | head = sha | draft → upload → verify (exe, sig, latest.json, version and url match) → publish → done |
| publish | verify fails | leave the draft, fail the run (latest stays the previous release) |

## Acceptance criteria

- AC-1: Given the branch is created, when Phase 1 is done, then `nakul/hari-kripa` exists on origin, based on the newest `origin/nakul/windows-support-upstream-0.7.0`, and AGENTS.md, WORKING-AGREEMENT.md and NOTES.md say it is the main branch (exact text in the Implementation plan).
- AC-2: Given a fresh checkout of `monocode-clone`, when `rebrand.mjs` runs, then `brand-guard --stage source` passes, and every R-2 to R-5 change is present.
- AC-3: Given the rebranded tree, when `npx vitest run`, `npx tsc --noEmit`, `npm run test:host`, `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings` and `cargo test` run, then all pass.
- AC-4: Given the rebranded tree, when `npm run build` runs, then `brand-guard --stage dist` passes.
- AC-5: Given the Windows build, then the installer is `Hari_<v>_x64-setup.exe` with a `.sig`, the exe is `hari.exe` with ProductName `Hari`, it installs to `%LOCALAPPDATA%\Hari` (currentUser), and `brand-guard --stage artifacts` passes.
- AC-6: Given a code push to `nakul/hari-kripa`, when CI finishes green, then `hari-releases` has a published, non-prerelease release `v<v>` with the installer, `.sig` and `latest.json`. `latest.json` has `version` `<v>`, its `platforms.windows-x86_64.url` points at that release's installer, and its `signature` equals the `.sig` contents.
- AC-7: Given pushes A then B within a minute, then only B is published, and the run for A either is cancelled or logs `Superseded by <B sha>; not publishing.`
- AC-8: Given a push touching only `docs/**` or `*.md`, then no dispatch happens.
- AC-9: Given Hari `0.7.0-hari.N` is installed and `N+1` is published, when Hari starts or 6 h pass, then the sidebar shows `Update to 0.7.0-hari.N+1`. Clicking it installs and relaunches. Nothing installs without the click.
- AC-10: Given MonoCode data exists and MonoCode is closed, when Hari launches for the first time, then sessions, settings, appearance, Session Manager board and the wallpaper all appear. The wallpaper path points under `com.nakul.hari`, and MonoCode's folders are unchanged.
- AC-11: Given MonoCode is running at Hari's first launch, then the Retry/Cancel message from step 4 shows. Retry succeeds after MonoCode closes.
- AC-12: Given a copy failure (simulated in tests), then no `.migrating` folders remain, the message from step 7 shows, and Cancel starts Hari empty with `MARKER.result == "skipped"`.
- AC-13: Given a MonoCode build (dev mode in `monocode-clone`), then no copy runs, `brand_migration_paths` returns `null`, and the update probe stays idle.

## Implementation plan

### Phase 0 — Nakul (manual; the implementer stops and asks if any item is missing)

1. Create the private repo `imnakul/Hari-harness`, empty.
2. Create the public repo `imnakul/hari-releases`, with a README so it has a commit for release tags.
3. In `monocode-clone`, open Actions and enable workflows (forks start disabled).
4. Create a fine-grained token `HARI_DISPATCH_TOKEN`:
   - access: repo `Hari-harness` only;
   - permissions: Contents read and write (needed for `repository_dispatch`), Metadata read;
   - expiry: 1 year, with a calendar reminder.

   Save it as an Actions secret in `monocode-clone`.
5. Create a fine-grained token `HARI_RELEASES_TOKEN`:
   - access: repo `hari-releases` only;
   - permissions: Contents read and write.

   Save it as a secret in `Hari-harness`.
6. On your PC, run `npx tauri signer generate -w "%USERPROFILE%\.tauri\hari.key"` with a password.
   - Save the key file contents as the secret `TAURI_SIGNING_PRIVATE_KEY` and the password as `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` in `Hari-harness`.
   - Back up both in a password manager.
   - Give the implementer the `.pub` file contents. It is public and goes in `brand/updater.pub`.
7. Give the implementer the logo as a square PNG, at least 1024×1024, with a transparent background.
8. Give the agent GitHub access to `Hari-harness` and `hari-releases` if an agent will push there.

### Phase 1 — `monocode-clone`

1. Create the branch:
   ```
   git fetch origin nakul/windows-support-upstream-0.7.0
   git switch -c nakul/hari-kripa origin/nakul/windows-support-upstream-0.7.0
   ```
   Commit the steps below there. Push with `git push -u origin nakul/hari-kripa` only after Phase 2 exists; until then the dispatch has nowhere to go and fails (harmless, but red).
2. Agent docs (exact edits):
   - `AGENTS.md`, after the first paragraph, add:
     > Our main branch is `nakul/hari-kripa`. Every code push to it builds and publishes a Hari release that Nakul's installed app offers as an update, so push there only when Nakul says so. Upstream-sync branches (`nakul/windows-support-upstream-*`) are merged into it when Nakul says so. Hari branding is applied by CI in `imnakul/Hari-harness`; never commit Hari renames here.
   - `docs/WORKING-AGREEMENT.md:79-82`: replace the bullet with the same meaning, naming `nakul/hari-kripa` as main and `nakul/windows-support` as the previous main (kept, not deleted).
   - Lifecycle step 3 (`:101-102`): change it to:
     > Installers come from Hari CI on push to `nakul/hari-kripa`. Build locally (`npm run build:windows`) only when asked, for debugging.
   - `docs/NOTES.md:1-4`: change the target branch to `nakul/hari-kripa`.
   - Do not edit historical records (`docs/changelog/*`, `docs/WINDOWS-CHANGES.md` sections).
3. `src-tauri/src/brand_migration.rs` plus the `lib.rs` `run()` restructure, the `brand_migration_paths` command (register it in `lib.rs` `invoke_handler`), and these Cargo changes:
   - add the `rusqlite` feature `functions` only if needed (`replace()` and `instr()` are core SQL and need no feature);
   - add the `windows-sys` feature `Win32_UI_WindowsAndMessaging`.

   Keep every Win32 call inside `#[cfg(windows)]`.
4. `src/app/model/brandMigration.ts` and its call in `src/main.tsx`.
5. `src/app/shell/SidebarUpdate.tsx`: the periodic probe (above).
6. `.github/workflows/hari-dispatch.yml`:
   - trigger: `push` on `branches: [nakul/hari-kripa]` with `paths-ignore: ['docs/**', '**/*.md']`;
   - one ubuntu job: POST `https://api.github.com/repos/imnakul/Hari-harness/dispatches` with body `{"event_type":"hari-build","client_payload":{"sha":"${{ github.sha }}","subject":<first line of the head commit message, JSON-escaped>}}`, header `Authorization: Bearer $HARI_DISPATCH_TOKEN`;
   - fail with the E-7 message when the secret is empty or the HTTP status is not 204.
7. Records:
   - a `LOCAL-FEATURES.md` row (Hari data copy, path rewrite, periodic update check, dispatch) and its Index line;
   - a changelog entry in the Current file;
   - this spec's row in `docs/specs/SPECS.md`. Mark `repeatable-windows-installer-build.md` as "superseded for releases by Hari CI; still valid for local debug builds".

### Phase 2 — `Hari-harness` (new repo)

```
brand/hari.png                 # 1024² logo (also the splash / favicon)
brand/icons/*                  # generated once: `npx tauri icon brand/hari.png -o brand/icons`, plus installer-sidebar.bmp 164×314 24-bit
brand/updater.pub
scripts/rebrand.mjs            # rules above; Node 24, no dependencies
scripts/brand-guard.mjs
scripts/latest-check.mjs       # verifies latest.json against the release (AC-6)
test/*.test.mjs                # node --test
.github/workflows/build.yml
.github/workflows/self-test.yml  # on push to Hari-harness: node --test
README.md                      # runbook: flow, secrets, rollback (E-9), retry migration, key backup (E-8)
```

`installer-sidebar.bmp`: if no designed file is supplied, generate it once:
- background `#171717`;
- the logo centred at 120 px width;
- 24-bit BMP, using ImageMagick: `magick -size 164x314 xc:#171717 ( brand/hari.png -resize 120x ) -gravity center -composite -type TrueColor BMP3:brand/icons/installer-sidebar.bmp`.

Commit the result. Nakul can replace it later.

`build.yml`:
- triggers: `repository_dispatch` with types `[hari-build]`, and `workflow_dispatch` with input `sha`;
- `env.SHA` comes from either trigger;
- `env.VERSION` is computed in the prepare job and passed on as a job output.

1. `prepare` (ubuntu-latest):
   - check out `imnakul/monocode-clone` at `SHA` (public; no token) into `app/`, and this repo into `harness/`;
   - read X.Y.Z from `app/package.json`, set `VERSION=X.Y.Z-hari.${{ github.run_number }}`, and run the E-11 check;
   - `node harness/scripts/rebrand.mjs app --version $VERSION --pubkey-file harness/brand/updater.pub`, then `brand-guard --stage source app`;
   - `npm ci`, `npx vitest run`, `npx tsc --noEmit`, `npm run test:host`, `npm run build`, then `brand-guard --stage dist app`.
2. `windows` (windows-latest, `needs: prepare`, concurrency `hari-build` cancel true):
   - same checkout and rebrand, with the `VERSION` output;
   - `npm ci`, `dtolnay/rust-toolchain@stable`, `Swatinem/rust-cache@v2` (workspace `app`);
   - `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test`;
   - `npx tauri build --bundles nsis` with the env `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`;
   - `brand-guard --stage artifacts`;
   - upload the installer and `.sig` as a workflow artifact.
3. `publish` (ubuntu-latest, `needs: windows`, concurrency `hari-publish` cancel false, `GH_TOKEN: ${{ secrets.HARI_RELEASES_TOKEN }}`):
   - run the head check (E-4) and the existing-tag check (E-5);
   - `gh release create v$VERSION --repo imnakul/hari-releases --draft --title "Hari $VERSION" --notes "<subject> (monocode-clone@<short sha>)"`;
   - write `latest.json`:
     ```
     { version, notes: <subject>, pub_date: <ISO now>,
       platforms: { "windows-x86_64": { signature: <.sig text>, url: "https://github.com/imnakul/hari-releases/releases/download/v$VERSION/Hari_${VERSION}_x64-setup.exe" } } }
     ```
   - upload the installer, `.sig` and `latest.json` to the draft;
   - `node latest-check.mjs`: download all three from the draft through the API and compare the version, URL and signature;
   - `gh release edit v$VERSION --repo imnakul/hari-releases --draft=false --latest`.

   Writing `latest.json` by hand keeps every step visible and testable. `tauri-action` can also do it: if the implementer prefers it, confirm its `owner`, `repo`, `releaseDraft` and `includeUpdaterJson` inputs against the README of the pinned version, and keep the head check and the verify step.

Never `echo` secrets. Don't use `set -x` in steps that receive them.

## UI details

There is no new UI except:
- the two `MessageBoxW` texts (exact copy in the Data copy section);
- the existing sidebar button `Update to <version>`.

All other brand text comes from R-2.

## Skills to load

`frontend-ui` (for the small `SidebarUpdate` and `main.tsx` changes). No design skill is needed.

## Test matrix

| AC or risk | Level | File | Scenario |
|---|---|---|---|
| AC-2, R-6 | unit | `Hari-harness/test/rebrand.test.mjs` | Fixture tree: every R-2 rule hits, excluded paths untouched, R-4 names and version, R-5 JSON fields (windows array titles), a second run gives an identical tree, a missing brand file fails |
| AC-2/4 guard | unit | `Hari-harness/test/brand-guard.test.mjs` | Planted `MonoCode`, `Mono's Code` or `MONOCODE` text fails; `MONOCODE_HOST_PORT` and `monocode.boardWidth` pass; a dist file named `monocode.png` fails; wrong ProductName fails |
| AC-6 | unit | `Hari-harness/test/latest-check.test.mjs` | A wrong version, URL or signature fails |
| E-11 | unit | same | A lower base version fails |
| AC-3/4/5 | CI | `build.yml` first green run | Full checks on the rebranded tree |
| AC-10/12, I-7 | Rust unit | `brand_migration.rs` tests (temp dirs; inject the env paths and a process-check fn) | Copy plus cache exclusion; WAL file copied; DB TEXT columns rewritten for all three variants; JSON rewritten; old dirs byte-identical after the copy; injected failure leaves no `.migrating` and returns Err; a stale `new*` without a marker is renamed aside; with the marker present, nothing happens; `id == OLD_ID` does nothing |
| AC-11 | Rust unit | same | Injected "MonoCode running" → returns `NeedsClose` (the message box is outside the unit) |
| AC-13 | web unit | `src/app/model/brandMigration.test.ts` | `null` paths → only the flag is set; paths → JSON and plain values rewritten with both slash styles and a different-case drive letter; flag already set → untouched; a throwing store does not throw |
| AC-9 timer | web feature | `src/app/shell/SidebarUpdate.test.ts` (fake timers) | Probes on mount and again after 6 h; no probe while available or downloading; timer cleared on unmount |
| AC-8 | review | `hari-dispatch.yml` | `paths-ignore` present; branch filter exact |

## Verification

- The implementer runs, in `monocode-clone`:
  - `npx tsc --noEmit -p .`
  - `npx vitest run src/app`
  - `cargo test -p monocode brand_migration` (from `src-tauri`)
  - `cargo clippy --workspace --all-targets -- -D warnings`
- In `Hari-harness`: `node --test`.
- Then the first real pipeline run: push `nakul/hari-kripa` and watch all three jobs go green (AC-6). If the publish job is not yet desired, use `workflow_dispatch` on a test sha first.
- Later checks, not by the implementer: the full web suite and build in `monocode-clone` (`npm run check:web`, `npm run build`).

## Manual checks (Nakul, Windows desktop)

- M-1: Close MonoCode. Install `Hari_<v>_x64-setup.exe` from `hari-releases`. The app is named Hari in the Start menu, taskbar, window title, About and installer, with the new icon, splash and favicon.
- M-2: Sessions, settings, appearance, Session Manager board and wallpaper are all present. `%APPDATA%\com.monocode.desktop` is unchanged.
- M-3: Confirm that `%LOCALAPPDATA%\com.nakul.hari\EBWebView` exists. This checks the uncertain WebView2 location fact; if it lives elsewhere, report it before anything else.
- M-4: Push a trivial code change to `nakul/hari-kripa`. After CI is green, restart Hari: the sidebar shows `Update to …-hari.N+1`; click it, and Hari installs in passive mode and relaunches with What's New.
- M-5: Start Hari's first run with MonoCode open: the Retry message appears; close MonoCode, click Retry, and the copy succeeds.
- M-6: Note whether the update in M-4 showed a SmartScreen prompt (E-13).
- M-7: Run MonoCode dev mode (`npm run tauri dev` in `monocode-clone`): no copy prompt, and no update button.

## Facts, decisions, assumptions

**Facts:** everything under Current behavior. GitHub Actions pricing: private repos get 2,000 minutes, and Windows counts double (GitHub billing docs, checked 2026-10-06).

**Decisions:**
- The rebrand runs at build time on a throwaway checkout, not as a maintained renamed copy, so there are no merge conflicts (I-1).
- Internal lowercase identifiers stay (data and agent-protocol safety).
- Releases live in a public `hari-releases` repo. The updater cannot read release files from a private repo without shipping a token inside the app, which would leak it.
- Copy, not move, MonoCode data, and copy before the webview starts.
- `latest.json` is published last, from a draft.
- Versions use `-hari.<run_number>`.
- Rust checks run on Windows, because Hari ships only for Windows and `cfg(windows)` code compiles only there.
- Updates install only on click.
- `bundle.licenseFile` ships the MIT notice.

**Assumptions:**
- WebView2 data is at `%LOCALAPPDATA%\<identifier>\EBWebView` (checked in M-3).
- The NSIS updater artifact for Tauri v2 with `createUpdaterArtifacts: true` is the `setup.exe` plus `setup.exe.sig`. Confirm on the first build. If Tauri emits a different file name, the guard and `latest.json` follow it.
- `monocode-clone` stays public, so checkout needs no token. If it is made private, add a read-only token secret for the checkout.

## Open questions

1. Is a public `hari-releases` repo acceptable? It holds installers only, no source. The alternative is a Cloudflare R2 public bucket, which is also public by URL and adds an account. The default in this spec is `hari-releases`.
2. Identifier `com.nakul.hari`: confirm, because changing it later means another data copy.
3. The parked orchestration feature is also called "Hari" (`ProjectRail.tsx:149`, the specs `hari-current-orchestration-integration.md` and others). Should it be renamed (for example "Kripa") to avoid "Hari" inside Hari? This is not blocking.

## Implementer report format

- Per AC: done / partial / not done, with `file:line` or the test name.
- Deviations from this spec, and why.
- Open questions met during the work.
- Checks run, with the exact commands and results (counts).
- Files changed, per repo.
- Links to the first green `build.yml` run and the first `hari-releases` release, or the reason they don't exist yet.

## Handoff retro

(Filled in after implementation.)
