# Review — New chat execution default

Branch: `nakul/windows-support-upstream-0.7.0`
Base: `4b8c026`
Created: 2026-10-06
Tier: Medium

## Goal
Replace the new-Claude RC checkbox with a global Local / Remote / Cloud choice.
Show that choice before sending in normal and quick composers. Keep explicit
per-chat choices, native resumes, existing chats, and cloud/local submission isolated.

## Plan
- Migrate the old Claude RC preference without losing enabled defaults.
- Remote defaults apply to Claude; Cloud to eligible Claude/Codex project chats.
  Other providers remain local. Existing cloud validation and environment selection apply.
- Use existing segmented settings and WorkInPicker components.
- Seed new local Claude RC intent without starting a provider process.
- Carry quick-composer explicit RC intent through the existing delivery contract.
- Keep CLI/remote integration research separate: no connector implementation.

## Files
Settings model/UI; provider remote preference and cloud-launch hook; SessionPane;
QuickComposer and its TS/Rust delivery contract; App initialization; tests and records.

## Risks
Defaults must never change a resumed conversation or override explicit Local.
Changing provider/project must not reuse an unrelated draft's cloud selection.
Cloud must never dispatch a local turn. Quick delivery must retain false RC choices.

## Checklist
- [x] Settings migration and selection
- [x] Composer defaults and explicit overrides
- [x] Quick delivery preservation
- [x] Focused tests, TypeScript, Rust formatting/check, full web tests
- [x] Records and manual checklist

## Manual checks
In tauri dev, select each default and open new normal/floating/embedded chats.
Check overrides, provider changes, worktrees, Codex environment input, native resume,
and actual Claude RC/Cloud launch. Native UI checks remain with the user.

## CLI findings
MonoCode already has `monocode app` (models, sessions list/read/send/start and
Session Manager actions) and `monocode control` (orchestrator workers, approvals,
questions, Stop/cancel and wait). `src-tauri/src/control_cli.rs` documents them.
The client accepts only loopback endpoints, using per-agent environment credentials;
`control.rs` gates app actions to active Operator turns and routes requests to the
owning desktop window. It is not an ACP server or persistent phone API.
This can reduce connector work, but external clients still need device pairing,
revocation, event subscription/replay, and session-level controls outside active turns.
No Happier/Sesori integration was implemented in this task.

## Verification
- Focused regressions passed; latest hook/composer checks: 13 tests in 2 files.
- Strict TypeScript passed, including the final draft-persistence changes.
- Final-source production build passed (`npm run build`).
- Rust formatting/check passed. Production delivery contract: 3 tests passed
  in the temporary portable crate; native Windows/macOS panel checks are pending.
- The first full web run overlapped editing and loaded an older settings module
  alongside its new test (missing export). The complete-source rerun passed:
  5,599 tests in 515 files (`/tmp/new-chat-complete-web.log`).
- Source commit: `3c66574e5c9b74f1a55bc770ad506ceafcdb4079`; published to the branch above on 2026-10-06 (IST).

## Issues and fixes
- Previously the first-send default could disagree with the displayed location.
  New Claude drafts now seed saved intent without waking the provider.
- Explicit Local was not separately represented in RC storage. Known choices now
  survive restarts, and old enabled session IDs count as existing choices.
- Discovered conversations initially had no frontend provider ID. The validated
  native ID now travels with their metadata, preventing fresh-chat defaults.
- Named draft Local/Cloud choices survive pane remounts; floating composer choices
  are reset for its next new chat. Explicit quick choices cross both TS/Rust delivery.
- Linux does not compile the macOS/Windows quick composer. Cargo fmt/check passed;
  extracted the production QuickLaunch/QuickAttachment types and included the actual
  delivery module in a temporary offline Rust crate: its three tests passed.
  Native Windows/macOS panel checks remain manual.

## Publication
Nakul requested publication on 2026-10-06. Source `3c66574` is followed by
Antigravity CLI source `d26c9a2`; the combined code was pushed to the fork
and remote-verified at `d26c9a2`. Final pre-commit `npm run check` passed:
5,625 web tests / 518 files, TypeScript, Rust formatting/Clippy, and 615 Rust
tests / 2 ignored. Code contents match the reviewed and previously built
implementation; publication records are documentation only.
No installer or native desktop/provider/phone verification was added.
Log: `/tmp/monocode-publication-20261006-check.log`.
