import { useEffect, useRef } from "react";

const DEFAULT_SELECTOR = [
  "[data-shared-hover-item]",
  '[role="menuitem"]:not(:disabled)',
  '[role="menuitemcheckbox"]:not(:disabled)',
  '[role="option"]:not(:disabled)',
].join(",");

export function SharedHoverHighlight({
  selector = DEFAULT_SELECTOR,
}: {
  selector?: string;
}) {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const marker = markerRef.current;
    const root = marker?.parentElement;
    if (!marker || !root) return;

    let target: HTMLElement | null = null;
    let frame = 0;

    const findTarget = (node: EventTarget | null) => {
      const element = node instanceof Element ? node : null;
      const explicit = element?.closest(
        "[data-shared-hover-item]",
      ) as HTMLElement | null;
      const hit = explicit ?? (element?.closest(selector) as HTMLElement | null);
      return hit && root.contains(hit) ? hit : null;
    };

    const position = (next: HTMLElement) => {
      const rootRect = root.getBoundingClientRect();
      const rect = next.getBoundingClientRect();
      const first = marker.dataset.visible !== "true";
      if (first) marker.style.transition = "none";
      marker.style.width = `${rect.width}px`;
      marker.style.height = `${rect.height}px`;
      marker.style.transform = `translate3d(${rect.left - rootRect.left + root.scrollLeft}px, ${
        rect.top - rootRect.top + root.scrollTop
      }px, 0)`;
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

    const hide = () => {
      target?.removeAttribute("data-shared-hover-active");
      target = null;
      marker.dataset.visible = "false";
      marker.style.opacity = "0";
    };

    const show = (next: HTMLElement | null) => {
      if (
        !next ||
        next.hasAttribute("disabled") ||
        next.hasAttribute("data-shared-hover-disabled") ||
        next.getAttribute("aria-disabled") === "true"
      ) {
        hide();
        return;
      }
      if (target === next) return;
      target?.removeAttribute("data-shared-hover-active");
      target = next;
      target.setAttribute("data-shared-hover-active", "true");
      position(target);
    };

    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (target?.isConnected) position(target);
        else hide();
      });
    };

    const onPointerMove = (event: PointerEvent) => show(findTarget(event.target));
    const onPointerLeave = () => hide();
    const onFocusIn = (event: FocusEvent) => show(findTarget(event.target));
    const onFocusOut = (event: FocusEvent) => {
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
