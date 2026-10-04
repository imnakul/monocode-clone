import { describe, expect, it, vi } from "vitest";
import type { HarnessSessionInput } from "../../../integrations/harness/core/types";
import { prepareNativeInput } from "./nativeInput";

const input: HarnessSessionInput = {
  sessionId: "s1",
  cwd: "/work",
  model: "m",
  runtimeMode: "supervised",
  onEvent: () => undefined,
};

describe("prepareNativeInput", () => {
  it("skips providers that cannot hold a native binding", async () => {
    const prepare = vi.fn();
    await expect(prepareNativeInput("cursor", input, prepare)).resolves.toBe(
      input,
    );
    expect(prepare).not.toHaveBeenCalled();
  });

  it("returns the prepared input for Claude and Codex", async () => {
    const prepared = { ...input, nativeResume: { providerSessionId: "n1" } };
    const prepare = vi.fn().mockResolvedValue(prepared);
    await expect(prepareNativeInput("claude", input, prepare)).resolves.toBe(
      prepared,
    );
    await prepareNativeInput("codex", input, prepare);
    expect(prepare).toHaveBeenCalledTimes(2);
  });

  it("propagates failure instead of falling back to a fresh chat", async () => {
    const prepare = vi.fn().mockRejectedValue(new Error("source missing"));
    await expect(prepareNativeInput("codex", input, prepare)).rejects.toThrow(
      "source missing",
    );
  });
});
