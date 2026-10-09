import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  sent: [] as string[],
  onLine: null as ((line: string) => void) | null,
  writeChild: vi.fn(async (_id: string, line: string) => {
    state.sent.push(line);
  }),
}));
const prepareMono = vi.hoisted(() =>
  vi.fn(async () => ({ config: { sqlite_home: "/private/mono" }, hasThread: false })),
);

vi.mock("./codexStore", () => ({ prepareCodexMonoContext: prepareMono }));

vi.mock("../../core/child", () => ({
  resolveCodexBinary: async () => ({ path: "/fake/codex" }),
  spawnChild: async () => undefined,
  killChild: async () => undefined,
  unwatchChild: () => undefined,
  watchChild: (_id: string, line: (value: string) => void) => {
    state.onLine = line;
  },
  writeChild: state.writeChild,
}));

import { HelperToolAttemptError } from "../../core/helperIsolation";
import { COMMIT_OUTPUT_SCHEMA } from "../../core/helperSchemas";
import { runCodexTextPrompt, stopCodexTextPrompt } from "./codexText";

function parseSent(): Record<string, unknown>[] {
  return state.sent.map((line) => JSON.parse(line) as Record<string, unknown>);
}

function reply(id: number, result: unknown): void {
  state.onLine?.(JSON.stringify({ id, result }));
}

function sendNotification(method: string, params: unknown): void {
  state.onLine?.(JSON.stringify({ method, params }));
}

async function waitFor(predicate: () => boolean, label: string): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  throw new Error("Timed out waiting for " + label + ".");
}

async function startHelper(
  options: { ephemeral?: boolean; codexStore?: "mono" } = {},
): Promise<{ prompt: Promise<string> }> {
  const prompt = runCodexTextPrompt({
    helperOnly: true,
    cwd: "/repo",
    model: "gpt-5.4",
    prompt: "Return a structured commit message.",
    outputSchema: COMMIT_OUTPUT_SCHEMA,
    timeoutMs: 5_000,
    ...options,
  });
  await waitFor(
    () => parseSent().some((message) => message.method === "initialize"),
    "initialize",
  );
  const initialize = parseSent().find(
    (message) => message.method === "initialize",
  )!;
  reply(initialize.id as number, {});
  await waitFor(
    () => parseSent().some((message) => message.method === "thread/start"),
    "ephemeral thread",
  );
  const threadStart = parseSent().find(
    (message) => message.method === "thread/start",
  )!;
  expect(threadStart.params).toMatchObject({
    cwd: "/repo",
    ephemeral: true,
    approvalPolicy: "untrusted",
    sandbox: "read-only",
  });
  reply(threadStart.id as number, { thread: { id: "helper-thread" } });
  await waitFor(
    () => parseSent().some((message) => message.method === "turn/start"),
    "helper turn",
  );
  const turnStart = parseSent().find(
    (message) => message.method === "turn/start",
  )!;
  expect(turnStart.params).toMatchObject({
    model: "gpt-5.4",
    outputSchema: COMMIT_OUTPUT_SCHEMA,
  });
  reply(turnStart.id as number, { turn: { id: "helper-turn" } });
  await waitFor(
    () => parseSent().some((message) => message.method === "turn/start"),
    "turn response",
  );
  return { prompt };
}

beforeEach(() => {
  state.sent.length = 0;
  state.onLine = null;
  state.writeChild.mockClear();
  prepareMono.mockClear();
});

afterEach(async () => {
  await stopCodexTextPrompt();
});

