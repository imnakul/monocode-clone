# Done — Queue durability hardening (0.1.35-local5-queue-durability)

- Workflow status: Done (historical spec, labeled at Nakul's request). Existing verification caveats below are preserved.


Worktree: E:\Developing\OpenSource\mono-clone-queue-local5
Branch: feature/queue-durability-local5
Base commit: 81ade2043cbb1835246e745a64be37297dea976a

## Initial Idea

The local4 release delivered user-facing Queue/Steer interaction: keybindings (Enter/Ctrl+Enter/Shift+Enter), tooltip mapping, queue card editing/removal, auto-dispatch ordering, pause on Stop with Resume, and canSteer: false on Antigravity.
However, local4 has durability and reliability gaps around that queue:
1. Queued follow-ups live only in TypeScript React memory (`Session.queuedMessages`). Closing or restarting MonoCode drops all queued messages.
2. If a provider turn fails, the auto-flush effect immediately fires the next queued message into the broken turn/session instead of waiting for the user.
3. Clicking the explicit Steer button on an existing queued row for non-native providers (or for Plan intent) marks the session active/idle before provider cancellation finishes, racing the active turn.
4. Explicit Steer forwards text, attachments, and cards, but omits the queued row's `intent` (e.g. Plan vs Build/Default).
5. Transient cancellation or resume states could restore inappropriately if persisted.

Local5 addresses these gaps by persisting queue state through SQLite migration 12, introducing an explicit `held` queue state on provider failure, managing non-native Steer cancellation through explicit transient states (`steering`) with a 15-second settlement barrier, and forwarding complete queued intent.

## Research

1. **SQLite Session Persistence**:
   - `src-tauri/src/session_store.rs`: The sessions table currently stores transcript blocks and metadata with migration 11 being the latest. `session_get` reads full session records while `session_list_by_project` reads covering index projections.
   - Adding `queued_messages_json TEXT` and `queue_status TEXT` as migration 12 keeps queued messages out of the covering index (only needed on session load).
   - `upsert_session` must clear `queued_messages_json` and `queue_status` to NULL when the queue is empty, preventing `[]` clutter.
   - `get_session` reads `queued_messages_json` and parses it into JSON Value for the frontend.

2. **Frontend Sanitization and Validation**:
   - In `src/lib/sessionStore.ts`, `persistableMeta` must include sanitized queued messages and queue status.
   - Ephemeral `previewUrl` blob URLs must be stripped; path-backed attachments retain paths; pathless pasted attachments preserve inline base64 data.
   - Restored queue entries from SQLite must be strictly validated before entering prompt composition. Malformed entries or orphan queue statuses (status present with no valid rows) must be dropped.
   - `persistFingerprint()` derives from `persistableMeta` + block tokens, ensuring disk writes trigger whenever queued messages or status change.
   - Transient states (`resuming`, `steering`) must persist/restore safely as `paused`, never as active cancellation.

3. **Queue Hold on Provider Failure**:
   - `canDispatchQueuedHead(session)`: returns false when `busy`, `paused`, `resuming`, `steering`, or `held`.
   - In `App.tsx` turn completion: if provider failure occurs (detected via `session.error` event or catch block rejection or provider failure text) and queued messages exist, set `queueStatus: "held"`.
   - On `onResumeQueue`: if `queueStatus === "held"`, simply transition to `"active"`, allowing the auto-dispatch effect to submit the head cleanly as a fresh turn. If `queueStatus === "paused"`, resume the interrupted turn as before.

4. **Non-Native Steer Cancellation Barrier**:
   - When clicking Steer on a queued row: if the session is busy and the harness cannot steer natively (e.g. Antigravity) or the message has `intent === "plan"`, initiate cancel-and-queue:
     - Reorder the selected queued message to head (preserving its ID, intent, cards, attachments).
     - Enter transient `steering` state (`busy: true`, `queueStatus: "steering"`).
     - Invalidate stale turn events with an incremented `turnGen`.
     - Request cancellation on all child harnesses (`cancelHarnessTurn`).
     - Await cancellation with `settleQueuedSteerCancellations` bounded by a 15-second grace period.
     - If all cancellations acknowledge: set `queueStatus: "active"`, `busy: false`, triggering auto-dispatch.
     - If cancellation fails or times out: set `queueStatus: "held"`, `busy: false`, emit `session.error`, requiring explicit Resume.
   - During `steering`: disable Steer, Edit, and Delete buttons; ignore duplicate Steer clicks; prevent `onStop` from racing.

5. **Forward Queued Intent**:
   - In `onSteerQueuedMessage`: forward `message.intent` alongside `text`, `attachments`, `noteCard`, `handoffCard`, and `queuedMessageId`.

## Discussion

- Why explicit pure helpers instead of a large reducer?
  The boundary between React session state and async Tauri commands is small: `beginQueuedSteerCancellation`, `finishQueuedSteerCancellation`, `canDispatchQueuedHead`, and `settleQueuedSteerCancellations`. Keeping these pure and functional makes them unit-testable without pulling in Redux-like boilerplate.
- Why 15 seconds grace period?
  Matches the cancellation timeout in child harness processes (CLI adapters may need a few seconds to exit cleanly or abort HTTP connections).
- Why `held` instead of `paused`?
  `paused` implies user-stopped mid-turn, where Resume attempts to continue the interrupted turn. `held` means a turn failed completely; Resume should dispatch the queued head as a fresh next turn.

## Implementation plan

1. **Version Identity**:
   - Update `package.json`, `package-lock.json`, root `Cargo.toml`, `Cargo.lock`, and `src-tauri/tauri.conf.json` to `0.1.35-local5-queue-durability`.
   - Verify `src-tauri/Cargo.toml` uses `version.workspace = true`.
2. **Session Types & Queue Status**:
   - In `src/lib/session.ts`: add `"steering" | "held"` to `MessageQueueStatus`.
3. **Queue Logic & Cancellation Helpers**:
   - In `src/lib/messageQueue.ts`: update `canDispatchQueuedHead` to check `"steering"` and `"held"`.
   - Implement `beginQueuedSteerCancellation`, `finishQueuedSteerCancellation`, `settleQueuedSteerCancellations`.
4. **Session Store & Persistence**:
   - In `src/lib/sessionStore.ts`: update `SessionRecord` and `SessionUpsertPayload`.
   - Implement `persistableQueuedMessages`, `restoreQueuedMessages`, `restoreQueueNote`, `restoreQueueHandoff`.
   - Normalize transient statuses to `"paused"` on save; drop orphan statuses on restore.
5. **Rust SQLite Migration & Upsert**:
   - In `src-tauri/src/session_store.rs`: add `queued_messages` and `queue_status` to `SessionUpsert` and `SessionRecord`.
   - Add columns in `migrate` under migration 12 and `ensure_session_column`.
   - Update `upsert_session` and `get_session` to handle `queued_messages_json` and `queue_status`.
   - Add Rust unit tests for migration 12, round-trip, empty queue clearing, and unknown status rejection.
6. **Composer & MessageQueue UI**:
   - In `src/chrome/Composer.tsx`: render `steering` status banner (`role="status"`, `aria-live="polite"`) and `held` status banner with Resume button.
   - Disable Steer/Edit/Delete buttons during `steering`.
   - Add accessibility labels.
7. **App Turn Lifecycle & Steer Wiring**:
   - In `src/App.tsx`:
     - Track `providerFailureSeen` on `session.error` or catch block.
     - In finally block: if `providerFailed && built.queuedMessages?.length`, set `queueStatus: "held"`.
     - In `onSteerQueuedMessage`: if busy and non-native or plan, run cancellation flow; forward `message.intent`.
     - In `onResumeQueue`: handle `"held"` by setting `queueStatus: "active"`.
     - In `onStop`: guard against `queueStatus === "steering"`.
8. **Regression Tests**:
   - Port/adapt `src/lib/queueDurability.test.ts`.
   - Expand `src/lib/messageQueue.test.ts` and `src/lib/sessionStore.test.ts`.
   - Ensure all TypeScript and Rust tests pass.
9. **Validation**:
   - Run focused tests, `tsc --noEmit`, `check:web`, `check:rust`, ESLint, `git diff --check`, `git status`.

## Todos

- [x] Update version identity to 0.1.35-local5-queue-durability
- [x] Implement session types and queue helpers (session.ts, messageQueue.ts)
- [x] Implement frontend persistence and validation (sessionStore.ts)
- [x] Implement Rust SQLite migration 12 and upsert (session_store.rs)
- [x] Implement MessageQueue UI state & accessibility (Composer.tsx)
- [x] Wire App failure hold, non-native Steer cancellation, intent forwarding (App.tsx)
- [x] Add unit tests (queueDurability.test.ts, messageQueue.test.ts, sessionStore.test.ts, session_store.rs)
- [x] Run full test suites and quality gates

## Issues in Dev (+ fixes)

1. **`recordToSession` omitted restore helper**: During initial TypeScript restore testing in `queueDurability.test.ts`, tests failed because `recordToSession` in `sessionStore.ts` had not been wired with `restoreQueuedMessages`. Fixed by calling `restoreQueuedMessages(record.queuedMessages)` and attaching `queueStatus` when valid.
2. **Duplicate `providerFailureSeen` variable in `App.tsx`**: Line 3766 already declared `let providerFailureSeen = false;` in `onSubmit`, causing a TS2451 compiler error on line 3783. Removed the redundant declaration.
3. **Rust migration 12 block placement**: Migration 12 was initially inserted inside the `current < 11` block during scripting. Corrected to place `if current < 12` in sequence after migration 11.

## Issues in Installed (+ fixes)

Installed candidate verified working by Nakul; no installed-runtime issues were reported.

## Learnings

- Keeping queue serialization away from the covering index (`sessions_cwd_cover_idx`) ensures sidebar listing and workspace switching maintain O(1) reads without deserializing queued message JSON blobs.
- Storing `NULL` for empty queues rather than `[]` keeps SQLite records compact and simplifies DB inspection and queries.

## Done

1. **Version Identity**:
   - Bumped `package.json`, `package-lock.json`, root `Cargo.toml`, `Cargo.lock`, and `src-tauri/tauri.conf.json` to `0.1.35-local5-queue-durability`.
   - Confirmed `src-tauri/Cargo.toml` uses `version.workspace = true`.
2. **Data Model & Helpers**:
   - Added `"steering" | "held"` to `MessageQueueStatus` in `src/lib/session.ts`.
   - Implemented `beginQueuedSteerCancellation`, `finishQueuedSteerCancellation`, `settleQueuedSteerCancellations`, and updated `canDispatchQueuedHead` in `src/lib/messageQueue.ts`.
3. **Persistence & Sanitization**:
   - Updated `SessionRecord` and `SessionUpsertPayload` in `src/lib/sessionStore.ts`.
   - Implemented `persistableQueuedMessages` (strips `previewUrl`, retains paths and pathless data), strict restore validation, orphan status dropping, and transient state normalization (`resuming`/`steering` -> `paused`).
4. **Rust SQLite Storage**:
   - Migration 12 in `src-tauri/src/session_store.rs` adds `queued_messages_json TEXT` and `queue_status TEXT`.
   - `upsert_session` stores `NULL` on empty queue and validates status (`active`, `paused`, `held`).
   - `get_session` deserializes JSON and returns structured records.
5. **UI & Accessibility**:
   - In `src/chrome/Composer.tsx`: status banners for `steering` (`role="status"`, `aria-live="polite"`) and `held` with Resume button.
   - Disabled Steer/Edit/Delete actions during `steering`.
6. **App Wiring**:
   - Failure hold on `session.error` or catch rejection in `src/App.tsx`.
   - Cancellation barrier for non-native steer or Plan mode.
   - Intent forwarding for queued follow-ups.
7. **Quality Gates Passed**:
   - `vitest run` (focused): 3 suites, 44 tests passed (0 failures).
   - `tsc --noEmit`: 0 errors.
   - `npm run check:web`: 151 test files, 1609 tests passed (0 failures), 0 TS errors.
   - `npm run check:rust`: `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, and `cargo test` (228 tests passed, 0 failures, 0 warnings).
   - `git diff --check`: 0 whitespace errors.
   - Read-only prototype `E:\Developing\OpenSource\mono-clone-queue` verified untouched.
   - Main repo `E:\Developing\OpenSource\mono-clone` verified clean.
   - Working tree in `E:\Developing\OpenSource\mono-clone-queue-local5` left uncommitted for Nakul's independent code review.

## Independent Review Findings (Correction Pass)

An independent review identified six concrete defects in the local5 queue-durability implementation:

1. **Defect 1: Queue mutations while busy not persisted**:
   - In `src/App.tsx`, persistence scheduling only scheduled writes when `!session.busy`, `parked`, `newlyBound`, or `newUserTurn`. If a session is busy, adding, editing, or deleting a queued row or changing queue status did not trigger a write until the entire turn finished.
   - *Correction*: Introduce `queuePersistFingerprint` and `isQueuePersistDirty` in `src/lib/sessionStore.ts` (or `src/lib/messageQueue.ts`) capturing sanitized queued messages and normalized durable queue status. In `src/App.tsx`, schedule persistence when the queue key changes even while busy, without writing on streaming transcript tokens. Keep per-session write serialization. If write fails, keep key uncommitted so it remains retryable. Initialize queue keys on session restore/import to avoid pointless writes.

2. **Defect 2: Race condition in failure-to-held transition**:
   - In `src/App.tsx` turn completion, `flushHarnessEvents()` applied `session.error` (which called `stopStreaming`, setting `busy: false`). Then `await flushSessionCheckpoint(sessionId)` was awaited *before* setting `queueStatus: "held"`. During this await window, the auto-dispatch effect saw `busy: false` with `queueStatus: "active"`, and could dispatch the next queued message into the broken turn.
   - *Correction*: Synchronously determine provider failure (structured `session.error`, direct provider rejection, or failure-text detection) and transition non-empty queues to `"held"` before any await or event loop yield. Update both `sessionsRef.current` and React state immediately. Deduplicate `providerFailureSeen` tracking between `routePlanEvent` and `onEvent`. Retain busy state on successful turns until checkpoint finishes to maintain ordering.

3. **Defect 3: SQLite queue JSON parse error hides session transcript**:
   - In `src-tauri/src/session_store.rs`, invalid `queued_messages_json` threw `FromSqlConversionFailure`, breaking `get_session` completely and hiding the user's transcript blocks.
   - *Correction*: In `get_session`, deserialize `queued_messages_json` safely using `.ok()`. If invalid, treat as absent (`None`) and clear `queue_status` to `None`, while keeping `blocks_json` and `model_settings` strictly validated. Add Rust regression test with corrupted queue JSON.

4. **Defect 4: Unsendable restored queue rows accepted**:
   - `restoreQueuedMessages` in `src/lib/sessionStore.ts` accepted rows with empty text and no attachments, or attachments with neither path nor inline data.
   - *Correction*: Require attachments to have a non-empty path OR non-empty inline data. Require restored queued messages to have non-whitespace text, at least one valid attachment, a valid note card, or a valid handoff card. If all rows are dropped, drop `queueStatus` as well.

5. **Defect 5: Editing not locked during steering**:
   - `beginQueuedSteerCancellation` only cleared `editingQueuedMessageId` if the edited row was the steer row. If another row was edited, its edit state remained active. Also `MessageQueue` did not exit local edit state when status transitioned to `"steering"`.
   - *Correction*: In `beginQueuedSteerCancellation`, clear `editingQueuedMessageId` unconditionally. In `MessageQueue` (`Composer.tsx`), exit local edit state when status becomes `steering`. Guard all edit, save, cancel, steer, and delete actions against `steering`.

6. **Defect 6: UTF-8 BOM in messageQueue.ts**:
   - `src/lib/messageQueue.ts` has a UTF-8 BOM (`EF BB BF`).
   - *Correction*: Strip the BOM, ensuring all modified `.ts`/`.tsx` files are clean UTF-8 without BOM.

## Second Independent-Review Correction Pass

A follow-up independent review verified that while Defects 3, 4, and 6 were completely resolved, subtle runtime gaps remained in Defects 1, 2, and 5:

1. **Defect 1 — Queue persistence timer starved by streaming**:
   - In src/App.tsx, persistence used a 650 ms timer returned from a useEffect keyed on sessions. Every streaming token update caused cleanup to call window.clearTimeout(timer), starving the write indefinitely while busy. Also, failed writes had no autonomous retry.
   - *Correction*:
     - Create an extracted, production-used QueueDurabilityScheduler in src/lib/queueDurability.ts.
     - Track per-session durable queue fingerprints (persistedKey, inFlightKey, scheduledTimer, etryCount).
     - Schedule bounded-latency writes (e.g. 400ms) on queue mutations regardless of whether the session is busy or continuously streaming tokens.
     - Never reset or postpone the scheduled queue write deadline when assistant blocks receive streaming tokens.
     - On successful upsert, commit only the matching persisted fingerprint (protecting against newer snapshots).
     - On failed upsert, leave dirty and schedule an autonomous exponential backoff retry.
     - Emptying the queue writes the clearing payload, clearing queued_messages_json and queue_status to NULL in SQLite.
     - Streaming-only updates must not trigger busy SQLite writes.
     - Wire QueueDurabilityScheduler directly into src/App.tsx and initialize correctly on restore/import.
     - Add tests using fake timers proving bounded write time during continuous streaming, non-resetting deadlines, autonomous retries on failure, version isolation, and clearing payloads.

2. **Defect 2 — Failure-to-held race remains unchanged**:
   - In src/App.tsx, inally ran lushHarnessEvents(), which applied session.error (calling stopStreaming and setting usy: false), and then awaited lushSessionCheckpoint(sessionId) before setting queueStatus: "held". During the await, auto-dispatch could fire next queued items into a broken session.
   - In addition, inalizeTurnSession in src/lib/messageQueue.ts was not wired to production, and providerFailureSeen was set redundantly in both outePlanEvent and onEvent.
   - *Correction*:
     - Deduplicate providerFailureSeen to a single path (outePlanEvent and catch block).
     - Provide orchestrateTurnCompletion in src/lib/messageQueue.ts and call it directly in src/App.tsx.
     - Synchronously inspect the latest session after lushHarnessEvents().
     - Determine failure via observed session.error, send rejection, or isProviderFailureText.
     - If failed: synchronously finalize turn via inalizeTurnSession, setting queue to "held", setting usy: false, and updating sessionsRef.current, React state, and dock/badge state BEFORE any wait, Promise, or yield. Only then await lushSessionCheckpoint.
     - If successful: preserve usy: true until lushSessionCheckpoint completes, then finalize normally.
     - Add orchestration tests verifying synchronous non-dispatchability during failure and checkpoint hold on success.

3. **Defect 5 — Editing transition remains partially unlocked**:
   - In MessageQueue (src/chrome/Composer.tsx), editingId and editDraft were not cleared when status became steering, causing the old editor to reappear when steering completed.
   - In src/App.tsx, onEditQueuedMessage and onQueuedMessageEditingChange were not guarded against session.queueStatus === "steering".
   - *Correction*:
     - In MessageQueue, when status === "steering", immediately clear local editingId and editDraft, and notify parent via onEditingChange(undefined) if an edit was active.
     - Guard all edit, save, cancel, delete, and steer handlers against steering.
     - In src/App.tsx, guard onDeleteQueuedMessage, onEditQueuedMessage, and onQueuedMessageEditingChange against session.queueStatus === "steering" using clean conditionals without compressed nested ternaries.
     - Add transition-capable test: active queue -> enter edit mode -> props to steering -> editor closes -> props to active -> stale editor does not reappear.
     - Add callback-level tests proving late save/edit notifications cannot mutate a session after entering steering.


## Final Queue-Persistence Integration Cleanup

A final architectural review identified three integration cleanup requirements for production queue durability:

1. **Remaining Issue 1 — Duplicate Production Queue Persistence Owners**:
   - src/App.tsx had two schedulers attempting to persist queue changes: QueueDurabilityScheduler and the legacy pendingPersist effect (which checked queueDirty and passed obsolete-last-queue-key to shouldScheduleSessionPersist).
   - *Correction*:
     - Make QueueDurabilityScheduler the single owner for queue-triggered durability writes.
     - Preserve the normal transcript/session persistence path in pendingPersist for idle transcript settlement, parked sessions, newly bound sessions, new user turns, and normal metadata changes.
     - The normal persistence path serializes complete session state (including the queue if present), but will never independently schedule writes solely due to queue fingerprint changes (obsolete-last-queue-key removed from shouldScheduleSessionPersist, queueDirty removed from pendingPersist).
     - When a normal transcript write completes successfully, safely notify QueueDurabilityScheduler of the exact queue fingerprint written (setPersistedKey(session.id, queueKeyWritten)), without marking newer queue snapshots as persisted.
     - Remove obsolete lastPersistedQueue state from App.tsx as QueueDurabilityScheduler now singularly tracks per-session queue persisted keys.
     - Add integration/state-machine test verifying that a queue mutation triggers exactly one queue-triggered write rather than duplicate writes from both schedulers.

2. **Remaining Issue 2 — Enforce One In-Flight Scheduler Write**:
   - In QueueDurabilityScheduler, inFlightKey was recorded but not checked to block concurrent duplicate writes.
   - *Correction*:
     - Enforce at most one scheduler-owned write in flight per session (if (track.inFlightKey !== null) return;).
     - If currentKey === track.inFlightKey, do not schedule another write.
     - If the queue mutates to a newer key while a write is in flight, retain newer state as dirty, suppress concurrent writes, and on completion coalesce to a single follow-up write for the latest snapshot.
     - On failure, clear inFlightKey, retain dirty state, and autonomously retry with exponential backoff on the latest snapshot.
     - setPersistedKey reconciles safely: updates persistedKey to the written key, cancels unnecessary pending timers if the current queue is now persisted, and schedules a follow-up if the session moved to a newer dirty key.
     - Add fake-timer and deferred-Promise tests verifying non-concurrency for slow writes, duplicate suppression during in-flight writes, mutation coalescing (V1 in flight -> V2 & V3 -> V1 completes -> single V3 write), failure retry with mutation, and truthful status flags.

3. **Remaining Issue 3 — Scheduler Lifecycle Cleanup**:
   - QueueDurabilityScheduler.dispose() was never called on App unmount.
   - *Correction*:
     - Add an App-level unmount effect (useEffect(() => () => queueSchedulerRef.current?.dispose(), [])) with an empty dependency array so it only fires on true unmount, never on sessions state changes.
     - Ensure dispose() cancels all pending and retry timers, sets disposed = true, prevents in-flight completions from invoking onPersisted, and prevents post-unmount React state updates.
     - Add tests verifying dispose() cancels pending retries and suppresses completion callbacks from already-running writes.


## Final Strict Mode Lifecycle and Persistence Reconciliation Corrections

Before local5 dev-mode testing, an independent review identified three additional lifecycle and reconciliation findings:

1. **Finding 1 — React Strict Mode Scheduler Lifecycle During Dev Remount**:
   - In development, React Strict Mode executes setup -> cleanup -> setup.
   - The initial cleanup previously disposed QueueDurabilityScheduler, and the second setup did not recreate it. As a result, observeSession() returned immediately because disposed === true, leaving all subsequent queue mutations unpersisted in dev mode.
   - *Correction*:
     - Make scheduler lifecycle safe under Strict Mode double-invocation.
     - Provide an explicit scheduler factory and accessor getOrCreateScheduler().
     - On effect setup, ensure an active scheduler exists. If missing or disposed, recreate a fresh active instance.
     - When recreating after Strict Mode cleanup, assign the new instance to queueSchedulerRef.current, safely transfer known persisted keys from the disposed instance (getPersistedKeys()), and observe current sessions (observeSession(session)).
     - Do not assume unpersisted queued items are durable.
     - Effect cleanup captures the exact scheduler instance created or active during that setup closure (eturn () => scheduler.dispose()), ensuring genuine unmount cancels timers and suppresses in-flight callbacks.
     - Add a regression test verifying the 6-step lifecycle: setup -> cleanup -> setup -> mutation -> timer advancement -> successful persistence by the recreated active scheduler.

2. **Finding 2 — Reconcile Queue State in Every Ordinary Successful Persistence Path**:
   - Ordinary user-turn and direct persistence via persistSession() in src/App.tsx did not notify QueueDurabilityScheduler upon successful writes.
   - *Correction*:
     - In persistSession(), capture the exact queue fingerprint of the session snapshot passed to upsertSession().
     - Upon successful write resolution, notify queueSchedulerRef.current?.setPersistedKey(session.id, queueKeyWritten).
     - Reconcile in other direct open-session persistence paths (e.g. 	oggleSessionPinned).
     - Rely on QueueDurabilityScheduler.setPersistedKey() to cancel redundant scheduled timers if the current queue matches, or schedule a follow-up if newer unpersisted mutations occurred while the write was in flight.
     - Add tests proving:
       1. Successful user-turn persistence containing the current queue cancels duplicate scheduler writes.
       2. Queue mutations while a normal write is in flight only mark the written key durable and cause the scheduler to persist the newer snapshot.
       3. Auto-dispatch dequeue followed by user turn persistence does not generate duplicate identical queue writes.

3. **Finding 3 — Remove Stale Test-Only API Usage**:
   - Remove obsolete obsolete-last-queue-key: currentQueueKey argument from shouldScheduleSessionPersist() in src/lib/queueDurability.test.ts.
   - Verify zero occurrences of obsolete-last-queue-key remain across the entire codebase.


## Independent Review Verdict & Installer Candidate Decision

### Independent Review Verdict (Passed)
All independent review findings and edge cases have been resolved and verified with zero code-level blockers:
- **Focused queue & durability test suite**: 93 passed (38 queueDurability, 28 messageQueue, 6 MessageQueue, 21 sessionStore).
- **Full web test suite**: 152 test files passed, 1,658 vitest tests passed.
- **TypeScript compilation**: Clean (0 errors via 
px tsc --noEmit).
- **Rust test suite**: 225 passed, 4 ignored, 0 failed (cargo test).
- **Rust formatting & Clippy**: Clean (cargo fmt --check and cargo clippy --workspace --all-targets -- -D warnings).
- **Whitespace hygiene**: Clean (git diff --check passed).
- **Stale API search**: Zero occurrences of lastQueueKey remain across the entire worktree.
- **ESLint status**: ESLint 10.10.0 reported exit code 1 due to missing eslint.config.* (pre-existing repo tooling state; no packages or configs added).

### Installed Candidate Phase Authorization
- **Decision**: Nakul explicitly authorized committing the completed Local5 implementation on eature/queue-durability-local5, pushing only to the personal fork remote, and building the unsigned Local5 Windows NSIS installer candidate (
pm run build:windows).
- **Rationale**: Restart, abnormal termination, and task-kill queue durability are most realistically and meaningfully validated in the installed desktop runtime environment.
- **Pending Milestones**:
  - Installed-runtime manual verification matrix (restart, task-kill, auto-dispatch dequeue, cancellation, prompt editing).
  - Issues in Installed (to be recorded during manual runtime testing).
  - Final review verdict and sign-off by Nakul.
  - Final merge into 
akul/windows-support, tag creation/push, and release close-out.


## Installer Candidate Build (0.1.35-local5-queue-durability)

- **Build Date**: 11 September 2026, 21:58 IST
- **Branch**: `feature/queue-durability-local5`
- **Base**: `81ade2043cbb1835246e745a64be37297dea976a`
- **Head Commit**: `06e36683325d954f9a8f3cf2f7fd1bda568567da`
- **Remote Push**: `personal/feature/queue-durability-local5` (pushed; zero pushes to `origin`)
- **Installer Binary**:
  - Path: `E:\Developing\Installable versions\MonoCode_0.1.35-local5-queue-durability_x64-setup.exe`
  - Bundle Path: `E:\Developing\OpenSource\mono-clone-queue-local5\target\release\bundle\nsis\MonoCode_0.1.35-local5-queue-durability_x64-setup.exe`
  - File Size: 9,403,036 bytes (8.97 MB)
  - SHA-256: `5F4BE05AEEE193C346304EAF4867E6256BF854757A1BEC6C718FA0CAED0541DF`

### Commit Slices
1. `8ebde6d`: `feat(session): persist queued messages across restarts in sqlite schema v12`
2. `ae0c675`: `feat(queue): add QueueDurabilityScheduler with debounced persistence, in-flight barrier, and retry`
3. `a8928e3`: `feat(queue): orchestrate steer cancellation, queue lifecycle holds, and App integration`
4. `06e3668`: `chore(release): bump version to 0.1.35-local5-queue-durability`

#### Installed-Runtime Testing Status (Verified & Approved)
- **Status**: Done (verified working and approved for integration by Nakul).
- **Installed-runtime verdict**: The installed version is working; Local5 is approved for integration and final closeout.
- **Issues in Installed**: Installed candidate verified working by Nakul; no installed-runtime issues were reported.
- **Closure Gates**:
  - Issues in Installed: No issues reported.
  - Installed-runtime verdict: Installed candidate verified working by Nakul; no installed-runtime issues were reported.
  - Merge into `nakul/windows-support`: Approved and executed via fast-forward.
  - Release tag and close-out: `v0.1.35-local5-queue-durability` pushed to `personal`.
