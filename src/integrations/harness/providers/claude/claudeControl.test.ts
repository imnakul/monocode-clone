import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sent: string[] = [];
const spawned: string[][] = [];
const spawnChild = vi.fn(async (_id: string, _path: string, args: string[]) => {
  spawned.push(args);
});
const children: Array<{
  onLine: (line: string) => void;
  onExit: (code?: number | null) => void;
}> = [];
const writeChild = vi.fn(async (_id: string, line: string) => {
  sent.push(line);
});

vi.mock("../../core/child", () => ({
  resolveClaudeBinary: async () => ({ path: "/fake/claude" }),
  spawnChild,
  killChild: async () => undefined,
  unwatchChild: () => undefined,
  watchChild: (
    _id: string,
    onLine: (line: string) => void,
    onExit: (code?: number | null) => void,
  ) => {
    children.push({ onLine, onExit });
  },
  writeChild,
}));

const {
  ClaudeControlError,
  cancelClaudeTurn,
  requestClaudeControl,
  isClaudeRemoteControlDesired,
  respondClaudeApproval,
  setClaudeRemoteControl,
  setClaudeRemoteControlDesired,
  sendClaudeTurn,
  stopClaudeSession,
  __claudeTestReset,
} = await import("./claude");
import type { HarnessEvent } from "../../core/types";

function parse(): Record<string, unknown>[] {
  return sent.map((line) => JSON.parse(line) as Record<string, unknown>);
}

function emit(childIndex: number, record: Record<string, unknown>): void {
  children[childIndex]?.onLine(JSON.stringify(record));
}

const waitFor = async (
  predicate: () => boolean,
  label: string,
): Promise<void> => {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(
    `timed out waiting for ${label}; sent=${JSON.stringify(parse())}`,
  );
};

async function startTurn(sessionId: string) {
  const childIndex = children.length;
  const userCount = parse().filter((message) => message.type === "user").length;
  const events: HarnessEvent[] = [];
  const turn = sendClaudeTurn({
    sessionId,
    cwd: "/repo",
    model: "claude:claude-sonnet-4-6",
    modelSettings: {},
    runtimeMode: "supervised",
    text: "explore the codebase",
    attachments: [],
    onEvent: (event) => events.push(event),
  });
  await waitFor(
    () =>
      parse().some((message) => {
        const request = message.request as Record<string, unknown> | undefined;
        return request?.subtype === "initialize";
      }),
    "Claude initialize request",
  );
  const initialize = parse().find((message) => {
    const request = message.request as Record<string, unknown> | undefined;
    return request?.subtype === "initialize";
  });
  emit(childIndex, { type: "system", subtype: "init", session_id: "sess_1" });
  emit(childIndex, {
    type: "control_response",
    response: {
      subtype: "success",
      request_id: initialize?.request_id,
      response: { pid: 1 },
    },
  });
  await waitFor(
    () =>
      parse().filter((message) => message.type === "user").length > userCount,
    "user prompt",
  );
  return { childIndex, events, turn };
}

async function finishTurn(turn: Promise<void>, childIndex = 0): Promise<void> {
  emit(childIndex, {
    type: "result",
    subtype: "success",
    session_id: "sess_1",
  });
  await turn;
}

function controlRequest(subtype: string): Record<string, unknown> | undefined {
  return parse()
    .filter((message) => {
      const request = message.request as Record<string, unknown> | undefined;
      return request?.subtype === subtype;
    })
    .at(-1);
}

function respondControl(
  childIndex: number,
  requestId: unknown,
  response: Record<string, unknown> = {},
): void {
  emit(childIndex, {
    type: "control_response",
    response: { subtype: "success", request_id: requestId, response },
  });
}

beforeEach(() => {
  sent.length = 0;
  spawned.length = 0;
  children.length = 0;
  writeChild.mockReset();
  writeChild.mockImplementation(async (_id: string, line: string) => {
    sent.push(line);
  });
  spawnChild.mockReset();
  spawnChild.mockImplementation(async (_id: string, _path: string, args: string[]) => {
    spawned.push(args);
  });
  __claudeTestReset();
});

afterEach(async () => {
  vi.useRealTimers();
  await stopClaudeSession("s1");
  __claudeTestReset();
});

