import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sent: string[] = [];
let onLine: ((line: string) => void) | undefined;
const writeChild = vi.fn(async (_id: string, line: string) => {
  sent.push(line);
});

vi.mock("../../core/child", () => ({
  resolveCodexBinary: async () => ({ path: "/fake/codex" }),
  spawnChild: async () => undefined,
  killChild: async () => undefined,
  unwatchChild: () => undefined,
  watchChild: (_id: string, line: (l: string) => void) => {
    onLine = line;
  },
  writeChild,
}));

const {
  compactCodexContext,
  bindCodexSession,
  cancelCodexTurn,
  keepCodexQuestionOpen,
  respondCodexApproval,
  respondCodexForm,
  respondCodexQuestion,
  rewindCodexLastTurn,
  sendCodexTurn,
  stopCodexSession,
  __codexTestReset,
} = await import("./codex");
import type { HarnessEvent } from "../../core/types";
import { NativeForkError, type NativeForkRequest } from "../../core/types";
import { newSession, type RuntimeMode, type TurnIntent } from "../../../../features/sessions/model/session";
import { applyHarnessEvent } from "../../core/apply";

function parse() {
  return sent.map((line) => JSON.parse(line) as Record<string, unknown>);
}

function reply(id: number, result: unknown) {
  onLine!(JSON.stringify({ id, result }));
}

function notify(method: string, params: unknown) {
  onLine!(JSON.stringify({ method, params }));
}

function sendMcpToolRequest(
  id: number,
  toolName: string,
  options: {
    startItem?: boolean;
    completeItem?: boolean;
    itemThreadId?: string;
    server?: string;
  } = {},
) {
  const server = options.server ?? "socraticode";
  const item = {
    id: `call_${id}`,
    type: "mcpToolCall",
    server,
    tool: toolName,
    status: "inProgress",
  };
  if (options.startItem ?? true) {
    notify("item/started", {
      threadId: options.itemThreadId ?? "thr_1",
      item,
    });
  }
  if (options.completeItem) {
    notify("item/completed", {
      threadId: options.itemThreadId ?? "thr_1",
      item,
    });
  }
  onLine!(
    JSON.stringify({
      id,
      method: "mcpServer/elicitation/request",
      params: {
        serverName: server,
        mode: "form",
        message: `Allow the ${server} MCP server to run tool "${toolName}"?`,
        requestedSchema: { type: "object", properties: {} },
        _meta: {
          codex_approval_kind: "mcp_tool_call",
          persist: ["session", "always"],
          tool_description: "tool description",
          tool_params: {},
          tool_params_display: [],
        },
      },
    }),
  );
}

function withoutTurnIdentity(events: HarnessEvent[]) {
  return events.filter((event) => event.type !== "turn.started");
}

