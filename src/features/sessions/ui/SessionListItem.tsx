import { useLayoutEffect, useRef, type ReactElement, type ReactNode, type RefObject } from "react";
import type { SessionSummary } from "../data/sessionStore";

/** Rows created this recently slide in; older ones are just being listed. */
const SESSION_INSERT_WINDOW_MS = 15_000;

export type SessionInsertMotion = { cwd: string; seen: Set<string> };

/** List row that grows open when a new session lands, pushing rows below it down. */
export function SessionListItem({
  session,
  cwd,
  motion,
  children,
}: {
  session: SessionSummary;
  cwd: string;
  motion: RefObject<SessionInsertMotion>;
  children: ReactNode;
}): ReactElement {
  const ref = useRef<HTMLLIElement>(null);
  // Decided once per row: effects can replay (StrictMode, reordering), and a
  // row that already slid in must not do it again.
  const played = useRef(false);
  useLayoutEffect(() => {
    if (played.current) return;
    played.current = true;
    const state = motion.current;
    const fresh =
      state.cwd === cwd &&
      !state.seen.has(session.id) &&
      (session.createdAt === 0 ||
        Date.now() - session.createdAt < SESSION_INSERT_WINDOW_MS);
    state.seen.add(session.id);
    const el = ref.current;
    const content = el?.firstElementChild;
    if (
      !fresh ||
      !el ||
      !(content instanceof HTMLElement) ||
      typeof el.animate !== "function" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    )
      return;
    // The card takes its place at once; everything below starts where it was
    // and slides down, uncovering it as it fades in.
    const offset =
      el.offsetHeight +
      (parseFloat(getComputedStyle(el.parentElement ?? el).rowGap) || 0);
    const timing = {
      duration: 380,
      easing: "cubic-bezier(0.32, 0.72, 0, 1)",
    };
    for (
      let node: Element | null = el;
      node && !node.hasAttribute("data-session-list");
      node = node.parentElement
    ) {
      for (
        let below = node.nextElementSibling;
        below;
        below = below.nextElementSibling
      ) {
        if (!(below instanceof HTMLElement)) continue;
        below.animate(
          [{ transform: `translateY(${-offset}px)` }, { transform: "none" }],
          // Stack with a push already in flight instead of restarting it.
          { ...timing, composite: "add" },
        );
      }
    }
    content.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 220,
      easing: "ease-out",
    });
  }, []);
  return <li ref={ref}>{children}</li>;
}
