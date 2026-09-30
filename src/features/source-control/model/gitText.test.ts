import { describe, expect, it } from "vitest";
import { fallbackPrContent } from "./gitText";

describe("fallbackPrContent", () => {
  it("uses the first commit subject as title and keeps the full commit summary as the body", () => {
    expect(
      fallbackPrContent({
        head: "feature/helper-model",
        commitSummary: "feat: choose a helper model\nfix: keep edited text",
      }),
    ).toEqual({
      title: "feat: choose a helper model",
      body: "feat: choose a helper model\nfix: keep edited text",
    });
  });

  it("uses the branch name when the commit summary is empty", () => {
    expect(
      fallbackPrContent({ head: "feature/helper-model", commitSummary: " \n " }),
    ).toEqual({
      title: "Update feature/helper-model",
      body: "",
    });
  });
});
