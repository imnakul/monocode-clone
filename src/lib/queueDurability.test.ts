import { QueueDurabilityScheduler } from "./queueDurability";
import { describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  getSession,
  persistFingerprint,
  queuePersistFingerprint,
  restoreQueuedMessages,
  sanitizeSessionForPersist,
  shouldScheduleSessionPersist,
  upsertSession,
} from "./sessionStore";
import { newSession, type MessageQueueStatus, type QueuedMessage } from "./session";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

describe("queue durability", () => {
  it("preserves a pasted image payload through save and restore", async () => {
    const session = newSession("codex", "/tmp/project");
      session.blocks = [{ id: "u1", role: "user", text: "initial prompt" }];
    session.queuedMessages = [
      {
        id: "q",
        text: "inspect",
        attachments: [
          {
            id: "a",
            name: "paste.png",
            mimeType: "image/png",
            kind: "image",
            size: 3,
            data: "YWJj",
            previewUrl: "blob:ephemeral",
          },
        ],
      },
    ];
    const saved = sanitizeSessionForPersist(session);
    vi.mocked(invoke).mockResolvedValueOnce(saved);
    const restored = await getSession(session.id);
    expect(restored?.queuedMessages?.[0].attachments[0].data).toBe("YWJj");
    expect(
      restored?.queuedMessages?.[0].attachments[0].previewUrl,
    ).toBeUndefined();
  });

  it.each<MessageQueueStatus>(["paused", "held", "resuming", "steering"])(
    "preserves %s as a safe stop across restart",
    async (queueStatus) => {
      const session = newSession("codex", "/tmp/project");
      session.blocks = [{ id: "u1", role: "user", text: "initial prompt" }];
      session.queuedMessages = [{ id: "q", text: "next", attachments: [] }];
      const activeFingerprint = persistFingerprint(session);
      session.queueStatus = queueStatus;
      const saved = sanitizeSessionForPersist(session);
      vi.mocked(invoke).mockResolvedValueOnce(saved);
      expect((await getSession(session.id))?.queueStatus).toBe(
        queueStatus === "resuming" || queueStatus === "steering"
          ? "paused"
          : queueStatus,
      );
      expect(persistFingerprint(session)).not.toBe(activeFingerprint);
    },
  );

  it("drops an orphan queue status when no valid queued row survives restore", async () => {
    const session = newSession("codex", "/tmp/project");
      session.blocks = [{ id: "u1", role: "user", text: "initial prompt" }];
    const saved = sanitizeSessionForPersist(session);
    vi.mocked(invoke).mockResolvedValueOnce({
      ...saved,
      queuedMessages: [{ id: "", text: "invalid", attachments: [] }],
      queueStatus: "held",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const restored = await getSession(session.id);

    expect(restored?.queuedMessages).toBeUndefined();
    expect(restored?.queueStatus).toBeUndefined();
  });

  it("round-trips queued plan, note, and handoff metadata", async () => {
    const session = newSession("codex", "/tmp/project");
      session.blocks = [{ id: "u1", role: "user", text: "initial prompt" }];
    session.queuedMessages = [
      {
        id: "q",
        text: "plan the next step",
        attachments: [],
        intent: "plan",
        noteCard: {
          id: "note-1",
          slug: "decision",
          title: "Decision",
          body: "Preserve this note",
          sourceCwd: "/tmp/source",
        },
        handoffCard: {
          from: "claude",
          to: "codex",
          brief: "Continue the migration",
          request: "Verify first",
          files: 3,
        },
      },
    ];
    const saved = sanitizeSessionForPersist(session);
    vi.mocked(invoke).mockResolvedValueOnce({
      ...saved,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const restored = await getSession(session.id);

    expect(restored?.queuedMessages?.[0]).toEqual(session.queuedMessages[0]);
  });
});


describe("queue persistence while busy and dirty tracking (Defect 1)", () => {
  it("tracks busy session queue changes via QueueDurabilityScheduler rather than transcript scheduler", () => {
    const session = newSession("claude", "/tmp/project");
    session.blocks = [{ id: "u1", role: "user", text: "hello" }];
    session.busy = true;
    session.queuedMessages = [{ id: "q1", text: "step 1", attachments: [] }];
    session.queueStatus = "active";

    const scheduler = new QueueDurabilityScheduler({ getSession: () => session });
    scheduler.initSession(session.id, "");

    // Queue scheduler identifies the queue mutation as dirty
    expect(scheduler.isDirty(session.id)).toBe(true);

    // Ordinary transcript scheduler does NOT independently schedule solely for queue changes while busy
    const shouldSchedule = shouldScheduleSessionPersist({
      session,
      hasPersistedBefore: true,
    });
    expect(shouldSchedule).toBe(false);
  });

  it("does not count streaming-only block changes as queue changes", () => {
    const session = newSession("claude", "/tmp/project");
    session.blocks = [{ id: "u1", role: "user", text: "hello" }];
    session.busy = true;
    session.queuedMessages = [{ id: "q1", text: "step 1", attachments: [] }];
    session.queueStatus = "active";

    const currentQueueKey = queuePersistFingerprint(session);

    // Streaming token arrives and adds/modifies blocks:
    session.blocks = [
      { id: "b1", role: "assistant", text: "partial streaming token", streaming: true },
    ];

    const shouldSchedule = shouldScheduleSessionPersist({
      session,
      hasPersistedBefore: true,
    });

    // Busy session with identical queue key must NOT be scheduled for write
    expect(shouldSchedule).toBe(false);
    expect(queuePersistFingerprint(session)).toBe(currentQueueKey);
  });

  it("changes the queue key when editing queued text", () => {
    const session = newSession("claude", "/tmp/project");
    session.queuedMessages = [{ id: "q1", text: "initial draft", attachments: [] }];
    const initialKey = queuePersistFingerprint(session);

    session.queuedMessages[0].text = "edited text";
    const editedKey = queuePersistFingerprint(session);

    expect(editedKey).not.toBe(initialKey);
  });

  it("changes the queue key when reordering rows", () => {
    const session = newSession("claude", "/tmp/project");
    session.queuedMessages = [
      { id: "q1", text: "first", attachments: [] },
      { id: "q2", text: "second", attachments: [] },
    ];
    const initialKey = queuePersistFingerprint(session);

    session.queuedMessages = [
      { id: "q2", text: "second", attachments: [] },
      { id: "q1", text: "first", attachments: [] },
    ];
    const reorderedKey = queuePersistFingerprint(session);

    expect(reorderedKey).not.toBe(initialKey);
  });

  it("changes the durable key when active transitions to held or paused", () => {
    const session = newSession("claude", "/tmp/project");
    session.queuedMessages = [{ id: "q1", text: "step", attachments: [] }];
    session.queueStatus = "active";
    const activeKey = queuePersistFingerprint(session);

    session.queueStatus = "held";
    const heldKey = queuePersistFingerprint(session);
    expect(heldKey).not.toBe(activeKey);

    session.queueStatus = "paused";
    const pausedKey = queuePersistFingerprint(session);
    expect(pausedKey).not.toBe(activeKey);
    expect(pausedKey).not.toBe(heldKey);
  });

  it("normalizes steering and resuming to the same restart-safe representation as paused", () => {
    const session = newSession("claude", "/tmp/project");
    session.queuedMessages = [{ id: "q1", text: "step", attachments: [] }];

    session.queueStatus = "paused";
    const pausedKey = queuePersistFingerprint(session);

    session.queueStatus = "steering";
    const steeringKey = queuePersistFingerprint(session);
    expect(steeringKey).toBe(pausedKey);

    session.queueStatus = "resuming";
    const resumingKey = queuePersistFingerprint(session);
    expect(resumingKey).toBe(pausedKey);
  });

  it("keeps a failed write retryable by preserving the unpersisted queue key", async () => {
    const session = newSession("claude", "/tmp/project");
    session.blocks = [{ id: "u1", role: "user", text: "hello" }];
    session.queuedMessages = [{ id: "q1", text: "retryable step", attachments: [] }];
    const targetQueueKey = queuePersistFingerprint(session);

    // Mock failure from SQLite upsert
    vi.mocked(invoke).mockRejectedValueOnce(new Error("Disk IO failure"));

    let lastPersistedQueueKey = "old-key";
    const writeResult = await upsertSession(session).catch(() => null);

    // Write failed: do not commit new key to lastPersistedQueue
    if (writeResult) {
      lastPersistedQueueKey = targetQueueKey;
    }

    expect(writeResult).toBeNull();
    expect(lastPersistedQueueKey).toBe("old-key");
    // Next schedule check still detects the queue as dirty and retries:
    expect(
      shouldScheduleSessionPersist({
        session,
        hasPersistedBefore: true,
      }),
    ).toBe(true);
  });
});

describe("restored queue payload validation (Defect 4)", () => {
  it("drops empty rows with no payload", () => {
    const raw = [{ id: "q1", text: "   ", attachments: [] }];
    expect(restoreQueuedMessages(raw)).toBeUndefined();
  });

  it("drops attachment-only row whose attachment has neither path nor data", () => {
    const raw = [
      {
        id: "q1",
        text: "",
        attachments: [
          {
            id: "att-1",
            name: "broken.txt",
            mimeType: "text/plain",
            kind: "file",
            size: 100,
            path: "   ",
            data: "",
          },
        ],
      },
    ];
    expect(restoreQueuedMessages(raw)).toBeUndefined();
  });

  it("preserves text in a text row with one malformed attachment while dropping the bad attachment", () => {
    const raw = [
      {
        id: "q1",
        text: "Please inspect this issue",
        attachments: [
          {
            id: "att-bad",
            name: "broken.txt",
            mimeType: "text/plain",
            kind: "file",
            size: 100,
            path: "",
            data: "",
          },
        ],
      },
    ];
    const restored = restoreQueuedMessages(raw);
    expect(restored?.queuedMessages.length).toBe(1);
    expect(restored?.queuedMessages[0].text).toBe("Please inspect this issue");
    expect(restored?.queuedMessages[0].attachments).toEqual([]);
  });

  it("preserves valid path-backed attachments", () => {
    const raw = [
      {
        id: "q1",
        text: "",
        attachments: [
          {
            id: "att-path",
            name: "main.rs",
            mimeType: "text/plain",
            kind: "file",
            size: 100,
            path: "/path/to/main.rs",
          },
        ],
      },
    ];
    const restored = restoreQueuedMessages(raw);
    expect(restored?.queuedMessages.length).toBe(1);
    expect(restored?.queuedMessages[0].attachments[0].path).toBe("/path/to/main.rs");
  });

  it("preserves valid pathless pasted-data attachments", () => {
    const raw = [
      {
        id: "q1",
        text: "",
        attachments: [
          {
            id: "att-data",
            name: "pasted.png",
            mimeType: "image/png",
            kind: "image",
            size: 4,
            data: "iVBORw0KGgo=",
          },
        ],
      },
    ];
    const restored = restoreQueuedMessages(raw);
    expect(restored?.queuedMessages.length).toBe(1);
    expect(restored?.queuedMessages[0].attachments[0].data).toBe("iVBORw0KGgo=");
  });

  it("causes orphan held/paused status to disappear when all rows are invalid", async () => {
    const session = newSession("codex", "/tmp/project");
      session.blocks = [{ id: "u1", role: "user", text: "initial prompt" }];
    const saved = sanitizeSessionForPersist(session);
    vi.mocked(invoke).mockResolvedValueOnce({
      ...saved,
      queuedMessages: [
        {
          id: "q1",
          text: "   ",
          attachments: [
            {
              id: "att-1",
              name: "broken",
              mimeType: "text/plain",
              kind: "file",
              size: 0,
            },
          ],
        },
      ],
      queueStatus: "held",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const restored = await getSession(session.id);
    expect(restored?.queuedMessages).toBeUndefined();
    expect(restored?.queueStatus).toBeUndefined();
  });
});

describe("QueueDurabilityScheduler (Defect 1)", () => {
  it("writes a busy queue mutation within bounded time despite repeated streaming-only session updates", async () => {
    vi.useFakeTimers();
    try {
      const session = newSession("codex", "/tmp/project");
      session.blocks = [{ id: "u1", role: "user", text: "initial prompt" }];
      session.busy = true;
      let writeCount = 0;
      const writeSession = vi.fn().mockImplementation(async (s) => {
        writeCount += 1;
        return {
          id: s.id,
          title: s.title,
          cwd: s.cwd,
          branch: s.branch,
          harness: s.harness,
          previewUrl: undefined,
          model: s.model,
          runtimeMode: s.runtimeMode,
          contextUsed: s.context?.used,
          contextWindow: s.context?.window,
          queuedCount: s.queuedMessages?.length ?? 0,
          queueStatus: s.queueStatus,
          messageCount: s.blocks.length,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      });

      const scheduler = new QueueDurabilityScheduler({
        getSession: () => session,
        writeSession,
        debounceMs: 400,
      });
      scheduler.initSession(session.id, "");

      // 1. Queue mutation occurs while busy
      session.queuedMessages = [{ id: "q1", text: "follow up", attachments: [] }];
      session.queueStatus = "active";
      scheduler.observeSession(session);
      expect(scheduler.isDirty(session.id)).toBe(true);
      expect(writeSession).not.toHaveBeenCalled();

      // 2. Continuous token streaming arrives over next 350ms
      for (let i = 1; i <= 7; i++) {
        await vi.advanceTimersByTimeAsync(50);
        session.blocks.push({
          id: "b" + i,
          role: "assistant",
          text: "token " + i,
        });
        // Transcript updated; observeSession called on each render
        scheduler.observeSession(session);
        // Should not have fired yet before 400ms deadline
        expect(writeSession).not.toHaveBeenCalled();
      }

      // 3. At 400ms from the original mutation, the bounded write MUST fire
      await vi.advanceTimersByTimeAsync(50);
      expect(writeSession).toHaveBeenCalledTimes(1);
      expect(scheduler.isDirty(session.id)).toBe(false);
      expect(scheduler.getPersistedKey(session.id)).toBe(queuePersistFingerprint(session));
    } finally {
      vi.useRealTimers();
    }
  });

  it("streaming-only updates do not reset or postpone the queue durability deadline", async () => {
    vi.useFakeTimers();
    try {
      const session = newSession("codex", "/tmp/project");
      session.blocks = [{ id: "u1", role: "user", text: "initial prompt" }];
      session.busy = true;
      session.queuedMessages = [{ id: "q1", text: "follow up", attachments: [] }];
      session.queueStatus = "active";

      const writeSession = vi.fn().mockResolvedValue({
        id: session.id,
        cwd: session.cwd,
      });

      const scheduler = new QueueDurabilityScheduler({
        getSession: () => session,
        writeSession,
        debounceMs: 400,
      });
      scheduler.initSession(session.id, queuePersistFingerprint(session));

      // Transcript-only streaming updates when queue is NOT dirty should do nothing
      for (let i = 1; i <= 5; i++) {
        session.blocks.push({ id: "b" + i, role: "assistant", text: "token " + i });
        scheduler.observeSession(session);
      }
      await vi.advanceTimersByTimeAsync(1000);
      expect(writeSession).not.toHaveBeenCalled();

      // Now mutate queue:
      session.queuedMessages = [
        { id: "q1", text: "follow up", attachments: [] },
        { id: "q2", text: "second item", attachments: [] },
      ];
      scheduler.observeSession(session);

      // Stream tokens every 50ms for 300ms
      for (let i = 6; i <= 11; i++) {
        await vi.advanceTimersByTimeAsync(50);
        session.blocks.push({ id: "b" + i, role: "assistant", text: "token " + i });
        scheduler.observeSession(session);
      }
      // At t=300ms, write has not fired yet
      expect(writeSession).not.toHaveBeenCalled();

      // At t=400ms from mutation, write fires exactly on deadline
      await vi.advanceTimersByTimeAsync(100);
      expect(writeSession).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("a failed write retries autonomously with backoff without requiring a React state mutation", async () => {
    vi.useFakeTimers();
    try {
      const session = newSession("codex", "/tmp/project");
      session.blocks = [{ id: "u1", role: "user", text: "initial prompt" }];
      session.queuedMessages = [{ id: "q1", text: "follow up", attachments: [] }];
      session.queueStatus = "active";

      let attempts = 0;
      const writeSession = vi.fn().mockImplementation(async () => {
        attempts += 1;
        if (attempts === 1) {
          // First attempt fails
          throw new Error("SQLite disk I/O error");
        }
        // Second attempt succeeds
        return { id: session.id, cwd: session.cwd };
      });

      const scheduler = new QueueDurabilityScheduler({
        getSession: () => session,
        writeSession,
        debounceMs: 400,
        baseRetryMs: 500,
      });
      scheduler.initSession(session.id, "");

      scheduler.observeSession(session);
      expect(scheduler.isDirty(session.id)).toBe(true);

      // Advance to 400ms: attempt 1 runs and fails
      await vi.advanceTimersByTimeAsync(400);
      expect(writeSession).toHaveBeenCalledTimes(1);
      expect(scheduler.isDirty(session.id)).toBe(true);

      // Autonomous retry scheduled with baseRetryMs (500ms).
      // Advance by 499ms: attempt 2 has not run yet
      await vi.advanceTimersByTimeAsync(499);
      expect(writeSession).toHaveBeenCalledTimes(1);

      // Advance by 1ms (total 500ms from failure): attempt 2 runs autonomously and succeeds!
      await vi.advanceTimersByTimeAsync(1);
      expect(writeSession).toHaveBeenCalledTimes(2);
      expect(scheduler.isDirty(session.id)).toBe(false);
      expect(scheduler.getPersistedKey(session.id)).toBe(queuePersistFingerprint(session));
    } finally {
      vi.useRealTimers();
    }
  });

  it("an older completed write cannot mark a newer queue fingerprint persisted", async () => {
    vi.useFakeTimers();
    try {
      const session = newSession("codex", "/tmp/project");
      session.blocks = [{ id: "u1", role: "user", text: "initial prompt" }];
      session.queuedMessages = [{ id: "q1", text: "version 1", attachments: [] }];
      session.queueStatus = "active";
      const keyV1 = queuePersistFingerprint(session);

      let resolveWrite1!: (val: unknown) => void;
      const write1Promise = new Promise((resolve) => {
        resolveWrite1 = resolve;
      });

      const writeSession = vi.fn().mockImplementationOnce(async () => {
        await write1Promise;
        return { id: session.id, cwd: session.cwd };
      }).mockImplementationOnce(async () => {
        return { id: session.id, cwd: session.cwd };
      });

      const scheduler = new QueueDurabilityScheduler({
        getSession: () => session,
        writeSession,
        debounceMs: 400,
      });
      scheduler.initSession(session.id, "");

      // 1. Observe v1 and advance timer to start write 1
      scheduler.observeSession(session);
      await vi.advanceTimersByTimeAsync(400);
      expect(writeSession).toHaveBeenCalledTimes(1);
      expect(scheduler.isInFlight(session.id)).toBe(true);

      // 2. While write 1 is in-flight, queue mutates to v2
      session.queuedMessages = [{ id: "q1", text: "version 2", attachments: [] }];
      const keyV2 = queuePersistFingerprint(session);
      scheduler.observeSession(session);

      // 3. Write 1 completes
      resolveWrite1(true);
      await vi.advanceTimersByTimeAsync(0);

      // 4. Persisted key MUST be v1, NOT v2!
      expect(scheduler.getPersistedKey(session.id)).toBe(keyV1);
      expect(scheduler.isDirty(session.id)).toBe(true);

      // 5. Scheduler automatically schedules write for v2
      await vi.advanceTimersByTimeAsync(400);
      expect(writeSession).toHaveBeenCalledTimes(2);
      expect(scheduler.getPersistedKey(session.id)).toBe(keyV2);
      expect(scheduler.isDirty(session.id)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("emptying a busy queue writes the clearing payload", async () => {
    vi.useFakeTimers();
    try {
      const session = newSession("codex", "/tmp/project");
      session.blocks = [{ id: "u1", role: "user", text: "initial prompt" }];
      session.busy = true;
      session.queuedMessages = [{ id: "q1", text: "first", attachments: [] }];
      session.queueStatus = "active";
      const initialKey = queuePersistFingerprint(session);

      let writtenSession: typeof session | null = null;
      const writeSession = vi.fn().mockImplementation(async (s) => {
        writtenSession = { ...s };
        return { id: s.id, cwd: s.cwd };
      });

      const scheduler = new QueueDurabilityScheduler({
        getSession: () => session,
        writeSession,
        debounceMs: 400,
      });
      scheduler.initSession(session.id, initialKey);

      // Empty the queue while session remains busy
      session.queuedMessages = [];
      scheduler.observeSession(session);
      expect(scheduler.isDirty(session.id)).toBe(true);

      await vi.advanceTimersByTimeAsync(400);
      expect(writeSession).toHaveBeenCalledTimes(1);
      expect(writtenSession!.queuedMessages).toEqual([]);
      expect(scheduler.getPersistedKey(session.id)).toBe("");
      expect(scheduler.isDirty(session.id)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("queue persistence integration cleanup (single owner, in-flight enforcement, disposal)", () => {
  it("proves that one queue mutation results in one queue-triggered write rather than writes from both schedulers", async () => {
    vi.useFakeTimers();
    try {
      const session = newSession("claude", "/tmp/project");
      session.blocks = [{ id: "u1", role: "user", text: "hello" }];
      session.busy = true;
      session.queuedMessages = [];

      let queueWrites = 0;
      let transcriptWrites = 0;

      const queueScheduler = new QueueDurabilityScheduler({
        getSession: () => session,
        writeSession: async (s) => {
          queueWrites++;
          return { id: s.id, cwd: s.cwd };
        },
        onPersisted: (s) => {
          lastPersisted.set(s.id, persistFingerprint(s));
        },
        debounceMs: 400,
      });
      queueScheduler.initSession(session.id, "");

      const lastPersisted = new Map<string, string>();
      lastPersisted.set(session.id, persistFingerprint(session));
      const pendingPersist = new Map<string, Session>();

      // 1. Session is busy, and a queue mutation occurs
      session.queuedMessages = [{ id: "q1", text: "step 1", attachments: [] }];

      // Both production paths observe the session:
      // Path A: QueueDurabilityScheduler
      queueScheduler.observeSession(session);

      // Path B: Ordinary transcript persistence effect
      if (
        shouldScheduleSessionPersist({
          session,
          hasPersistedBefore: lastPersisted.has(session.id),
        })
      ) {
        pendingPersist.set(session.id, session);
      }

      // While busy, ordinary transcript path should NOT have scheduled a write for the queue mutation
      expect(pendingPersist.has(session.id)).toBe(false);

      // Advance by 400ms: Queue scheduler writes the queue
      await vi.advanceTimersByTimeAsync(400);
      expect(queueWrites).toBe(1);
      expect(transcriptWrites).toBe(0);

      // 2. Now session becomes idle, and another queue mutation occurs
      session.busy = false;
      session.queuedMessages = [
        { id: "q1", text: "step 1", attachments: [] },
        { id: "q2", text: "step 2", attachments: [] },
      ];

      queueScheduler.observeSession(session);
      if (
        shouldScheduleSessionPersist({
          session,
          hasPersistedBefore: lastPersisted.has(session.id),
        })
      ) {
        pendingPersist.set(session.id, session);
      }
      // Idle session registers in pendingPersist for transcript settlement check
      expect(pendingPersist.has(session.id)).toBe(true);

      // At 400ms, queue scheduler writes the mutation
      await vi.advanceTimersByTimeAsync(400);
      expect(queueWrites).toBe(2);

      // At 650ms, ordinary persistence effect runs:
      const dirty = [...pendingPersist.values()];
      pendingPersist.clear();
      for (const s of dirty) {
        const fingerprint = persistFingerprint(s);
        const transcriptDirty = lastPersisted.get(s.id) !== fingerprint;
        if (s.busy) continue;
        if (!transcriptDirty) continue;
        transcriptWrites++;
      }

      // Advance past 650ms
      await vi.advanceTimersByTimeAsync(300);

      // Exactly 0 transcript writes were triggered; queue write was singularly owned by QueueDurabilityScheduler!
      expect(transcriptWrites).toBe(0);
      expect(queueWrites).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("a write taking longer than debounce interval does not produce concurrent duplicate writes", async () => {
    vi.useFakeTimers();
    try {
      const session = newSession("claude", "/tmp/project");
      session.blocks = [{ id: "u1", role: "user", text: "hello" }];
      session.queuedMessages = [{ id: "q1", text: "v1", attachments: [] }];

      let resolveSlowWrite!: (summary: { id: string; cwd: string }) => void;
      const writeSession = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          resolveSlowWrite = resolve;
        });
      });

      const scheduler = new QueueDurabilityScheduler({
        getSession: () => session,
        writeSession,
        debounceMs: 400,
      });
      scheduler.initSession(session.id, "");

      scheduler.observeSession(session);
      expect(scheduler.isScheduled(session.id)).toBe(true);

      // Fire timer: write 1 begins
      await vi.advanceTimersByTimeAsync(400);
      expect(writeSession).toHaveBeenCalledTimes(1);
      expect(scheduler.isInFlight(session.id)).toBe(true);
      expect(scheduler.isScheduled(session.id)).toBe(false);

      // While write 1 is in-flight (unresolved), multiple renders happen and timer interval passes
      scheduler.observeSession(session);
      await vi.advanceTimersByTimeAsync(600);
      scheduler.observeSession(session);
      await vi.advanceTimersByTimeAsync(600);

      // No concurrent duplicate writes started!
      expect(writeSession).toHaveBeenCalledTimes(1);
      expect(scheduler.isInFlight(session.id)).toBe(true);

      // Settle the in-flight write
      resolveSlowWrite({ id: session.id, cwd: session.cwd });
      await vi.advanceTimersByTimeAsync(0);

      expect(scheduler.isInFlight(session.id)).toBe(false);
      expect(scheduler.isDirty(session.id)).toBe(false);
      expect(writeSession).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("repeated observeSession calls during in-flight write do not enqueue duplicates", async () => {
    vi.useFakeTimers();
    try {
      const session = newSession("claude", "/tmp/project");
      session.blocks = [{ id: "u1", role: "user", text: "hello" }];
      session.queuedMessages = [{ id: "q1", text: "v1", attachments: [] }];

      let resolveWrite!: (summary: { id: string; cwd: string }) => void;
      const writeSession = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          resolveWrite = resolve;
        });
      });

      const scheduler = new QueueDurabilityScheduler({
        getSession: () => session,
        writeSession,
        debounceMs: 400,
      });
      scheduler.initSession(session.id, "");

      scheduler.observeSession(session);
      await vi.advanceTimersByTimeAsync(400);
      expect(writeSession).toHaveBeenCalledTimes(1);
      expect(scheduler.isInFlight(session.id)).toBe(true);

      // Call observeSession 10 times with the same or updated state
      for (let i = 0; i < 10; i++) {
        scheduler.observeSession(session);
      }
      expect(scheduler.isScheduled(session.id)).toBe(false);

      resolveWrite({ id: session.id, cwd: session.cwd });
      await vi.advanceTimersByTimeAsync(1000);

      expect(writeSession).toHaveBeenCalledTimes(1);
      expect(scheduler.isInFlight(session.id)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("V1 in flight followed by V2 and V3 mutations produces V1 followed by one coalesced V3 write", async () => {
    vi.useFakeTimers();
    try {
      const session = newSession("claude", "/tmp/project");
      session.blocks = [{ id: "u1", role: "user", text: "hello" }];
      session.queuedMessages = [{ id: "q1", text: "v1", attachments: [] }];
      const keyV1 = queuePersistFingerprint(session);

      const writtenSnapshots: string[] = [];
      let resolveWrite1!: (val: { id: string; cwd: string }) => void;

      const writeSession = vi.fn().mockImplementation((s: Session) => {
        const key = queuePersistFingerprint(s);
        writtenSnapshots.push(key);
        if (writtenSnapshots.length === 1) {
          return new Promise((resolve) => {
            resolveWrite1 = resolve;
          });
        }
        return Promise.resolve({ id: s.id, cwd: s.cwd });
      });

      const scheduler = new QueueDurabilityScheduler({
        getSession: () => session,
        writeSession,
        debounceMs: 400,
      });
      scheduler.initSession(session.id, "");

      // 1. Trigger write for V1
      scheduler.observeSession(session);
      await vi.advanceTimersByTimeAsync(400);
      expect(writeSession).toHaveBeenCalledTimes(1);
      expect(scheduler.isInFlight(session.id)).toBe(true);

      // 2. While V1 is in flight, queue mutates to V2
      session.queuedMessages = [{ id: "q1", text: "v2", attachments: [] }];
      scheduler.observeSession(session);

      // 3. Queue mutates to V3 before V1 completes
      session.queuedMessages = [{ id: "q1", text: "v3", attachments: [] }];
      const keyV3 = queuePersistFingerprint(session);
      scheduler.observeSession(session);

      // No concurrent write was started
      expect(writeSession).toHaveBeenCalledTimes(1);

      // 4. V1 completes
      resolveWrite1({ id: session.id, cwd: session.cwd });
      await vi.advanceTimersByTimeAsync(0);

      // Persisted key is V1, dirty state is true
      expect(scheduler.getPersistedKey(session.id)).toBe(keyV1);
      expect(scheduler.isDirty(session.id)).toBe(true);
      expect(scheduler.isScheduled(session.id)).toBe(true);

      // 5. Follow-up write runs after debounce: coalesced directly to V3 (skipping intermediate V2 write)
      await vi.advanceTimersByTimeAsync(400);
      expect(writeSession).toHaveBeenCalledTimes(2);
      expect(writtenSnapshots).toEqual([keyV1, keyV3]);
      expect(scheduler.getPersistedKey(session.id)).toBe(keyV3);
      expect(scheduler.isDirty(session.id)).toBe(false);
      expect(scheduler.isInFlight(session.id)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("failure followed by further mutation retries the latest snapshot", async () => {
    vi.useFakeTimers();
    try {
      const session = newSession("claude", "/tmp/project");
      session.blocks = [{ id: "u1", role: "user", text: "hello" }];
      session.queuedMessages = [{ id: "q1", text: "v1", attachments: [] }];

      const writtenSnapshots: string[] = [];
      let resolveWrite1!: (val: { id: string; cwd: string } | null) => void;

      const writeSession = vi.fn().mockImplementation((s: Session) => {
        const key = queuePersistFingerprint(s);
        writtenSnapshots.push(key);
        if (writtenSnapshots.length === 1) {
          return new Promise((resolve) => {
            resolveWrite1 = resolve;
          });
        }
        return Promise.resolve({ id: s.id, cwd: s.cwd });
      });

      const scheduler = new QueueDurabilityScheduler({
        getSession: () => session,
        writeSession,
        debounceMs: 400,
        baseRetryMs: 500,
      });
      scheduler.initSession(session.id, "");

      // 1. Start V1 write
      scheduler.observeSession(session);
      await vi.advanceTimersByTimeAsync(400);
      expect(writeSession).toHaveBeenCalledTimes(1);

      // 2. While V1 is in flight, user mutates queue to V2
      session.queuedMessages = [{ id: "q1", text: "v2-mutated", attachments: [] }];
      const keyV2 = queuePersistFingerprint(session);
      scheduler.observeSession(session);

      // 3. V1 write fails (returns null or rejects)
      resolveWrite1(null);
      await vi.advanceTimersByTimeAsync(0);

      // In flight is cleared, dirty state remains true
      expect(scheduler.isInFlight(session.id)).toBe(false);
      expect(scheduler.isDirty(session.id)).toBe(true);
      expect(scheduler.isScheduled(session.id)).toBe(true);

      // 4. Retry fires after baseRetryMs (500ms), writing latest snapshot V2
      await vi.advanceTimersByTimeAsync(500);
      expect(writeSession).toHaveBeenCalledTimes(2);
      expect(writtenSnapshots[1]).toBe(keyV2);
      expect(scheduler.getPersistedKey(session.id)).toBe(keyV2);
      expect(scheduler.isDirty(session.id)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("inFlightKey, scheduled state, and dirty state remain truthful throughout write lifecycle", async () => {
    vi.useFakeTimers();
    try {
      const session = newSession("claude", "/tmp/project");
      session.blocks = [{ id: "u1", role: "user", text: "hello" }];
      session.queuedMessages = [];

      let resolveWrite!: (summary: { id: string; cwd: string }) => void;
      const writeSession = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          resolveWrite = resolve;
        });
      });

      const scheduler = new QueueDurabilityScheduler({
        getSession: () => session,
        writeSession,
        debounceMs: 400,
      });
      scheduler.initSession(session.id, "");

      // 0. Clean
      expect(scheduler.isDirty(session.id)).toBe(false);
      expect(scheduler.isScheduled(session.id)).toBe(false);
      expect(scheduler.isInFlight(session.id)).toBe(false);

      // 1. Mutated
      session.queuedMessages = [{ id: "q1", text: "item", attachments: [] }];
      scheduler.observeSession(session);
      expect(scheduler.isDirty(session.id)).toBe(true);
      expect(scheduler.isScheduled(session.id)).toBe(true);
      expect(scheduler.isInFlight(session.id)).toBe(false);

      // 2. Timer fires: write becomes in flight
      await vi.advanceTimersByTimeAsync(400);
      expect(scheduler.isDirty(session.id)).toBe(true);
      expect(scheduler.isScheduled(session.id)).toBe(false);
      expect(scheduler.isInFlight(session.id)).toBe(true);

      // 3. Settle write
      resolveWrite({ id: session.id, cwd: session.cwd });
      await vi.advanceTimersByTimeAsync(0);

      // 4. Clean again
      expect(scheduler.isDirty(session.id)).toBe(false);
      expect(scheduler.isScheduled(session.id)).toBe(false);
      expect(scheduler.isInFlight(session.id)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("disposal cancels pending retries", async () => {
    vi.useFakeTimers();
    try {
      const session = newSession("claude", "/tmp/project");
      session.blocks = [{ id: "u1", role: "user", text: "hello" }];
      session.queuedMessages = [{ id: "q1", text: "item", attachments: [] }];

      const writeSession = vi.fn().mockResolvedValue(null);

      const scheduler = new QueueDurabilityScheduler({
        getSession: () => session,
        writeSession,
        debounceMs: 400,
        baseRetryMs: 500,
      });
      scheduler.initSession(session.id, "");

      scheduler.observeSession(session);
      await vi.advanceTimersByTimeAsync(400);
      expect(writeSession).toHaveBeenCalledTimes(1);

      // Failed write scheduled a retry
      expect(scheduler.isScheduled(session.id)).toBe(true);

      // Dispose the scheduler
      scheduler.dispose();
      expect(scheduler.isDisposed()).toBe(true);
      expect(scheduler.isScheduled(session.id)).toBe(false);

      // Advance by 10 seconds: no retries ever run
      await vi.advanceTimersByTimeAsync(10000);
      expect(writeSession).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("disposal suppresses completion callbacks and state updates from an already-running write", async () => {
    vi.useFakeTimers();
    try {
      const session = newSession("claude", "/tmp/project");
      session.blocks = [{ id: "u1", role: "user", text: "hello" }];
      session.queuedMessages = [{ id: "q1", text: "item", attachments: [] }];

      let resolveWrite!: (summary: { id: string; cwd: string }) => void;
      const writeSession = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          resolveWrite = resolve;
        });
      });
      const onPersisted = vi.fn();

      const scheduler = new QueueDurabilityScheduler({
        getSession: () => session,
        writeSession,
        onPersisted,
        debounceMs: 400,
      });
      scheduler.initSession(session.id, "");

      scheduler.observeSession(session);
      await vi.advanceTimersByTimeAsync(400);
      expect(writeSession).toHaveBeenCalledTimes(1);
      expect(scheduler.isInFlight(session.id)).toBe(true);

      // Dispose while write is still unresolved in flight
      scheduler.dispose();
      expect(scheduler.isDisposed()).toBe(true);

      // Now resolve the in-flight write
      resolveWrite({ id: session.id, cwd: session.cwd });
      await vi.advanceTimersByTimeAsync(0);

      // onPersisted MUST NOT be called!
      expect(onPersisted).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("setPersistedKey reconciles safely with in-flight or pending key", () => {
    const session = newSession("claude", "/tmp/project");
    session.blocks = [{ id: "u1", role: "user", text: "hello" }];
    session.queuedMessages = [{ id: "q1", text: "v1", attachments: [] }];
    const keyV1 = queuePersistFingerprint(session);

    const scheduler = new QueueDurabilityScheduler({
      getSession: () => session,
      writeSession: vi.fn(),
    });
    scheduler.initSession(session.id, "");
    expect(scheduler.isDirty(session.id)).toBe(true);

    // Normal session write completed and wrote keyV1
    scheduler.setPersistedKey(session.id, keyV1);
    expect(scheduler.getPersistedKey(session.id)).toBe(keyV1);
    expect(scheduler.isDirty(session.id)).toBe(false);

    // If session moves to v2, but setPersistedKey is called with older v1:
    session.queuedMessages = [{ id: "q1", text: "v2-newer", attachments: [] }];
    scheduler.setPersistedKey(session.id, keyV1);
    expect(scheduler.getPersistedKey(session.id)).toBe(keyV1);
    expect(scheduler.isDirty(session.id)).toBe(true);
  });
  it("survives React Strict Mode dev remount (setup -> cleanup -> setup) and persists mutations", async () => {
    vi.useFakeTimers();
    try {
      const session = newSession("claude", "/tmp/project");
      session.blocks = [{ id: "u1", role: "user", text: "hello" }];
      session.queuedMessages = [{ id: "q1", text: "v1", attachments: [] }];
      session.queueStatus = "active";
      const keyV1 = queuePersistFingerprint(session);

      const writes: string[] = [];
      const writeSession = vi.fn().mockImplementation(async (s: Session) => {
        writes.push(queuePersistFingerprint(s));
        return { id: s.id, cwd: s.cwd };
      });

      let currentSessions: Session[] = [session];
      let activeScheduler: QueueDurabilityScheduler | null = null;

      const createSchedulerInstance = (): QueueDurabilityScheduler => {
        return new QueueDurabilityScheduler({
          getSession: (id) => currentSessions.find((s) => s.id === id),
          writeSession,
          debounceMs: 400,
        });
      };

      const lifecycleSetup = (): (() => void) => {
        if (!activeScheduler || activeScheduler.isDisposed()) {
          const old = activeScheduler;
          const previousKeys = old?.getPersistedKeys();
          const next = createSchedulerInstance();
          if (previousKeys) {
            for (const [id, key] of previousKeys) {
              next.initSession(id, key);
            }
          }
          for (const s of currentSessions) {
            next.observeSession(s);
          }
          activeScheduler = next;
        }
        const captured = activeScheduler;
        return () => {
          captured.dispose();
        };
      };

      // 1. Initial lifecycle setup (Mount 1)
      const cleanup1 = lifecycleSetup();
      expect(activeScheduler).not.toBeNull();
      expect(activeScheduler!.isDisposed()).toBe(false);
      activeScheduler!.initSession(session.id, keyV1);

      // 2. Strict Mode cleanup/disposal (Dev simulation unmount 1)
      cleanup1();
      expect(activeScheduler!.isDisposed()).toBe(true);

      // 3. Second lifecycle setup (Mount 2)
      const cleanup2 = lifecycleSetup();
      expect(activeScheduler).not.toBeNull();
      expect(activeScheduler!.isDisposed()).toBe(false);
      expect(activeScheduler!.getPersistedKey(session.id)).toBe(keyV1);

      // 4. Queue mutation occurs
      session.queuedMessages = [
        { id: "q1", text: "v1", attachments: [] },
        { id: "q2", text: "v2-added", attachments: [] },
      ];
      const keyV2 = queuePersistFingerprint(session);
      activeScheduler!.observeSession(session);

      expect(activeScheduler!.isDirty(session.id)).toBe(true);
      expect(activeScheduler!.isScheduled(session.id)).toBe(true);

      // 5. Timer advancement
      await vi.advanceTimersByTimeAsync(400);

      // 6. Successful write by the second active scheduler
      expect(writeSession).toHaveBeenCalledTimes(1);
      expect(writes).toEqual([keyV2]);
      expect(activeScheduler!.getPersistedKey(session.id)).toBe(keyV2);
      expect(activeScheduler!.isDirty(session.id)).toBe(false);

      cleanup2();
      expect(activeScheduler!.isDisposed()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("normal successful new-turn persistence containing current queue prevents a duplicate scheduler write", async () => {
    vi.useFakeTimers();
    try {
      const session = newSession("claude", "/tmp/project");
      session.blocks = [{ id: "u1", role: "user", text: "hello" }];
      session.queuedMessages = [{ id: "q1", text: "task 1", attachments: [] }];
      const queueKey = queuePersistFingerprint(session);

      const schedulerWrites: string[] = [];
      const scheduler = new QueueDurabilityScheduler({
        getSession: () => session,
        writeSession: vi.fn().mockImplementation(async (s: Session) => {
          schedulerWrites.push(queuePersistFingerprint(s));
          return { id: s.id, cwd: s.cwd };
        }),
        debounceMs: 400,
      });
      scheduler.initSession(session.id, "");

      // Session is observed with new queue item:
      scheduler.observeSession(session);
      expect(scheduler.isDirty(session.id)).toBe(true);
      expect(scheduler.isScheduled(session.id)).toBe(true);

      // Meanwhile, user initiates a new turn, so persistSession writes the session snapshot:
      const snapshotWritten = { ...session };
      const queueKeyWritten = queuePersistFingerprint(snapshotWritten);
      expect(queueKeyWritten).toBe(queueKey);

      // Ordinary persist succeeds and informs scheduler:
      scheduler.setPersistedKey(session.id, queueKeyWritten);

      // Timer was cancelled because written key matches current key:
      expect(scheduler.isScheduled(session.id)).toBe(false);
      expect(scheduler.isDirty(session.id)).toBe(false);
      expect(scheduler.getPersistedKey(session.id)).toBe(queueKey);

      // Advance timers past debounce:
      await vi.advanceTimersByTimeAsync(1000);

      // No duplicate scheduler write occurred:
      expect(schedulerWrites).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("if queue changes while normal write is in flight, completion marks only the written key and scheduler subsequently writes the newer queue", async () => {
    vi.useFakeTimers();
    try {
      const session = newSession("claude", "/tmp/project");
      session.blocks = [{ id: "u1", role: "user", text: "hello" }];
      session.queuedMessages = [{ id: "q1", text: "v1", attachments: [] }];
      const keyV1 = queuePersistFingerprint(session);

      const schedulerWrites: string[] = [];
      const scheduler = new QueueDurabilityScheduler({
        getSession: () => session,
        writeSession: vi.fn().mockImplementation(async (s: Session) => {
          schedulerWrites.push(queuePersistFingerprint(s));
          return { id: s.id, cwd: s.cwd };
        }),
        debounceMs: 400,
      });
      scheduler.initSession(session.id, "");

      // Normal write begins with snapshot V1 (in-flight)
      const snapshotV1 = { ...session };
      const queueKeyWrittenV1 = queuePersistFingerprint(snapshotV1);

      // While normal write is in flight, user adds a second queued message (V2):
      session.queuedMessages = [
        { id: "q1", text: "v1", attachments: [] },
        { id: "q2", text: "v2-added", attachments: [] },
      ];
      const keyV2 = queuePersistFingerprint(session);
      scheduler.observeSession(session);
      expect(scheduler.isDirty(session.id)).toBe(true);
      expect(scheduler.isScheduled(session.id)).toBe(true);

      // Now normal write for V1 completes and reports keyV1:
      scheduler.setPersistedKey(session.id, queueKeyWrittenV1);

      // Scheduler marks keyV1 durable, but recognizes session is on keyV2:
      expect(scheduler.getPersistedKey(session.id)).toBe(keyV1);
      expect(scheduler.isDirty(session.id)).toBe(true);
      expect(scheduler.isScheduled(session.id)).toBe(true);

      // Advance timers for scheduler write of V2:
      await vi.advanceTimersByTimeAsync(400);

      // Scheduler successfully persisted keyV2:
      expect(schedulerWrites).toEqual([keyV2]);
      expect(scheduler.getPersistedKey(session.id)).toBe(keyV2);
      expect(scheduler.isDirty(session.id)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("auto-dispatch dequeue + new user turn does not generate two identical queue writes", async () => {
    vi.useFakeTimers();
    try {
      const session = newSession("claude", "/tmp/project");
      session.blocks = [{ id: "u1", role: "user", text: "initial" }];
      session.queuedMessages = [
        { id: "q1", text: "first queued", attachments: [] },
        { id: "q2", text: "second queued", attachments: [] },
      ];
      const initialKey = queuePersistFingerprint(session);

      const schedulerWrites: string[] = [];
      const scheduler = new QueueDurabilityScheduler({
        getSession: () => session,
        writeSession: vi.fn().mockImplementation(async (s: Session) => {
          schedulerWrites.push(queuePersistFingerprint(s));
          return { id: s.id, cwd: s.cwd };
        }),
        debounceMs: 400,
      });
      scheduler.initSession(session.id, initialKey);

      // Auto-dispatch dequeues q1 and appends it as a new user block:
      const dequeued = session.queuedMessages.shift()!;
      session.blocks = [
        ...session.blocks,
        { id: "u2", role: "user", text: dequeued.text },
      ];
      const dequeuedKey = queuePersistFingerprint(session);

      // Queue state changed from [q1, q2] to [q2], so observeSession schedules a write:
      scheduler.observeSession(session);
      expect(scheduler.isDirty(session.id)).toBe(true);
      expect(scheduler.isScheduled(session.id)).toBe(true);

      // New user turn triggers persistSession(session) with the dequeued state:
      const snapshotWritten = { ...session };
      const queueKeyWritten = queuePersistFingerprint(snapshotWritten);
      expect(queueKeyWritten).toBe(dequeuedKey);

      // Normal turn persist succeeds and updates scheduler:
      scheduler.setPersistedKey(session.id, queueKeyWritten);

      // Scheduler cancels duplicate timer and marks dequeuedKey durable:
      expect(scheduler.isScheduled(session.id)).toBe(false);
      expect(scheduler.isDirty(session.id)).toBe(false);
      expect(scheduler.getPersistedKey(session.id)).toBe(dequeuedKey);

      // Advance timers:
      await vi.advanceTimersByTimeAsync(1000);

      // No redundant duplicate scheduler write occurred:
      expect(schedulerWrites).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
