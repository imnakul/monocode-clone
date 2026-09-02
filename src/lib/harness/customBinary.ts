import type { HarnessId } from "../session";

const CUSTOM_BINARY_KEY_PREFIX = "monocode.customBinary.";

export const DEFAULT_WINDOWS_BINARIES: Partial<Record<HarnessId, string>> = {
  antigravity: "C:\\Users\\gclna\\AppData\\Local\\agy\\bin\\agy.EXE",
  codex: "C:\\Users\\gclna\\.codex\\.sandbox-bin\\codex.exe",
  claude: "C:\\Users\\gclna\\.local\\bin\\claude.exe",
  opencode: "C:\\Users\\gclna\\AppData\\Roaming\\npm\\opencode.cmd",
};

export function getCustomBinary(id: HarnessId): string | null {
  try {
    const val = localStorage.getItem(`${CUSTOM_BINARY_KEY_PREFIX}${id}`);
    if (val && val.trim()) return val.trim();
    return DEFAULT_WINDOWS_BINARIES[id] ?? null;
  } catch {
    return DEFAULT_WINDOWS_BINARIES[id] ?? null;
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
