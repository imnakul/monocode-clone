import { describe, expect, it } from "vitest";
import {
  HISTORY_PAGE_ITEMS,
  historyBlocks,
  isHistoryBlock,
  NativeHistoryStore,
  parseProviderHistory,
  trimHistoryBefore,
  visibleHistoryItems,
  withHistory,
  type HistoryLoader,
} from "./history";
import { newSession } from "../../sessions/model/session";

const jsonl = (...rows: unknown[]): string => rows.map((row) => JSON.stringify(row)).join("\n") + "\n";

const claudeFixture = jsonl(
  { type: "summary", summary: "ignored" },
  { type: "user", timestamp: "2026-10-04T00:00:00Z", message: { role: "user", content: "How do I add a route?" } },
  { type: "assistant", timestamp: "2026-10-04T00:00:05Z", message: { role: "assistant", content: [
    { type: "thinking", thinking: "hidden" },
    { type: "text", text: "Use the router." },
    { type: "tool_use", name: "Edit", input: { file_path: "a.ts" } },
  ] } },
  { type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "SECRET OUTPUT" }] } },
  { type: "user", isMeta: true, message: { role: "user", content: "meta" } },
  { type: "user", isSidechain: true, message: { role: "user", content: "subagent" } },
  { type: "user", message: { role: "user", content: "<command-name>/clear</command-name>" } },
  { type: "user", message: { role: "user", content: [{ type: "text", text: "Thanks" }] } },
);

const codexFixture = jsonl(
  { type: "session_meta", payload: { id: "x" } },
  { type: "response_item", payload: { type: "message", role: "developer", content: [{ type: "input_text", text: "dev instructions" }] } },
  { type: "response_item", payload: { type: "message", role: "user", content: [{ type: "input_text", text: "<environment_context>cwd</environment_context>" }] } },
  { type: "response_item", timestamp: "2026-10-04T00:00:00Z", payload: { type: "message", role: "user", content: [{ type: "input_text", text: "Fix the bug" }] } },
  { type: "response_item", payload: { type: "reasoning", summary: [] } },
  { type: "response_item", payload: { type: "function_call", name: "shell", arguments: "{}" } },
  { type: "response_item", payload: { type: "function_call_output", output: "SECRET" } },
  { type: "response_item", payload: { type: "message", role: "assistant", content: [{ type: "output_text", text: "Fixed." }] } },
  "not json",
);

describe("parseProviderHistory", () => {
  it("keeps Claude user text, assistant text and tool names only", () => {
    const items = parseProviderHistory("claude", claudeFixture, "0");
    expect(items.map((i) => [i.role, i.text])).toEqual([
      ["user", "How do I add a route?"],
      ["assistant", "Use the router."],
      ["tool", "Edit"],
      ["user", "Thanks"],
    ]);
    expect(items[0].at).toBe(Date.parse("2026-10-04T00:00:00Z"));
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    expect(JSON.stringify(items)).not.toContain("SECRET");
  });

  it("keeps Codex messages and tool names, skipping injected context and reasoning", () => {
    const items = parseProviderHistory("codex", codexFixture as string, "7");
    expect(items.map((i) => [i.role, i.text])).toEqual([
      ["user", "Fix the bug"],
      ["tool", "shell"],
      ["assistant", "Fixed."],
    ]);
    expect(items[0].id.startsWith("history:7:")).toBe(true);
  });

  it("survives torn lines, empty input and unknown shapes", () => {
    expect(parseProviderHistory("claude", "", "0")).toEqual([]);
    expect(parseProviderHistory("claude", '{"type":"user"\n[1,2]\n{"type":"assistant","message":5}\n', "0")).toEqual([]);
  });

  it("caps very large messages", () => {
    const big = "x".repeat(50_000);
    const [item] = parseProviderHistory("claude", jsonl({ type: "user", message: { content: big } }), "0");
    expect(item.text.length).toBeLessThan(20_100);
    expect(item.text.endsWith("[truncated]")).toBe(true);
  });
});

describe("trimHistoryBefore", () => {
  it("drops items MonoCode already holds as its own turns", () => {
    const items = parseProviderHistory("claude", claudeFixture, "0");
    const cutoff = Date.parse("2026-10-04T00:00:03Z");
    expect(trimHistoryBefore(items, cutoff).map((i) => i.text)).toEqual(["How do I add a route?", "Thanks"]);
    expect(trimHistoryBefore(items, undefined)).toHaveLength(items.length);
  });
});

