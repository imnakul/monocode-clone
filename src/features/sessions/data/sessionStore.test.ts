import { describe, expect, it } from "vitest";
import { newSession, type Block, type Session } from "../model/session";
import { applyHarnessEvent } from "../../../integrations/harness/core/apply";
import { planBranch } from "../model/branchPlan";
import {
  isPersistableId,
  persistFingerprint,
  sanitizeSessionForPersist,
} from "./sessionStore";

describe("native branch persistence", () => {
  function branch(): Session {
    const source: Session = { ...newSession("claude", "/repo"), id: "source", providerSessionId: "provider", blocks: [
      { id: "u1", role: "user", text: "hello", providerForkPoint: "assistant-uuid" },
    ] };
    const plan = planBranch({ source, turn: source.blocks, newSessionId: "branch" });
    if (!plan) throw new Error("missing plan");
    return { ...newSession("claude", "/repo"), id: "branch", blocks: plan.blocks };
  }
  it("round-trips pending and uncertain forks and user positions through JSON", () => {
    for (const status of ["pending", "uncertain"] as const) {
      const session = branch();
      session.blocks[0].providerForkPoint = "new-uuid";
      const origin = session.blocks[1].branchOrigin;
      if (!origin) throw new Error("missing origin");
      origin.status = status;
      const saved = sanitizeSessionForPersist(session);
      const restored = sanitizeSessionForPersist({ ...session, blocks: JSON.parse(JSON.stringify(saved.blocks)) });
      expect(restored.blocks).toEqual(saved.blocks);
      expect(restored.blocks[0].providerForkPoint).toBe("new-uuid");
      expect(restored.blocks[1].branchOrigin).toMatchObject({ status, fork: { sourceProviderSessionId: "provider", forkPoint: "assistant-uuid", workCwd: "/repo" } });
    }
  });
  it("drops unsafe positions and unsafe fork IDs while retaining the divider", () => {
    const session = branch(); session.blocks[0].providerForkPoint = "/unsafe/path";
    const origin = session.blocks[1].branchOrigin;
    if (!origin?.fork) throw new Error("missing fork");
    for (const field of ["sourceProviderSessionId", "forkPoint", "providerAccountId", "sourceLastUserBlockId"] as const) {
      const malformed = { ...session, blocks: [session.blocks[0], { ...session.blocks[1], branchOrigin: { ...origin, fork: { ...origin.fork, [field]: "/unsafe/path" } } }] };
      const saved = sanitizeSessionForPersist(malformed);
      expect(saved.blocks[0].providerForkPoint).toBeUndefined();
      expect(saved.blocks[1].branchOrigin).toBeDefined(); expect(saved.blocks[1].branchOrigin?.fork).toBeUndefined();
    }
  });
  it.each([null, "oops", { status: "unknown" }, { mode: "bad" }, { harness: "bad" }, { summaryDelivery: "bad" }, { reason: "bad" }, { sourceTitle: 5 }, { sourceSessionId: "/bad" }])("drops invalid origin fields without throwing: %j", patch => {
    const session = branch();
    session.blocks[1].branchOrigin = (patch && typeof patch === "object" ? { ...session.blocks[1].branchOrigin, ...patch } : patch) as never;
    expect(sanitizeSessionForPersist(session).blocks[1].branchOrigin).toBeUndefined();
  });
  it("provider binding completes only the owned divider and removes the fork", () => {
    const session = branch(); const original = session.blocks[1];
    session.blocks.unshift({ ...original, id: "old-divider", branchOrigin: original.branchOrigin ? { ...original.branchOrigin, sessionId: "other" } : undefined });
    const bound = applyHarnessEvent(session, { type: "session.providerBound", providerSessionId: "forked" });
    expect(bound.blocks[0].branchOrigin?.status).toBe("pending");
    expect(bound.blocks[2].branchOrigin?.status).toBe("done"); expect(bound.blocks[2].branchOrigin?.fork).toBeUndefined();
    const positioned = applyHarnessEvent(bound, { type: "turn.forkPoint", providerForkPoint: "position" });
    expect(positioned.blocks[1].providerForkPoint).toBe("position");
  });
});

