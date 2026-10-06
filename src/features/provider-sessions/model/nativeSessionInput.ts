import { invoke } from "@tauri-apps/api/core";
import type { NativeProvider, ProviderConversation } from "./providerSessions";

export type NativeSessionReference = {
  provider: NativeProvider;
  nativeId: string;
};

/** Parse data only. Pasted commands are never executed, even with extra flags. */
export function parseNativeSessionInput(
  input: string,
  selectedProvider: NativeProvider,
): NativeSessionReference {
  const text = input.trim();
  if (!text || text.length > 1024 || /[\r\n\0]/.test(text))
    throw new Error("Paste one local session ID or resume command.");
  const id = "([A-Za-z0-9][A-Za-z0-9_-]{0,199})";
  const raw = new RegExp(`^${id}$`).exec(text);
  if (raw) return { provider: selectedProvider, nativeId: raw[1] };
  // Native providers use simple identifiers, so only these exact command
  // shapes are accepted. No options, shell syntax or path guessing.
  const claude = new RegExp(
    `^claude\\s+(?:--resume|-r)(?:\\s+|=)(["']?)${id}\\1$`,
  ).exec(text);
  if (claude) return { provider: "claude", nativeId: claude[2] };
  const codex = new RegExp(`^codex\\s+resume\\s+(["']?)${id}\\1$`).exec(text);
  if (codex) return { provider: "codex", nativeId: codex[2] };
  throw new Error(
    "Use a local session ID, claude --resume <id>, or codex resume <id>. Cloud and public share links are not supported.",
  );
}

export function resolveNativeSession(
  reference: NativeSessionReference,
  accountId: string,
): Promise<ProviderConversation> {
  return invoke("provider_sessions_resolve", {
    provider: reference.provider,
    nativeId: reference.nativeId,
    accountId,
  });
}
