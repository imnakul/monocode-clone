# Todo — "Verify" status label, startup provider check, Refresh all, Remote Control for existing Claude chats

- Tier: standard · Snapshot: `92f641f` on `nakul/windows-support-upstream-0.8.0`, 2026-10-07 · Status: Todo
- Branch: work on `nakul/windows-support-upstream-0.8.0` only.
- Skills: `frontend-ui`
- Desktop UI checks are Nakul's. Finish with the manual checklist at the end.

## Goal

1. **Task status "Review" reads "Verify".** The new label covers both reviewing and testing.
2. **A light provider check runs once after the app opens.** A title-bar indicator shows when it is done, so Nakul knows when to start working.
3. **Settings → Providers stops re-checking on every visit.** It shows the results it already has, and a **Refresh all** button forces a fresh check.
4. **Remote Control can be turned on for an existing Claude chat** from the composer's "Work in" chip. This is a regression from `1f5d585`.

## Out of scope

- **Codex Remote Control.** Codex's `codex remote-control` works at the host level: it pairs the whole machine's Codex app-server daemon with the ChatGPT mobile app. It is not a per-chat switch, and the CLI-only phone flow is not documented as ready ([openai/codex discussion #21935](https://github.com/openai/codex/discussions/21935)). MonoCode runs Codex chats in its own app-server process, so a paired phone would not see them. Supporting it would mean moving Codex chats onto the shared daemon and granting the phone whole-machine access, which needs its own research spec. Codex chats therefore keep showing only "This computer" (and "Cloud" where available).
- Remote Control for remote-host sessions (unchanged).
- Session Manager's "Review" label (`src/features/session-board/sessionBoard.ts:108`) and the linked-work-item "Review" (`src/features/inbox/ui/LinkedWorkItemUpdateNotice.tsx:43`). Both mean pull-request review, which is a different thing.
- Re-adding any work to cold start beyond what section 2 allows. See the 15 Sept lazy-startup policy in `docs/WINDOWS-CHANGES.md:299-330`.

## Current behavior (confirmed in source at `92f641f`)

**1. Status label**
- `src/features/tasks/tasks.ts:6-12`: `TASK_STATUS_LABELS = { todo: "Todo", in_progress: "Progress", blocked: "Blocked", review: "Review", completed: "Completed" }`.
- The stored value is `review`. Agent CLI actions (`tasks.list`/`tasks.write` in `src/features/agent-app/model/agentApp.ts`) and `src-tauri/src/tasks.rs` use the value, not the label.

**2. Startup**
- Startup does no provider discovery, by design. See `src/app/App.tsx:311-315` (the NOTE) and `docs/WINDOWS-CHANGES.md:299-330`. Cold start used to spawn provider runtimes, including the roughly 30s Antigravity ACP handshake, and once rewrote saved models against a fallback catalog.
- `probeHarnessAvailability(options?)` (`src/integrations/harness/core/availability.ts:96-…`):
  - shares one in-flight promise;
  - skips work within `PROBE_TTL_MS = 30_000` unless `force`;
  - supports `exclude`.
- `refreshHarnessCatalogs(ids, { force? })` is in `src/integrations/harness/core/registry.ts`.

**3. Providers page** (`src/features/settings/ui/SettingsView.tsx`)
- `ProvidersPage` state `initialStatus: "checking" | "ready" | "error"` (`:4110-4113`).
- The mount effect (`:4179-4205`) runs on every visit:
  - `probeHarnessAvailability({ exclude: ["antigravity"] })`;
  - `refreshHarnessCatalogs(catalogIds)`, where `catalogIds` are harnesses without a live catalog that are available or have no evidence;
  - then `runUpdateCheck()`.
- The header `action` (`:4258-4280`) shows `TerminalSpinner` "Checking providers…", "Provider checks failed. Use Recheck to retry.", or a screen-reader-only "Provider checks complete."
- Rows receive `initialLoading` (`:4350`) and own a per-row Recheck (`handleRecheck`, `:4818-4830`). Antigravity rechecks through `recheckAntigravityCatalog()`.
- App opens a settings section via `openSettings(section)` (`App.tsx:12631`). Other code uses window events, for example `monocode:open-mcp-settings` (`App.tsx:12675-12680`, dispatched from `Composer.tsx:2022`).

**4. Remote Control in "Work in"**
- `src/features/sessions/ui/SessionPane.tsx:461-478` builds `remoteControlControls` for local Claude chats (`showRemoteControl`) and passes them to `WorkInPicker` (`:930-938`).
- `src/features/provider-sessions/ui/WorkInPicker.tsx`, `if (started) { … }`:
  - a Remote chat renders `RemoteControlButton` (menu: Retry, Turn off, Copy link);
  - a local chat renders a static `<div>` "This computer" with no action.

  So once a chat has a message there is no way to turn Remote Control on. That includes resumed native Claude sessions.
- The backend supports it. `setClaudeRemoteControl` (`src/integrations/harness/providers/claude/claude.ts:387-…`) calls `ensureLive(input, true)`, which starts or resumes the process when needed. `RemoteControlButton` (`src/features/provider-sessions/ui/RemoteControlButton.tsx:44-50`) already offers "Turn on Remote Control" when `view.canTurnOn`.

## Proposed behavior and invariants

- I-1: The task status shows as "Verify" everywhere a task status label is shown. The stored value stays `review`.
- I-2: Opening the app does no provider work for the first 2 seconds after mount. After that, one background check runs, unless it is turned off in Settings. It never runs the Antigravity handshake, never touches a hidden provider, and never rewrites saved sessions' models.
- I-3: One shared check state drives the title-bar indicator and the Providers page. Two checks never run at once: a manual Refresh all while the startup check is running waits for it and then forces a new run.
- I-4: The Providers page runs a check on open only when no check has completed in this app run.
- I-5: Any started local Claude chat can turn Remote Control on or off from its "Work in" chip.

## Implementation plan

### 1. "Verify"

- `tasks.ts:10`: `review: "Verify"`.
- Search the tests for the old label: `grep -rn '"Review"' src --include=*.test.ts`. Update only assertions about task status labels.
- Agent CLI help: in `src-tauri/src/control_cli.rs`, where task statuses are listed for `tasks.*`, add `(shown as "Verify")` after `review`, if statuses are listed there. Keep the value `review`.

### 2. Shared provider check and startup run

**New module `src/features/providers/model/providerCheck.ts`:**
- **State:** `{ phase: "idle" | "checking" | "ready" | "error"; completedAt?: number; failed: HarnessId[] }`.
- **Store API:** `subscribeProviderCheck`, `getProviderCheckSnapshot` (stable object identity between changes, for `useSyncExternalStore`).
- **`runProviderCheck({ force = false, includeAntigravity = false }): Promise<void>`:**
  1. If a run is in flight, `await` it. When `force` is false, return its result. When `force` is true, wait for it, then start a new run.
  2. Set `phase: "checking"`.
  3. Compute `ids` = `HARNESSES` filtered to:
     - not `"antigravity"`;
     - not hidden (`loadHiddenPickerProviders()`, `src/features/sessions/model/models.ts:731`);
     - and either `force`, or `!hasLiveCatalog(id) && (isHarnessAvailable(id) || !hasHarnessEvidence(id))` (the same rule as `SettingsView.tsx:4184-4188`).
  4. `await Promise.allSettled([probeHarnessAvailability({ force, exclude: ["antigravity"] }), refreshHarnessCatalogs(ids, force ? { force: true } : undefined), ...(includeAntigravity ? [recheckAntigravityCatalog()] : [])])`. Import `recheckAntigravityCatalog` from where `SettingsView.tsx:247` imports it.
  5. `failed` = the ids that are not available afterwards (`!isHarnessAvailable(id)`), plus `"antigravity"` if its recheck was included and rejected. If any promise rejected or `failed` is non-empty, `phase: "error"`; otherwise `phase: "ready"`. Set `completedAt: Date.now()`.
- **Must not:** touch saved sessions, call model normalisation, or start any runtime other than what `probeHarnessAvailability` and `refreshHarnessCatalogs` already do.

**Startup:** in `App.tsx`, add one effect next to the NOTE at `:311` (update the NOTE to describe this exception):
```ts
useEffect(() => {
  if (!loadCheckProvidersOnStartup()) return;
  const timer = window.setTimeout(() => void runProviderCheck(), 2000);
  return () => window.clearTimeout(timer);
}, []);
```

**Setting:**
- In `src/features/settings/model/` (next to similar boolean settings), add `loadCheckProvidersOnStartup` / `saveCheckProvidersOnStartup`, key `monocode.checkProvidersOnStartup`, default `true`.
- In `GeneralPage` (`SettingsView.tsx:958`), add a `Row` with a `Toggle`:
  - label `Check providers when MonoCode opens`;
  - description `Runs a quick background check a moment after launch, so models are ready when you start.`;
  - place it in the group nearest app startup or behaviour, following that page's existing row pattern.

**Title-bar indicator:**
- New `src/features/providers/ui/ProviderCheckIndicator.tsx`. It reads the store with `useSyncExternalStore`.
- **`checking`:** `TerminalSpinner` (`text-accent`, as in `TitleBar.tsx:281`) plus the text `Checking providers…`, `text-[11px] text-content/55`, `role="status"`, `aria-live="polite"`.
- **`ready`** (only right after a run completes): a `Check` icon plus `Providers ready` for 2000 ms, then fade out (`transition-opacity duration-300`) and render nothing. Use a local timer keyed on `completedAt`; `motion-reduce` hides it without fading.
- **`error`:** a `button` with a 6px `bg-amber-400` dot, `title`/`aria-label` `Some providers could not be checked. Open Providers settings`. Click dispatches `new Event("monocode:open-provider-settings")`. It stays until the next successful run.
- **`idle`:** nothing.
- **In `TitleBar.tsx`:** render `<ProviderCheckIndicator />` when not `embedded`, as the first child inside the trailing area (`:916-…`), wrapped in `flex items-center px-2`. It must render even when `trailingControls` would otherwise be null, so on macOS with no actions it still shows. Adjust the `trailingControls` condition so the wrapper renders when the indicator has something to show (expose `providerCheckVisible(snapshot)` from the module for this).
- **In `App.tsx`:** listen for `monocode:open-provider-settings` and call `openSettings("providers")`, mirroring `:12675-12680`.

### 3. Providers page uses the shared check, plus Refresh all

- Replace `ProvidersPage`'s mount effect (`:4179-4205`) with:
  - `const check = useSyncExternalStore(subscribeProviderCheck, getProviderCheckSnapshot, getProviderCheckSnapshot)`;
  - an effect on mount: `if (check.phase === "idle") void runProviderCheck();`;
  - a separate effect that calls `runUpdateCheck()` once, the first time `check.phase` becomes `ready` or `error` while the page is mounted. This keeps the CLI update toasts.
- Derive the old values: `initialLoading = check.phase === "checking" && check.completedAt === undefined`, and the header status from `check.phase`. Keep the existing `initialLoading` prop to rows unchanged.
- **Header action** (`:4258-4280`): a `flex items-center gap-3` containing:
  - the existing status text. While `checking`, keep `TerminalSpinner` and `Checking providers…`. On `error`, show `Some provider checks failed.`. On `ready`, keep the screen-reader-only text.
  - a `SecondaryButton` **`Refresh all`** with a `RefreshCw` icon (`size-3.5`, spinning while checking, with `motion-reduce:animate-none`). It is disabled while `check.phase === "checking"`. On click it calls `runProviderCheck({ force: true, includeAntigravity: true })`, then `onCatalogRefreshed?.()` if the page has it.
- Per-row Recheck stays unchanged.
- Row behaviour must still work when the page opens while the startup check is mid-run: rows see `initialLoading` true until the first run completes. That is the same contract as today.

### 4. Remote Control for existing Claude chats

- `RemoteControlButton.tsx`: add an optional prop `icon?: IconComponent`, defaulting to `Computer`. Keep the existing `label`.
- `WorkInPicker.tsx`, `if (started)`:
  - if `remote` is defined: return `<RemoteControlButton remoteControl={remote} label={value === "remote" ? "Remote" : "This computer"} icon={value === "remote" ? Computer : Laptop} />`. The menu then offers "Turn on Remote Control" for a local chat and Retry / Turn off / Copy link for a remote one, all already handled by `remoteControlView`.
  - if `remote` is undefined (Codex, remote host, etc.): keep returning `null`, as now.
- Colour: `RemoteControlButton` applies `REMOTE_CONTROL_ICON_CLASS[view.label]`. `Off` is already `text-content/45` (`src/features/provider-sessions/ui/RemoteControlIndicator.tsx:10`), matching the old muted "This computer" text. No change is needed.
- Turning it on for a parked or resumed chat starts its process (`ensureLive`). Show the existing `connecting` status meanwhile; no new UI is needed.

## Acceptance criteria

- AC-1: Task status chips, column headers, filters and the Status submenu show "Verify". Stored tasks keep `review`, and `tasks.write {"status":"review"}` still works.
- AC-2: With the setting on, no provider call happens before 2000 ms after App mount. One check runs after that. Antigravity and hidden providers are excluded. Saved sessions are untouched.
- AC-3: With the setting off, no check runs at startup, and opening Providers runs one (phase idle → run).
- AC-4: The title bar shows "Checking providers…" while checking, then "Providers ready" for 2 s and nothing afterwards. On failure it shows an amber dot that opens Settings → Providers.
- AC-5: Opening Providers after a completed check shows results immediately, with no new check. Refresh all forces a check including Antigravity, its button is disabled while running, and clicking it during the startup check waits and then forces a new run.
- AC-6: A started local Claude chat's "Work in" chip reads "This computer" and opens a menu with "Turn on Remote Control". Turning it on changes the chip to "Remote" (connecting, then on). Turning it off returns it to "This computer". Codex chats show no chip change.

## Test matrix

| AC | Level | File | Scenario |
|---|---|---|---|
| AC-1 | unit | `src/features/tasks/tasks.test.ts` | `TASK_STATUS_LABELS.review === "Verify"`; existing label assertions updated |
| AC-2/3 | unit | `src/features/providers/model/providerCheck.test.ts` (new) | Mock availability/registry: excludes antigravity and hidden ids; non-force skips live catalogs; an in-flight run is shared; a force during a run waits and then runs again; failed ids lead to `error`; phases in order |
| AC-2 | feature | an App startup test, or a small hook test if App is too heavy (extract the effect into `useStartupProviderCheck`) | Fake timers: nothing at 1999 ms, one call at 2000 ms; setting off means no call |
| AC-4 | component | `src/features/providers/ui/ProviderCheckIndicator.test.ts` (new) | checking text; ready text disappears after 2000 ms (fake timers); the error dot dispatches `monocode:open-provider-settings` |
| AC-5 | feature | the existing ProvidersPage tests (`grep -rln "Checking providers" src --include=*.test.ts`) | Completed store means no probe on mount; idle store means a probe; Refresh all calls force + Antigravity and is disabled while checking |
| AC-6 | component | `src/features/provider-sessions/ui/WorkInPicker.test.ts` (exists) | started + local + remote → button "This computer" with a "Turn on Remote Control" menu item that calls `onChange(true)`; started + desired → "Remote" with Turn off; started without remote → null |

## Verification

- `npx tsc --noEmit -p .`
- `npx vitest run src/features/tasks src/features/providers src/features/provider-sessions src/features/settings src/app/shell`
- `cargo test control_cli` (from `src-tauri`), only if `control_cli.rs` changed.
- Later full checks (not the implementer): `npx vitest run`, `npm run build`.

## Records

- `LOCAL-FEATURES.md`:
  - a new row: startup provider check + title indicator + Refresh all;
  - update the L-67 (Work in / Remote Control) row: existing chats can turn on Remote Control;
  - a note on the Tasks row: Review is shown as Verify.
- Changelog entry in the Current file.
- Add to the lazy-startup section of `WINDOWS-CHANGES.md`: a short dated addendum saying a delayed, opt-out light check now runs 2 s after launch (no Antigravity handshake, no session normalisation). Do not rewrite the older text.

## Manual checklist (Nakul, desktop)

1. Launch the app. The window is usable immediately. After about 2 s the title bar shows "Checking providers…", then "Providers ready", which fades.
2. Open Settings → Providers: results show instantly with no spinner. Press Refresh all: the spinner shows, and the button is disabled until it finishes.
3. Turn the setting off and relaunch: no indicator. Opening Providers runs the check once.
4. Open an existing Claude chat. "Work in: This computer" opens a menu; choose Turn on Remote Control, and the chip becomes "Remote". The phone can connect. Turn it off.
5. Tasks show "Verify" in place of "Review".

## Facts, decisions, assumptions

**Facts:** see Current behavior.

**Decisions:**
- **"Verify"** is short enough for columns and menus, and covers both review and testing.
- **The startup check is delayed (2 s), light, opt-out,** and excludes Antigravity and hidden providers. This respects the lazy-startup policy while giving the "ready" signal.
- **One shared store** drives both the title bar and Providers, so they always agree and never double-run.
- **Codex Remote is excluded** (see Out of scope).

**Assumptions:**
- None.

## Open questions

- None blocking.

## Implementer report format

- Per AC: done / partial / not done, with `file:line` or the test name.
- Deviations; checks run, with counts; files changed.

## Handoff retro

(Filled in after implementation.)