describe("Claude control transport", () => {
  it("rejects unavailable sessions without spawning a child", async () => {
    await expect(
      requestClaudeControl("missing", { subtype: "get_settings" }),
    ).rejects.toMatchObject({ reason: "unavailable" });
    expect(spawned).toHaveLength(0);
  });

  it("requires an initialized child and honors the idle guard", async () => {
    const turn = sendClaudeTurn({
      sessionId: "s1",
      cwd: "/repo",
      model: "claude:claude-sonnet-4-6",
      modelSettings: {},
      runtimeMode: "supervised",
      text: "hello",
      attachments: [],
      onEvent: () => undefined,
    });
    await waitFor(
      () => controlRequest("initialize") !== undefined,
      "initialize request",
    );
    await expect(
      requestClaudeControl("s1", { subtype: "get_settings" }),
    ).rejects.toMatchObject({ reason: "unavailable" });

    const initialize = controlRequest("initialize");
    emit(0, { type: "system", subtype: "init", session_id: "sess_1" });
    respondControl(0, initialize?.request_id);
    await waitFor(
      () => parse().some((message) => message.type === "user"),
      "prompt",
    );
    await expect(
      requestClaudeControl(
        "s1",
        { subtype: "get_settings" },
        { requireIdle: true },
      ),
    ).rejects.toMatchObject({ reason: "unavailable" });
    expect(controlRequest("get_settings")).toBeUndefined();

    await finishTurn(turn);
    const pending = requestClaudeControl(
      "s1",
      { subtype: "get_settings" },
      { requireIdle: true },
    );
    const request = controlRequest("get_settings");
    expect(request).toBeDefined();
    respondControl(0, request?.request_id, { model: "claude-sonnet-4-6" });
    await expect(pending).resolves.toMatchObject({
      payload: { model: "claude-sonnet-4-6" },
      generation: expect.any(Number),
    });
  });

  it("does not issue a read request while a Claude approval is pending", async () => {
    const { events, turn } = await startTurn("s1");
    emit(0, {
      type: "control_request",
      request_id: "pending_permission",
      request: {
        subtype: "can_use_tool",
        tool_name: "Read",
        input: { file_path: "/repo/README.md" },
      },
    });
    await waitFor(
      () => events.some((event) => event.type === "approval.requested"),
      "permission approval",
    );
    const userFacingApproval = events.find(
      (event) => event.type === "approval.requested",
    );
    if (userFacingApproval?.type !== "approval.requested") {
      throw new Error("missing permission approval");
    }

    const requestCount = parse().length;
    await expect(
      requestClaudeControl(
        "s1",
        { subtype: "get_context_usage" },
        { requireIdle: true },
      ),
    ).rejects.toMatchObject({ reason: "unavailable" });
    expect(parse()).toHaveLength(requestCount);

    respondClaudeApproval("s1", userFacingApproval.requestId, "allow");
    await waitFor(
      () =>
        parse().some((message) => {
          const response = message.response as
            Record<string, unknown> | undefined;
          return response?.request_id === "pending_permission";
        }),
      "permission response",
    );
    await finishTurn(turn);
  });

  it("cancels without sending a cancel message and ignores late responses", async () => {
    const { turn } = await startTurn("s1");
    await finishTurn(turn);
    const controller = new AbortController();
    const before = sent.length;
    const pending = requestClaudeControl(
      "s1",
      { subtype: "get_settings" },
      { signal: controller.signal },
    );
    const request = controlRequest("get_settings");
    expect(request).toBeDefined();
    controller.abort();
    await expect(pending).rejects.toMatchObject({
      name: ClaudeControlError.name,
      reason: "cancelled",
    });
    expect(sent).toHaveLength(before + 1);
    respondControl(0, request?.request_id, { ignored: true });

    const alreadyAborted = new AbortController();
    alreadyAborted.abort();
    const afterLateResponse = sent.length;
    await expect(
      requestClaudeControl(
        "s1",
        { subtype: "get_settings" },
        { signal: alreadyAborted.signal },
      ),
    ).rejects.toMatchObject({ reason: "cancelled" });
    expect(sent).toHaveLength(afterLateResponse);
  });

  it("clears timers after repeated success and a write failure", async () => {
    const { turn } = await startTurn("s1");
    await finishTurn(turn);
    vi.useFakeTimers();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const pending = requestClaudeControl("s1", { subtype: "get_settings" });
      const request = controlRequest("get_settings");
      expect(request).toBeDefined();
      respondControl(0, request?.request_id);
      await expect(pending).resolves.toMatchObject({ generation: 1 });
      expect(vi.getTimerCount()).toBe(0);
    }

    writeChild.mockRejectedValueOnce(new Error("stdin closed"));
    await expect(
      requestClaudeControl("s1", { subtype: "get_settings" }),
    ).rejects.toMatchObject({ reason: "write-failed" });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("times out pending requests and rejects them when the child exits", async () => {
    const { turn } = await startTurn("s1");
    await finishTurn(turn);
    vi.useFakeTimers();

    const timeout = requestClaudeControl("s1", { subtype: "get_settings" });
    const timeoutExpectation = expect(timeout).rejects.toMatchObject({
      reason: "timeout",
    });
    await vi.advanceTimersByTimeAsync(5_000);
    await timeoutExpectation;
    expect(vi.getTimerCount()).toBe(0);

    const stopped = requestClaudeControl("s1", {
      subtype: "get_context_usage",
    });
    const request = controlRequest("get_context_usage");
    children[0]?.onExit(1);
    await expect(stopped).rejects.toMatchObject({ reason: "stopped" });
    expect(request).toBeDefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("uses a newer generation after respawn and ignores an old response id", async () => {
    const first = await startTurn("s1");
    await finishTurn(first.turn, first.childIndex);
    const firstRequest = requestClaudeControl("s1", {
      subtype: "get_settings",
    });
    const requestA = controlRequest("get_settings");
    respondControl(first.childIndex, requestA?.request_id, { model: "sonnet" });
    const { generation: generationA } = await firstRequest;

    const waiting = requestClaudeControl("s1", {
      subtype: "get_context_usage",
    });
    const requestB = controlRequest("get_context_usage");
    children[first.childIndex]?.onExit(1);
    await expect(waiting).rejects.toMatchObject({ reason: "stopped" });

    const second = await startTurn("s1");
    const latestRequest = requestClaudeControl("s1", {
      subtype: "get_settings",
    });
    const requestOnSecond = parse()
      .filter((message) => {
        const request = message.request as Record<string, unknown> | undefined;
        return request?.subtype === "get_settings";
      })
      .at(-1);
    let settled = false;
    void latestRequest.then(() => {
      settled = true;
    });
    respondControl(second.childIndex, requestB?.request_id);
    await Promise.resolve();
    expect(settled).toBe(false);
    respondControl(second.childIndex, requestOnSecond?.request_id, {
      model: "sonnet",
    });
    const result = await latestRequest;
    expect(result.generation).toBeGreaterThan(generationA);
    await finishTurn(second.turn, second.childIndex);
  });
});

describe("Claude Remote Control", () => {
  const input = (onEvent: (event: HarnessEvent) => void) => ({
    sessionId: "s1",
    cwd: "/repo",
    model: "claude:claude-sonnet-4-6",
    modelSettings: {},
    runtimeMode: "supervised" as const,
    onEvent,
  });

  it("enables through the control protocol without writing a user message", async () => {
    const events: HarnessEvent[] = [];
    const enabling = setClaudeRemoteControl({
      ...input((event) => events.push(event)),
      enabled: true,
      name: "  MonoCode chat  ",
    });
    await waitFor(() => controlRequest("initialize") !== undefined, "initialize");
    const initialize = controlRequest("initialize");
    emit(0, { type: "system", subtype: "init", session_id: "sess_1" });
    respondControl(0, initialize?.request_id);

    await waitFor(
      () => controlRequest("remote_control") !== undefined,
      "Remote Control enable request",
    );
    const request = controlRequest("remote_control");
    expect(request?.request).toEqual({
      subtype: "remote_control",
      enabled: true,
      name: "MonoCode chat",
    });
    expect(parse().some((message) => message.type === "user")).toBe(false);

    respondControl(0, request?.request_id, {
      session_url: "https://claude.ai/code/remote-session",
    });
    await enabling;
    expect(events).toContainEqual({
      type: "remoteControl.changed",
      status: "on",
      url: "https://claude.ai/code/remote-session",
    });
  });

  it("coalesces enable and first send, and does not wait for the RC response before sending", async () => {
    const events: HarnessEvent[] = [];
    const enabling = setClaudeRemoteControl({
      ...input((event) => events.push(event)),
      enabled: true,
      name: "Concurrent chat",
    });
    const turn = sendClaudeTurn({
      ...input((event) => events.push(event)),
      text: "first message",
      attachments: [],
    });
    await waitFor(() => controlRequest("initialize") !== undefined, "initialize");
    const initialize = controlRequest("initialize");
    emit(0, { type: "system", subtype: "init", session_id: "sess_1" });
    respondControl(0, initialize?.request_id);
    await waitFor(
      () => controlRequest("remote_control") !== undefined,
      "Remote Control request",
    );
    const remote = controlRequest("remote_control");
    await waitFor(
      () => parse().some((message) => message.type === "user"),
      "user message while RC is pending",
    );
    expect(spawned).toHaveLength(1);
    const messages = parse();
    const remoteIndex = messages.findIndex((message) => {
      const request = message.request as Record<string, unknown> | undefined;
      return request?.subtype === "remote_control";
    });
    const userIndex = messages.findIndex((message) => message.type === "user");
    expect(remoteIndex).toBeLessThan(userIndex);
    emit(0, {
      type: "control_response",
      response: {
        subtype: "error",
        request_id: remote?.request_id,
        error: "Remote Control is unavailable for this account.",
      },
    });
    await expect(enabling).rejects.toMatchObject({ status: "failed" });
    emit(0, { type: "result", subtype: "success", session_id: "sess_1" });
    await turn;
  });

  it("unblocks automatic RC initialization if the control write never completes before exit", async () => {
    setClaudeRemoteControlDesired("s1", true, "Saved chat");
    writeChild.mockImplementation(async (_id: string, line: string) => {
      sent.push(line);
      const record = JSON.parse(line) as Record<string, unknown>;
      const request = record.request as Record<string, unknown> | undefined;
      if (request?.subtype === "remote_control") {
        await new Promise<void>(() => undefined);
      }
    });

    const turn = sendClaudeTurn({
      ...input(() => undefined),
      text: "first local message",
      attachments: [],
    });
    const rejected = expect(turn).rejects.toThrow("Claude Code exited");
    await waitFor(() => controlRequest("initialize") !== undefined, "initialize");
    const initialize = controlRequest("initialize");
    emit(0, { type: "system", subtype: "init", session_id: "sess_1" });
    respondControl(0, initialize?.request_id);
    await waitFor(
      () => controlRequest("remote_control") !== undefined,
      "Remote Control write",
    );

    children[0]?.onExit(1);
    await rejected;
    expect(parse().some((message) => message.type === "user")).toBe(false);
  });

  it("ignores a failed startup from an enable request superseded by disable", async () => {
    let rejectSpawn: ((error: Error) => void) | undefined;
    spawnChild.mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectSpawn = reject;
        }),
    );
    const events: HarnessEvent[] = [];
    const enabling = setClaudeRemoteControl({
      ...input((event) => events.push(event)),
      enabled: true,
    });
    await waitFor(() => rejectSpawn !== undefined, "pending Claude spawn");

    await setClaudeRemoteControl({
      ...input((event) => events.push(event)),
      enabled: false,
    });
    rejectSpawn?.(new Error("simulated stale spawn failure"));
    await expect(enabling).resolves.toBeUndefined();
    expect(isClaudeRemoteControlDesired("s1")).toBe(false);
    expect(
      events.some(
        (event) =>
          event.type === "remoteControl.changed" && event.status === "failed",
      ),
    ).toBe(false);
  });

  it("does not mistake a delayed system init for an unfinished phone turn", async () => {
    const events: HarnessEvent[] = [];
    const enabling = setClaudeRemoteControl({
      ...input((event) => events.push(event)),
      enabled: true,
    });
    await waitFor(() => controlRequest("initialize") !== undefined, "initialize");
    const initialize = controlRequest("initialize");
    respondControl(0, initialize?.request_id);
    await waitFor(
      () => controlRequest("remote_control") !== undefined,
      "Remote Control enable",
    );
    const remote = controlRequest("remote_control");
    respondControl(0, remote?.request_id, {
      session_url: "https://claude.ai/code/late-init",
    });
    await enabling;

    emit(0, { type: "system", subtype: "init", session_id: "sess_1" });
    const turn = sendClaudeTurn({
      ...input((event) => events.push(event)),
      text: "send after delayed initialization",
      attachments: [],
    });
    await waitFor(
      () => parse().some((message) => message.type === "user"),
      "local user message after delayed init",
    );
    expect(events).not.toContainEqual({
      type: "status",
      text: "Claude is answering a message sent from another device.",
    });
    emit(0, { type: "result", subtype: "success", session_id: "sess_1" });
    await turn;
  });

  it("keeps consent required as desired state and emits the real CLI error", async () => {
    const events: HarnessEvent[] = [];
    const enabling = setClaudeRemoteControl({
      ...input((event) => events.push(event)),
      enabled: true,
      name: "MonoCode chat",
    });
    await waitFor(() => controlRequest("initialize") !== undefined, "initialize");
    const initialize = controlRequest("initialize");
    emit(0, { type: "system", subtype: "init", session_id: "sess_1" });
    respondControl(0, initialize?.request_id);
    await waitFor(
      () => controlRequest("remote_control") !== undefined,
      "Remote Control enable request",
    );
    const request = controlRequest("remote_control");
    emit(0, {
      type: "control_response",
      response: {
        subtype: "error",
        request_id: request?.request_id,
        error:
          "Remote Control asks for a one-time confirmation before it's first enabled.",
      },
    });

    await expect(enabling).rejects.toMatchObject({
      status: "needs-consent",
      message:
        "Remote Control asks for a one-time confirmation before it's first enabled.",
    });
    expect(isClaudeRemoteControlDesired("s1")).toBe(true);
    expect(events).toContainEqual({
      type: "remoteControl.changed",
      status: "needs-consent",
      message:
        "Remote Control asks for a one-time confirmation before it's first enabled.",
    });
    expect(parse().some((message) => message.type === "user")).toBe(false);
  });

  it("clears desired state after a hard failure", async () => {
    const events: HarnessEvent[] = [];
    const enabling = setClaudeRemoteControl({
      ...input((event) => events.push(event)),
      enabled: true,
    });
    await waitFor(() => controlRequest("initialize") !== undefined, "initialize");
    const initialize = controlRequest("initialize");
    emit(0, { type: "system", subtype: "init", session_id: "sess_1" });
    respondControl(0, initialize?.request_id);
    await waitFor(
      () => controlRequest("remote_control") !== undefined,
      "Remote Control enable request",
    );
    const request = controlRequest("remote_control");
    emit(0, {
      type: "control_response",
      response: {
        subtype: "error",
        request_id: request?.request_id,
        error: "Remote Control is unavailable for this account.",
      },
    });

    await expect(enabling).rejects.toMatchObject({ status: "failed" });
    expect(isClaudeRemoteControlDesired("s1")).toBe(false);
    expect(events).toContainEqual({
      type: "remoteControl.changed",
      status: "failed",
      message: "Remote Control is unavailable for this account.",
    });
  });

  it("re-enables after process exit, after initialize and before the next user message", async () => {
    setClaudeRemoteControlDesired("s1", true, "Saved chat");
    const events: HarnessEvent[] = [];
    const first = sendClaudeTurn({
      ...input((event) => events.push(event)),
      text: "first turn",
      attachments: [],
    });
    await waitFor(() => controlRequest("initialize") !== undefined, "first initialize");
    const firstInit = controlRequest("initialize");
    emit(0, { type: "system", subtype: "init", session_id: "sess_1" });
    respondControl(0, firstInit?.request_id);
    await waitFor(
      () => parse().filter((message) => (message.request as Record<string, unknown> | undefined)?.subtype === "remote_control").length === 1,
      "first RC enable",
    );
    const firstRemote = controlRequest("remote_control");
    respondControl(0, firstRemote?.request_id, {
      session_url: "https://claude.ai/code/first",
    });
    await waitFor(
      () => parse().filter((message) => message.type === "user").length === 1,
      "first user message",
    );
    emit(0, { type: "result", subtype: "success", session_id: "sess_1" });
    await first;
    children[0]?.onExit(1);

    const second = sendClaudeTurn({
      ...input((event) => events.push(event)),
      text: "second turn",
      attachments: [],
    });
    await waitFor(
      () => parse().filter((message) => (message.request as Record<string, unknown> | undefined)?.subtype === "initialize").length === 2,
      "second initialize",
    );
    const secondInit = parse()
      .filter((message) => (message.request as Record<string, unknown> | undefined)?.subtype === "initialize")
      .at(-1);
    emit(1, { type: "system", subtype: "init", session_id: "sess_1" });
    respondControl(1, secondInit?.request_id);
    await waitFor(
      () => parse().filter((message) => (message.request as Record<string, unknown> | undefined)?.subtype === "remote_control").length === 2,
      "second RC enable",
    );
    const secondRemote = controlRequest("remote_control");
    const requests = parse().flatMap((message) => {
      const request = message.request as Record<string, unknown> | undefined;
      return request ? [request.subtype] : [];
    });
    const secondInitializeIndex = requests.lastIndexOf("initialize");
    const secondRemoteIndex = requests.lastIndexOf("remote_control");
    expect(secondInitializeIndex).toBeLessThan(secondRemoteIndex);
    respondControl(1, secondRemote?.request_id, {
      session_url: "https://claude.ai/code/second",
    });
    await waitFor(
      () => parse().filter((message) => message.type === "user").length === 2,
      "second user message",
    );
    emit(1, { type: "result", subtype: "success", session_id: "sess_1" });
    await second;
  });

  it("lets the last of rapid toggle responses own the status", async () => {
    const { events, turn, childIndex } = await startTurn("s1");
    const enablingA = setClaudeRemoteControl({
      ...input((event) => events.push(event)),
      enabled: true,
    });
    await waitFor(
      () => parse().filter((message) => (message.request as Record<string, unknown> | undefined)?.subtype === "remote_control").length === 1,
      "first toggle request",
    );
    const disabling = setClaudeRemoteControl({
      ...input((event) => events.push(event)),
      enabled: false,
    });
    await waitFor(
      () => parse().filter((message) => (message.request as Record<string, unknown> | undefined)?.subtype === "remote_control").length === 2,
      "second toggle request",
    );
    const enablingC = setClaudeRemoteControl({
      ...input((event) => events.push(event)),
      enabled: true,
    });
    await waitFor(
      () => parse().filter((message) => (message.request as Record<string, unknown> | undefined)?.subtype === "remote_control").length === 3,
      "third toggle request",
    );
    const requests = parse().filter((message) =>
      (message.request as Record<string, unknown> | undefined)?.subtype ===
      "remote_control",
    );
    respondControl(childIndex, requests[2]?.request_id, {
      session_url: "https://claude.ai/code/latest",
    });
    await enablingC;
    respondControl(childIndex, requests[0]?.request_id, {
      session_url: "https://claude.ai/code/stale-on",
    });
    respondControl(childIndex, requests[1]?.request_id);
    await Promise.all([enablingA, disabling]);
    const remoteEvents = events.filter(
      (event) => event.type === "remoteControl.changed",
    );
    expect(remoteEvents.at(-1)).toEqual({
      type: "remoteControl.changed",
      status: "on",
      url: "https://claude.ai/code/latest",
    });

    let turnSettled = false;
    void turn.then(() => {
      turnSettled = true;
    });
    await Promise.resolve();
    expect(turnSettled).toBe(false);
    await finishTurn(turn, childIndex);
  });

  it("streams isolated phone turns, cancels approvals, and waits before MonoCode sends", async () => {
    setClaudeRemoteControlDesired("s1", true, "Phone-safe chat");
    const events: HarnessEvent[] = [];
    const first = sendClaudeTurn({
      ...input((event) => events.push(event)),
      text: "first turn",
      attachments: [],
    });
    await waitFor(() => controlRequest("initialize") !== undefined, "initialize");
    const initialize = controlRequest("initialize");
    emit(0, { type: "system", subtype: "init", session_id: "sess_1" });
    respondControl(0, initialize?.request_id);
    await waitFor(
      () => controlRequest("remote_control") !== undefined,
      "Remote Control enable",
    );
    const remote = controlRequest("remote_control");
    respondControl(0, remote?.request_id, {
      session_url: "https://claude.ai/code/phone-safe",
    });
    await waitFor(
      () => parse().some((message) => message.type === "user"),
      "first user message",
    );
    emit(0, { type: "result", subtype: "success", session_id: "sess_1" });
    await first;

    const eventOffset = events.length;
    // Late idle results/tool results must not fabricate a new phone turn.
    emit(0, { type: "result", subtype: "success", session_id: "sess_1" });
    emit(0, { type: "user", message: { content: [{ type: "tool_result", content: "old result" }] } });
    expect(events.slice(eventOffset).some((event) => event.type === "externalTurn.started")).toBe(false);
    emit(0, {
      type: "user",
      session_id: "sess_1",
      uuid: "phone-user-id",
      message: { role: "user", content: "phone message" },
    });
    for (const text of ["phone ", "reply"]) emit(0, {
      type: "stream_event", session_id: "sess_1",
      event: { type: "content_block_delta", index: 0, delta: { type: "text_delta", text } },
    });
    const phoneAssistant = {
      type: "assistant", uuid: "phone-assistant-id", session_id: "sess_1",
      message: { content: [{ type: "text", text: "phone reply" }], usage: { input_tokens: 9, output_tokens: 4 } },
    };
    emit(0, phoneAssistant);
    emit(0, phoneAssistant);
    emit(0, {
      type: "tool_progress",
      session_id: "sess_1",
      tool_use_id: "phone-tool",
      content: "phone tool output",
    });

    emit(0, {
      type: "control_request",
      request_id: "phone_permission",
      request: {
        subtype: "can_use_tool",
        tool_name: "Read",
        input: { file_path: "/repo/file" },
      },
    });
    const phoneEvents = (): HarnessEvent[] => events.flatMap((event) =>
      event.type === "externalTurn.event" ? [event.event] : [],
    );
    await waitFor(
      () => phoneEvents().some((event) => event.type === "approval.requested"),
      "phone permission approval",
    );
    emit(0, {
      type: "control_cancel_request",
      request_id: "phone_permission",
    });
    await waitFor(
      () =>
        phoneEvents().some(
          (event) =>
            event.type === "approval.resolved" &&
            event.decision === "cancelled",
        ),
      "phone-cancelled approval",
    );

    const next = sendClaudeTurn({
      ...input((event) => events.push(event)),
      text: "MonoCode follow-up",
      attachments: [],
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(parse().filter((message) => message.type === "user")).toHaveLength(
      1,
    );
    const externalEvents = events.slice(eventOffset);
    expect(externalEvents).toContainEqual({
      type: "externalTurn.started",
      turnId: "phone-user-id",
      text: "phone message",
      nativeId: "phone-user-id",
    });
    expect(
      externalEvents.some(
        (event) =>
          event.type === "message.delta" ||
          event.type === "tool.started" ||
          event.type === "tool.updated" ||
          event.type === "usage" ||
          event.type === "turn.metrics",
      ),
    ).toBe(false);

    expect(phoneEvents().filter((event) => event.type === "message.delta")).toEqual([
      { type: "message.delta", text: "phone " }, { type: "message.delta", text: "reply" },
    ]);
    emit(0, { type: "result", subtype: "success", session_id: "sess_1" });
    await waitFor(
      () => parse().filter((message) => message.type === "user").length === 2,
      "MonoCode follow-up after the phone result",
    );
    expect(events.slice(eventOffset)).toContainEqual({
      type: "externalTurn.finished",
      turnId: "phone-user-id",
    });
    emit(0, { type: "result", subtype: "success", session_id: "sess_1" });
    await next;
  });

  it("cancel releases the waiting send but keeps retries behind phone work", async () => {
    setClaudeRemoteControlDesired("s1", true, "Phone-safe chat");
    const events: HarnessEvent[] = [];
    const first = sendClaudeTurn({
      ...input((event) => events.push(event)),
      text: "first local turn",
      attachments: [],
    });
    await waitFor(() => controlRequest("initialize") !== undefined, "initialize");
    const initialize = controlRequest("initialize");
    emit(0, { type: "system", subtype: "init", session_id: "sess_1" });
    respondControl(0, initialize?.request_id);
    await waitFor(
      () => controlRequest("remote_control") !== undefined,
      "Remote Control enable",
    );
    const remote = controlRequest("remote_control");
    respondControl(0, remote?.request_id, {
      session_url: "https://claude.ai/code/cancel-wait",
    });
    await waitFor(
      () => parse().filter((message) => message.type === "user").length === 1,
      "first local message",
    );
    emit(0, { type: "result", subtype: "success", session_id: "sess_1" });
    await first;

    emit(0, {
      type: "user",
      session_id: "sess_1",
      message: { role: "user", content: "phone turn" },
    });
    const cancelled = sendClaudeTurn({
      ...input((event) => events.push(event)),
      text: "cancel this queued local send",
      attachments: [],
    });
    await new Promise((resolve) => setTimeout(resolve, 15));
    await cancelClaudeTurn("s1");
    await cancelled;
    expect(parse().filter((message) => message.type === "user")).toHaveLength(1);

    const retry = sendClaudeTurn({
      ...input((event) => events.push(event)),
      text: "retry after phone turn",
      attachments: [],
    });
    await new Promise((resolve) => setTimeout(resolve, 15));
    expect(parse().filter((message) => message.type === "user")).toHaveLength(1);

    emit(0, { type: "result", subtype: "success", session_id: "sess_1" });
    await waitFor(
      () => parse().filter((message) => message.type === "user").length === 2,
      "retry user message after phone result",
    );
    emit(0, { type: "result", subtype: "success", session_id: "sess_1" });
    await retry;
  });

  it("stop releases the waiting send without writing to the stopped child", async () => {
    setClaudeRemoteControlDesired("s1", true, "Phone-safe chat");
    const events: HarnessEvent[] = [];
    const first = sendClaudeTurn({
      ...input((event) => events.push(event)),
      text: "first local turn",
      attachments: [],
    });
    await waitFor(() => controlRequest("initialize") !== undefined, "initialize");
    const initialize = controlRequest("initialize");
    emit(0, { type: "system", subtype: "init", session_id: "sess_1" });
    respondControl(0, initialize?.request_id);
    await waitFor(
      () => controlRequest("remote_control") !== undefined,
      "Remote Control enable",
    );
    const remote = controlRequest("remote_control");
    respondControl(0, remote?.request_id, {
      session_url: "https://claude.ai/code/stop-wait",
    });
    await waitFor(
      () => parse().filter((message) => message.type === "user").length === 1,
      "first local message",
    );
    emit(0, { type: "result", subtype: "success", session_id: "sess_1" });
    await first;

    emit(0, {
      type: "user",
      session_id: "sess_1",
      message: { role: "user", content: "phone turn" },
    });
    const waiting = sendClaudeTurn({
      ...input((event) => events.push(event)),
      text: "must not write to stopped process",
      attachments: [],
    });
    await new Promise((resolve) => setTimeout(resolve, 15));
    await stopClaudeSession("s1");
    await waiting;
    expect(parse().filter((message) => message.type === "user")).toHaveLength(1);

    const retry = sendClaudeTurn({
      ...input((event) => events.push(event)),
      text: "retry on a new child",
      attachments: [],
    });
    await waitFor(
      () =>
        parse().filter(
          (message) =>
            (message.request as Record<string, unknown> | undefined)?.subtype ===
            "initialize",
        ).length === 2,
      "retry initialize",
    );
    const initializes = parse().filter(
      (message) =>
        (message.request as Record<string, unknown> | undefined)?.subtype ===
        "initialize",
    );
    emit(1, { type: "system", subtype: "init", session_id: "sess_1" });
    respondControl(1, initializes.at(-1)?.request_id);
    await waitFor(
      () =>
        parse().filter(
          (message) =>
            (message.request as Record<string, unknown> | undefined)?.subtype ===
            "remote_control",
        ).length === 2,
      "retry Remote Control enable",
    );
    const remotes = parse().filter(
      (message) =>
        (message.request as Record<string, unknown> | undefined)?.subtype ===
        "remote_control",
    );
    respondControl(1, remotes.at(-1)?.request_id, {
      session_url: "https://claude.ai/code/stop-retry",
    });
    await waitFor(
      () => parse().filter((message) => message.type === "user").length === 2,
      "retry user message",
    );
    expect(spawned).toHaveLength(2);
    emit(1, { type: "result", subtype: "success", session_id: "sess_1" });
    await retry;
  });
});
