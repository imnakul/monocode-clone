// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SharedHoverHighlight,
  resolveSharedHoverReflow,
} from "./SharedHoverHighlight";

type Box = { left: number; top: number; width: number; height: number };

function item(): HTMLElement {
  const element = document.createElement("div");
  element.setAttribute("data-shared-hover-item", "");
  return element;
}

describe("resolveSharedHoverReflow", () => {
  const base = {
    targetConnected: true,
    pointerKnown: true,
    pointerInsideTarget: true,
    hitTarget: null,
    inContinuityGap: false,
  };

  it("repositions when the item still sits under the pointer or the pointer is unknown", () => {
    expect(resolveSharedHoverReflow(base)).toEqual({ type: "reposition" });
    expect(
      resolveSharedHoverReflow({
        ...base,
        pointerKnown: false,
        pointerInsideTarget: false,
      }),
    ).toEqual({ type: "reposition" });
  });

  it("moves to the item now under a still pointer", () => {
    const other = item();
    expect(
      resolveSharedHoverReflow({
        ...base,
        pointerInsideTarget: false,
        hitTarget: other,
      }),
    ).toEqual({ type: "activate", target: other });
  });

  it("hides when nothing hoverable is under the pointer, unless in a continuity gap", () => {
    const away = { ...base, pointerInsideTarget: false };
    expect(resolveSharedHoverReflow(away)).toMatchObject({ type: "hide" });
    expect(
      resolveSharedHoverReflow({ ...away, inContinuityGap: true }),
    ).toEqual({ type: "reposition" });
  });

  it("hides a removed item, or hands over to its replacement under the pointer", () => {
    const gone = { ...base, targetConnected: false };
    expect(resolveSharedHoverReflow(gone)).toMatchObject({ type: "hide" });
    const replacement = item();
    expect(
      resolveSharedHoverReflow({ ...gone, hitTarget: replacement }),
    ).toEqual({ type: "activate", target: replacement });
    const disabled = item();
    disabled.setAttribute("aria-disabled", "true");
    expect(
      resolveSharedHoverReflow({ ...gone, hitTarget: disabled }),
    ).toMatchObject({ type: "hide" });
  });
});

describe("SharedHoverHighlight layout changes under a still pointer", () => {
  let root: Root;
  let container: HTMLDivElement;
  let card: HTMLElement;
  let marker: HTMLElement;
  let boxes: Map<Element, Box>;
  let observed: Set<Element>;
  let notify: () => void;
  let under: Element | null;

  const rect = (box: Box): DOMRect =>
    ({
      ...box,
      right: box.left + box.width,
      bottom: box.top + box.height,
      x: box.left,
      y: box.top,
    }) as DOMRect;

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) => {
      callback();
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
    observed = new Set();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          notify = callback;
        }
        observe(element: Element): void {
          observed.add(element);
        }
        unobserve(element: Element): void {
          observed.delete(element);
        }
        disconnect(): void {
          observed.clear();
        }
      },
    );
    boxes = new Map();
    under = null;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(createElement(SharedHoverHighlight)));
    marker = container.querySelector("[data-shared-hover-highlight]")!;
    const list = marker.parentElement ?? container;
    card = item();
    list.append(card);
    boxes.set(list, { left: 0, top: 0, width: 600, height: 400 });
    boxes.set(card, { left: 100, top: 50, width: 300, height: 80 });
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function (this: Element) {
        return rect(
          boxes.get(this) ?? { left: 0, top: 0, width: 0, height: 0 },
        );
      },
    );
    document.elementFromPoint = () => under;
    act(() => {
      card.dispatchEvent(
        new MouseEvent("pointermove", {
          bubbles: true,
          clientX: 150,
          clientY: 90,
        }),
      );
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("observes the list and the hovered item, and highlights the item", () => {
    expect(observed.has(card)).toBe(true);
    expect(observed.has(marker.parentElement!)).toBe(true);
    expect(marker.dataset.visible).toBe("true");
    expect(marker.style.width).toBe("300px");
    expect(marker.style.transform).toBe("translate3d(100px, 50px, 0)");
  });

  it("re-measures the highlight to the item's new box when it narrows", () => {
    boxes.set(card, { left: 100, top: 50, width: 180, height: 80 });
    act(() => notify());
    expect(marker.dataset.visible).toBe("true");
    expect(marker.style.width).toBe("180px");
    expect(marker.style.height).toBe("80px");
    // The glide transition is restored for the next pointer move.
    expect(marker.style.transition).toBe("");
  });

  it("moves to the item that now sits under the pointer", () => {
    const next = item();
    marker.parentElement!.append(next);
    boxes.set(next, { left: 100, top: 140, width: 180, height: 80 });
    boxes.set(card, { left: 100, top: 300, width: 180, height: 80 });
    under = next;
    act(() => notify());
    expect(observed.has(next)).toBe(true);
    expect(observed.has(card)).toBe(false);
    expect(marker.style.transform).toBe("translate3d(100px, 140px, 0)");
  });

  it("hides when the item left the pointer and nothing hoverable is under it", () => {
    boxes.set(card, { left: 100, top: 300, width: 180, height: 80 });
    under = null;
    act(() => notify());
    expect(marker.dataset.visible).toBe("false");
    expect(observed.has(card)).toBe(false);
  });

  it("hides when the hovered item was removed", () => {
    card.remove();
    act(() => notify());
    expect(marker.dataset.visible).toBe("false");
  });

  it("keeps following the item after keyboard use, without checking the pointer", () => {
    act(() => {
      marker.parentElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
    });
    boxes.set(card, { left: 100, top: 300, width: 180, height: 80 });
    act(() => notify());
    expect(marker.dataset.visible).toBe("true");
    expect(marker.style.transform).toBe("translate3d(100px, 300px, 0)");
  });
});