const waitFor = async (pred: () => boolean, label: string) => {
  for (let i = 0; i < 200; i++) {
    if (pred()) return;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error(
    `timed out waiting for ${label}; sent=${JSON.stringify(parse().map((m) => m.method ?? `reply:${m.id}`))}`,
  );
};

async function startTurn(
  sessionId: string,
  options: {
    runtimeMode?: RuntimeMode;
    intent?: TurnIntent;
    resume?: boolean;
    providerAccountId?: string;
    resumeProviderAccountId?: string;
    expectResume?: boolean;
    beforeThreadReply?: () => Promise<void>;
    onAccepted?: () => void;
    fork?: NativeForkRequest;
  } = {},
) {
  const events: HarnessEvent[] = [];
  if (options.resume) {
    bindCodexSession(
      sessionId,
      "thr_1",
      "/repo",
      options.resumeProviderAccountId,
    );
  }
  const turn = sendCodexTurn({
    sessionId,
    fork: options.fork,
    cwd: "/repo",
    model: "codex:gpt-5.4",
    modelSettings: {},
    providerAccountId: options.providerAccountId,
    runtimeMode: options.runtimeMode ?? "supervised",
    intent: options.intent,
    text: "summarize the changelog",
    attachments: [],
    onAccepted: options.onAccepted,
    onEvent: (event) => events.push(event),
  });

  await waitFor(
    () => parse().some((m) => m.method === "initialize"),
    "initialize",
  );
  reply(parse().find((m) => m.method === "initialize")!.id as number, {});
  const threadMethod =
    (options.expectResume ?? options.resume) ? "thread/resume" : options.fork ? "thread/fork" : "thread/start";
  await waitFor(
    () => parse().some((m) => m.method === threadMethod),
    threadMethod,
  );
  await options.beforeThreadReply?.();
  reply(parse().find((m) => m.method === threadMethod)!.id as number, {
    thread: { id: "thr_1" },
  });

  await waitFor(
    () => parse().some((m) => m.method === "turn/start"),
    "turn/start",
  );
  reply(parse().find((m) => m.method === "turn/start")!.id as number, {
    turn: { id: "turn_1", status: "inProgress" },
  });
  notify("turn/started", { turn: { id: "turn_1", status: "inProgress" } });
  return { events, turn };
}

function sendFollowupTurn(
  sessionId: string,
  options: { intent?: TurnIntent; text?: string } = {},
) {
  const events: HarnessEvent[] = [];
  const turn = sendCodexTurn({
    sessionId,
    cwd: "/repo",
    model: "codex:gpt-5.4",
    modelSettings: {},
    runtimeMode: "supervised",
    intent: options.intent,
    text: options.text ?? "continue the conversation",
    attachments: [],
    onEvent: (event) => events.push(event),
  });
  return { events, turn };
}

describe("codex live turn sequence", () => {
  it("forks without starting a fresh thread, then resumes the fork on the next send", async () => {
    const { events, turn } = await startTurn("codex-live", { fork: { sourceProviderSessionId: "source", forkPoint: "turn-2" } });
    expect(parse().find(message => message.method === "thread/fork")?.params).toEqual({ threadId: "source", lastTurnId: "turn-2", excludeTurns: true, cwd: "/repo", approvalPolicy: "untrusted", approvalsReviewer: "user", sandbox: "read-only", model: "gpt-5.4" });
    expect(parse().some(message => message.method === "thread/start" || message.method === "thread/resume")).toBe(false);
    expect(events).toContainEqual({ type: "session.providerBound", providerSessionId: "thr_1" });
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } }); await turn;
    await stopCodexSession("codex-live"); sent.length = 0;
    const next = await startTurn("codex-live", { expectResume: true, fork: { sourceProviderSessionId: "source" } });
    expect(parse().find(message => message.method === "thread/resume")?.params).toMatchObject({ threadId: "thr_1" });
    expect(parse().some(message => message.method === "thread/fork")).toBe(false);
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } }); await next.turn;
  });
  it.each(["reject", "missing-id"] as const)("proves a %s fork failure precedes turn/start", async outcome => {
    const pending = sendCodexTurn({ sessionId: "codex-live", cwd: "/repo", model: "codex:gpt-5.4", runtimeMode: "supervised", text: "hello", fork: { sourceProviderSessionId: "source" }, onEvent: () => {} });
    const rejected = expect(pending).rejects.toBeInstanceOf(NativeForkError);
    await waitFor(() => parse().some(message => message.method === "initialize"), "initialize");
    reply(parse().find(message => message.method === "initialize")!.id as number, {});
    await waitFor(() => parse().some(message => message.method === "thread/fork"), "fork");
    const id = parse().find(message => message.method === "thread/fork")!.id;
    if (outcome === "reject") onLine?.(JSON.stringify({ id, error: { code: -1, message: "fork rejected" } }));
    else reply(id as number, {});
    await rejected; expect(parse().some(message => message.method === "turn/start")).toBe(false);
  });
  beforeEach(() => {
    sent.length = 0;
    onLine = undefined;
    writeChild.mockClear();
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    await stopCodexSession("codex-live");
    __codexTestReset();
  });

  it("marks context stale for parent compaction, ignoring child compaction", async () => {
    const { events, turn } = await startTurn("codex-live");
    notify("thread/compacted", { threadId: "child" });
    expect(events).not.toContainEqual({ type: "context.stale" });
    notify("thread/compacted", { threadId: "thr_1" });
    expect(events).toContainEqual({ type: "context.stale" });
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
  });

  it("reports when the provider accepts a turn", async () => {
    const onAccepted = vi.fn();
    const { turn } = await startTurn("codex-live", { onAccepted });

    await waitFor(() => onAccepted.mock.calls.length === 1, "turn acceptance");
    expect(onAccepted).toHaveBeenCalledOnce();
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
  });

  it("keeps retries and HTTP fallback out of a successful turn's transcript", async () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    const { events, turn } = await startTurn("codex-live");
    const settled = vi.fn();
    void turn.then(settled);
    const beforeRetries = [...events];
    for (let attempt = 1; attempt <= 5; attempt++) {
      notify("error", {
        threadId: "thr_1",
        turnId: "turn_1",
        error: { message: `Reconnecting... ${attempt}/5` },
        willRetry: true,
      });
    }
    const fallback =
      "Falling back from WebSockets to HTTPS transport. unexpected status 404 Not Found: Unknown endpoint: GET /v1/responses, url: ws://127.0.0.1:19101/v1/responses";
    notify("warning", { threadId: "thr_1", message: fallback });
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    expect(withoutTurnIdentity(events)).toEqual(
      withoutTurnIdentity(beforeRetries),
    );
    expect(debug).toHaveBeenCalledTimes(6);
    expect(debug).toHaveBeenCalledWith(expect.any(String), fallback);

    notify("item/agentMessage/delta", { delta: "The answer" });
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
    expect(settled).toHaveBeenCalledOnce();
    const session = events.reduce(
      applyHarnessEvent,
      newSession("codex", "/repo", "codex:gpt-5.4", "supervised"),
    );
    expect(session.blocks).toMatchObject([
      { role: "assistant", text: "The answer", streaming: false },
    ]);
  });

  it("resumes a legacy thread when the missing account resolves to default", async () => {
    const { turn } = await startTurn("codex-live", {
      resume: true,
      providerAccountId: "default",
    });
    expect(parse().some((message) => message.method === "thread/resume")).toBe(
      true,
    );
    expect(parse().some((message) => message.method === "thread/start")).toBe(
      false,
    );
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
  });

  it("does not resume a legacy default thread under a named account", async () => {
    const { turn } = await startTurn("codex-live", {
      resume: true,
      providerAccountId: "account-work",
      expectResume: false,
    });
    expect(parse().some((message) => message.method === "thread/start")).toBe(
      true,
    );
    expect(parse().some((message) => message.method === "thread/resume")).toBe(
      false,
    );
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
  });

  it("still surfaces a terminal failure after transport retries", async () => {
    vi.spyOn(console, "debug").mockImplementation(() => {});
    const { events, turn } = await startTurn("codex-live");
    notify("error", {
      error: { message: "Reconnecting... 5/5" },
      willRetry: true,
    });
    const message =
      "Response stream disconnected after too many failed attempts";
    notify("error", { error: { message }, willRetry: false });
    expect(events).toContainEqual({ type: "session.error", message });
    notify("turn/completed", {
      turn: { id: "turn_1", status: "failed", error: { message } },
    });
    await turn;
    const session = events.reduce(
      applyHarnessEvent,
      newSession("codex", "/repo", "codex:gpt-5.4", "supervised"),
    );
    expect(session.blocks).toContainEqual(
      expect.objectContaining({ role: "system", text: message }),
    );
    expect(
      session.blocks.some((block) => block.text.includes("Reconnecting")),
    ).toBe(false);
  });

  it.each([false, true])(
    "answers the external clock before thread setup finishes, resume=%s",
    async (resume) => {
      vi.spyOn(Date, "now").mockReturnValue(1_789_000_000_789);
      const { events, turn } = await startTurn("codex-live", {
        resume,
        beforeThreadReply: async () => {
          onLine!(
            JSON.stringify({
              id: "clock_setup",
              method: "currentTime/read",
              params: { threadId: "thr_1" },
            }),
          );
          await Promise.resolve();
        },
      });
      notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
      await turn;
      expect(parse().find((m) => m.id === "clock_setup")).toEqual({
        id: "clock_setup",
        result: { currentTimeAt: 1_789_000_000 },
      });
      expect(events.some((e) => e.type === "session.error")).toBe(false);
    },
  );

  it.each([undefined, "plan"] as const)(
    "answers fresh clock reads without interrupting a pending question, intent=%s",
    async (intent) => {
      const now = vi.spyOn(Date, "now").mockReturnValue(1_789_000_000_789);
      const { events, turn } = await startTurn("codex-live", { intent });
      expect(
        parse().find((m) => m.method === "initialize")?.params,
      ).toMatchObject({
        capabilities: { experimentalApi: true },
      });
      expect(
        parse().find((m) => m.method === "turn/start")?.params,
      ).toMatchObject({
        collaborationMode: { mode: intent === "plan" ? "plan" : "default" },
      });
      onLine!(
        JSON.stringify({
          id: "pending_question",
          method: "item/tool/requestUserInput",
          params: {
            itemId: "q1",
            questions: [
              { id: "choice", header: "Source", question: "Which source?" },
            ],
          },
        }),
      );
      await waitFor(
        () => events.some((e) => e.type === "question.asked"),
        "question",
      );
      const beforeClock = [...events];
      for (const [id, millis] of [
        [91, 1_789_000_000_789],
        ["clock_next", 1_789_000_005_123],
      ] as const) {
        now.mockReturnValue(millis);
        onLine!(
          JSON.stringify({
            id,
            method: "currentTime/read",
            params: { threadId: "thr_1" },
          }),
        );
        await waitFor(
          () => parse().some((m) => m.id === id),
          "external clock reply",
        );
        expect(parse().find((m) => m.id === id)).toEqual({
          id,
          result: { currentTimeAt: Math.floor(millis / 1000) },
        });
      }
      expect(events).toEqual(beforeClock);
      expect(parse().some((m) => m.id === "pending_question")).toBe(false);
      notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
      await turn;
    },
  );

  it.each([false, true])(
    "routes full-access escalation after resume=%s",
    async (resume) => {
      const { events, turn } = await startTurn("codex-live", {
        runtimeMode: "full-access",
        resume,
      });
      for (const message of parse().filter((m) =>
        ["thread/start", "thread/resume", "turn/start"].includes(
          String(m.method),
        ),
      )) {
        expect(message.params).toMatchObject({
          approvalPolicy: "on-request",
          approvalsReviewer: "user",
        });
      }
      onLine!(
        JSON.stringify({
          id: 91,
          method: "item/commandExecution/requestApproval",
          params: { itemId: "read_1", command: "git status --short" },
        }),
      );
      await waitFor(
        () => parse().some((m) => m.id === 91),
        "full-access response",
      );
      expect(parse().find((m) => m.id === 91)?.result).toEqual({
        decision: "accept",
      });
      expect(events.some((e) => e.type === "approval.requested")).toBe(false);
      notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
      await turn;
    },
  );

  it("still waits for an explicit command decision in supervised mode", async () => {
    const { events, turn } = await startTurn("codex-live");
    onLine!(
      JSON.stringify({
        id: 91,
        method: "item/commandExecution/requestApproval",
        params: { itemId: "cmd_1", command: "git status --short" },
      }),
    );
    await waitFor(
      () => events.some((e) => e.type === "approval.requested"),
      "approval UI",
    );
    expect(parse().some((m) => m.id === 91)).toBe(false);
    const request = events.find((e) => e.type === "approval.requested")!;
    if (request.type !== "approval.requested")
      throw new Error("missing approval");
    respondCodexApproval("codex-live", request.requestId, "deny");
    await waitFor(() => parse().some((m) => m.id === 91), "denial");
    expect(parse().find((m) => m.id === 91)?.result).toEqual({
      decision: "decline",
    });
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
  });

  it("sends acceptForSession for an explicit command session approval", async () => {
    const { events, turn } = await startTurn("codex-live");
    onLine!(
      JSON.stringify({
        id: 91,
        method: "item/commandExecution/requestApproval",
        params: { itemId: "cmd_1", command: "npm test" },
      }),
    );
    await waitFor(
      () => events.some((event) => event.type === "approval.requested"),
      "command approval UI",
    );
    const request = events.find((event) => event.type === "approval.requested");
    if (request?.type !== "approval.requested")
      throw new Error("missing command approval");
    expect(request.sessionScope?.hint).toBe(
      "Stop asking for this command until Codex restarts.",
    );
    respondCodexApproval("codex-live", request.requestId, "allow", "session");
    await waitFor(() => parse().some((message) => message.id === 91), "reply");
    expect(parse().find((message) => message.id === 91)?.result).toEqual({
      decision: "acceptForSession",
    });
    expect(events).toContainEqual({
      type: "approval.resolved",
      requestId: request.requestId,
      decision: "allow",
      scope: "session",
    });
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
  });

  it("uses session scope for supervised permission requests only when selected", async () => {
    const { events, turn } = await startTurn("codex-live");
    const permissions = { fileSystem: { read: ["/repo/data"] } };
    onLine!(
      JSON.stringify({
        id: 91,
        method: "item/permissions/requestApproval",
        params: { itemId: "perm_1", permissions },
      }),
    );
    await waitFor(
      () => events.some((event) => event.type === "approval.requested"),
      "permissions approval UI",
    );
    const request = events.find((event) => event.type === "approval.requested");
    if (request?.type !== "approval.requested")
      throw new Error("missing permissions approval");
    expect(request.sessionScope?.hint).toBe(
      "Keep these permissions for the rest of this Codex session.",
    );
    respondCodexApproval("codex-live", request.requestId, "allow", "session");
    await waitFor(() => parse().some((message) => message.id === 91), "reply");
    expect(parse().find((message) => message.id === 91)?.result).toEqual({
      scope: "session",
      permissions,
    });
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
  });

  it.each(["allow", "deny"] as const)(
    "keeps a child approval answerable after a sibling completes: %s",
    async (decision) => {
      const { events, turn } = await startTurn("codex-live");
      const settled = vi.fn();
      void turn.then(settled);
      onLine!(
        JSON.stringify({
          id: "child_approval",
          method: "item/commandExecution/requestApproval",
          params: {
            threadId: "thr_child",
            turnId: "turn_child",
            itemId: "child_read",
            command: "cat ~/.gitconfig",
          },
        }),
      );
      const approval = events.find(
        (event) => event.type === "approval.requested",
      )!;
      expect(approval).toMatchObject({ callId: "child_read" });
      const before = [...events];
      notify("turn/started", {
        threadId: "thr_sibling",
        turn: { id: "turn_sibling" },
      });
      notify("item/agentMessage/delta", {
        threadId: "thr_sibling",
        delta: "Child-only text",
      });
      notify("turn/completed", {
        threadId: "thr_sibling",
        turn: { id: "turn_sibling", status: "completed" },
      });
      notify("error", {
        threadId: "thr_sibling",
        error: { message: "Child failed" },
        willRetry: false,
      });
      await Promise.resolve();
      expect(withoutTurnIdentity(events)).toEqual(withoutTurnIdentity(before));
      expect(settled).not.toHaveBeenCalled();
      respondCodexApproval("codex-live", approval.requestId, decision);
      await waitFor(
        () => parse().some((message) => message.id === "child_approval"),
        "child decision",
      );
      expect(
        parse().find((message) => message.id === "child_approval")?.result,
      ).toEqual({
        decision: decision === "allow" ? "accept" : "decline",
      });
      notify("turn/completed", {
        threadId: "thr_1",
        turn: { id: "turn_1", status: "completed" },
      });
      await turn;
    },
  );

  it("clears a server-resolved child approval using its owning thread", async () => {
    const { events, turn } = await startTurn("codex-live");
    onLine!(
      JSON.stringify({
        id: "child_approval",
        method: "item/commandExecution/requestApproval",
        params: {
          threadId: "thr_child",
          itemId: "child_read",
          command: "cat ~/.gitconfig",
        },
      }),
    );
    const approval = events.find(
      (event) => event.type === "approval.requested",
    )!;
    notify("serverRequest/resolved", {
      threadId: "thr_1",
      requestId: "child_approval",
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(events.some((event) => event.type === "approval.resolved")).toBe(
      false,
    );
    notify("serverRequest/resolved", {
      threadId: "thr_child",
      requestId: "child_approval",
    });
    await waitFor(
      () => events.some((event) => event.type === "approval.resolved"),
      "child cleanup",
    );
    expect(events).toContainEqual({
      type: "approval.resolved",
      requestId: approval.requestId,
      decision: "cancelled",
    });
    expect(parse().some((message) => message.id === "child_approval")).toBe(
      false,
    );
    notify("turn/completed", {
      threadId: "thr_1",
      turn: { id: "turn_1", status: "completed" },
    });
    await turn;
  });

  it.each(["allow", "deny"] as const)(
    "answers a child's filesystem permission request: %s",
    async (decision) => {
      const { events, turn } = await startTurn("codex-live");
      const permissions = { fileSystem: { read: ["/home/user/.gitconfig"] } };
      onLine!(
        JSON.stringify({
          id: "child_permissions",
          method: "item/permissions/requestApproval",
          params: {
            threadId: "thr_child",
            turnId: "turn_child",
            itemId: "child_read",
            permissions,
          },
        }),
      );
      const approval = events.find(
        (event) => event.type === "approval.requested",
      )!;
      respondCodexApproval("codex-live", approval.requestId, decision);
      await waitFor(
        () => parse().some((message) => message.id === "child_permissions"),
        "filesystem permission response",
      );
      expect(
        parse().find((message) => message.id === "child_permissions")?.result,
      ).toEqual(
        decision === "allow"
          ? { scope: "turn", permissions }
          : { permissions: {} },
      );
      notify("turn/completed", {
        threadId: "thr_1",
        turn: { id: "turn_1", status: "completed" },
      });
      await turn;
    },
  );

  it("advances the question queue when the server resolves a child's request", async () => {
    const { events, turn } = await startTurn("codex-live");
    for (const id of ["child_a", "child_b"]) {
      onLine!(
        JSON.stringify({
          id,
          method: "item/tool/requestUserInput",
          params: {
            threadId: id,
            questions: [{ id: "q", question: id, isOther: true, options: [] }],
          },
        }),
      );
    }
    notify("serverRequest/resolved", {
      threadId: "child_a",
      requestId: "child_a",
    });
    await waitFor(
      () =>
        events.filter((event) => event.type === "question.asked").length === 2,
      "second child question",
    );
    const session = events.reduce(
      applyHarnessEvent,
      newSession("codex", "/repo"),
    );
    expect(session.pendingQuestion?.questions[0].prompt).toBe("child_b");
    expect(parse().some((message) => message.id === "child_a")).toBe(false);
    respondCodexQuestion("codex-live", session.pendingQuestion!.requestId, {
      kind: "skipped",
    });
    await waitFor(
      () => parse().some((message) => message.id === "child_b"),
      "second child response",
    );
    notify("turn/completed", {
      threadId: "thr_1",
      turn: { id: "turn_1", status: "completed" },
    });
    await turn;
  });

  it("fails the active turn if a child permission reply cannot be delivered", async () => {
    const { events, turn } = await startTurn("codex-live");
    onLine!(
      JSON.stringify({
        id: "child_approval",
        method: "item/commandExecution/requestApproval",
        params: {
          threadId: "thr_child",
          itemId: "child_read",
          command: "cat ~/.gitconfig",
        },
      }),
    );
    const approval = events.find(
      (event) => event.type === "approval.requested",
    )!;
    let outcome: unknown;
    void turn.catch((error) => {
      outcome = error;
    });
    writeChild.mockRejectedValueOnce(new Error("Broken pipe"));
    respondCodexApproval("codex-live", approval.requestId, "allow");
    await waitFor(() => outcome instanceof Error, "failed permission delivery");
    expect(outcome).toMatchObject({ message: "Broken pipe" });
    expect(events).toContainEqual({
      type: "session.error",
      message: "Broken pipe",
    });
  });

  it.each([undefined, "plan"] as const)(
    "waits for user input in full-access intent=%s",
    async (intent) => {
      const { events, turn } = await startTurn("codex-live", {
        runtimeMode: "full-access",
        intent,
      });
      onLine!(
        JSON.stringify({
          id: "question_rpc",
          method: "item/tool/requestUserInput",
          params: {
            itemId: "question_1",
            questions: [
              {
                id: "permission",
                header: "Access",
                question: "Read the external source?",
                isOther: true,
                isSecret: false,
                options: [
                  { label: "Accept", description: "Read the source." },
                  { label: "Decline", description: "Skip." },
                ],
              },
            ],
          },
        }),
      );
      await waitFor(
        () => events.some((e) => e.type === "question.asked"),
        "question UI",
      );
      expect(parse().some((m) => m.id === "question_rpc")).toBe(false);
      const request = events.find((e) => e.type === "question.asked")!;
      if (request.type !== "question.asked")
        throw new Error("missing question");
      respondCodexQuestion("codex-live", request.requestId, {
        kind: "answered",
        answers: { permission: ["Decline"] },
      });
      await waitFor(
        () => parse().some((m) => m.id === "question_rpc"),
        "question response",
      );
      expect(parse().find((m) => m.id === "question_rpc")?.result).toEqual({
        answers: { permission: { answers: ["Decline"] } },
      });
      expect(events).toContainEqual({
        type: "question.resolved",
        requestId: request.requestId,
        decision: "answered",
      });
      notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
      await turn;
    },
  );

  it.each(["skip", "server", "complete", "stop", "cancel"])(
    "clears pending questions on %s",
    async (action) => {
      const { events, turn } = await startTurn("codex-live");
      onLine!(
        JSON.stringify({
          id: 91,
          method: "item/tool/requestUserInput",
          params: {
            itemId: "q1",
            questions: [
              {
                id: "q",
                question: "Which source?",
                isSecret: false,
                isOther: true,
                options: null,
              },
            ],
          },
        }),
      );
      await waitFor(
        () => events.some((e) => e.type === "question.asked"),
        "question UI",
      );
      const request = events.find((e) => e.type === "question.asked")!;
      if (request.type !== "question.asked")
        throw new Error("missing question");
      if (action === "skip")
        respondCodexQuestion("codex-live", request.requestId, {
          kind: "skipped",
        });
      if (action === "server")
        notify("serverRequest/resolved", { threadId: "thr_1", requestId: 91 });
      if (action === "complete")
        notify("turn/completed", {
          turn: { id: "turn_1", status: "completed" },
        });
      if (action === "stop") await stopCodexSession("codex-live");
      if (action === "cancel") {
        const cancelled = cancelCodexTurn("codex-live");
        await waitFor(
          () => parse().some((m) => m.method === "turn/interrupt"),
          "interrupt",
        );
        reply(
          parse().find((m) => m.method === "turn/interrupt")!.id as number,
          {},
        );
        await cancelled;
      }
      await waitFor(
        () => events.some((e) => e.type === "question.resolved"),
        "question cleanup",
      );
      expect(events).toContainEqual({
        type: "question.resolved",
        requestId: request.requestId,
        decision: action === "skip" ? "skipped" : "cancelled",
      });
      if (action === "skip")
        expect(parse().find((m) => m.id === 91)?.result).toEqual({
          answers: {},
        });
      else expect(parse().some((m) => m.id === 91)).toBe(false);
      respondCodexQuestion("codex-live", request.requestId, {
        kind: "answered",
        answers: {},
        custom: { q: "too late" },
      });
      notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
      await turn;
      expect(parse().filter((m) => m.id === 91)).toHaveLength(
        action === "skip" ? 1 : 0,
      );
    },
  );

  it("does not collect secret answers in the transcript question UI", async () => {
    const { events, turn } = await startTurn("codex-live");
    onLine!(
      JSON.stringify({
        id: 91,
        method: "item/tool/requestUserInput",
        params: {
          questions: [
            {
              id: "secret",
              question: "Enter a secret",
              isSecret: true,
              options: null,
            },
          ],
        },
      }),
    );
    await waitFor(
      () => parse().some((m) => m.id === 91),
      "unsupported secret response",
    );
    expect(events.some((e) => e.type === "question.asked")).toBe(false);
    expect(events).toContainEqual({
      type: "status",
      text: expect.stringContaining("secret input"),
    });
    expect(parse().find((m) => m.id === 91)?.result).toEqual({ answers: {} });
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
  });

  it("auto-approves full-access file and permission requests", async () => {
    const { events, turn } = await startTurn("codex-live", {
      runtimeMode: "full-access",
    });
    onLine!(
      JSON.stringify({
        id: 91,
        method: "item/fileChange/requestApproval",
        params: { itemId: "edit_1", reason: "Edit the requested file" },
      }),
    );
    const permissions = { network: { enabled: true } };
    onLine!(
      JSON.stringify({
        id: 92,
        method: "item/permissions/requestApproval",
        params: { itemId: "perm_1", permissions },
      }),
    );
    await waitFor(() => parse().some((m) => m.id === 92), "permission grant");
    expect(parse().find((m) => m.id === 91)?.result).toEqual({
      decision: "accept",
    });
    expect(parse().find((m) => m.id === 92)?.result).toEqual({
      scope: "session",
      permissions,
    });
    expect(events.some((e) => e.type === "approval.requested")).toBe(false);
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
  });

  it("queues concurrent questions instead of hiding the first one", async () => {
    const { events, turn } = await startTurn("codex-live");
    for (const id of [91, 92])
      onLine!(
        JSON.stringify({
          id,
          method: "item/tool/requestUserInput",
          params: {
            questions: [
              {
                id: `q${id}`,
                question: `Question ${id}`,
                options: null,
                isOther: true,
              },
            ],
          },
        }),
      );
    const asked = () => events.filter((e) => e.type === "question.asked");
    expect(asked()).toHaveLength(1);
    respondCodexQuestion("codex-live", asked()[0].requestId, {
      kind: "answered",
      answers: {},
      custom: { q91: "first answer" },
    });
    await waitFor(() => asked().length === 2, "second question");
    respondCodexQuestion("codex-live", asked()[1].requestId, {
      kind: "skipped",
    });
    await waitFor(() => parse().some((m) => m.id === 92), "second reply");
    expect(parse().find((m) => m.id === 91)?.result).toEqual({
      answers: { q91: { answers: ["first answer"] } },
    });
    expect(parse().find((m) => m.id === 92)?.result).toEqual({ answers: {} });
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
  });

  it.each([
    { decision: "allow", boolean: false },
    { decision: "deny", boolean: false },
    { decision: "allow", boolean: true },
    { decision: "deny", boolean: true },
  ] as const)(
    "shows other MCP confirmation in Full Access and sends $decision, boolean=$boolean",
    async ({ decision, boolean }) => {
      const { events, turn } = await startTurn("codex-live", {
        runtimeMode: "full-access",
      });
      onLine!(
        JSON.stringify({
          id: 91,
          method: "mcpServer/elicitation/request",
          params: {
            serverName: "example",
            mode: "form",
            message: "Read this source?",
            requestedSchema: boolean
              ? {
                  type: "object",
                  properties: { approved: { type: "boolean" } },
                  required: ["approved"],
                }
              : { type: "object", properties: {} },
          },
        }),
      );
      await waitFor(
        () => events.some((e) => e.type === "approval.requested"),
        "MCP approval UI",
      );
      expect(parse().some((m) => m.id === 91)).toBe(false);
      const approval = events.find((e) => e.type === "approval.requested")!;
      respondCodexApproval("codex-live", approval.requestId, decision);
      await waitFor(() => parse().some((m) => m.id === 91), "MCP response");
      expect(parse().find((m) => m.id === 91)?.result).toEqual({
        action: decision === "allow" ? "accept" : "decline",
        content:
          decision === "allow" ? (boolean ? { approved: true } : {}) : null,
        _meta: null,
      });
      notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
      await turn;
    },
  );

  it("auto-approves computer-use app access in Full Access", async () => {
    const { events, turn } = await startTurn("codex-live", {
      runtimeMode: "full-access",
    });
    onLine!(
      JSON.stringify({
        id: 91,
        method: "mcpServer/elicitation/request",
        params: {
          serverName: "cua_repl",
          mode: "form",
          message: 'Allow Computer Use to use "QuickTime Player"?',
          requestedSchema: {
            type: "object",
            properties: {},
            required: [],
          },
        },
      }),
    );
    await waitFor(() => parse().some((m) => m.id === 91), "MCP response");
    expect(parse().find((m) => m.id === 91)?.result).toEqual({
      action: "accept",
      content: {},
      _meta: null,
    });
    expect(events.some((e) => e.type === "approval.requested")).toBe(false);
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
  });

  it("replays an MCP session grant after a Codex restart and prompts for other tools", async () => {
    const { events, turn } = await startTurn("codex-live");
    sendMcpToolRequest(91, "codebase_status");
    await waitFor(
      () => events.some((event) => event.type === "approval.requested"),
      "MCP approval UI",
    );
    const request = events.find((event) => event.type === "approval.requested");
    if (request?.type !== "approval.requested")
      throw new Error("missing MCP approval");
    expect(request.sessionScope?.hint).toBe(
      "Stop asking for this tool until the chat closes.",
    );
    respondCodexApproval("codex-live", request.requestId, "allow", "session");
    await waitFor(() => parse().some((message) => message.id === 91), "reply");
    expect(parse().find((message) => message.id === 91)?.result).toEqual({
      action: "accept",
      content: {},
      _meta: { persist: "session" },
    });
    notify("item/completed", {
      threadId: "thr_1",
      item: {
        id: "call_91",
        type: "mcpToolCall",
        server: "socraticode",
        tool: "codebase_status",
        status: "completed",
      },
    });
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;

    await stopCodexSession("codex-live");
    sent.length = 0;
    const resumed = await startTurn("codex-live", { resume: true });
    sendMcpToolRequest(92, "codebase_status");
    await waitFor(() => parse().some((message) => message.id === 92), "replayed reply");
    expect(parse().find((message) => message.id === 92)?.result).toEqual({
      action: "accept",
      content: {},
      _meta: { persist: "session" },
    });
    expect(resumed.events.some((event) => event.type === "approval.requested")).toBe(
      false,
    );

    sendMcpToolRequest(93, "codebase_search");
    await waitFor(
      () => resumed.events.some((event) => event.type === "approval.requested"),
      "different MCP tool approval UI",
    );
    const different = resumed.events.find(
      (event) => event.type === "approval.requested",
    );
    if (different?.type !== "approval.requested")
      throw new Error("missing different MCP approval");
    respondCodexApproval("codex-live", different.requestId, "allow");
    await waitFor(() => parse().some((message) => message.id === 93), "one-time reply");
    expect(parse().find((message) => message.id === 93)?.result).toEqual({
      action: "accept",
      content: {},
      _meta: null,
    });
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await resumed.turn;
  });

  it("offers no session scope when the in-progress item is absent", async () => {
    const { events, turn } = await startTurn("codex-live");
    sendMcpToolRequest(91, "codebase_status", { startItem: false });
    await waitFor(
      () => events.some((event) => event.type === "approval.requested"),
      "MCP approval without an item",
    );
    const approval = events.find((event) => event.type === "approval.requested");
    if (approval?.type !== "approval.requested")
      throw new Error("missing MCP approval");
    expect(approval.sessionScope).toBeUndefined();
    respondCodexApproval("codex-live", approval.requestId, "deny");
    await waitFor(() => parse().some((message) => message.id === 91), "reply");
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
  });

  it("offers no session scope after the matching item completes", async () => {
    const { events, turn } = await startTurn("codex-live");
    sendMcpToolRequest(91, "codebase_status", { completeItem: true });
    await waitFor(
      () => events.some((event) => event.type === "approval.requested"),
      "MCP approval after item completion",
    );
    const approval = events.find((event) => event.type === "approval.requested");
    if (approval?.type !== "approval.requested")
      throw new Error("missing MCP approval");
    expect(approval.sessionScope).toBeUndefined();
    respondCodexApproval("codex-live", approval.requestId, "deny");
    await waitFor(() => parse().some((message) => message.id === 91), "reply");
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
  });

  it("does not carry an in-progress MCP item into the next turn", async () => {
    const first = await startTurn("codex-live");
    notify("item/started", {
      threadId: "thr_1",
      item: {
        id: "call_91",
        type: "mcpToolCall",
        server: "socraticode",
        tool: "codebase_status",
        status: "inProgress",
      },
    });
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await first.turn;

    sent.length = 0;
    const events: HarnessEvent[] = [];
    const nextTurn = sendCodexTurn({
      sessionId: "codex-live",
      cwd: "/repo",
      model: "codex:gpt-5.4",
      modelSettings: {},
      runtimeMode: "supervised",
      text: "continue",
      attachments: [],
      onEvent: (event) => events.push(event),
    });
    await waitFor(
      () => parse().some((message) => message.method === "turn/start"),
      "second turn start",
    );
    const turnStart = parse().find((message) => message.method === "turn/start");
    if (typeof turnStart?.id !== "number")
      throw new Error("missing second turn request id");
    reply(turnStart.id, { turn: { id: "turn_2", status: "inProgress" } });
    notify("turn/started", { turn: { id: "turn_2", status: "inProgress" } });

    sendMcpToolRequest(92, "codebase_status", { startItem: false });
    await waitFor(
      () => events.some((event) => event.type === "approval.requested"),
      "MCP approval in the next turn",
    );
    const approval = events.find((event) => event.type === "approval.requested");
    if (approval?.type !== "approval.requested")
      throw new Error("missing MCP approval");
    expect(approval.sessionScope).toBeUndefined();
    respondCodexApproval("codex-live", approval.requestId, "deny");
    await waitFor(() => parse().some((message) => message.id === 92), "reply");
    notify("turn/completed", { turn: { id: "turn_2", status: "completed" } });
    await nextTurn;
  });

  it("does not use child-thread items to scope a parent MCP approval", async () => {
    const { events, turn } = await startTurn("codex-live");
    sendMcpToolRequest(91, "codebase_status", {
      itemThreadId: "child-thread",
    });
    await waitFor(
      () => events.some((event) => event.type === "approval.requested"),
      "parent MCP approval",
    );
    const approval = events.find((event) => event.type === "approval.requested");
    if (approval?.type !== "approval.requested")
      throw new Error("missing MCP approval");
    expect(approval.sessionScope).toBeUndefined();
    respondCodexApproval("codex-live", approval.requestId, "deny");
    await waitFor(() => parse().some((message) => message.id === 91), "reply");
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
  });

  it("does not reuse a stored MCP grant during a Plan turn", async () => {
    const first = await startTurn("codex-live");
    sendMcpToolRequest(91, "codebase_status");
    await waitFor(
      () => first.events.some((event) => event.type === "approval.requested"),
      "MCP approval",
    );
    const initialApproval = first.events.find(
      (event) => event.type === "approval.requested",
    );
    if (initialApproval?.type !== "approval.requested")
      throw new Error("missing MCP approval");
    respondCodexApproval(
      "codex-live",
      initialApproval.requestId,
      "allow",
      "session",
    );
    await waitFor(() => parse().some((message) => message.id === 91), "grant reply");
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await first.turn;

    sent.length = 0;
    const plan = sendFollowupTurn("codex-live", { intent: "plan" });
    await waitFor(
      () => parse().some((message) => message.method === "turn/start"),
      "Plan turn start",
    );
    const turnStart = parse().find((message) => message.method === "turn/start");
    if (typeof turnStart?.id !== "number")
      throw new Error("missing Plan turn request id");
    reply(turnStart.id, { turn: { id: "turn_2", status: "inProgress" } });
    notify("turn/started", { turn: { id: "turn_2", status: "inProgress" } });

    sendMcpToolRequest(92, "codebase_status");
    await waitFor(
      () => plan.events.some((event) => event.type === "approval.requested"),
      "Plan MCP approval",
    );
    const approval = plan.events.find(
      (event) => event.type === "approval.requested",
    );
    if (approval?.type !== "approval.requested")
      throw new Error("missing Plan MCP approval");
    expect(parse().some((message) => message.id === 92)).toBe(false);
    respondCodexApproval("codex-live", approval.requestId, "deny");
    await waitFor(() => parse().some((message) => message.id === 92), "Plan reply");
    notify("turn/completed", { turn: { id: "turn_2", status: "completed" } });
    await plan.turn;
  });

  it("does not save a Codex session grant when the session stops during the response write", async () => {
    const first = await startTurn("codex-live");
    sendMcpToolRequest(91, "codebase_status");
    await waitFor(
      () => first.events.some((event) => event.type === "approval.requested"),
      "MCP approval",
    );
    const approval = first.events.find(
      (event) => event.type === "approval.requested",
    );
    if (approval?.type !== "approval.requested")
      throw new Error("missing MCP approval");

    let releaseWrite: (() => void) | undefined;
    const responseWrite = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    writeChild.mockImplementationOnce(async (_id, line) => {
      await responseWrite;
      sent.push(line);
    });
    respondCodexApproval("codex-live", approval.requestId, "allow", "session");
    await waitFor(
      () =>
        writeChild.mock.calls.some((call) => {
          const message = JSON.parse(call[1]) as Record<string, unknown>;
          return message.id === 91;
        }),
      "pending session approval write",
    );

    await stopCodexSession("codex-live");
    releaseWrite?.();
    await waitFor(() => parse().some((message) => message.id === 91), "late reply");
    await first.turn;
    await new Promise((resolve) => setTimeout(resolve, 0));

    sent.length = 0;
    const resumed = await startTurn("codex-live", { resume: true });
    sendMcpToolRequest(92, "codebase_status");
    await waitFor(
      () => resumed.events.some((event) => event.type === "approval.requested"),
      "new MCP approval after stop",
    );
    const nextApproval = resumed.events.find(
      (event) => event.type === "approval.requested",
    );
    if (nextApproval?.type !== "approval.requested")
      throw new Error("missing MCP approval after stop");
    respondCodexApproval("codex-live", nextApproval.requestId, "deny");
    await waitFor(() => parse().some((message) => message.id === 92), "new reply");
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await resumed.turn;
  });

  it("logs only the sanitized Codex MCP elicitation diagnostic", async () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    const { turn } = await startTurn("codex-live");
    onLine!(
      JSON.stringify({
        id: 91,
        method: "mcpServer/elicitation/request",
        params: {
          serverName: "socraticode",
          mode: "form",
          requestedSchema: { type: "object", properties: {} },
          _meta: {
            codex_approval_kind: "mcp_tool_call",
            persist: ["session", "never-share-this"],
            tool_name: "secret-tool",
            arguments: { path: "C:/private/path" },
          },
        },
      }),
    );
    await waitFor(
      () => debug.mock.calls.length === 1,
      "sanitized elicitation diagnostic",
    );
    expect(debug).toHaveBeenCalledWith(
      "[monocode] codex elicitation",
      expect.objectContaining({
        method: "mcpServer/elicitation/request",
        serverName: "socraticode",
        metaKeys: expect.arrayContaining([
          "arguments:object",
          "tool_name:string",
        ]),
        approvalKind: "mcp_tool_call",
        persist: ["session", "other"],
        hasSchemaProperties: false,
      }),
    );
    const detail = debug.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.keys(detail).sort()).toEqual(
      [
        "approvalKind",
        "hasSchemaProperties",
        "metaKeys",
        "method",
        "persist",
        "serverName",
      ].sort(),
    );
    expect(JSON.stringify(detail)).not.toContain("secret-tool");
    expect(JSON.stringify(detail)).not.toContain("C:/private/path");
    await stopCodexSession("codex-live");
    await turn.catch(() => undefined);
  });

  it.each([false, true, undefined])(
    "honors isBlocking=%s without relying on deprecated autoResolutionMs",
    async (isBlocking) => {
      const { events, turn } = await startTurn("codex-live");
      vi.useFakeTimers();
      onLine!(
        JSON.stringify({
          id: 91,
          method: "item/tool/requestUserInput",
          params: {
            isBlocking,
            autoResolutionMs: 1,
            questions: [
              { id: "q", question: "Choose a source", options: null },
            ],
          },
        }),
      );
      const question = events.find((event) => event.type === "question.asked")!;
      expect(question.autoResolveAt).toBe(
        isBlocking === false ? Date.now() + 120_000 : undefined,
      );
      await vi.advanceTimersByTimeAsync(119_999);
      expect(parse().some((m) => m.id === 91)).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      if (isBlocking === false) {
        expect(parse().find((m) => m.id === 91)?.result).toEqual({
          answers: {},
        });
        expect(events).toContainEqual({
          type: "question.resolved",
          requestId: question.requestId,
          decision: "skipped",
        });
      } else {
        expect(parse().some((m) => m.id === 91)).toBe(false);
      }
      notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
      await turn;
    },
  );

  it("keeps an optional question open after interaction and preserves its answer", async () => {
    const { events, turn } = await startTurn("codex-live");
    vi.useFakeTimers();
    onLine!(
      JSON.stringify({
        id: 91,
        method: "item/tool/requestUserInput",
        params: {
          isBlocking: false,
          questions: [{ id: "q", question: "Choose a source", options: null }],
        },
      }),
    );
    const question = events.find((event) => event.type === "question.asked")!;
    await vi.advanceTimersByTimeAsync(60_000);
    keepCodexQuestionOpen("codex-live", question.requestId);
    await vi.advanceTimersByTimeAsync(240_000);
    expect(parse().some((m) => m.id === 91)).toBe(false);
    const state = events.reduce(
      applyHarnessEvent,
      newSession("codex", "/repo", "codex:gpt-5.4", "supervised"),
    );
    expect(state.pendingQuestion?.autoResolveAt).toBeUndefined();
    respondCodexQuestion("codex-live", question.requestId, {
      kind: "answered",
      answers: {},
      custom: { q: "chosen source" },
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(parse().find((m) => m.id === 91)?.result).toEqual({
      answers: { q: { answers: ["chosen source"] } },
    });
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
  });

  it("starts each queued optional question's deadline when it is shown", async () => {
    const { events, turn } = await startTurn("codex-live");
    vi.useFakeTimers();
    for (const id of [91, 92])
      onLine!(
        JSON.stringify({
          id,
          method: "item/tool/requestUserInput",
          params: {
            isBlocking: false,
            questions: [{ id: "q", question: `Question ${id}`, options: null }],
          },
        }),
      );
    expect(
      events.filter((event) => event.type === "question.asked"),
    ).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(parse().filter((m) => m.id === 91)).toHaveLength(1);
    expect(parse().some((m) => m.id === 92)).toBe(false);
    const questions = events.filter((event) => event.type === "question.asked");
    expect(questions).toHaveLength(2);
    expect(questions[1].autoResolveAt).toBe(Date.now() + 120_000);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(parse().filter((m) => m.id === 92)).toHaveLength(1);
    expect(
      events.reduce(
        applyHarnessEvent,
        newSession("codex", "/repo", "codex:gpt-5.4", "supervised"),
      ).pendingQuestion,
    ).toBeUndefined();
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
  });

  it.each(["answer", "server", "stop", "complete"])(
    "clears optional question timers on %s without a late reply",
    async (action) => {
      const { events, turn } = await startTurn("codex-live");
      vi.useFakeTimers();
      onLine!(
        JSON.stringify({
          id: 91,
          method: "item/tool/requestUserInput",
          params: {
            isBlocking: false,
            questions: [
              { id: "q", question: "Choose a source", options: null },
            ],
          },
        }),
      );
      const question = events.find((event) => event.type === "question.asked")!;
      if (action === "answer")
        respondCodexQuestion("codex-live", question.requestId, {
          kind: "skipped",
        });
      if (action === "server")
        notify("serverRequest/resolved", { threadId: "thr_1", requestId: 91 });
      if (action === "stop") await stopCodexSession("codex-live");
      if (action === "complete")
        notify("turn/completed", {
          turn: { id: "turn_1", status: "completed" },
        });
      await vi.advanceTimersByTimeAsync(0);
      expect(vi.getTimerCount()).toBe(0);
      await vi.advanceTimersByTimeAsync(240_000);
      respondCodexQuestion("codex-live", question.requestId, {
        kind: "answered",
        answers: {},
        custom: { q: "too late" },
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(parse().filter((m) => m.id === 91)).toHaveLength(
        action === "answer" ? 1 : 0,
      );
      expect(
        events.filter((event) => event.type === "question.resolved"),
      ).toHaveLength(1);
      notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
      await turn;
    },
  );

  it("submits a supported form without exposing its values in events", async () => {
    const { events, turn } = await startTurn("codex-live");
    onLine!(
      JSON.stringify({
        id: 91,
        method: "mcpServer/elicitation/request",
        params: {
          mode: "form",
          serverName: "docs",
          message: "Choose a display name",
          requestedSchema: {
            type: "object",
            properties: { name: { type: "string", title: "Name" } },
            required: ["name"],
          },
        },
      }),
    );
    await waitFor(
      () => events.some((event) => event.type === "form.requested"),
      "form UI",
    );
    const requested = events.find((event) => event.type === "form.requested");
    if (requested?.type !== "form.requested")
      throw new Error("missing MCP form");
    expect(parse().some((message) => message.id === 91)).toBe(false);

    respondCodexForm("codex-live", requested.requestId, {
      kind: "submit",
      content: { name: "Al" },
    });
    await waitFor(() => parse().some((message) => message.id === 91), "form reply");

    expect(events.map((event) => event.type)).toContain("form.resolved");
    expect(events).toContainEqual({
      type: "status",
      text: "docs: form submitted (1 field).",
    });
    expect(
      events.findIndex((event) => event.type === "form.requested"),
    ).toBeLessThan(events.findIndex((event) => event.type === "form.resolved"));
    expect(
      events.findIndex((event) => event.type === "form.resolved"),
    ).toBeLessThan(events.findIndex((event) => event.type === "status"));
    expect(parse().find((message) => message.id === 91)?.result).toEqual({
      action: "accept",
      content: { name: "Al" },
      _meta: null,
    });
    expect(JSON.stringify(events)).not.toContain("Al");
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
  });

  it("keeps forms with approval metadata out of slice 1 grants", async () => {
    const { events, turn } = await startTurn("codex-live");
    const sendRequest = (id: number, includeProperties: boolean) =>
      onLine!(
        JSON.stringify({
          id,
          method: "mcpServer/elicitation/request",
          params: {
            mode: "form",
            serverName: "socraticode",
            message: "Fill in the values",
            requestedSchema: {
              type: "object",
              properties: includeProperties
                ? { name: { type: "string" }, team: { type: "string" } }
                : {},
            },
            _meta: {
              codex_approval_kind: "mcp_tool_call",
              persist: ["session", "always"],
              tool_name: "codebase_search",
            },
          },
        }),
      );

    sendRequest(91, true);
    await waitFor(
      () => events.some((event) => event.type === "form.requested"),
      "form request with approval metadata",
    );
    const form = events.find((event) => event.type === "form.requested");
    if (form?.type !== "form.requested") throw new Error("missing form");
    expect(events.some((event) => event.type === "approval.requested")).toBe(false);
    respondCodexForm("codex-live", form.requestId, {
      kind: "submit",
      content: { name: "Al", team: "docs" },
    });
    await waitFor(() => parse().some((message) => message.id === 91), "form reply");
    expect(parse().find((message) => message.id === 91)?.result).toEqual({
      action: "accept",
      content: { name: "Al", team: "docs" },
      _meta: null,
    });

    sendRequest(92, false);
    await waitFor(
      () => events.some((event) => event.type === "approval.requested"),
      "confirmation approval",
    );
    const approval = events.find((event) => event.type === "approval.requested");
    if (approval?.type !== "approval.requested")
      throw new Error("missing confirmation approval");
    expect(approval.sessionScope?.hint).toBe(
      "Stop asking for this tool until the chat closes.",
    );
    respondCodexApproval("codex-live", approval.requestId, "deny");
    await waitFor(() => parse().some((message) => message.id === 92), "approval reply");
    expect(events.some((event) => event.type === "form.requested" && event.requestId === approval.requestId)).toBe(false);
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
  });

  it("queues forms in arrival order and shows one at a time", async () => {
    const { events, turn } = await startTurn("codex-live");
    const sendForm = (id: number, key: string) =>
      onLine!(
        JSON.stringify({
          id,
          method: "mcpServer/elicitation/request",
          params: {
            mode: "form",
            serverName: "docs",
            message: `Fill ${key}`,
            requestedSchema: {
              type: "object",
              properties: { [key]: { type: "string" } },
              required: [key],
            },
          },
        }),
      );
    sendForm(91, "first");
    sendForm(92, "second");
    await waitFor(
      () => events.filter((event) => event.type === "form.requested").length === 1,
      "first form",
    );
    const first = events.find((event) => event.type === "form.requested");
    if (first?.type !== "form.requested") throw new Error("missing first form");
    expect(first.fields[0]?.key).toBe("first");
    expect(events.filter((event) => event.type === "form.requested")).toHaveLength(1);

    respondCodexForm("codex-live", first.requestId, {
      kind: "submit",
      content: { first: "one" },
    });
    await waitFor(
      () => events.filter((event) => event.type === "form.requested").length === 2,
      "second form",
    );
    const requested = events.filter((event) => event.type === "form.requested");
    const second = requested[1];
    if (second?.type !== "form.requested") throw new Error("missing second form");
    expect(second.fields[0]?.key).toBe("second");
    respondCodexForm("codex-live", second.requestId, {
      kind: "submit",
      content: { second: "two" },
    });
    await waitFor(() => parse().some((message) => message.id === 92), "second reply");
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
  });

  it("declines a form with no content and records only the decision", async () => {
    const { events, turn } = await startTurn("codex-live");
    onLine!(
      JSON.stringify({
        id: 91,
        method: "mcpServer/elicitation/request",
        params: {
          mode: "form",
          serverName: "docs",
          requestedSchema: {
            type: "object",
            properties: { name: { type: "string" } },
          },
        },
      }),
    );
    await waitFor(() => events.some((event) => event.type === "form.requested"), "form UI");
    const form = events.find((event) => event.type === "form.requested");
    if (form?.type !== "form.requested") throw new Error("missing form");
    respondCodexForm("codex-live", form.requestId, { kind: "decline" });
    await waitFor(() => parse().some((message) => message.id === 91), "decline reply");

    expect(parse().find((message) => message.id === 91)?.result).toEqual({
      action: "decline",
      content: null,
      _meta: null,
    });
    expect(events).toContainEqual({
      type: "status",
      text: "docs: form declined.",
    });
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
  });

  it("rejects invalid replies without resolving the form", async () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    const { events, turn } = await startTurn("codex-live");
    onLine!(
      JSON.stringify({
        id: 91,
        method: "mcpServer/elicitation/request",
        params: {
          mode: "form",
          serverName: "docs",
          requestedSchema: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"],
          },
        },
      }),
    );
    await waitFor(() => events.some((event) => event.type === "form.requested"), "form UI");
    const form = events.find((event) => event.type === "form.requested");
    if (form?.type !== "form.requested") throw new Error("missing form");
    respondCodexForm("codex-live", form.requestId, {
      kind: "submit",
      content: {},
    });

    expect(debug).toHaveBeenCalledWith(
      "[monocode] codex form rejected invalid reply",
      { requestId: form.requestId },
    );
    expect(parse().some((message) => message.id === 91)).toBe(false);
    expect(events.some((event) => event.type === "form.resolved")).toBe(false);
    respondCodexForm("codex-live", form.requestId, {
      kind: "submit",
      content: { name: "Al" },
    });
    await waitFor(() => parse().some((message) => message.id === 91), "valid retry");
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
  });

  it("cancels a form when the server resolves its request and ignores late replies", async () => {
    const { events, turn } = await startTurn("codex-live");
    onLine!(
      JSON.stringify({
        id: 91,
        method: "mcpServer/elicitation/request",
        params: {
          mode: "form",
          serverName: "docs",
          requestedSchema: {
            type: "object",
            properties: { name: { type: "string" } },
          },
        },
      }),
    );
    await waitFor(() => events.some((event) => event.type === "form.requested"), "form UI");
    const form = events.find((event) => event.type === "form.requested");
    if (form?.type !== "form.requested") throw new Error("missing form");
    notify("serverRequest/resolved", { threadId: "thr_1", requestId: 91 });
    await waitFor(() => events.some((event) => event.type === "form.resolved"), "cancel event");
    expect(events).toContainEqual({
      type: "form.resolved",
      requestId: form.requestId,
      decision: "cancelled",
    });
    respondCodexForm("codex-live", form.requestId, {
      kind: "submit",
      content: { name: "late" },
    });
    expect(parse().some((message) => message.id === 91)).toBe(false);
    expect(events.some((event) => event.type === "status")).toBe(false);
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
  });

  it("cancels a visible form when the turn stops", async () => {
    const { events, turn } = await startTurn("codex-live");
    onLine!(
      JSON.stringify({
        id: 91,
        method: "mcpServer/elicitation/request",
        params: {
          mode: "form",
          serverName: "docs",
          requestedSchema: {
            type: "object",
            properties: { name: { type: "string" } },
          },
        },
      }),
    );
    await waitFor(() => events.some((event) => event.type === "form.requested"), "form UI");
    const form = events.find((event) => event.type === "form.requested");
    if (form?.type !== "form.requested") throw new Error("missing form");

    const cancelling = cancelCodexTurn("codex-live");
    await waitFor(
      () => parse().some((message) => message.method === "turn/interrupt"),
      "turn interrupt",
    );
    const interrupt = parse().find((message) => message.method === "turn/interrupt");
    reply(interrupt!.id as number, {});
    await cancelling;
    await turn;

    expect(events).toContainEqual({
      type: "form.resolved",
      requestId: form.requestId,
      decision: "cancelled",
    });
    expect(parse().some((message) => message.id === 91)).toBe(false);
    expect(events.some((event) => event.type === "status")).toBe(false);
  });

  it("reports unsupported MCP forms instead of returning an empty success", async () => {
    const { events, turn } = await startTurn("codex-live");
    onLine!(
      JSON.stringify({
        id: 90,
        method: "item/tool/requestUserInput",
        params: {
          questions: [{ id: "q", question: "Choose a name", options: null }],
        },
      }),
    );
    onLine!(
      JSON.stringify({
        id: 91,
        method: "mcpServer/elicitation/request",
        params: {
          mode: "url",
          serverName: "github",
          elicitationId: "e1",
          message: "Sign in",
          url: "https://example.com",
        },
      }),
    );
    await waitFor(() => parse().some((m) => m.id === 91), "MCP cancel");
    expect(parse().find((m) => m.id === 91)?.result).toEqual({
      action: "cancel",
      content: null,
      _meta: null,
    });
    expect(events).toContainEqual({
      type: "status",
      text: expect.stringContaining("browser sign-in"),
    });
    onLine!(
      JSON.stringify({ id: 92, method: "future/requestApproval", params: {} }),
    );
    await waitFor(() => parse().some((m) => m.id === 92), "protocol error");
    expect(parse().find((m) => m.id === 92)?.error).toMatchObject({
      code: -32601,
    });
    const session = events.reduce(applyHarnessEvent, {
      ...newSession("codex", "/repo", "codex:gpt-5.4", "supervised"),
      busy: true,
    });
    expect(session.busy).toBe(true);
    expect(session.pendingQuestion?.questions[0].id).toBe("q");
    respondCodexQuestion("codex-live", session.pendingQuestion!.requestId, {
      kind: "answered",
      answers: {},
      custom: { q: "chosen name" },
    });
    await waitFor(() => parse().some((m) => m.id === 90), "remaining answer");
    expect(parse().find((m) => m.id === 90)?.result).toEqual({
      answers: { q: { answers: ["chosen name"] } },
    });
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
  });

  it("clears server-resolved approvals without replying twice", async () => {
    const { events, turn } = await startTurn("codex-live");
    onLine!(
      JSON.stringify({
        id: 91,
        method: "item/commandExecution/requestApproval",
        params: { itemId: "cmd", command: "git status" },
      }),
    );
    const request = events.find((e) => e.type === "approval.requested")!;
    notify("serverRequest/resolved", { threadId: "unrelated", requestId: 91 });
    await Promise.resolve();
    expect(events.some((e) => e.type === "approval.resolved")).toBe(false);
    notify("serverRequest/resolved", { threadId: "thr_1", requestId: 91 });
    await waitFor(
      () => events.some((e) => e.type === "approval.resolved"),
      "approval cleanup",
    );
    expect(events).toContainEqual({
      type: "approval.resolved",
      requestId: request.requestId,
      decision: "cancelled",
    });
    respondCodexApproval("codex-live", request.requestId, "allow");
    expect(parse().some((m) => m.id === 91)).toBe(false);
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
  });

  it("applies a queued access change only when that turn starts", async () => {
    const { events, turn } = await startTurn("codex-live");
    const queued = sendCodexTurn({
      sessionId: "codex-live",
      cwd: "/repo",
      model: "codex:gpt-5.4",
      runtimeMode: "full-access",
      text: "Continue",
      onEvent: (event) => events.push(event),
    });
    await Promise.resolve();
    onLine!(
      JSON.stringify({
        id: 91,
        method: "item/commandExecution/requestApproval",
        params: { itemId: "cmd", command: "git status" },
      }),
    );
    await waitFor(
      () => events.some((event) => event.type === "approval.requested"),
      "current turn approval",
    );
    expect(parse().some((m) => m.id === 91)).toBe(false);
    const request = events.find(
      (event) => event.type === "approval.requested",
    )!;
    respondCodexApproval("codex-live", request.requestId, "deny");
    await waitFor(
      () => parse().some((m) => m.id === 91),
      "current turn decision",
    );
    expect(parse().find((m) => m.id === 91)?.result).toEqual({
      decision: "decline",
    });
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;
    await waitFor(
      () => parse().filter((m) => m.method === "turn/start").length === 2,
      "queued turn",
    );
    const next = parse().filter((m) => m.method === "turn/start")[1];
    expect(next.params).toMatchObject({
      approvalPolicy: "on-request",
      approvalsReviewer: "user",
      sandboxPolicy: { type: "dangerFullAccess" },
    });
    reply(next.id as number, { turn: { id: "turn_2" } });
    notify("turn/started", { turn: { id: "turn_2" } });
    onLine!(
      JSON.stringify({
        id: 92,
        method: "item/commandExecution/requestApproval",
        params: { itemId: "cmd2", command: "git status" },
      }),
    );
    await waitFor(
      () => parse().some((m) => m.id === 92),
      "queued turn approval",
    );
    expect(parse().find((m) => m.id === 92)?.result).toEqual({
      decision: "accept",
    });
    notify("turn/completed", { turn: { id: "turn_2", status: "completed" } });
    await queued;
  });

  it("stays busy after an agent message until turn/completed", async () => {
    const { events, turn } = await startTurn("codex-live");
    let settled = false;
    void turn.then(() => {
      settled = true;
    });

    notify("item/completed", {
      item: {
        id: "msg_1",
        type: "agentMessage",
        text: "I'll inspect the changelog first.",
      },
    });

    vi.useFakeTimers();
    await vi.advanceTimersByTimeAsync(3_000);
    expect(settled).toBe(false);
    vi.useRealTimers();

    notify("item/started", {
      item: {
        id: "cmd_1",
        type: "commandExecution",
        command: "git log -1",
        status: "inProgress",
      },
    });
    expect(settled).toBe(false);
    expect(events.some((event) => event.type === "tool.started")).toBe(true);

    notify("turn/completed", {
      turn: { id: "turn_1", status: "completed" },
    });
    await turn;
    expect(settled).toBe(true);
  });

  it("keeps plan turns read-only without surfacing approval prompts", async () => {
    const { events, turn } = await startTurn("codex-live", {
      runtimeMode: "auto",
      intent: "plan",
    });
    const turnStart = parse().find(
      (message) => message.method === "turn/start",
    );
    expect(turnStart?.params).toMatchObject({
      approvalPolicy: "never",
      sandboxPolicy: { type: "readOnly" },
      collaborationMode: { mode: "plan" },
    });

    onLine!(
      JSON.stringify({
        id: 91,
        method: "item/commandExecution/requestApproval",
        params: { itemId: "cmd_1", command: "git status --short" },
      }),
    );
    await waitFor(
      () => parse().some((message) => message.id === 91),
      "silent plan denial",
    );

    expect(events.some((event) => event.type === "approval.requested")).toBe(
      false,
    );
    expect(parse().find((message) => message.id === 91)?.result).toEqual({
      decision: "decline",
    });

    notify("turn/completed", {
      turn: { id: "turn_1", status: "completed" },
    });
    await turn;
  });

  it("uses thread/compact/start and waits for its turn to complete", async () => {
    const { turn } = await startTurn("codex-live");
    notify("turn/completed", {
      turn: { id: "turn_1", status: "completed" },
    });
    await turn;
    sent.length = 0;

    const compact = compactCodexContext({
      sessionId: "codex-live",
      cwd: "/repo",
      model: "codex:gpt-5.4",
      runtimeMode: "supervised",
      onEvent: () => undefined,
    });
    await waitFor(
      () =>
        parse().some((message) => message.method === "thread/compact/start"),
      "thread/compact/start",
    );
    const request = parse().find(
      (message) => message.method === "thread/compact/start",
    )!;
    expect(request.params).toEqual({ threadId: "thr_1" });
    reply(request.id as number, {});

    let settled = false;
    void compact.then(() => {
      settled = true;
    });
    notify("turn/started", {
      turn: { id: "compact_1", status: "inProgress" },
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(settled).toBe(false);

    notify("turn/completed", {
      turn: { id: "compact_1", status: "completed" },
    });
    await compact;
    expect(settled).toBe(true);
  });

  it("reverts before the latest user turn after compaction", async () => {
    const { turn } = await startTurn("codex-live");
    notify("turn/completed", {
      turn: { id: "turn_1", status: "completed" },
    });
    await turn;
    sent.length = 0;

    const rollback = rewindCodexLastTurn({
      sessionId: "codex-live",
      cwd: "/repo",
      model: "codex:gpt-5.4",
      runtimeMode: "supervised",
      onEvent: () => undefined,
    });
    await waitFor(
      () => parse().some((message) => message.method === "thread/turns/list"),
      "thread/turns/list",
    );
    const list = parse().find(
      (message) => message.method === "thread/turns/list",
    )!;
    expect(list.params).toEqual({
      threadId: "thr_1",
      limit: 100,
      sortDirection: "desc",
      itemsView: "summary",
    });
    reply(list.id as number, {
      data: [
        {
          id: "compact_1",
          items: [{ type: "contextCompaction", id: "compact_item" }],
        },
        {
          id: "turn_1",
          items: [{ type: "userMessage", id: "user_item" }],
        },
      ],
    });
    await waitFor(
      () => parse().some((message) => message.method === "thread/revert"),
      "thread/revert",
    );
    const request = parse().find(
      (message) => message.method === "thread/revert",
    )!;
    expect(request.params).toEqual({
      threadId: "thr_1",
      beforeTurnId: "turn_1",
    });
    reply(request.id as number, {});
    expect(await rollback).toEqual({ submitted: false });
  });
  it("uses the persisted provider turn boundary without listing turns", async () => {
    const { turn } = await startTurn("codex-live");
    notify("turn/completed", {
      turn: { id: "turn_1", status: "completed" },
    });
    await turn;
    sent.length = 0;

    const rollback = rewindCodexLastTurn({
      sessionId: "codex-live",
      cwd: "/repo",
      model: "codex:gpt-5.4",
      runtimeMode: "supervised",
      providerTurnId: "turn_exact",
      onEvent: () => undefined,
    });
    await waitFor(
      () => parse().some((message) => message.method === "thread/revert"),
      "thread/revert",
    );
    expect(
      parse().some((message) => message.method === "thread/turns/list"),
    ).toBe(false);
    const request = parse().find(
      (message) => message.method === "thread/revert",
    )!;
    expect(request.params).toEqual({
      threadId: "thr_1",
      beforeTurnId: "turn_exact",
    });
    reply(request.id as number, {});
    await expect(rollback).resolves.toEqual({ submitted: false });
  });

  it("rejects editing when the provider exposes no user turn", async () => {
    const { turn } = await startTurn("codex-live");
    notify("turn/completed", {
      turn: { id: "turn_1", status: "completed" },
    });
    await turn;
    sent.length = 0;

    const rollback = rewindCodexLastTurn({
      sessionId: "codex-live",
      cwd: "/repo",
      model: "codex:gpt-5.4",
      runtimeMode: "supervised",
      onEvent: () => undefined,
    });
    await waitFor(
      () => parse().some((message) => message.method === "thread/turns/list"),
      "thread/turns/list",
    );
    const list = parse().find(
      (message) => message.method === "thread/turns/list",
    )!;
    reply(list.id as number, {
      data: [
        {
          id: "compact_1",
          items: [{ type: "contextCompaction", id: "compact_item" }],
        },
      ],
    });
    await expect(rollback).rejects.toThrow(
      "Codex did not expose a user turn id to edit",
    );
    expect(parse().some((message) => message.method === "thread/revert")).toBe(
      false,
    );
  });
});

describe("codex subagents", () => {
  beforeEach(() => {
    sent.length = 0;
    onLine = undefined;
    writeChild.mockClear();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await stopCodexSession("s1");
    __codexTestReset();
  });

  it("mirrors a child thread's work onto the row that spawned it", async () => {
    const { events, turn } = await startTurn("s1");
    notify("item/started", {
      threadId: "thr_1",
      item: {
        id: "collab_1",
        type: "collabAgentToolCall",
        tool: "spawnAgent",
        status: "inProgress",
        prompt: "Correctness review\n\nLook for regressions in the diff.",
        agentsStates: { thr_child: { status: "running" } },
      },
    });
    notify("item/started", {
      threadId: "thr_child",
      item: {
        id: "child_cmd",
        type: "commandExecution",
        command: "npm test",
        status: "inProgress",
      },
    });
    notify("item/completed", {
      threadId: "thr_child",
      item: {
        id: "child_msg",
        type: "agentMessage",
        text: "No regressions found.",
      },
    });
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;

    // The spawn is named from its brief, not from the tool that made it.
    expect(
      events.some(
        (event) =>
          event.type === "tool.started" &&
          event.kind === "agent" &&
          event.title === "Correctness review",
      ),
    ).toBe(true);

    const steps = events.filter((event) => event.type === "agent.step");
    expect(steps.every((step) => step.callId === "collab_1")).toBe(true);
    expect(steps.map((step) => [step.kind, step.text])).toEqual([
      ["tool", "npm test"],
      ["message", "No regressions found."],
    ]);
  });

  it("banks a child's opening moves until its row is known", async () => {
    const { events, turn } = await startTurn("s1");
    notify("thread/started", {
      thread: { id: "thr_child", model: "gpt-5.6-sol" },
    });
    // Codex streams the child's first calls before the spawn item reports
    // which thread it created.
    notify("item/started", {
      threadId: "thr_child",
      item: {
        id: "child_cmd",
        type: "commandExecution",
        command: "git diff",
        status: "inProgress",
      },
    });
    expect(events.some((event) => event.type === "agent.step")).toBe(false);

    notify("item/completed", {
      threadId: "thr_1",
      item: {
        id: "sa_1",
        type: "subAgentActivity",
        kind: "started",
        agentPath: "/root/explore-auth",
        agentThreadId: "thr_child",
      },
    });
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;

    const run = events
      .reduce(applyHarnessEvent, newSession("codex", "/repo"))
      .blocks.find((block) => block.tool?.callId === "sa_1")?.agentRun;
    expect(run).toMatchObject({
      name: "Explore Auth subagent",
      model: "gpt-5.6-sol",
    });
    expect(run?.steps).toHaveLength(1);
    const steps = events.filter((event) => event.type === "agent.step");
    expect(steps.map((step) => [step.callId, step.kind, step.text])).toEqual([
      ["sa_1", "tool", "git diff"],
    ]);
  });

  it("shows one row per spawned agent, however Codex describes it", async () => {
    const { events, turn } = await startTurn("s1");
    notify("item/started", {
      threadId: "thr_1",
      item: {
        id: "collab_1",
        type: "collabAgentToolCall",
        tool: "spawnAgent",
        status: "inProgress",
        prompt: "Correctness review",
        agentsStates: { thr_child: { status: "running" } },
      },
    });
    // The same agent, described again by the older item type.
    notify("item/completed", {
      threadId: "thr_1",
      item: {
        id: "sa_1",
        type: "subAgentActivity",
        kind: "started",
        agentPath: "/root/explore-auth",
        agentThreadId: "thr_child",
      },
    });
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;

    const rows = events.filter(
      (event) =>
        (event.type === "tool.started" || event.type === "tool.updated") &&
        event.kind === "agent",
    );
    // One row, however many times its state is reported.
    expect([...new Set(rows.map((row) => row.callId))]).toEqual(["collab_1"]);
  });

  it("still gives a failed duplicate its own row", async () => {
    const { events, turn } = await startTurn("s1");
    notify("item/started", {
      threadId: "thr_1",
      item: {
        id: "collab_1",
        type: "collabAgentToolCall",
        tool: "spawnAgent",
        status: "inProgress",
        prompt: "Correctness review",
        agentsStates: { thr_child: { status: "running" } },
      },
    });
    notify("item/completed", {
      threadId: "thr_1",
      item: {
        id: "sa_1",
        type: "subAgentActivity",
        kind: "interrupted",
        agentThreadId: "thr_child",
      },
    });
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;

    expect(
      events.some(
        (event) =>
          event.type === "tool.updated" &&
          event.callId === "sa_1" &&
          event.status === "failed",
      ),
    ).toBe(true);
  });

  it("keeps a spawned agent running until its own state says otherwise", async () => {
    const { events, turn } = await startTurn("s1");
    const spawn = {
      id: "collab_1",
      type: "collabAgentToolCall",
      tool: "spawnAgent",
      prompt: "Correctness review",
      agentsStates: { thr_child: { status: "running" } },
    };
    notify("item/started", { threadId: "thr_1", item: spawn });
    // The spawn call itself returns almost immediately. The agent it started
    // has not finished, so the row must not settle here.
    notify("item/completed", {
      threadId: "thr_1",
      item: { ...spawn, status: "completed" },
    });
    const beforeWait = events.filter(
      (event) => event.type === "tool.updated" && event.callId === "collab_1",
    );
    expect(beforeWait.every((event) => event.status === "in_progress")).toBe(
      true,
    );

    // Waiting on the agent is where Codex reports what became of it.
    notify("item/completed", {
      threadId: "thr_1",
      item: {
        id: "collab_2",
        type: "collabAgentToolCall",
        tool: "wait",
        status: "completed",
        receiverThreadIds: ["thr_child"],
        agentsStates: { thr_child: { status: "completed", message: "ok" } },
      },
    });
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;

    const last = events
      .filter(
        (event) =>
          (event.type === "tool.started" || event.type === "tool.updated") &&
          event.callId === "collab_1",
      )
      .at(-1);
    expect(last).toMatchObject({ kind: "agent", status: "completed" });
  });

  it("never leaves an agent row running once the turn is over", async () => {
    const { events, turn } = await startTurn("s1");
    notify("item/started", {
      threadId: "thr_1",
      item: {
        id: "collab_1",
        type: "collabAgentToolCall",
        tool: "spawnAgent",
        prompt: "Correctness review",
        agentsStates: { thr_child: { status: "running" } },
      },
    });
    // Codex never reports a closing state for this child.
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;

    const last = events
      .filter(
        (event) =>
          (event.type === "tool.started" || event.type === "tool.updated") &&
          event.callId === "collab_1",
      )
      .at(-1);
    expect(last).toMatchObject({
      kind: "agent",
      title: "Correctness review",
      status: "completed",
    });
  });

  it("keeps a child thread out of the parent's own transcript", async () => {
    const { events, turn } = await startTurn("s1");
    notify("item/completed", {
      threadId: "thr_1",
      item: {
        id: "sa_1",
        type: "subAgentActivity",
        kind: "started",
        agentPath: "/root/explore-auth",
        agentThreadId: "thr_child",
      },
    });
    notify("item/completed", {
      threadId: "thr_child",
      item: { id: "child_msg", type: "agentMessage", text: "Child talking." },
    });
    notify("turn/completed", { turn: { id: "turn_1", status: "completed" } });
    await turn;

    expect(
      events.some(
        (event) =>
          event.type === "message.delta" &&
          event.text.includes("Child talking."),
      ),
    ).toBe(false);
  });
});
