import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { ChatPanel } from "./ChatPanel";
import type { SessionSummary } from "../lib/sessionStore";
import { SHARED_HOVER_CONTINUITY_ATTR } from "../chrome/SharedHoverHighlight";

const mockStorage = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => mockStorage.get(k) ?? null,
  setItem: (k: string, v: string) => {
    mockStorage.set(k, String(v));
  },
  removeItem: (k: string) => {
    mockStorage.delete(k);
  },
  clear: () => {
    mockStorage.clear();
  },
  key: (i: number) => [...mockStorage.keys()][i] ?? null,
  get length() {
    return mockStorage.size;
  },
};

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  configurable: true,
});

if (typeof window === "undefined") {
  Object.defineProperty(globalThis, "window", {
    value: {
      innerWidth: 1024,
      innerHeight: 768,
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    configurable: true,
  });
}

describe("ChatPanel shared-hover continuity", () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  const makeChat = (
    id: string,
    title: string,
    pinned = false,
  ): SessionSummary => ({
    id,
    title,
    pinned,
    archived: false,
    createdAt: 1000,
    updatedAt: 2000,
    harness: "claude",
  });

  it("does not render its own SharedHoverHighlight (relies on Sidebar marker)", () => {
    const markup = renderToStaticMarkup(
      createElement(ChatPanel, {
        chats: [makeChat("c1", "Chat 1")],
        creating: false,
        error: null,
        onSelect: () => {},
        onNew: () => {},
      }),
    );

    expect(markup).not.toContain("data-shared-hover-highlight");
  });

  it("applies continuity to Sidechats in their own scoped list", () => {
    const sidechats = [
      makeChat("sc1", "Sidechat 1"),
      makeChat("sc2", "Sidechat 2"),
    ];

    const markup = renderToStaticMarkup(
      createElement(ChatPanel, {
        chats: [],
        sidechats,
        creating: false,
        error: null,
        onSelect: () => {},
        onNew: () => {},
      }),
    );

    // Sidechats ul has continuity and contains both sidechats
    expect(markup).toMatch(
      new RegExp(
        `Sidechats[\\s\\S]*?<ul[^>]*${SHARED_HOVER_CONTINUITY_ATTR}[^>]*>[\\s\\S]*?Sidechat 1[\\s\\S]*?Sidechat 2`,
      ),
    );
  });

  it("groups contiguous ordinary chats into scoped continuity regions separated by dividers", () => {
    const chats = [
      makeChat("c1", "Pinned Chat 1", true),
      makeChat("c2", "Pinned Chat 2", true),
      makeChat("c3", "Chat 3", false),
      makeChat("c4", "Chat 4", false),
    ];

    const markup = renderToStaticMarkup(
      createElement(ChatPanel, {
        chats,
        creating: false,
        error: null,
        onSelect: () => {},
        onNew: () => {},
      }),
    );

    // Two continuity groups in main chats: pinned [c1, c2] and unpinned [c3, c4]
    const continuityMatches =
      markup.match(new RegExp(SHARED_HOVER_CONTINUITY_ATTR, "g")) || [];
    expect(continuityMatches.length).toBe(2);

    // Pinned group contains c1 and c2
    expect(markup).toMatch(
      new RegExp(
        `${SHARED_HOVER_CONTINUITY_ATTR}[^>]*>[\\s\\S]*?Pinned Chat 1[\\s\\S]*?Pinned Chat 2`,
      ),
    );

    // Unpinned group contains c3 and c4
    expect(markup).toMatch(
      new RegExp(
        `${SHARED_HOVER_CONTINUITY_ATTR}[^>]*>[\\s\\S]*?Chat 3[\\s\\S]*?Chat 4`,
      ),
    );

    // Divider is outside continuity lists
    expect(markup).toContain('<div class="h-px bg-content/10"></div>');
    expect(markup).toContain(
      '</ul></li><li aria-hidden="true" class="mx-1 my-1 list-none"><div class="h-px bg-content/10"></div></li><li class="list-none"><ul data-shared-hover-continuity="true"',
    );
  });

  it("applies continuity to expanded folder members while excluding folder headers", () => {
    const chats = [
      makeChat("fc1", "Folder Chat 1", false),
      makeChat("fc2", "Folder Chat 2", false),
      makeChat("u1", "Ungrouped Chat 1", false),
    ];

    const mockFolder = {
      id: "folder-chats-1",
      name: "Research Chats",
      sessionIds: ["fc1", "fc2"],
      collapsed: false,
    };

    localStorage.setItem(
      "monocode.sessionFolders",
      JSON.stringify({
        chats: [mockFolder],
      }),
    );

    const markup = renderToStaticMarkup(
      createElement(ChatPanel, {
        chats,
        creating: false,
        error: null,
        onSelect: () => {},
        onNew: () => {},
      }),
    );

    localStorage.removeItem("monocode.sessionFolders");

    // Folder members list has continuity
    expect(markup).toMatch(
      new RegExp(
        `${SHARED_HOVER_CONTINUITY_ATTR}[^>]*class="mt-0.5 flex flex-col gap-0.5 pl-2"[^>]*>[\\s\\S]*?Folder Chat 1[\\s\\S]*?Folder Chat 2`,
      ),
    );

    // Folder header is outside any continuity container
    expect(markup).toContain("Research Chats");
    expect(markup).not.toMatch(
      new RegExp(
        `<ul[^>]*${SHARED_HOVER_CONTINUITY_ATTR}[^>]*>(?:(?!<\\/ul>)[\\s\\S])*?Research Chats`,
      ),
    );
  });
});
