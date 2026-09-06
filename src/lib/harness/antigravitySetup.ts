import { openUrl } from "@tauri-apps/plugin-opener";
import { homeDir } from "../fs";
import { killChild, resolveAntigravityBinary, spawnChild, unwatchChild, watchChild } from "./child";
import { JsonRpcClient } from "./jsonRpc";
import { retireAntigravityRuntime } from "./antigravityRuntimeHost";

export { parseAntigravityAuthLine } from "./antigravityAuthLine";
import { parseAntigravityAuthLine } from "./antigravityAuthLine";

const AUTH_PROCESS_ID = "monocode-antigravity-sign-in";
let inflight: Promise<void> | null = null;
let cancelCurrent: (() => Promise<void>) | null = null;

/** Starts only on an explicit Settings action; never sends a model prompt. */
export function signInAntigravity(): Promise<void> {
  if (inflight) return inflight;
  inflight = runSignIn().finally((): void => { inflight = null; cancelCurrent = null; });
  return inflight;
}

async function runSignIn(): Promise<void> {
  let cancelled = false;
  let browserFailure: Error | undefined;
  const opened = new Set<string>();
  const browserTasks: Promise<void>[] = [];
  const rpc = new JsonRpcClient(AUTH_PROCESS_ID, {
    onRequest: (id): void => {
      void rpc.respondError(id, { code: -32601, message: "Client tools are unavailable during sign-in." }).catch((): void => {});
    },
  }, { label: "antigravity-auth" });
  const stop = async (): Promise<void> => {
    cancelled = true;
    rpc.close(new Error("Antigravity sign-in cancelled."));
    unwatchChild(AUTH_PROCESS_ID);
    await killChild(AUTH_PROCESS_ID).catch((): void => {});
  };
  cancelCurrent = stop;
  const handleLine = (line: string, stdout: boolean): void => {
    if (cancelled) return;
    try {
      const url = parseAntigravityAuthLine(line);
      if (url) {
        if (!opened.has(url)) {
          opened.add(url);
          browserTasks.push(openUrl(url).catch((): void => {
            browserFailure = new Error("Could not open the Google sign-in page. Check your default browser and retry.");
            rpc.close(browserFailure);
          }));
        }
      } else if (stdout && line.trimStart().startsWith("{")) rpc.pushLine(line);
      // Non-protocol output may contain account information; do not log it.
    } catch (error) {
      rpc.close(error instanceof Error ? error : new Error("Invalid sign-in response."));
    }
  };
  try {
    const { path } = await resolveAntigravityBinary();
    const cwd = await homeDir();
    if (cancelled) throw new Error("Antigravity sign-in cancelled.");
    watchChild(AUTH_PROCESS_ID, (line): void => handleLine(line, true),
      (): void => rpc.close(new Error("Antigravity exited before sign-in completed.")),
      (line): void => handleLine(line, false));
    await spawnChild(AUTH_PROCESS_ID, path, [], cwd);
    if (cancelled) throw new Error("Antigravity sign-in cancelled.");
    await rpc.request("initialize", {
      protocolVersion: 1,
      clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false },
      clientInfo: { name: "monocode", version: "0.1.29" },
    }, 30_000);
    await rpc.request("authenticate", { methodId: "oauth-personal" }, 5 * 60_000);
    await Promise.all(browserTasks);
    if (browserFailure) throw browserFailure;
  } finally {
    await stop();
    // Credentials changed on disk; the shared runtime must not keep serving
    // the pre-sign-in token it authenticated with.
    await retireAntigravityRuntime().catch((): void => {});
  }
}

/** Cancels an explicit sign-in without touching existing account credentials. */
export async function cancelAntigravitySignIn(): Promise<void> {
  await cancelCurrent?.();
}
