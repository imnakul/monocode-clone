import type { HarnessId } from "../session";

const CUSTOM_BINARY_KEY_PREFIX = "monocode.customBinary.";

export function getCustomBinary(id: HarnessId): string | null {
  try {
    const val = localStorage.getItem(`${CUSTOM_BINARY_KEY_PREFIX}${id}`);
    return val && val.trim() ? val.trim() : null;
  } catch {
    return null;
  }
}

export function setCustomBinary(id: HarnessId, path: string | null): void {
  try {
    if (path && path.trim()) {
      localStorage.setItem(`${CUSTOM_BINARY_KEY_PREFIX}${id}`, path.trim());
    } else {
      localStorage.removeItem(`${CUSTOM_BINARY_KEY_PREFIX}${id}`);
    }
  } catch {}
}
