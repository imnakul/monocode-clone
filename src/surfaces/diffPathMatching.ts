/**
 * Normalizes path separators to forward slashes and trims trailing slashes,
 * while preserving standard UNC double-leading-slash notation.
 */
export function normalizePathSeparators(path: string): string {
  const withForward = path.replace(/\\/g, "/");
  if (withForward.startsWith("//")) {
    const trimmed = withForward.replace(/^\/+/, "").replace(/\/+$/, "");
    return `//${trimmed}`;
  }
  return withForward.replace(/\/+$/, "");
}

/**
 * Checks whether a path unambiguously represents a Windows filesystem location:
 * - A drive-letter path: "C:/...", "d:/"
 * - A UNC share path: "//server/share/..."
 */
export function isWindowsPath(path: string): boolean {
  const norm = normalizePathSeparators(path);
  return /^[a-zA-Z]:(?:\/|$)/.test(norm) || /^\/\/[^/]/.test(norm);
}

/**
 * Compares two paths with case-insensitivity enabled only for Windows paths/contexts.
 */
function pathsEqual(a: string, b: string, caseInsensitive: boolean): boolean {
  return caseInsensitive ? a.toLowerCase() === b.toLowerCase() : a === b;
}

/**
 * Determines whether focusPath matches the target diff file.
 *
 * Rules:
 * - Windows drive-letter and UNC paths tolerate slash direction and path casing.
 * - POSIX paths remain strictly case-sensitive.
 * - Relative paths inherit Windows case-insensitive behavior only when their
 *   associated cwd or file path clearly represents Windows.
 * - Basename-only matches across different directories never match.
 */
export function isMatchingDiffPath(
  focusPath: string | undefined,
  file: { path: string; relative: string },
  cwd?: string,
): boolean {
  if (!focusPath) return false;

  const normFocus = normalizePathSeparators(focusPath);
  const normFilePath = normalizePathSeparators(file.path);
  const normFileRel = normalizePathSeparators(file.relative);
  const normCwd = cwd ? normalizePathSeparators(cwd) : undefined;

  // Detect whether the repository / filesystem context is Windows
  const isWindowsContext: boolean =
    (normCwd != null && isWindowsPath(normCwd)) ||
    isWindowsPath(normFilePath) ||
    isWindowsPath(normFocus);

  // 1. Direct match against relative path
  if (pathsEqual(normFocus, normFileRel, isWindowsContext)) {
    return true;
  }

  // 2. Direct match against absolute/full path
  if (pathsEqual(normFocus, normFilePath, isWindowsContext)) {
    return true;
  }

  // 3. Workspace-relative expansion when cwd is provided
  if (normCwd) {
    const cwdPrefix = normCwd.endsWith("/") ? normCwd : `${normCwd}/`;
    const focusStartsWithCwd = isWindowsContext
      ? normFocus.toLowerCase().startsWith(cwdPrefix.toLowerCase())
      : normFocus.startsWith(cwdPrefix);

    if (focusStartsWithCwd) {
      const focusRel = normFocus.slice(cwdPrefix.length);
      if (pathsEqual(focusRel, normFileRel, isWindowsContext)) {
        return true;
      }
    }

    const fileAbs = `${normCwd}/${normFileRel}`;
    if (pathsEqual(normFocus, fileAbs, isWindowsContext)) {
      return true;
    }
  }

  return false;
}

