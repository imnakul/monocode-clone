import type { AiHelperProvider } from "../../../features/settings/model/settings";

export const HELPER_ISOLATION: Record<
  AiHelperProvider,
  { verified: boolean; reason?: string }
> = {
  claude: { verified: true },
  codex: { verified: true },
  opencode: { verified: true },
  antigravity: {
    verified: false,
    reason:
      "MonoCode can't switch off Antigravity's built-in tools yet, so it can't be used as an AI helper.",
  },
};

/**
 * A runner saw an attempted tool use. Its message contains only provider and
 * tool kind so callers can classify the failure without exposing arguments.
 */
export class HelperToolAttemptError extends Error {
  constructor(provider: AiHelperProvider, toolKind: string) {
    const safeToolKind = toolKind.trim().split(/\s+/)[0]?.slice(0, 80) || "unknown";
    super(`AI helper tried to use a tool (${provider}: ${safeToolKind})`);
    this.name = "HelperToolAttemptError";
  }
}

export class HelperUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HelperUnavailableError";
  }
}
