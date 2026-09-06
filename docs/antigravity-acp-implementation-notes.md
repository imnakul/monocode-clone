# Antigravity ACP implementation notes (2026-09-06)

Branch `feature/antigravity-acp`, worktree `E:\Developing\OpenSource\mono-clone-antigravity-acp`
(copied byte-for-byte from the Codex worktree `C:\Users\gclna\.codex\worktrees\b79b\mono-clone`,
branch `codex/antigravity-acp` @ `dbe21cff`, which remains untouched as a backup).

## What replaced what

| Old (headless CLI)                  | New (official ACP runtime)                                        |
| ----------------------------------- | ----------------------------------------------------------------- |
| `agy.exe` + stream-json scraping     | `agy_acp_server(.exe/.par)` + `localharness_external` helper       |
| `antigravityProtocol.ts` (deleted)   | `antigravityAcpProtocol.ts` (config/models/modes/prompt blocks)    |
| `--conversation` resume              | `session/resume` with `agy-acp:v1:` prefixed stored IDs            |
| `--output-format json models` catalog| initialize → authenticate → session/new config options             |
| No attachments in headless           | image/audio/PDF/text prompt blocks with byte-level validation      |
| No approvals (faked/denied)          | `session/request_permission` + `interaction_` questions            |
| Availability via `--help` markers    | real `initialize` handshake probe in Rust                          |

## Deliberate differences from T3 (researched @ 2271a27)

1. **fs callbacks stay off.** T3 advertises `fs.readTextFile/writeTextFile` on chat so edits
   route through the client as permission requests. MonoCode has no canonical-path/symlink
   enforcement in the backend yet, so we advertise `fs: false` and let the agent use its own
   tools. Until path containment exists in Rust, do not flip this on.
