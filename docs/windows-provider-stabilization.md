# Windows provider stabilization — Codex / Claude / OpenCode / Antigravity

This document records the full Windows port/stabilization work on MonoCode's
provider layer: what the earlier agent implemented, what was verified and
finished afterwards, and how to test each provider today.

Working repo: `E:\Developing\OpenSource\mono-clone`
Reference only (never modified): `E:\Developing\OpenSource\hari-orchaestrator-t3code`
(T3/HARI fork — lent the Windows resolver, spawn, and Antigravity ideas.)

---

## 1. Goal (and non-goals)

**Goal:** one GUI app where the user's existing CLI subscriptions work
directly — install the provider CLI normally, log in normally, open MonoCode,
and have it discover and use the CLI. No manual binary picking in the normal
case; no breakage on ordinary CLI upgrades.

**Non-goals (deliberately not done):** no future orchestrator, no redesign of
the app, no single-SDK migration, no ConPTY/integrated-terminal work, no
bundling of provider CLIs, no Tauri sidecars.

---

## 2. What was broken before

1. `src/lib/harness/customBinary.ts` shipped machine-specific defaults
   (`C:\Users\gclna\...`) for all four providers — including the broken
   `~\.codex\.sandbox-bin\codex.exe` fallback, which failed at runtime with
   `failed to spawn code-mode host` (missing `codex-code-mode-host.exe`).
   A second copy of the same defaults lived in `index.html`, seeding them
   into `localStorage` on every non-Mac launch.
2. `src/lib/harness/availability.ts` treated a saved path string as
   "available" (`if (getCustomBinary(id)) return available`) — no real check.
3. Antigravity ran as `agy --prompt "..."` with stdout scraped as the answer
   — no conversation resume, no streaming, no usage, fake no-op approvals.
4. Process lifecycle was Unix-oriented (process groups/signals); Windows
   cleanup was incomplete.
5. npm shims (`opencode.cmd`) had no principled spawn path.

---

## 3. Implementation in code

### 3.1 Central Windows resolver (Rust backend)

File: `src-tauri/src/harness.rs`

- `resolve_requested_binary` (:285) — single choke point. An explicit user
  override is honored **only** if it is a launchable file
  (`is_executable_file`); otherwise it errors instead of silently falling
  back. Empty override falls through to automatic resolution.
- Per-provider resolvers: `resolve_codex` (:1859), `resolve_opencode`
  (:1930), `resolve_claude` (:1981), `resolve_antigravity` (:2140).
  Order everywhere: explicit override → merged GUI PATH → dynamic known
  install dirs → provider-specific fallbacks. Nothing contains a username;
  all user paths derive from `USERPROFILE`/`APPDATA`/`LOCALAPPDATA`/`HOME`.
- `gui_search_path` (:2647) / `windows_gui_search_path` (:2714) — rebuilds
  the PATH a terminal would see: inherited `PATH` + PowerShell-probed values
  + Windows **User** PATH (registry `HKCU\Environment`) + known CLI dirs
  (`%APPDATA%\npm`, Volta, pnpm, Bun, Scoop, Cargo, …) + Windows **Machine**
  PATH. Deduped, quote-tolerant, `;`-split.
- `which_in_path` (:2582) + `windows_command_candidates` — bare names like
  `opencode` expand per `PATHEXT` (`.EXE`/`.CMD`/`.BAT`/…,
  case-insensitive), so npm shims resolve without hardcoding extensions.
  `.ps1` is not a PATHEXT candidate, so the PowerShell shim is naturally
  avoided in favour of `.cmd`/`.exe`.
- Codex specifics: `~\.codex\.sandbox-bin\codex.exe` is **never** a
  candidate; the MSIX/Store app's internal `codex.exe` is **never** used
  (package-protected — Windows returns `Access is denied` — and it lacks its
  companion host). Preferred: real standalone CLI
  (`%LOCALAPPDATA%\Programs\OpenAI\Codex\bin\codex.exe`, PATH, npm shim).
  Correctness is enforced by the probe below, not by filename.

### 3.2 Backend probe — availability is earned, not assumed

