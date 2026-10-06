import type { Session } from "../../sessions/model/session";
import {
  loadClaudeRemoteControlDefault,
  loadRemoteControlChoices,
  saveRemoteControlChoices,
  loadRemoteControlSessions,
  saveRemoteControlSessions,
} from "../../settings/model/settings";
import {
  setHarnessRemoteControl,
  syncHarnessRemoteControlDesired,
  type HarnessRemoteControlInput,
} from "../../../integrations/harness/core/registry";
import { HarnessRemoteControlError } from "../../../integrations/harness/core/types";
import type { HarnessEvent } from "../../../integrations/harness/core/types";
import { prepareProviderNativeInput } from "./providerSessions";

type SessionIdentity = Pick<Session, "id" | "harness" | "title">;
const actions = new Map<string, symbol>();

/** Run once after adapters and saved sessions load. This never wakes a provider. */
export function restoreClaudeRemoteControlPreferences(
  sessions: readonly SessionIdentity[],
): Set<string> {
  const saved = loadRemoteControlSessions();
  const wanted = new Set<string>();
  for (const session of sessions) {
    if (session.harness !== "claude") continue;
    const enabled = saved.has(session.id);
    if (enabled) wanted.add(session.id);
    syncHarnessRemoteControlDesired({
      harness: "claude",
      sessionId: session.id,
      enabled,
      name: session.title,
    });
  }
  return wanted;
}

/** New local chats only; do not call for discovered/resumed or cloud chats. */
export function initializeNewClaudeRemoteControlPreference(
  session: SessionIdentity,
  enabled = loadClaudeRemoteControlDefault(),
): boolean {
  if (session.harness !== "claude") return false;
  const choices = loadRemoteControlChoices();
  choices.add(session.id);
  saveRemoteControlChoices(choices);
  const saved = loadRemoteControlSessions();
  if (enabled) saved.add(session.id);
  else saved.delete(session.id);
  saveRemoteControlSessions(saved);
  syncHarnessRemoteControlDesired({
    harness: "claude",
    sessionId: session.id,
    enabled,
    name: session.title,
  });
  return enabled;
}

/** Local desired choice is durable; live URL/status is confirmed by provider events. */
export async function changeClaudeRemoteControl(
  input: HarnessRemoteControlInput,
): Promise<void> {
  const choices = loadRemoteControlChoices();
  choices.add(input.sessionId);
  saveRemoteControlChoices(choices);
  const action = Symbol();
  actions.set(input.sessionId, action);
  const saved = loadRemoteControlSessions();
  if (input.enabled) saved.add(input.sessionId);
  else saved.delete(input.sessionId);
  saveRemoteControlSessions(saved);
  try {
    const prepared = await prepareProviderNativeInput("claude", input);
    if (actions.get(input.sessionId) !== action) return;
    await setHarnessRemoteControl({ ...prepared, harness: "claude" });
  } catch (error) {
    if (actions.get(input.sessionId) !== action) return;
    if (!(
      error instanceof HarnessRemoteControlError &&
      error.status === "needs-consent"
    )) {
      const current = loadRemoteControlSessions();
      current.delete(input.sessionId);
      saveRemoteControlSessions(current);
      syncHarnessRemoteControlDesired({
        harness: "claude",
        sessionId: input.sessionId,
        enabled: false,
      });
    }
    throw error;
  } finally {
    if (actions.get(input.sessionId) === action)
      actions.delete(input.sessionId);
  }
}

/** Call on deletion. Stopping/parking a chat deliberately preserves its preference. */
export function removeClaudeRemoteControlPreference(sessionId: string): void {
  actions.delete(sessionId);
  const choices = loadRemoteControlChoices();
  choices.delete(sessionId);
  saveRemoteControlChoices(choices);
  const saved = loadRemoteControlSessions();
  saved.delete(sessionId);
  saveRemoteControlSessions(saved);
  syncHarnessRemoteControlDesired({
    harness: "claude",
    sessionId,
    enabled: false,
  });
}

/** Route Claude events here even for auto-enable on first send. Off/consent keep intent. */
export function persistClaudeRemoteControlEvent(
  sessionId: string,
  event: HarnessEvent,
): void {
  if (event.type !== "remoteControl.changed" || event.status !== "failed")
    return;
  const saved = loadRemoteControlSessions();
  saved.delete(sessionId);
  saveRemoteControlSessions(saved);
}
