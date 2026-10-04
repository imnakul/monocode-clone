import type { HarnessId } from "../../sessions/model/session";
import type { HarnessSessionInput } from "../../../integrations/harness/core/types";
import { prepareProviderNativeInput } from "./providerSessions";

/**
 * Await before every native send, compact, rewind or Remote Control enable.
 * Only Claude and Codex chats can hold a native binding, so every other
 * provider skips the lookup and keeps its input unchanged. A failure here must
 * surface to the user; never retry it as a fresh conversation.
 */
export function prepareNativeInput<T extends HarnessSessionInput>(
  harness: HarnessId,
  input: T,
  prepare: typeof prepareProviderNativeInput = prepareProviderNativeInput,
): Promise<T> {
  if (harness !== "claude" && harness !== "codex")
    return Promise.resolve(input);
  return prepare(harness, input);
}
