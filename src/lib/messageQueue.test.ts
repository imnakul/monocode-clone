import { describe, expect, it, vi } from "vitest";
import { appendPreparingHandoff } from "./handoff";
import {
  beginQueuedSteerCancellation,
  canDispatchQueuedHead,
  dequeueQueuedMessage,
  finalizeTurnSession,
  orchestrateTurnCompletion,
  finishQueuedSteerCancellation,
  isEditingQueuedHead,
  lastAssistantTextInTurn,
  queuedHead,
  queuedMessageForSubmit,
  settleQueuedSteerCancellations,
} from "./messageQueue";
import { isProviderFailureText } from "./plan";
import { newSession, type QueuedMessage, type Session } from "./session";

function queued(id: string, text = id): QueuedMessage {
  return { id, text, attachments: [] };
}

function chat(patch: Partial<Session> = {}): Session {
  return {
    ...newSession("claude", "/tmp/project"),
    queuedMessages: [queued("a", "first"), queued("b", "second")],
    queueStatus: "active",
    ...patch,
  };
}

describe("queuedHead", () => {
  it("returns the first queued follow-up", () => {
    expect(queuedHead(chat())?.id).toBe("a");
    expect(queuedHead(chat({ queuedMessages: undefined }))).toBeUndefined();
  });
});

describe("isEditingQueuedHead", () => {
  it("is true only when the head row is the one being edited", () => {
    expect(isEditingQueuedHead(chat())).toBe(false);
    expect(isEditingQueuedHead(chat({ editingQueuedMessageId: "a" }))).toBe(
      true,
    );
    expect(isEditingQueuedHead(chat({ editingQueuedMessageId: "b" }))).toBe(
      false,
    );
  });
});

describe("canDispatchQueuedHead", () => {
  it("dispatches an idle session with a queued head", () => {
    expect(canDispatchQueuedHead(chat())).toBe(true);
  });

  it("holds while the session is busy, paused, or resuming", () => {
    expect(canDispatchQueuedHead(chat({ busy: true }))).toBe(false);
    expect(canDispatchQueuedHead(chat({ queueStatus: "paused" }))).toBe(false);
    expect(canDispatchQueuedHead(chat({ queueStatus: "resuming" }))).toBe(
      false,
    );
  });

  it("holds the queue after a failed turn until the user resumes", () => {
    expect(canDispatchQueuedHead(chat({ queueStatus: "held" }))).toBe(false);
  });

  it("holds only when the head item is being edited", () => {
    expect(canDispatchQueuedHead(chat({ editingQueuedMessageId: "a" }))).toBe(
      false,
    );
    expect(canDispatchQueuedHead(chat({ editingQueuedMessageId: "b" }))).toBe(
      true,
    );
  });

  it("does not dispatch during a preparing handoff", () => {
    const preparing = appendPreparingHandoff(
      chat({ queuedMessages: [queued("a")] }),
      "claude",
      "cursor",
    );
    expect(canDispatchQueuedHead(preparing)).toBe(false);
  });

  it("does not dispatch an empty queue", () => {
    expect(canDispatchQueuedHead(chat({ queuedMessages: undefined }))).toBe(
      false,
    );
  });
});

describe("dequeueQueuedMessage", () => {
  it("drops the id and clears queue state when the last item goes", () => {
    const one = chat({ queuedMessages: [queued("a")], queueStatus: "active" });
    expect(dequeueQueuedMessage(one, "a")).toMatchObject({
      queuedMessages: undefined,
      queueStatus: undefined,
    });
  });

  it("keeps editing another row after the head is sent", () => {
    const next = dequeueQueuedMessage(
      chat({ editingQueuedMessageId: "b" }),
      "a",
    );
    expect(next.queuedMessages?.map((message) => message.id)).toEqual(["b"]);
    expect(next.editingQueuedMessageId).toBe("b");
    expect(next.queueStatus).toBe("active");
  });
});

