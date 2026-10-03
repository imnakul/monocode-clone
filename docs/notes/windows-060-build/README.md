# Windows 0.6.0 build — 2026-10-02 21:21 IST

Branch `nakul/windows-support`, source commit `18ab93466e458effdd86f8147b19e7d824d7e319`.
Only the five version files changed; npm and Cargo regenerated their own lock metadata.
Nakul selected plain 0.6.0 after being told upstream main `6bd432c` is 0.7.0 and 17 upstream commits
are absent here. No merge, commit, push, installation or desktop UI automation performed.

## Artifact

`E:\Developing\Installable versions\MonoCode_0.6.0_x64-setup.exe`

11,446,927 bytes. SHA-256 `D882E9B35CABD9C2D19EB3509311EE677770B51B1DB0DF4FC36B50179DFF50E2`.
Unsigned; archive matches target/release/bundle/nsis original. App FileVersion/ProductVersion are 0.6.0.

## Checks

| Check | Result | Evidence |
|---|---|---|
| `npx tsc --noEmit` | Pass, exit 0 | [typecheck.log](typecheck.log) (empty stdout) |
| `npm run check:web` | Fail: 5,080 passed, 2 failed, 461 files; tsc in this script did not run after Vitest failed | [web-check.log](web-check.log) |
| `npm run check:rust` | Format/Clippy pass; Rust lib tests 574 passed, 1 failed, 5 ignored; later test binaries not reached | [rust-check.log](rust-check.log) |
| `cargo check` at final version | Pass | [cargo-check.log](cargo-check.log) |
| Final-version Clippy, all targets, warnings denied | Pass | [clippy.log](clippy.log) |
| Host build/typecheck and suite | Build passes; initial suite 88 passed, 5 failed, 7 skipped | [host-check.log](host-check.log) |
| Host permission-failure rerun outside sandbox | All 9 tests in affected 3 files pass; aggregate 93 passed / 7 skipped | [host-recheck.log](host-recheck.log) |
| `npm run build:windows -- --no-sign` | Pass, exit 0; includes production frontend build and NSIS packaging | [windows.log](windows.log) |
| Lint | Unavailable: no ESLint config/script; no new tooling installed | Project profile |
| `git diff --check` | Pass | Final diff inspection |

Existing failures left unchanged:
- `settings.test.ts`: lines 487 and 497 assume Command+Shift+Space. Windows defaults to
  Control+Shift+Space in quickComposerShortcut.ts; version metadata cannot affect this.
- `mcp::tests::discovers_provider_configs_without_exposing_credentials`: the test project has no .git
  boundary and sits below the real user home. discover() scans ancestors and finds additional real
  MCP names, so the fixed fixture list mismatches. No runtime or test changes made.

Host permission failures were sandbox-specific SetAccessControl denials on temporary fixtures;
the rerun verified them without changing any test. Existing skipped cases remain unchanged.
Production warnings: two CSS ::highlight optimizer warnings and large chunks.

Storage checked before tests/build: C: 20.19 GB, E: 17.90 GB. After build: C: 12.91 GB, E: 13.20 GB
before the archive copy. No cache/output deletion or storage redirection.

## Manual follow-up

1. Install/reopen and check About reports 0.6.0; old chats, queues and terminal metadata restore.
2. Check Tasks board/Quick Composer and wallpaper/glass settings.
3. Start Claude/Codex/Cline/Antigravity as applicable; check approvals and terminal lifecycle.

Full intake checklist, if needed: [upstream intake manual checks](../../specs/archive/upstream-intake-one-merge.md#manual-checks--separate-follow-up-not-for-the-worker).
