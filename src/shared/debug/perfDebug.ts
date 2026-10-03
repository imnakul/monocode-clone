/**
 * Opt-in diagnostics for the Performance overlay (View: Toggle Performance
 * Overlay). Everything here is a no-op while the overlay is closed, so the
 * hover highlight pays one boolean check per move in normal use.
 */

import { isPerfRecording, recordHoverEvent } from "./perfRecorder";

const ENABLED_KEY = "monocode.perfOverlay";

/** How the shared hover highlight reached its latest state. */
export type HoverDebugKind =
  /** Animated from the previous item: the intended continuous glide. */
  | "glide"
  /** Appeared on an item without animating (it was hidden just before). */
  | "snap"
  /** Disappeared; `reason` says why. */
  | "hide";

export type HoverDebugEvent = {
  kind: HoverDebugKind;
  /** Which list or surface owns the highlight, e.g. "Task Manager list". */
  surface: string;
  /** Short description of the item, or of the element that ended the glide. */
  item: string;
  /** The item paints its own hover background on top of the gliding one. */
  ownFill: boolean;
  reason?: string;
  at: number;
};

type Listener = () => void;

let enabled = readEnabled();
const listeners = new Set<Listener>();
const hoverEvents: HoverDebugEvent[] = [];
const HOVER_EVENT_LIMIT = 60;

function readEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) === "true";
  } catch {
    return false;
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

/** True while the overlay is open or a log is recording. */
export function isPerfDebugEnabled(): boolean {
  return enabled || isPerfRecording();
}

export function setPerfDebugEnabled(next: boolean): void {
  enabled = next;
  try {
    localStorage.setItem(ENABLED_KEY, String(next));
  } catch {
    /* storage unavailable: the overlay just won't reopen on restart */
  }
  if (!next) hoverEvents.length = 0;
  emit();
}

export function togglePerfDebug(): void {
  setPerfDebugEnabled(!enabled);
}

export function subscribePerfDebug(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Newest first. */
export function hoverDebugEvents(): readonly HoverDebugEvent[] {
  return hoverEvents;
}

export function clearHoverDebugEvents(): void {
  hoverEvents.length = 0;
  emit();
}

/** Record a hover highlight transition. Call only when enabled. */
export function reportHoverDebug(event: Omit<HoverDebugEvent, "at">): void {
  if (!isPerfDebugEnabled()) return;
  const recorded = { ...event, at: performance.now() };
  recordHoverEvent(recorded);
  hoverEvents.unshift(recorded);
  if (hoverEvents.length > HOVER_EVENT_LIMIT)
    hoverEvents.length = HOVER_EVENT_LIMIT;
  emit();
}

/** Readable name for the surface a highlight lives in. */
export function describeSurface(root: HTMLElement): string {
  const labelled = root.closest<HTMLElement>(
    "[aria-label],[data-app-kanban],[data-debug-surface]",
  );
  const label =
    labelled?.dataset.debugSurface ??
    labelled?.getAttribute("aria-label") ??
    (labelled?.hasAttribute("data-app-kanban") ? "Session Manager" : null);
  return label ?? root.tagName.toLowerCase();
}

/** Short, recognizable description of an element: text first, then tag. */
export function describeElement(element: Element | null): string {
  if (!element) return "nothing";
  const text = element.textContent?.replace(/\s+/g, " ").trim() ?? "";
  const tag = element.tagName.toLowerCase();
  const classes = [...element.classList].slice(0, 2).join(".");
  const shape = classes ? `${tag}.${classes}` : tag;
  return text ? `“${text.slice(0, 40)}${text.length > 40 ? "…" : ""}”` : shape;
}

/**
 * True when the item draws its own hover background. With the gliding
 * marker also behind it, the row brightens instantly while the marker is
 * still travelling, which reads as a jump.
 */
export function paintsOwnHoverFill(element: HTMLElement): boolean {
  // A selected or current row is meant to keep its own fill.
  if (
    element.getAttribute("aria-current") === "true" ||
    element.getAttribute("aria-selected") === "true" ||
    element.hasAttribute("data-shared-hover-preserve")
  )
    return false;
  const background = getComputedStyle(element).backgroundColor;
  return !isTransparent(background);
}

function isTransparent(color: string): boolean {
  if (!color || color === "transparent") return true;
  // rgba(r, g, b, a) | rgb(r g b / a) | oklab(l a b / a) | color(srgb r g b / a)
  const alpha =
    /\/\s*([\d.]+%?)\s*\)$/.exec(color)?.[1] ??
    /^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+%?)\s*\)$/.exec(color)?.[1];
  if (alpha === undefined) return false;
  const value = alpha.endsWith("%")
    ? Number(alpha.slice(0, -1)) / 100
    : Number(alpha);
  return value === 0;
}
