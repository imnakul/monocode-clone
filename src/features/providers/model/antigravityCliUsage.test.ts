import { beforeEach, expect, it, vi } from "vitest";
import {
  antigravityCliLimitsForModel,
  fetchAntigravityCliRateLimits,
  parseAntigravityCliCredits,
  parseAntigravityCliQuotas,
} from "./antigravityCliUsage";
import {
  errorRateLimits,
  fetchingRateLimits,
  idleRateLimits,
} from "./rateLimits";

const mocks = vi.hoisted(() => ({ probe: vi.fn(), exec: vi.fn() }));
vi.mock("../../../integrations/harness/core/child", () => ({
  probeHarnessBinary: mocks.probe,
  execChild: mocks.exec,
}));
vi.mock("../../../platform/tauri/fs", () => ({ homeDir: async () => "/home" }));
// Labelled text fixtures also cover variations that must fail or stay isolated.
const report = `Gemini Models
Weekly: 83% remaining
Resets at: 2026-10-07T08:31:30Z
Five-hour: 94% remaining; resets at 2026-10-06T12:01:15Z
Claude Models
Weekly: 100% remaining
5-hour: 100% remaining
GPT Models
Weekly: 100% remaining
5h: 100% remaining`;

// Exact sanitized Windows CLI output supplied by the user, 2026-10-06.
const nativeReport = `### Usage Status

   Model Group                     | Limit Window                   | Remaining                      | Resets At (UTC)
  ---------------------------------|--------------------------------|--------------------------------|--------------------------------
   Gemini Models                   | Weekly Limit                   | 83%                            | 2026-10-07 08:31:30
   Gemini Models                   | 5-Hour Limit                   | 100%                           | 2026-10-06 18:43:40
   Claude & GPT Models             | Weekly Limit                   | 100%                           | 2026-10-13 13:44:52
   Claude & GPT Models             | 5-Hour Limit                   | 100%                           | 2026-10-06 18:44:52

  (Credits: 0 remaining)`;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.probe.mockResolvedValue({ path: "/bin/agy" });
  mocks.exec.mockImplementation(async (_path: string, args: string[]) =>
    args[1] === "/usage" ? report : "Remaining credits 0",
  );
});

it("keeps model families and window resets separate, and treats remaining percentages correctly", () => {
  const groups = parseAntigravityCliQuotas(`\x1b[36m${report}\x1b[0m`);
  expect(groups).toHaveLength(3);
  expect(groups[0]).toMatchObject({
    name: "Gemini",
    weekly: {
      usedPercent: 17,
      windowMinutes: 10080,
      resetsAt: Date.parse("2026-10-07T08:31:30Z"),
    },
    session: { usedPercent: 6, windowMinutes: 300 },
  });
  expect(groups[1].weekly?.usedPercent).toBe(0);
  const limits = { ...idleRateLimits("antigravity-cli"), modelGroups: groups };
  expect(
    antigravityCliLimitsForModel(
      limits,
      "antigravity-cli:claude-opus-4-6-thinking",
    ).weekly?.usedPercent,
  ).toBe(0);
  expect(
    antigravityCliLimitsForModel(
      limits,
      "antigravity-cli:gemini-3.8-flash-high",
    ).weekly?.usedPercent,
  ).toBe(17);
  expect(
    antigravityCliLimitsForModel(limits, "antigravity-cli:default").weekly,
  ).toBeNull();
});

it("parses the supplied native table with UTC resets and a single shared Claude/GPT quota", () => {
  const groups = parseAntigravityCliQuotas(nativeReport.replace(/\n/g, "\r\n"));
  expect(groups).toHaveLength(2);
  expect(groups[0]).toMatchObject({
    name: "Gemini",
    weekly: { usedPercent: 17, resetsAt: Date.parse("2026-10-07T08:31:30Z") },
    session: { usedPercent: 0, resetsAt: Date.parse("2026-10-06T18:43:40Z") },
  });
  expect(groups[1]).toMatchObject({
    name: "Claude & GPT",
    weekly: { usedPercent: 0, resetsAt: Date.parse("2026-10-13T13:44:52Z") },
    session: { usedPercent: 0, resetsAt: Date.parse("2026-10-06T18:44:52Z") },
  });
  const limits = { ...idleRateLimits("antigravity-cli"), modelGroups: groups };
  for (const model of [
    "antigravity-cli:claude-opus-4-6-thinking",
    "antigravity-cli:gpt-5.4",
  ])
    expect(antigravityCliLimitsForModel(limits, model).weekly).toBe(
      groups[1].weekly,
    );
  expect(
    antigravityCliLimitsForModel(limits, "antigravity-cli:default").weekly,
  ).toBeNull();
  expect(
    parseAntigravityCliCredits(
      "Model credits\nRemaining credits  0\nUpgrade https://antigravity.google/g1-upgrade",
    ),
  ).toBe(0);
  const missingZone = parseAntigravityCliQuotas(
    nativeReport.replace("Resets At (UTC)", "Resets At"),
  );
  expect(missingZone[0].weekly?.resetsAt).toBeNull();
  expect(() =>
    parseAntigravityCliQuotas(nativeReport.replace("83%", "101%")),
  ).toThrow();
  expect(() =>
    parseAntigravityCliQuotas(nativeReport.replace("Remaining ", "Unknown   ")),
  ).toThrow();
});

it("accepts zero credit balance and fails visibly on ambiguous, invalid or provider-error reports", () => {
  expect(parseAntigravityCliCredits("Remaining credits 0")).toBe(0);
  expect(parseAntigravityCliCredits("Credits remaining: 1,234.5")).toBe(1234.5);
  expect(
    parseAntigravityCliQuotas(
      JSON.stringify({ result: { status: "SUCCESS", response: report } }),
    ),
  ).toHaveLength(3);
  for (const text of [
    "Gemini Models\nWeekly: 83%",
    "Gemini Models\nWeekly: 101% remaining",
    "sign in required",
    JSON.stringify({ status: "ERROR", response: report }),
  ]) {
    expect(() => parseAntigravityCliQuotas(text)).toThrow();
  }
  expect(() => parseAntigravityCliCredits("credits unavailable")).toThrow();
});

it("fetches fixed read-only reports without starting/resuming a chat, and retains quotas if credits fail", async () => {
  const limits = await fetchAntigravityCliRateLimits();
  expect(limits).toMatchObject({
    provider: "antigravity-cli",
    status: "ok",
    creditBalance: 0,
  });
  expect(mocks.exec).toHaveBeenCalledWith(
    "/bin/agy",
    ["--print", "/usage", "--print-timeout", "30s"],
    "/home",
    "antigravity-cli",
  );
  mocks.exec.mockImplementation(async (_path: string, args: string[]) => {
    if (args[1] === "/credits") throw new Error("unavailable");
    return nativeReport;
  });
  const partial = await fetchAntigravityCliRateLimits();
  expect(partial.modelGroups).toHaveLength(2);
  expect(partial.creditBalance).toBeUndefined();
  expect(partial.creditError).toContain("unavailable");
  expect(fetchingRateLimits("antigravity-cli", limits).creditBalance).toBe(0);
  expect(
    errorRateLimits("antigravity-cli", "offline", limits).modelGroups,
  ).toHaveLength(3);
});
