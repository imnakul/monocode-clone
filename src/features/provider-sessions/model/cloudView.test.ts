import { describe, expect, it } from "vitest";
import {
  cloudActionEntries,
  cloudRecordKey,
  mergeCloudRecords,
} from "./cloudView";
import {
  cloudCapabilitiesFromHelp,
  type CloudSession,
} from "./cloudSessions";

const record = (id: string, createdAt: number, account = "default"): CloudSession => ({
  provider: "codex",
  id,
  url: `https://chatgpt.com/codex/tasks/${id}`,
  cwd: "/work",
  providerAccountId: account,
  environmentId: "e",
  branch: null,
  createdAt,
});

describe("cloudActionEntries", () => {
  it("offers Codex status/diff/apply from help and explains the missing follow-up", () => {
    const caps = cloudCapabilitiesFromHelp(
      "codex",
      "  cloud   Browse tasks",
      "  exec   Submit\n  status  Show\n  list   List\n  apply  Apply\n  diff   Diff",
    );
    const entries = cloudActionEntries("codex", caps);
    expect(entries.map((e) => e.action)).toEqual(["status", "diff", "apply", "message"]);
    expect(entries.filter((e) => e.available).map((e) => e.action)).toEqual(["status", "diff", "apply"]);
    const apply = entries.find((e) => e.action === "apply");
    expect(apply?.confirm).toBe(true);
    const message = entries.find((e) => e.action === "message");
    expect(message).toMatchObject({ available: false });
    expect(message?.reason).toContain("follow-up");
  });

  it("keeps Claude teleport and live status unavailable with their reasons", () => {
    const caps = cloudCapabilitiesFromHelp("claude", "  --cloud <prompt>\n  -p, --print");
    const entries = cloudActionEntries("claude", caps);
    expect(entries.find((e) => e.action === "message")).toMatchObject({ available: true, input: true });
    expect(entries.find((e) => e.action === "teleport")?.reason).toContain("phase 2");
    expect(entries.find((e) => e.action === "status")?.available).toBe(false);
  });

  it("marks everything unavailable when the CLI lacks cloud support", () => {
    const entries = cloudActionEntries("codex", cloudCapabilitiesFromHelp("codex", "no cloud here"));
    expect(entries.every((e) => !e.available && !!e.reason)).toBe(true);
  });
});

describe("cloud records", () => {
  it("merges accounts newest first and dedupes by provider, account and id", () => {
    const merged = mergeCloudRecords([record("a", 1), record("b", 5)], [record("a", 1), record("a", 9, "work")]);
    expect(merged.map((r) => `${r.providerAccountId}:${r.id}`)).toEqual(["work:a", "default:b", "default:a"]);
    expect(cloudRecordKey(record("a", 1))).not.toBe(cloudRecordKey(record("a", 1, "work")));
  });
});
