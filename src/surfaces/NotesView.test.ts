import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotesView } from "./NotesView";
import type { Note } from "../lib/notes";
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

function makeNote(overrides: Partial<Note> & Pick<Note, "id" | "title">): Note {
  return {
    id: overrides.id,
    slug: overrides.slug ?? overrides.title.toLowerCase().replace(/\s+/g, "-"),
    title: overrides.title,
    body: overrides.body ?? `Content for ${overrides.title}`,
    createdAt: overrides.createdAt ?? 1000,
    updatedAt: overrides.updatedAt ?? 2000,
    sourceCwd: overrides.sourceCwd,
  };
}

let mockNotesList: Note[] = [];

vi.mock("../lib/notes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/notes")>();
  return {
    ...actual,
    peekNotes: () => mockNotesList,
    loadNotes: async () => mockNotesList,
  };
});

describe("NotesView shared-hover integration", () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it("mounts SharedHoverHighlight inside relative scroll container with continuity on list and hover attributes on cards", () => {
    const note1 = makeNote({
      id: "n1",
      title: "First Note",
    });
    const note2 = makeNote({
      id: "n2",
      title: "Second Note",
    });
    mockNotesList = [note1, note2];

    const markup = renderToStaticMarkup(
      createElement(NotesView, {
        cwd: "/mock/repo",
        onClose: () => {},
      }),
    );

    // 1. The search / new note toolbar is outside the marker's scroll root
    expect(markup).toContain('placeholder="Filter notes"');
    const toolbarIndex = markup.indexOf('placeholder="Filter notes"');
    const markerIndex = markup.indexOf('data-shared-hover-highlight="true"');
    expect(toolbarIndex).toBeGreaterThan(-1);
    expect(markerIndex).toBeGreaterThan(toolbarIndex);

    // 2. The scroll container has relative positioning for the marker root
    expect(markup).toContain(
      'class="relative min-h-0 flex-1 overflow-y-auto overscroll-none"',
    );

    // 3. SharedHoverHighlight is mounted directly at the top of the scroll container
    expect(markup).toContain(
      '<div class="relative min-h-0 flex-1 overflow-y-auto overscroll-none"><span aria-hidden="true" data-shared-hover-highlight="true"',
    );

    // 4. The notes container ul has shared-hover continuity
    expect(markup).toContain(
      `${SHARED_HOVER_CONTINUITY_ATTR}="true" class="flex flex-col gap-0.5 p-1.5"`,
    );

    // 5. Note cards are registered with data-shared-hover-item
    const cardMatches =
      markup.match(/data-shared-hover-item="true"/g) || [];
    expect(cardMatches.length).toBe(2);

    // 6. The active Note card preserves its background
    expect(markup).toContain(
      'data-shared-hover-item="true" data-shared-hover-preserve="" title="First Note"',
    );

    // 7. Inactive Note cards do not receive data-shared-hover-preserve
    expect(markup).toContain(
      'data-shared-hover-item="true" title="Second Note"',
    );
    expect(markup).not.toContain(
      'data-shared-hover-preserve="" title="Second Note"',
    );
  });
});
