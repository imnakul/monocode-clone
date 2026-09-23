import type { Block, HarnessId } from "./session";
import type { ProcessedUsage } from "./tokenAccounting";

export type ModelPricing = {
  inputPer1M: number;
  cachedInputPer1M: number;
  cacheWritePer1M: number;
  outputPer1M: number;
};

/**
 * Standard public token pricing per 1M tokens (USD).
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Claude models
  "claude-sonnet": {
    inputPer1M: 3.0,
    cachedInputPer1M: 0.3,
    cacheWritePer1M: 3.75,
    outputPer1M: 15.0,
  },
  "claude-opus": {
    inputPer1M: 15.0,
    cachedInputPer1M: 1.5,
    cacheWritePer1M: 18.75,
    outputPer1M: 75.0,
  },
  "claude-haiku": {
    inputPer1M: 0.8,
    cachedInputPer1M: 0.08,
    cacheWritePer1M: 1.0,
    outputPer1M: 4.0,
  },
  // Codex / OpenAI models
  "gpt-4o": {
    inputPer1M: 2.5,
    cachedInputPer1M: 1.25,
    cacheWritePer1M: 2.5,
    outputPer1M: 10.0,
  },
  "gpt-4o-mini": {
    inputPer1M: 0.15,
    cachedInputPer1M: 0.075,
    cacheWritePer1M: 0.15,
    outputPer1M: 0.6,
  },
  "o1": {
    inputPer1M: 15.0,
    cachedInputPer1M: 7.5,
    cacheWritePer1M: 15.0,
    outputPer1M: 60.0,
  },
  "o3": {
    inputPer1M: 15.0,
    cachedInputPer1M: 7.5,
    cacheWritePer1M: 15.0,
    outputPer1M: 60.0,
  },
  "o3-mini": {
    inputPer1M: 1.1,
    cachedInputPer1M: 0.55,
    cacheWritePer1M: 1.1,
    outputPer1M: 4.4,
  },
};

/** Default fallback for Claude models. */
export const DEFAULT_CLAUDE_PRICING: ModelPricing = {
  inputPer1M: 3.0,
  cachedInputPer1M: 0.3,
  cacheWritePer1M: 3.75,
  outputPer1M: 15.0,
};

/** Default fallback for Codex models. */
export const DEFAULT_CODEX_PRICING: ModelPricing = {
  inputPer1M: 2.5,
  cachedInputPer1M: 1.25,
  cacheWritePer1M: 2.5,
  outputPer1M: 10.0,
};

export function resolveModelPricing(
  modelId?: string,
  harness?: HarnessId | string,
): ModelPricing {
  const key = (modelId ?? "").toLowerCase();
  const sortedPatterns = Object.keys(MODEL_PRICING).sort(
    (a, b) => b.length - a.length,
  );
  for (const pattern of sortedPatterns) {
    if (key.includes(pattern)) {
      return MODEL_PRICING[pattern];
    }
  }
  if (harness === "codex") {
    return DEFAULT_CODEX_PRICING;
  }
  return DEFAULT_CLAUDE_PRICING;
}

export type UsageCost = {
  totalCost: number;
  inputCost: number;
  cacheReadCost: number;
  cacheWriteCost: number;
  outputCost: number;
  cacheSavings: number;
};

export function calculateUsageCost(
  usage?: ProcessedUsage,
  pricing: ModelPricing = DEFAULT_CLAUDE_PRICING,
): UsageCost {
  if (!usage || usage.total <= 0) {
    return {
      totalCost: 0,
      inputCost: 0,
      cacheReadCost: 0,
      cacheWriteCost: 0,
      outputCost: 0,
      cacheSavings: 0,
    };
  }

  const cachedTokens = usage.cachedInput ?? 0;
  const cacheWriteTokens = usage.cacheWrite ?? 0;
  const uncachedInputTokens = Math.max(0, usage.input - cachedTokens);

  const inputCost = (uncachedInputTokens * pricing.inputPer1M) / 1_000_000;
  const cacheReadCost = (cachedTokens * pricing.cachedInputPer1M) / 1_000_000;
  const cacheWriteCost = (cacheWriteTokens * pricing.cacheWritePer1M) / 1_000_000;
  const outputCost = (usage.output * pricing.outputPer1M) / 1_000_000;

  const totalCost = inputCost + cacheReadCost + cacheWriteCost + outputCost;

  // What cache-read tokens would have cost without prompt caching
  const hypotheticalUncachedCost =
    (cachedTokens * pricing.inputPer1M) / 1_000_000;
  const cacheSavings = Math.max(0, hypotheticalUncachedCost - cacheReadCost);

  return {
    totalCost,
    inputCost,
    cacheReadCost,
    cacheWriteCost,
    outputCost,
    cacheSavings,
  };
}

