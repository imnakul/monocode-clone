import { useEffect, useState } from "react";

/** Slide/fade length for side panes; keep in sync with `duration-200`. */
export const PANE_TRANSITION_MS = 200;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Keeps a pane mounted long enough to animate out. `mounted` says whether to
 * render it; `shown` drives the CSS transition (false → true one frame after
 * mount so the enter animates, back to false on close, then unmount after
 * `durationMs`). Reduced motion skips both animations.
 */
export function usePresence(
  open: boolean,
  durationMs: number = PANE_TRANSITION_MS,
): { mounted: boolean; shown: boolean } {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const reduced = prefersReducedMotion();
    if (open) {
      setMounted(true);
      if (reduced) {
        setShown(true);
        return;
      }
      // Two frames: the first paints the closed position, the second animates.
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    setShown(false);
    if (reduced) {
      setMounted(false);
      return;
    }
    const timer = window.setTimeout(() => setMounted(false), durationMs);
    return () => window.clearTimeout(timer);
  }, [open, durationMs]);
  return { mounted: mounted || open, shown: shown && open };
}
