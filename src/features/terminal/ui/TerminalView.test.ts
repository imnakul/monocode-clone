// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  forgetTerminal,
  resetTerminalLifecycle,
  startTerminal,
} from "../../sessions/model/terminalLifecycle";

const pty = vi.hoisted(() => ({
  PTY_SUPPORTED: true,
  PTY_UNSUPPORTED_MESSAGE: "Terminals are supported on macOS and Linux.",
  markUnsupportedNotified: vi.fn(() => true),
  spawnPty: vi.fn(async () => {}),
  killPty: vi.fn(async () => {}),
  resizePty: vi.fn(async () => {}),
  writePty: vi.fn(async () => {}),
  subscribePty: vi.fn(() => () => {}),
  ptyReplayFrom: vi.fn(async () => ({
    start: 0,
    total: 0,
    data: new Uint8Array(),
  })),
  getPtyStatus: vi.fn(async () => ({ foreground: null })),
}));
vi.mock("../../../platform/tauri/pty", () => pty);
vi.mock("../model/terminalLayout", () => ({
  fitTerminal: () => null,
  applyTerminalChrome: () => {},
  resetGridStretch: () => {},
}));
vi.mock("@xterm/xterm", () => ({
  Terminal: class {
    cols = 80;
    rows = 24;
    options = {};
    parser = { registerOscHandler: () => ({ dispose() {} }) };
    buffer = {
      active: { type: "normal" },
      onBufferChange: () => ({ dispose() {} }),
    };
    open() {}
    focus() {}
    dispose() {}
    writeln() {}
    onData() {
      return { dispose() {} };
    }
    onRender() {
      return { dispose() {} };
    }
    attachCustomKeyEventHandler() {}
    attachCustomWheelEventHandler() {}
  },
}));
import { TerminalView } from "./TerminalView";

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  resetTerminalLifecycle();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  host.remove();
  resetTerminalLifecycle();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

it("waits for same-id teardown before subscribing and spawning again", async () => {
  const operations: string[] = [];
  let finishKill!: () => void;
  pty.subscribePty.mockImplementation(() => {
    operations.push("subscribe");
    return () => operations.push("unsubscribe");
  });
  pty.spawnPty.mockImplementation(async () => {
    operations.push("spawn");
  });
  pty.killPty.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        operations.push("kill");
        finishKill = resolve;
      }),
  );

  startTerminal("same-id");
  await act(async () => {
    root.render(
      createElement(TerminalView, { id: "same-id", cwd: "/tmp", active: true }),
    );
  });
  expect(operations).toEqual(["subscribe", "spawn"]);

  await act(async () => {
    forgetTerminal("same-id");
    root.render(null);
  });
  expect(operations).toEqual(["subscribe", "spawn", "unsubscribe", "kill"]);

  await act(async () => {
    startTerminal("same-id");
    root.render(
      createElement(TerminalView, { id: "same-id", cwd: "/tmp", active: true }),
    );
  });
  expect(operations).toEqual(["subscribe", "spawn", "unsubscribe", "kill"]);

  await act(async () => {
    finishKill();
    await Promise.resolve();
  });
  expect(operations).toEqual([
    "subscribe",
    "spawn",
    "unsubscribe",
    "kill",
    "subscribe",
    "spawn",
  ]);
});

it("reopens after a pending close without treating the old spawn as live", async () => {
  const operations: string[] = [];
  let finishOldSpawn!: () => void;
  let finishKill!: () => void;
  pty.subscribePty.mockImplementation(() => {
    operations.push("subscribe");
    return () => operations.push("unsubscribe");
  });
  pty.spawnPty
    .mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          operations.push("spawn old");
          finishOldSpawn = resolve;
        }),
    )
    .mockImplementationOnce(async () => {
      operations.push("spawn replacement");
    });
  pty.killPty.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        operations.push("kill old");
        finishKill = resolve;
      }),
  );

  startTerminal("pending-close");
  await act(async () => {
    root.render(
      createElement(TerminalView, {
        id: "pending-close",
        cwd: "/tmp",
        active: true,
      }),
    );
  });
  expect(operations).toEqual(["subscribe", "spawn old"]);

  await act(async () => {
    forgetTerminal("pending-close");
    root.render(null);
  });
  startTerminal("pending-close");
  await act(async () => {
    root.render(
      createElement(TerminalView, {
        id: "pending-close",
        cwd: "/tmp",
        active: true,
      }),
    );
  });
  expect(operations).toEqual(["subscribe", "spawn old", "unsubscribe"]);

  await act(async () => {
    finishOldSpawn();
    await Promise.resolve();
  });
  expect(operations).toEqual([
    "subscribe",
    "spawn old",
    "unsubscribe",
    "kill old",
  ]);

  await act(async () => {
    finishKill();
    await Promise.resolve();
  });
  expect(operations).toEqual([
    "subscribe",
    "spawn old",
    "unsubscribe",
    "kill old",
    "subscribe",
    "spawn replacement",
  ]);
});

it("does not block a different terminal id behind teardown", async () => {
  let finishKill!: () => void;
  pty.killPty.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finishKill = resolve;
      }),
  );
  startTerminal("first");
  await act(async () => {
    root.render(createElement(TerminalView, { id: "first", cwd: "/tmp" }));
  });
  await act(async () => {
    forgetTerminal("first");
    root.render(null);
  });
  expect(pty.killPty).toHaveBeenCalledWith("first");

  startTerminal("second");
  await act(async () => {
    root.render(createElement(TerminalView, { id: "second", cwd: "/tmp" }));
  });
  expect(pty.spawnPty).toHaveBeenCalledTimes(2);
  expect(pty.spawnPty).toHaveBeenLastCalledWith("second", "/tmp", 80, 24);
  finishKill();
});
