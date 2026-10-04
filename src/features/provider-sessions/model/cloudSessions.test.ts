import { beforeEach, describe, expect, it, vi } from "vitest";
const invoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
import {
  buildCloudLaunchArgs,
  cloudCapabilitiesFromHelp,
  CloudRetentionError,
  isCloudSessionRecord,
  launchProviderCloudSession,
  parseCloudLaunch,
  runCloudSessionAction,
  type CloudSession,
} from "./cloudSessions";

const codexHelp =
  "Commands:\n  exec  Submit a new task\n  list  List tasks\n  status  Task status\n  diff  Show diff\n  apply  Apply changes";
const session: CloudSession = {
  provider: "codex",
  id: "task_one",
  url: "https://chatgpt.com/codex/tasks/task_one",
  cwd: "/repo",
  providerAccountId: "default",
  environmentId: "env_one",
  branch: "main",
  createdAt: 42,
};
beforeEach(() => {
  vi.clearAllMocks();
  invoke.mockImplementation(
    async (_name: string, { session: value }: { session: CloudSession }) =>
      value,
  );
});

describe("isCloudSessionRecord", () => {
  it("accepts provider records and rejects unsafe URLs or IDs at the event boundary", () => {
    expect(isCloudSessionRecord(session)).toBe(true);
    expect(
      isCloudSessionRecord({
        ...session,
        provider: "claude",
        url: "https://chatgpt.com/codex/tasks/task_one",
      }),
    ).toBe(false);
    expect(
      isCloudSessionRecord({ ...session, url: "javascript:alert(1)" }),
    ).toBe(false);
    expect(isCloudSessionRecord({ ...session, id: "../task_one" })).toBe(false);
  });
});

