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

const SPREAD_FIELD_WIDTH = 320;
const SPREAD_MAX_FIELDS = 6;

/** How many sparkle fields cover a burst `width` px wide. */
export function burstFields(width: number, spread: boolean): number {
  if (!spread) return 1;
  return Math.min(
    SPREAD_MAX_FIELDS,
    Math.max(1, Math.ceil(width / SPREAD_FIELD_WIDTH)),
  );
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
  spread = false,
}: {
  target: BurstTarget;
  onDone: () => void;
  /** Wide targets (a toolbar): one sparkle field per ~320px so it fills the width. */
  spread?: boolean;
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
      {Array.from({ length: burstFields(target.rect.width, spread) }, (_, i) => (
        <SparkleField key={`${target.key}:${i}`} />
      ))}
    </span>,
    document.body,
  );
}