- `harness_probe_provider` (`harness.rs:442`, registered in
  `src-tauri/src/lib.rs`) resolves **and** probes: `--version` must run, plus
  a protocol marker check per provider (`probe_provider_binary`, :902):
  - Codex: `app-server --help` must mention `app-server`
  - Claude: `--help` must mention `--input-format`/`--output-format`/`stream-json`
  - OpenCode: `serve --help` must mention `serve`/`--hostname`/`--port`
  - Antigravity: `--help` must mention `--input-format`/`--output-format`/`stream-json`
- Other providers (cursor/pi/omp/fx/grok) resolve but skip the version
  probe (`Ok(None)`), preserving their existing behavior.
- Model-catalog one-shots stay allow-listed in `EXEC_ALLOWED_ARGS`
  (`models`, `models --output-format json`, `--output-format json models`, …),
  and `harness_exec` still refuses anything that isn't a backend-resolved
  binary.

### 3.3 Safe Windows spawning

- `windows_launcher_kind` (:1014 approx.) classifies `Native` (.exe),
  `CmdShim` (.cmd/.bat), `PowerShellShim` (.ps1) — mirroring T3's
  `resolveSpawnCommand`.
- `new_provider_command` (Windows variant, :1113): `.exe` spawns directly;
  `.cmd`/`.bat` go through `cmd.exe /D /S /C` with per-argument escaping
  (`escape_windows_shell_arg`) that survives both `cmd.exe` metacharacters
  (`& | < > ^ % ! …`) and `CommandLineToArgvW` quoting. No shell-string
  concatenation of untrusted input. `.ps1` launches via an explicit
  `-NoProfile -NonInteractive -File` PowerShell host (last resort).
- Every spawn (including probes) passes `prepare_child` → `apply_gui_env`
  (:2768/:2789): repaired `PATH`/`PATHEXT`, `HOME` fallback, plus
  provider-specific forwarding (`CLAUDE_CONFIG_DIR`, `CODEX_HOME`,
  API-key vars) read from the login-shell/PowerShell environment cache.

### 3.4 Windows process lifecycle

- Each child is attached to a Windows **Job Object** with
  `KILL_ON_JOB_CLOSE` (`WindowsJob`, :74) — app exit can't strand providers.
- Stop/kill uses `taskkill /PID <pid> /T`, escalating to `/F` after a grace
  period (`signal_tree`, :1460); aliveness is a real
  `OpenProcess` + `GetExitCodeProcess` check (`windows_process_alive`,
  :1500), not `kill(pid, 0)`.
- Unix behavior (process groups, `reap_orphaned_harness_processes`) is
  untouched.

### 3.5 Frontend: override-only picker + honest availability

- `src/lib/harness/customBinary.ts` — `DEFAULT_WINDOWS_BINARIES` deleted.
  `getCustomBinary` returns the user's explicit choice or `null`. Never a
  default.
- `src/lib/harness/child.ts` — all `resolve*Binary` helpers forward
  `overridePath` to the backend instead of short-circuiting locally; new
  `probeHarnessBinary` (`:291`) calls `harness_probe_provider`.
- `src/lib/harness/availability.ts` — `probeHarnessAvailability` (`:84`)
  probes every live harness through the backend (30s TTL, `force` bypass).
  A saved path alone no longer means "installed".
- `src/surfaces/SettingsView.tsx` (`ProvidersPage` ~:1250, `ProviderRow`
  ~:1307) — row per provider: installed state + model count **or** an install
  hint (`harnessUnavailableHint`), `Choose binary…` override with `Reset`
  back to auto-detection, model dropdown, `Use by default`, `Show in picker`
  toggle. Changing/clearing the binary force-reprobes.
- `index.html` — removed the boot script that re-seeded the four `gclna`
  paths into `localStorage` (missed by the first pass, caught on verify).

### 3.6 Antigravity: real headless adapter (was `--prompt` scraping)

Reference: HARI `AgyProcess.ts` / `AgyProtocol.ts` / `AgyAdapter.ts`.

