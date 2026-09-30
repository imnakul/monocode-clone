import type { ContextSegment } from "./tokenCosting";

export type NativeContextBreakdown = {
  source: "claude";
  totalTokens: number;
  windowTokens: number;
  model?: string;
  categories: {
    name: string;
    tokens: number;
    kind: "used" | "free" | "buffer" | "deferred";
  }[];
  mcpServers: {
    serverName: string;
    tokens: number;
    toolCount: number;
    deferredTools: number;
  }[];
  memoryFiles: { path: string; tokens: number }[];
  skills?: { count: number; tokens: number };
  messages?: {
    toolCalls: number;
    toolResults: number;
    attachments: number;
    assistant: number;
    user: number;
    unattributed: number;
  };
  autoCompactThreshold?: number;
};

/** Provider order is preserved; deferred tools are outside the current context bar. */
export function nativeSegments(
  breakdown: NativeContextBreakdown,
): ContextSegment[] {
  const palette = [
    "bg-sky-400",
    "bg-amber-500",
    "bg-emerald-400",
    "bg-rose-400",
    "bg-violet-400",
    "bg-cyan-400",
  ];
  return breakdown.categories.flatMap((category, index) =>
    category.kind === "deferred"
      ? []
      : [
          {
            id: `native-${index}`,
            label: category.name,
            tokens: category.tokens,
            percent:
              (category.tokens / Math.max(1, breakdown.windowTokens)) * 100,
            source: "reported",
            colorClass:
              category.kind === "free"
                ? "bg-content/5"
                : category.kind === "buffer"
                  ? "bg-content/20"
                  : palette[index % palette.length],
          },
        ],
  );
}
