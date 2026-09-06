import { homeDir } from "../fs";
import { asRecord } from "./clineProtocol";
import {
  ANTIGRAVITY_SIGN_IN_REQUIRED,
  parseAntigravityAuthLine,
} from "./antigravityAuthLine";
import {
  killChild,
  resolveAntigravityBinary,
  spawnChild,
  unwatchChild,
  watchChild,
} from "./child";
import { JsonRpcClient, type JsonRpcId } from "./jsonRpc";

export const ANTIGRAVITY_RUNTIME_SESSION_ID = "monocode-antigravity-runtime";
const CONTROL_TIMEOUT_MS = 30_000;
const MAX_BUFFERED_PER_SESSION = 100;
const WS_MSG_PREFIX = "RAW WS MSG: ";

export type AntigravitySessionHandlers = {
  onNotification: (method: string, params: unknown) => void;
  onRequest: (id: JsonRpcId, method: string, params: unknown) => void;
  onExit: (code: number | null) => void;
};

export type AntigravitySharedRuntime = {
  rpc: JsonRpcClient;
  /** Absolute path of the executable this runtime was started from. */
  executablePath: string;
  /** Advertised prompt capabilities from the runtime's initialize result. */
  promptCapabilities: Record<string, unknown>;
  /** Advertised session capabilities (resume/list) from initialize. */
  sessionCapabilities: Record<string, unknown>;
  /** Route this native session's traffic to `handlers`. */
  attach: (nativeId: string, handlers: AntigravitySessionHandlers) => void;
  /** Stop routing and drop any buffered updates for the session. */
  detach: (nativeId: string) => void;
  /** `session/update` params that arrived before the session attached. */
  takeBuffered: (nativeId: string) => unknown[];
};

let runtime: AntigravitySharedRuntime | null = null;
let starting: Promise<AntigravitySharedRuntime> | null = null;

type Resolver = () => Promise<{ path: string }>;

/** One official ACP runtime process shared by every MonoCode Antigravity
 * consumer (catalog discovery, chats, resume). The runtime is a PyInstaller
 * onefile that re-extracts ~500 MB on every launch, so — mirroring upstream
 * T3's lifecycle — the process stays alive across sessions and is only
 * restarted after an exit, an explicit retire (sign-in, wedged cancel), or a
 * binary change in Settings. */
export async function acquireAntigravityRuntime(
  resolver: Resolver = resolveAntigravityBinary,
): Promise<AntigravitySharedRuntime> {
  let desired: string | null = null;
  try {
    desired = (await resolver()).path;
  } catch (error) {
    // Resolution can fail transiently (probe timeouts, PATH hiccups); a
    // working runtime must never be torn down because of that.
    if (runtime) return runtime;
    throw error;
  }
  if (runtime && runtime.executablePath !== desired) {
    // Settings selected a different binary: restart so execution matches what
    // the UI probes and claims. Attached sessions observe the exit and resume
    // on the new runtime on their next turn.
    await retireAntigravityRuntime();
  }
  if (runtime) return runtime;
  if (!starting) {
    starting = startRuntime(desired).finally((): void => {
      starting = null;
    });
  }
  return starting;
}

/** Kills the shared runtime; the next acquire starts a fresh process. */
export async function retireAntigravityRuntime(): Promise<void> {
  if (starting) {
    try {
      await starting;
    } catch {
      // The start failed on its own; nothing to retire.
    }
  }
  const retiring = runtime;
  runtime = null;
  if (retiring) {
    teardownOf(retiring)(null, new Error("Antigravity runtime retired."));
    await killChild(ANTIGRAVITY_RUNTIME_SESSION_ID).catch((): void => {});
  }
}

const teardowns = new WeakMap<AntigravitySharedRuntime, (code: number | null, error: Error) => void>();

function teardownOf(shared: AntigravitySharedRuntime): (code: number | null, error: Error) => void {
  const teardown = teardowns.get(shared);
  if (!teardown) throw new Error("Unknown Antigravity shared runtime.");
  return teardown;
}

