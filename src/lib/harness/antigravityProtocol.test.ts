import { describe, expect, it } from "vitest";
import { modelsFromAntigravityOutput } from "./antigravityProtocol";

describe("Antigravity model catalog", () => {
  it("maps agy models output into picker models", () => {
    const models = modelsFromAntigravityOutput(
      [
        "gemini-3.8-flash-high\tGemini 3.8 Flash (High)",
        "claude-sonnet-4-6\tClaude Sonnet 4.6 (Thinking)",
      ].join("\n"),
    );
    expect(models).toEqual([
      {
        id: "antigravity:gemini-3.8-flash-high",
        harness: "antigravity",
        name: "Gemini 3.8 Flash (High)",
        nativeId: "gemini-3.8-flash-high",
      },
      {
        id: "antigravity:claude-sonnet-4-6",
        harness: "antigravity",
        name: "Claude Sonnet 4.6 (Thinking)",
        nativeId: "claude-sonnet-4-6",
      },
    ]);
  });
});