- `src/lib/harness/antigravityProtocol.ts` — `buildAgyArgs` (`--input-format
  stream-json --output-format stream-json [--model …] [--effort low|medium|high]
  [--conversation …] [--dangerously-skip-permissions]`), `makeAgyUserInput`
  (NDJSON `{"event":"user","message":{"content":"…"}}`), `parseAgyStream`
  (`init`/`step_update`/`result`, deltas, usage, errors), `parseAgyToolUpdate`
  (tool vs subagent), `parseAgyModels` (JSON envelope **and** legacy TSV/text,
  never mistaking the envelope for a model id), `getAgyEffort`.
- `src/lib/harness/antigravity.ts` — per-thread session with conversation-id
  resume (`bindAntigravitySession`), streaming `message.delta` events,
  `tool.started`/`tool.updated`, `context` usage, `session.providerBound`,
  init timeout with honest diagnostics, clean per-turn exit handling.
  Full Access maps to `--dangerously-skip-permissions`; restricted-mode
  permission failures surface the CLI's error plus a "retry in Full Access"
  hint. Approvals/steering/attachments explicitly throw or no-op **honestly**
  — headless AGY has no interactive approval surface, matching HARI.
- `src/lib/harness/antigravityCatalog.ts` — model discovery tries
  `--output-format json models` → `models --output-format json` → `models`,
  first non-empty result wins.

### 3.7 What was intentionally left alone

Codex `app-server` JSON-RPC transport, Claude structured-CLI transport (no
Agent-SDK migration), OpenCode `serve` + HTTP/events client, all
non-target providers' adapters, macOS/Linux resolution paths.

---

## 4. Things kept in mind (decisions & tradeoffs)

1. **Transports stay provider-specific** (Codex app-server / Claude
   stream-json CLI / OpenCode local server / AGY stream-json). Only the
   executable + environment + process layer is shared.
2. **Backend is authoritative.** The frontend never declares health; it only
   renders what `harness_probe_provider` reports.
3. **Override ≠ healthy.** A manual binary still has to pass the probe to
   show as installed.
4. **Durability over cleverness:** PATH/PATHEXT/registry-derived discovery
   survives upgrades; pointing at internal helper exes (sandbox-bin, MSIX
   resources) does not — so those are excluded even when present.
5. **No fake capabilities.** Unsupported AGY interactivity fails with a clear
   message instead of a dead approval button.
6. **Don't strand processes:** Job Objects + tree-kill + escalation, and
   probes are spawned through the same supervised path so hung `--help`
   calls are reaped too.
7. **Don't regress macOS/Linux:** all Windows code is `#[cfg(windows)]`;
   Unix paths/tests untouched.
8. **Migrate safely:** new resolver was built and routed per-provider before
   old defaults were deleted (index.html seeder was the one leftover).

---

## 5. Tests

### 5.1 Rust unit tests — `src-tauri/src/harness.rs`

Run: `cargo test -p monocode harness` (from `src-tauri/`).

| Suite | Covers | Result |
|---|---|---|
| `windows_spawn_tests` (13) | launcher classification (+case-insensitive `.BAT`/`.EXE`/`.PS1`), PATHEXT candidate expansion, `;`-splitting, quoted dirs, dirs with spaces, first-hit precedence, duplicate/empty segments, unknown binary → `None`, shim accept vs `.txt` reject, path-value dedup/unquote, shell escaping (spaces, `&`, `\|`, quotes), `cmd.exe` routing for shims, override valid/invalid/empty, known-dirs-derived-from-env, merged search path | 13/13 pass |
| `exec_allowlist_tests` (2) | catalog arg allow-list incl. all three AGY model forms; rejects `--help`, `-c id`, extras | pass |
| `reap_logic_tests` + misc harness tests | orphan-marker parsing, reap decisions, spawn-stamp races, `which_in_path`, GUI path order | pass |

Full `cargo test -p monocode`: 155 pass, **13 fail — all pre-existing
Windows CRLF failures** in `checkpoint`/`fs`/`skills`
(`"beta\r\n"` vs `"beta\n"`), unrelated to providers.
`cargo check -p monocode` is clean (only pre-existing warnings).

### 5.2 TypeScript tests — `src/lib/harness/`

Run: `npx vitest run src/lib/harness` · Typecheck: `npx tsc --noEmit`.

Result: **20 files, 233 tests, all pass**; `tsc` clean.
(No `eslint.config.*` exists in the repo, so ESLint cannot run — pre-existing.)