describe("provider-specific cloud commands", () => {
  it("rejects dirty checkout apply before executing the cloud mutation", async () => {
    invoke.mockResolvedValue({
      head: "abc",
      files: [{ relative: "local.ts" }],
    });
    const runner = vi
      .fn()
      .mockImplementation(async ({ args }: { args: string[] }) =>
        args.length === 1 ? "  cloud Browse tasks" : codexHelp,
      );
    await expect(
      runCloudSessionAction(session, "apply", { confirmApply: true }, runner),
    ).rejects.toThrow("local checkout has changes");
    expect(
      runner.mock.calls.every(([input]) => input.args.includes("--help")),
    ).toBe(true);
  });
  it("sends Claude follow-up text as data after options", async () => {
    const runner = vi
      .fn()
      .mockResolvedValueOnce("  --cloud [task]\n  -p, --print Print")
      .mockResolvedValueOnce('{"ok":true}');
    const claude = {
      ...session,
      provider: "claude" as const,
      id: "session_one",
      url: "https://claude.ai/code/session_one",
    };
    await runCloudSessionAction(
      claude,
      "message",
      { message: "--help" },
      runner,
    );
    expect(runner).toHaveBeenLastCalledWith(
      expect.objectContaining({
        args: ["-p", "--cloud", "session_one", "--", "--help"],
      }),
    );
  });
  it("does not confuse local Codex queue with cloud messaging or teleport", () => {
    const capabilities = cloudCapabilitiesFromHelp(
      "codex",
      "  cloud Browse tasks\n  queue Send message",
      codexHelp,
    );
    expect(capabilities.launch.available).toBe(true);
    expect(capabilities.status.available).toBe(true);
    expect(capabilities.message.available).toBe(false);
    expect(capabilities.teleport.available).toBe(false);
    expect(cloudCapabilitiesFromHelp("codex", "", "").launch.available).toBe(
      false,
    );
  });
  it("honors capability detection for Claude cloud while leaving telemetry/attach unsupported", () => {
    const capabilities = cloudCapabilitiesFromHelp(
      "claude",
      "  --cloud [task] Launch\n  -p, --print Print",
    );
    expect(capabilities.launch.available).toBe(true);
    expect(capabilities.message.available).toBe(true);
    expect(capabilities.list.available).toBe(false);
    expect(capabilities.status.available).toBe(false);
    expect(capabilities.teleport.available).toBe(false);
  });
  it("uses separate arguments and an end-of-options marker for Codex prompt data", () => {
    expect(
      buildCloudLaunchArgs({
        provider: "codex",
        cwd: "/repo",
        prompt: "--help; $(secret)",
        environmentId: "env_one",
        branch: "main",
      }),
    ).toEqual([
      "cloud",
      "exec",
      "--env",
      "env_one",
      "--branch",
      "main",
      "--",
      "--help; $(secret)",
    ]);
    expect(() =>
      buildCloudLaunchArgs({ provider: "codex", cwd: "/repo", prompt: "task" }),
    ).toThrow("environment");
    expect(() =>
      buildCloudLaunchArgs({
        provider: "claude",
        cwd: "/repo",
        prompt: "task",
        branch: "main",
      }),
    ).toThrow("not supported");
  });
  it("parses real provider IDs and rejects fabricated/unsafe launch links", () => {
    expect(
      parseCloudLaunch(
        "codex",
        "Created task: https://chatgpt.com/codex/tasks/task_one",
      ),
    ).toEqual({ id: "task_one", url: session.url });
    expect(
      parseCloudLaunch(
        "claude",
        '{"ok":true,"session_id":"session_one","url":"https://claude.ai/code/session_one"}',
      ).id,
    ).toBe("session_one");
    expect(() =>
      parseCloudLaunch(
        "claude",
        '{"session_id":"session_one","url":"https://user@claude.ai/code/session_one"}',
      ),
    ).toThrow("provider");
    expect(() =>
      parseCloudLaunch("codex", "https://evil.test/codex/tasks/task_one"),
    ).toThrow("no usable");
    expect(() =>
      parseCloudLaunch("claude", '{"ok":false,"error":"not eligible"}'),
    ).toThrow("error");
  });
  it("retains launched ID/environment/profile once and never auto-opens the provider app", async () => {
    const runner = vi
      .fn()
      .mockResolvedValueOnce("  cloud Browse tasks")
      .mockResolvedValueOnce(codexHelp)
      .mockResolvedValueOnce("https://chatgpt.com/codex/tasks/task_one");
    const result = await launchProviderCloudSession(
      {
        provider: "codex",
        cwd: "/repo",
        prompt: "task",
        environmentId: "env_one",
        accountId: "work",
      },
      runner,
    );
    expect(result.id).toBe("task_one");
    expect(result.providerAccountId).toBe("work");
    expect(invoke).toHaveBeenCalledWith("provider_cloud_save", {
      session: expect.objectContaining({
        id: "task_one",
        environmentId: "env_one",
      }),
    });
    expect(runner).toHaveBeenCalledTimes(3);
  });
  it("exposes the started ID if local persistence fails instead of launching a duplicate job", async () => {
    invoke.mockRejectedValue(new Error("disk full"));
    const runner = vi
      .fn()
      .mockResolvedValueOnce("  cloud Browse tasks")
      .mockResolvedValueOnce(codexHelp)
      .mockResolvedValueOnce(session.url);
    const failure = await launchProviderCloudSession(
      {
        provider: "codex",
        cwd: "/repo",
        prompt: "task",
        environmentId: "env_one",
      },
      runner,
    ).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(CloudRetentionError);
    expect((failure as CloudRetentionError).session.id).toBe("task_one");
    expect(runner).toHaveBeenCalledTimes(3);
  });
  it("never sends a Codex cloud follow-up or unconfirmed apply", async () => {
    const runner = vi
      .fn()
      .mockImplementation(async ({ args }: { args: string[] }) =>
        args.length === 1 ? "  cloud Browse tasks" : codexHelp,
      );
    await expect(
      runCloudSessionAction(
        session,
        "message",
        { message: "continue" },
        runner,
      ),
    ).rejects.toThrow("does not support");
    await expect(
      runCloudSessionAction(session, "apply", {}, runner),
    ).rejects.toThrow("explicit Apply");
    expect(
      runner.mock.calls.every(([input]) => input.args.includes("--help")),
    ).toBe(true);
  });
  it("passes account and exact cloud ID to supported status action", async () => {
    const runner = vi
      .fn()
      .mockResolvedValueOnce("  cloud Browse tasks")
      .mockResolvedValueOnce(codexHelp)
      .mockResolvedValueOnce("completed");
    expect(await runCloudSessionAction(session, "status", {}, runner)).toBe(
      "completed",
    );
    expect(runner).toHaveBeenLastCalledWith(
      expect.objectContaining({
        provider: "codex",
        args: ["cloud", "status", "task_one"],
        accountId: "default",
      }),
    );
  });
});
