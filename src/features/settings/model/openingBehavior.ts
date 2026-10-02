export type OpeningBehavior = "new" | "current" | "both";

export type OpeningIntent = {
  /** Existing explicit permanent-open action (for example a double click). */
  pin?: boolean;
  /** Explicit request to open a separate tab. */
  newTab?: boolean;
  /** Alt+click means new only when the saved behavior is Both. */
  altKey?: boolean;
};

export type ResolvedOpeningBehavior = {
  pin: boolean;
  reuseCurrent: boolean;
};

export const FILE_OPENING_BEHAVIOR_DEFAULT: OpeningBehavior = "both";
export const SESSION_OPENING_BEHAVIOR_DEFAULT: OpeningBehavior = "new";

const FILE_OPENING_BEHAVIOR_KEY = "monocode.fileOpeningBehavior";
const SESSION_OPENING_BEHAVIOR_KEY = "monocode.sessionOpeningBehavior";

function isOpeningBehavior(value: string | null): value is OpeningBehavior {
  return value === "new" || value === "current" || value === "both";
}

function load(key: string, fallback: OpeningBehavior): OpeningBehavior {
  try {
    const value = localStorage.getItem(key);
    return isOpeningBehavior(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: OpeningBehavior): void {
  if (!isOpeningBehavior(value)) return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing and storage quota failures should not break opening.
  }
}

export function loadFileOpeningBehavior(): OpeningBehavior {
  return load(FILE_OPENING_BEHAVIOR_KEY, FILE_OPENING_BEHAVIOR_DEFAULT);
}

export function loadSessionOpeningBehavior(): OpeningBehavior {
  return load(SESSION_OPENING_BEHAVIOR_KEY, SESSION_OPENING_BEHAVIOR_DEFAULT);
}

export function saveFileOpeningBehavior(value: OpeningBehavior): void {
  save(FILE_OPENING_BEHAVIOR_KEY, value);
}

export function saveSessionOpeningBehavior(value: OpeningBehavior): void {
  save(SESSION_OPENING_BEHAVIOR_KEY, value);
}

/** Resolve preferences and explicit click intent at the moment an item opens. */
export function resolveOpeningBehavior(
  behavior: OpeningBehavior,
  intent: OpeningIntent = {},
): ResolvedOpeningBehavior {
  if (intent.pin || intent.newTab || (behavior === "both" && intent.altKey)) {
    return { pin: true, reuseCurrent: false };
  }
  if (behavior === "new") return { pin: true, reuseCurrent: false };
  return { pin: false, reuseCurrent: true };
}
