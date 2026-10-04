import type { SessionSummary } from "../../sessions/data/sessionStore";
import type { ProviderConversation } from "./providerSessions";

export const PROVIDER_LABEL = { claude: "Claude", codex: "Codex" } as const;

export function folderName(cwd: string): string {
  const parts = cwd.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? cwd;
}

/**
 * Card-shaped view of a discovered conversation so the existing session card
 * renders it. The native key is the card id; the model slot shows the project
 * folder because the original model is not part of discovery metadata.
 */
export function conversationSummary(row: ProviderConversation): SessionSummary {
  const updatedAt = row.updatedAt * 1000;
  return {
    id: row.key,
    cwd: row.cwd,
    harness: row.provider,
    model: "",
    activeTurnModel: {
      harness: row.provider,
      id: "native-conversation",
      name: folderName(row.cwd),
    },
    runtimeMode: "supervised",
    title: row.title.trim() || "Untitled conversation",
    createdAt: updatedAt,
    updatedAt,
    archived: row.archived,
  };
}
