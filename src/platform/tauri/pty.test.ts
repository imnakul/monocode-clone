import { describe, expect, it } from "vitest";
import {
  markUnsupportedNotified,
  PTY_SUPPORTED,
  PTY_UNSUPPORTED_MESSAGE,
  trimReplay,
} from "./pty";

const KB = 1024;

describe("trimReplay", () => {
  it("keeps a small buffer whole", () => {
    const sizes = [KB, KB, KB];
    expect(trimReplay(sizes, 3 * KB)).toEqual({ drop: 0, bytes: 3 * KB });
  });

  it("drops oldest chunks once the byte budget is exceeded", () => {
    // Ten 32KB chunks is 320KB, over the 256KB budget.
    const sizes = Array(10).fill(32 * KB);
    const { drop, bytes } = trimReplay(sizes, 320 * KB);
    expect(drop).toBe(2);
    expect(bytes).toBe(256 * KB);
  });

  it("bounds a flood of tiny chunks by count", () => {
    const sizes = Array(250).fill(4);
    const { drop } = trimReplay(sizes, 1000);
    expect(sizes.length - drop).toBe(200);
  });

  it("keeps the newest chunk even when it alone exceeds the budget", () => {
    const sizes = [KB, 512 * KB];
    const { drop, bytes } = trimReplay(sizes, 513 * KB);
    expect(drop).toBe(1);
    expect(bytes).toBe(512 * KB);
  });

  it("never drops the only chunk", () => {
    const sizes = [512 * KB];
    expect(trimReplay(sizes, 512 * KB)).toEqual({ drop: 0, bytes: 512 * KB });
  });
});

describe("PTY platform support", () => {
  it("is supported on every platform the Rust backend implements", () => {
    // Unix (fork/openpty) + Windows (ConPTY). Flip this back only if a
    // backend platform is ever dropped.
    expect(PTY_SUPPORTED).toBe(true);
  });

  it("keeps the unsupported message identical to the Rust backend rejection", () => {
    // Must match pty_spawn/pty_resize in src-tauri/src/pty.rs; TerminalView
    // compares backend errors against this string to stop retrying.
    expect(PTY_UNSUPPORTED_MESSAGE).toBe(
      "Terminals are supported on macOS and Linux.",
    );
  });

  it("notifies unsupported only once per terminal id", () => {
    const id = `term-${Date.now()}-${Math.random()}`;
    expect(markUnsupportedNotified(id)).toBe(true);
    expect(markUnsupportedNotified(id)).toBe(false);
    expect(markUnsupportedNotified(`${id}-other`)).toBe(true);
  });
});
