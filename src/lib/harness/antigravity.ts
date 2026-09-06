import { killChild, resolveAntigravityBinary, spawnChild, unwatchChild, watchChild } from "./child";
import { JsonRpcClient } from "./jsonRpc";
import { asRecord, eventsFromAcpUpdate } from "./clineProtocol";
import type { ApprovalDecision, HarnessEvent, SendTurnInput, SteerTurnInput } from "./types";

/** Versioned IDs deliberately cannot resume legacy headless conversations. */
export const ANTIGRAVITY_ACP_SESSION_PREFIX = "agy-acp:v1:";
const CONTROL_TIMEOUT_MS = 30_000;
type Live = { rpc: JsonRpcClient; cwd: string; nativeId: string; ready: Promise<void>; turns: Promise<void>; onEvent: (event: HarnessEvent) => void; cancelled: boolean };
const sessions = new Map<string, Live>();
const resumes = new Map<string, { id: string; cwd: string }>();
let resolveBinary = resolveAntigravityBinary;

/** Allows the host to supply its official runtime resolver. */
export function setAntigravityBinaryResolver(fn: () => Promise<{ path: string }>): void { resolveBinary = fn; }

export async function sendAntigravityTurn(input: SendTurnInput): Promise<void> {
  const live = sessions.get(input.sessionId) ?? createLive(input);
  live.turns = live.turns.catch((): void => {}).then(async (): Promise<void> => {
    await live.ready;
    live.onEvent = input.onEvent;
    await live.rpc.request("session/prompt", { sessionId: live.nativeId, prompt: [{ type: "text", text: input.text }] });
    live.onEvent({ type: "message.completed" }); live.onEvent({ type: "reasoning.completed" });
  });
  await live.turns;
}

function createLive(input: SendTurnInput): Live {
  const rpc = new JsonRpcClient(input.sessionId, { onNotification: (method, params): void => {
    if (method === "session/update") for (const event of eventsFromAcpUpdate(params)) live.onEvent(event);
  } }, { label: "antigravity-acp" });
  const live: Live = { rpc, cwd: input.cwd, nativeId: "", ready: Promise.resolve(), turns: Promise.resolve(), onEvent: input.onEvent, cancelled: false };
  sessions.set(input.sessionId, live);
  live.ready = (async (): Promise<void> => {
    const { path } = await resolveBinary();
    watchChild(input.sessionId, (line): void => rpc.pushLine(line), (code): void => rpc.close(new Error(`Antigravity exited (${code})`)), (): void => {});
    await spawnChild(input.sessionId, path, [], input.cwd);
    await rpc.request("initialize", { protocolVersion: 1, clientInfo: { name: "monocode", version: "1" }, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false } }, CONTROL_TIMEOUT_MS);
    await rpc.request("authenticate", { methodId: "oauth-personal" }, CONTROL_TIMEOUT_MS);
    const resume = resumes.get(input.sessionId);
    const result = asRecord(await rpc.request(resume ? "session/resume" : "session/new", { cwd: input.cwd, mcpServers: [], ...(resume ? { sessionId: resume.id } : {}) }, CONTROL_TIMEOUT_MS));
    const nativeId = resume?.id ?? result?.sessionId;
    if (typeof nativeId !== "string" || !nativeId) throw new Error("Antigravity returned no session ID");
    live.nativeId = nativeId;
    resumes.set(input.sessionId, { id: nativeId, cwd: input.cwd });
    live.onEvent({ type: "session.started" });
    live.onEvent({ type: "session.providerBound", providerSessionId: ANTIGRAVITY_ACP_SESSION_PREFIX + nativeId });
  })();
  return live;
}

export async function steerAntigravityTurn(_input: SteerTurnInput): Promise<void> { throw new Error("Cancel the Antigravity turn before sending another message."); }
export function respondAntigravityApproval(_sessionId: string, _requestId: number, _decision: ApprovalDecision): void {}
export async function cancelAntigravityTurn(sessionId: string): Promise<void> { await stopAntigravitySession(sessionId); }
export async function stopAntigravitySession(sessionId: string): Promise<void> {
  const live = sessions.get(sessionId); sessions.delete(sessionId); live?.rpc.close();
  unwatchChild(sessionId); await killChild(sessionId).catch((): void => {});
}
export async function forgetAntigravitySession(sessionId: string): Promise<void> { resumes.delete(sessionId); await stopAntigravitySession(sessionId); }
export function bindAntigravitySession(threadId: string, providerSessionId: string, cwd: string): void { resumes.set(threadId, { id: providerSessionId.slice(ANTIGRAVITY_ACP_SESSION_PREFIX.length), cwd }); }
