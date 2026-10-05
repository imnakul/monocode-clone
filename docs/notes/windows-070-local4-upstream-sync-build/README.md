# Windows 0.7.0-local4-upstream-sync build

- Built: 2026-10-05 00:40 IST.
- Branch: `nakul/windows-support-upstream-0.7.0`.
- Source HEAD: `278e2c6` (full: `278e2c64908d14cc52dbcac3b9408457ef01399d`); unchanged during this run. Starting tree was clean: no staged or unstaged files.
- Dirty-source provenance: none; only the requested version metadata was changed before build.
- Version: `0.7.0-local3-upstream-sync` → `0.7.0-local4-upstream-sync`; npm, Cargo workspace/lock and Tauri values all agree. npm version command exit 0; Cargo check regenerated the lock entry.
- Tier: Small, version-only local build. No behavior or tests changed. No commit, push, install, signing or publish.
- SocratiCode: green (12,184 chunks); index/configuration unchanged.

## Installer

- Source: `E:\Developing\OpenSource\mono-clone\target\release\bundle\nsis\MonoCode_0.7.0-local4-upstream-sync_x64-setup.exe`.
- Archive: `E:\Developing\Installable versions\MonoCode_0.7.0-local4-upstream-sync_x64-setup.exe`.
- Size: 11,651,413 bytes. FileVersion and ProductVersion: `0.7.0-local4-upstream-sync`. Authenticode: NotSigned.
- SHA-256: `A02EE80B68B31153F78AD8AE684227AF58C0198CF7E11FBF20130DA045875601`; source/archive hashes and byte counts match. local2/local3 archives remain.

## Checks

| Check | Result | Log |
|---|---|---|
| `npx tsc --noEmit` | Pass, exit 0 | [typecheck.log](typecheck.log) |
| `npm test` | 5,549 passed / 3 failed, exit 1 | [web.log](web.log) |
| CRLF timeout file, isolated once | 4 passed, exit 0; timeout cause unresolved | [crlf-git.log](crlf-git.log) |
| `cargo fmt --check` | Pass, exit 0 | [rust-format.log](rust-format.log) |
| `cargo check` | Pass, exit 0 | [cargo-check.log](cargo-check.log) |
| `npm run build:windows -- --no-sign` | Pass, exit 0; frontend, native release and NSIS | [windows.log](windows.log) |
| Version consistency / `git diff --check` | Pass | — |
| Lint | Unavailable: no configured lint script or configuration | — |
| Rust Clippy/tests | Not run: no Rust source changed since local3 | — |

The two suite failures in `src/features/settings/model/settings.test.ts` (lines 487 and 497) are the documented Windows shortcut expectations (Control instead of Command). The third failure was `FileEditorCrlfGit.test.ts` line 192 timing out at 5 seconds in the full suite; all four tests in that file passed in 4.91 seconds when run once in isolation. The timeout cause remains unresolved, so the full-suite gate is red. No test/source changes were made. Production output retained the existing CSS optimization and large-chunk warnings.

Storage preflight: E: 10.34 GB free and C: 16.41 GB free; E: retained 10.21 GB after packaging/archive. Existing target tree was about 50.84 GB. No disk-full or write-space errors occurred.

## Manual follow-up

- Install the archived build and verify its displayed version, launch and window controls.
- Check existing chats and local provider startup.
- Follow relevant recent feature-spec checklists for this branch.

Desktop verification belongs to Nakul or a separate desktop-access session; it was not automated here.
