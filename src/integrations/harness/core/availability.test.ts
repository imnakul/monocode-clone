import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HarnessId } from "../../../features/sessions/model/session";
import {
  hasHarnessEvidence,
  harnessUnavailableHint,
  isHarnessAvailable,
  noteHarnessEvidence,
  probeHarnessAvailability,
  resetHarnessAvailability,
} from "./availability";

const probed: string[] = [];
vi.mock("./registry", () => ({ isLiveHarness: (): boolean => true }));
vi.mock("./child", () => ({
  probeHarnessBinary: async (id: string): Promise<{ path: string }> => {
    probed.push(id);
    return { path: `/bin/${id}` };
  },
}));

beforeEach(() => {
  resetHarnessAvailability();
  probed.length = 0;
});

describe("deferred harness availability", () => {
  it("starts with no evidence for any harness", () => {
    expect(hasHarnessEvidence("antigravity")).toBe(false);
    expect(hasHarnessEvidence("claude")).toBe(false);
    expect(isHarnessAvailable("antigravity")).toBe(false);
  });

  it("leaves excluded harnesses untouched while evidencing the rest", async () => {
    await probeHarnessAvailability({ force: true, exclude: ["antigravity"] });
    expect(probed).not.toContain("antigravity");
    expect(probed).toContain("claude");
    expect(isHarnessAvailable("claude")).toBe(true);
    expect(hasHarnessEvidence("claude")).toBe(true);
    // Deferred: still false, but honestly unevidenced — not "missing".
    expect(isHarnessAvailable("antigravity")).toBe(false);
    expect(hasHarnessEvidence("antigravity")).toBe(false);
  });

  it("records catalog evidence without running a probe", () => {
    noteHarnessEvidence("antigravity", true);
    expect(isHarnessAvailable("antigravity")).toBe(true);
    expect(hasHarnessEvidence("antigravity")).toBe(true);
    expect(probed).toHaveLength(0);
  });

  it("keeps the real diagnostic when catalog discovery fails", () => {
    noteHarnessEvidence("antigravity", false, "runtime exploded");
    expect(isHarnessAvailable("antigravity")).toBe(false);
    expect(hasHarnessEvidence("antigravity")).toBe(true);
    expect(harnessUnavailableHint("antigravity")).toContain(
      "runtime exploded",
    );
  });

  it("clears the diagnostic once the runtime proves healthy", () => {
    noteHarnessEvidence("antigravity", false, "stale failure");
    noteHarnessEvidence("antigravity", true);
    expect(harnessUnavailableHint("antigravity")).not.toContain(
      "stale failure",
    );
  });

  it("still probes every harness when nothing is excluded", async () => {
    await probeHarnessAvailability({ force: true });
    expect(probed).toContain("antigravity");
    const ids: HarnessId[] = ["claude", "antigravity"];
    for (const id of ids) expect(hasHarnessEvidence(id)).toBe(true);
  });
});
