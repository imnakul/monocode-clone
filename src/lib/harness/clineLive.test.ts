import { describe, expect, it, vi, beforeEach } from "vitest";

const sent: string[] = [];
let onLine: ((line: string) => void) | undefined;
let onExit: ((code: number | null) => void) | undefined;

vi.mock("./child", () => ({
  resolveClineBinary: async () => ({ path: "/fake/cline" }),
  spawnChild: async () => undefined,
  killChild: async () => undefined,
  unwatchChild: () => undefined,
  watchChild: (
    _id: string,
    line: (l: string) => void,
    exit: (c: number | null) => void,
  ) => {
    onLine = line;
    onExit = exit;
  },
  writeChild: async (_id: string, line: string) => {
    sent.push(line);
  },
}));

const { sendClineTurn, respondClineApproval, stopClineSession } =
  await import("./cline");
import type { HarnessEvent } from "./types";

function reply(id: number, result: unknown) {
  onLine!(JSON.stringify({ jsonrpc: "2.0", id, result }));
}
function notify(update: unknown) {
  onLine!(
    JSON.stringify({
      jsonrpc: "2.0",
      method: "session/update",
      params: { sessionId: "S1", update },
    }),
  );
}
const parse = () => sent.map((s) => JSON.parse(s));
const waitFor = async (pred: () => boolean, label: string) => {
  for (let i = 0; i < 200; i++) {
    if (pred()) return;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error(
    `timed out waiting for ${label}; sent=${JSON.stringify(parse().map((m) => m.method ?? `reply:${m.id}`))}`,
  );
};

const sessionNewResult = {
  sessionId: "S1",
  modes: {
    availableModes: [
      { id: "plan", name: "Plan" },
      { id: "act", name: "Act" },
    ],
    currentModeId: "act",
  },
  models: {
    availableModels: [
      { modelId: "anthropic/claude-sonnet-5", name: "Claude Sonnet 5" },
    ],
    currentModelId: "anthropic/claude-sonnet-5",
  },
  configOptions: [
    { id: "provider", category: "model", currentValue: "cline" },
    {
      id: "model",
      category: "model",
      currentValue: "anthropic/claude-sonnet-5",
    },
    { id: "mode", category: "mode", currentValue: "act" },
    { id: "auto_approve", category: "mode", currentValue: false },
  ],
};

async function handshake() {
  await waitFor(
    () => parse().some((m) => m.method === "initialize"),
    "initialize",
  );
  const initId = parse().find((m) => m.method === "initialize")!.id;
  reply(initId, { protocolVersion: 1 });
  await waitFor(
    () => parse().some((m) => m.method === "session/new"),
    "session/new",
  );
  reply(parse().find((m) => m.method === "session/new")!.id, sessionNewResult);
}

async function startSession() {
  await handshake();
  // Model already matches, so no set_config_option for it. Mode is already
  // act and auto_approve already false, so the turn goes straight to prompt.
  await waitFor(
    () => parse().some((m) => m.method === "session/prompt"),
    "prompt",
  );
}

describe("cline live turn sequence", () => {
  beforeEach(() => {
    sent.length = 0;
  });

  it("surfaces a permission request to the UI in supervised mode", async () => {
    const events: HarnessEvent[] = [];
    const input = {
      sessionId: "t1",
      cwd: "/repo",
      model: "cline:anthropic/claude-sonnet-5",
      modelSettings: {},
      runtimeMode: "supervised" as const,
      text: "list files",
      attachments: [],
      onEvent: (e: HarnessEvent) => events.push(e),
    };

    const turn = sendClineTurn(input as never);
    await startSession();
    const promptId = parse().find((m) => m.method === "session/prompt")!.id;

    notify({
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text: "O" },
    });
    notify({
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text: "K" },
    });

    // The CLI numbers its own requests from 1.
    onLine!(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "session/request_permission",
        params: {
          sessionId: "S1",
          toolCall: {
            toolCallId: "call_a",
            title: "list_files",
            kind: "read",
            status: "pending",
          },
          options: [
            { optionId: "allow-once", name: "Allow once" },
            { optionId: "reject-once", name: "Reject" },
          ],
        },
      }),
    );

    await waitFor(
      () =>
        events.some((e) => e.type === "approval.requested" && e.requestId === 1),
      "approval.requested",
    );
    respondClineApproval("t1", 1, "allow");
    await waitFor(
      () => parse().some((m) => m.id === 1 && m.result),
      "permission response",
    );
    const response = parse().find((m) => m.id === 1 && m.result);
    expect(response.result.outcome).toEqual({
      outcome: "selected",
      optionId: "allow-once",
    });
    expect(
      events.some(
        (e) => e.type === "approval.resolved" && e.decision === "allow",
      ),
    ).toBe(true);

    reply(promptId, { stopReason: "end_turn" });
    await turn;
    expect(
      events.filter((e) => e.type === "message.delta").map((e) =>
        e.type === "message.delta" ? e.text : "",
      ).join(""),
    ).toBe("OK");
    expect(events.some((e) => e.type === "message.completed")).toBe(true);
    await stopClineSession("t1");
  });

  it("auto-allows in full-access without a UI round trip", async () => {
    const events: HarnessEvent[] = [];
    const turn = sendClineTurn({
      sessionId: "t2",
      cwd: "/repo",
      model: "cline:anthropic/claude-sonnet-5",
      modelSettings: {},
      runtimeMode: "full-access" as const,
      text: "run tests",
      attachments: [],
      onEvent: (e: HarnessEvent) => events.push(e),
    } as never);
    await handshake();
    // Full-access flips auto_approve on before the prompt goes out.
    await waitFor(
      () =>
        parse().some(
          (m) =>
            m.method === "session/set_config_option" &&
            m.params?.configId === "auto_approve",
        ),
      "auto_approve on",
    );
    reply(
      parse().find(
        (m) =>
          m.method === "session/set_config_option" &&
          m.params?.configId === "auto_approve",
      )!.id,
      {},
    );
    await waitFor(
      () => parse().some((m) => m.method === "session/prompt"),
      "prompt t2",
    );
    const promptId = parse().find((m) => m.method === "session/prompt")!.id;

    onLine!(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "session/request_permission",
        params: {
          sessionId: "S1",
          toolCall: {
            toolCallId: "call_b",
            title: "terminal.exec",
            kind: "execute",
            status: "pending",
          },
          options: [
            { optionId: "allow-once", name: "Allow once" },
            { optionId: "allow-always", name: "Allow always" },
            { optionId: "reject-once", name: "Reject" },
          ],
        },
      }),
    );

    await waitFor(
      () => parse().some((m) => m.id === 1 && m.result),
      "auto permission response",
    );
    const response = parse().find((m) => m.id === 1 && m.result);
    expect(response.result.outcome.optionId).toBe("allow-always");
    expect(
      events.some((e) => e.type === "approval.requested"),
      "full-access must never park a turn on an approval",
    ).toBe(false);

    reply(promptId, { stopReason: "end_turn" });
    await turn;
    await stopClineSession("t2");
  });

  it("routes a late exit to the current turn's listener, not turn 1's", async () => {
    const turn1Events: HarnessEvent[] = [];
    const turn2Events: HarnessEvent[] = [];
    const base = {
      sessionId: "t3",
      cwd: "/repo",
      model: "cline:anthropic/claude-sonnet-5",
      modelSettings: {},
      runtimeMode: "supervised" as const,
      attachments: [],
    };

    const turn1 = sendClineTurn({
      ...base,
      text: "hey",
      onEvent: (e: HarnessEvent) => turn1Events.push(e),
    } as never);
    await startSession();
    reply(parse().find((m) => m.method === "session/prompt")!.id, {
      stopReason: "end_turn",
    });
    await turn1;

    sent.length = 0;
    const turn2 = sendClineTurn({
      ...base,
      text: "again",
      onEvent: (e: HarnessEvent) => turn2Events.push(e),
    } as never);
    await waitFor(
      () => parse().some((m) => m.method === "session/prompt"),
      "prompt t2",
    );
    onExit!(1);
    await turn2.catch(() => undefined);

    expect(
      turn2Events.some((e) => e.type === "session.ended"),
      "session.ended must reach the turn that is actually running",
    ).toBe(true);
    expect(turn1Events.some((e) => e.type === "session.ended")).toBe(false);
    await stopClineSession("t3");
  });
});