Antigravity coverage (`antigravityProtocol.test.ts`, 11 tests): model mapping
+ sort order, JSON vs TSV catalogs, installed-CLI command envelope (not
mistaken for a model id), error envelope → `[]`, arg building incl.
full-access flag and bad-effort omission, effort from model settings, NDJSON
input shape, nested `init`/`step_update`/`result` events, whitespace-only
delta preservation, usage fields, permission-error parsing, resume cursors,
tool/subagent updates, non-JSON ignored.

### 5.3 Live smoke tests (this Windows machine, 2026-09-03)

Safe temp workspaces only; nothing committed. `where.exe` baseline: `claude`
→ `.local\bin\claude.exe`; `codex` → **not found**; `opencode` →
`npm\opencode` + `opencode.cmd` (+`opencode.ps1` via PowerShell, avoided by
design); `agy` → `Local\agy\bin\agy.EXE`.

| Provider | Command | Result |
|---|---|---|
| Claude | `claude.exe --version` / `--help` | 2.1.258; stream-json markers present |
| Claude | `--print --output-format stream-json --verbose --input-format stream-json --include-partial-messages` + `{"type":"user",…}` | Emits `system/init` + `result` correctly. Result payload: **OAuth session expired** — transport works, machine needs `claude login` |
| Codex | PATH / `%LOCALAPPDATA%\Programs\OpenAI\Codex\bin` / npm lookups | No standalone CLI (only MSIX `OpenAI.Codex_26.825.6671.0`, intentionally unused) → resolver honestly reports not-found |
| OpenCode | `cmd /D /S /C '"…\opencode.cmd" --version'` | 1.18.25 — proves the `.cmd`-via-`cmd.exe` path |
| OpenCode | `opencode.cmd serve --hostname=127.0.0.1 --port=18769`, then `GET /session` | **200** with session JSON; server log `listening on http://127.0.0.1:18769`; no orphan afterwards |
| Antigravity | `agy.EXE --version` / `--help` | 1.1.25; stream-json + `--conversation` + `--dangerously-skip-permissions` present |
| Antigravity | `--input-format stream-json --output-format stream-json` + `{"event":"user",…OK…}` | `init` → `step_update` deltas (`OK`) → `result SUCCESS "OK\n"` in ~4s |

---

## 6. Plain-language guide — what can you test by hand today?

### 6.1 How each provider talks (simple version)

| Provider | How MonoCode talks to it | Plain English |
|---|---|---|
| **Codex** | `codex app-server` over JSON-RPC | A permanent background helper both sides chat with in structured messages. Not copy-pasted terminal text. |
| **Claude** | `claude` CLI with `--output-format stream-json --verbose --input-format stream-json` | MonoCode sends your message as structured JSON and reads back a stream of JSON events (text pieces, tool calls, final answer). Not the Agent SDK — the CLI you already installed. |
| **OpenCode** | `opencode serve` (local web server) + HTTP | MonoCode starts a tiny server on your own machine (`127.0.0.1`, random free port) and talks to it like a website that only your PC can reach. |
| **Antigravity** | `agy` CLI with `--input-format stream-json --output-format stream-json` | Same idea as Claude: one message in as a JSON line, a stream of JSON lines back (`init`, progress updates, final `result`). The old `--prompt "..."` mode that just scraped text is gone. |

### 6.2 What is ready for manual testing

- **Antigravity — ready.** Install/login `agy` normally, open MonoCode →
  it appears as installed. Chat, watch streaming + tool activity, start a
  second message in the same thread (it resumes the conversation). For
  anything that touches files/commands, use **Full Access** (maps to
  `--dangerously-skip-permissions`); in normal mode a permission error tells
  you to retry in Full Access instead of hanging on a fake approval popup.
- **OpenCode — ready.** Install via npm/Setup normally (`opencode auth
  login`), open MonoCode → installed. Chat works through the local server.
  The `.cmd` shim case (the common npm-on-Windows install) is handled.
- **Claude — ready in code, blocked on login on this PC.** The integration
  works (probe passes, structured events flow), but this machine's OAuth
  token is expired, so answers come back as "OAuth session expired". Run
  `claude login` (or set your key) and it will work.
