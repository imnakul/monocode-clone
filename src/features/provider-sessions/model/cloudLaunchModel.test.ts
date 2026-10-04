import { describe, expect, it, vi } from "vitest";
import {
  createCloudLauncher,
  describeCloudLaunchFailure,
  validateCloudLaunch,
  type CloudLaunchRequest,
} from "./cloudLaunchModel";
import { CloudRetentionError, type CloudSession } from "./cloudSessions";

const record: CloudSession = {
  provider: "codex",
  id: "task_1",
  url: "https://chatgpt.com/codex/tasks/task_1",
  cwd: "/work",
  providerAccountId: "default",
  environmentId: "env-1",
  branch: null,
  createdAt: 1,
};
const request = (extra: Partial<CloudLaunchRequest> = {}): CloudLaunchRequest => ({
  provider: "codex",
  prompt: "fix the bug",
  cwd: "/work",
  accountId: "default",
  environmentId: "env-1",
  branch: "",
  attachments: [],
  conflictingMode: false,
  ...extra,
});

describe("validateCloudLaunch", () => {
  it("accepts a complete Codex request and a Claude request without environment", () => {
    expect(validateCloudLaunch(request())).toBeNull();
    expect(validateCloudLaunch(request({ provider: "claude", environmentId: "" }))).toBeNull();
  });

  it("rejects what cloud cannot honour", () => {
    expect(validateCloudLaunch(request({ prompt: "  " }))).toContain("what the cloud task");
    expect(validateCloudLaunch(request({ attachments: [{ id: "a" } as never] }))).toContain("text only");
    expect(validateCloudLaunch(request({ conflictingMode: true }))).toContain("Plan, Draft");
    expect(validateCloudLaunch(request({ environmentId: " " }))).toContain("environment ID");
    expect(validateCloudLaunch(request({ environmentId: "--x" }))).toContain("not valid");
    expect(validateCloudLaunch(request({ branch: "-b" }))).toContain("branch");
    expect(validateCloudLaunch(request({ cwd: "~" }))).toContain("project folder");
  });
});

describe("createCloudLauncher", () => {
  it("launches once with trimmed Codex environment and branch", async () => {
    const launch = vi.fn().mockResolvedValue(record);
    const run = createCloudLauncher(launch);
    const result = await run(request({ environmentId: " env-1 ", branch: " main " }));
    expect(result).toEqual({ status: "launched", record });
    expect(launch).toHaveBeenCalledTimes(1);
    expect(launch).toHaveBeenCalledWith({
      provider: "codex",
      prompt: "fix the bug",
      cwd: "/work",
      accountId: "default",
      environmentId: "env-1",
      branch: "main",
    });
  });

  it("never sends environment or branch for Claude", async () => {
    const launch = vi.fn().mockResolvedValue({ ...record, provider: "claude" });
    await createCloudLauncher(launch)(request({ provider: "claude", environmentId: "leftover", branch: "x" }));
    const call = launch.mock.calls[0][0];
    expect(call).not.toHaveProperty("environmentId");
    expect(call).not.toHaveProperty("branch");
  });

  it("rejects a concurrent second launch instead of starting another task", async () => {
    let finish: (value: CloudSession) => void = () => undefined;
    const launch = vi.fn(() => new Promise<CloudSession>((resolve) => { finish = resolve; }));
    const run = createCloudLauncher(launch);
    const first = run(request());
    const second = await run(request());
    expect(second).toEqual({ status: "rejected", message: "A cloud launch is already in progress." });
    finish(record);
    await expect(first).resolves.toMatchObject({ status: "launched" });
    expect(launch).toHaveBeenCalledTimes(1);
  });

  it("does not call the provider when validation fails", async () => {
    const launch = vi.fn();
    const result = await createCloudLauncher(launch)(request({ environmentId: "" }));
    expect(result.status).toBe("rejected");
    expect(launch).not.toHaveBeenCalled();
  });

  it("returns the real ID when only retention failed, never retrying the launch", async () => {
    const launch = vi.fn().mockRejectedValue(new CloudRetentionError(record, "disk full"));
    const result = await createCloudLauncher(launch)(request());
    expect(result).toMatchObject({ status: "unsaved", record });
    expect(launch).toHaveBeenCalledTimes(1);
  });

  it("warns that a failed or timed-out launch may still have started a task", async () => {
    const launch = vi.fn().mockRejectedValue(new Error("Cloud command timed out."));
    const result = await createCloudLauncher(launch)(request());
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.message).toContain("Cloud command timed out.");
      expect(result.message).toContain("check Codex before trying again");
    }
    expect(describeCloudLaunchFailure("claude", "x")).toContain("check Claude");
  });

  it("allows a new launch after the previous one finished", async () => {
    const launch = vi.fn().mockRejectedValueOnce(new Error("no")).mockResolvedValue(record);
    const run = createCloudLauncher(launch);
    expect((await run(request())).status).toBe("failed");
    expect((await run(request())).status).toBe("launched");
  });
});