2. **Sign-in-required probes as available.** The Rust availability probe only runs
   `initialize` (never `authenticate`); if a runtime prints an authorization URL during the
   handshake, the probe reports "Google sign-in required" but still marks the runtime
   installed, so the Settings sign-in button stays reachable. Account access is validated by
   catalog discovery and chat startup instead (mirrors Claude's login-expiry handling).
3. **No client-side permission auto-answer.** T3 surfaces options in every mode. MonoCode
   additionally maps its supervision levels onto the agent's `mode` config option
   (`supervised→default`, `auto-accept-edits→auto_edit`, `full-access→yolo`, `auto→default`),
   so the agent itself stops asking in the looser modes; anything it still asks is shown to
   the user. Option selection matches by option `kind` (`allow_once`/`allow_always`/
   `reject_once`/`reject_always`), never by ID spelling.
4. **Local approval IDs.** MonoCode's approval UI uses numeric request IDs, but ACP reverse
   requests may carry opaque string IDs. The adapter keeps a `Map<localId, nativeId>` and
   replies with the original native ID and the chosen `optionId`.
5. **Cancellation.** `session/cancel` is sent as a notification, then the adapter waits up to
   15 s (T3's default) for the outstanding `session/prompt` to settle; on timeout the process
   is retired. Updates are muted between cancellation and the next turn so late output cannot
   contaminate the new turn.
6. **Startup notification buffer.** `session/update` notifications that arrive before the
   native session ID binds are buffered (max 100) per session ID and replayed for the bound
   session; everything else is filtered by session identity.
7. **Catalog discovery costs one session.** Models come from the `model` select config option
   returned by `session/new`; discovery creates a throwaway session and stops the process.
   The snapshot (`idle|loading|ready|error` + `signInRequired`) is exposed via
   `getAntigravityCatalogSnapshot` / `subscribeAntigravityCatalog` for Settings.
8. **Windows invariants preserved.** `dirs_home()` fallback chain, hidden subprocesses
   (`isolate_child`), `.cmd` shell handling, case-insensitive override matching, and no
   machine-specific paths are untouched. The old "Antigravity is headless-only" invariant is
   intentionally superseded (see `docs/windows-changes.md` in the main checkout).

## Rust wiring

- `resolve_antigravity()` now finds `agy_acp_server` on PATH (PATHEXT-aware on Windows) with
  Unix fallbacks; `resolve_antigravity_acp` validates the sibling helper via
  `antigravity_acp::validate_runtime` and rejects legacy `agy.exe` with install guidance.
- `probe_antigravity_acp` spawns the runtime with the full profile env, sends one
  `initialize`, and validates the official agent identity (bounded read, no URL leakage).
- `prepare_child` grew an `agy_acp_server` arm that applies the isolated profile
  (`~/.monocode/providers/antigravity`), `AGY_ACP_FORCE_FILE_STORAGE=1`,
  `ANTIGRAVITY_HARNESS_PATH=<helper>`, and `BROWSER='<monocode.exe>' --antigravity-auth-url %s`
  so no spawn can open a real browser. `prepare_child` is now fallible and propagates
  configuration errors to the caller before the child is spawned.
- The browser helper intercepts `--antigravity-auth-url <url>` in `main.rs` before Tauri
  boots, prints `__MONOCODE_ANTIGRAVITY_AUTH_URL__<json>` to stderr, and exits 0.

## Verification (2026-09-06)

- `npx tsc --noEmit` — clean.
- `npm test` — 107 files / 1139 tests passed (baseline before this work: 1126 passed,
  6 failed in `antigravityAcpLive.test.ts`; those are the spec tests now green).
- `cargo test -p monocode` — 170 passed; the 13 failures are the documented pre-existing
  CRLF/git-dependent `checkpoint`/`fs`/`skills` tests (unchanged set from
  `docs/windows-changes.md`).
- `cargo fmt --check` — clean. `cargo clippy -p monocode --all-targets` — no warnings in any
  changed file; remaining warnings are the documented pre-existing `pty.rs`/unix-gated items.
- `npm run build` — clean production web build.
- ESLint: the repo has no ESLint config or dependency, so `npx eslint . --fix` is
  unavailable by design (handoff instructs not to add lint infrastructure).
- Installer: `npx tauri build` (NSIS) — see final report for path + SHA-256.

## Runtime download (verified 2026-09-06)

The registry manifest (`antigravity-acp/agent.json`) is the authoritative index; the actual
archives are served from `dl.google.com`. Windows x64 (runtime 1.1.1):

```
https://dl.google.com/agy-extensions/releases/windows/agy-acp-server-agy_acp_server_1.1.1-windows-x86_64.zip
```

- Archive SHA-256: `47cb50eef14f0a4655d78cfcfda869bcea7aaee5f9787e936bc2935ea612c3b8` (468 MB, 536 MB extracted).
- Contains exactly `agy_acp_server.exe` + `localharness_external.exe`.
- Live handshake verified: `agentInfo.name = "antigravity-acp"`, version `agy_acp_server_1.1.1`,
  `sessionCapabilities.resume`, `promptCapabilities {image, audio, embeddedContext}`,
  `authMethods` includes `oauth-personal` — every field MonoCode's probe/adapter expects.
- The setup panel links the Windows ZIP directly (platform-aware) and keeps the registry link
  for other platforms/newer versions. When Google ships a newer runtime, refresh
  `WINDOWS_RUNTIME_DOWNLOAD` in `AntigravitySetupPanel.tsx` from the manifest.

## Live findings from first real runtime test (2026-09-06)

- `agy_acp_server.exe` is a **PyInstaller onefile** binary: the spawned process is only the
  parent bootloader — the real server runs as its child, and every launch extracts ~500 MB to
  `%TEMP%`. Three defects followed from this, all fixed:
  1. **Probe hang (confirmed live, 10-15 min "Checking…"):** the probe read the response, then
     killed only the direct child. The real server survived, held the stderr pipe open, and
     the probe's stderr `join()` blocked forever. Fix: tree-kill via the existing Windows
     `terminate` (taskkill /T /F), a 3s self-exit grace before it, and a bounded channel
     receive (5s) for the stderr text instead of `join`.
  2. **Temp leak:** any killed runtime abandons its extraction folder. The launch env now
     points `TMP`/`TEMP` at `~/.monocode/providers/antigravity/tmp` and `configure()` sweeps
     extractions older than 24h, so leaks are contained to MonoCode's own directory and
     self-heal. (Live measurement before the fix: 13 leaked folders ≈ 7 GB on C:.)
  3. **Cold-start latency:** self-extraction alone can exceed 10s, so the probe budget is 30s
     and a first prompt after an idle park can take 5-15s to start streaming.
- The "Sign in with Google" state machine depends on the probe passing; with the fixes, a
  healthy-but-unsigned runtime probes as installed ("Google sign-in required") and the
  Settings sign-in button enables.

## Live verification round 2 (2026-09-06, first real user session)

The first end-to-end use hit two failures. Both are now understood as **launch congestion,
not auth or protocol defects**:

- **Sign-in reverted to "Sign in with Google" after a successful browser OAuth.** The token
  HAD persisted (`~/.monocode/providers/antigravity/antigravity-acp/acp_token.json`); the
  panel reverted because the `authenticate` RPC response never settled in time.
- **"Antigravity ACP process exited (-1)" ~3s into the first chat turn.**

Root-cause chain, confirmed by manual reproduction outside the app:

1. Every launch re-extracts ~500 MB (PyInstaller onefile). A warm start took ~14 s just to
   reach the first log line; the runtime answers nothing before that.
2. Probe, sign-in, and chat each spawn their **own** runtime; a killed run leaks its
   extraction (sweep only clears >24h). The failed session left **1.2 GB of `_MEI*`
   corpses**, and overlapping launches thrashed the disk past the 30 s initialize budgets.
3. The system drive was at 97% full, stretching every extraction further.

A taskkill-based tree kill reports exit code 1, not -1, so the -1 came from the runtime
dying mid-extraction on its own, not from MonoCode's `terminate` path.

With a clean slate (no stray processes, no leftover extractions) the exact app sequence was
replayed manually: `initialize` + `authenticate` with the stored token → silent refresh →
`loadCodeAssist` onboarding check, all green in ~15 s.

Cleanup performed, then retried in-app: stray `agy_acp_server`/bootloader processes killed,
`_MEI*` folders deleted, app restarted. **Result: Recheck discovered 11 models, and a real
chat turn with an image attachment succeeded end-to-end.** The lingering "Sign in with
Google" card is stale UI state — account access is carried by the stored token, not the card.

### Operational guidance (Windows)

- Keep ≥10 GB free on the system drive; every launch temporarily writes ~500 MB.
- Install the runtime in a stable directory (not Downloads); `agy_acp_server.exe` and
  `localharness_external.exe` must stay together in the same folder.
- After a crash, sign-in/chat may keep failing from leftovers alone: kill stray
  `agy_acp_server` processes, delete `~/.monocode/providers/antigravity/tmp/_MEI*`,
  restart the app, Recheck. The token survives all of this — never re-run sign-in just
  because the card is stale.

### Remaining hardening candidates

- Reuse one long-lived runtime connection instead of spawn-per-probe/per-session.
- Sweep `_MEI*` extractions at startup rather than after 24 h (each is ~500 MB).
- Adaptive cold-start budget: treat "alive but still extracting" differently from dead.

### How upstream T3 differs (checked 2026-09-06, pingdotgg/t3code main)

The launch contract we ported matches T3's `antigravityAuthSupport.ts` 1:1 (same env scrub
list, `GEMINI_HOME` profile, `AGY_ACP_FORCE_FILE_STORAGE`, `BROWSER` interception via the
host executable, `settings.json` auth.type, identical URL validation, `acp_token.json`).
T3 has **no** TMP/TEMP redirection and **no** extraction sweeping — the onefile leak exists
for them too and is simply tolerated. What keeps it invisible for them is the lifecycle:

- T3's `AcpSessionRuntime` spawns the runtime **once** and keeps it alive: prompts run
  through the same process under semaphores, `session/load` (90 s budget) resumes on top of
  it, and the runtime is only retired on abnormal exit (`retireRuntime`). Setup, probe, and
  text generation use the same runtime layer with `fs` capabilities off — they do not spawn
  extra instances per check.
- MonoCode's port instead spawns a fresh onefile instance per availability probe, per
  catalog discovery, per sign-in, and per chat session, each on a 30 s budget. Same per-
  launch cost as T3, multiplied by every UI action — which is exactly the round-2 incident.
- Other T3 deltas worth knowing: their browser helper is the Electron binary running as Node
  (`ELECTRON_RUN_AS_NODE=1`, `-e <inline script>`) with a 5 s preflight verification of the
  interception path; four auth methods (oauth-personal/business, API key, Agent Platform)
  vs our oauth-personal only; per-instance profile dirs (sha256 of instance id); and chat
  advertises `fs` capabilities so edits arrive as permission requests (we keep fs off).

**Conclusion:** the fix that matters is porting T3's lifecycle — one long-lived runtime per
provider instance, reused by probe/catalog/chat and retired only on exit. That alone removes
nearly all of the congestion we hit; the TMP redirection and sweep then become safety nets
rather than load-bearing mitigations.

### Long-lived runtime: implemented (2026-09-06)

`antigravityRuntimeHost.ts` now owns **one** shared `agy_acp_server` process per app run
(`monocode-antigravity-runtime` harness slot): initialize + authenticate happen once, and
catalog discovery, every chat session, and resume attach to it as native sessions demuxed by
`sessionId` (unbound `session/update` traffic is buffered per session and flushed on attach).
The per-session transport, per-catalog spawn, and per-chat process are gone; the setup panel's
sign-in keeps its dedicated process and **retires the shared runtime** when it finishes so the
next launch picks up the fresh token. A wedged cancel (no settlement within T3's 15 s grace)
also retires the runtime, and any attached session observes process death as `session.ended`
and resumes on its next turn. Remaining per-launch spawns: the Rust availability probe
(explicit Recheck only) and sign-in.

### Updates to "Not verified live"

Real Google sign-in: **verified** (2026-09-06). Real model prompts with image attachments:
**verified** (2026-09-06). Permission/question dialogs from the real agent, resume across an
app restart, and installer behavior on a machine without the runtime: still unverified.

## Review fixes (2026-09-06, post f1f5b89 review)

Six issues from the post-implementation review, all fixed with regression tests:

1. **Cancel during startup** sent the prompt anyway and the flag swallowed the next message.
   Cancellation is now tagged to a per-session **turn epoch**: a stop during runtime
   acquisition, `createLive`, config application, or attachment preparation aborts exactly that
   turn (before `session/new` even) and can never consume a later, independent message.
2. **Deleting a running chat** could strand the agent (forget cleared the prompt before cancel
   read it). Disposal is now self-contained: `forget` cancels, and `stop` itself performs a
   bounded native cancel for any live prompt — a runtime that ignores `session/cancel` is
   retired, which is what bounds the wait.
3. **`config_option_update` was ignored**, letting agent-side mode/model fallbacks go unseen.
   The driver refreshes its cached config from those notifications, so the next turn
   reconciles (e.g. restores supervised after the agent flipped itself to yolo).
4. **The temp sweeper** deleted by age alone and could strip a live runtime's extraction.
   Cleanup now probes every file for delete-access first (an executing PyInstaller payload is
   held without delete sharing); any doubt spares the whole tree. Unix behavior unchanged.
5. **Changing the binary in Settings** left the old shared runtime running. `acquire` now
   resolves the executable every time and restarts the host when it changed (a resolution
   failure never tears down a working runtime).
6. **Unix PATH discovery** searched the extensionless name while the validator requires
   `agy_acp_server.par`; discovery now searches the platform-correct name.

Plus: **usage meter** — the runtime logs backend `usageUpdate` websocket frames on stderr
(`trajectoryId` == our ACP session id); the host parses them and feeds `{type:"context",
used: totalTokenCount}` like Codex/Claude. Best-effort: format changes degrade to no meter.
