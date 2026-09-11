import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InboxView } from "./InboxView";
import type { InboxItem } from "../lib/githubTasks";
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

function mockItem(
  overrides: Partial<InboxItem> & Pick<InboxItem, "number" | "updatedAt">,
): InboxItem {
  return {
    kind: "issue",
    title: "Issue Title",
    url: "https://github.com/acme/web/issues/1",
    state: "open",
    labels: [],
    assignees: [],
    draft: false,
    repo: "acme/web",
    projectPath: "/mock/repo",
    provider: "github",
    ...overrides,
  };
}

let mockInboxItems: InboxItem[] = [];

vi.mock("../lib/githubTasks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/githubTasks")>();
  return {
    ...actual,
    peekInboxList: () => ({
      items: mockInboxItems,
      errors: {},
    }),
    listInboxItems: async () => ({
      items: mockInboxItems,
      errors: {},
    }),
  };
});

describe("InboxView shared-hover integration", () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it("mounts SharedHoverHighlight inside relative scroll container with continuity on list and hover attributes on cards", () => {
    const item1 = mockItem({
      number: 101,
      title: "First issue",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    const item2 = mockItem({
      number: 102,
      title: "Second issue",
      updatedAt: "2026-01-02T00:00:00Z",
    });
    mockInboxItems = [item1, item2];

    const markup = renderToStaticMarkup(
      createElement(InboxView, {
        cwd: "/mock/repo",
        recents: [
          {
            path: "/mock/repo",
            name: "repo",
            lastOpened: Date.now(),
          },
        ],
      }),
    );

    // 1. Scroll container has relative positioning for the marker root
    expect(markup).toContain(
      'class="relative min-h-0 flex-1 overflow-y-auto overscroll-none"',
    );

    // 2. SharedHoverHighlight is mounted directly at the top of the scroll container
    expect(markup).toContain(
      '<div class="relative min-h-0 flex-1 overflow-y-auto overscroll-none"><span aria-hidden="true" data-shared-hover-highlight="true"',
    );

    // 3. The cards container ul has shared-hover continuity
    expect(markup).toContain(
      `data-shared-hover-continuity="true" class="flex flex-col gap-0.5 p-1.5"`,
    );

    // 4. Inbox cards are registered with data-shared-hover-item
    const cardItemMatches =
      markup.match(/data-shared-hover-item="true"/g) || [];
    expect(cardItemMatches.length).toBe(2);

    // 5. The active/selected card (default first item) preserves its background
    expect(markup).toContain(
      'data-shared-hover-item="true" data-shared-hover-preserve="" title="First issue"',
    );

    // 6. Inactive cards do not have data-shared-hover-preserve
    expect(markup).toContain(
      'data-shared-hover-item="true" title="Second issue"',
    );
    expect(markup).not.toContain(
      'data-shared-hover-preserve="" title="Second issue"',
    );
  });
});
