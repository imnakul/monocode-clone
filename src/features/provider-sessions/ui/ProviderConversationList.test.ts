import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProviderConversationList } from "./ProviderConversationList";
import { emptyProviderListState } from "../model/conversationStore";
import type { ProviderListState } from "../model/conversationStore";
import type { ProviderConversation } from "../model/providerSessions";
import { conversationSummary } from "../model/conversationSummary";
import { newSession } from "../../sessions/model/session";

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
    removeItem: (k: string) => void storage.delete(k),
    clear: () => storage.clear(),
    key: () => null,
    length: 0,
  },
  configurable: true,
});

function row(key: string, extra: Partial<ProviderConversation> = {}): ProviderConversation {
  return {
    key,
    provider: "claude",
    nativeId: key,
    sourceRoot: "/root",
    providerAccountId: "default",
    title: `Title ${key}`,
    cwd: "/Users/dev/acme-app",
    updatedAt: 1_700_000_000,
    archived: false,
    monocodeSessionId: null,
    ...extra,
  };
}

function render(state: Partial<ProviderListState>, extra: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(
    createElement(ProviderConversationList, {
      provider: "claude",
      state: { ...emptyProviderListState, ...state },
      showArchived: false,
      openingKey: null,
      actionError: null,
      onShowArchivedChange: vi.fn(),
      onRefresh: vi.fn(),
      onLoadMore: vi.fn(),
      onOpen: vi.fn(),
      onArchive: vi.fn(),
      onDismissActionError: vi.fn(),
      ...extra,
    }),
  );
}

describe("conversationSummary", () => {
  it("preserves cloud-only navigation without local empty text or archive filters", () => {
    const html = render({ status: "ready" }, { cloudOnly: true, cloudRecords: [{
      provider: "claude", id: "cloud-one", url: "https://claude.ai/chat/cloud-one", cwd: "/repo", providerAccountId: "default", createdAt: 1,
    }], onOpenCloud: vi.fn() });
    expect(html).toContain("Claude cloud sessions");
    expect(html).toContain("Cloud task cloud-one");
    expect(html).not.toContain("No Claude conversations found");
    expect(html).not.toContain("Filter conversations");
    expect(html).toContain("Refresh Claude cloud sessions");
  });
  it("maps epoch seconds to the card's milliseconds and shows the project folder", () => {
    const summary = conversationSummary(row("a", { archived: true }));
    expect(summary.id).toBe("a");
    expect(summary.updatedAt).toBe(1_700_000_000_000);
    expect(summary.activeTurnModel?.name).toBe("acme-app");
    expect(summary.archived).toBe(true);
  });

  it("handles Windows paths and blank titles", () => {
    const summary = conversationSummary(
      row("b", { cwd: "C:\\work\\site", title: "  " }),
    );
    expect(summary.activeTurnModel?.name).toBe("site");
    expect(summary.title).toBe("Untitled conversation");
  });
});

