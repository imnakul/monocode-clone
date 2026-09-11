import { useEffect, useRef } from "react";

export const SHARED_HOVER_CONTINUITY_ATTR = "data-shared-hover-continuity";

export const DEFAULT_SELECTOR = [
  "[data-shared-hover-item]",
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="option"]',
].join(",");

export type SharedHoverAction =
  | { type: "activate"; target: HTMLElement }
  | { type: "retain" }
  | { type: "hide" };

export function isTargetDisabled(element: HTMLElement | null): boolean {
  if (!element) return false;
  return (
    element.hasAttribute("disabled") ||
    element.hasAttribute("data-shared-hover-disabled") ||
    element.getAttribute("aria-disabled") === "true"
  );
}

export function findHoverTarget(
  node: EventTarget | null,
  root: HTMLElement,
  selector: string = DEFAULT_SELECTOR,
): HTMLElement | null {
  const element = node instanceof Element ? node : null;
  const explicit = element?.closest(
    "[data-shared-hover-item]",
  ) as HTMLElement | null;
  const hit = explicit ?? (element?.closest(selector) as HTMLElement | null);
  return hit && root.contains(hit) ? hit : null;
}

export function isPointerInContinuityGap(
  node: EventTarget | null,
  currentTarget: HTMLElement | null,
  root: HTMLElement,
): boolean {
  if (!currentTarget) return false;
  const element = node instanceof Element ? node : null;
  if (!element) return false;
  const region = element.closest(
    `[${SHARED_HOVER_CONTINUITY_ATTR}]`,
  ) as HTMLElement | null;
  return Boolean(
    region && root.contains(region) && region.contains(currentTarget),
  );
}

export function resolveSharedHoverAction({
  currentTarget,
  isCurrentlyVisible,
  hitTarget,
  isHitDisabled = isTargetDisabled(hitTarget),
  inContinuityGap = false,
}: {
  currentTarget: HTMLElement | null;
  isCurrentlyVisible: boolean;
  hitTarget: HTMLElement | null;
  isHitDisabled?: boolean;
  inContinuityGap?: boolean;
}): SharedHoverAction {
  if (hitTarget) {
    if (isHitDisabled) {
      return { type: "hide" };
    }
    if (currentTarget === hitTarget && isCurrentlyVisible) {
      return { type: "retain" };
    }
    return {
      type: "activate",
      target: hitTarget,
    };
  }

  if (currentTarget && isCurrentlyVisible && inContinuityGap) {
    return { type: "retain" };
  }

  return { type: "hide" };
}

export function SharedHoverHighlight({
  selector = DEFAULT_SELECTOR,
}: {
  selector?: string;
}): React.JSX.Element {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const marker = markerRef.current;
    const root = marker?.parentElement;
    if (!marker || !root) return;

    let target: HTMLElement | null = null;
    let frame = 0;

    const position = (next: HTMLElement): void => {
      const rootRect = root.getBoundingClientRect();
      const rect = next.getBoundingClientRect();
      const first = marker.dataset.visible !== "true";
      if (first) marker.style.transition = "none";
      // Snap to whole pixels: fractional translate/width blurs the marker's
      // edges, which reads as a smaller box next to a crisp selected pill.
      marker.style.width = `${Math.round(rect.width)}px`;
      marker.style.height = `${Math.round(rect.height)}px`;
      const x = Math.round(rect.left - rootRect.left + root.scrollLeft);
      const y = Math.round(rect.top - rootRect.top + root.scrollTop);
      marker.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      marker.style.borderRadius = getComputedStyle(next).borderRadius;
      const danger = next.dataset.sharedHoverTone === "danger";
      marker.dataset.sharedHoverHighlightTone = danger ? "danger" : "default";
      marker.classList.toggle("bg-red-500/15", danger);
      // The moving highlight must honor the Menu item highlight setting like
      // selected rows do (index.css reads --popover-highlight-opacity). A
      // fixed class here would freeze it at 8% forever; the var() expression
      // stays live so slider changes repaint immediately.
      marker.style.background = danger
        ? ""
        : "color-mix(in srgb, var(--color-content) var(--popover-highlight-opacity), transparent)";
      if (first) {
        void marker.offsetWidth;
        marker.style.transition = "";
      }
      marker.dataset.visible = "true";
      marker.style.opacity = "1";
    };

    const hide = (): void => {
      target?.removeAttribute("data-shared-hover-active");
      target = null;
      marker.dataset.visible = "false";
      marker.style.opacity = "0";
    };

    const show = (next: HTMLElement | null): void => {
      const action = resolveSharedHoverAction({
        currentTarget: target,
        isCurrentlyVisible: marker.dataset.visible === "true",
        hitTarget: next,
        isHitDisabled: isTargetDisabled(next),
        inContinuityGap: false,
      });

      if (action.type === "activate") {
        if (target === action.target) return;
        target?.removeAttribute("data-shared-hover-active");
        target = action.target;
        target.setAttribute("data-shared-hover-active", "true");
        position(target);
      } else if (action.type === "hide") {
        hide();
      }
    };

    const refresh = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (target?.isConnected) position(target);
        else hide();
      });
    };

    const onPointerMove = (event: PointerEvent): void => {
      const hit = findHoverTarget(event.target, root, selector);
      const inContinuity = isPointerInContinuityGap(event.target, target, root);
      const action = resolveSharedHoverAction({
        currentTarget: target,
        isCurrentlyVisible: marker.dataset.visible === "true",
        hitTarget: hit,
        isHitDisabled: isTargetDisabled(hit),
        inContinuityGap: inContinuity,
      });

      if (action.type === "activate") {
        if (target === action.target) return;
        target?.removeAttribute("data-shared-hover-active");
        target = action.target;
        target.setAttribute("data-shared-hover-active", "true");
        position(target);
      } else if (action.type === "hide") {
        hide();
      }
    };

    const onPointerLeave = (): void => hide();
    const onFocusIn = (event: FocusEvent): void =>
      show(findHoverTarget(event.target, root, selector));
    const onFocusOut = (event: FocusEvent): void => {
      if (!root.contains(event.relatedTarget as Node | null)) hide();
    };

    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerleave", onPointerLeave);
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    root.addEventListener("scroll", refresh, true);
    window.addEventListener("resize", refresh);

    return () => {
      cancelAnimationFrame(frame);
      target?.removeAttribute("data-shared-hover-active");
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
      root.removeEventListener("scroll", refresh, true);
      window.removeEventListener("resize", refresh);
    };
  }, [selector]);

  return (
    <span
      ref={markerRef}
      aria-hidden
      data-shared-hover-highlight
      className="pointer-events-none absolute left-0 top-0 z-[1] opacity-0 will-change-transform transition-[transform,width,height,opacity,background-color] duration-150 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
    />
  );
}
