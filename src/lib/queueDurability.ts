import type { Session } from "./session";
import type { SessionSummary } from "./sessionStore";
import {
  queuePersistFingerprint,
  shouldPersistSession,
  upsertSession,
} from "./sessionStore";

export interface QueueDurabilitySchedulerOptions {
  getSession: (sessionId: string) => Session | undefined;
  writeSession?: (session: Session) => Promise<SessionSummary | null>;
  onPersisted?: (session: Session, summary: SessionSummary) => void;
  debounceMs?: number;
  baseRetryMs?: number;
  maxRetryMs?: number;
}

interface SessionQueueTrack {
  persistedKey: string;
  inFlightKey: string | null;
  inFlightPromise: Promise<void> | null;
  scheduledTimer: ReturnType<typeof setTimeout> | null;
  retryCount: number;
}

/**
 * Manages per-session durability scheduling for queued messages.
 * Operates with bounded latency independently of transcript streaming renders.
 * Enforces at most one in-flight write per session and coalesces intermediate mutations.
 */
export class QueueDurabilityScheduler {
  private readonly getSession: (sessionId: string) => Session | undefined;
  private readonly writeSession: (session: Session) => Promise<SessionSummary | null>;
  private readonly onPersisted?: (session: Session, summary: SessionSummary) => void;
  private readonly debounceMs: number;
  private readonly baseRetryMs: number;
  private readonly maxRetryMs: number;
  private readonly tracks = new Map<string, SessionQueueTrack>();
  private disposed = false;

  constructor(options: QueueDurabilitySchedulerOptions) {
    this.getSession = options.getSession;
    this.writeSession = options.writeSession ?? upsertSession;
    this.onPersisted = options.onPersisted;
    this.debounceMs = options.debounceMs ?? 400;
    this.baseRetryMs = options.baseRetryMs ?? 500;
    this.maxRetryMs = options.maxRetryMs ?? 5000;
  }

  public initSession(sessionId: string, initialQueueKey: string): void {
    if (this.disposed) return;
    const existing = this.tracks.get(sessionId);
    if (existing) {
      existing.persistedKey = initialQueueKey;
      return;
    }
    this.tracks.set(sessionId, {
      persistedKey: initialQueueKey,
      inFlightKey: null,
      inFlightPromise: null,
      scheduledTimer: null,
      retryCount: 0,
    });
  }

  public setPersistedKey(sessionId: string, queueKey: string): void {
    if (this.disposed) return;
    const track = this.tracks.get(sessionId);
    if (!track) {
      this.initSession(sessionId, queueKey);
      const currentSession = this.getSession(sessionId);
      const currentKey =
        currentSession && shouldPersistSession(currentSession)
          ? queuePersistFingerprint(currentSession)
          : undefined;
      if (currentKey !== undefined && currentKey !== queueKey) {
        this.scheduleWrite(sessionId, this.debounceMs);
      }
      return;
    }

    const currentSession = this.getSession(sessionId);
    const currentKey =
      currentSession && shouldPersistSession(currentSession)
        ? queuePersistFingerprint(currentSession)
        : undefined;

    // Safely reconcile:
    if (currentKey !== undefined && currentKey === queueKey) {
      track.persistedKey = queueKey;
      track.retryCount = 0;
      if (track.scheduledTimer !== null && track.inFlightKey === null) {
        clearTimeout(track.scheduledTimer);
        track.scheduledTimer = null;
      }
    } else {
      // Normal write persisted queueKey, but session has moved to a newer dirty key.
      track.persistedKey = queueKey;
      if (
        track.inFlightKey === null &&
        track.scheduledTimer === null &&
        currentKey !== undefined
      ) {
        this.scheduleWrite(sessionId, this.debounceMs);
      }
    }
  }

  public getPersistedKey(sessionId: string): string | undefined {
    return this.tracks.get(sessionId)?.persistedKey;
  }

  public getPersistedKeys(): Map<string, string> {
    const keys = new Map<string, string>();
    for (const [id, track] of this.tracks) {
      if (track.persistedKey) {
        keys.set(id, track.persistedKey);
      }
    }
    return keys;
  }

  public isDirty(sessionId: string): boolean {
    const session = this.getSession(sessionId);
    if (!session || !shouldPersistSession(session)) return false;
    const track = this.tracks.get(sessionId);
    const persistedKey = track?.persistedKey ?? "";
    const currentKey = queuePersistFingerprint(session);
    return currentKey !== persistedKey;
  }

  public isScheduled(sessionId: string): boolean {
    return (this.tracks.get(sessionId)?.scheduledTimer ?? null) !== null;
  }

  public isInFlight(sessionId: string): boolean {
    return (this.tracks.get(sessionId)?.inFlightKey ?? null) !== null;
  }