describe("ProviderConversationList", () => {
  it("renders confirmed RC status and saved paused intent without claiming Codex RC", () => {
    const session = { ...newSession("claude", "/repo"), providerSessionId: "on", remoteControlStatus: "on" as const };
    const state = { status: "ready" as const, rows: [row("on"), row("paused", { monocodeSessionId: "saved" }), row("off")] };
    const extra = { sessions: [session], remoteControlDesired: new Set([session.id, "saved"]) };
    const html = render(state, extra);
    // A PC icon only when Remote Control is turned on; nothing when off.
    expect(html).toContain('data-remote-control-indicator="On"');
    expect(html).toContain('data-remote-control-indicator="Paused"');
    expect(html).not.toContain('data-remote-control-indicator="Off"');
    expect(html.match(/data-remote-control-indicator=/g)).toHaveLength(2);
    expect(render({ status: "ready", rows: [row("codex", { provider: "codex" })] }, { provider: "codex", ...extra })).not.toContain("data-remote-control-indicator");
  });
  it("shows a labelled skeleton while the first load runs", () => {
    const html = render({ status: "loading" });
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Loading Claude conversations");
    expect(html).toContain("Claude conversations");
  });

  it("explains an empty result truthfully", () => {
    const html = render({ status: "ready" });
    expect(html).toContain("No Claude conversations found on this computer");
    expect(html).toContain("Archived ones are hidden");
  });

  it("renders rows with an archive action and no fake loading", () => {
    const html = render({
      status: "ready",
      rows: [row("a"), row("b", { monocodeSessionId: "s-1" })],
    }, { activeSessionId: "s-1" });
    expect(html).toContain("Title a");
    expect(html).toContain("Title b");
    expect(html).toContain("Archive Title a");
    expect(html).toContain('aria-current="true"');
    expect(html).not.toContain("aria-busy");
    expect(html).toContain("data-session-list");
  });

  it("shows an unarchive action for archived rows", () => {
    const html = render({ status: "ready", rows: [row("a", { archived: true })] }, { showArchived: true });
    expect(html).toContain("Unarchive Title a");
  });

  it("keeps rows visible beside a read error and offers Retry", () => {
    const html = render({ status: "ready", rows: [row("a")], error: "disk unreadable" });
    expect(html).toContain('role="alert"');
    expect(html).toContain("Could not read Claude conversations. disk unreadable");
    expect(html).toContain("Retry");
    expect(html).toContain("Title a");
  });

  it("shows retained cloud-list errors beside any previously loaded tasks", () => {
    const html = render(
      { status: "ready" },
      {
        cloudError: "Account A is unavailable",
        cloudRecords: [
          {
            provider: "claude",
            id: "cloud-1",
            url: "https://claude.ai/code/cloud-1",
            cwd: "/Users/dev/acme-app",
            providerAccountId: "account-a",
            environmentId: null,
            branch: null,
            createdAt: 10,
          },
        ],
        onOpenCloud: vi.fn(),
      },
    );
    expect(html).toContain("Could not read retained Claude cloud tasks");
    expect(html).toContain("Account A is unavailable");
    expect(html).toContain("cloud-1");
    expect(html).toContain("Retry");
  });

  it("shows an error state when nothing loaded", () => {
    const html = render({ status: "error", error: "boom" });
    expect(html).toContain("boom");
    expect(html).not.toContain("No Claude conversations found");
  });

  it("surfaces diagnostics even when rows are valid", () => {
    const html = render({ status: "ready", rows: [row("a")], diagnostics: ["a.jsonl skipped", "b.jsonl skipped"] });
    expect(html).toContain("2 items could not be read");
    expect(html).toContain("Title a");
  });

  it("offers paging only when more is available and disables it while loading", () => {
    expect(render({ status: "ready", rows: [row("a")] })).not.toContain("Show more");
    expect(render({ status: "ready", rows: [row("a")], hasMore: true })).toContain("Show more");
    const loading = render({ status: "ready", rows: [row("a")], hasMore: true, loadingMore: true });
    expect(loading).toContain("Loading…");
    expect(loading).toContain("disabled");
  });

  it("shows the refresh icon spinning only during a refresh", () => {
    expect(render({ status: "ready", refreshing: true })).toContain("animate-spin");
    expect(render({ status: "ready" })).not.toContain("animate-spin");
  });

  it("disables Show more while the provider refresh replaces its paging cursors", () => {
    const state = { status: "ready" as const, rows: [row("a")], hasMore: true };
    expect(render({ ...state, refreshing: true })).toMatch(/<button[^>]*disabled=""[^>]*>Show more<\/button>/);
    expect(render(state)).not.toMatch(/<button[^>]*disabled=""[^>]*>Show more<\/button>/);
  });

  it("reports an action error and lets the user dismiss it", () => {
    const html = render({ status: "ready" }, { actionError: "Native conversation identity changed." });
    expect(html).toContain("Native conversation identity changed.");
    expect(html).toContain("Dismiss message");
  });
});
