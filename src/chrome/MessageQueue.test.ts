import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MessageQueue } from "./Composer";
import { dequeueQueuedMessage } from "../lib/messageQueue";
import { newSession, type QueuedMessage, type Session } from "../lib/session";

function queued(id: string, text = id): QueuedMessage {
  return { id, text, attachments: [] };
}

// Lightweight DOM shim for React 19 client rendering in Node environment
class FakeNode {
  nodeType: number;
  nodeName: string;
  tagName: string;
  childNodes: FakeNode[];
  parentNode: FakeNode | null = null;
  attributes: Record<string, string>;
  style: Record<string, string>;
  ownerDocument: unknown = null;
  nodeValue: string | null = null;

  constructor(type = 1, name = "DIV") {
    this.nodeType = type;
    this.nodeName = name;
    this.tagName = name;
    this.childNodes = [];
    this.attributes = {};
    this.style = {};
  }

  appendChild(child: FakeNode): FakeNode {
    this.childNodes.push(child);
    child.parentNode = this;
    return child;
  }

  removeChild(child: FakeNode): FakeNode {
    const idx = this.childNodes.indexOf(child);
    if (idx !== -1) this.childNodes.splice(idx, 1);
    child.parentNode = null;
    return child;
  }

  insertBefore(newChild: FakeNode, refChild: FakeNode): FakeNode {
    const idx = this.childNodes.indexOf(refChild);
    if (idx !== -1) this.childNodes.splice(idx, 0, newChild);
    else this.childNodes.push(newChild);
    newChild.parentNode = this;
    return newChild;
  }

  setAttribute(name: string, val: unknown): void {
    this.attributes[name] = String(val);
  }

  removeAttribute(name: string): void {
    delete this.attributes[name];
  }