async function startRuntime(executablePath: string): Promise<AntigravitySharedRuntime> {
  const cwd = await homeDir();
  const attached = new Map<string, AntigravitySessionHandlers>();
  const buffered = new Map<string, unknown[]>();

  const pushBuffered = (nativeId: string, params: unknown): void => {
    const queue = buffered.get(nativeId) ?? [];
    queue.push(params);
    if (queue.length > MAX_BUFFERED_PER_SESSION) queue.shift();
    buffered.set(nativeId, queue);
  };

  const rpc = new JsonRpcClient(ANTIGRAVITY_RUNTIME_SESSION_ID, {
    onNotification: (method, params): void => {
      const nativeId = asRecord(params)?.sessionId;
      if (typeof nativeId !== "string") return;
      const session = attached.get(nativeId);
      if (session) session.onNotification(method, params);
      else if (method === "session/update") pushBuffered(nativeId, params);
    },
    onRequest: (id, method, params): void => {
      const nativeId = asRecord(params)?.sessionId;
      const session = typeof nativeId === "string" ? attached.get(nativeId) : undefined;
      if (session) session.onRequest(id, method, params);
      else {
        void rpc
          .respondError(id, { code: -32601, message: `Method not found: ${method}` })
          .catch((): void => {});
      }
    },
  }, { label: "antigravity-runtime" });

  const shared: AntigravitySharedRuntime = {
    rpc,
    executablePath,
    promptCapabilities: {},
    sessionCapabilities: {},
    attach: (nativeId, handlers): void => {
      if (nativeId) attached.set(nativeId, handlers);
    },
    detach: (nativeId): void => {
      if (!nativeId) return;
      attached.delete(nativeId);
      buffered.delete(nativeId);
    },
    takeBuffered: (nativeId): unknown[] => {
      const queued = buffered.get(nativeId);
      buffered.delete(nativeId);
      return queued ?? [];
    },
  };

  const teardown = (code: number | null, error: Error): void => {
    rpc.close(error);
    for (const [, session] of attached) session.onExit(code);
    attached.clear();
    buffered.clear();
    unwatchChild(ANTIGRAVITY_RUNTIME_SESSION_ID);
    if (runtime === shared) runtime = null;
  };
  teardowns.set(shared, teardown);

  const read = (line: string, stdout: boolean): void => {
    if (rpc.isClosed) return;
    try {
      if (parseAntigravityAuthLine(line)) throw new Error(ANTIGRAVITY_SIGN_IN_REQUIRED);
      if (stdout) {
        // Never send native diagnostics (which can contain credentials) to the RPC logger.
        if (line.trimStart().startsWith("{")) rpc.pushLine(line);
        return;
      }
      routeUsageFrame(line, attached);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(ANTIGRAVITY_SIGN_IN_REQUIRED);
      teardown(null, err);
      void killChild(ANTIGRAVITY_RUNTIME_SESSION_ID).catch((): void => {});
    }
  };

  watchChild(
    ANTIGRAVITY_RUNTIME_SESSION_ID,
    (line): void => read(line, true),
    (code): void => {
      teardown(code, new Error(`Antigravity ACP runtime exited (${String(code)}).`));
      void killChild(ANTIGRAVITY_RUNTIME_SESSION_ID).catch((): void => {});
    },
    (line): void => read(line, false),
  );

  try {
    await spawnChild(ANTIGRAVITY_RUNTIME_SESSION_ID, executablePath, [], cwd);
    const initialized = asRecord(
      await rpc.request("initialize", {
        protocolVersion: 1,
        clientInfo: { name: "monocode", version: "0.1.29" },
        // Workspace callbacks require canonical-path enforcement in the backend.
        clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false },
      }, CONTROL_TIMEOUT_MS),
    );
    if (initialized?.protocolVersion !== 1) {
      throw new Error("Antigravity returned an unsupported ACP protocol version.");
    }
    shared.promptCapabilities = asRecord(asRecord(initialized.agentCapabilities)?.promptCapabilities) ?? {};
    shared.sessionCapabilities =
      asRecord(asRecord(initialized.agentCapabilities)?.sessionCapabilities) ?? {};
    await rpc.request("authenticate", { methodId: "oauth-personal" }, CONTROL_TIMEOUT_MS);
  } catch (error) {
    teardown(null, error instanceof Error ? error : new Error(String(error)));
    await killChild(ANTIGRAVITY_RUNTIME_SESSION_ID).catch((): void => {});
    throw error;
  }
  runtime = shared;
  return shared;
}

/** The runtime logs its backend websocket frames on stderr, and turn usage
 * only exists there: `RAW WS MSG: {"usageUpdate":{"agents":[{trajectoryId,
 * usage:{promptTokenCount,...}}]}}`. The trajectory id equals our ACP session
 * id, so matched frames are forwarded as synthetic `usage_update` updates for
 * the context meter. Best-effort by design: any format change degrades to
 * "no usage shown", never an error. */
function routeUsageFrame(
  line: string,
  attached: Map<string, AntigravitySessionHandlers>,
): void {
  if (!line.includes('"usageUpdate"')) return;
  const start = line.indexOf(WS_MSG_PREFIX);
  if (start < 0) return;
  let frame: unknown;
  try {
    frame = JSON.parse(line.slice(start + WS_MSG_PREFIX.length));
  } catch {
    return;
  }
  const agents = asRecord(asRecord(frame)?.usageUpdate)?.agents;
  if (!Array.isArray(agents)) return;
  for (const item of agents) {
    const agent = asRecord(item);
    const nativeId = typeof agent?.trajectoryId === "string" ? agent.trajectoryId : "";
    const usage = asRecord(agent?.usage);
    const session = nativeId ? attached.get(nativeId) : undefined;
    if (!usage || !session) continue;
    session.onNotification("session/update", {
      sessionId: nativeId,
      update: { sessionUpdate: "usage_update", usage },
    });
  }
}
