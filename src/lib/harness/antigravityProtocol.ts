import type { AgentModel } from "../models";

export function modelsFromAntigravityOutput(output: string): AgentModel[] {
  const models: AgentModel[] = [];
  const seen = new Set<string>();

  for (const raw of output.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const tab = line.indexOf("\t");
    if (tab <= 0) continue;

    const nativeId = line.slice(0, tab).trim();
    const name = line.slice(tab + 1).trim();
    if (!nativeId || !name || seen.has(nativeId)) continue;
    seen.add(nativeId);
    models.push({
      id: `antigravity:${nativeId}`,
      harness: "antigravity",
      name,
      nativeId,
    });
  }

  return models;
}
