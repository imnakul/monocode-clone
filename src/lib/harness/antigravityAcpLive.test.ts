import { afterEach, describe, expect, it, vi } from "vitest";
import type { HarnessEvent, SendTurnInput } from "./types";
import { asRecord } from "./clineProtocol";

const boundary = vi.hoisted(() => ({
  stdout: (_line: string): void => {},
  stderr: (_line: string): void => {},
  exit: (_code: number | null): void => {},
  writes: [] as Record<string, unknown>[],
  spawn: vi.fn(async (): Promise<void> => {}),
  kill: vi.fn(async (): Promise<void> => {}),
}));
vi.mock("./child", () => ({
  resolveAntigravityBinary: async (): Promise<{ path: string }> => ({ path: "/fake/agy_acp_server" }),
  spawnChild: boundary.spawn,
  killChild: boundary.kill,
  unwatchChild: (): void => {},
  watchChild: (_id: string, stdout: (line: string) => void, exit: (code: number | null) => void, stderr: (line: string) => void): void => {
    boundary.stdout = stdout; boundary.stderr = stderr; boundary.exit = exit;
  },
  writeChild: async (_id: string, line: string): Promise<void> => {
    const message = asRecord(JSON.parse(line));
    if (message) boundary.writes.push(message);
  },
}));
vi.mock("../fs", () => ({ homeDir: async (): Promise<string> => "/home/test" }));
const agy = await import("./antigravity");
const host = await import("./antigravityRuntimeHost");
const events: HarnessEvent[] = [];
const input: SendTurnInput = { sessionId: "test-agy", cwd: "/workspace", model: "antigravity:default", runtimeMode: "supervised", text: "Hello", onEvent: (event): void => { events.push(event); } };
const configOptions = [
  { id: "model", type: "select", currentValue: "gemini", options: [{ value: "gemini", name: "Gemini" }, { value: "claude", name: "Claude" }] },
  { id: "mode", type: "select", currentValue: "default", options: [{ value: "default", name: "Ask" }, { value: "auto_edit", name: "Edit" }, { value: "yolo", name: "Full" }] },
];
function reply(id: unknown, result: unknown): void { boundary.stdout(JSON.stringify({ jsonrpc: "2.0", id, result })); }
async function request(method: string, count = 1): Promise<Record<string, unknown>> {
  await vi.waitFor((): void => { expect(boundary.writes.filter((m) => m.method === method)).toHaveLength(count); });
  const message = boundary.writes.filter((m) => m.method === method)[count - 1];
  if (!message) throw new Error(`Missing ${method}`);
  return message;
}
let hostUp = false;
async function hostHandshake(): Promise<void> {
  const init = await request("initialize");
  expect(init.params).toMatchObject({ protocolVersion: 1, clientCapabilities: { terminal: false } });
  reply(init.id, { protocolVersion: 1, agentCapabilities: { sessionCapabilities: { resume: {} }, promptCapabilities: { image: true, audio: true, embeddedContext: true } }, authMethods: [{ id: "oauth-personal", name: "Google" }] });
  const auth = await request("authenticate");
  expect(auth.params).toEqual({ methodId: "oauth-personal" }); reply(auth.id, {});
  hostUp = true;
}
/** The shared runtime initializes and authenticates once; each session only
 * opens a native session on top of it. */
