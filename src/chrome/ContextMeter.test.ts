import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CompactContextSummary,
  COMPACT_CONTEXT_METER_POPOVER_CLASS,
  DETAILED_CONTEXT_METER_POPOVER_CLASS,
  ContextMeter,
} from "./ContextMeter";
import { contextTooltip } from "../lib/contextUsage";

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

  it("renders gauge and ring under default preferences", () => {
    const markup = renderToStaticMarkup(
      createElement(ContextMeter, {
        usage: { used: 58_400, window: 100_000 },
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

    expect(markup).toContain(
      'aria-label="Context window: 58,400 / 100,000 tokens (58%)"',
    );
    expect(markup).toContain("<svg");
    expect(markup).toContain("<circle");
  });

  it("renders gauge and ring when sessionUsage and turnUsage are provided without context usage", () => {
    const markup = renderToStaticMarkup(
      createElement(ContextMeter, {
        sessionUsage: { total: 15_000, input: 12_000, output: 3_000 },
        turnUsage: { total: 5_000, input: 4_000, output: 1_000 },
        harness: "claude",
        model: "claude-sonnet-4-6",
      }),
    );

    expect(markup).toContain("<svg");
    expect(markup).toContain("<circle");
  });

  it("renders two-line compact presentation at 0%, 9%, 36%, and 100% boundaries with non-wrapping layout", () => {
    const cases = [
      {
        used: 0,
        window: 200_000,
        expectedHeadline: "0% context used",
        expectedDetail: "0 / 200K tokens",
      },
      {
        used: 18_000,
        window: 200_000,
        expectedHeadline: "9% context used",
        expectedDetail: "18K / 200K tokens",
      },
      {
        used: 72_000,
        window: 200_000,
        expectedHeadline: "36% context used",
        expectedDetail: "72K / 200K tokens",
      },
      {
        used: 200_000,
        window: 200_000,
        expectedHeadline: "100% context used",
        expectedDetail: "200K / 200K tokens",
      },
    ];

    for (const c of cases) {
      const summary = contextTooltip({ used: c.used, window: c.window });
      expect(summary.headline).toBe(c.expectedHeadline);
      expect(summary.detail).toBe(c.expectedDetail);

      const markup = renderToStaticMarkup(
        createElement(CompactContextSummary, {
          headline: summary.headline,
          detail: summary.detail,
        }),
      );

      // Verify rendered headline and detail content
      expect(markup).toContain(
        `<span class="font-medium text-content">${c.expectedHeadline}</span>`,
      );
      expect(markup).toContain(
        `<span class="tabular-nums text-content/60 text-[11px]">${c.expectedDetail}</span>`,
      );

      // Verify whitespace-nowrap prevents line wrapping on both lines
      expect(markup).toContain("whitespace-nowrap");
      expect(markup).toContain("flex flex-col gap-0.5 text-left whitespace-nowrap");
    }
  });

  it("enforces compact popover uses intrinsic max-content sizing rather than w-auto", () => {
    expect(COMPACT_CONTEXT_METER_POPOVER_CLASS).toContain("w-max");
    expect(COMPACT_CONTEXT_METER_POPOVER_CLASS).not.toContain("w-auto");
    expect(COMPACT_CONTEXT_METER_POPOVER_CLASS).toContain(
      "max-w-[calc(100vw-2rem)]",
    );
    expect(DETAILED_CONTEXT_METER_POPOVER_CLASS).toContain("w-[320px]");
  });
});
