import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import type { ModelSetting } from "../../sessions/model/models";
import type { HarnessId } from "../../sessions/model/session";

export type AntigravityCliAgent = { id: string; scope: "user" | "project" };

export function validCliAgent(value: string): boolean {
  return value === "default" || /^[a-z\d][a-z\d_.-]{0,127}$/i.test(value);
}

export function cliAgentSetting(
  agents: AntigravityCliAgent[],
  selected = "default",
  locked = false,
): ModelSetting {
  const options = [
    { value: "default", label: "Default agent" },
    ...agents.map((agent) => ({
      value: agent.id,
      label: `${agent.id} · ${agent.scope === "project" ? "Project" : "Global"}`,
    })),
  ];
  if (!options.some((option) => option.value === selected)) {
    options.push({ value: selected, label: `${selected} · Unavailable` });
  }
  return {
    id: "antigravityAgent",
    label: "Agent",
    kind: "select",
    value: "default",
    description: locked
      ? "Agent is fixed for this conversation. Start a new chat to choose another agent."
      : "Choose the Antigravity CLI agent before sending the first message.",
    options: locked
      ? options.filter((option) => option.value === selected)
      : options,
  };
}

/** Options belong to the selected workspace, never the global model catalog. */
export function useAntigravityCliAgents(
  harness: HarnessId,
  cwd: string | undefined,
  selected?: string,
  locked = false,
): { settings: ModelSetting[]; error?: string; loading: boolean } {
  const [snapshot, setSnapshot] = useState<{
    cwd?: string;
    agents: AntigravityCliAgent[];
    error?: string;
    loading: boolean;
  }>({ agents: [], loading: false });
  useEffect(() => {
    if (harness !== "antigravity-cli" || !cwd) return;
    let disposed = false;
    let sequence = 0;
    const refresh = (): void => {
      const request = ++sequence;
      setSnapshot((previous) => ({ ...previous, loading: true }));
      void invoke<unknown>("antigravity_cli_agents", { cwd })
        .then((agents): void => {
          if (
            !Array.isArray(agents) ||
            !agents.every((agent: unknown) => {
              if (!agent || typeof agent !== "object") return false;
              const row = agent as Record<string, unknown>;
              return (
                typeof row.id === "string" &&
                validCliAgent(row.id) &&
                (row.scope === "project" || row.scope === "user")
              );
            })
          )
            throw new Error("Antigravity CLI returned an invalid agent list");
          if (!disposed && sequence === request)
            setSnapshot({
              cwd,
              agents: agents as AntigravityCliAgent[],
              loading: false,
            });
        })
        .catch((error: unknown): void => {
          if (!disposed && sequence === request)
            setSnapshot({
              cwd,
              agents: [],
              loading: false,
              error: String(error),
            });
        });
    };
    refresh();
    window.addEventListener("focus", refresh);
    return (): void => {
      disposed = true;
      window.removeEventListener("focus", refresh);
    };
  }, [harness, cwd]);
  if (harness !== "antigravity-cli") return { settings: [], loading: false };
  const current =
    snapshot.cwd === cwd ? snapshot : { agents: [], loading: true };
  return {
    settings: [cliAgentSetting(current.agents, selected, locked)],
    error: "error" in current ? current.error : undefined,
    loading: current.loading,
  };
}