describe("isPersistableId", () => {
  it("accepts alphanumeric ids with hyphens and underscores", () => {
    expect(isPersistableId("acp-session-1")).toBe(true);
    expect(isPersistableId("abc_123")).toBe(true);
  });

  it("rejects filesystem paths", () => {
    expect(isPersistableId("/Users/me/.pi/agent/sessions/abc.jsonl")).toBe(
      false,
    );
  });
});

describe("persisting a subagent's trail", () => {
  const withRun = (steps: Block["agentRun"]) => {
    const session = newSession("claude", "/tmp/project");
    session.blocks = [
      {
        id: "a1",
        role: "tool",
        text: "Correctness review",
        tool: { callId: "agent-1", kind: "agent", status: "completed" },
        agentRun: steps,
      },
    ];
    return sanitizeSessionForPersist(session)?.blocks[0].agentRun;
  };

  it("keeps the run so a reopened session can still be inspected", () => {
    expect(
      withRun({
        name: "Correctness review",
        agentType: "code-reviewer",
        steps: [
          {
            id: "s1",
            kind: "tool",
            text: "Read src/App.tsx",
            toolKind: "read",
            status: "completed",
          },
          { id: "s2", kind: "message", text: "Nothing to flag." },
        ],
      }),
    ).toEqual({
      name: "Correctness review",
      agentType: "code-reviewer",
      steps: [
        {
          id: "s1",
          kind: "tool",
          text: "Read src/App.tsx",
          toolKind: "read",
          status: "completed",
        },
        { id: "s2", kind: "message", text: "Nothing to flag." },
      ],
    });
  });

  it("drops steps a provider left malformed", () => {
    expect(
      withRun({
        name: "Correctness review",
        steps: [
          { id: "", kind: "tool", text: "Read" },
          { id: "s2", kind: "bogus", text: "Read" },
          { id: "s3", kind: "tool", text: "Read src/App.tsx" },
        ] as never,
      })?.steps,
    ).toEqual([{ id: "s3", kind: "tool", text: "Read src/App.tsx" }]);
  });

  it("keeps only the tail of a long run", () => {
    const steps = Array.from({ length: 260 }, (_, index) => ({
      id: `s${index}`,
      kind: "tool" as const,
      text: `Read file-${index}.ts`,
    }));
    const saved = withRun({ name: "Correctness review", steps });
    expect(saved?.steps).toHaveLength(100);
    expect(saved?.steps[99].id).toBe("s259");
  });
});

