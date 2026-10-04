import { invoke } from "@tauri-apps/api/core";
import {
  newSession,
  type RuntimeMode,
  type Session,
} from "../../sessions/model/session";
import { resolveImportModel } from "../../../integrations/harness/core/sessionImport";
import { bindHarnessSession } from "../../../integrations/harness/core/registry";
import type { HarnessSessionInput } from "../../../integrations/harness/core/types";
import {
  getSession,
  upsertNativeResumeSession,
} from "../../sessions/data/sessionStore";

export type NativeProvider = "claude" | "codex";
export type ProviderConversation = {
  key: string;
  provider: NativeProvider;
  nativeId: string;
  sourceRoot: string;
  providerAccountId: string;
  title: string;
  cwd: string;
  updatedAt: number;
  archived: boolean;
  monocodeSessionId: string | null;
};
export type ProviderConversationPage = {
  conversations: ProviderConversation[];
  diagnostics: string[];
  nextOffset: number | null;
};

/** Metadata only. Discovery never starts a process or replays history. */
export function listProviderConversations(
  provider: NativeProvider,
  options: {
    accountId?: string;
    includeArchived?: boolean;
    limit?: number;
    offset?: number;
  } = {},
): Promise<ProviderConversationPage> {
  return invoke("provider_sessions_list", {
    provider,
    accountId: options.accountId ?? "default",
    includeArchived: options.includeArchived ?? false,
    limit: options.limit ?? 100,
    offset: options.offset ?? 0,
  });
}

export function setProviderConversationArchived(
  key: string,
  archived: boolean,
): Promise<void> {
  return invoke("provider_sessions_set_archived", { key, archived });
}

/** Call when deleting a MonoCode chat; native provider files stay untouched. */
export function detachProviderConversation(sessionId: string): Promise<void> {
  return invoke("provider_sessions_unbind", { sessionId });
}

export type NativeOpenDependencies = {
  findSession: (id: string) => Promise<Session | undefined>;
  saveSession: (session: Session) => Promise<void>;
  /** Optional lookup for a provider-bound live chat not yet in the durable store. */
  findNativeSession?: (
    row: ProviderConversation,
  ) => Promise<Session | undefined>;
};
const opening = new Map<string, Promise<Session>>();
const nativeStore: NativeOpenDependencies = {
  findSession: async (id) => (await getSession(id)) ?? undefined,
  saveSession: async (session) => {
    if (!(await upsertNativeResumeSession(session)))
      throw new Error(
        "The MonoCode conversation was removed before it could be saved.",
      );
  },
};

/** Native IDs/context only: no migration, transcript replay or summary. */
export function openProviderConversation(
  row: ProviderConversation,
  dependencies: NativeOpenDependencies = nativeStore,
  options: { model?: string; runtimeMode?: RuntimeMode } = {},
): Promise<Session> {
  const pending = opening.get(row.key);
  if (pending) return pending;
  const operation = (async (): Promise<Session> => {
    if (!row.cwd.trim() || row.cwd.startsWith("(unknown"))
      throw new Error(
        "The native conversation's project folder is unavailable.",
      );
    const nativeId = await invoke<string>("provider_sessions_validate_source", {
      key: row.key,
      provider: row.provider,
      accountId: row.providerAccountId,
    });
    if (nativeId !== row.nativeId)
      throw new Error("Native conversation identity changed.");
    const candidate = newSession(
      row.provider,
      row.cwd,
      resolveImportModel(row.provider, options.model),
      options.runtimeMode,
    );
    candidate.providerAccountId = row.providerAccountId;
    candidate.title = row.title;
    const liveMatch = await dependencies.findNativeSession?.(row);
    if (
      liveMatch &&
      (liveMatch.providerSessionId !== row.nativeId ||
        liveMatch.harness !== row.provider ||
        liveMatch.cwd !== row.cwd ||
        (liveMatch.providerAccountId ?? "default") !== row.providerAccountId)
    )
      throw new Error(
        "The live MonoCode chat does not match this native conversation.",
      );
    const id = await invoke<string>("provider_sessions_bind", {
      key: row.key,
      sessionId: liveMatch?.id ?? candidate.id,
      cwd: row.cwd,
      accountId: row.providerAccountId,
    });
    const existing =
      liveMatch?.id === id ? liveMatch : await dependencies.findSession(id);
    if (existing) {
      if (
        existing.harness !== row.provider ||
        existing.cwd !== row.cwd ||
        (existing.providerSessionId &&
          existing.providerSessionId !== row.nativeId) ||
        (existing.providerAccountId ?? "default") !== row.providerAccountId
      ) {
        throw new Error(
          "The saved MonoCode chat no longer matches this native conversation.",
        );
      }
      if (liveMatch === existing) await dependencies.saveSession(existing);
      bindHarnessSession(
        row.provider,
        existing.id,
        row.nativeId,
        row.cwd,
        row.providerAccountId,
      );
      return existing;
    }
    candidate.id = id;
    await dependencies.saveSession(candidate);
    bindHarnessSession(
      row.provider,
      candidate.id,
      row.nativeId,
      row.cwd,
      row.providerAccountId,
    );
    return candidate;
  })();
  opening.set(row.key, operation);
  void operation
    .finally(() => {
      if (opening.get(row.key) === operation) opening.delete(row.key);
    })
    .catch(() => undefined);
  return operation;
}

/** Before each send/RC enable, including after restore. Strict resume never falls back. */
export async function prepareProviderNativeInput<T extends HarnessSessionInput>(
  harness: Session["harness"],
  input: T,
): Promise<T> {
  const source = await invoke<{ key: string; cwd: string } | null>(
    "provider_sessions_for_session",
    {
      sessionId: input.sessionId,
    },
  );
  if (!source) return input;
  if (harness !== "claude" && harness !== "codex")
    throw new Error("This conversation must use its original provider.");
  if (!source.cwd || input.cwd !== source.cwd)
    throw new Error(
      "This native conversation must use its original project folder.",
    );
  const providerSessionId = await invoke<string>(
    "provider_sessions_validate_source",
    {
      key: source.key,
      provider: harness,
      accountId: input.providerAccountId ?? "default",
    },
  );
  return { ...input, nativeResume: { providerSessionId } };
}
