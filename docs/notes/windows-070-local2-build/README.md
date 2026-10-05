# Windows 0.7.0 local2 build

- Request: build a new version from the current branch, following AGENTS.md.
- Branch: `nakul/windows-support-upstream-0.7.0`.
- Source HEAD: `728ab243b9490c89eee3564ca40bb96c6d16fd27`.
- Version: `0.7.0-local2-upstream-sync` (assumed next local build counter).
- Scope: version metadata and this build record; no feature changes, commit, push, installation or signing.
- Tier: Small; no feature spec or local-feature row needed.
- Built: 2026-10-04 23:15 IST.

## Installer

Archive: `E:\Developing\Installable versions\MonoCode_0.7.0-local2-upstream-sync_x64-setup.exe`.
Source: `target/release/bundle/nsis/MonoCode_0.7.0-local2-upstream-sync_x64-setup.exe`.
Size: 11,650,418 bytes. FileVersion and ProductVersion both report
`0.7.0-local2-upstream-sync`. Authenticode: NotSigned.
SHA-256: `6A2F2FB153E5A316D62A583E2AC0475E33E25D1B1870CBD60C12C2605711FB6D`.
Archive/source hashes match. Earlier installers were preserved.

## Version changes

`npm version 0.7.0-local2-upstream-sync --no-git-tag-version --ignore-scripts`
updated package.json and regenerated npm lock metadata. Cargo.toml and
src-tauri/tauri.conf.json received the matching version; `cargo check`
regenerated Cargo.lock. The existing set-version script accepts plain versions
only, so it was left unchanged. The original bytes of src-tauri/Cargo.toml
were backed up under .git/local-build-backup before Tauri ran.
After building, those exact original bytes were restored; its pre-existing
Git modified status remains unchanged, with no content diff.

## Checks

| Check | Result | Log |
|---|---|---|
| `npx tsc --noEmit` | Pass | [typecheck.log](typecheck.log) |
| `npm run check:web` | 5,545 passed; 2 existing Windows shortcut failures; its chained tsc did not run | [web.log](web.log) |
| `cargo fmt --check` | Pass | [rust-format.log](rust-format.log) |
| `cargo check` | Pass | [cargo-check.log](cargo-check.log) |
| `npm run build:windows -- --no-sign` | Pass, exit 0; frontend, native release and NSIS bundle | [windows.log](windows.log) |
| `git diff --check` | Pass | — |
| Lint | Unavailable: no repository lint configuration/script | — |
| Rust tests / Clippy | Not rerun: no Rust source changes in this build task | — |

The two failures are settings.test.ts lines 487 and 497, which expect
Command+Shift+Space on Windows, where Control+Shift+Space is the default.
They match the pre-existing failures recorded in docs/WINDOWS-CHANGES.md
under "Windows 0.6.0 installer". No tests were changed or weakened.
The build retains the existing CSS-highlight and large-chunk warnings.
The installer was produced at the user's request; the full test gate remains
red for the documented unrelated failures. No desktop verification is claimed.

## Manual follow-up

- Install the archived installer and verify the version in the app.
- Check launch, window controls, existing chat history and local provider startup.
- Verify recent Cloud/Claude Remote Control, provider paging, custom schedules
  and Operator Off/re-enable behaviors using their existing spec checklists.

Desktop checks remain with Nakul or a separate desktop-access session;
no UI automation was performed.
