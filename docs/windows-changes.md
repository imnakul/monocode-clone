# Windows changes tracker

> **Why this file exists:** this branch carries Windows-only work on top of
> upstream MonoCode. When merging `main` into this branch (or rebasing onto
> it), use this file as the checklist so no Windows fix is silently lost to
> an upstream refactor. Every entry names the files, the Windows-only
> reason, and what a merge must preserve. Deep technical detail lives in
> `docs/windows-provider-stabilization.md` (§1–§11); this file is the
> merge-time index.

## Merge playbook (read before resolving conflicts)

1. The files below are the **entire Windows surface**. If a merge conflict
   touches any other file, it is almost certainly safe to take upstream.
2. If a conflict touches a listed file, keep the **Windows behavior**
   described in its entry, and re-apply it onto upstream's new structure
   rather than accepting either side wholesale.
3. After merging, run the **verification checklist** at the bottom. The two
   cheapest tripwires: `npx tsc --noEmit` + `cargo test -p monocode harness`
   (both must pass), and grep for `C:\Users\` in `src/` + `index.html`
   (must return nothing).
4. Never reintroduce: hardcoded usernames/paths, `.codex\.sandbox-bin` as a
   Codex source, frontend path-string availability, visible helper consoles,
   PTY spawn retries on Windows.

## Changelog

### 2026-09 — Windows provider stabilization (Codex/Claude/OpenCode/Antigravity)

| Area | Files | What changed | Windows-only reason |
|---|---|---|---|
| Machine-specific defaults removed | `src/lib/harness/customBinary.ts`, `index.html` | Deleted `DEFAULT_WINDOWS_BINARIES` (`C:\Users\gclna\…` for agy/codex/claude/opencode) and the `index.html` boot script that re-seeded them into `localStorage` | Hardcoded usernames break every other user; overrides must be user-chosen only |
| Backend-owned resolution | `src-tauri/src/harness.rs` (`resolve_codex/claude/opencode/antigravity`, `resolve_requested_binary`), `src/lib/harness/child.ts` | PATH (+User/Machine registry PATH) + `PATHEXT` + dynamic known-dirs discovery; frontend forwards overrides, backend validates | GUI apps inherit stale PATHs; npm shims (`.cmd`) need extension-aware lookup |
| Real health probes | `src-tauri/src/harness.rs` (`harness_probe_provider`, `probe_provider_binary`), `src-tauri/src/lib.rs` (registration), `src/lib/harness/availability.ts` | Availability = resolve + `--version` + per-provider protocol markers; a saved path alone no longer means installed | Stale/copied binaries (e.g. sandbox `codex.exe`) must fail closed |
| Safe shim spawning | `src-tauri/src/harness.rs` (`windows_launcher_kind`, `new_provider_command`, `escape_windows_shell_arg`) | `.exe` direct; `.cmd`/`.bat` via `cmd.exe /D /S /C` with escaped args; `.ps1` avoided/deferred | npm/pnpm shims are not native exes; naive concat = shell injection |
| GUI env reconstruction | `src-tauri/src/harness.rs` (`windows_gui_search_path`, `apply_gui_env`, `prepare_child`) | Merged PATH/PATHEXT/HOME + provider auth/config vars (`CLAUDE_CONFIG_DIR`, `CODEX_HOME`, …) into every spawn | Desktop-launched apps miss terminal env (auth, version managers) |
| Process lifecycle | `src-tauri/src/harness.rs` (`WindowsJob` + `KILL_ON_JOB_CLOSE`, `taskkill /T` + `/F` escalation, `windows_process_alive`) | Job Objects + tree-kill + real aliveness checks replace Unix signals | Unix `kill`/process-groups do not exist on Windows |
| Antigravity adapter | `src/lib/harness/antigravity.ts`, `antigravityProtocol.ts`, `antigravityCatalog.ts`, `antigravityProtocol.test.ts` | Replaced `agy --prompt` scraping with stream-json headless (`--input-format/--output-format stream-json`, NDJSON stdin, `init`/`step_update`/`result`, `--conversation` resume, `--dangerously-skip-permissions` for Full Access, honest no-approval errors) | Old mode had no resume/streaming/usage and faked approvals |
| Deps | `src-tauri/Cargo.toml`, `Cargo.lock` | `winreg`, `windows-sys` (JobObjects/Threading/Foundation) under `[target.'cfg(windows)'.dependencies]` | Registry + Job Object APIs |

**Merge notes:** upstream refactors to `harness.rs` resolver/probe/spawn functions must keep the `#[cfg(windows)]` branches and the probe markers; an upstream rewrite of `availability.ts` must not restore path-string availability; `customBinary.ts` must never regain defaults.

