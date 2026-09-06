import { homeDir } from "../fs";
import { setHarnessModels } from "../models";
import { antigravityConfigs, antigravityModels } from "./antigravityAcpProtocol";
import { createAntigravityConnection } from "./antigravityAcpTransport";

export type AntigravityCatalogPhase = "idle" | "loading" | "ready" | "error";

export type AntigravityCatalogSnapshot = {
  phase: AntigravityCatalogPhase;
  error?: string;
  /** True when the runtime is healthy but the Google account is not connected. */
  signInRequired?: boolean;
};

let snapshot: AntigravityCatalogSnapshot = { phase: "idle" };
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;

/** Real-time discovery state so Settings can show failures without devtools. */
export function getAntigravityCatalogSnapshot(): AntigravityCatalogSnapshot {
  return snapshot;
}

export function subscribeAntigravityCatalog(listener: () => void): () => void {
  listeners.add(listener);
  return (): void => {
    listeners.delete(listener);
  };
}

function setSnapshot(next: AntigravityCatalogSnapshot): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

/**
 * Discover models over the official ACP contract: initialize + authenticate +
 * session/new, then read the `model` select config option. Discovery needs a
 * signed-in account; without one this reports the sign-in state instead of
 * pretending the runtime has no models.
 */
export function refreshAntigravityCatalog(force = false): Promise<void> {
  if (inflight) return inflight;
  if (!force && snapshot.phase === "loading") return Promise.resolve();
  inflight = discover().finally((): void => {
    inflight = null;
  });
  return inflight;
}

async function discover(): Promise<void> {
  setSnapshot({ phase: "loading" });
  try {
    const cwd = await homeDir();
    const connection = createAntigravityConnection("monocode-antigravity-catalog", cwd, {});
    try {
      await connection.start();
      const setup = await connection.rpc.request(
        "session/new",
        { cwd, mcpServers: [] },
        45_000,
      );
      const models = antigravityModels(antigravityConfigs(setup));
      if (models.length === 0) {
        setSnapshot({
          phase: "error",
          error:
            "The Antigravity runtime returned no models for this account. Sign in again, update the official ACP runtime, then Recheck.",
        });
        return;
      }
      setHarnessModels("antigravity", models);
      setSnapshot({ phase: "ready" });
    } finally {
      await connection.stop();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setSnapshot({
      phase: "error",
      error: message,
      signInRequired: /sign[- ]?in/i.test(message),
    });
    console.debug("[monocode] antigravity catalog", error);
  }
}

/** Settings Recheck must rerun discovery even when a previous catalog succeeded. */
export async function recheckAntigravityCatalog(): Promise<void> {
  await refreshAntigravityCatalog(true);
}
