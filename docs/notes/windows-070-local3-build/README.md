# Windows 0.7.0 local3 build

- Request: build a new version on the current branch following AGENTS.md.
- Branch: `nakul/windows-support-upstream-0.7.0`.
- Source HEAD: `728ab243b9490c89eee3564ca40bb96c6d16fd27`, unchanged since local2.
- Version: `0.7.0-local3-upstream-sync`, the assumed next local counter.
- Tier: Small; version metadata and build records only, no feature changes.
- No commit, push, installation, signing or desktop UI automation.
- SocratiCode index status: green; configuration preserved.

## Installer

Built 2026-10-04 23:20 IST. Archive:
`E:\Developing\Installable versions\MonoCode_0.7.0-local3-upstream-sync_x64-setup.exe`.
Source: `target/release/bundle/nsis/MonoCode_0.7.0-local3-upstream-sync_x64-setup.exe`.
Size: 11,651,023 bytes. FileVersion and ProductVersion:
`0.7.0-local3-upstream-sync`. Authenticode: NotSigned.
SHA-256: `81D440C1405F3DAF8383585FAF8B7A460EE04B40F21D2781768B8480083C38A5`.
Source and archive hashes match. Earlier installers remain preserved.

## Version metadata

`npm version 0.7.0-local3-upstream-sync --no-git-tag-version --ignore-scripts`
updated package.json and regenerated npm lock metadata. Cargo.toml and
src-tauri/tauri.conf.json received the same version; cargo check regenerated
Cargo.lock. The plain-version-only set-version script was left unchanged.
The pre-existing src-tauri/Cargo.toml bytes were backed up in
.git/local3-build-backup before packaging.
Their exact original bytes were restored after Tauri completed.

## Checks

| Check | Result | Log |
|---|---|---|
| `npx tsc --noEmit` | Pass | [typecheck.log](typecheck.log) |
| `npm run check:web` | 5,544 passed / 3 failed across 511 files; chained tsc did not run | [web.log](web.log) |
| `npx vitest run src/features/files/ui/FileEditorCrlfGit.test.ts` | All 4 pass, including the test that timed out in the full suite | [crlf-git.log](crlf-git.log) |
| `cargo fmt --check` | Pass | [rust-format.log](rust-format.log) |
| `cargo check` | Pass | [cargo-check.log](cargo-check.log) |
| `npm run build:windows -- --no-sign` | Pass, exit 0; production frontend, native release and NSIS | [windows.log](windows.log) |
| Version consistency / `git diff --check` | Pass | — |
| Lint | Unavailable: no repository lint script/configuration | — |
| Rust tests / Clippy | Not rerun: no Rust source changes | — |

Two failures are the documented Windows shortcut expectations in
settings.test.ts lines 487 and 497 (Command instead of Control). The third
was FileEditorCrlfGit.test.ts line 176 reaching its 5-second timeout in the
full suite. It completed in 825 ms in isolation, with no test or source
changes. Its timeout cause is unresolved; this does not make the original
full-suite gate green. Existing CSS-highlight and large-chunk build warnings
remain. No tests were modified or weakened.

## Manual follow-up

- Install the archived build and verify the app version, launch and window controls.
- Check existing chat history and local provider startup.
- Follow existing specs for Cloud/Claude Remote Control, provider paging,
  custom schedules and Operator Off/re-enable.

Desktop verification belongs to Nakul or a separate desktop-access session.