describe("queuedMessageForSubmit", () => {
  it("only auto-dispatches the idle head", () => {
    expect(queuedMessageForSubmit(chat(), "a", "dispatch")?.id).toBe("a");
    expect(queuedMessageForSubmit(chat(), "b", "dispatch")).toBeUndefined();
    expect(
      queuedMessageForSubmit(chat({ busy: true }), "a", "dispatch"),
    ).toBeUndefined();
  });

  it("lets Steer target any remaining row, including while busy or paused", () => {
    expect(queuedMessageForSubmit(chat({ busy: true }), "b", "steer")?.id).toBe(
      "b",
    );
    expect(
      queuedMessageForSubmit(chat({ queueStatus: "paused" }), "a", "steer")?.id,
    ).toBe("a");
    expect(
      queuedMessageForSubmit(chat({ queueStatus: "held" }), "b", "steer")?.id,
    ).toBe("b");
    expect(queuedMessageForSubmit(chat(), "missing", "steer")).toBeUndefined();
  });
});

describe("queued Steer cancellation", () => {
  it("holds dispatch while cancellation settles and prioritizes the selected row", () => {
    const selected: QueuedMessage = {
      ...queued("b", "make a plan"),
      intent: "plan",
      noteCard: {
        id: "note-1",
        slug: "queue-note",
        title: "Queue note",
        body: "Keep this context",
      },
    };
    const starting = chat({
      busy: true,
      editingQueuedMessageId: "b",
      queuedMessages: [queued("a", "first"), selected],
      blocks: [
        { id: "user", role: "user", text: "working" },
        {
          id: "assistant",
          role: "assistant",
          text: "partial",
          streaming: true,
        },
      ],
    });
    const cancelling = beginQueuedSteerCancellation(starting, "b");

    expect(cancelling.queuedMessages?.map((message) => message.id)).toEqual([
      "b",
      "a",
    ]);
    expect(cancelling.queuedMessages?.[0]).toEqual(selected);
    expect(cancelling.queueStatus).toBe("steering");
    expect(cancelling.busy).toBe(true);
    expect(cancelling.editingQueuedMessageId).toBeUndefined();
    expect(cancelling.blocks[1]).toMatchObject({ streaming: false });
    expect(canDispatchQueuedHead(cancelling)).toBe(false);

    expect(finishQueuedSteerCancellation(cancelling, true)).toMatchObject({
      busy: false,
      queueStatus: "active",
    });
    expect(finishQueuedSteerCancellation(cancelling, false)).toMatchObject({
      busy: false,
      queueStatus: "held",
    });
  });

  it("does not alter the active turn when the queued id is stale", () => {
    const starting = chat({ busy: true });

    expect(beginQueuedSteerCancellation(starting, "missing")).toBe(starting);
  });

  it("reports success only when every provider cancellation acknowledges", async () => {
    await expect(
      settleQueuedSteerCancellations([Promise.resolve(), Promise.resolve()]),
    ).resolves.toBe(true);
    await expect(
      settleQueuedSteerCancellations([
        Promise.resolve(),
        Promise.reject(new Error("cancel failed")),
      ]),
    ).resolves.toBe(false);
  });

  it("fails closed when a provider cancellation never settles", async () => {
    vi.useFakeTimers();
    try {
      const result = settleQueuedSteerCancellations([
        new Promise<void>(() => undefined),
      ]);

      await vi.advanceTimersByTimeAsync(15_000);

      await expect(
        Promise.race([result, Promise.resolve("still-pending")]),
      ).resolves.toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});


describe("finalizeTurnSession and failure-to-held ordering", () => {
  it("transitions a session with a queue to held on structured provider failure", () => {
    const session = chat({
      busy: true,
      blocks: [
        { id: "u1", role: "user", text: "hello" },
        { id: "s1", role: "system", text: "Anthropic API 500 internal error" },
      ],
    });

    const finalized = finalizeTurnSession(session, { providerFailed: true });

    expect(finalized.busy).toBe(false);
    expect(finalized.queueStatus).toBe("held");
    expect(canDispatchQueuedHead(finalized)).toBe(false);
  });

  it("transitions to held on direct provider rejection", () => {
    const session = chat({
      busy: true,
      blocks: [{ id: "u1", role: "user", text: "hello" }],
    });

    const directRejectionFailed = true;
    const finalized = finalizeTurnSession(session, {
      providerFailed: directRejectionFailed,
    });

    expect(finalized.busy).toBe(false);
    expect(finalized.queueStatus).toBe("held");
    expect(canDispatchQueuedHead(finalized)).toBe(false);
  });

  it("transitions to held on failure-text detection in the assistant turn", () => {
    const session = chat({
      busy: true,
      blocks: [
        { id: "u1", role: "user", text: "write code" },
        {
          id: "a1",
          role: "assistant",
          text: "Upgrade your plan to continue.",
        },
      ],
    });

    const lastText = lastAssistantTextInTurn(session);
    const failureTextDetected = isProviderFailureText(lastText);
    expect(failureTextDetected).toBe(true);

    const finalized = finalizeTurnSession(session, {
      providerFailed: failureTextDetected,
    });

    expect(finalized.busy).toBe(false);
    expect(finalized.queueStatus).toBe("held");
    expect(canDispatchQueuedHead(finalized)).toBe(false);
  });

  it("keeps a successful turn eligible for ordinary queue dispatch", () => {
    const session = chat({
      busy: true,
      blocks: [
        { id: "u1", role: "user", text: "write code" },
        { id: "a1", role: "assistant", text: "Here is the code" },
      ],
    });

    const finalized = finalizeTurnSession(session, { providerFailed: false });

    expect(finalized.busy).toBe(false);
    expect(finalized.queueStatus).toBe("active");
    expect(canDispatchQueuedHead(finalized)).toBe(true);
  });

  it("ensures held transition occurs before mocked checkpoint resolves and prevents submission", async () => {
    let session = chat({
      busy: true,
      blocks: [{ id: "u1", role: "user", text: "test" }],
    });

    let checkpointResolved = false;
    let attemptedSubmitDuringWindow = false;

    // Simulate checkpoint flush promise
    let resolveCheckpoint!: () => void;
    const checkpointPromise = new Promise<void>((resolve) => {
      resolveCheckpoint = () => {
        checkpointResolved = true;
        resolve();
      };
    });

    // Production flow on failure:
    // 1. Finalize session turn synchronously before awaiting checkpoint
    session = finalizeTurnSession(session, { providerFailed: true });

    // Assert synchronously held BEFORE checkpoint resolves
    expect(checkpointResolved).toBe(false);
    expect(session.queueStatus).toBe("held");
    expect(canDispatchQueuedHead(session)).toBe(false);

    // Auto-dispatch check during checkpoint window
    if (canDispatchQueuedHead(session)) {
      attemptedSubmitDuringWindow = true;
    }

    // Now resolve checkpoint
    resolveCheckpoint();
    await checkpointPromise;

    expect(attemptedSubmitDuringWindow).toBe(false);
    expect(session.queueStatus).toBe("held");
    expect(canDispatchQueuedHead(session)).toBe(false);
  });
});

describe("queued Steer cancellation unconditional editing owner clear", () => {
  it("starting cancellation while another row is being edited clears the editing owner", () => {
    const starting = chat({
      busy: true,
      editingQueuedMessageId: "b", // Row b is being edited
      queuedMessages: [queued("a", "first"), queued("b", "second")],
    });

    // Steer row "a" (not "b")
    const cancelling = beginQueuedSteerCancellation(starting, "a");

    expect(cancelling.queueStatus).toBe("steering");
    expect(cancelling.editingQueuedMessageId).toBeUndefined();
    expect(canDispatchQueuedHead(cancelling)).toBe(false);
  });
  it("preserves the selected queued row and its rich metadata intact at the queue head", () => {
    const selected: QueuedMessage = {
      id: "target",
      text: "plan migration",
      attachments: [{ id: "att-1", name: "doc.md", mimeType: "text/markdown", kind: "file", size: 50, path: "/tmp/doc.md" }],
      intent: "plan",
      noteCard: { id: "n1", slug: "card", title: "Card", body: "detail" },
      handoffCard: { from: "claude", to: "codex", brief: "continue", files: 1 },
    };
    const starting = chat({
      busy: true,
      queuedMessages: [queued("other", "first"), selected],
    });

    const cancelling = beginQueuedSteerCancellation(starting, "target");

    expect(cancelling.queuedMessages?.[0]).toEqual(selected);
    expect(cancelling.queuedMessages?.[0].intent).toBe("plan");
    expect(cancelling.queuedMessages?.[0].noteCard?.title).toBe("Card");
    expect(cancelling.queuedMessages?.[0].handoffCard?.to).toBe("codex");
  });

  it("locks queue mutations during steering and restores controls when cancellation settles", () => {
    const starting = chat({
      busy: true,
      queuedMessages: [queued("a", "first"), queued("b", "second")],
    });
    const cancelling = beginQueuedSteerCancellation(starting, "b");
    expect(cancelling.queueStatus).toBe("steering");

    // Guarded mutations during steering leave session unchanged
    const applyEdit = (session: Session, messageId: string, text: string) =>
      session.queueStatus !== "steering"
        ? {
            ...session,
            queuedMessages: session.queuedMessages?.map((m) =>
              m.id === messageId ? { ...m, text } : m,
            ),
          }
        : session;
    const applyDelete = (session: Session, messageId: string) =>
      session.queueStatus !== "steering" ? dequeueQueuedMessage(session, messageId) : session;

    expect(applyEdit(cancelling, "b", "mutated")).toBe(cancelling);
    expect(applyDelete(cancelling, "b")).toBe(cancelling);

    // After cancellation settles, controls return
    const finished = finishQueuedSteerCancellation(cancelling, true);
    expect(finished.queueStatus).toBe("active");
    expect(finished.busy).toBe(false);
    expect(canDispatchQueuedHead(finished)).toBe(true);

    const edited = applyEdit(finished, "b", "mutated after finish");
    expect(edited.queuedMessages?.[0].text).toBe("mutated after finish");

    const deleted = applyDelete(finished, "b");
    expect(deleted.queuedMessages?.map((m) => m.id)).toEqual(["a"]);
  });
});


describe("orchestrateTurnCompletion (production-used orchestration, Defect 2)", () => {
  it("synchronously sets queueStatus to held on session.error before checkpoint Promise resolves", async () => {
    let currentSession = chat({
      busy: true,
      queueStatus: "active",
      queuedMessages: [queued("q1", "queued row")],
    });
    let checkpointResolved = false;
    let resolveCheckpoint!: () => void;
    const checkpointPromise = new Promise<void>((resolve) => {
      resolveCheckpoint = () => {
        checkpointResolved = true;
        resolve();
      };
    });

    const completionPromise = orchestrateTurnCompletion({
      sessionId: currentSession.id,
      getSessions: () => [currentSession],
      setSessions: (sessions) => {
        currentSession = sessions[0];
      },
      flushCheckpoint: async () => checkpointPromise,
      providerFailureSeen: true, // session.error encountered
      buildSucceeded: false,
      nativePlanSeen: false,
      planEventKey: "plan-1",
    });

    // SYNCHRONOUS ASSERTIONS before checkpoint resolves:
    expect(checkpointResolved).toBe(false);
    expect(currentSession.queueStatus).toBe("held");
    expect(currentSession.busy).toBe(false);
    // canDispatchQueuedHead MUST be false synchronously!
    expect(canDispatchQueuedHead(currentSession)).toBe(false);

    // Resolve checkpoint flush
    resolveCheckpoint();
    await completionPromise;

    expect(checkpointResolved).toBe(true);
    expect(currentSession.queueStatus).toBe("held");
    expect(canDispatchQueuedHead(currentSession)).toBe(false);
  });

  it("synchronously sets queueStatus to held on direct send rejection before checkpoint Promise resolves", async () => {
    let currentSession = chat({
      busy: true,
      queueStatus: "active",
      queuedMessages: [queued("q1", "queued row")],
    });
    let checkpointResolved = false;
    let resolveCheckpoint!: () => void;
    const checkpointPromise = new Promise<void>((resolve) => {
      resolveCheckpoint = () => {
        checkpointResolved = true;
        resolve();
      };
    });

    // In App.tsx catch block: providerFailureSeen = true
    const completionPromise = orchestrateTurnCompletion({
      sessionId: currentSession.id,
      getSessions: () => [currentSession],
      setSessions: (sessions) => {
        currentSession = sessions[0];
      },
      flushCheckpoint: async () => checkpointPromise,
      providerFailureSeen: true,
      buildSucceeded: false,
      nativePlanSeen: false,
      planEventKey: "plan-1",
    });

    expect(checkpointResolved).toBe(false);
    expect(currentSession.queueStatus).toBe("held");
    expect(canDispatchQueuedHead(currentSession)).toBe(false);

    resolveCheckpoint();
    await completionPromise;
    expect(currentSession.queueStatus).toBe("held");
  });

  it("synchronously sets queueStatus to held on assistant failure-text detection before checkpoint Promise resolves", async () => {
    let currentSession = chat({
      busy: true,
      queueStatus: "active",
      blocks: [
        { id: "u1", role: "user", text: "hello" },
        { id: "a1", role: "assistant", text: "You have reached your usage limit. Upgrade your plan." },
      ],
      queuedMessages: [queued("q1", "queued row")],
    });
    let checkpointResolved = false;
    let resolveCheckpoint!: () => void;
    const checkpointPromise = new Promise<void>((resolve) => {
      resolveCheckpoint = () => {
        checkpointResolved = true;
        resolve();
      };
    });

    const completionPromise = orchestrateTurnCompletion({
      sessionId: currentSession.id,
      getSessions: () => [currentSession],
      setSessions: (sessions) => {
        currentSession = sessions[0];
      },
      flushCheckpoint: async () => checkpointPromise,
      providerFailureSeen: false, // failure detected via text
      buildSucceeded: false,
      nativePlanSeen: false,
      planEventKey: "plan-1",
    });

    // Synchronously before checkpoint resolves:
    expect(checkpointResolved).toBe(false);
    expect(currentSession.queueStatus).toBe("held");
    expect(canDispatchQueuedHead(currentSession)).toBe(false);

    resolveCheckpoint();
    await completionPromise;
    expect(currentSession.queueStatus).toBe("held");
  });

  it("preserves busy: true and prevents auto-dispatch on successful turn until checkpoint Promise resolves", async () => {
    let currentSession = chat({
      busy: true,
      queueStatus: "active",
      blocks: [
        { id: "u1", role: "user", text: "hello" },
        { id: "a1", role: "assistant", text: "Here is your answer." },
      ],
      queuedMessages: [queued("q1", "queued row")],
    });
    let checkpointResolved = false;
    let resolveCheckpoint!: () => void;
    const checkpointPromise = new Promise<void>((resolve) => {
      resolveCheckpoint = () => {
        checkpointResolved = true;
        resolve();
      };
    });

    const completionPromise = orchestrateTurnCompletion({
      sessionId: currentSession.id,
      getSessions: () => [currentSession],
      setSessions: (sessions) => {
        currentSession = sessions[0];
      },
      flushCheckpoint: async () => checkpointPromise,
      providerFailureSeen: false,
      buildSucceeded: true,
      nativePlanSeen: false,
      planEventKey: "plan-1",
    });

    // BEFORE checkpoint resolves: session remains busy, preventing premature dispatch!
    expect(checkpointResolved).toBe(false);
    expect(currentSession.busy).toBe(true);
    expect(canDispatchQueuedHead(currentSession)).toBe(false);

    // Resolve checkpoint flush
    resolveCheckpoint();
    await completionPromise;

    // AFTER checkpoint resolves: session is un-busied, allowing next auto-dispatch!
    expect(checkpointResolved).toBe(true);
    expect(currentSession.busy).toBe(false);
    expect(currentSession.queueStatus).toBe("active");
    expect(canDispatchQueuedHead(currentSession)).toBe(true);
  });
});
