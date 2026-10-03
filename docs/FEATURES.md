# MonoCode feature tracker — T3 parity & gaps

Living document: what T3 Code (HARI reference, `E:\Developing\OpenSource\hari-orchaestrator-t3code`)
does that MonoCode doesn't yet, what was verified as identical, and what is
planned. Reference repo is read-only — borrow ideas, never modify it.

---

## 1. T3 vs MonoCode — no protocol difference (verified 2026-09-04)

I diffed the live wire traffic for the Codex integration while diagnosing the
Windows `codex-code-mode-host` failure, and the two apps speak **byte-identical
protocol**:

- Identical `app-server` spawn: `<binary> app-server`, stdio JSON-RPC, cwd =
  session directory.
- Identical `thread/start` params per mode (`approvalPolicy` +
  `sandbox`: supervised → `untrusted`/`read-only`, auto-accept-edits & auto →
  `on-request`/`workspace-write`, full-access → `never`/`danger-full-access`).
- Identical `turn/start` params (`approvalPolicy`, `sandboxPolicy`,
  optional `model`/`effort`/`serviceTier`).
- Identical `model/list` catalog with cursor pagination.

T3 has **zero** code-mode-host handling (verified by search — no reference to
`code-mode-host`, `plugin-appserver`, or host installation anywhere in
`apps/server/src`). It would fail tool execution on the incomplete
sandbox-bin binary exactly the way MonoCode did; its "works" is
probe/catalog/auth level (initialize, `account/read`, `model/list`,
`skills/list` all succeed without the host — proven live).

**The real T3 gap is only the config surface**, all implementable in MonoCode
with no platform difference (it's just spawn env/args + settings):

| T3 config surface | MonoCode today |
|---|---|
| Multiple provider **instances** (e.g. two Codex accounts) | One instance per harness id |
| Per-instance display name | Fixed `HARNESS_TITLE` |
| Per-instance **environment variables** (API keys, base URLs) | None (inherits GUI env + a few forwarded vars) |
| Per-instance **binary path** | Single global override picker per harness |
| Per-instance **`CODEX_HOME`** path | Forwarded only if present in GUI env |
| **Shadow home** per account (private `auth.json`, symlinked shared state) | None |
| Per-instance **launch arguments** appended after `app-server` | None |
| Per-instance **custom models** (add any slug) | Curated base list + live catalog overlay only |

Related finding: T3's model parser keeps **every** `model/list` row (no
`hidden` filter) and tags non-current slugs legacy via a hardcoded set.
MonoCode dropped `hidden === true` rows; since 2026-09-04 it keeps them with
a ` (legacy)` suffix instead (see `codexCatalog.ts`).

Codex host-binary note (Windows): codex ≥ 0.151 needs
`codex-code-mode-host.exe` **next to `codex.exe`** — all tool execution fails
closed without it (proven live: `echo` never started). The official installer
lays both files side by side; the `.sandbox-bin` copy ships the main exe
only. Stopgap used on this machine: copied the host from
`~/.codex/plugins/.plugin-appserver/` next to the sandbox binary (re-copy
after a codex auto-update if tools break again).

---

## 2. Feature gap tracker

Status: `missing` · `planned` · `in-progress` · `done` · `research-needed`.

