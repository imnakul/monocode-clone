import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  forgetTerminal,
  hasTerminalSpawned,
  isTerminalStarted,
  requestTerminalStart,
  resetTerminalLifecycle,
  retryTerminalStart,
  startTerminal,
  terminalSpawnError,
} from "./terminalLifecycle";

beforeEach(() => {
  resetTerminalLifecycle();
});

function deferred(): {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: unknown) => void;
} {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("terminalLifecycle", () => {
  it("leaves restored terminals dormant until explicitly started", () => {
    expect(isTerminalStarted("saved-1")).toBe(false);
    expect(hasTerminalSpawned("saved-1")).toBe(false);
    expect(terminalSpawnError("saved-1")).toBeNull();
  });

  it("starting one terminal marks only that id", () => {
    startTerminal("a");
    expect(isTerminalStarted("a")).toBe(true);
    expect(isTerminalStarted("b")).toBe(false);
  });

  it("shares one spawn across concurrent starters", async () => {
    const spawn = vi.fn(async () => undefined);
    const first = requestTerminalStart("a", spawn);
    const second = requestTerminalStart("a", spawn);
    await Promise.all([first, second]);
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(hasTerminalSpawned("a")).toBe(true);
  });

  it("does not respawn for later requests once live", async () => {
    const spawn = vi.fn(async () => undefined);
    await requestTerminalStart("a", spawn);
    await requestTerminalStart("a", spawn);
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it("force restarts an exited terminal", async () => {
    const spawn = vi.fn(async () => undefined);
    await requestTerminalStart("a", spawn);
    await requestTerminalStart("a", spawn, { force: true });
    expect(spawn).toHaveBeenCalledTimes(2);
  });

  it("latches a failed spawn until an explicit retry", async () => {
    const fail = vi.fn(async () => {
      throw new Error("boom");
    });
    await expect(requestTerminalStart("a", fail)).rejects.toThrow("boom");
    expect(terminalSpawnError("a")).toBe("boom");
    expect(hasTerminalSpawned("a")).toBe(false);
    // A plain request (e.g. a remount) must not spawn behind the failure.
    const retry = vi.fn(async () => undefined);
    await expect(requestTerminalStart("a", retry)).rejects.toThrow("boom");
    expect(retry).not.toHaveBeenCalled();
    await retryTerminalStart("a", retry);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(terminalSpawnError("a")).toBeNull();
    expect(hasTerminalSpawned("a")).toBe(true);
  });

  it("leaves nothing live when forgotten during a pending startup", async () => {
    const gate = deferred();
    const spawn = vi.fn(() => gate.promise);
    const pending = requestTerminalStart("a", spawn);
    forgetTerminal("a");
    expect(isTerminalStarted("a")).toBe(false);
    gate.resolve();
    await pending;
    expect(hasTerminalSpawned("a")).toBe(false);
  });

  it("clears the failure latch on forget so a fresh start works", async () => {
    const fail = vi.fn(async () => {
      throw new Error("nope");
    });
    await expect(requestTerminalStart("a", fail)).rejects.toThrow();
    forgetTerminal("a");
    expect(terminalSpawnError("a")).toBeNull();
    const spawn = vi.fn(async () => undefined);
    await requestTerminalStart("a", spawn);
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it("latches a synchronous spawn throw without hanging", async () => {
    const spawn = vi.fn(() => {
      throw new Error("sync");
    });
    await expect(requestTerminalStart("a", spawn)).rejects.toThrow("sync");
    expect(terminalSpawnError("a")).toBe("sync");
  });
});
