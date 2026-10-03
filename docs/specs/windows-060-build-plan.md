# Review — Windows 0.6.0 build

- Worktree: `E:\Developing\OpenSource\mono-clone` (existing integration checkout)
- Branch: `nakul/windows-support`
- Base commit: `18ab93466e458effdd86f8147b19e7d824d7e319`
- Created: 2026-10-02 21:06 IST

## Initial Idea

Build the current Windows integration branch with the exact upstream version incorporated into it.
As the fork owner, Nakul wants an installer containing the existing changes with version 0.6.0.

## Research

Upstream fetched on 2026-10-02: main `6bd432cada0f492f076cc93f7ccb3027f4ff7102` is 0.7.0.
The local branch includes release tag v0.6.0 (`48fe62a`) and upstream pin `43aac9d`.
There are 17 upstream commits absent from this branch, including the 0.7.0 worktree switcher.
The existing app label is `0.6.0-local1-upstream-sync`.
C: free 20.19 GB; E: free 17.90 GB before checks. Checkout, Cargo cache and target use E:;
system TEMP/TMP use C:. Existing dependencies and target outputs are reused.

## Discussion

Nakul explicitly selected `0.6.0` after being told about upstream 0.7.0 and the absent commits.
This overrides the usual local-suffix version rule. The explicit installer request authorizes building
now; manual desktop verification remains a separate follow-up. This is a version/build task on the
requested integration branch, not a new feature requiring a separate worktree.

## Implementation plan

Update the app version in package.json, Cargo.toml and src-tauri/tauri.conf.json.
Regenerate npm and Cargo version metadata with their own tools; preserve dependencies.
Run the web and Rust checks, host checks, and unsigned Windows NSIS production build.
Keep the installer in this checkout's build output, verify its checksum and record results.

Acceptance criteria:
- All five version files (six version fields) say 0.6.0.
- Runtime source and dependencies remain unchanged; no upstream merge, commit or push.
- Check outcomes and limitations are recorded accurately.
- The Windows NSIS installer is produced and its size/hash recorded.

States: pending checks, failed checks, build in progress, built/manual verification pending.
Out of scope: 0.7.0 intake, unrelated fixes, signing, installation, UI automation and publishing.
Open questions: none.

## Todos

- [x] Confirm upstream and version choice.
- [x] Synchronize version metadata.
- [x] Finish automated checks (existing failures documented below).
- [x] Produce and verify installer.
- [x] Update changelog, Windows log and local feature register.

## Issues in Dev (+ fixes)

Full web run: 460 test files passed; settings.test.ts failed two existing assertions that expect
Command+Shift+Space on Windows. quickComposerShortcut.ts correctly defaults to Control+Shift+Space
on Windows. These assertions predate this version task; neither tests nor runtime are changed here.
TypeScript passes. Host build passes. Host suite initially failed five tests on sandbox SetAccessControl;
the three affected files passed outside the sandbox (9/9), giving 93 passed / 7 skipped across the suite.
Rust formatting and initial Clippy pass; cargo check passes at final version 0.6.0. Rust tests:
574 passed / 1 failed / 5 ignored. The MCP discovery test creates a project under system TEMP with
no .git boundary, then discover() walks real ancestor folders and finds user MCP configurations.
This is existing fixture contamination, unrelated to app version; no configuration values were printed.
Final Clippy at version 0.6.0 passes. Production frontend build passes (existing CSS highlight and
large-chunk warnings). Unsigned Windows NSIS build passes. These pre-existing test failures remain explicit build caveats;
no tests were changed, weakened or skipped for this task.
No desktop checks performed by this agent.

## Issues in Installed (+ fixes)

Pending Nakul's manual checks: install/reopen, About says 0.6.0, restored chats/queues/terminals,
Tasks board and Quick Composer, wallpaper/glass and provider start/approval behavior.

## Learnings

A fresh Git fetch revealed upstream 0.7.0, while the web-rendered main/package.json still showed 0.6.0.
Use the fetched commit's manifests for the precise comparison.

## Done

Built 2026-10-02 21:19 IST from HEAD `18ab934` with only five version files modified.
Version changes are uncommitted; no push or upstream merge. Tauri rewrote src-tauri/Cargo.toml line
endings without content changes; its normalized hash was checked against HEAD before restoring it.

- Installer: `E:\Developing\Installable versions\MonoCode_0.6.0_x64-setup.exe`
- Original: `target/release/bundle/nsis/MonoCode_0.6.0_x64-setup.exe`
- Size: 11,446,927 bytes; Authenticode: NotSigned.
- SHA-256: `D882E9B35CABD9C2D19EB3509311EE677770B51B1DB0DF4FC36B50179DFF50E2`
- Archive checksum matches original; existing installers preserved.
- App executable FileVersion and ProductVersion: both 0.6.0.
- Final free space: C: 12.91 GB, E: 13.20 GB (before the 11 MB archive copy).
- [Check results and logs](../notes/windows-060-build/README.md).

Build delivered; status Review because desktop verification and existing test failures remain.
