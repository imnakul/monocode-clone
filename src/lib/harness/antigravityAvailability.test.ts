import { describe, expect, it, vi } from "vitest";
import { HARNESS_TITLE } from "../session";
import { harnessUnavailableHint, probeHarnessAvailability } from "./availability";

vi.mock("./registry", () => ({ isLiveHarness: (): boolean => true }));
vi.mock("./child", () => ({ probeHarnessBinary: async (): Promise<never> => { throw new Error("ACP helper localharness_external.exe is missing beside the selected executable."); } }));

describe("Antigravity ACP discovery guidance", () => {
  it("labels the provider ACP and does not recommend the incompatible CLI installer", (): void => {
    expect(HARNESS_TITLE.antigravity).toBe("Antigravity ACP");
    expect(harnessUnavailableHint("antigravity")).toContain("ACP");
    expect(harnessUnavailableHint("antigravity")).not.toContain("install.sh");
  });
  it("preserves the actual missing-helper diagnostic on installed builds", async (): Promise<void> => {
    await probeHarnessAvailability({ force: true });
    expect(harnessUnavailableHint("antigravity")).toContain("localharness_external.exe is missing");
  });
});
