import { openUrl } from "@tauri-apps/plugin-opener";
import { homeDir } from "../fs";
import { killChild, resolveAntigravityBinary, spawnChild, unwatchChild, watchChild } from "./child";
import { JsonRpcClient } from "./jsonRpc";

const AUTH_PREFIX = "Open the following link to authenticate the ACP server: ";
const BROWSER_MARKER = "__MONOCODE_ANTIGRAVITY_AUTH_URL__";
const AUTH_PROCESS_ID = "monocode-antigravity-sign-in";
let inflight: Promise<void> | null = null;
let cancelCurrent: (() => Promise<void>) | null = null;

/** Reads a validated authorization URL without exposing tokens to the transcript. */
export function parseAntigravityAuthLine(line: string): string | null {
  const message = line.trim();
  let candidate: unknown;
  if (message.startsWith(AUTH_PREFIX)) candidate = message.slice(AUTH_PREFIX.length);
  else if (message.startsWith(BROWSER_MARKER)) {
    try { candidate = JSON.parse(message.slice(BROWSER_MARKER.length)); }
    catch { throw new Error("Antigravity returned an invalid sign-in URL."); }
  } else return null;
  const invalid = (): Error => new Error("Antigravity returned an invalid Google sign-in URL.");
  if (typeof candidate !== "string" || candidate.length > 16_384 || /\s/.test(candidate)) throw invalid();
  let url: URL;
  try { url = new URL(candidate); } catch { throw invalid(); }
  const state = url.searchParams.get("state");
  const redirect = url.searchParams.get("redirect_uri");
  if (url.origin !== "https://accounts.google.com" || url.pathname !== "/o/oauth2/v2/auth" || url.username || url.password || url.hash ||
    url.searchParams.getAll("state").length !== 1 || !state || state.length > 512 || /\s/.test(state) ||
    url.searchParams.getAll("redirect_uri").length !== 1 || !redirect || !/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}\/$/.test(redirect) ||
    url.searchParams.getAll("response_type").length !== 1 || url.searchParams.get("response_type") !== "code") throw invalid();
  let callback: URL;
  try { callback = new URL(redirect); } catch { throw invalid(); }
  if (Number(callback.port) < 1024 || Number(callback.port) > 65535) throw invalid();
  return candidate;
}

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
  } finally { await stop(); }
}

/** Cancels an explicit sign-in without touching existing account credentials. */
export async function cancelAntigravitySignIn(): Promise<void> {
  await cancelCurrent?.();
}
