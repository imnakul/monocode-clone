import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContextMeter } from "./ContextMeter";

describe("ContextMeter", () => {
  it("renders null when no data is provided", () => {
    const markup = renderToStaticMarkup(createElement(ContextMeter, {}));
    expect(markup).toBe("");
  });

  it("renders circular gauge with accessible title when usage is given", () => {
    const markup = renderToStaticMarkup(
      createElement(ContextMeter, {
        usage: { used: 72_300, window: 200_000 },
        turnUsage: {
          total: 10_000,
          input: 8_000,
          cachedInput: 6_000,
          output: 2_000,
        },
        harness: "claude",
        model: "claude-sonnet-4-6",
      }),
    );

    expect(markup).toContain('aria-label="Context window: 72,300 / 200,000 tokens (36%)"');
    expect(markup).toContain("<svg");
    expect(markup).toContain("<circle");
  });

  it("renders Codex gauge and accessible aria-label", () => {
    const markup = renderToStaticMarkup(
      createElement(ContextMeter, {
        usage: { used: 50_000, window: 128_000 },
        harness: "codex",
        model: "o3-mini",
      }),
    );

    expect(markup).toContain('aria-label="Context window: 50,000 / 128,000 tokens (39%)"');
  });
});
