import { describe, expect, it } from "vitest";
import {
  calculateUsageCost,
  computeContextBreakdown,
  estimateTokens,
  formatCurrency,
  resolveModelPricing,
} from "./tokenCosting";
import type { ProcessedUsage } from "./tokenAccounting";

describe("tokenCosting", () => {
  it("resolves model pricing by model key and fallback", () => {
    const claudeSonnet = resolveModelPricing("claude-sonnet-4-6", "claude");
    expect(claudeSonnet.inputPer1M).toBe(3.0);
    expect(claudeSonnet.outputPer1M).toBe(15.0);

    const claudeOpus = resolveModelPricing("claude-opus-4-6", "claude");
    expect(claudeOpus.inputPer1M).toBe(15.0);
    expect(claudeOpus.outputPer1M).toBe(75.0);

    const codexMini = resolveModelPricing("o3-mini", "codex");
    expect(codexMini.inputPer1M).toBe(1.1);

    const fallbackCodex = resolveModelPricing("unknown-model", "codex");
    expect(fallbackCodex.inputPer1M).toBe(2.5);
  });

  it("calculates usage cost accurately including cache savings", () => {
    const usage: ProcessedUsage = {
      total: 10_000,
      input: 8_000,
      cachedInput: 6_000, // uncached input = 2,000
      cacheWrite: 1_000,
      output: 2_000,
    };
    const pricing = {
      inputPer1M: 3.0,
      cachedInputPer1M: 0.3,
      cacheWritePer1M: 3.75,
      outputPer1M: 15.0,
    };

    const cost = calculateUsageCost(usage, pricing);
    // Uncached input: 2,000 * 3.0 / 1M = $0.006
    expect(cost.inputCost).toBeCloseTo(0.006, 5);
    // Cached input: 6,000 * 0.3 / 1M = $0.0018
    expect(cost.cacheReadCost).toBeCloseTo(0.0018, 5);
    // Cache write: 1,000 * 3.75 / 1M = $0.00375
    expect(cost.cacheWriteCost).toBeCloseTo(0.00375, 5);
    // Output: 2,000 * 15.0 / 1M = $0.030
    expect(cost.outputCost).toBeCloseTo(0.03, 5);

    // Total = 0.006 + 0.0018 + 0.00375 + 0.030 = 0.04155
    expect(cost.totalCost).toBeCloseTo(0.04155, 5);

    // Cache savings: 6000 * (3.0 - 0.3) / 1M = $0.0162
    expect(cost.cacheSavings).toBeCloseTo(0.0162, 5);
  });

  it("formats currency cleanly", () => {
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(0.0004)).toBe("<$0.001");
    expect(formatCurrency(0.004)).toBe("$0.004");
    expect(formatCurrency(0.12)).toBe("$0.12");
    expect(formatCurrency(1.5)).toBe("$1.50");
  });

  it("estimates tokens from text length", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("hello world")).toBeGreaterThan(0);
    expect(estimateTokens("a".repeat(380))).toBe(100);
  });

  it("computes context breakdown segments and headroom", () => {
    const breakdown = computeContextBreakdown({
      usedTokens: 72_300,
      windowTokens: 200_000,
      messagesTokens: 8,
      memoryFiles: [
        { name: "CLAUDE.md", tokens: 3_400 },
        { name: "MEMORY.md", tokens: 300 },
      ],
      skills: [{ name: "format", tokens: 3_000 }],
      harness: "claude",
    });

    expect(breakdown.windowTokens).toBe(200_000);
    expect(breakdown.usedTokens).toBe(72_300);
    expect(breakdown.percentUsed).toBe(36);
    expect(breakdown.memoryFilesTotal).toBe(3_700);
    expect(breakdown.skillsTotal).toBe(3_000);
    expect(breakdown.messagesTokens).toBe(8);

    // systemAndTools = 72,300 - (3700 + 3000 + 8) = 65,592
    expect(breakdown.systemAndTools).toBe(65_592);
    expect(breakdown.autocompactBufferTokens).toBe(33_000);
    expect(breakdown.freeSpaceTokens).toBe(
      200_000 - 72_300 - 33_000,
    );
    expect(breakdown.segments.length).toBe(6);
  });
});