| # | Feature | Status | Notes |
|---|---|---|---|
| 1 | Windows integrated terminal (ConPTY) | `implemented, pending in-app check` | `portable-pty` 0.9.0 (MIT), `#[cfg(windows)]` only; unix path untouched. Worktree `mono-clone-term`, branch `feature/windows-terminal`. Gates: `cargo test` 160 pass (+5 new, incl. live ConPTY echo smoke), `vitest` 1091 pass, `tsc`/`fmt`/`clippy` clean, same 13 pre-existing CRLF failures. Left for GUI run: open a terminal tab, resize, kill; parent-process watch for flashing consoles; weigh exe. See §3. |
| 2 | Kanban mode (parallel agents + git worktrees) | `planned` | T3 runs agents in isolated worktrees from its Node server. Ours: spawn per-agent CLI children with `cwd` = worktree + reuse session plumbing. Needs worktree create/cleanup UX. |
| 3 | Connectors (Telegram / Slack / Discord / chat bridges) | `planned` | T3: `cline connect`-style adapters. Ours: CLIs already expose connectors (`cline connect`); needs a settings surface + background hosting story. |
| 4 | Inbuilt browser / preview | `planned` | T3: Electron `WebContentsView` preview. Tauri has no embedded browser view; options: `window.open` popup windows, sidecar webview, or external preview URL + opener. Needs research. |
| 5 | SSH / remote device | `planned` | T3: `@t3tools/ssh` + Tailscale packages. Ours: nothing. Depends on transport decision (Tauri IPC over SSH vs remote backend). |
| 6 | MCP manager | `planned` | CLIs own MCP config (`cline mcp`, codex `config.toml`). Ours: no UI. Read/write CLI config files + re-probe. Per-provider formats differ. |
| 7 | Skills manager | `planned` | Discovery exists (`list_skills`); no create/enable/disable UI. Cline skills dirs (`.cline/skills`) not scanned yet. |
| 8 | WSL backend | `research-needed` | T3 ships a Linux `pty.node` + WSL preflight checks. Ours: out of scope until Windows ConPTY lands and proves the pattern; then evaluate `wsl.exe` + distro detection. |
| 9 | Quota / usage showcase | `done (0.1.35-local4-token-usage)` | ContextMeter segmented bar inspector, System & Tools breakdown, memory/skills breakdown, per-turn & cumulative costing, rate limits countdown with remaining quota % left toggle, and UsageFooter live chip. |
| 10 | Split mode (split-pane / multi-agent view) | `planned` | Session model already supports handoff/second-opinion cards; needs layout + parallel turn orchestration. |
| 11 | Per-instance providers (multi-account) | `planned` | The §1 config surface: instances with own env/binary/`CODEX_HOME`/launch-args/custom-models. Data-model + Providers UI + spawn plumbing change. Do after terminal. |
| 12 | Terminal parity follow-ups | `planned` | `pty_status` foreground-process label on Windows (needs Toolhelp snapshot); shell picker UI (pwsh vs cmd default). |
| 13 | Queue durability & lifecycle holds | `done (0.1.35-local5-queue-durability)` | SQLite migration 12 queue persistence across restarts, QueueDurabilityScheduler with bounded write latency, failure-to-held auto-dispatch barrier, non-native steer cancellation with 15s timeout, and editing locks. |

---

## 3. Windows terminal plan (active work)

- Crate: `portable-pty` 0.9.0 under `[target.'cfg(windows)'.dependencies]`.
  Pure Rust, no C toolchain, no DLLs (ConPTY is in-box since Win10 1809).
- New code is `#[cfg(windows)]` in `src-tauri/src/pty.rs` only: ConPTY
  spawn with shell fallback (`pwsh.exe` → `powershell.exe` → `%ComSpec%` →
  `cmd.exe`), `TERM=xterm-256color`, reader/writer threads reusing the
  existing coalesced `pty-data` emit, `pty-exit` on child wait.
- Documented ConPTY quirks handled: startup `ESC[6n` deadlock (reply
  `ESC[1;1R` post-spawn), `ClosePseudoConsole` teardown order (drop writer →
  drain → background drop, poll instead of blocking wait), shell-appropriate
  flags.
- Reuse: Job Objects + `taskkill /T` cleanup pattern from `harness.rs`,
  `CREATE_NO_WINDOW` discipline (ConPTY is headless; verify with a
  parent-process watch per `docs/notes/windows-provider-stabilization.md` §8).
- Frontend: untouched (same commands/events). `pty_status` keeps returning
  `foreground: None` on Windows.
- Verify: `cargo test -p monocode pty` (new shell-chain unit tests) +
  full `vitest` + `tsc` + live `pwsh echo/resize/kill` smoke with orphan
  watch. Compare `monocode.exe` size before/after.
