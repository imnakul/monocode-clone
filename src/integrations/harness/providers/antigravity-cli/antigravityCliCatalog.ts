import { homeDir } from "../../../../platform/tauri/fs";
import {
  setHarnessModels,
  type AgentModel,
} from "../../../../features/sessions/model/models";
import { execChild, probeHarnessBinary } from "../../core/child";
import { cliModels, CLI_HELP } from "./antigravityCliProtocol";

export type CliCatalogSnapshot = {
  phase: "idle" | "loading" | "ready" | "error";
  error?: string;
};
let snapshot: CliCatalogSnapshot = { phase: "idle" };
const listeners = new Set<() => void>();
let inflight: Promise<void> | undefined;

export function getCliCatalogSnapshot(): CliCatalogSnapshot {
  return snapshot;
}
export function subscribeCliCatalog(listener: () => void): () => void {
  listeners.add(listener);
  return (): void => {
    listeners.delete(listener);
  };
}
function setSnapshot(next: CliCatalogSnapshot): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

export async function discoverAntigravityCliModels(): Promise<AgentModel[]> {
  const { path } = await probeHarnessBinary("antigravity-cli");
  const output = await execChild(
    path,
    ["models"],
    await homeDir(),
    "antigravity-cli",
  );
  const models = cliModels(output);
  if (!models.length)
    throw new Error(
      `Antigravity CLI returned no recognizable model list. ${CLI_HELP}`,
    );
  return models;
}

export function refreshAntigravityCliCatalog(): Promise<void> {
  if (inflight) return inflight;
  setSnapshot({ phase: "loading" });
  inflight = discoverAntigravityCliModels()
    .then((models): void => {
      setHarnessModels("antigravity-cli", models);
      setSnapshot({ phase: "ready" });
    })
    .catch((error: unknown): never => {
      setSnapshot({
        phase: "error",
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    })
    .finally((): void => {
      inflight = undefined;
    });
  return inflight;
}
