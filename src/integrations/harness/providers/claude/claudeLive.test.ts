import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyHarnessEvent } from "../../core/apply";
import { newSession } from "../../../../features/sessions/model/session";

const sent: string[] = [];
const spawned: string[][] = [];
let onLine: ((line: string) => void) | undefined;
let onExit: ((code?: number | null) => void) | undefined;
const writeChild = vi.fn(async (_id: string, line: string) => {
  sent.push(line);
});

vi.mock("../../core/child", () => ({
  resolveClaudeBinary: async () => ({ path: "/fake/claude" }),
  spawnChild: async (_id: string, _path: string, args: string[]) => {
    spawned.push(args);
  },
  killChild: async () => undefined,
  unwatchChild: () => undefined,
  watchChild: (
    _id: string,
    line: (l: string) => void,
    exit: (code?: number | null) => void,
  ) => {
    onLine = line;
    onExit = exit;
  },
  writeChild,
}));

const {
  bindClaudeSession,
  inspectClaudeContext,
  compactClaudeContext,
  respondClaudeApproval,
  respondClaudeQuestion,
  sendClaudeTurn,
  stopClaudeSession,
  __claudeTestReset,
} = await import("./claude");
import type { HarnessEvent } from "../../core/types";
import { NativeForkError, type NativeForkRequest } from "../../core/types";
import type { RuntimeMode, TurnIntent } from "../../../../features/sessions/model/session";

function parse() {
  return sent.map((line) => JSON.parse(line) as Record<string, unknown>);
}

function outgoingControlRequest(subtype: string) {
  return parse().find((message) => {
    const request = message.request as Record<string, unknown> | undefined;
    return message.type === "control_request" && request?.subtype === subtype;
  });
}

function respondToControl(
  requestId: unknown,
  response: Record<string, unknown> = {},
): void {
  emit({
    type: "control_response",
    response: { subtype: "success", request_id: requestId, response },
  });
}

async function flushMicrotasksUntil(
  predicate: () => boolean,
  label: string,
): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    await Promise.resolve();
    if (predicate()) return;
  }
  throw new Error(`timed out waiting for ${label}; sent=${JSON.stringify(parse())}`);
}

function emit(rec: Record<string, unknown>) {
  onLine!(JSON.stringify(rec));
}

