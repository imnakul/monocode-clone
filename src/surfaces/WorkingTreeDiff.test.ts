import { describe, expect, it } from "vitest";
import {
  isMatchingDiffPath,
  normalizePathSeparators,
} from "./diffPathMatching";

describe("normalizePathSeparators", () => {
  it("converts backslashes to forward slashes", () => {
    expect(normalizePathSeparators("C:\\repo\\src\\file.ts")).toBe(
      "C:/repo/src/file.ts",
    );
  });

  it("strips trailing slashes", () => {
    expect(normalizePathSeparators("C:/repo/src///")).toBe("C:/repo/src");
    expect(normalizePathSeparators("C:\\repo\\src\\\\")).toBe("C:/repo/src");
  });
});

describe("isMatchingDiffPath", () => {
  const fileA = {
    path: "C:/project/src/components/button.tsx",
    relative: "src/components/button.tsx",
  };
  const fileB = {
    path: "C:/project/src/icons/button.tsx",
    relative: "src/icons/button.tsx",
  };
  const cwd = "C:/project";

  it("returns false for undefined focusPath", () => {
    expect(isMatchingDiffPath(undefined, fileA, cwd)).toBe(false);
  });

  it("matches exact relative path", () => {
    expect(isMatchingDiffPath("src/components/button.tsx", fileA, cwd)).toBe(
      true,
    );
    expect(isMatchingDiffPath("src/icons/button.tsx", fileA, cwd)).toBe(false);
  });

  it("matches exact absolute path", () => {
    expect(
      isMatchingDiffPath("C:/project/src/components/button.tsx", fileA, cwd),
    ).toBe(true);
    expect(
      isMatchingDiffPath("C:/project/src/icons/button.tsx", fileA, cwd),
    ).toBe(false);
  });

  it("handles Windows backslashes and slash differences", () => {
    expect(
      isMatchingDiffPath("src\\components\\button.tsx", fileA, cwd),
    ).toBe(true);
    expect(
      isMatchingDiffPath(
        "C:\\project\\src\\components\\button.tsx",
        fileA,
        "C:\\project",
      ),
    ).toBe(true);
  });

  it("matches case-insensitively on Windows paths, drive letters, and UNC shares", () => {
    expect(
      isMatchingDiffPath("c:/project/src/components/button.tsx", fileA, cwd),
    ).toBe(true);
    expect(
      isMatchingDiffPath("C:/PROJECT/SRC/COMPONENTS/BUTTON.TSX", fileA, cwd),
    ).toBe(true);

    const uncFile = {
      path: "//server/share/repo/src/File.ts",
      relative: "src/File.ts",
    };
    expect(
      isMatchingDiffPath(
        "\\\\SERVER\\SHARE\\REPO\\SRC\\FILE.TS",
        uncFile,
        "//server/share/repo",
      ),
    ).toBe(true);
  });

  it("preserves strict case-sensitivity for POSIX paths", () => {
    const posixFile = {
      path: "/repo/src/file.ts",
      relative: "src/file.ts",
    };
    const posixCwd = "/repo";

    // Matching exact casing works
    expect(isMatchingDiffPath("/repo/src/file.ts", posixFile, posixCwd)).toBe(
      true,
    );
    expect(isMatchingDiffPath("src/file.ts", posixFile, posixCwd)).toBe(true);

    // Casing differences must NEVER match on POSIX
    expect(isMatchingDiffPath("/repo/src/File.ts", posixFile, posixCwd)).toBe(
      false,
    );
    expect(isMatchingDiffPath("src/File.ts", posixFile, posixCwd)).toBe(false);
  });

  it("does not match different files that share the same basename", () => {
    expect(isMatchingDiffPath("src/components/button.tsx", fileB, cwd)).toBe(
      false,
    );
    expect(isMatchingDiffPath("src/icons/button.tsx", fileA, cwd)).toBe(false);
    expect(isMatchingDiffPath("button.tsx", fileA, cwd)).toBe(false);
    expect(isMatchingDiffPath("button.tsx", fileB, cwd)).toBe(false);
    expect(isMatchingDiffPath("/repo/icons/button.tsx", {
      path: "/repo/src/button.tsx",
      relative: "src/button.tsx",
    }, "/repo")).toBe(false);
  });
});