describe("Codex isolated helper runner", () => {
  it("declines an MCP elicitation before interrupting the turn", async () => {
    const { prompt } = await startHelper();
    state.onLine?.(
      JSON.stringify({
        id: 90,
        method: "mcpServer/elicitation/request",
        params: { message: "Can I use a tool?" },
      }),
    );

    await waitFor(
      () =>
        parseSent().some(
          (message) =>
            message.id === 90 &&
            (message.result as Record<string, unknown> | undefined)?.action ===
              "decline",
        ),
      "MCP decline response",
    );
    await expect(prompt).rejects.toBeInstanceOf(HelperToolAttemptError);
    expect(
      parseSent().some((message) => message.method === "turn/interrupt"),
    ).toBe(true);
  });

  it.each([
    "item/commandExecution/requestApproval",
    "item/fileChange/requestApproval",
  ])("declines %s before interrupting the turn", async (method) => {
    const { prompt } = await startHelper();
    state.onLine?.(
      JSON.stringify({ id: 91, method, params: { threadId: "helper-thread" } }),
    );
    await waitFor(
      () =>
        parseSent().some(
          (message) => message.id === 91 && message.result !== undefined,
        ),
      "approval decline response",
    );

    expect(parseSent().find((message) => message.id === 91)?.result).toEqual({
      decision: "decline",
    });
    await expect(prompt).rejects.toBeInstanceOf(HelperToolAttemptError);
    expect(
      parseSent().some((message) => message.method === "turn/interrupt"),
    ).toBe(true);
  });

  it.each([
    "mcpToolCall",
    "commandExecution",
    "fileChange",
    "webSearch",
    "unknown",
  ])("stops an item/started tool attempt of type %s", async (itemType) => {
    const { prompt } = await startHelper();
    sendNotification("item/started", {
      item: { id: "tool-1", type: itemType },
    });

    await expect(prompt).rejects.toBeInstanceOf(HelperToolAttemptError);
    expect(
      parseSent().some((message) => message.method === "turn/interrupt"),
    ).toBe(true);
  });

  it("allows agent messages and reasoning items and returns the streamed text", async () => {
    const { prompt } = await startHelper();
    sendNotification("item/started", {
      item: { id: "message-1", type: "agentMessage" },
    });
    sendNotification("item/started", {
      item: { id: "reasoning-1", type: "reasoning" },
    });
    sendNotification("item/agentMessage/delta", { delta: "hello" });
    sendNotification("turn/completed", {
      turn: { id: "helper-turn", status: "completed" },
    });

    await expect(prompt).resolves.toBe("hello");
    expect(
      parseSent().some((message) => message.method === "turn/interrupt"),
    ).toBe(false);
  });

  it("keeps helper prompts ephemeral and outside the Mono store despite caller flags", async () => {
    const { prompt } = await startHelper({
      ephemeral: false,
      codexStore: "mono",
    });
    const start = parseSent().find((message) => message.method === "thread/start");
    expect(start?.params).toMatchObject({
      ephemeral: true,
      approvalPolicy: "untrusted",
      sandbox: "read-only",
    });
    expect(prepareMono).not.toHaveBeenCalled();
    sendNotification("item/agentMessage/delta", { delta: "private helper" });
    sendNotification("turn/completed", {
      turn: { id: "helper-turn", status: "completed" },
    });
    await expect(prompt).resolves.toBe("private helper");
  });
});

describe("Codex by-the-way runner", () => {
  it("resumes a BTW thread and reports tool activity without helper isolation", async () => {
    const events: import("../../core/types").HarnessEvent[] = [];
    const onThreadId = vi.fn();
    const prompt = runCodexTextPrompt({
      cwd: "/repo",
      model: "gpt-5.4",
      threadId: "btw-thread",
      ephemeral: false,
      onThreadId,
      prompt: "Explain the code",
      onEvent: (event) => events.push(event),
    });
    await waitFor(
      () => parseSent().some((m) => m.method === "initialize"),
      "init",
    );
    reply(parseSent().find((m) => m.method === "initialize")!.id as number, {});
    await waitFor(
      () => parseSent().some((m) => m.method === "thread/resume"),
      "resume",
    );
    const resume = parseSent().find((m) => m.method === "thread/resume")!;
    expect(resume.params).toMatchObject({ threadId: "btw-thread" });
    expect(resume.params).not.toHaveProperty("ephemeral");
    reply(resume.id as number, { thread: { id: "btw-thread" } });
    await waitFor(
      () => parseSent().some((m) => m.method === "turn/start"),
      "turn",
    );
    reply(parseSent().find((m) => m.method === "turn/start")!.id as number, {
      turn: { id: "btw-turn" },
    });
    await Promise.resolve();
    sendNotification("item/started", {
      item: {
        id: "read-1",
        type: "commandExecution",
        command: "pwd",
        status: "inProgress",
      },
    });
    sendNotification("item/agentMessage/delta", {
      itemId: "message-1",
      delta: "Explanation",
    });
    sendNotification("turn/completed", {
      turn: { id: "btw-turn", status: "completed" },
    });
    await expect(prompt).resolves.toBe("Explanation");
    expect(onThreadId).toHaveBeenCalledWith("btw-thread");
    expect(events).toContainEqual(
      expect.objectContaining({ type: "tool.started", callId: "read-1" }),
    );
  });
});
