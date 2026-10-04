import { describe, expect, it } from "vitest";
import { cloudLaunchEligible, isCloudLaunchOutcome } from "./useCloudLaunch";

const base = { harness: "claude" as const, cwd: "/work", blocksCount: 0, remote: false };

describe("cloudLaunchEligible", () => {
  it("offers Cloud only for a new local Claude or Codex session in a project", () => {
    expect(cloudLaunchEligible(base)).toBe(true);
    expect(cloudLaunchEligible({ ...base, harness: "codex" })).toBe(true);
  });

  it("hides Cloud for other providers, started chats, remote hosts, inbox asks and blank projects", () => {
    expect(cloudLaunchEligible({ ...base, harness: "cursor" })).toBe(false);
    expect(cloudLaunchEligible({ ...base, blocksCount: 1 })).toBe(false);
    expect(cloudLaunchEligible({ ...base, remote: true })).toBe(false);
    expect(cloudLaunchEligible({ ...base, inboxAsk: true })).toBe(false);
    expect(cloudLaunchEligible({ ...base, cwd: "~" })).toBe(false);
    expect(cloudLaunchEligible({ ...base, cwd: " " })).toBe(false);
    expect(cloudLaunchEligible({ ...base, nativeResume: true })).toBe(false);
  });
});

describe("isCloudLaunchOutcome", () => {
  const outcome = {
    kind: "launched" as const,
    record: {
      provider: "codex" as const,
      id: "task_one",
      url: "https://chatgpt.com/codex/tasks/task_one",
      cwd: "/work",
      providerAccountId: "codex-account",
      environmentId: "env_1",
      branch: null,
      createdAt: 1,
    },
  };

  it("accepts a complete retained record and rejects invalid IDs and provider URLs", () => {
    expect(isCloudLaunchOutcome(outcome)).toBe(true);
    expect(
      isCloudLaunchOutcome({
        ...outcome,
        record: { ...outcome.record, id: "../task_one" },
      }),
    ).toBe(false);
    expect(
      isCloudLaunchOutcome({
        ...outcome,
        record: { ...outcome.record, url: "javascript:alert(1)" },
      }),
    ).toBe(false);
    expect(
      isCloudLaunchOutcome({
        ...outcome,
        record: {
          ...outcome.record,
          provider: "claude",
          url: "https://chatgpt.com/codex/tasks/task_one",
        },
      }),
    ).toBe(false);
  });
});