async function openSession(resume = false): Promise<void> {
  if (!hostUp) await hostHandshake();
  const session = await request(resume ? "session/resume" : "session/new");
  expect(session.params).toEqual({ cwd: "/workspace", mcpServers: [], ...(resume ? { sessionId: "S1" } : {}) });
  reply(session.id, { ...(resume ? {} : { sessionId: "S1" }), configOptions });
}
afterEach(async (): Promise<void> => {
  await agy.forgetAntigravitySession(input.sessionId);
  await host.retireAntigravityRuntime();
  hostUp = false;
  boundary.writes.length = 0; events.length = 0; vi.clearAllMocks();
});
describe("official Antigravity ACP child boundary", (): void => {
  // Catches local approval IDs being mistaken for opaque provider request/option IDs.
  it("routes string-ID approvals and native reasoning/tool updates without losing the option ID", async (): Promise<void> => {
    const turn = agy.sendAntigravityTurn(input); await openSession(); const prompt = await request("session/prompt");
    boundary.stdout(JSON.stringify({ method: "session/update", params: { sessionId: "S1", update: { sessionUpdate: "agent_thought_chunk", content: { type: "text", text: "Considering" } } } }));
    boundary.stdout(JSON.stringify({ method: "session/update", params: { sessionId: "S1", update: { sessionUpdate: "tool_call", toolCallId: "cmd", kind: "execute", title: "Run", status: "in_progress", rawInput: { CommandLine: "echo test" } } } }));
    boundary.stdout(JSON.stringify({ id: "approval-opaque", method: "session/request_permission", params: { sessionId: "S1", toolCall: { toolCallId: "cmd", title: "Run command?", kind: "execute" }, options: [{ optionId: "opaque-yes", kind: "allow_once", name: "Allow" }, { optionId: "opaque-no", kind: "reject_once", name: "Deny" }] } }));
    await vi.waitFor((): void => { expect(events.some((e) => e.type === "approval.requested")).toBe(true); });
    const approval = events.find((e) => e.type === "approval.requested"); if (approval?.type !== "approval.requested") throw new Error("Missing approval");
    agy.respondAntigravityApproval(input.sessionId, approval.requestId, "allow");
    await vi.waitFor((): void => { expect(boundary.writes).toContainEqual({ jsonrpc: "2.0", id: "approval-opaque", result: { outcome: { outcome: "selected", optionId: "opaque-yes" } } }); });
    expect(events).toContainEqual({ type: "reasoning.delta", text: "Considering" });
    expect(events).toContainEqual(expect.objectContaining({ type: "tool.updated", callId: "cmd", title: expect.stringContaining("echo test") }));
    reply(prompt.id, { stopReason: "end_turn" }); await turn;
  });
  it("selects the advertised model and permission mode via config options", async (): Promise<void> => {
    const turn = agy.sendAntigravityTurn({ ...input, model: "antigravity:claude", runtimeMode: "auto-accept-edits" }); await openSession();
    const model = await request("session/set_config_option"); expect(model.params).toEqual({ sessionId: "S1", configId: "model", value: "claude" });
    reply(model.id, { configOptions: configOptions.map((o) => o.id === "model" ? { ...o, currentValue: "claude" } : o) });
    const mode = await request("session/set_config_option", 2); expect(mode.params).toEqual({ sessionId: "S1", configId: "mode", value: "auto_edit" });
    reply(mode.id, { configOptions: configOptions.map((o) => ({ ...o, currentValue: o.id === "model" ? "claude" : "auto_edit" })) });
    const prompt = await request("session/prompt"); reply(prompt.id, { stopReason: "end_turn" }); await turn;
  });
  it("rejects legacy IDs before spawning and never creates a replacement after failed resume", async (): Promise<void> => {
    agy.bindAntigravitySession(input.sessionId, "old-cli-id", input.cwd);
    const legacy = agy.sendAntigravityTurn(input); const rejected = expect(legacy).rejects.toThrow(/new chat/i);
    await rejected; expect(boundary.spawn).not.toHaveBeenCalled();
    agy.bindAntigravitySession(input.sessionId, "agy-acp:v1:S1", input.cwd);
    const resumed = agy.sendAntigravityTurn(input); const failed = expect(resumed).rejects.toThrow(/resume denied/);
    const init = await request("initialize"); reply(init.id, { protocolVersion: 1, agentCapabilities: { sessionCapabilities: { resume: {} } } });
    const auth = await request("authenticate"); reply(auth.id, {});
    const resume = await request("session/resume"); boundary.stdout(JSON.stringify({ id: resume.id, error: { code: -32000, message: "resume denied" } }));
    await failed; expect(boundary.writes.some((m) => m.method === "session/new")).toBe(false);
    // A denied resume is a session-level refusal, not process corruption: the
    // shared runtime stays up for the other sessions.
    expect(boundary.kill).not.toHaveBeenCalled();
  });
  it("surfaces rate limits once without retrying a prompt", async (): Promise<void> => {
    const turn = agy.sendAntigravityTurn(input); const failed = expect(turn).rejects.toThrow("Quota exhausted"); await openSession();
    const prompt = await request("session/prompt"); boundary.stdout(JSON.stringify({ id: prompt.id, error: { code: 429, message: "Quota exhausted" } }));
    await failed; expect(events.filter((e) => e.type === "session.error")).toEqual([{ type: "session.error", message: "Quota exhausted" }]);
    expect(boundary.writes.filter((m) => m.method === "session/prompt")).toHaveLength(1);
  });
  it("waits for the prompt acknowledgement after cancellation", async (): Promise<void> => {
    const turn = agy.sendAntigravityTurn(input); await openSession(); const prompt = await request("session/prompt");
    const cancelled = agy.cancelAntigravityTurn(input.sessionId); await request("session/cancel"); expect(boundary.kill).not.toHaveBeenCalled();
    reply(prompt.id, { stopReason: "cancelled" }); await cancelled; await turn;
    expect(events.filter((e) => e.type === "message.completed")).toHaveLength(1);
  });
  it("rejects unsupported attachments before sending a text-only substitute", async (): Promise<void> => {
    const turn = agy.sendAntigravityTurn({ ...input, attachments: [{ id: "a", name: "a.zip", kind: "file", size: 2, mimeType: "application/zip", data: "e30=" }] });
    const failed = expect(turn).rejects.toThrow(/does not support/); await openSession(); await failed;
    expect(boundary.writes.some((m) => m.method === "session/prompt")).toBe(false);
  });
  // Catches accidentally retaining CLI flags, respawning per session, or using session/load.
  it("keeps two turns on one ACP process and resumes the tagged session after parking", async (): Promise<void> => {
    const first = agy.sendAntigravityTurn(input);
    await openSession(); const p1 = await request("session/prompt"); reply(p1.id, { stopReason: "end_turn" }); await first;
    expect(boundary.spawn).toHaveBeenCalledWith(host.ANTIGRAVITY_RUNTIME_SESSION_ID, "/fake/agy_acp_server", [], "/home/test");
    expect(events).toContainEqual({ type: "session.providerBound", providerSessionId: "agy-acp:v1:S1" });
    const second = agy.sendAntigravityTurn({ ...input, text: "Next" });
    const p2 = await request("session/prompt", 2); expect(p2.params).toEqual({ sessionId: "S1", prompt: [{ type: "text", text: "Next" }] });
    reply(p2.id, { stopReason: "end_turn" }); await second; expect(boundary.spawn).toHaveBeenCalledTimes(1);
    await agy.stopAntigravitySession(input.sessionId); boundary.writes.length = 0;
    const third = agy.sendAntigravityTurn(input); await openSession(true);
    const p3 = await request("session/prompt"); reply(p3.id, { stopReason: "end_turn" }); await third;
    expect(boundary.writes.some((m) => m.method === "session/new" || m.method === "session/load")).toBe(false);
  });
  it("answers a deny decision with the reject-kind option instead of trusting ID spelling", async (): Promise<void> => {
    const turn = agy.sendAntigravityTurn(input); await openSession(); const prompt = await request("session/prompt");
    boundary.stdout(JSON.stringify({ id: "deny-native", method: "session/request_permission", params: { sessionId: "S1", toolCall: { toolCallId: "cmd2", title: "Run?", kind: "execute" }, options: [{ optionId: "opaque-yes", kind: "allow_once", name: "Allow" }, { optionId: "opaque-no", kind: "reject_once", name: "Deny" }] } }));
    await vi.waitFor((): void => { expect(events.some((e) => e.type === "approval.requested")).toBe(true); });
    const approval = events.find((e) => e.type === "approval.requested"); if (approval?.type !== "approval.requested") throw new Error("Missing approval");
    agy.respondAntigravityApproval(input.sessionId, approval.requestId, "deny");
    await vi.waitFor((): void => { expect(boundary.writes).toContainEqual({ jsonrpc: "2.0", id: "deny-native", result: { outcome: { outcome: "selected", optionId: "opaque-no" } } }); });
    reply(prompt.id, { stopReason: "end_turn" }); await turn;
  });
  // Native fixed-choice questions share the permission method but are never approvals.
  it("asks interaction questions verbatim and answers only with an offered option", async (): Promise<void> => {
    const turn = agy.sendAntigravityTurn(input); await openSession(); const prompt = await request("session/prompt");
    boundary.stdout(JSON.stringify({ id: "q-native", method: "session/request_permission", params: { sessionId: "S1", toolCall: { toolCallId: "interaction_7", title: "Which database?" }, options: [{ optionId: "opt-sqlite", name: "SQLite", kind: "allow_once" }, { optionId: "opt-postgres", name: "Postgres", kind: "reject_once" }] } }));
    await vi.waitFor((): void => { expect(events.some((e) => e.type === "question.asked")).toBe(true); });
    expect(events.some((e) => e.type === "approval.requested")).toBe(false);
    const asked = events.find((e) => e.type === "question.asked"); if (asked?.type !== "question.asked") throw new Error("Missing question");
    expect(asked.questions[0]).toMatchObject({ id: "interaction_7", prompt: "Which database?", multiSelect: false, allowCustom: false });
    agy.respondAntigravityQuestion(input.sessionId, asked.requestId, { kind: "answered", answers: { interaction_7: ["opt-postgres"] } });
    await vi.waitFor((): void => { expect(boundary.writes).toContainEqual({ jsonrpc: "2.0", id: "q-native", result: { outcome: { outcome: "selected", optionId: "opt-postgres" } } }); });
    expect(events).toContainEqual({ type: "question.resolved", requestId: asked.requestId, decision: "answered" });
    reply(prompt.id, { stopReason: "end_turn" }); await turn;
  });
  it("keeps the question open for a non-offered answer and reports skipped as cancelled", async (): Promise<void> => {
    const turn = agy.sendAntigravityTurn(input); await openSession(); const prompt = await request("session/prompt");
    boundary.stdout(JSON.stringify({ id: "q2-fixed", method: "session/request_permission", params: { sessionId: "S1", toolCall: { toolCallId: "interaction_8", title: "Pick" }, options: [{ optionId: "a", name: "A", kind: "allow_once" }] } }));
    await vi.waitFor((): void => { expect(events.filter((e) => e.type === "question.asked")).toHaveLength(1); });
    const first = events.find((e) => e.type === "question.asked"); if (first?.type !== "question.asked") throw new Error("Missing question");
    agy.respondAntigravityQuestion(input.sessionId, first.requestId, { kind: "answered", answers: { interaction_8: ["not-offered"] } });
    await new Promise((resolve) => setTimeout(resolve, 10));
    // A non-offered answer must keep the question open — no response at all.
    expect(boundary.writes.some((m) => m.id === "q2-fixed")).toBe(false);
    agy.respondAntigravityQuestion(input.sessionId, first.requestId, { kind: "skipped" });
    await vi.waitFor((): void => { expect(boundary.writes).toContainEqual({ jsonrpc: "2.0", id: "q2-fixed", result: { outcome: { outcome: "cancelled" } } }); });
    expect(events).toContainEqual({ type: "question.resolved", requestId: first.requestId, decision: "skipped" });
    reply(prompt.id, { stopReason: "end_turn" }); await turn;
  });
  it("drops session updates that belong to a different native session", async (): Promise<void> => {
    const turn = agy.sendAntigravityTurn(input); await openSession(); const prompt = await request("session/prompt");
    boundary.stdout(JSON.stringify({ method: "session/update", params: { sessionId: "OTHER", update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "foreign" } } } }));
    boundary.stdout(JSON.stringify({ method: "session/update", params: { sessionId: "S1", update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "mine" } } } }));
    await vi.waitFor((): void => { expect(events.some((e) => e.type === "message.delta" && (e as { text: string }).text === "mine")).toBe(true); });
    expect(events.some((e) => e.type === "message.delta" && (e as { text: string }).text === "foreign")).toBe(false);
    reply(prompt.id, { stopReason: "end_turn" }); await turn;
  });
  it("reports process death and resumes the same native session on the next turn", async (): Promise<void> => {
    const first = agy.sendAntigravityTurn(input); await openSession(); const p1 = await request("session/prompt"); reply(p1.id, { stopReason: "end_turn" }); await first;
    boundary.exit(3);
    hostUp = false;
    await vi.waitFor((): void => { expect(events.some((e) => e.type === "session.ended")).toBe(true); });
    boundary.writes.length = 0;
    const second = agy.sendAntigravityTurn({ ...input, text: "after crash" });
    await openSession(true);
    const p2 = await request("session/prompt"); expect(p2.params).toEqual({ sessionId: "S1", prompt: [{ type: "text", text: "after crash" }] });
    reply(p2.id, { stopReason: "end_turn" }); await second;
    expect(boundary.spawn).toHaveBeenCalledTimes(2);
    expect(boundary.writes.some((m) => m.method === "session/new")).toBe(false);
  });
  it("refuses an unavailable saved model instead of silently running another", async (): Promise<void> => {
    const turn = agy.sendAntigravityTurn({ ...input, model: "antigravity:not-offered" });
    await openSession();
    await expect(turn).rejects.toThrow(/unavailable/);
    expect(boundary.writes.some((m) => m.method === "session/prompt")).toBe(false);
    expect(boundary.writes.some((m) => m.method === "session/set_config_option")).toBe(false);
  });

  // Regression (review #1): a Stop pressed during startup aborts that turn,
  // never sends the prompt, and never swallows the next independent message.
  it("aborts a cancelled startup without sending the prompt or dropping the next turn", async (): Promise<void> => {
    const first = agy.sendAntigravityTurn(input);
    await request("initialize");
    await agy.cancelAntigravityTurn(input.sessionId);
    await hostHandshake();
    await expect(first).rejects.toThrow(/cancelled/i);
    expect(boundary.writes.some((m) => m.method === "session/new")).toBe(false);
    expect(boundary.writes.some((m) => m.method === "session/prompt")).toBe(false);
    const second = agy.sendAntigravityTurn({ ...input, text: "still here?" });
    await openSession();
    const p = await request("session/prompt");
    reply(p.id, { stopReason: "end_turn" });
    await second;
    expect(boundary.writes.filter((m) => m.method === "session/prompt")).toHaveLength(1);
  });

  // Regression (review round 2 #1): a message sent right after Stop during
  // another turn's startup must be delivered exactly once with a valid
  // session id - never into a half-ready session.
  it("delivers a message sent during a cancelled startup exactly once", async (): Promise<void> => {
    const first = agy.sendAntigravityTurn(input);
    const cancelled = expect(first).rejects.toThrow(/cancelled/i);
    await request("initialize");
    await agy.cancelAntigravityTurn(input.sessionId);
    const second = agy.sendAntigravityTurn({ ...input, text: "Try again" });
    await hostHandshake();
    const session = await request("session/new");
    reply(session.id, { sessionId: "S1", configOptions });
    await cancelled;
    const prompt = await request("session/prompt");
    expect(prompt.params).toEqual({ sessionId: "S1", prompt: [{ type: "text", text: "Try again" }] });
    expect(boundary.writes.filter((m) => m.method === "session/prompt")).toHaveLength(1);
    reply(prompt.id, { stopReason: "end_turn" });
    await second;
  });

  // A cancelled startup must not detach the session a waiting retry will use.
  // Hold session/new (not initialize) to exercise the handover boundary.
  it("preserves retry streaming and approvals when Stop interrupts session creation", async (): Promise<void> => {
    const first = agy.sendAntigravityTurn(input);
    const cancelled = expect(first).rejects.toThrow(/cancelled/i);
    await hostHandshake();
    const session = await request("session/new");
    await agy.cancelAntigravityTurn(input.sessionId);
    const second = agy.sendAntigravityTurn({ ...input, text: "Try again" });
    reply(session.id, { sessionId: "S1", configOptions });
    await cancelled;
    const prompt = await request("session/prompt");
    expect(prompt.params).toEqual({ sessionId: "S1", prompt: [{ type: "text", text: "Try again" }] });
    boundary.stdout(JSON.stringify({ method: "session/update", params: { sessionId: "S1", update: { sessionUpdate: "agent_thought_chunk", content: { type: "text", text: "Retry reasoning" } } } }));
    boundary.stdout(JSON.stringify({ id: "retry-approval", method: "session/request_permission", params: { sessionId: "S1", toolCall: { toolCallId: "retry-command", title: "Run retry?", kind: "execute" }, options: [{ optionId: "retry-allow", kind: "allow_once", name: "Allow" }] } }));
    // Settle the native request even if a later routing assertion fails.
    reply(prompt.id, { stopReason: "end_turn" });
    await second;
    expect(events).toContainEqual({ type: "reasoning.delta", text: "Retry reasoning" });
    const approval = events.find((event) => event.type === "approval.requested");
    if (approval?.type !== "approval.requested") throw new Error("Missing retry approval");
    agy.respondAntigravityApproval(input.sessionId, approval.requestId, "allow");
    await vi.waitFor((): void => {
      expect(boundary.writes).toContainEqual({ jsonrpc: "2.0", id: "retry-approval", result: { outcome: { outcome: "selected", optionId: "retry-allow" } } });
    });
    expect(boundary.writes.filter((message) => message.method === "session/prompt")).toHaveLength(1);
    expect(boundary.writes.filter((message) => message.method === "session/new")).toHaveLength(1);
  });

  // Regression (review #2): deleting a chat mid-prompt must bound the agent —
  // native cancel with the grace, then retire a runtime that ignores it.
  it("bounds disposal when a chat is forgotten during an active prompt", async (): Promise<void> => {
    const turn = agy.sendAntigravityTurn(input);
    await openSession();
    const prompt = await request("session/prompt");
    const failed = expect(turn).rejects.toThrow();
    vi.useFakeTimers();
    try {
      const forgotten = agy.forgetAntigravitySession(input.sessionId);
      await vi.advanceTimersByTimeAsync(0);
      await request("session/cancel");
      await vi.advanceTimersByTimeAsync(15_000);
      await forgotten;
      expect(boundary.kill).toHaveBeenCalled();
      expect(boundary.writes.some((m) => m.id === prompt.id && m.result)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
    await failed;
  });

  // Regression (review #3): agent-side mode changes must refresh the cached
  // config so the next turn reconciles instead of trusting stale state.
  it("reconciles agent-originated config changes before the next turn", async (): Promise<void> => {
    const first = agy.sendAntigravityTurn(input);
    await openSession();
    const p1 = await request("session/prompt"); reply(p1.id, { stopReason: "end_turn" }); await first;
    boundary.writes.length = 0;
    boundary.stdout(JSON.stringify({ method: "session/update", params: { sessionId: "S1", update: { sessionUpdate: "config_option_update", configOptions: [
      { id: "mode", type: "select", currentValue: "yolo", options: [{ value: "default", name: "Ask" }, { value: "auto_edit", name: "Edit" }, { value: "yolo", name: "Full" }] },
      { id: "model", type: "select", currentValue: "gemini", options: [] },
    ] } } }));
    const second = agy.sendAntigravityTurn(input);
    const mode = await request("session/set_config_option");
    expect(mode.params).toEqual({ sessionId: "S1", configId: "mode", value: "default" });
    reply(mode.id, { configOptions: [{ id: "mode", type: "select", currentValue: "default", options: [] }] });
    const p2 = await request("session/prompt");
    reply(p2.id, { stopReason: "end_turn" });
    await second;
    expect(boundary.writes.filter((m) => m.method === "session/set_config_option")).toHaveLength(1);
  });

  // The context meter is fed by the runtime's backend usage logs on stderr.
  it("maps runtime usage frames onto the context meter", async (): Promise<void> => {
    const turn = agy.sendAntigravityTurn(input);
    await openSession();
    const prompt = await request("session/prompt");
    boundary.stderr('I0906 06:19:02.153780 42176 local_connection.py:521] RAW WS MSG: {"usageUpdate":{"agents":[{"trajectoryId":"S1","usage":{"promptTokenCount":"11597","cachedContentTokenCount":"0","candidatesTokenCount":"1","thoughtsTokenCount":"25","totalTokenCount":"11623"}}]},"seqNum":"7"}');
    await vi.waitFor((): void => {
      expect(events.some((e) => e.type === "context" && (e as { used?: number }).used === 11623)).toBe(true);
    });
    reply(prompt.id, { stopReason: "end_turn" }); await turn;
  });

  // Regression (review #5): selecting a different binary must restart the
  // shared runtime so Settings and execution agree.
  it("restarts the shared runtime when the resolved binary changes", async (): Promise<void> => {
    // acquire resolves only after initialize + authenticate, so each new
    // runtime's handshake must be driven before its promise settles.
    const first = host.acquireAntigravityRuntime(async (): Promise<{ path: string }> => ({ path: "/fake/agy_acp_server" }));
    await hostHandshake();
    const runtime1 = await first;
    const second = host.acquireAntigravityRuntime(async (): Promise<{ path: string }> => ({ path: "/fake/agy_acp_server_v2" }));
    const init = await request("initialize", 2);
    reply(init.id, { protocolVersion: 1, agentCapabilities: { sessionCapabilities: { resume: {} } } });
    const auth = await request("authenticate");
    reply(auth.id, {});
    const restarted = await second;
    expect(restarted).not.toBe(runtime1);
    expect(restarted.executablePath).toBe("/fake/agy_acp_server_v2");
    expect(boundary.spawn).toHaveBeenCalledTimes(2);
    expect(boundary.spawn).toHaveBeenLastCalledWith(host.ANTIGRAVITY_RUNTIME_SESSION_ID, "/fake/agy_acp_server_v2", [], "/home/test");
    expect(boundary.kill).toHaveBeenCalled();
    await host.retireAntigravityRuntime();
  });
});