### 2026-09 — TerminalView Windows hot loop (fixed)

| Area | Files | What changed | Windows-only reason |
|---|---|---|---|
| No-retry latch | `src/surfaces/TerminalView.tsx`, `src/lib/pty.ts` (`PTY_SUPPORTED`, `PTY_UNSUPPORTED_MESSAGE`, `markUnsupportedNotified`), `src/lib/pty.test.ts` | `pty_spawn` always fails on Windows, and each failure's error line re-rendered, re-triggering `applySize` via `onRender` → infinite loop. Now: `dead` latch, notice written once per terminal per launch, zero backend invokes, no input-forwarding/meta-poll when dead. Unix retry behavior untouched | Upstream PTY is macOS/Linux-only (`ConPTY` is a documented future, not this change) |

**Merge notes:** upstream changes to `TerminalView` effect flow must preserve the `dead.current` early-return in `applySize` and the write-once mount. `PTY_UNSUPPORTED_MESSAGE` must stay identical to the `pty.rs` rejection strings (a test pins this).

### 2026-09 — Hidden helper consoles (fixed)

| Area | Files | What changed | Windows-only reason |
|---|---|---|---|
| One flag for all spawns | `src-tauri/src/harness.rs` (`hide_console_window`, wired into `isolate_child`), `src-tauri/src/fs.rs` (8 sites: `git_ls_files`, `git_hash_object`, `gh_run`, `git_checked`, `git_output`, `git_branch_name`, `git_stdout`, `git clone`), `src-tauri/src/search.rs` (`git_grep`) | Every non-interactive backend spawn sets `CREATE_NO_WINDOW`. Previously only `harness.rs` did; git/gh helpers (2s Changes-panel polling, per-keystroke search, explorer listing) each opened a visible, focus-stealing console | Console-subsystem exes get a window by default on Windows; invisible on macOS/Linux so upstream never needed the flag |

**Merge notes:** any NEW `Command::new` upstream adds to `fs.rs`/`search.rs`/`checkpoint.rs`/`session_store.rs` must also call `hide_console_window` (or `isolate_child` for harness children). Rule: no `Command` without one of the two, unless the window is intentional (`open`/`explorer`/`xdg-open`, macOS `security`, unix `ps`/`sh` stay as-is). Test-only `Command`s (`#[cfg(test)]` mods) are exempt.

## Invariants (must survive every merge)

1. No `C:\Users\<name>` or machine-specific path literals in `src/` or `index.html`.
2. No `.codex\.sandbox-bin`, no MSIX-internal `codex.exe` in resolution paths.
3. Availability derives from `harness_probe_provider`, never from a stored string.
4. Every Windows `Command` is hidden (`hide_console_window`) or supervised (`isolate_child`); `.cmd`/`.bat` go through escaped shell mode.
5. `TerminalView` never retries PTY spawns on Windows; unsupported notice prints at most once per terminal per launch.
6. Antigravity uses stream-json headless; Full Access maps to `--dangerously-skip-permissions`; no fake approval UI.

## Verification checklist (post-merge)

- [ ] `grep -rn "gclna\|sandbox-bin" src/ index.html` → only comments/docs, no defaults
- [ ] `npx tsc --noEmit` clean; `npx vitest run src/lib/harness src/lib/pty.test.ts` green
- [ ] `cargo fmt --check` clean; `cargo check -p monocode` no errors; `cargo test -p monocode harness` green
- [ ] Known pre-existing failures unchanged: 13 CRLF unit tests (`checkpoint`/`fs`/`skills`), `clippy -D warnings` hits in `pty.rs`/unix-only items (see stabilization doc §5/§7)
- [ ] Manual: Providers page shows real health; terminal tab prints one notice; git-heavy use shows zero visible consoles
