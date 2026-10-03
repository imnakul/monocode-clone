import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  SPARKLE_FIELD_MS,
  SparkleField,
} from "../../features/sessions/ui/MonocodeSparkles";

export type BurstTarget = {
  /** Changes for every burst so the same element can celebrate twice. */
  key: number;
  rect: { left: number; top: number; width: number; height: number };
};

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Where to celebrate: the element's box on screen. */
export function burstAt(element: Element | null | undefined): BurstTarget | null {
  if (!element) return null;
  const { left, top, width, height } = element.getBoundingClientRect();
  return { key: Date.now() + Math.random(), rect: { left, top, width, height } };
}

/**
 * A one-shot sparkle burst over an element (a task moved to Completed, Focus
 * switched on). Purely decorative and skipped when reduced motion is on.
 */
export function CelebrationBurst({
  target,
  onDone,
}: {
  target: BurstTarget;
  onDone: () => void;
}): ReactNode {
  const reduced = prefersReducedMotion();
  useEffect(() => {
    const timer = window.setTimeout(onDone, reduced ? 0 : SPARKLE_FIELD_MS);
    return () => window.clearTimeout(timer);
  }, [target.key, onDone, reduced]);
  if (reduced || typeof document === "undefined") return null;
  return createPortal(
    <span
      aria-hidden
      data-celebration-burst
      className="pointer-events-none fixed z-[60] rounded-md"
      style={{
        left: target.rect.left,
        top: target.rect.top,
        width: target.rect.width,
        height: target.rect.height,
      }}
    >
      <SparkleField key={target.key} />
    </span>,
    document.body,
  );
}
