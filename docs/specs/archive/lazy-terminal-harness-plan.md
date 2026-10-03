# Done — Lazy terminal + harness startup — plan

- Workflow status: Done (historical spec, labeled at Nakul's request). Existing verification caveats below are preserved.


- Worktree path: `E:\Developing\OpenSource\mono-clone` (directly on integration line; user explicitly forbade a worktree/separate branch for this task)
- Branch name: `nakul/windows-support`
- Base commit of `nakul/windows-support`: `7095e9f` (`chore(release): bump version to 0.1.44-local7-upstream-sync`)
- SocratiCode: no SocratiCode MCP tools are registered in this session, so availability/index status could not be checked. Used targeted native search (`grep`) + direct reads instead, and verified conclusions against source + tests + final diff. No infrastructure rebuilt.
- Frontend skill: read the `frontend-design` skill. It pushes bold, distinctive aesthetics; this task explicitly requires keeping MonoCode's existing design language with a compact dormant/loading/error state, so the skill is applied as restraint (Tailwind-only, semantic controls, existing conventions) rather than a redesign.

## Initial Idea

Cold launch restores layout but must not spawn shells or provider runtimes. A terminal starts only on deliberate user action; a provider runtime starts only when an operation needs it. Already-running terminals survive hide/switch/blur. Normal quit reaps owned process trees.

## Research

### Terminal startup chain (verified in source)

1. `src/lib/appLifecycle.ts` `loadResumedWorkspaceOnce()` reads the persisted snapshot.
2. `src/App.tsx` initialises `projectTerminals` from `resumed.projectTerminals`.
3. `src/App.tsx` maps every `ProjectTerminalDock`; inactive docks get `hidden` but stay mounted.
4. `src/surfaces/ProjectTerminalDock.tsx` renders `TerminalView` for every dock file; inactive files hidden but mounted.
5. `src/surfaces/TerminalView.tsx` mount effect unconditionally calls `spawnPty()`.
6. `src/lib/pty.ts` `spawnPty()` invokes Rust `pty_spawn`; `src-tauri/src/pty.rs` starts one ConPTY shell per id (pwsh → powershell → cmd).
7. Parallel path: `App.tsx` maps all workspace tabs hidden; `PaneTree` → `FilePane.tsx` mounts `TerminalView` for terminal files even when hidden.

Closing a terminal only drops React state today; the actual kill happens in `TerminalView`'s unmount cleanup (`killPty`). Snapshot sanitize already strips `foreground`, so restored entries carry no live-process label — but they still spawn on mount.

Primary sources consulted:

- React 19 docs (`react.dev/reference/react/useEffect`, `StrictMode`, `lifecycle-of-reactive-effects`): setup/cleanup can run multiple times; Strict Mode dev double-invokes setup+cleanup as a stress test; cleanup must mirror setup. Decision: spawn effect cleanup must be safe under remount (no kill of a still-wanted session) and must still kill after a real close/quit, including close-while-spawn-pending.
- Microsoft ConPTY docs + `portable-pty`/`node-pty`/`alacritty` ConPTY implementations: the pseudoconsole owns the child; closing the handle/tree-kill tears the shell down. Decision: keep Rust supervision untouched (job objects/tree-kill already exist); fix purely in frontend lifecycle so each live shell maps 1:1 to an explicit user start.

### Provider startup chain (verified in source)

- `src/App.tsx` boot effect calls `probeHarnessAvailability()` (all live harnesses, including the 30 s Antigravity ACP `initialize` handshake in `src-tauri/src/harness.rs` `probe_antigravity_acp`) plus `refreshHarnessCatalogs(harnesses-in-sessions)` (Antigravity path acquires the shared PyInstaller runtime via `antigravityRuntimeHost.ts`), then rewrites saved `model`/`modelSettings` against the possibly-incomplete fallback catalog via `resolveModel`.
- Explicit paths already exist and stay: `ModelPicker` probes + refreshes on open, `SettingsView` Providers page probes on mount and refreshes per row on visit, manual Recheck re-probes then refreshes sequentially.
- `harnessUnavailableHint` + `isHarnessAvailable(false)` currently cannot distinguish "not yet checked" from "missing".

### Malformed persisted project

`normalizeProjectPath()` (`src/lib/recents.ts`) normalises separators/slashes but not a leading encoded drive colon (`e%3A/...`), so `pathKey()` treats it as a different project. `src/lib/paths.ts` already shows the safe pattern: `decodeURIComponent` in try/catch at a defined URL boundary, with literal `%` preserved. Decision: narrow repair (`^[A-Za-z]%3A` → `X:/`, case-insensitive `%3a`) applied only at the workspace-snapshot parse boundary, plus dock dedupe by `pathKey`. No global path decoding.

## Discussion

Tradeoff (as required by the task): keep already-started terminals mounted while deferring first spawn, vs separating runtime ownership from view mounting. Chosen: keep-mounted + deferred first spawn behind an explicit in-memory lifecycle controller. Rationale: smallest change satisfying "hide/switch must not kill"; unmount cleanup today kills the PTY, so any conditional-render approach would kill builds/dev servers on tab switch. Cost: restored-but-never-started terminals still mount a lightweight placeholder (no xterm, no backend calls) — negligible. Runtime/view separation would be more robust (survives view unmount) but requires backend session handles + adoption protocol; deferred as future work. Cross-window transfer: verified no `stage_window_transfer` call sites exist in `src/` (only `take_window_transfer` on boot + `open_new_window` from MenuBar), so cold-start restoration is the only live path; transfer payloads restore dormant like snapshots. Multi-window same-id concurrent start remains last-wins (documented limitation).

Terminal-start intent (consistent dock + pane, same `TerminalView`): new terminal creation, explicit panel show/open, selecting a dormant terminal tab/file, pressing Start/Restart/Retry. Focus/mousedown, layout restore, project switch, and unrelated renders never start. One start marks one id; no fan-out.

Provider intent: picker open, provider row visit, manual Recheck, executing a provider operation (send/steer/compact/queued dispatch — queue semantics untouched). Catalog success for Antigravity marks availability directly so the expensive handshake and the shared-runtime acquisition never run simultaneously. Saved model/settings are never rewritten at boot.

## Implementation plan

1. `src/lib/terminalLifecycle.ts` (new, pure + test): in-memory wanted/starting/started tracking, `requestTerminalStart` dedupe, `forgetTerminal`, StrictMode-safe cleanup guard, sync-external-store subscription.
2. `src/surfaces/TerminalView.tsx`: dormant placeholder vs live xterm; guarded spawn; exit + failure + retry UI.
3. `src/App.tsx`: delete boot probe/refresh/normalise effect; call `startTerminal` in new/show/select/toggle handlers (single active id only); call `forgetTerminal` + `killPty` in close handlers; start-on-select for workspace terminal files.
4. `src/lib/harness/availability.ts`: `exclude` option on probe + `noteHarnessProbeResult` for catalog-derived evidence + `hasProbed…` tertiary state.
5. `src/lib/harness/antigravityCatalog.ts`: report success/sign-in as availability evidence (no separate handshake).
6. `src/chrome/ModelPicker.tsx`, `src/surfaces/SettingsView.tsx`: exclude Antigravity from blanket probes; honest "not checked yet" copy; keep Recheck.
7. `src/lib/legacyProjectPath.ts` (new, pure + test) + `src/lib/workspaceSnapshot.ts`: repair + merge duplicate docks.
8. Tests: lifecycle, repair/merge, boot-zero-spawn, single-start, dedupe, pending-close cleanup, retry, dock + pane parity, dormant-not-running, no-boot-acquire/probe, explicit-acquire dedupe, model preservation, quit cleanup, queue untouched, literal-% intact.
9. Gates: `npx tsc --noEmit`, `npx eslint . --fix` (expected pre-existing blocker: no `eslint.config.*`), full `npx vitest run`, `cargo fmt --check`, `cargo check`, Rust quality gates per agreement, `git diff --check`. Update `docs/changelog/LOCAL-CHANGELOG.md` + `docs/WINDOWS-CHANGES.md`.

## Todos

- [x] Map terminal/harness lifecycle paths
- [ ] Lifecycle controller + TerminalView lazy start
- [ ] Deferred provider discovery + honest status
- [ ] Legacy encoded-path repair + dock merge
- [ ] Regression tests
- [ ] Gates + docs + final report

## Issues in Dev (+ fixes)

1. `sessionFromStub()` normalized saved models through `newSession()` →
   fallback default (found by the preservation test going red with
   `antigravity:default`). Fixed by restoring `model`/`modelSettings`
   verbatim; resolution now happens at use sites with live catalogs.
2. `ProviderRow` visit effect (`if (!available …) return`) never discovered
   Antigravity once boot probing was removed. Fixed: refresh unless there is
   evidence of absence or a live catalog.
3. `ModelPicker.test.ts` availability mock lacked `hasHarnessEvidence`.
   Fixed mock (pre-existing mock, our new import).
4. `secondOpinion.test.ts` harness list predated Antigravity/Cline. Extended
   the list; per-harness `probed` keeps unevidenced providers listed.
5. `onRemoveProject` first put kills inside a `setState` updater (impure —
   Strict Mode double-invokes). Moved to the handler body via
   `projectTerminalsRef`.

## Issues in Installed (+ fixes)

User verifies UI manually; no installer/browser/Playwright in this task.

## Learnings

- Snapshot restore normalized models twice (App boot effect AND
  `sessionFromStub` via `newSession`); the test caught the second one.
- Keep `setState` updaters pure: Strict Mode double-invocation turns
  kill/forget side effects inside updaters into double kills (harmless but
  wrong); handler bodies + refs instead.
- A module-level lifecycle controller with `useSyncExternalStore` keeps
  dock + pane paths consistent with zero prop drilling, since both render
  the same `TerminalView`.
- Catalog discovery doubling as the health probe removes an entire class of
  cold-start races without weakening the ACP handshake contract.

## Done

Implemented on `nakul/windows-support` (base `7095e9f`), no worktree/branch
per user instruction. Gates: `tsc` clean; vitest 205/2318 green (42 new);
`cargo fmt --check`, `cargo check`, `cargo clippy -D warnings` clean;
`cargo test` 267/0/4; `git diff --check` clean. ESLint blocked repo-wide
(no `eslint.config.*`, pre-existing). No browser/GUI test, installer,
commit, or push. Docs updated (`docs/changelog/LOCAL-CHANGELOG.md`, `docs/WINDOWS-CHANGES.md`).
Ready for independent agent review + Nakul's in-app verification.