const waitFor = async (pred: () => boolean, label: string) => {
  for (let i = 0; i < 200; i++) {
    if (pred()) return;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error(
    `timed out waiting for ${label}; sent=${JSON.stringify(parse())}`,
  );
};

async function startTurn(
  sessionId: string,
  options: {
    runtimeMode?: RuntimeMode;
    intent?: TurnIntent;
    providerAccountId?: string;
    cwd?: string;
    model?: string;
    modelSettings?: Record<string, string>;
    text?: string;
    fork?: NativeForkRequest;
  } = {},
) {
  const events: HarnessEvent[] = [];
  const userCount = parse().filter((message) => message.type === "user").length;
  const turn = sendClaudeTurn({
    sessionId,
    fork: options.fork,
    cwd: options.cwd ?? "/repo",
    model: options.model ?? "claude:claude-sonnet-5",
    modelSettings: options.modelSettings ?? {},
    runtimeMode: options.runtimeMode ?? "supervised",
    intent: options.intent,
    providerAccountId: options.providerAccountId,
    text: options.text ?? "explore the codebase",
    attachments: [],
    onEvent: (event) => events.push(event),
  });

  await waitFor(
    () =>
      parse().some((m) => {
        const request = m.request as Record<string, unknown> | undefined;
        return request?.subtype === "initialize";
      }),
    "initialize",
  );
  const initialize = outgoingControlRequest("initialize");
  emit({ type: "system", subtype: "init", session_id: "sess_1" });
  respondToControl(initialize?.request_id);
  await waitFor(
    () => parse().filter((message) => message.type === "user").length > userCount,
    "user prompt",
  );
  return { events, turn };
}

describe("Claude native fork", () => {
  it("delays binding until result and records the last top-level assistant uuid", async () => {
    const { events, turn } = await startTurn("claude-live", { text: "hello", fork: { sourceProviderSessionId: "source", forkPoint: "at-uuid" } });
    const args = spawned[0];
    expect(args[args.indexOf("--resume") + 1]).toBe("source");
    expect(args).toContain("--fork-session");
    expect(args[args.indexOf("--resume-session-at") + 1]).toBe("at-uuid");
    const newId = args[args.indexOf("--session-id") + 1];
    expect(newId).not.toBe("source");
    expect(events.some(event => event.type === "session.providerBound")).toBe(false);
    emit({ type: "assistant", uuid: "first", message: { content: [] } });
    emit({ type: "assistant", uuid: "last", message: { content: [] } });
    emit({ type: "assistant", uuid: "child", parent_tool_use_id: "tool", message: { content: [] } });
    emit({ type: "result", subtype: "success" }); await turn;
    expect(events).toContainEqual({ type: "turn.forkPoint", providerForkPoint: "last" });
    expect(events).toContainEqual({ type: "session.providerBound", providerSessionId: newId });
  });
  it("rejects exit before initialization without binding or writing a user message and re-forks", async () => {
    const events: HarnessEvent[] = [];
    const pending = sendClaudeTurn({ sessionId: "claude-live", cwd: "/repo", model: "claude:claude-sonnet-5", runtimeMode: "supervised", text: "hello", fork: { sourceProviderSessionId: "source" }, onEvent: event => events.push(event) });
    const rejected = expect(pending).rejects.toBeInstanceOf(NativeForkError);
    await waitFor(() => !!outgoingControlRequest("initialize"), "init request"); onExit?.(1); await rejected;
    expect(events.some(event => event.type === "session.providerBound")).toBe(false);
    expect(parse().some(message => message.type === "user")).toBe(false);
    const firstId = spawned[0][spawned[0].indexOf("--session-id") + 1]; sent.length = 0;
    const next = await startTurn("claude-live", { fork: { sourceProviderSessionId: "source" } });
    expect(spawned[1]).toContain("--fork-session");
    expect(spawned[1][spawned[1].indexOf("--session-id") + 1]).not.toBe(firstId);
    emit({ type: "result", subtype: "success" }); await next.turn;
  });
  it("exit after the user write is a generic failure, and the next user send re-forks", async () => {
    const first = await startTurn("claude-live", { fork: { sourceProviderSessionId: "source" } });
    const rejected = expect(first.turn).rejects.toThrow("Claude Code exited"); onExit?.(1); await rejected;
    expect(spawned).toHaveLength(1); expect(first.events.some(event => event.type === "session.providerBound")).toBe(false);
    const firstId = spawned[0][spawned[0].indexOf("--session-id") + 1]; sent.length = 0;
    const next = await startTurn("claude-live", { fork: { sourceProviderSessionId: "source" } });
    expect(spawned).toHaveLength(2); expect(spawned[1]).toContain("--fork-session");
    expect(spawned[1][spawned[1].indexOf("--session-id") + 1]).not.toBe(firstId);
    emit({ type: "result", subtype: "success" }); await next.turn;
  });
});

function sendFollowup(
  sessionId: string,
  options: {
    runtimeMode?: RuntimeMode;
    intent?: TurnIntent;
    providerAccountId?: string;
    cwd?: string;
    model?: string;
    modelSettings?: Record<string, string>;
    text?: string;
  } = {},
) {
  const events: HarnessEvent[] = [];
  const turn = sendClaudeTurn({
    sessionId,
    cwd: options.cwd ?? "/repo",
    model: options.model ?? "claude:claude-sonnet-5",
    modelSettings: options.modelSettings ?? {},
    runtimeMode: options.runtimeMode ?? "supervised",
    intent: options.intent,
    providerAccountId: options.providerAccountId,
    text: options.text ?? "continue the conversation",
    attachments: [],
    onEvent: (event) => events.push(event),
  });
  return { events, turn };
}

beforeEach(() => {
  sent.length = 0;
  spawned.length = 0;
  onLine = undefined;
  onExit = undefined;
  writeChild.mockClear();
  __claudeTestReset();
});

afterEach(async () => {
  vi.useRealTimers();
  await stopClaudeSession("s1");
  __claudeTestReset();
});

describe("claude model switching", () => {
  it("restarts for a non-live setting while resuming the provider conversation", async () => {
    const first = await startTurn("s1", {
      providerAccountId: "account-work",
      modelSettings: { thinking: "true" },
    });
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await first.turn;

    const userCount = parse().filter(
      (message) => message.type === "user",
    ).length;
    const second = sendClaudeTurn({
      sessionId: "s1",
      cwd: "/repo",
      model: "claude:opus-5",
      modelSettings: {},
      runtimeMode: "supervised",
      providerAccountId: "account-work",
      text: "what did I ask before?",
      attachments: [],
      onEvent: () => undefined,
    });

    await waitFor(() => spawned.length === 2, "replacement Claude process");
    expect(spawned[1]).toEqual(
      expect.arrayContaining([
        "--model",
        "claude-opus-5",
        "--resume",
        "sess_1",
      ]),
    );
    expect(spawned[1]).not.toContain("--session-id");

    emit({ type: "system", subtype: "init", session_id: "sess_1" });
    await waitFor(
      () =>
        parse().filter((message) => message.type === "user").length > userCount,
      "follow-up prompt",
    );
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await second;
  });

  it("waits for the matching model response before sending the next user message", async () => {
    const first = await startTurn("s1");
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await first.turn;
    const userCount = parse().filter((message) => message.type === "user").length;

    const second = sendFollowup("s1", { model: "claude:claude-opus-5" });
    const requestMessage = outgoingControlRequest("set_model");
    const request = requestMessage?.request as Record<string, unknown> | undefined;
    expect(request).toEqual({ subtype: "set_model", model: "claude-opus-5" });
    expect(requestMessage?.request_id).toMatch(/^monocode_\d+$/);
    expect(spawned).toHaveLength(1);
    expect(parse().filter((message) => message.type === "user")).toHaveLength(
      userCount,
    );

    respondToControl("foreign_request", { ignored: true });
    await Promise.resolve();
    expect(parse().filter((message) => message.type === "user")).toHaveLength(
      userCount,
    );
    respondToControl(requestMessage?.request_id, { model: "claude-opus-5" });
    await waitFor(
      () => parse().filter((message) => message.type === "user").length > userCount,
      "user message after matching model response",
    );
    expect(spawned).toHaveLength(1);

    emit({
      type: "assistant",
      session_id: "sess_1",
      message: { model: "claude-opus-5", content: [{ type: "text", text: "ready" }] },
    });
    expect(second.events.some((event) => event.type === "status")).toBe(false);
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await second.turn;
  });

  it("applies runtime permission and plan-mode changes live", async () => {
    const first = await startTurn("s1");
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await first.turn;

    const autoEdits = sendFollowup("s1", { runtimeMode: "auto-accept-edits" });
    const autoEditsRequest = outgoingControlRequest("set_permission_mode");
    expect(autoEditsRequest?.request).toEqual({
      subtype: "set_permission_mode",
      mode: "acceptEdits",
    });
    respondToControl(autoEditsRequest?.request_id);
    await waitFor(() => parse().filter((message) => message.type === "user").length === 2, "auto-edits message");
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await autoEdits.turn;

    const plan = sendFollowup("s1", {
      runtimeMode: "auto-accept-edits",
      intent: "plan",
    });
    const planRequest = parse().filter((message) => {
      const request = message.request as Record<string, unknown> | undefined;
      return request?.subtype === "set_permission_mode";
    }).at(-1);
    expect(planRequest?.request).toEqual({
      subtype: "set_permission_mode",
      mode: "plan",
    });
    respondToControl(planRequest?.request_id);
    await waitFor(() => parse().filter((message) => message.type === "user").length === 3, "plan-mode message");
    expect(spawned).toHaveLength(1);
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await plan.turn;
  });

  it("reuses the child for ultrathink and keeps its prompt prefix", async () => {
    const first = await startTurn("s1");
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await first.turn;

    const second = sendFollowup("s1", { modelSettings: { effort: "ultrathink" } });
    await waitFor(() => parse().filter((message) => message.type === "user").length === 2, "ultrathink message");
    const userMessage = parse().filter((message) => message.type === "user").at(-1);
    expect(JSON.stringify(userMessage)).toContain("Ultrathink:\\ncontinue the conversation");
    expect(outgoingControlRequest("set_model")).toBeUndefined();
    expect(outgoingControlRequest("set_permission_mode")).toBeUndefined();
    expect(spawned).toHaveLength(1);
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await second.turn;
  });

  it("restarts when full access changes the required spawn flags", async () => {
    const first = await startTurn("s1");
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await first.turn;

    const second = sendFollowup("s1", { runtimeMode: "full-access" });
    await waitFor(() => spawned.length === 2, "full-access replacement process");
    expect(outgoingControlRequest("set_permission_mode")).toBeUndefined();
    expect(spawned[1]).toContain("--allow-dangerously-skip-permissions");
    const initialize = parse().filter((message) => {
      const request = message.request as Record<string, unknown> | undefined;
      return request?.subtype === "initialize";
    }).at(-1);
    emit({ type: "system", subtype: "init", session_id: "sess_1" });
    respondToControl(initialize?.request_id);
    await waitFor(() => parse().filter((message) => message.type === "user").length === 2, "full-access message");
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await second.turn;
  });

  it("restarts once when a live model control request returns an error", async () => {
    const first = await startTurn("s1");
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await first.turn;
    const userCount = parse().filter((message) => message.type === "user").length;
    const second = sendFollowup("s1", { model: "claude:claude-opus-5" });
    const request = outgoingControlRequest("set_model");
    emit({
      type: "control_response",
      response: {
        subtype: "error",
        request_id: request?.request_id,
        error: "unsupported model",
      },
    });
    await waitFor(() => spawned.length === 2, "fallback Claude process");
    const initialize = parse().filter((message) => {
      const control = message.request as Record<string, unknown> | undefined;
      return control?.subtype === "initialize";
    }).at(-1);
    emit({ type: "system", subtype: "init", session_id: "sess_1" });
    respondToControl(initialize?.request_id);
    await waitFor(
      () => parse().filter((message) => message.type === "user").length === userCount + 1,
      "single message after fallback",
    );
    expect(spawned).toHaveLength(2);
    expect(second.events.filter((event) => event.type === "status")).toEqual([
      {
        type: "status",
        text: "Claude couldn't switch live, so it restarted with the new settings.",
      },
    ]);
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await second.turn;
  });

  it("times out a live model switch and sends the user message once after restart", async () => {
    const first = await startTurn("s1");
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await first.turn;
    const userCount = parse().filter((message) => message.type === "user").length;
    vi.useFakeTimers();
    const second = sendFollowup("s1", { model: "claude:claude-opus-5" });
    expect(outgoingControlRequest("set_model")).toBeDefined();
    await vi.advanceTimersByTimeAsync(5_000);
    await flushMicrotasksUntil(() => spawned.length === 2, "fallback spawn after timeout");
    const initialize = parse().filter((message) => {
      const control = message.request as Record<string, unknown> | undefined;
      return control?.subtype === "initialize";
    }).at(-1);
    emit({ type: "system", subtype: "init", session_id: "sess_1" });
    respondToControl(initialize?.request_id);
    await flushMicrotasksUntil(
      () => parse().filter((message) => message.type === "user").length === userCount + 1,
      "single user message after timeout fallback",
    );
    expect(second.events.filter((event) => event.type === "status")).toEqual([
      {
        type: "status",
        text: "Claude couldn't switch live, so it restarted with the new settings.",
      },
    ]);
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await second.turn;
  });

  it("restarts on a model mismatch and ignores the requested 1m suffix", async () => {
    const first = await startTurn("s1", {
      modelSettings: { context: "1m" },
    });
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await first.turn;
    const second = sendFollowup("s1", {
      model: "claude:claude-opus-5",
      modelSettings: { context: "1m" },
    });
    const request = outgoingControlRequest("set_model");
    expect(request?.request).toEqual({
      subtype: "set_model",
      model: "claude-opus-5[1m]",
    });
    respondToControl(request?.request_id);
    await waitFor(() => parse().filter((message) => message.type === "user").length === 2, "first live model message");
    emit({
      type: "assistant",
      session_id: "sess_1",
      message: { model: "claude-opus-5", content: [{ type: "text", text: "ok" }] },
    });
    expect(second.events.some((event) => event.type === "status")).toBe(false);
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await second.turn;

    const mismatch = sendFollowup("s1", {
      model: "claude:claude-opus-4-7",
      modelSettings: { context: "1m" },
    });
    const mismatchRequest = parse().filter((message) => {
      const control = message.request as Record<string, unknown> | undefined;
      return control?.subtype === "set_model";
    }).at(-1);
    expect(mismatchRequest?.request).toEqual({
      subtype: "set_model",
      model: "claude-opus-4-7[1m]",
    });
    respondToControl(mismatchRequest?.request_id);
    await waitFor(() => parse().filter((message) => message.type === "user").length === 3, "mismatch model message");
    emit({
      type: "assistant",
      session_id: "sess_1",
      message: { model: "claude-sonnet-5", content: [{ type: "text", text: "wrong" }] },
    });
    expect(mismatch.events).toContainEqual({
      type: "status",
      text: "Claude answered with claude-sonnet-5 instead of claude-opus-4-7[1m]. The next message restarts Claude with the selected model.",
    });
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await mismatch.turn;

    const setModelCount = parse().filter((message) => {
      const control = message.request as Record<string, unknown> | undefined;
      return control?.subtype === "set_model";
    }).length;
    const final = sendFollowup("s1", {
      model: "claude:claude-opus-4-7",
      modelSettings: { context: "1m" },
    });
    await waitFor(() => spawned.length === 2, "restart after model mismatch");
    const initialize = parse().filter((message) => {
      const control = message.request as Record<string, unknown> | undefined;
      return control?.subtype === "initialize";
    }).at(-1);
    emit({ type: "system", subtype: "init", session_id: "sess_1" });
    respondToControl(initialize?.request_id);
    await waitFor(() => parse().filter((message) => message.type === "user").length === 4, "selected model after mismatch");
    expect(parse().filter((message) => {
      const control = message.request as Record<string, unknown> | undefined;
      return control?.subtype === "set_model";
    })).toHaveLength(setModelCount);
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await final.turn;
  });

  it("falls back immediately when the child exits during a live switch", async () => {
    const first = await startTurn("s1");
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await first.turn;
    const second = sendFollowup("s1", { model: "claude:claude-opus-5" });
    expect(outgoingControlRequest("set_model")).toBeDefined();
    onExit!(1);
    await waitFor(() => spawned.length === 2, "fallback after child exit");
    const initialize = parse().filter((message) => {
      const control = message.request as Record<string, unknown> | undefined;
      return control?.subtype === "initialize";
    }).at(-1);
    emit({ type: "system", subtype: "init", session_id: "sess_1" });
    respondToControl(initialize?.request_id);
    await waitFor(() => parse().filter((message) => message.type === "user").length === 2, "user message after child exit");
    expect(second.events.filter((event) => event.type === "status")).toEqual([
      {
        type: "status",
        text: "Claude couldn't switch live, so it restarted with the new settings.",
      },
    ]);
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await second.turn;
  });
});

describe("Claude session approvals", () => {
  it("responds with a session MCP rule and replays it only in the same cwd", async () => {
    const { events, turn } = await startTurn("s1", {
      providerAccountId: "account-work",
    });
    const toolName = "mcp__plugin_socraticode_socraticode__codebase_search";
    emit({
      type: "control_request",
      request_id: "mcp_permission",
      request: {
        subtype: "can_use_tool",
        tool_name: toolName,
        input: { query: "find the session approval flow" },
        permission_suggestions: [],
      },
    });
    await waitFor(
      () => events.some((event) => event.type === "approval.requested"),
      "MCP approval",
    );
    const approval = events.find(
      (event) => event.type === "approval.requested",
    );
    if (approval?.type !== "approval.requested")
      throw new Error("missing MCP approval");
    expect(approval.sessionScope).toEqual({
      hint: "Stop asking for this in this chat.",
    });
    respondClaudeApproval("s1", approval.requestId, "allow", "session");
    await waitFor(
      () =>
        parse().some(
          (message) =>
            (message.response as Record<string, unknown>)?.request_id ===
            "mcp_permission",
        ),
      "Claude MCP response",
    );
    const controlResponse = parse().find(
      (message) =>
        (message.response as Record<string, unknown>)?.request_id ===
        "mcp_permission",
    )?.response as Record<string, unknown>;
    expect(controlResponse.response).toEqual({
      behavior: "allow",
      updatedInput: { query: "find the session approval flow" },
      updatedPermissions: [
        {
          type: "addRules",
          rules: [{ toolName }],
          behavior: "allow",
          destination: "session",
        },
      ],
    });
    expect(events).toContainEqual({
      type: "approval.resolved",
      requestId: approval.requestId,
      decision: "allow",
      scope: "session",
    });
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await turn;

    sent.length = 0;
    await stopClaudeSession("s1");
    const resumed = await startTurn("s1", {
      providerAccountId: "account-work",
    });
    expect(spawned[1]).toEqual(
      expect.arrayContaining(["--allowedTools", toolName]),
    );
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await resumed.turn;

    sent.length = 0;
    await stopClaudeSession("s1");
    await startTurn("s1", {
      providerAccountId: "account-work",
      cwd: "/different-repo",
    });
    expect(spawned[2]).not.toContain("--allowedTools");
  });
});

describe("claude legacy account resume", () => {
  it("resumes a legacy thread when the missing account resolves to default", async () => {
    bindClaudeSession("s1", "legacy-session", "/repo");
    const { turn } = await startTurn("s1", {
      providerAccountId: "default",
    });
    expect(spawned[0]).toEqual(
      expect.arrayContaining(["--resume", "legacy-session"]),
    );
    expect(spawned[0]).not.toContain("--session-id");
    emit({ type: "result", subtype: "success", session_id: "legacy-session" });
    await turn;
  });

  it("does not resume a legacy default thread under a named account", async () => {
    bindClaudeSession("s1", "legacy-session", "/repo");
    const { turn } = await startTurn("s1", {
      providerAccountId: "account-work",
    });
    expect(spawned[0]).not.toContain("--resume");
    expect(spawned[0]).toContain("--session-id");
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await turn;
  });
});

describe("claude subagents", () => {
  it.each(["allow", "deny"] as const)(
    "routes a child permission decision: %s",
    async (decision) => {
      const { events, turn } = await startTurn("s1");
      emit({
        type: "control_request",
        request_id: "child_permission",
        session_id: "sess_child",
        parent_tool_use_id: "toolu_agent",
        request: {
          subtype: "can_use_tool",
          tool_name: "Read",
          tool_use_id: "child_read",
          input: { file_path: "/home/user/.gitconfig" },
        },
      });
      const approval = events.find(
        (event) => event.type === "approval.requested",
      )!;
      expect(approval).toMatchObject({ callId: "child_read" });
      respondClaudeApproval("s1", approval.requestId, decision);
      await waitFor(
        () =>
          parse().some(
            (message) =>
              (message.response as Record<string, unknown>)?.request_id ===
              "child_permission",
          ),
        "child decision",
      );
      expect(
        parse().find(
          (message) =>
            (message.response as Record<string, unknown>)?.request_id ===
            "child_permission",
        ),
      ).toMatchObject({
        type: "control_response",
        response: { response: { behavior: decision } },
      });
      expect(
        events.filter((event) => event.type === "session.providerBound").at(-1),
      ).toMatchObject({ providerSessionId: "sess_1" });
      emit({ type: "result", subtype: "success", session_id: "sess_1" });
      await turn;
    },
  );

  it("keeps simultaneous child questions reachable in the single-question UI", async () => {
    const { events, turn } = await startTurn("s1");
    for (const id of ["child_a", "child_b"]) {
      emit({
        type: "control_request",
        request_id: id,
        parent_tool_use_id: `agent_${id}`,
        request: {
          subtype: "can_use_tool",
          tool_name: "AskUserQuestion",
          input: {
            questions: [
              {
                question: `Question from ${id}`,
                options: [{ label: "Proceed" }],
              },
            ],
          },
        },
      });
    }
    expect(
      events.filter((event) => event.type === "question.asked"),
    ).toHaveLength(1);
    for (const id of ["child_a", "child_b"]) {
      const session = events.reduce(
        applyHarnessEvent,
        newSession("claude", "/repo"),
      );
      const request = session.pendingQuestion!;
      expect(request.questions[0].prompt).toBe(`Question from ${id}`);
      respondClaudeQuestion(
        "s1",
        request.requestId,
        id === "child_a"
          ? {
              kind: "answered",
              answers: {
                [request.questions[0].id]: [request.questions[0].options[0].id],
              },
            }
          : { kind: "skipped" },
      );
      await waitFor(
        () =>
          parse().some(
            (message) =>
              (message.response as Record<string, unknown>)?.request_id === id,
          ),
        "question response",
      );
      expect(
        parse().find(
          (message) =>
            (message.response as Record<string, unknown>)?.request_id === id,
        ),
      ).toMatchObject({
        response: {
          response: { behavior: id === "child_a" ? "allow" : "deny" },
        },
      });
    }
    expect(
      events.reduce(applyHarnessEvent, newSession("claude", "/repo"))
        .pendingQuestion,
    ).toBeUndefined();
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await turn;
  });

  it.each(["child_a", "child_b"])(
    "preserves the remaining question when %s is cancelled by the server",
    async (cancelled) => {
      const { events, turn } = await startTurn("s1");
      for (const id of ["child_a", "child_b"]) {
        emit({
          type: "control_request",
          request_id: id,
          parent_tool_use_id: `agent_${id}`,
          request: {
            subtype: "can_use_tool",
            tool_name: "AskUserQuestion",
            input: {
              questions: [{ question: id, options: [{ label: "Proceed" }] }],
            },
          },
        });
      }
      emit({ type: "control_cancel_request", request_id: cancelled });
      await waitFor(
        () => events.some((event) => event.type === "question.resolved"),
        "cancelled question",
      );
      const session = events.reduce(
        applyHarnessEvent,
        newSession("claude", "/repo"),
      );
      const remaining = cancelled === "child_a" ? "child_b" : "child_a";
      expect(session.pendingQuestion?.questions[0].prompt).toBe(remaining);
      respondClaudeQuestion("s1", session.pendingQuestion!.requestId, {
        kind: "skipped",
      });
      await waitFor(
        () =>
          parse().some(
            (message) =>
              (message.response as Record<string, unknown>)?.request_id ===
              remaining,
          ),
        "remaining question response",
      );
      expect(
        parse().some(
          (message) =>
            (message.response as Record<string, unknown>)?.request_id ===
            cancelled,
        ),
      ).toBe(false);
      emit({ type: "result", subtype: "success", session_id: "sess_1" });
      await turn;
    },
  );

  it("fails the active turn if a child permission reply cannot be delivered", async () => {
    const { events, turn } = await startTurn("s1");
    emit({
      type: "control_request",
      request_id: "child_permission",
      parent_tool_use_id: "toolu_agent",
      request: {
        subtype: "can_use_tool",
        tool_name: "Read",
        input: { file_path: "/home/user/.gitconfig" },
      },
    });
    const approval = events.find(
      (event) => event.type === "approval.requested",
    )!;
    let outcome: unknown;
    void turn.catch((error) => {
      outcome = error;
    });
    writeChild.mockRejectedValueOnce(new Error("Broken pipe"));
    respondClaudeApproval("s1", approval.requestId, "allow");
    await waitFor(() => outcome instanceof Error, "failed permission delivery");
    expect(outcome).toMatchObject({ message: "Broken pipe" });
    expect(events).toContainEqual({
      type: "session.error",
      message: "Broken pipe",
    });
  });

  it("stays busy after a parent result while a background subagent is running", async () => {
    const { events, turn } = await startTurn("s1");
    let settled = false;
    void turn.then(() => {
      settled = true;
    });

    emit({
      type: "assistant",
      session_id: "sess_1",
      message: {
        content: [
          {
            type: "tool_use",
            id: "toolu_agent",
            name: "Agent",
            input: {
              description: "Explore the auth module",
              subagent_type: "explore",
            },
          },
        ],
      },
    });
    emit({
      type: "system",
      subtype: "task_started",
      task_id: "t1",
      tool_use_id: "toolu_agent",
      description: "Explore the auth module",
      task_type: "local_agent",
      is_backgrounded: true,
    });
    emit({
      type: "user",
      session_id: "sess_1",
      message: {
        content: [
          {
            type: "tool_result",
            tool_use_id: "toolu_agent",
            content: "Backgrounded",
          },
        ],
      },
    });
    emit({
      type: "result",
      subtype: "success",
      session_id: "sess_1",
    });

    await new Promise((r) => setTimeout(r, 30));
    expect(settled).toBe(false);
    expect(
      events.some(
        (event) =>
          event.type === "tool.started" &&
          event.kind === "agent" &&
          event.title === "Explore the auth module",
      ),
    ).toBe(true);
    expect(events.some((event) => event.type === "message.completed")).toBe(
      false,
    );

    emit({
      type: "system",
      subtype: "task_notification",
      task_id: "t1",
      tool_use_id: "toolu_agent",
      status: "completed",
      summary: "Found the tokens",
    });
    await turn;
    expect(settled).toBe(true);
    expect(events.some((event) => event.type === "message.completed")).toBe(
      true,
    );
  });

  it("does not end the turn on a subagent result", async () => {
    const { events, turn } = await startTurn("s1");
    let settled = false;
    void turn.then(() => {
      settled = true;
    });

    emit({
      type: "assistant",
      session_id: "sess_1",
      message: {
        content: [
          {
            type: "tool_use",
            id: "toolu_agent",
            name: "Agent",
            input: { description: "Explore", subagent_type: "explore" },
          },
        ],
      },
    });
    emit({
      type: "result",
      subtype: "success",
      session_id: "sess_sub",
      parent_tool_use_id: "toolu_agent",
    });

    await new Promise((r) => setTimeout(r, 30));
    expect(settled).toBe(false);
    expect(events.some((event) => event.type === "message.completed")).toBe(
      false,
    );

    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await turn;
    expect(settled).toBe(true);
  });

  it("does not dump subagent assistant text into the parent transcript", async () => {
    const { events, turn } = await startTurn("s1");
    emit({
      type: "assistant",
      session_id: "sess_1",
      message: {
        content: [
          {
            type: "tool_use",
            id: "toolu_agent",
            name: "Agent",
            input: { description: "Explore", subagent_type: "explore" },
          },
        ],
      },
    });
    emit({
      type: "assistant",
      parent_tool_use_id: "toolu_agent",
      message: { content: [{ type: "text", text: "I will grep for tokens" }] },
    });
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await turn;
    expect(
      events.some(
        (event) =>
          event.type === "message.delta" &&
          event.text.includes("I will grep for tokens"),
      ),
    ).toBe(false);
  });

  it("mirrors a subagent's tools, thinking and prose onto its own row", async () => {
    const { events, turn } = await startTurn("s1");
    emit({
      type: "assistant",
      session_id: "sess_1",
      message: {
        content: [
          {
            type: "tool_use",
            id: "toolu_agent",
            name: "Agent",
            input: {
              description: "Correctness review",
              subagent_type: "explore",
            },
          },
        ],
      },
    });
    emit({
      type: "assistant",
      parent_tool_use_id: "toolu_agent",
      message: {
        id: "msg_sub_1",
        model: "claude-haiku-4-5",
        content: [
          { type: "thinking", thinking: "Start with the reducer." },
          { type: "text", text: "I will grep for tokens" },
          {
            type: "tool_use",
            id: "toolu_sub_read",
            name: "Read",
            input: { file_path: "/repo/src/App.tsx" },
          },
        ],
      },
    });
    emit({
      type: "user",
      parent_tool_use_id: "toolu_agent",
      message: {
        content: [
          {
            type: "tool_result",
            tool_use_id: "toolu_sub_read",
            content: "export function App() {}",
          },
        ],
      },
    });
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await turn;

    expect(
      events
        .reduce(applyHarnessEvent, newSession("claude", "/repo"))
        .blocks.find((block) => block.tool?.callId === "toolu_agent")?.agentRun
        ?.model,
    ).toBe("claude-haiku-4-5");
    const steps = events.filter((event) => event.type === "agent.step");
    expect(steps.every((step) => step.callId === "toolu_agent")).toBe(true);
    expect(
      steps.map((step) => [step.stepId, step.kind, step.text, step.status]),
    ).toEqual([
      ["msg_sub_1:thinking", "reasoning", "Start with the reducer.", undefined],
      ["msg_sub_1:text", "message", "I will grep for tokens", undefined],
      ["toolu_sub_read", "tool", "Read /repo/src/App.tsx", "in_progress"],
      ["toolu_sub_read", "tool", "", "completed"],
    ]);
  });

  it("does not mirror a subagent result onto the parent tool row", async () => {
    const { events, turn } = await startTurn("s1");
    emit({
      type: "assistant",
      session_id: "sess_1",
      message: {
        content: [
          {
            type: "tool_use",
            id: "toolu_agent",
            name: "Agent",
            input: { description: "Correctness review" },
          },
        ],
      },
    });
    emit({
      type: "user",
      parent_tool_use_id: "toolu_agent",
      message: {
        content: [
          {
            type: "tool_result",
            tool_use_id: "toolu_sub_read",
            content: "export function App() {}",
          },
        ],
      },
    });
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await turn;

    // The parent stays in flight: only the subagent's own row settles.
    expect(
      events.some(
        (event) =>
          event.type === "tool.updated" &&
          event.callId === "toolu_agent" &&
          event.status === "completed",
      ),
    ).toBe(false);
  });

  it("routes an unexpected provider exit to the turn that is actually running", async () => {
    const first = await startTurn("s1");
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await first.turn;

    const secondEvents: HarnessEvent[] = [];
    const userMessages = parse().filter(
      (message) => message.type === "user",
    ).length;
    const second = sendClaudeTurn({
      sessionId: "s1",
      cwd: "/repo",
      model: "claude:claude-sonnet-5",
      runtimeMode: "supervised",
      text: "try again",
      attachments: [],
      onEvent: (event) => secondEvents.push(event),
    });
    await waitFor(
      () =>
        parse().filter((message) => message.type === "user").length >
        userMessages,
      "second user prompt",
    );

    onExit?.(1);
    await expect(second).rejects.toThrow("Claude Code exited");
    expect(first.events.some((event) => event.type === "session.ended")).toBe(
      false,
    );
    expect(secondEvents).toContainEqual({ type: "session.ended", code: 1 });
    expect(secondEvents).toContainEqual({
      type: "session.error",
      message: "Claude Code exited",
    });
  });
});

describe("claude plan permissions", () => {
  it("answers residual plan-mode permissions without prompting the user", async () => {
    const { events, turn } = await startTurn("s1", {
      runtimeMode: "auto",
      intent: "plan",
    });

    emit({
      type: "control_request",
      request_id: "read_1",
      request: {
        subtype: "can_use_tool",
        tool_name: "Read",
        input: { file_path: "/repo/src/App.tsx" },
      },
    });
    emit({
      type: "control_request",
      request_id: "write_1",
      request: {
        subtype: "can_use_tool",
        tool_name: "Write",
        input: { file_path: "/repo/src/new.ts" },
      },
    });

    await waitFor(
      () =>
        parse().filter((message) => message.type === "control_response")
          .length >= 2,
      "plan permission responses",
    );
    const responses = parse().filter(
      (message) => message.type === "control_response",
    );
    const read = responses.find(
      (message) =>
        (message.response as Record<string, unknown>)?.request_id === "read_1",
    );
    const write = responses.find(
      (message) =>
        (message.response as Record<string, unknown>)?.request_id === "write_1",
    );
    expect(
      (
        (read?.response as Record<string, unknown>)?.response as Record<
          string,
          unknown
        >
      )?.behavior,
    ).toBe("allow");
    expect(
      (
        (write?.response as Record<string, unknown>)?.response as Record<
          string,
          unknown
        >
      )?.behavior,
    ).toBe("deny");
    expect(events.some((event) => event.type === "approval.requested")).toBe(
      false,
    );

    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await turn;
  });
});

describe("claude manual compaction", () => {
  it("runs the built-in command and requires a compact boundary", async () => {
    const { turn } = await startTurn("s1");
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await turn;
    sent.length = 0;

    const events: HarnessEvent[] = [];
    const compact = compactClaudeContext({
      sessionId: "s1",
      cwd: "/repo",
      model: "claude:claude-sonnet-5",
      runtimeMode: "supervised",
      onEvent: (event) => events.push(event),
    });
    await waitFor(
      () => parse().some((message) => message.type === "user"),
      "compact command",
    );
    expect(parse().find((message) => message.type === "user")).toMatchObject({
      message: { content: [{ type: "text", text: "/compact" }] },
    });

    emit({
      type: "assistant",
      session_id: "sess_1",
      message: { content: [{ type: "text", text: "not transcript output" }] },
    });
    emit({
      type: "system",
      subtype: "compact_boundary",
      session_id: "sess_1",
    });
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await compact;

    expect(events).toContainEqual({
      type: "status",
      text: "Compacted context",
    });
    expect(events.some((event) => event.type === "message.delta")).toBe(false);
  });
});

describe("native context inspection", () => {
  async function idle() {
    const started = await startTurn("s1");
    emit({ type: "result", subtype: "success", session_id: "sess_1" });
    await started.turn;
    return started;
  }
  it("does not spawn or write when absent or busy", async () => {
    expect(await inspectClaudeContext("s1")).toBeNull();
    expect(spawned).toHaveLength(0);
    const started = await startTurn("s1");
    expect(await inspectClaudeContext("s1")).toBeNull();
    expect(outgoingControlRequest("get_context_usage")).toBeUndefined();
    emit({ type: "result", subtype: "success" });
    await started.turn;
  });
  it("writes one summary request and parses its response", async () => {
    await idle();
    const inspection = inspectClaudeContext("s1");
    const request = outgoingControlRequest("get_context_usage");
    expect(request?.request).toEqual({
      subtype: "get_context_usage",
      detail: "summary",
    });
    expect(
      parse().filter(
        (message) =>
          (message.request as Record<string, unknown> | undefined)?.subtype ===
          "get_context_usage",
      ),
    ).toHaveLength(1);
    respondToControl(request?.request_id, { totalTokens: 100, maxTokens: 200 });
    expect(await inspection).toMatchObject({
      source: "claude",
      totalTokens: 100,
    });
  });
  it("returns null on timeout", async () => {
    await idle();
    vi.useFakeTimers();
    const inspection = inspectClaudeContext("s1");
    await vi.advanceTimersByTimeAsync(5000);
    expect(await inspection).toBeNull();
  });
  it("returns null on cancellation and ignores late replies", async () => {
    await idle();
    const controller = new AbortController();
    const inspection = inspectClaudeContext("s1", controller.signal);
    const request = outgoingControlRequest("get_context_usage");
    controller.abort();
    expect(await inspection).toBeNull();
    respondToControl(request?.request_id, { totalTokens: 100, maxTokens: 200 });
  });
  it("rejects responses from a stopped process", async () => {
    await idle();
    const inspection = inspectClaudeContext("s1");
    const request = outgoingControlRequest("get_context_usage");
    respondToControl(request?.request_id, { totalTokens: 100, maxTokens: 200 });
    await stopClaudeSession("s1");
    expect(await inspection).toBeNull();
  });
  it.each(["error", "invalid"])(
    "returns null for %s responses",
    async (kind) => {
      await idle();
      const inspection = inspectClaudeContext("s1");
      const request = outgoingControlRequest("get_context_usage");
      if (kind === "error")
        emit({
          type: "control_response",
          response: {
            subtype: "error",
            request_id: request?.request_id,
            error: "unavailable",
          },
        });
      else respondToControl(request?.request_id, { totalTokens: "bad" });
      expect(await inspection).toBeNull();
    },
  );
  it("emits stale on confirmed compaction", async () => {
    const started = await idle();
    emit({
      type: "system",
      subtype: "compact_boundary",
      compact_metadata: { trigger: "auto", pre_tokens: 100 },
    });
    expect(started.events).toContainEqual({ type: "context.stale" });
  });
});