describe("display blocks", () => {
  it("builds transcript blocks and a divider, tagged so they are never turns", () => {
    const items = parseProviderHistory("claude", claudeFixture, "0");
    const blocks = historyBlocks(items, "claude", { hasEarlier: false, hiddenCount: 0 });
    expect(blocks.every(isHistoryBlock)).toBe(true);
    expect(blocks.find((b) => b.role === "tool")?.tool?.status).toBe("completed");
    const divider = blocks[blocks.length - 1];
    expect(divider).toMatchObject({ role: "system", text: "Earlier in Claude Code" });
    expect(historyBlocks(items, "codex", { hasEarlier: true, hiddenCount: 0 }).at(-1)?.text).toContain("older messages not shown yet");
  });

  it("puts history above session blocks without mutating the session", () => {
    const session = newSession("claude", "/work", "m");
    session.blocks = [{ id: "real-1", role: "user", text: "new turn" }];
    const history = historyBlocks(parseProviderHistory("claude", claudeFixture, "0"), "claude", { hasEarlier: false, hiddenCount: 0 });
    const shown = withHistory(history, session.blocks);
    expect(shown.at(-1)?.id).toBe("real-1");
    expect(session.blocks).toHaveLength(1);
    expect(session.blocks.some(isHistoryBlock)).toBe(false);
    expect(withHistory([], session.blocks)).toBe(session.blocks);
  });
});

function loaderFor(chunks: Record<number, { text: string; start: number; hasEarlier: boolean }>, bound = true): HistoryLoader & { reads: number[] } {
  const reads: number[] = [];
  return {
    reads,
    source: async () => (bound ? { key: "k" } : null),
    read: async ({ end }) => {
      reads.push(end ?? -1);
      const chunk = chunks[end ?? -1];
      if (!chunk) throw new Error("file moved");
      return chunk;
    },
  };
}

describe("NativeHistoryStore", () => {
  it("loads once per session, read-only, and exposes parsed items", async () => {
    const loader = loaderFor({ [-1]: { text: claudeFixture, start: 100, hasEarlier: false } });
    const store = new NativeHistoryStore(loader);
    await store.ensureLoaded("s1", "claude", "default");
    await store.ensureLoaded("s1", "claude", "default");
    expect(loader.reads).toEqual([-1]);
    const state = store.get("s1");
    expect(state.status).toBe("ready");
    expect(visibleHistoryItems(state)).toHaveLength(4);
  });

  it("shows nothing for chats without a native binding or for other providers", async () => {
    const loader = loaderFor({}, false);
    const store = new NativeHistoryStore(loader);
    await store.ensureLoaded("s1", "claude", "default");
    expect(store.get("s1").status).toBe("none");
    await store.ensureLoaded("s2", "cursor", "default");
    expect(store.get("s2").status).toBe("none");
    expect(loader.reads).toEqual([]);
  });

  it("reports why history is unavailable and can retry", async () => {
    const loader = loaderFor({});
    const store = new NativeHistoryStore(loader);
    await store.ensureLoaded("s1", "codex", "default");
    expect(store.get("s1")).toMatchObject({ status: "error", message: "file moved" });
    await store.ensureLoaded("s1", "codex", "default");
    expect(loader.reads).toEqual([-1]);
    await store.ensureLoaded("s1", "codex", "default", true);
    expect(loader.reads).toEqual([-1, -1]);
  });

  it("reveals parsed items in steps, then pages an earlier file chunk", async () => {
    const many = jsonl(...Array.from({ length: HISTORY_PAGE_ITEMS + 50 }, (_, i) => ({ type: "user", message: { content: `m${i}` } })));
    const loader = loaderFor({
      [-1]: { text: many, start: 500, hasEarlier: true },
      500: { text: jsonl({ type: "user", message: { content: "oldest" } }), start: 0, hasEarlier: false },
    });
    const store = new NativeHistoryStore(loader);
    await store.ensureLoaded("s1", "claude", "default");
    expect(visibleHistoryItems(store.get("s1"))).toHaveLength(HISTORY_PAGE_ITEMS);
    await store.showEarlier("s1");
    expect(visibleHistoryItems(store.get("s1"))).toHaveLength(HISTORY_PAGE_ITEMS + 50);
    expect(loader.reads).toEqual([-1]);
    await store.showEarlier("s1");
    expect(loader.reads).toEqual([-1, 500]);
    const state = store.get("s1");
    expect(state).toMatchObject({ status: "ready", hasEarlier: false });
    expect(visibleHistoryItems(state)[0].text).toBe("oldest");
  });

  it("keeps loaded history when an earlier chunk fails", async () => {
    const loader = loaderFor({ [-1]: { text: claudeFixture, start: 9, hasEarlier: true } });
    const store = new NativeHistoryStore(loader);
    await store.ensureLoaded("s1", "claude", "default");
    await store.showEarlier("s1");
    const state = store.get("s1");
    expect(state).toMatchObject({ status: "ready", earlierError: "file moved", loadingEarlier: false });
    expect(visibleHistoryItems(state)).toHaveLength(4);
  });

  it("drops a deleted chat and ignores a read that finishes afterwards", async () => {
    let finish: (chunk: { text: string; start: number; hasEarlier: boolean }) => void = () => undefined;
    const store = new NativeHistoryStore({
      source: async () => ({ key: "k" }),
      read: () => new Promise((resolve) => { finish = resolve; }),
    });
    const pending = store.ensureLoaded("s1", "claude", "default");
    await Promise.resolve();
    await Promise.resolve();
    store.forget("s1");
    finish({ text: claudeFixture, start: 0, hasEarlier: false });
    await pending;
    expect(store.get("s1").status).toBe("none");
  });
});
