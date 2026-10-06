# Windows 0.7.0-local5-upstream-sync-fixes build

- Outcome: installer built and archived; full test gates remain red.
- Started: 2026-10-06 09:20 IST.
- Branch: `nakul/windows-support-upstream-0.7.0`.
- Source HEAD: `4b8c026b69c95a9a40a3f4fc53424daae2a4b555`. Working tree was clean at start.
- Source provenance: built against the current committed tree, including commits since the local4 build base `278e2c64908d14cc52dbcac3b9408457ef01399d` (41 changed tracked files, including Rust source in `src-tauri/src/lib.rs` and `src-tauri/src/session_board.rs`). No source edits were made during this build attempt.
- Version: `0.7.0-local4-upstream-sync` → `0.7.0-local5-upstream-sync-fixes`. npm version command exited 0; Cargo check regenerated Cargo.lock. All six package, npm lock/root, Cargo workspace/lock and Tauri version values agree.
- The exact archive destination and per-run record path were unused at preflight. Older installers were left untouched.
- No commit, push, installation, signing or publishing.
- SocratiCode status check: unavailable (Qdrant service unavailable); index was not rebuilt.

## Installer — completed 2026-10-06 09:46 IST

After the blocking results were disclosed, Nakul reiterated the request to build
this exact version. Resumed packaging without changing source/tests or repeating
the version bump. Source HEAD and all version values remained unchanged.

- Archive: `E:\Developing\Installable versions\MonoCode_0.7.0-local5-upstream-sync-fixes_x64-setup.exe`.
- Source: `target/release/bundle/nsis/MonoCode_0.7.0-local5-upstream-sync-fixes_x64-setup.exe`.
- Size: 11,656,960 bytes.
- FileVersion and ProductVersion: `0.7.0-local5-upstream-sync-fixes`.
- Authenticode: NotSigned.
- SHA-256: `B8812F81CF2E90194F7CBB017B4E2D69223FE6E7D6593A83AA3FDBFD30CC054C`.
- Source/archive hashes match; earlier installers preserved.
- Original src-tauri/Cargo.toml bytes restored after confirming Tauri changed only line endings.
- Version consistency and git diff --check pass. No source/dependency changes, commit or push.

## Checks

| Check | Result | Log |
|---|---|---|
| `npx tsc --noEmit` | Pass, exit 0 | [typecheck.log](typecheck.log) |
| `npm test` | 5,583 passed / 2 failed, exit 1 | [web.log](web.log) |
| `cargo fmt --check` | Pass, exit 0 | [rust-format.log](rust-format.log) |
| `cargo check` | Pass, exit 0 | [cargo-check.log](cargo-check.log) |
| `npm run check:rust` | Fail, exit 101; fmt and Clippy passed, Cargo tests 610 passed / 2 failed / 5 ignored | [rust-gates.log](rust-gates.log) |
| Read-only configuration test, isolated once | Fail, 0 passed / 1 failed; cause unresolved | [rust-readonly-isolated.log](rust-readonly-isolated.log) |
| Lint | Unavailable: repository has no configured lint script/configuration | — |
| `npm run build:windows -- --no-sign` | Pass, exit 0; includes production frontend, native release and NSIS | [windows.log](windows.log) |
| Archive verification | Pass: nonempty installer, exact version fields, unsigned, matching source/archive SHA-256 | — |

The web failures are the two previously recorded Windows shortcut assertions in `src/features/settings/model/settings.test.ts` (expected Command, received Control); the runbook permits continuing for those exact failures. In the Rust suite, `mcp::tests::discovers_provider_configs_without_exposing_credentials` found host MCP entries beyond its fixture. This matches the documented Windows test-fixture issue in `docs/WINDOWS-CHANGES.md` (the fixture has no .git boundary). The other Rust failure, `mcp::controls::tests::readonly_configuration_is_reported_without_replacing_it`, failed again in its isolated run. Its test and implementation are unchanged since the local4 build base, but the isolated result’s cause is not established. The runbook requires stopping before packaging for a persistent failure that cannot be attributed. No test or source was changed.

Storage: E: had 8.71 GB free at preflight, 4.37 GB after Rust checks; C: had 24.22 GB initially and 24.05 GB afterward. No disk-full/write-space error occurred. Storage was not the stop condition.

## Initial stop and remaining verification

The initial attempt stopped before packaging; the completed installer above was
produced on resume. The requested version remains in `package.json`,
`package-lock.json`, workspace `Cargo.toml`, generated `Cargo.lock` and
`src-tauri/tauri.conf.json`, uncommitted and unstaged. All original check logs
are retained; no fully green test gate is claimed. Packaging emitted existing
CSS-highlight and large-chunk warnings. At resume E: had 4.61 GB free and C:
25.55 GB; E: had 4.57 GB after packaging. No storage relocation or cleanup.

Manual follow-up for Nakul or a separate desktop session: install and check app
version, launch/window controls, existing chat history/provider startup, recent
UI fixes and MCP enable/disable behavior, especially read-only configurations.
Investigate the unresolved Rust failure separately. No desktop UI automation
or installation was performed.
