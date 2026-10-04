import type { Session } from "../../sessions/model/session";
import type { ProviderConversation } from "./providerSessions";
import { remoteControlView, type RemoteControlView } from "./remoteControlView";

/** Native storage does not report RC health; only a bound live chat can do so. */
export function conversationRemoteControl(
  row: ProviderConversation,
  sessions: readonly Session[],
  desired: ReadonlySet<string>,
): RemoteControlView | null {
  if (row.provider !== "claude") return null;
  const session = sessions.find(
    (entry) =>
      entry.harness === "claude" &&
      (entry.id === row.monocodeSessionId ||
        (entry.providerSessionId === row.nativeId &&
          (entry.providerAccountId ?? "default") === row.providerAccountId)),
  );
  const id = session?.id ?? row.monocodeSessionId;
  return remoteControlView({
    desired: !!id && desired.has(id),
    status: session?.remoteControlStatus,
    url: session?.remoteControlUrl,
    message: session?.remoteControlMessage,
  });
}
