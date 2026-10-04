import { describe, expect, it } from "vitest";
import {
  mergeConversationRows,
  ProviderConversationStore,
  type ProviderListRequest,
} from "./conversationStore";
import type {
  NativeProvider,
  ProviderConversation,
  ProviderConversationPage,
} from "./providerSessions";

function row(
  key: string,
  updatedAt: number,
  extra: Partial<ProviderConversation> = {},
): ProviderConversation {
  return {
    key,
    provider: "claude",
    nativeId: key,
    sourceRoot: "/root",
    providerAccountId: "default",
    title: key,
    cwd: "/work",
    updatedAt,
    archived: false,
    monocodeSessionId: null,
    ...extra,
  };
}

type Deferred = {
  request: ProviderListRequest & { provider: NativeProvider };
  resolve: (page: ProviderConversationPage) => void;
  reject: (error: Error) => void;
};

function harness(accounts: string[] = ["default"]) {
  const calls: Deferred[] = [];
  const store = new ProviderConversationStore({
    list: (provider, request) =>
      new Promise<ProviderConversationPage>((resolve, reject) => {
        calls.push({ request: { ...request, provider }, resolve, reject });
      }),
    accounts: () => accounts,
    accountLabel: (_provider, id) => `label-${id}`,
  });
  return { store, calls };
}
const page = (
  conversations: ProviderConversation[],
  nextOffset: number | null = null,
  diagnostics: string[] = [],
): ProviderConversationPage => ({ conversations, nextOffset, diagnostics });
const tick = (): Promise<void> => new Promise((done) => setTimeout(done, 0));

describe("mergeConversationRows", () => {
  it("dedupes by key keeping the newest and sorts newest first", () => {
    const merged = mergeConversationRows(
      [row("a", 1), row("b", 5)],
      [row("a", 9, { title: "newer" })],
    );
    expect(merged.map((entry) => entry.key)).toEqual(["a", "b"]);
    expect(merged[0].title).toBe("newer");
  });
});

