import { describe, expect, it, vi } from "vitest";
import {
  archiveProviderConversationRow,
  liveNativeDependencies,
} from "./providerActions";
import { ProviderConversationStore } from "./conversationStore";
import type { ProviderConversation } from "./providerSessions";
import { newSession, type Session } from "../../sessions/model/session";

function row(extra: Partial<ProviderConversation> = {}): ProviderConversation {
  return {
    key: "k1",
    provider: "claude",
    nativeId: "native-1",
    sourceRoot: "/root",
    providerAccountId: "default",
    title: "t",
    cwd: "/work",
    updatedAt: 1,
    archived: false,
    monocodeSessionId: null,
    ...extra,
  };
}

async function loadedStore(rows: ProviderConversation[]): Promise<ProviderConversationStore> {
  const store = new ProviderConversationStore({
    list: async () => ({ conversations: rows, diagnostics: [], nextOffset: null }),
    accounts: () => ["default"],
  });
  store.setProviders(["claude"]);
  await new Promise((done) => setTimeout(done, 0));
  return store;
}

describe("liveNativeDependencies", () => {
  const live = (extra: Partial<Session>): Session => ({
    ...newSession("claude", "/work", "m"),
    providerSessionId: "native-1",
    ...extra,
  });

  it("matches an open chat on provider, native id, cwd and account", async () => {
    const open = live({ id: "open-1" });
    const deps = liveNativeDependencies({
      liveSessions: () => [open, live({ id: "other-cwd", cwd: "/elsewhere" }), live({ id: "other-account", providerAccountId: "work" }), live({ id: "codex", harness: "codex" })],
      getStored: async () => null,
      saveNative: async () => true,
    });
    expect(await deps.findNativeSession?.(row())).toBe(open);
    expect(await deps.findNativeSession?.(row({ providerAccountId: "work" }))).toMatchObject({ id: "other-account" });
    expect(await deps.findNativeSession?.(row({ nativeId: "nope" }))).toBeUndefined();
  });

  it("prefers a live session over the store and treats a null save as failure", async () => {
    const open = live({ id: "open-1" });
    const getStored = vi.fn(async () => null);
    const deps = liveNativeDependencies({
      liveSessions: () => [open],
      getStored,
      saveNative: async () => null,
    });
    expect(await deps.findSession("open-1")).toBe(open);
    expect(getStored).not.toHaveBeenCalled();
    expect(await deps.findSession("missing")).toBeUndefined();
    await expect(deps.saveSession(open)).rejects.toThrow("removed before it could be saved");
  });

  it("finds a Windows live match without confusing a different project or profile", async () => {
    const open = live({ id: "windows", cwd: "e:/Developing/Repo" });
    const deps = liveNativeDependencies({
      liveSessions: () => [open], getStored: async () => null, saveNative: async () => true,
    });
    expect(await deps.findNativeSession?.(row({ cwd: "E:\\Developing\\repo\\" }))).toBe(open);
    expect(await deps.findNativeSession?.(row({ cwd: "E:/Developing/Other" }))).toBeUndefined();
    expect(await deps.findNativeSession?.(row({ cwd: open.cwd, providerAccountId: "work" }))).toBeUndefined();
  });
});

describe("archiveProviderConversationRow", () => {
  it("flips MonoCode-only visibility and keeps the list in step", async () => {
    const store = await loadedStore([row()]);
    const setArchived = vi.fn(async () => undefined);
    const syncSession = vi.fn(async () => true);
    const error = await archiveProviderConversationRow({ store, setArchived, syncSession, row: row(), archived: true });
    expect(error).toBeNull();
    expect(setArchived).toHaveBeenCalledWith("k1", true);
    expect(syncSession).not.toHaveBeenCalled();
    expect(store.getSnapshot().claude.rows).toHaveLength(0);
  });

  it("synchronizes an existing MonoCode chat through the archive flow", async () => {
    const linked = row({ monocodeSessionId: "s-9" });
    const store = await loadedStore([linked]);
    const syncSession = vi.fn(async () => true);
    const error = await archiveProviderConversationRow({ store, setArchived: async () => undefined, syncSession, row: linked, archived: true });
    expect(error).toBeNull();
    expect(syncSession).toHaveBeenCalledWith("s-9", true);
  });

  it("rolls the list back when the durable write fails", async () => {
    const store = await loadedStore([row()]);
    const error = await archiveProviderConversationRow({
      store,
      setArchived: async () => { throw new Error("db locked"); },
      syncSession: async () => true,
      row: row(),
      archived: true,
    });
    expect(error).toContain("db locked");
    expect(store.getSnapshot().claude.rows).toHaveLength(1);
  });

  it("undoes the provider flag when the MonoCode chat cannot follow", async () => {
    const linked = row({ monocodeSessionId: "s-9" });
    const store = await loadedStore([linked]);
    const setArchived = vi.fn(async () => undefined);
    const error = await archiveProviderConversationRow({ store, setArchived, syncSession: async () => false, row: linked, archived: true });
    expect(error).toContain("left as it was");
    expect(setArchived.mock.calls).toEqual([["k1", true], ["k1", false]]);
    expect(store.getSnapshot().claude.rows).toHaveLength(1);
  });

  it("reports a partial failure when even the undo fails", async () => {
    const linked = row({ monocodeSessionId: "s-9" });
    const store = await loadedStore([linked]);
    let calls = 0;
    const error = await archiveProviderConversationRow({
      store,
      setArchived: async () => { if (++calls > 1) throw new Error("db gone"); },
      syncSession: async () => { throw new Error("tab busy"); },
      row: linked,
      archived: true,
    });
    expect(error).toContain("could not be updated");
    expect(error).toContain("db gone");
  });
});