- **Codex — waiting on an install.** There is no standalone Codex CLI on
  this machine (only the Windows Store app, which Windows does not let
  outside programs use). Install it with the official Codex installer, run
  `codex login`, restart MonoCode → it will be discovered automatically.
  This is honest behavior: previously the app pointed at an internal helper
  that crashed; now it says "not found" instead of crashing.

### 6.3 How to test manually in the GUI (no code needed)

1. Open MonoCode → **Settings → Providers**. Each row shows either
   `N models available` (working) or an install hint (not found).
2. If a row says installed, go to the chat **model picker**, pick that
   provider's model, and send `Reply exactly with OK.` — the simplest
   end-to-end check for every provider.
3. Advanced override only: `Choose binary…` lets you point at a custom exe
   (nightly build, second install). It still has to pass validation, and
   `Reset` returns to auto-detection. You should never need this normally.
4. If you install a CLI while MonoCode is open, change/clear a binary, or
   just want a fresh answer, the Providers page re-probes (also automatic
   roughly every 30 seconds).

### 6.4 Are the tests in the GUI, or do they run via code?

**The automated tests are code-only — there is no "Run tests" button in the
GUI, and that is on purpose:**

- `cargo test` / `npx vitest run` / `npx tsc --noEmit` are **developer
  checks**: they verify parsers, argument builders, resolver rules, and
  escaping without spending API quota or needing logins. Run them after
  changing provider code.
- What the GUI *does* have is a **live health check**, not the test suite:
  opening the Providers page or model picker calls `probeHarnessAvailability`
  → backend `harness_probe_provider` → real `--version`/protocol probe of
  each CLI on *your* machine. That is what decides "installed" in the UI.
- So: **manual testing = use the GUI** (pick provider, chat); **regression
  testing = run the commands** in §5.1–5.2 after code changes. The two are
  complementary, not duplicates.

---

## 7. Remaining known issues / follow-ups

1. `claude login` needed on this machine (OAuth expired).
2. Codex needs the standalone CLI installed (Store app alone is not usable).
3. 13 pre-existing Rust test failures from Windows CRLF handling
   (`checkpoint`/`fs`/`skills`) — outside provider scope.
4. No `eslint.config.*` in repo — lint step from the original plan cannot run.
5. Nice-to-have, not required: validate Codex companion binaries explicitly
   (currently covered indirectly by the `app-server --help` probe);
   richer per-provider auth states in the UI (installed vs unauthenticated).
6. Explicitly **not** started: orchestrator, ConPTY terminal, SDK migrations.

---

## 8. Installed-build flashing terminals (2026-09-04) — root cause

**Symptom:** visible terminal windows opening/closing in a loop while the
installed app was open; dev build seemed unaffected.

**Root cause — a different app: `T3 Code (Alpha).exe` (the HARI reference
app) running side-by-side.** Two process watches proved it — first a
60-second watch (92 births) while `monocode.exe` happened to be closed, then
the decisive one: 45 seconds at 1-second cadence **with the fresh installed
MonoCode (PID 44216) running**, logging every newborn
`cmd`/`conhost`/`taskkill`/`powershell`/`node` with its parent executable.
59 births, **zero from MonoCode**; every attributable spawn parented to
`T3 Code (Alpha).exe` (PID 38356):

- `powershell.exe -NoProfile -NonInteractive -Command
  "Get-NetTCPConnection ..."` port scans roughly every 3–4 seconds (each
  with its own `conhost`) — ~13 in 45s;
- `cmd.exe /d /s /c "taskkill /pid ..."` in pairs (TERM then escalate) —
  T3's own process-supervision loop;
