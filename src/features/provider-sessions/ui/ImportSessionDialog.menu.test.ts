// @vitest-environment happy-dom
import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { ImportSessionDialog } from "./ImportSessionDialog";
import { ProviderConversationList } from "./ProviderConversationList";
import { ExplorerMenu, type ExplorerMenuItem } from "../../files/ui/ExplorerMenu";
import { Modal } from "../../../shared/ui/Modal";
import { emptyProviderListState } from "../model/conversationStore";
import type { ProviderConversation } from "../model/providerSessions";
import { LAYER } from "../../../shared/lib/layers";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

const row: ProviderConversation = {
  key: '["claude","/home/.claude","native-one"]',
  provider: "claude",
  nativeId: "native-one",
  sourceRoot: "/home/.claude",
  providerAccountId: "default",
  title: "Saved session title",
  cwd: "/repo",
  updatedAt: 1_700_000_000,
  archived: false,
  monocodeSessionId: null,
};

const listProps = {
  provider: "claude" as const,
  state: {
    ...emptyProviderListState,
    status: "ready" as const,
    rows: [row],
  },
  showArchived: false,
  openingKey: null,
  actionError: null,
  onShowArchivedChange: vi.fn(),
  onRefresh: vi.fn(),
  onLoadMore: vi.fn(),
  onOpen: vi.fn(),
  onArchive: vi.fn(),
  onDismissActionError: vi.fn(),
};

const nestedItems: ExplorerMenuItem[] = [
  {
    kind: "item",
    id: "more",
    label: "More",
    submenu: [{ kind: "item", id: "child", label: "Child action" }],
  },
];

function NestedMenuDialog({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(true);
  return createElement(Modal, {
    title: "Nested menu dialog",
    onClose,
    children: open
      ? createElement(ExplorerMenu, {
          x: 40,
          y: 40,
          layer: LAYER.dialogPopover,
          ariaLabel: "Nested actions",
          items: nestedItems,
          onPick: () => setOpen(false),
          onClose: () => setOpen(false),
        })
      : null,
  });
}

let root: Root;
let container: HTMLDivElement;
const close = vi.fn();

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  class TestResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  vi.stubGlobal("ResizeObserver", TestResizeObserver);
  vi.mocked(invoke).mockReset().mockResolvedValue({
    conversations: [row],
    diagnostics: [],
    nextOffset: null,
  });
  close.mockReset();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function click(element: HTMLElement): Promise<void> {
  await act(async () => element.click());
}

async function escapeFrom(element: HTMLElement): Promise<void> {
  await act(async () => {
    element.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
  });
}

function menu(label: string): HTMLElement {
  const result = document.body.querySelector<HTMLElement>(
    `[role="menu"][aria-label="${label}"]`,
  );
  if (!result) throw new Error(`Missing ${label} menu`);
  return result;
}

function assertLayer(menuElement: HTMLElement, layer: number): void {
  expect(menuElement.parentElement?.style.zIndex).toBe(String(layer));
}

async function openFilterMenu(): Promise<HTMLElement> {
  const filter = document.body.querySelector<HTMLButtonElement>(
    '[aria-label="Filter conversations"]',
  );
  if (!filter) throw new Error("Missing conversation filter button");
  await click(filter);
  return menu("Conversation filters");
}

async function openContextMenu(): Promise<HTMLElement> {
  const card = document.body.querySelector<HTMLElement>("[data-session-card]");
  if (!card) throw new Error("Missing conversation row");
  await act(async () => {
    card.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        clientX: 120,
        clientY: 90,
      }),
    );
  });
  return menu("Conversation actions");
}

describe("conversation menus in Import session", () => {
  it("keeps filter and point-anchored context menus above the dialog on Escape", async () => {
    await act(async () =>
      root.render(
        createElement(ImportSessionDialog, {
          providers: ["claude"],
          onResume: vi.fn(async () => undefined),
          onClose: close,
        }),
      ),
    );
    const dialog = document.body.querySelector('[role="dialog"][aria-modal="true"]');
    expect(dialog).not.toBeNull();

    const filters = await openFilterMenu();
    expect(filters.hasAttribute("data-dialog-popover")).toBe(true);
    expect(document.activeElement).toBe(filters);
    assertLayer(filters, LAYER.dialogPopover);
    await escapeFrom(filters);
    expect(document.body.querySelector('[role="menu"][aria-label="Conversation filters"]')).toBeNull();
    expect(document.body.querySelector('[role="dialog"][aria-modal="true"]')).not.toBeNull();
    expect(close).not.toHaveBeenCalled();

    const actions = await openContextMenu();
    expect(actions.hasAttribute("data-dialog-popover")).toBe(true);
    expect(document.activeElement).toBe(actions);
    assertLayer(actions, LAYER.dialogPopover);
    await escapeFrom(actions);
    expect(document.body.querySelector('[role="menu"][aria-label="Conversation actions"]')).toBeNull();
    expect(document.body.querySelector('[role="dialog"][aria-modal="true"]')).not.toBeNull();
    expect(close).not.toHaveBeenCalled();
  });

  it("keeps the existing filter and context menu layers outside dialogs", async () => {
    await act(async () => root.render(createElement(ProviderConversationList, listProps)));

    const filters = await openFilterMenu();
    expect(filters.hasAttribute("data-dialog-popover")).toBe(false);
    assertLayer(filters, LAYER.submenu);
    await escapeFrom(filters);
    expect(document.body.querySelector('[role="menu"][aria-label="Conversation filters"]')).toBeNull();

    const actions = await openContextMenu();
    expect(actions.hasAttribute("data-dialog-popover")).toBe(false);
    assertLayer(actions, LAYER.popover);
    await escapeFrom(actions);
    expect(document.body.querySelector('[role="menu"][aria-label="Conversation actions"]')).toBeNull();
  });

  it("raises nested dialog menus and handles Escape one layer at a time", async () => {
    await act(async () =>
      root.render(createElement(NestedMenuDialog, { onClose: close })),
    );
    const parent = menu("Nested actions");
    const more = [...parent.querySelectorAll("button")].find(
      (button) => button.textContent?.includes("More"),
    );
    if (!more) throw new Error("Missing nested-menu trigger");
    await click(more);

    const child = menu("More");
    expect(parent.hasAttribute("data-dialog-popover")).toBe(true);
    expect(child.hasAttribute("data-dialog-popover")).toBe(true);
    assertLayer(parent, LAYER.dialogPopover);
    assertLayer(child, LAYER.dialogPopover + 1);
    expect(document.activeElement).toBe(child);

    await escapeFrom(child);
    expect(document.body.querySelector('[role="menu"][aria-label="More"]')).toBeNull();
    expect(menu("Nested actions")).toBe(parent);
    expect(document.body.querySelector('[role="dialog"][aria-modal="true"]')).not.toBeNull();
    expect(close).not.toHaveBeenCalled();

    await escapeFrom(parent);
    expect(document.body.querySelector('[role="menu"][aria-label="Nested actions"]')).toBeNull();
    expect(document.body.querySelector('[role="dialog"][aria-modal="true"]')).not.toBeNull();
    expect(close).not.toHaveBeenCalled();
  });
});
