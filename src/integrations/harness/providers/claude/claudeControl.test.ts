import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sent: string[] = [];
const spawned: string[][] = [];
const children: Array<{
  onLine: (line: string) => void;
  onExit: (code?: number | null) => void;
}> = [];
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
    onLine: (line: string) => void,
    onExit: (code?: number | null) => void,
  ) => {
    children.push({ onLine, onExit });
  },
  writeChild,
}));

const {
  ClaudeControlError,
  requestClaudeControl,
  respondClaudeApproval,
  sendClaudeTurn,
  stopClaudeSession,
  __claudeTestReset,
} = await import("./claude");
import type { HarnessEvent } from "../../core/types";

function parse(): Record<string, unknown>[] {
  return sent.map((line) => JSON.parse(line) as Record<string, unknown>);
}

function emit(
  childIndex: number,
  record: Record<string, unknown>,
): void {
  children[childIndex]?.onLine(JSON.stringify(record));
}

const waitFor = async (predicate: () => boolean, label: string): Promise<void> => {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`timed out waiting for ${label}; sent=${JSON.stringify(parse())}`);
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
    () => parse().some((message) => {
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
    () => parse().filter((message) => message.type === "user").length > userCount,
    "user prompt",
  );
  return { childIndex, events, turn };
}

async function finishTurn(turn: Promise<void>, childIndex = 0): Promise<void> {
  emit(childIndex, { type: "result", subtype: "success", session_id: "sess_1" });
  await turn;
}

function controlRequest(subtype: string): Record<string, unknown> | undefined {
  return parse().filter((message) => {
    const request = message.request as Record<string, unknown> | undefined;
    return request?.subtype === subtype;
  }).at(-1);
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
    await waitFor(() => parse().some((message) => message.type === "user"), "prompt");
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
          const response = message.response as Record<string, unknown> | undefined;
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
    const requestOnSecond = parse().filter((message) => {
      const request = message.request as Record<string, unknown> | undefined;
      return request?.subtype === "get_settings";
    }).at(-1);
    let settled = false;
    void latestRequest.then(() => { settled = true; });
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