- `cmd.exe /d /s /c "^"C:\...\opencode.CMD^" ^"models^" ^"--verbose^""`
  and `... ^"agent^" ^"list^""` — T3's provider catalog probing through
  **visible** `cmd.exe` (note T3's signature: `^`-escaping plus uppercase
  `.CMD`, vs MonoCode's lowercase `opencode.cmd`);
- `cmd.exe /C ...\npx.cmd mcp-remote ...` / `figma-console-mcp` windows —
  MCP servers spawned visibly by active `claude.exe` sessions (Claude/Node
  set no hidden-window flag; no parent app can force grandchildren's
  windows hidden). Scattered `gh`/`git` conhosts are background tooling.

The user's "Terminal using 3.6 GB with 2 tabs" is the accumulation of these
conhosts over hours (T3 polling + MCP/git activity), not MonoCode.

- `cmd.exe /d /s /c "^"C:\...\opencode.CMD^" ^"models^" ^"--verbose^""`
  and `... ^"agent^" ^"list^""` — T3's provider catalog probing through
  **visible** `cmd.exe` (note T3's signature: `^`-escaping plus uppercase
  `.CMD`, vs MonoCode's lowercase `opencode.cmd`).
- `powershell.exe -NoProfile -NonInteractive -Command "Get-NetTCPConnection
  ..."` — T3's recurring port scans, also visible.
- `cmd.exe /C ...\npx.cmd mcp-remote ...` / `figma-console-mcp@latest` —
  MCP servers spawned visibly by active `claude.exe` sessions (Claude/Node
  set no hidden-window flag; no app can control grandchildren's windows).

Earlier suspicion of a stale MonoCode instance was wrong: PID numbers had
been reused across days, and the old `sandbox-bin` chat text was persisted
conversation history, not fresh output. Verified installed
`monocode.exe` == just-built `monocode.exe` (same size/timestamp, no
`sandbox-bin` string in the binary), and a 20s idle watch of the fresh
installed instance showed zero `cmd`/`taskkill`/`powershell` spawns —
`CREATE_NO_WINDOW` coverage (audited on every production Windows spawn
path) holds.

Cleanup done at the time: killed the orphaned `opencode serve` a dead
session had left behind (port 8766 freed).

**Rule going forward:** when diagnosing flashing terminals, resolve the
**parent executable** first (`ParentProcessId` → exe name) — on a machine
running MonoCode, T3/HARI, Claude Code, and MCP servers side-by-side, any
of them can own the console window. Do not blame a build without a PID
chain. To confirm: quit `T3 Code (Alpha)` and the flashing stops; MonoCode
(dev or installed) is not the source.

---

## 9. Polling: T3 vs MonoCode, and the OpenCode SDK question

**Why T3 polls OpenCode.** T3 re-runs `checkOpenCodeProviderStatus`
(`apps/server/src/provider/Layers/OpenCodeProvider.ts:325`) through its
managed-snapshot lifecycle. With no external `serverUrl` configured that
means `loadInventoryFromCli`
(`apps/server/src/provider/opencodeRuntime.ts:732`): `models --verbose` +
`agent list` (+ `debug skill`) spawned as visible `cmd.exe` on Windows,
plus its preview `PortScanner` (`Get-NetTCPConnection` PowerShell) and its
own `taskkill` supervision loop. That is the observed storm. (Reference
repo — diagnosed, not modified.)

**MonoCode does not poll like that.** Catalog discovery (`--version`,
`models --verbose`, `agent list`) runs only on demand — app boot for needed
harnesses, a Providers-page row with no models yet, ModelPicker tab,
SecondOpinion — guarded by `hasLiveCatalog` + inflight dedupe
(`src/lib/harness/registry.ts:211`, whose comment records that boot used to
spawn unused CLIs and was fixed for exactly this reason). Availability is
`--version` + `--help` with a 30s TTL. Chat uses zero CLI spawns: the
hand-rolled `OpenCodeClient` (`src/lib/harness/opencodeClient.ts`, plain
fetch over Tauri `harness_http` + SSE events) talks to the one `serve`
instance spawned per session. Proven: 45s watch of the running installed
build → zero `cmd`/`taskkill`/`powershell` births.

**Why not the OpenCode SDK?** `@opencode-ai/sdk` (T3 uses
`@opencode-ai/sdk/v2`, `createOpencodeClient`) is the official typed client
for the *same localhost HTTP API* MonoCode already calls by hand. Adopting
it is a small maintainability cleanup (npm dep + swap ~245 lines of
`opencodeClient.ts` + SSE/loopback-guard rework), not a bug fix: it changes
call style, not process behavior, so it would not have affected the
terminal storm. **No ban risk** — it is localhost traffic; remote
cost/quotas are governed by the user's own opencode auth, identical
whichever client you use.