describe("ProviderConversationStore", () => {
  it("retains expanded rows on refresh past the backend page cap", async () => {
    const rows = Array.from({ length: 520 }, (_, index) => row(`chat-${index}`, 1000 - index));
    const requests: ProviderListRequest[] = [];
    const store = new ProviderConversationStore({
      accounts: () => ["default"],
      list: async (_provider, request) => {
        requests.push(request);
        const end = Math.min(rows.length, request.offset + Math.min(request.limit, 500));
        return page(rows.slice(request.offset, end), end === rows.length ? null : end);
      },
    });
    store.setProviders(["claude"]);
    await tick();
    for (let i = 0; i < 51; i += 1) await store.loadMore("claude");
    expect(store.getSnapshot().claude.rows).toHaveLength(520);
    requests.length = 0;
    await store.refresh("claude");
    expect(requests.map((request) => [request.offset, request.limit])).toEqual([[0, 500], [500, 20]]);
    expect(store.getSnapshot().claude.rows).toEqual(rows);
    expect(store.getSnapshot().claude.hasMore).toBe(false);
  });

  it("retries a failed page after a failed refresh without advancing or losing its cursor", async () => {
    const { store, calls } = harness();
    store.setProviders(["claude"]);
    calls[0].resolve(page([row("a", 2)], 10));
    await tick();
    void store.refresh("claude");
    calls[1].reject(new Error("refresh failed"));
    await tick();
    void store.loadMore("claude");
    expect(calls[2].request.offset).toBe(10);
    calls[2].reject(new Error("page failed"));
    await tick();
    expect(store.getSnapshot().claude.rows.map((entry) => entry.key)).toEqual(["a"]);
    void store.loadMore("claude");
    expect(calls[3].request.offset).toBe(10);
    calls[3].resolve(page([row("b", 1)]));
    await tick();
    expect(store.getSnapshot().claude.rows.map((entry) => entry.key)).toEqual(["a", "b"]);
    expect(store.getSnapshot().claude.hasMore).toBe(false);
  });
  it("shows ten total across accounts, then pages older rows without losing buffered chats", async () => {
    const { store, calls } = harness(["default", "work"]);
    store.setProviders(["claude"]);
    expect(calls.map((call) => call.request.limit)).toEqual([10, 10]);
    const rows = Array.from({ length: 30 }, (_, index) => row(`chat-${index}`, 100 - index));
    calls[0].resolve(page(rows.filter((_, i) => i % 2 === 0).slice(0, 10), 10));
    calls[1].resolve(page(rows.filter((_, i) => i % 2 === 1).slice(0, 10), 10));
    await tick();
    expect(store.getSnapshot().claude.rows).toEqual(rows.slice(0, 10));
    void store.loadMore("claude");
    calls[2].resolve(page(rows.filter((_, i) => i % 2 === 0).slice(10), null));
    calls[3].resolve(page(rows.filter((_, i) => i % 2 === 1).slice(10), null));
    await tick();
    expect(store.getSnapshot().claude.rows).toEqual(rows.slice(0, 20));
    expect(store.getSnapshot().claude.hasMore).toBe(true);
    await store.loadMore("claude");
    expect(calls).toHaveLength(4);
    expect(store.getSnapshot().claude.rows).toEqual(rows);
    expect(store.getSnapshot().claude.hasMore).toBe(false);
  });
  it("loads a provider when enabled and shows loading before the first result", async () => {
    const { store, calls } = harness();
    store.setProviders(["claude"]);
    expect(store.getSnapshot().claude.status).toBe("loading");
    expect(store.getSnapshot().codex.status).toBe("idle");
    expect(calls).toHaveLength(1);
    calls[0].resolve(page([row("a", 1)], null, ["bad line skipped"]));
    await tick();
    const state = store.getSnapshot().claude;
    expect(state.status).toBe("ready");
    expect(state.rows).toHaveLength(1);
    expect(state.diagnostics).toEqual(["bad line skipped"]);
  });

  it("ignores a stale response after a newer refresh", async () => {
    const { store, calls } = harness();
    store.setProviders(["claude"]);
    calls[0].resolve(page([row("a", 1)]));
    await tick();
    void store.refresh("claude");
    void store.refresh("claude");
    expect(calls).toHaveLength(3);
    calls[2].resolve(page([row("fresh", 10)]));
    await tick();
    calls[1].resolve(page([row("stale", 99)]));
    await tick();
    expect(store.getSnapshot().claude.rows.map((r) => r.key)).toEqual([
      "fresh",
    ]);
  });

  it("keeps rows on screen during a quiet refresh and on failure", async () => {
    const { store, calls } = harness();
    store.setProviders(["claude"]);
    calls[0].resolve(page([row("a", 1)]));
    await tick();
    void store.refresh("claude", { quiet: true });
    const during = store.getSnapshot().claude;
    expect(during.status).toBe("ready");
    expect(during.refreshing).toBe(true);
    expect(during.rows).toHaveLength(1);
    calls[1].reject(new Error("disk unreadable"));
    await tick();
    const after = store.getSnapshot().claude;
    expect(after.rows).toHaveLength(1);
    expect(after.error).toBe("disk unreadable");
    expect(after.refreshing).toBe(false);
  });

  it("reports an error when the first load fails", async () => {
    const { store, calls } = harness();
    store.setProviders(["codex"]);
    calls[0].reject(new Error("boom"));
    await tick();
    expect(store.getSnapshot().codex).toMatchObject({
      status: "error",
      error: "boom",
      rows: [],
    });
  });

  it("drops in-flight results when the provider is disabled", async () => {
    const { store, calls } = harness();
    store.setProviders(["claude"]);
    store.setProviders([]);
    calls[0].resolve(page([row("late", 1)]));
    await tick();
    expect(store.getSnapshot().claude.rows).toEqual([]);
    expect(store.getSnapshot().claude.status).toBe("idle");
  });

  it("pages with nextOffset and ignores pages from an older generation", async () => {
    const { store, calls } = harness();
    store.setProviders(["claude"]);
    calls[0].resolve(page([row("a", 5)], 1));
    await tick();
    expect(store.getSnapshot().claude.hasMore).toBe(true);
    void store.loadMore("claude");
    expect(calls[1].request.offset).toBe(1);
    void store.loadMore("claude");
    expect(calls).toHaveLength(2);
    calls[1].resolve(page([row("b", 3)], null));
    await tick();
    expect(store.getSnapshot().claude.rows.map((r) => r.key)).toEqual([
      "a",
      "b",
    ]);
    expect(store.getSnapshot().claude.hasMore).toBe(false);

    void store.refresh("claude");
    calls[2].resolve(page([row("a", 5)], 1));
    await tick();
    void store.loadMore("claude");
    void store.refresh("claude");
    calls[3].resolve(page([row("old-page", 1)], null));
    await tick();
    expect(
      store.getSnapshot().claude.rows.some((r) => r.key === "old-page"),
    ).toBe(false);
  });

  it("merges accounts and surfaces a failing account as a diagnostic", async () => {
    const { store, calls } = harness(["default", "work"]);
    store.setProviders(["claude"]);
    expect(calls.map((c) => c.request.accountId)).toEqual(["default", "work"]);
    calls[0].resolve(page([row("a", 1)]));
    calls[1].reject(new Error("home missing"));
    await tick();
    const state = store.getSnapshot().claude;
    expect(state.status).toBe("ready");
    expect(state.rows).toHaveLength(1);
    expect(state.diagnostics).toEqual(["label-work: home missing"]);
  });

  it("refetches when the archived filter changes and patches archive flags locally", async () => {
    const { store, calls } = harness();
    store.setProviders(["claude"]);
    calls[0].resolve(page([row("a", 2), row("b", 1)]));
    await tick();
    const previous = store.setArchivedLocal("a", true);
    expect(store.getSnapshot().claude.rows.map((r) => r.key)).toEqual(["b"]);
    store.restoreRow(previous!.provider, previous!.row);
    expect(store.getSnapshot().claude.rows.map((r) => r.key)).toEqual([
      "a",
      "b",
    ]);
    store.setIncludeArchived(true);
    expect(calls[1].request.includeArchived).toBe(true);
    calls[1].resolve(page([row("a", 2, { archived: true }), row("b", 1)]));
    await tick();
    store.setArchivedLocal("a", false);
    expect(store.getSnapshot().claude.rows[0].archived).toBe(false);
  });
});
