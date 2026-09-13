import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InboxItem } from "../lib/githubTasks";
import type { SessionSummary } from "../lib/sessionStore";
import { InboxDetail, InboxView } from "./InboxView";
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
    provider: "github",
    kind: "issue",
    title: "Issue Title",
    url: "https://github.com/acme/web/issues/1",
    state: "open",
    number: 1,
    author: "octocat",
    repo: "web",
    org: "acme",
    labels: [],
    unread: false,
    reason: "subscribed",
    summary: null,
    codeRabbitStatus: "missing",
    projectPath: "/mock/repo",
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

    expect(markup).toContain(
      'class="relative min-h-0 flex-1 overflow-y-auto overscroll-none"',
    );
    expect(markup).toContain(
      '<div class="relative min-h-0 flex-1 overflow-y-auto overscroll-none"><span aria-hidden="true" data-shared-hover-highlight="true"',
    );
    expect(markup).toContain(
      `data-shared-hover-continuity="true" class="flex flex-col gap-0.5 p-1.5"`,
    );

    const cardItemMatches =
      markup.match(/data-shared-hover-item="true"/g) || [];
    expect(cardItemMatches.length).toBe(2);

    expect(markup).toContain(
      'data-shared-hover-item="true" data-shared-hover-preserve="" title="First issue"',
    );
    expect(markup).toContain(
      'data-shared-hover-item="true" title="Second issue"',
    );
    expect(markup).not.toContain(
      'data-shared-hover-preserve="" title="Second issue"',
    );
  });
});

function detailItem(overrides: Partial<InboxItem> = {}): InboxItem {
  return {
    provider: "github",
    kind: "issue",
    title: "A long inbox issue",
    url: "https://github.com/acme/web/issues/157",
    state: "open",
    updatedAt: "2026-09-11T08:00:00Z",
    author: "octocat",
    repo: "web",
    org: "acme",
    labels: [],
    unread: false,
    reason: "subscribed",
    summary: null,
    codeRabbitStatus: "missing",
    number: 157,
    projectPath: "/tmp/web",
    ...overrides,
  };
}

function renderDetail(
  inboxItem: InboxItem,
  relatedSessions: SessionSummary[] = [],
) {
  return renderToStaticMarkup(
    createElement(InboxDetail, {
      item: inboxItem,
      cwd: "/tmp/web",
      projects: [],
      revision: 0,
      relatedSessions,
      onDiscuss: () => {},
      onStart: () => {},
    }),
  );
}

describe("InboxDetail layout", () => {
  it("keeps issue identity and actions outside the body scroller", () => {
    const markup = renderDetail(detailItem({ projectPath: "/tmp/local-project" }));
    const headerIndex = markup.indexOf("data-inbox-detail-header");
    const scrollIndex = markup.indexOf("data-inbox-detail-scroll");
    const header = markup.slice(headerIndex, scrollIndex);
    const body = markup.slice(scrollIndex);

    expect(headerIndex).toBeGreaterThan(-1);
    expect(scrollIndex).toBeGreaterThan(headerIndex);
    expect(header).toContain("line-clamp-2");
    expect(header).toContain('title="A long inbox issue"');
    expect(header).toContain("Send to agent");
    expect(header).toContain("Ask");
    expect(header).toContain("Open on GitHub");
    expect(header).toContain("Unassigned");
    expect(header).toContain("whitespace-nowrap");
    expect(header).not.toContain("local-project");
    expect(header).not.toContain("overflow-y-auto");
    expect(header).not.toContain("bg-background-base");
    expect(body).toContain("overflow-y-auto");
    expect(body).not.toContain("Unassigned");
  });

  it("keeps pull request tabs in the pinned header", () => {
    const markup = renderDetail(detailItem({ kind: "pr" }));
    const headerIndex = markup.indexOf("data-inbox-detail-header");
    const scrollIndex = markup.indexOf("data-inbox-detail-scroll");
    const header = markup.slice(headerIndex, scrollIndex);

    expect(header).toContain('aria-label="Pull request sections"');
    expect(header).toContain("Summary");
    expect(header).toContain("Code");
  });

  it("keeps the Linear project picker beside the pinned send action", () => {
    const markup = renderDetail(
      detailItem({
        provider: "linear",
        kind: "linear",
        id: "linear-157",
        identifier: "ENG-157",
        teamName: "Engineering",
      }),
    );
    const headerIndex = markup.indexOf("data-inbox-detail-header");
    const scrollIndex = markup.indexOf("data-inbox-detail-scroll");
    const header = markup.slice(headerIndex, scrollIndex);

    expect(header).toContain("Send to agent");
    expect(header).toContain("Choose project");
    expect(header).not.toContain("overflow-y-auto");
  });

  it("keeps related threads in the pinned header", () => {
    const markup = renderDetail(detailItem(), [
      {
        id: "session-1",
        cwd: "/tmp/web",
        harness: "codex",
        model: "gpt-5",
        runtimeMode: "supervised",
        title: "Review MonoCode Pull Request",
        createdAt: 1,
        updatedAt: 1,
      },
    ]);
    const headerIndex = markup.indexOf("data-inbox-detail-header");
    const scrollIndex = markup.indexOf("data-inbox-detail-scroll");
    const header = markup.slice(headerIndex, scrollIndex);
    const body = markup.slice(scrollIndex);

    expect(header).toContain("Related thread");
    expect(header).toContain("Review MonoCode Pull Request");
    expect(body).not.toContain("Review MonoCode Pull Request");
  });
});
