import { describe, expect, it } from "vitest";
import { cloudLaunchEligible } from "./useCloudLaunch";

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
  });
});
