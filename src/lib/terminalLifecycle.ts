/**
 * Explicit terminal-start lifecycle.
 *
 * Saved terminal records are metadata, not live shells: a cold boot must not
 * spawn anything from them. A shell starts only when the user deliberately
 * starts that terminal (new terminal, explicit panel show, dormant tab
 * select, Start/Restart/Retry action). This module is the single in-memory
 * owner of that intent. Nothing here is persisted: after a process restart
 * every terminal is dormant again until the user starts it.
 *
 * `TerminalView` renders a dormant placeholder until `isTerminalStarted(id)`
 * is true, then mounts the live xterm view whose effect spawns exactly once
 * via `requestTerminalStart` (concurrent callers share one spawn promise).
 * Hiding, switching projects/tabs, blur, and unrelated renders never touch
 * this state, so running shells keep running. Closing a terminal calls
 * `forgetTerminal`, which lets the view cleanup kill the (possibly pending)
 * child without harming a Strict Mode remount that still wants it.
 */

type SpawnFn = () => Promise<void>;

const wanted = new Set<string>();
const starting = new Map<string, Promise<void>>();
const live = new Set<string>();
/** Spawn failure message by id. While present, only an explicit retry spawns. */
const failed = new Map<string, string>();
/** Exit state survives a view remount for the current app session. */
const exited = new Map<string, number | null>();
const listeners = new Set<() => void>();
let version = 0;

function emit(): void {
  version += 1;
  for (const listener of listeners) listener();
}

export function subscribeTerminalLifecycle(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getTerminalLifecycleSnapshot(): number {
  return version;
}

/** Record explicit user intent to run this terminal. Idempotent. */
export function startTerminal(id: string): void {
  if (!id) return;
  if (wanted.has(id)) return;
  wanted.add(id);
  emit();
}

/** True once the user has started this terminal (including while pending). */
export function isTerminalStarted(id: string): boolean {
  return wanted.has(id);
}

/** Alias for cleanup guards: nobody wants this id anymore, so kill it. */
export function isTerminalWanted(id: string): boolean {
  return wanted.has(id);
}

/** True when a spawn for this terminal already succeeded this session. */
export function hasTerminalSpawned(id: string): boolean {
  return live.has(id);
}

/** Exit code for a shell that ended during this app session, if any. */
export function terminalExitCode(id: string): number | null | undefined {
  return exited.get(id);
}

/** Persist process exit so reattaching views can offer Restart. */
export function markTerminalExited(id: string, code: number | null): void {
  exited.set(id, code);
  emit();
}

/**
 * Run `spawn` for `id`, deduplicating concurrent callers onto one promise.
 * Marks the id wanted. On success the id is live (unless it was forgotten
 * while pending, e.g. closed before the backend answered — the caller
 * cleanup then kills the orphan). On failure nothing is marked live, so an
 * explicit retry may spawn again. With `force`, a fresh spawn runs even when
 * already live (explicit Restart after exit); pending spawns still dedupe.
 */
export function requestTerminalStart(
  id: string,
  spawn: SpawnFn,
  options?: { force?: boolean },
): Promise<void> {
  if (!wanted.has(id)) {
    wanted.add(id);
  }
  const pending = starting.get(id);
  if (pending) return pending;
  if (!options?.force && exited.has(id)) return Promise.resolve();
  if (!options?.force && live.has(id)) return Promise.resolve();
  if (!options?.force && failed.has(id)) {
    return Promise.reject(new Error(failed.get(id) ?? "Terminal failed to start."));
  }
  let task: Promise<void>;
  try {
    task = spawn().then(
      () => {
        starting.delete(id);
        failed.delete(id);
        if (wanted.has(id)) live.add(id);
        emit();
      },
      (error: unknown) => {
        starting.delete(id);
        failed.set(id, error instanceof Error ? error.message : String(error));
        emit();
        throw error;
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    failed.set(id, message);
    emit();
    return Promise.reject(error);
  }
  starting.set(id, task);
  emit();
  return task;
}

/** Last spawn failure for `id`, if an explicit retry is owed. */
export function terminalSpawnError(id: string): string | null {
  return failed.get(id) ?? null;
}

/**
 * Explicit retry after a failed spawn: clears the failure latch and runs a
 * fresh spawn (still deduped while pending).
 */
export function retryTerminalStart(id: string, spawn: SpawnFn): Promise<void> {
  failed.delete(id);
  exited.delete(id);
  return requestTerminalStart(id, spawn, { force: true });
}

/**
 * Drop all lifecycle state for `id` (explicit close). The view cleanup kills
 * the resulting child when a pending spawn settles; a still-mounted remount
 * (Strict Mode setup/cleanup/setup) keeps `wanted` only when it re-requests.
 */
export function forgetTerminal(id: string): void {
  if (!id) return;
  let changed = false;
  if (wanted.delete(id)) changed = true;
  if (live.delete(id)) changed = true;
  if (failed.delete(id)) changed = true;
  if (exited.delete(id)) changed = true;
  if (changed) emit();
}

/** Test seam. */
export function resetTerminalLifecycle(): void {
  wanted.clear();
  starting.clear();
  live.clear();
  failed.clear();
  exited.clear();
  version = 0;
}