  getAttribute(name: string): string | undefined {
    return this.attributes[name];
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  focus(): void {}
  blur(): void {}
}

function setupFakeDOM(): { container: FakeNode; root: ReturnType<typeof createRoot> } {
  const doc = {
    nodeType: 9,
    nodeName: "#document",
    createElement(tag: string): FakeNode {
      const el = new FakeNode(1, tag.toUpperCase());
      el.ownerDocument = doc;
      return el;
    },
    createElementNS(_ns: string, tag: string): FakeNode {
      return this.createElement(tag);
    },
    createTextNode(text: string): FakeNode {
      const el = new FakeNode(3, "#text");
      el.nodeValue = text;
      el.ownerDocument = doc;
      return el;
    },
    createComment(text: string): FakeNode {
      const el = new FakeNode(8, "#comment");
      el.nodeValue = text;
      el.ownerDocument = doc;
      return el;
    },
    addEventListener(): void {},
    removeEventListener(): void {},
    defaultView: null as unknown,
  };

  const win = {
    document: doc,
    addEventListener(): void {},
    removeEventListener(): void {},
    HTMLIFrameElement: class {},
    Element: FakeNode,
    HTMLElement: FakeNode,
  };
  doc.defaultView = win;

  (globalThis as unknown as { Node: unknown }).Node = FakeNode;
  (globalThis as unknown as { Element: unknown }).Element = FakeNode;
  (globalThis as unknown as { HTMLElement: unknown }).HTMLElement = FakeNode;
  (globalThis as unknown as { HTMLIFrameElement: unknown }).HTMLIFrameElement = class {};
  (globalThis as unknown as { document: unknown }).document = doc;
  (globalThis as unknown as { window: unknown }).window = win;
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  const container = doc.createElement("div");
  const root = createRoot(container as unknown as HTMLElement);
  return { container, root };
}

function findNode(node: FakeNode, predicate: (n: FakeNode) => boolean): FakeNode | null {
  if (predicate(node)) return node;
  for (const child of node.childNodes) {
    const found = findNode(child, predicate);
    if (found) return found;
  }
  return null;
}

function clickNode(node: FakeNode): void {
  const propKey = Object.keys(node).find((k) => k.startsWith("__reactProps"));
  if (propKey) {
    const props = (node as unknown as Record<string, { onClick?: () => void }>)[propKey];
    props?.onClick?.();
  }
}

describe("MessageQueue component during steering (Defect 5)", () => {
  it("renders accessible status banner and disables row actions during steering", () => {
    const messages = [queued("q1", "first follow-up"), queued("q2", "second follow-up")];
    const markup = renderToStaticMarkup(
      createElement(MessageQueue, {
        messages,
        status: "steering",
        onDelete: vi.fn(),
        onEdit: vi.fn(),
        onSteer: vi.fn(),
      }),
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("Stopping the current turn before steering");
    expect(markup).toContain('disabled=""');
    expect(markup).not.toContain("<textarea");
  });

  it("renders active controls without disabled attribute when not steering", () => {
    const messages = [queued("q1", "first follow-up")];
    const markup = renderToStaticMarkup(
      createElement(MessageQueue, {
        messages,
        status: "active",
        onDelete: vi.fn(),
        onEdit: vi.fn(),
        onSteer: vi.fn(),
      }),
    );

    expect(markup).not.toContain("Stopping the current turn before steering");
    expect(markup).not.toContain('disabled=""');
    expect(markup).toContain("Steer");
  });

  it("closes editor when transitioned to steering, and does not restore stale editor when transitioned back to active/held", () => {
    const { container, root } = setupFakeDOM();
    const messages = [queued("q1", "first follow-up"), queued("q2", "second follow-up")];
    const onEditingChange = vi.fn();

    // 1. Render active queue
    act(() => {
      root.render(
        createElement(MessageQueue, {
          messages,
          status: "active",
          onEditingChange,
        }),
      );
    });

    // Verify textarea is NOT initially present
    expect(findNode(container, (n) => n.tagName === "TEXTAREA")).toBeNull();

    // 2. Enter edit mode by clicking "Edit queued message"
    const editBtn = findNode(
      container,
      (n) => n.tagName === "BUTTON" && n.getAttribute("aria-label") === "Edit queued message",
    );
    expect(editBtn).not.toBeNull();
    act(() => {
      clickNode(editBtn!);
    });

    // Verify textarea is now open and editing notification fired
    const textarea = findNode(container, (n) => n.tagName === "TEXTAREA");
    expect(textarea).not.toBeNull();
    expect(onEditingChange).toHaveBeenCalledWith("q1");

    // 3. Transition props to "steering"
    act(() => {
      root.render(
        createElement(MessageQueue, {
          messages,
          status: "steering",
          onEditingChange,
        }),
      );
    });

    // Verify editor closes and editing end notification fired
    expect(findNode(container, (n) => n.tagName === "TEXTAREA")).toBeNull();
    expect(onEditingChange).toHaveBeenCalledWith(undefined);

    // 4. Transition back to active
    act(() => {
      root.render(
        createElement(MessageQueue, {
          messages,
          status: "active",
          onEditingChange,
        }),
      );
    });

    // Stale editor MUST NOT reappear!
    expect(findNode(container, (n) => n.tagName === "TEXTAREA")).toBeNull();

    // 5. Transition to held
    act(() => {
      root.render(
        createElement(MessageQueue, {
          messages,
          status: "held",
          onEditingChange,
        }),
      );
    });

    // Stale editor MUST NOT reappear in held either!
    expect(findNode(container, (n) => n.tagName === "TEXTAREA")).toBeNull();
  });
});

describe("Queue callback guards against steering status in App.tsx (Defect 5)", () => {
  function makeSteeringSession(): Session {
    return {
      ...newSession("claude", "/tmp/test"),
      queueStatus: "steering",
      queuedMessages: [queued("q1", "original text"), queued("q2", "second item")],
      editingQueuedMessageId: undefined,
    };
  }

  it("guards onDeleteQueuedMessage against mutating when queueStatus is steering", () => {
    const session = makeSteeringSession();

    // Replicate App.tsx onDeleteQueuedMessage handler
    const handleDelete = (s: Session, messageId: string): Session => {
      if (s.queueStatus === "steering") return s;
      return dequeueQueuedMessage(s, messageId);
    };

    const result = handleDelete(session, "q1");
    expect(result).toBe(session);
    expect(result.queuedMessages?.length).toBe(2);
    expect(result.queuedMessages?.[0].id).toBe("q1");
  });

  it("guards onEditQueuedMessage against mutating when queueStatus is steering", () => {
    const session = makeSteeringSession();

    // Replicate App.tsx onEditQueuedMessage handler
    const handleEdit = (s: Session, messageId: string, text: string): Session => {
      if (s.queueStatus === "steering") return s;
      return {
        ...s,
        queuedMessages: s.queuedMessages?.map((message) =>
          message.id === messageId ? { ...message, text } : message,
        ),
        editingQueuedMessageId: undefined,
      };
    };

    const result = handleEdit(session, "q1", "mutated text");
    expect(result).toBe(session);
    expect(result.queuedMessages?.[0].text).toBe("original text");
  });

  it("guards onQueuedMessageEditingChange against mutating when queueStatus is steering", () => {
    const session = makeSteeringSession();

    // Replicate App.tsx onQueuedMessageEditingChange handler
    const handleEditingChange = (s: Session, messageId?: string): Session => {
      if (s.queueStatus === "steering") return s;
      return { ...s, editingQueuedMessageId: messageId };
    };

    const result = handleEditingChange(session, "q1");
    expect(result).toBe(session);
    expect(result.editingQueuedMessageId).toBeUndefined();
  });
});
