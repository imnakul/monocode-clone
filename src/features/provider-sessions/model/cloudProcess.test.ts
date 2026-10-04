import { beforeEach, describe, expect, it, vi } from "vitest";

const child = vi.hoisted(() => ({
  acquireHarnessBridge: vi.fn(),
  resolveClaudeBinary: vi.fn(),
  resolveCodexBinary: vi.fn(),
  spawnChild: vi.fn(),
  killChild: vi.fn(),
  watchChild: vi.fn(),
  unwatchChild: vi.fn(),
}));
vi.mock("../../../integrations/harness/core/child", () => child);
import { runProviderCloudCli } from "./cloudSessions";

const release = vi.fn();
let output: (line: string) => void;
let exit: (code: number | null) => void;
let stderr: (line: string) => void;
beforeEach(() => {
  vi.resetAllMocks();
  child.acquireHarnessBridge.mockResolvedValue(release);
  child.resolveClaudeBinary.mockResolvedValue({ path: "/bin/claude" });
  child.resolveCodexBinary.mockResolvedValue({ path: "/bin/codex" });
  child.spawnChild.mockResolvedValue(undefined);
  child.killChild.mockResolvedValue(undefined);
  child.watchChild.mockImplementation(
    (
      _id: string,
      onOutput: typeof output,
      onExit: typeof exit,
      onStderr: typeof stderr,
    ): void => {
      output = onOutput;
      exit = onExit;
      stderr = onStderr;
    },
  );
});

describe("supervised cloud child lifecycle", () => {
  it("uses the selected binary/profile and releases all process resources", async () => {
    const result = runProviderCloudCli({
      provider: "codex",
      args: ["cloud", "status", "task_one"],
      cwd: "/original",
      accountId: "work",
    });
    await vi.waitFor(() => expect(child.spawnChild).toHaveBeenCalledOnce());
    output("first");
    output("second");
    stderr("diagnostic");
    exit(0);
    await expect(result).resolves.toBe("first\nsecond");
    const id: string = child.spawnChild.mock.calls[0][0];
    expect(child.spawnChild).toHaveBeenCalledWith(
      id,
      "/bin/codex",
      ["cloud", "status", "task_one"],
      "/original",
      { provider: "codex", id: "work" },
      "codex",
    );
    expect(child.killChild).toHaveBeenCalledWith(id);
    expect(child.unwatchChild).toHaveBeenCalledWith(id);
    expect(release).toHaveBeenCalledOnce();
  });

  it("keeps real command errors and cleans up after an unsuccessful exit", async () => {
    const result = runProviderCloudCli({
      provider: "claude",
      args: ["--help"],
      cwd: "/repo",
      accountId: "default",
    });
    const rejection = expect(result).rejects.toThrow(
      "Cloud access requires setup",
    );
    await vi.waitFor(() => expect(child.spawnChild).toHaveBeenCalledOnce());
    stderr("Cloud access requires setup");
    exit(1);
    await rejection;
    expect(release).toHaveBeenCalledOnce();
    expect(child.unwatchChild).toHaveBeenCalledOnce();
  });

  it("waits for a delayed spawn before killing a cancelled child", async () => {
    let finishSpawn!: () => void;
    child.spawnChild.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishSpawn = resolve;
        }),
    );
    const signal = new AbortController();
    const result = runProviderCloudCli({
      provider: "claude",
      args: ["--help"],
      cwd: "/repo",
      accountId: "default",
      signal: signal.signal,
    });
    const rejection = expect(result).rejects.toThrow("cancelled");
    await vi.waitFor(() => expect(child.spawnChild).toHaveBeenCalledOnce());
    signal.abort();
    await Promise.resolve();
    expect(child.killChild).not.toHaveBeenCalled();
    expect(release).not.toHaveBeenCalled();
    finishSpawn();
    await rejection;
    expect(child.killChild).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
  });

  it("does not acquire a bridge or spawn for an already cancelled request", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      runProviderCloudCli({
        provider: "codex",
        args: ["--help"],
        cwd: "/repo",
        accountId: "default",
        signal: controller.signal,
      }),
    ).rejects.toThrow("cancelled");
    expect(child.acquireHarnessBridge).not.toHaveBeenCalled();
    expect(child.spawnChild).not.toHaveBeenCalled();
  });

  it("releases the bridge when spawn rejects", async () => {
    child.spawnChild.mockRejectedValue(new Error("Cannot launch CLI"));
    await expect(
      runProviderCloudCli({
        provider: "codex",
        args: ["--help"],
        cwd: "/repo",
        accountId: "default",
      }),
    ).rejects.toThrow("Cannot launch CLI");
    expect(child.killChild).toHaveBeenCalledOnce();
    expect(child.unwatchChild).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
  });

  it("terminates a command that never returns before its timeout", async () => {
    await expect(
      runProviderCloudCli({
        provider: "codex",
        args: ["--help"],
        cwd: "/repo",
        accountId: "default",
        timeoutMs: 5,
      }),
    ).rejects.toThrow("timed out");
    expect(child.killChild).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
  });

  it("caps output and stops the child instead of retaining an unlimited stream", async () => {
    const result = runProviderCloudCli({
      provider: "codex",
      args: ["--help"],
      cwd: "/repo",
      accountId: "default",
    });
    const rejection = expect(result).rejects.toThrow("output exceeded");
    await vi.waitFor(() => expect(child.spawnChild).toHaveBeenCalledOnce());
    output("x".repeat(1024 * 1024 + 1));
    await rejection;
    expect(child.killChild).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
  });
});