export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "$0.00";
  if (amount < 0.001) return "<$0.001";
  if (amount < 0.01) return `$${amount.toFixed(3)}`;
  return `$${amount.toFixed(2)}`;
}

/**
 * Fast token count estimator for markdown, code, and text (~3.8 characters per token).
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0;
  return Math.max(1, Math.round(text.length / 3.8));
}

/**
 * Estimates tokens occupied by conversation transcript blocks.
 */
export function estimateBlocksTokens(blocks: Block[]): number {
  let totalChars = 0;
  for (const block of blocks) {
    if (block.text) {
      totalChars += block.text.length;
    }
  }
  return estimateTokens(" ".repeat(totalChars));
}

export type ContextBreakdownItem = {
  name: string;
  path?: string;
  tokens: number;
};

export type ContextSegment = {
  id: string;
  label: string;
  tokens: number;
  percent: number;
  colorClass: string;
};

export type ContextWindowBreakdown = {
  usedTokens: number;
  windowTokens: number;
  ratio: number;
  percentUsed: number;
  systemAndTools: number;
  memoryFiles: ContextBreakdownItem[];
  memoryFilesTotal: number;
  skills: ContextBreakdownItem[];
  skillsTotal: number;
  messagesTokens: number;
  autocompactBufferTokens: number;
  freeSpaceTokens: number;
  segments: ContextSegment[];
};

export function computeContextBreakdown(params: {
  usedTokens: number;
  windowTokens?: number;
  memoryFiles?: ContextBreakdownItem[];
  skills?: ContextBreakdownItem[];
  messagesTokens?: number;
  harness?: HarnessId | string;
}): ContextWindowBreakdown {
  const windowTokens =
    params.windowTokens && params.windowTokens > 0
      ? params.windowTokens
      : 200_000;
  const usedTokens = Math.max(0, params.usedTokens);

  const memoryFiles = params.memoryFiles ?? [];
  const memoryFilesTotal = memoryFiles.reduce(
    (acc, cur) => acc + cur.tokens,
    0,
  );

  const skills = params.skills ?? [];
  const skillsTotal = skills.reduce((acc, cur) => acc + cur.tokens, 0);

  const messagesTokens = Math.max(0, params.messagesTokens ?? 0);

  // System prompt + tools is what remains from usedTokens after subtracting
  // memory files, skills, and conversation messages.
  const staticNonSystem = memoryFilesTotal + skillsTotal + messagesTokens;
  const systemAndTools = Math.max(0, usedTokens - staticNonSystem);

  // Autocompact buffer: Claude auto-compacts around 83% of 200k (leaving ~33k buffer);
  // for general models, reserve ~15% headroom.
  const autocompactRatio = params.harness === "claude" ? 0.165 : 0.15;
  const autocompactBufferTokens = Math.round(windowTokens * autocompactRatio);

  const freeSpaceTokens = Math.max(
    0,
    windowTokens - usedTokens - autocompactBufferTokens,
  );

  const ratio = Math.min(1, usedTokens / windowTokens);
  const percentUsed = Math.round(ratio * 100);

  const safeWindow = Math.max(1, windowTokens);

  const segments: ContextSegment[] = [
    {
      id: "system",
      label: "System & tools",
      tokens: systemAndTools,
      percent: (systemAndTools / safeWindow) * 100,
      colorClass: "bg-sky-400",
    },
    {
      id: "memory",
      label: "Memory files",
      tokens: memoryFilesTotal,
      percent: (memoryFilesTotal / safeWindow) * 100,
      colorClass: "bg-amber-500",
    },
    {
      id: "skills",
      label: "Skills",
      tokens: skillsTotal,
      percent: (skillsTotal / safeWindow) * 100,
      colorClass: "bg-emerald-400",
    },
    {
      id: "messages",
      label: "Messages",
      tokens: messagesTokens,
      percent: (messagesTokens / safeWindow) * 100,
      colorClass: "bg-rose-400",
    },
    {
      id: "autocompact",
      label: "Autocompact buffer",
      tokens: autocompactBufferTokens,
      percent: (autocompactBufferTokens / safeWindow) * 100,
      colorClass: "bg-content/20",
    },
    {
      id: "free",
      label: "Free space",
      tokens: freeSpaceTokens,
      percent: (freeSpaceTokens / safeWindow) * 100,
      colorClass: "bg-content/5",
    },
  ];

  return {
    usedTokens,
    windowTokens,
    ratio,
    percentUsed,
    systemAndTools,
    memoryFiles,
    memoryFilesTotal,
    skills,
    skillsTotal,
    messagesTokens,
    autocompactBufferTokens,
    freeSpaceTokens,
    segments,
  };
}
