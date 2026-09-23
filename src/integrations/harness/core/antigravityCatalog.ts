import { homeDir } from "../../../platform/tauri/fs";
import { setHarnessModels } from "../../../features/sessions/model/models";
import { antigravityConfigs, antigravityModels } from "./antigravityAcpProtocol";
import { acquireAntigravityRuntime } from "./antigravityRuntimeHost";
import { noteHarnessEvidence } from "./availability";

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
 * Discover models over the official ACP contract: session/new on the shared
 * runtime (which handles initialize + authenticate once), then read the
 * `model` select config option. Discovery needs a signed-in account; without
 * one this reports the sign-in state instead of pretending the runtime has no
 * models.
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
    // Discovery runs on the shared long-lived runtime; the throwaway session
    // is abandoned inside it on purpose, since spawning a fresh onefile
    // process per Recheck costs a ~500 MB self-extraction.
    const host = await acquireAntigravityRuntime();
    const setup = await host.rpc.request(
      "session/new",
      { cwd, mcpServers: [] },
      45_000,
    );
    const models = antigravityModels(antigravityConfigs(setup));
    if (models.length === 0) {
      // The runtime answered, so the binary is present and healthy; only the
      // model list is empty for this account.
      noteHarnessEvidence("antigravity", true);
      setSnapshot({
        phase: "error",
        error:
          "The Antigravity runtime returned no models for this account. Sign in again, update the official ACP runtime, then Recheck.",
      });
      return;
    }
    setHarnessModels("antigravity", models);
    noteHarnessEvidence("antigravity", true);
    setSnapshot({ phase: "ready" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const signInRequired = /sign[- ]?in/i.test(message);
    // Discovery on the shared runtime doubles as the health probe: success
    // or a healthy-but-signed-out runtime marks the provider available, so a
    // separate ACP handshake never runs alongside this acquisition. Only a
    // failed launch marks it unavailable.
    noteHarnessEvidence("antigravity", signInRequired, message);
    setSnapshot({
      phase: "error",
      error: message,
      signInRequired,
    });
    console.debug("[monocode] antigravity catalog", error);
  }
}

/** Settings Recheck must rerun discovery even when a previous catalog succeeded. */
export async function recheckAntigravityCatalog(): Promise<void> {
  await refreshAntigravityCatalog(true);
}
