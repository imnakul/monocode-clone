import { killChild, resolveAntigravityBinary, spawnChild, unwatchChild, watchChild } from "./child";
import { JsonRpcClient, type JsonRpcHandlers } from "./jsonRpc";
import { parseAntigravityAuthLine } from "./antigravitySetup";
import { asRecord } from "./clineProtocol";

export const ANTIGRAVITY_AUTH_METHOD = "oauth-personal";
export const ANTIGRAVITY_SIGN_IN_REQUIRED = "Antigravity requires Google sign-in. Open Settings > Providers > Antigravity and choose Sign in with Google, then retry.";
export const ANTIGRAVITY_CONTROL_TIMEOUT_MS = 30_000;
export type AntigravityConnection = { rpc: JsonRpcClient; start: () => Promise<Record<string, unknown>>; stop: () => Promise<void> };

/** Normal connections never open a browser or retain authorization URLs. */
export function createAntigravityConnection(
  sessionId: string,
  cwd: string,
  handlers: JsonRpcHandlers,
  resolver: () => Promise<{ path: string }> = resolveAntigravityBinary,
): AntigravityConnection {
  const rpc = new JsonRpcClient(sessionId, handlers, { label: "antigravity-acp" });
  let stopped = false;
  const stop = async (): Promise<void> => {
    stopped = true; rpc.close(); unwatchChild(sessionId);
    await killChild(sessionId).catch((): void => {});
  };
  const read = (line: string, stdout: boolean): void => {
    if (stopped) return;
    try {
      if (parseAntigravityAuthLine(line)) throw new Error(ANTIGRAVITY_SIGN_IN_REQUIRED);
      // Never send native diagnostics (which can contain credentials) to the RPC logger.
      if (stdout && line.trimStart().startsWith("{")) rpc.pushLine(line);
    } catch (error) {
      rpc.close(error instanceof Error ? error : new Error(ANTIGRAVITY_SIGN_IN_REQUIRED));
      void stop();
    }
  };
  return { rpc, stop, start: async (): Promise<Record<string, unknown>> => {
    try {
      const { path } = await resolver();
      if (stopped) throw new Error("Antigravity session stopped.");
      watchChild(sessionId, (line): void => read(line, true), (code): void => {
        rpc.close(new Error(`Antigravity ACP process exited (${String(code)}).`));
      }, (line): void => read(line, false));
      await spawnChild(sessionId, path, [], cwd);
      if (stopped) { await stop(); throw new Error("Antigravity session stopped."); }
      const initialized = asRecord(await rpc.request("initialize", {
        protocolVersion: 1,
        clientInfo: { name: "monocode", version: "0.1.29" },
        // Workspace callbacks require canonical-path enforcement in the backend.
        clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false },
      }, ANTIGRAVITY_CONTROL_TIMEOUT_MS));
      if (initialized?.protocolVersion !== 1) throw new Error("Antigravity returned an unsupported ACP protocol version.");
      await rpc.request("authenticate", { methodId: ANTIGRAVITY_AUTH_METHOD }, ANTIGRAVITY_CONTROL_TIMEOUT_MS);
      return initialized;
    } catch (error) { await stop(); throw error; }
  } };
}
