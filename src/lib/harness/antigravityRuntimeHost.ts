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

export type AntigravitySessionHandlers = {
  onNotification: (method: string, params: unknown) => void;
  onRequest: (id: JsonRpcId, method: string, params: unknown) => void;
  onExit: (code: number | null) => void;
};

export type AntigravitySharedRuntime = {
  rpc: JsonRpcClient;
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
 * restarted after an exit or an explicit retire (sign-in, wedged cancel). */
export function acquireAntigravityRuntime(
  resolver: Resolver = resolveAntigravityBinary,
): Promise<AntigravitySharedRuntime> {
  if (runtime) return Promise.resolve(runtime);
  if (!starting) {
    starting = startRuntime(resolver).finally((): void => {
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

async function startRuntime(resolver: Resolver): Promise<AntigravitySharedRuntime> {
  const { path } = await resolver();
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
      // Never send native diagnostics (which can contain credentials) to the RPC logger.
      if (stdout && line.trimStart().startsWith("{")) rpc.pushLine(line);
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
    await spawnChild(ANTIGRAVITY_RUNTIME_SESSION_ID, path, [], cwd);
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