describe("sanitizeSessionForPersist", () => {
  it("keeps an unsent user turn appended to a started thread", () => {
    const session = newSession("codex", "/repo");
    session.blocks = [
      { id: "sent", role: "user", text: "Start here" },
      { id: "reply", role: "assistant", text: "Done" },
      { id: "draft", role: "user", text: "Explore this", draft: true },
    ];
    expect(sanitizeSessionForPersist(session).blocks).toEqual([
      { id: "sent", role: "user", text: "Start here" },
      { id: "reply", role: "assistant", text: "Done" },
      { id: "draft", role: "user", text: "Explore this", draft: true },
    ]);
  });

  it("persists a removed worktree as an explicit unselected working-copy state", () => {
    const session = newSession("codex", "/repo");
    session.worktreeCwd = "/repo-worktrees/feature";
    session.worktreeRemoved = true;
    session.blocks = [{ id: "u", role: "user", text: "Build feature" }];
    expect(sanitizeSessionForPersist(session)).toMatchObject({
      worktreeCwd: "/repo-worktrees/feature",
      worktreeRemoved: true,
    });
  });

  it("preserves an internal worker's lead, hidden turns, and token metrics", () => {
    const session = {
      ...newSession("claude", "/repo"),
      orchestrationLeadId: "lead",
    };
    session.blocks = [
      {
        id: "u",
        role: "user",
        text: "Bounded assignment",
        internal: true,
        turnMetrics: { inputTokens: 100, outputTokens: 20 },
      },
    ];
    const saved = sanitizeSessionForPersist(session);
    expect(saved.blocks[0]).toMatchObject({
      orchestrationLeadId: "lead",
      internal: true,
      turnMetrics: { inputTokens: 100, outputTokens: 20 },
    });
    expect(session.blocks[0].orchestrationLeadId).toBeUndefined();
    expect(
      sanitizeSessionForPersist({
        ...session,
        orchestrationLeadId: undefined,
        blocks: saved.blocks,
      }).blocks[0],
    ).toEqual(saved.blocks[0]);
  });
  it("persists model provenance recorded on a user turn", () => {
    const session = newSession("claude", "/tmp/project", "claude:opus-5");
    session.blocks = [
      {
        id: "u1",
        role: "user",
        text: "remember this",
        turnModel: {
          harness: "claude",
          id: "claude:opus-5",
          name: "Claude Opus 5",
        },
      },
    ];

    expect(sanitizeSessionForPersist(session).blocks[0]?.turnModel).toEqual({
      harness: "claude",
      id: "claude:opus-5",
      name: "Claude Opus 5",
    });
  });

  it("persists provider metrics recorded on a user turn", () => {
    const session = newSession("claude", "/tmp/project");
    session.blocks = [
      {
        id: "u1",
        role: "user",
        text: "remember this",
        turnMetrics: {
          inputTokens: 100,
          outputTokens: 20,
          cacheReadTokens: 80,
          cacheHitPercent: 40,
        },
      },
    ];

    expect(sanitizeSessionForPersist(session).blocks[0]?.turnMetrics).toEqual({
      inputTokens: 100,
      outputTokens: 20,
      cacheReadTokens: 80,
      cacheHitPercent: 40,
    });
  });

  it("persists a canonical GitHub work-item identity", () => {
    const session = newSession("codex", "/tmp/project");
    session.blocks = [{ id: "u1", role: "user", text: "fix PR #42" }];
    session.linkedWorkItem = {
      kind: "pr",
      repo: "openai/codex",
      number: 42,
      url: "https://example.com/not-trusted",
    };

    expect(sanitizeSessionForPersist(session).linkedWorkItem).toEqual({
      kind: "pr",
      repo: "openai/codex",
      number: 42,
      url: "https://github.com/openai/codex/pull/42",
    });
  });

  it("persists the automation that started a session", () => {
    const session = newSession("codex", "/tmp/project");
    session.blocks = [{ id: "u1", role: "user", text: "review PRs" }];
    session.automationId = "automation-1";
    expect(sanitizeSessionForPersist(session).automationId).toBe(
      "automation-1",
    );
  });

  it("omits a path-like provider session id so upsert can still snapshot git", () => {
    const session = newSession("pi", "/tmp/project");
    session.providerSessionId = "/Users/me/.pi/agent/sessions/abc.jsonl";
    session.blocks = [{ id: "u1", role: "user", text: "hey" }];

    expect(
      sanitizeSessionForPersist(session).providerSessionId,
    ).toBeUndefined();
  });

  it("keeps a UUID provider session id", () => {
    const session = newSession("pi", "/tmp/project");
    session.providerSessionId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    session.blocks = [{ id: "u1", role: "user", text: "hey" }];

    expect(sanitizeSessionForPersist(session).providerSessionId).toBe(
      "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    );
  });

  it("keeps a handoff divider and settles a preparing one", () => {
    const session = newSession("cursor", "/tmp/project");
    session.blocks = [
      { id: "u1", role: "user", text: "hey" },
      {
        id: "h1",
        role: "handoff",
        text: "",
        handoff: { from: "cursor", to: "claude", status: "preparing" },
      },
    ];
    const persisted = sanitizeSessionForPersist(session);
    expect(persisted.blocks[1]).toMatchObject({
      role: "handoff",
      handoff: { from: "cursor", to: "claude", status: "ready", pending: true },
    });
  });

  it("keeps valid interjection chrome only on system blocks", () => {
    const session = newSession("pi", "/tmp/project");
    session.blocks = [
      {
        id: "i1",
        role: "system",
        text: "Review the fallback.",
        interjection: { customType: " advisor ", severity: "blocker" },
      },
      {
        id: "a1",
        role: "assistant",
        text: "Not chrome",
        interjection: { customType: "advisor", severity: "nit" },
      },
    ];

    const persisted = sanitizeSessionForPersist(session);
    expect(persisted.blocks[0]).toMatchObject({
      role: "system",
      text: "Review the fallback.",
      interjection: { customType: "advisor", severity: "blocker" },
    });
    expect(persisted.blocks[1]?.interjection).toBeUndefined();
  });

  it("drops malformed interjection metadata without dropping its system row", () => {
    const session = newSession("pi", "/tmp/project");
    session.blocks = [
      {
        id: "i1",
        role: "system",
        text: "Still visible",
        interjection: {
          customType: " ",
          severity: "unknown",
        } as unknown as Block["interjection"],
      },
    ];

    expect(sanitizeSessionForPersist(session).blocks[0]).toEqual({
      id: "i1",
      role: "system",
      text: "Still visible",
    });
  });

  it("keeps a notice flag on system blocks and drops anything else", () => {
    const session = newSession("pi", "/tmp/project");
    session.blocks = [
      {
        id: "e1",
        role: "system",
        text: "Provider connection lost",
        notice: "error",
      },
      {
        id: "i1",
        role: "system",
        text: "Turn interrupted when MonoCode quit.",
        notice: "interrupt",
      },
      {
        id: "b1",
        role: "system",
        text: "Mystery",
        notice: "mystery" as Block["notice"],
      },
      {
        id: "a1",
        role: "assistant",
        text: "hi",
        notice: "error" as Block["notice"],
      },
    ];

    const persisted = sanitizeSessionForPersist(session).blocks;
    expect(persisted[0]?.notice).toBe("error");
    expect(persisted[1]?.notice).toBe("interrupt");
    expect(persisted[2]?.notice).toBeUndefined();
    expect(persisted[3]?.notice).toBeUndefined();
  });

  it("keeps a second-opinion card on the user turn", () => {
    const session = newSession("codex", "/tmp/project");
    session.blocks = [
      {
        id: "u1",
        role: "user",
        text: "Second opinion",
        secondOpinion: {
          from: "claude",
          to: "codex",
          request: "fix the footer",
          files: 2,
        },
      },
    ];
    expect(sanitizeSessionForPersist(session).blocks[0]).toMatchObject({
      role: "user",
      text: "Second opinion",
      secondOpinion: {
        from: "claude",
        to: "codex",
        request: "fix the footer",
        files: 2,
      },
    });
  });

  it("keeps a handoff card kind on the user turn", () => {
    const session = newSession("codex", "/tmp/project");
    session.blocks = [
      {
        id: "u1",
        role: "user",
        text: "Handoff",
        secondOpinion: {
          from: "claude",
          to: "codex",
          kind: "handoff",
        },
      },
    ];
    expect(sanitizeSessionForPersist(session).blocks[0]).toMatchObject({
      role: "user",
      text: "Handoff",
      secondOpinion: { from: "claude", to: "codex", kind: "handoff" },
    });
  });

  it("keeps a note card on the user turn without the note body", () => {
    const session = newSession("codex", "/tmp/project");
    session.blocks = [
      {
        id: "u1",
        role: "user",
        text: "hi",
        noteCard: {
          id: "n1",
          slug: "overview",
          title: "agent-os project overview",
          sourceCwd: "/tmp/project",
        },
      },
    ];
    expect(sanitizeSessionForPersist(session).blocks[0]).toEqual({
      id: "u1",
      role: "user",
      text: "hi",
      noteCard: {
        id: "n1",
        slug: "overview",
        title: "agent-os project overview",
        sourceCwd: "/tmp/project",
      },
    });
  });

  it("keeps edited and approved plan metadata", () => {
    const session = newSession("codex", "/tmp/project");
    session.blocks = [
      { id: "u1", role: "user", text: "plan this" },
      {
        id: "p1",
        role: "plan",
        text: "# Edited plan",
        plan: {
          key: "turn:1",
          status: "built",
          originalText: "# Original plan",
          approvedText: "# Edited plan",
          edited: true,
        },
      },
    ];
    expect(sanitizeSessionForPersist(session).blocks[1]).toMatchObject({
      role: "plan",
      text: "# Edited plan",
      plan: {
        key: "turn:1",
        status: "built",
        originalText: "# Original plan",
        approvedText: "# Edited plan",
        edited: true,
      },
    });
  });

  it("keeps structured task lists", () => {
    const session = newSession("codex", "/tmp/project");
    session.blocks = [
      { id: "u1", role: "user", text: "fix it" },
      {
        id: "tasks1",
        role: "tasks",
        text: "[x] Inspect\n[~] Implement",
        taskList: {
          key: "turn_1",
          explanation: "Inspection complete.",
          items: [
            { id: "1", text: "Inspect", status: "completed" },
            { id: "2", text: "Implement", status: "in_progress" },
          ],
        },
      },
    ];
    expect(sanitizeSessionForPersist(session).blocks[1]).toEqual(
      session.blocks[1],
    );
  });

  it("persists queued follow-ups with persistable attachments", () => {
    const session = newSession("codex", "/tmp/project");
    session.blocks = [{ id: "u1", role: "user", text: "hi" }];
    session.queuedMessages = [
      {
        id: "q1",
        text: "follow up",
        attachments: [
          {
            id: "a1",
            name: "shot.png",
            mimeType: "image/png",
            kind: "image",
            size: 12,
            path: "/tmp/shot.png",
            data: "base64payload",
            previewUrl: "blob:preview",
          },
        ],
      },
    ];
    const persisted = sanitizeSessionForPersist(session);
    expect(persisted.queuedMessages).toEqual([
      {
        id: "q1",
        text: "follow up",
        attachments: [
          {
            id: "a1",
            name: "shot.png",
            mimeType: "image/png",
            kind: "image",
            size: 12,
            path: "/tmp/shot.png",
          },
        ],
      },
    ]);
  });

  it("omits the queue when empty", () => {
    const session = newSession("codex", "/tmp/project");
    session.blocks = [{ id: "u1", role: "user", text: "hi" }];
    session.queuedMessages = [];
    expect(sanitizeSessionForPersist(session).queuedMessages).toBeUndefined();
  });
});

describe("persistFingerprint", () => {
  const user: Block = { id: "u1", role: "user", text: "hi" };
  const answer: Block = { id: "a1", role: "assistant", text: "done" };

  // One base session: `newSession` mints a fresh id, and the id is part of the
  // fingerprint, so variants have to be spread off a single session.
  const base = (blocks: Block[] = [user, answer]): Session => ({
    ...newSession("codex", "/tmp/project"),
    blocks,
  });

  it("is stable while nothing changes", () => {
    const session = base();
    expect(persistFingerprint(session)).toBe(persistFingerprint(session));
  });

  it("matches a copy holding the same blocks", () => {
    const session = base();
    expect(persistFingerprint({ ...session })).toBe(
      persistFingerprint(session),
    );
  });

  it("changes when an automation origin is stamped", () => {
    const before = base();
    expect(
      persistFingerprint({ ...before, automationId: "automation-1" }),
    ).not.toBe(persistFingerprint(before));
  });

  it("changes when a block in the middle is replaced", () => {
    const tool: Block = {
      id: "t1",
      role: "tool",
      text: "run",
      tool: { status: "running" },
    };
    const before = base([user, tool, answer]);
    const after = {
      ...before,
      blocks: [user, { ...tool, tool: { status: "completed" } }, answer],
    };
    expect(persistFingerprint(after)).not.toBe(persistFingerprint(before));
  });

  it("changes when an approval is decided", () => {
    const approval: Block = {
      id: "p1",
      role: "approval",
      text: "allow?",
      approval: { requestId: 1 },
    };
    const before = base([user, approval]);
    const after = {
      ...before,
      blocks: [
        user,
        { ...approval, approval: { requestId: 1, decided: "allow" as const } },
      ],
    };
    expect(persistFingerprint(after)).not.toBe(persistFingerprint(before));
  });

  it("persists a resolved session scope and caps its hint at 200 characters", () => {
    const session = base([
      user,
      {
        id: "approval",
        role: "approval",
        text: "Run a tool?",
        approval: {
          requestId: 1,
          decided: "allow",
          scope: "session",
          sessionScopeHint: "h".repeat(250),
        },
      },
    ]);
    const persisted = sanitizeSessionForPersist(session);
    expect(persisted.blocks[1]?.approval).toEqual({
      requestId: 1,
      decided: "allow",
      scope: "session",
      sessionScopeHint: "h".repeat(200),
    });
  });

  it("changes when a block is appended", () => {
    const before = base([user]);
    expect(persistFingerprint({ ...before, blocks: [user, answer] })).not.toBe(
      persistFingerprint(before),
    );
  });

  it("changes when a persisted field changes", () => {
    const before = base();
    expect(persistFingerprint({ ...before, title: "Renamed" })).not.toBe(
      persistFingerprint(before),
    );
  });

  it("ignores state that is never written", () => {
    const before = base();
    expect(persistFingerprint({ ...before, busy: true })).toBe(
      persistFingerprint(before),
    );
  });

  it("never persists a pending form or fingerprints its request lifecycle", () => {
    const before = base();
    const requested = applyHarnessEvent(before, {
      type: "form.requested",
      requestId: 19,
      serverName: "docs",
      message: "A private form prompt",
      fields: [
        {
          key: "account_name",
          label: "Account name",
          kind: "text",
          required: true,
        },
      ],
    });
    const secondPending = {
      ...requested,
      pendingForm: {
        requestId: 20,
        serverName: "another-server",
        message: "A different prompt",
        fields: [
          {
            key: "other_secret",
            label: "Other secret",
            kind: "text" as const,
            required: false,
          },
        ],
      },
    };
    const persisted = sanitizeSessionForPersist(requested);
    const serialized = JSON.stringify(persisted);
    expect(persisted).not.toHaveProperty("pendingForm");
    expect(serialized).not.toContain("account_name");
    expect(serialized).not.toContain("A private form prompt");
    expect(serialized).not.toContain("draft-only-value");
    expect(persistFingerprint(requested)).toBe(persistFingerprint(before));
    expect(persistFingerprint(secondPending)).toBe(persistFingerprint(requested));

    const resolved = applyHarnessEvent(requested, {
      type: "form.resolved",
      requestId: 19,
      decision: "submitted",
    });
    expect(persistFingerprint(resolved)).toBe(persistFingerprint(before));
  });

  it("treats a path-like provider session id as absent", () => {
    const session = base();
    expect(
      persistFingerprint({
        ...session,
        providerSessionId: "/Users/me/.pi/agent/sessions/abc.jsonl",
      }),
    ).toBe(persistFingerprint(session));
  });

  it("matches persist for a zero context window", () => {
    const session = base();
    expect(
      persistFingerprint({ ...session, context: { used: 10, window: 0 } }),
    ).toBe(persistFingerprint({ ...session, context: { used: 10 } }));
  });
});