  public isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Called on session updates. If queue state changed, schedules a bounded write.
   * Enforces at most one in-flight write and suppresses duplicate timers.
   */
  public observeSession(session: Session): void {
    if (this.disposed || !shouldPersistSession(session)) return;
    let track = this.tracks.get(session.id);
    if (!track) {
      track = {
        persistedKey: "",
        inFlightKey: null,
        inFlightPromise: null,
        scheduledTimer: null,
        retryCount: 0,
      };
      this.tracks.set(session.id, track);
    }

    const currentKey = queuePersistFingerprint(session);
    if (currentKey === track.persistedKey) {
      // Transcript-only update or already clean queue; do not schedule.
      return;
    }

    // If the current queue key equals inFlightKey, do not schedule another write.
    if (currentKey === track.inFlightKey) {
      return;
    }

    // If a write is currently in flight, do not start or schedule a concurrent write.
    // Intermediate mutations will coalesce when the in-flight write completes.
    if (track.inFlightKey !== null) {
      return;
    }

    // A queue mutation occurred. If a timer is already running towards its deadline,
    // do not postpone or cancel it.
    if (track.scheduledTimer !== null) {
      return;
    }

    this.scheduleWrite(session.id, this.debounceMs);
  }

  public scheduleWrite(sessionId: string, delayMs: number): void {
    if (this.disposed) return;
    const track = this.tracks.get(sessionId);
    if (!track) return;
    if (track.scheduledTimer !== null) {
      clearTimeout(track.scheduledTimer);
    }
    track.scheduledTimer = setTimeout(() => {
      void this.executeWrite(sessionId);
    }, delayMs);
  }

  public async executeWrite(sessionId: string): Promise<void> {
    if (this.disposed) return;
    const track = this.tracks.get(sessionId);
    if (!track) return;

    // Enforce at most one scheduler-owned write in flight per session.
    if (track.inFlightKey !== null) {
      return;
    }

    if (track.scheduledTimer !== null) {
      clearTimeout(track.scheduledTimer);
      track.scheduledTimer = null;
    }

    const currentSession = this.getSession(sessionId);
    if (!currentSession || !shouldPersistSession(currentSession)) {
      this.tracks.delete(sessionId);
      return;
    }

    const targetKey = queuePersistFingerprint(currentSession);
    if (targetKey === track.persistedKey) {
      return;
    }

    track.inFlightKey = targetKey;

    const writePromise = (async () => {
      try {
        const summary = await this.writeSession(currentSession);
        if (this.disposed) return;
        if (summary) {
          // On success: commit only the completed target key.
          track.persistedKey = targetKey;
          track.inFlightKey = null;
          track.retryCount = 0;
          this.onPersisted?.(currentSession, summary);

          // Coalesce intermediate mutations: inspect latest snapshot after completion
          const latest = this.getSession(sessionId);
          if (latest && shouldPersistSession(latest)) {
            const latestKey = queuePersistFingerprint(latest);
            if (latestKey !== track.persistedKey) {
              this.scheduleWrite(sessionId, this.debounceMs);
            }
          }
        } else {
          this.handleWriteFailure(sessionId);
        }
      } catch {
        if (this.disposed) return;
        this.handleWriteFailure(sessionId);
      } finally {
        track.inFlightPromise = null;
      }
    })();

    track.inFlightPromise = writePromise;
    await writePromise;
  }

  private handleWriteFailure(sessionId: string): void {
    const track = this.tracks.get(sessionId);
    if (!track) return;
    track.inFlightKey = null;
    track.retryCount += 1;

    // Autonomous retry with bounded exponential backoff while state remains dirty
    const latest = this.getSession(sessionId);
    if (latest && shouldPersistSession(latest)) {
      const latestKey = queuePersistFingerprint(latest);
      if (latestKey !== track.persistedKey) {
        const delay = Math.min(
          this.baseRetryMs * Math.pow(2, track.retryCount - 1),
          this.maxRetryMs,
        );
        this.scheduleWrite(sessionId, delay);
      }
    }
  }

  public async flush(sessionId: string): Promise<void> {
    const track = this.tracks.get(sessionId);
    if (!track) return;
    if (track.inFlightPromise) {
      await track.inFlightPromise;
    }
    if (track.scheduledTimer !== null) {
      clearTimeout(track.scheduledTimer);
      track.scheduledTimer = null;
    }
    await this.executeWrite(sessionId);
  }

  public removeSession(sessionId: string): void {
    const track = this.tracks.get(sessionId);
    if (track?.scheduledTimer !== null && track?.scheduledTimer !== undefined) {
      clearTimeout(track.scheduledTimer);
    }
    this.tracks.delete(sessionId);
  }

  public trackedSessionIds(): string[] {
    return Array.from(this.tracks.keys());
  }

  public dispose(): void {
    this.disposed = true;
    for (const track of this.tracks.values()) {
      if (track.scheduledTimer !== null) {
        clearTimeout(track.scheduledTimer);
        track.scheduledTimer = null;
      }
    }
  }
}
