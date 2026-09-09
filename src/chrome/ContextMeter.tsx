import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  contextPercent,
  contextRatio,
  formatTokens,
  type ContextUsage,
} from "../lib/contextUsage";
import { joinPath } from "../lib/paths";
import { readTextFile, type DiscoveredSkill, listSkills } from "../lib/fs";
import type { Block, HarnessId } from "../lib/session";
import type { ProcessedUsage } from "../lib/tokenAccounting";
import {
  computeContextBreakdown,
  calculateUsageCost,
  estimateBlocksTokens,
  estimateTokens,
  formatCurrency,
  resolveModelPricing,
  type ContextBreakdownItem,
} from "../lib/tokenCosting";
import {
  computeSystemAndToolsBreakdown,
  loadSystemAndToolsConfig,
  type LoadedSystemConfig,
} from "../lib/systemBreakdown";
import {
  formatResetCountdown,
  formatUsagePercent,
  type ProviderRateLimits,
} from "../lib/rateLimits";
import {
  fetchClaudeRateLimits,
  fetchCodexRateLimits,
} from "../lib/rateLimitsFetch";
import { ChevronDown, ChevronRight } from "./icons";
import { Popover } from "./Popover";

const SIZE = 14;
const STROKE = 2;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Ring turns amber then red as the window fills. */
function ringClass(ratio: number): string {
  if (ratio >= 0.9) return "text-red-400";
  if (ratio >= 0.75) return "text-amber-400";
  return "text-content/45";
}

export type ContextMeterProps = {
  /** Context window usage. */
  usage?: ContextUsage;
  /** Processed usage for the active (or latest) turn. */
  turnUsage?: ProcessedUsage;
  /** Processed usage across the session. */
  sessionUsage?: ProcessedUsage;
  /** Whether the session is actively streaming or running a turn. */
  busy?: boolean;
  /** Active harness ID ("claude" | "codex" | ...). */
  harness?: HarnessId;
  /** Model name or identifier. */
  model?: string;
  /** Workspace cwd. */
  cwd?: string;
  /** Session transcript blocks. */
  blocks?: Block[];
  /** Optional handler to trigger context compaction. */
  onCompact?: () => boolean | void;
  /** Whether compaction is currently disabled. */
  compactDisabled?: boolean;
};

function UsageBreakdownRows({ usage }: { usage: ProcessedUsage }) {
  return (
    <div className="space-y-0.5 text-[11px] text-content/70">
      <div className="flex justify-between">
        <span className="text-content/50">Input</span>
        <span className="tabular-nums">{usage.input.toLocaleString()}</span>
      </div>
      {usage.cachedInput !== undefined && usage.cachedInput > 0 ? (
        <div className="flex justify-between pl-2">
          <span className="text-content/40">Cached input</span>
          <span className="tabular-nums">
            {usage.cachedInput.toLocaleString()}
          </span>
        </div>
      ) : null}
      {usage.cacheWrite !== undefined && usage.cacheWrite > 0 ? (
        <div className="flex justify-between pl-2">
          <span className="text-content/40">Cache write</span>
          <span className="tabular-nums">
            {usage.cacheWrite.toLocaleString()}
          </span>
        </div>
      ) : null}
      <div className="flex justify-between">
        <span className="text-content/50">Output</span>
        <span className="tabular-nums">{usage.output.toLocaleString()}</span>
      </div>
      {usage.reasoning !== undefined && usage.reasoning > 0 ? (
        <div className="flex justify-between pl-2">
          <span className="text-content/40">Reasoning</span>
          <span className="tabular-nums">
            {usage.reasoning.toLocaleString()}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Circular gauge and comprehensive inspection popover for context window and costing.
 */
export function ContextMeter({
  usage,
  turnUsage,
  sessionUsage,
  busy,
  harness,
  model,
  cwd,
  blocks,
  onCompact,
  compactDisabled,
}: ContextMeterProps) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [systemExpanded, setSystemExpanded] = useState(false);
  const [builtinToolsExpanded, setBuiltinToolsExpanded] = useState(false);
  const [mcpServersExpanded, setMcpServersExpanded] = useState(true);
  const [pluginsExpanded, setPluginsExpanded] = useState(true);
  const [memoryFilesExpanded, setMemoryFilesExpanded] = useState(false);
  const [skillsExpanded, setSkillsExpanded] = useState(false);
  const [turnExpanded, setTurnExpanded] = useState(false);
  const [sessionExpanded, setSessionExpanded] = useState(false);

  const [systemConfig, setSystemConfig] = useState<LoadedSystemConfig | null>(null);
  const [memoryFiles, setMemoryFiles] = useState<ContextBreakdownItem[]>([]);
  const [skills, setSkills] = useState<ContextBreakdownItem[]>([]);
  const [rateLimits, setRateLimits] = useState<ProviderRateLimits | null>(null);

  const root = useRef<HTMLButtonElement>(null);
  const ratio = contextRatio(usage);
  const percent = contextPercent(usage);

  const hasData =
    usage != null ||
    turnUsage != null ||
    sessionUsage != null ||
    (blocks && blocks.length > 0);
  if (!hasData) return null;

  const isOpen = hovered || pinned;

  // Inspect system prompt, tools, memory files and skills for Claude and Codex
  useEffect(() => {
    let active = true;
    if (!isOpen) return;

    async function inspect() {
      // 1. Load system & tools configuration (MCP servers, plugins, global rules)
      try {
        const sysCfg = await loadSystemAndToolsConfig({ harness, cwd });
        if (active) {
          setSystemConfig(sysCfg);
        }
      } catch {
        // Ignore system config load errors
      }

      if (!cwd) return;

      const candidates =
        harness === "codex"
          ? ["AGENTS.md", ".codex/instructions.md"]
          : ["CLAUDE.md", ".claude/CLAUDE.md", ".claude/MEMORY.md"];

      const foundFiles: ContextBreakdownItem[] = [];
      for (const rel of candidates) {
        try {
          const full = joinPath(cwd!, rel);
          const content = await readTextFile(full);
          if (active && content) {
            foundFiles.push({
              name: rel,
              path: full,
              tokens: estimateTokens(content),
            });
          }
        } catch {
          // File does not exist
        }
      }

      let foundSkills: ContextBreakdownItem[] = [];
      try {
        const discovered = await listSkills(cwd!);
        if (active && Array.isArray(discovered)) {
          foundSkills = (discovered as DiscoveredSkill[])
            .filter((s) =>
              harness
                ? s.source === harness ||
                  s.source === "agents" ||
                  s.source === "monocode"
                : true,
            )
            .map((s) => ({
              name: s.name,
              tokens: estimateTokens(`${s.name} ${s.description}`),
            }));
        }
      } catch {
        // Ignore skill discovery errors
      }

      if (active) {
        setMemoryFiles(foundFiles);
        setSkills(foundSkills);
      }
    }

    void inspect();
    return () => {
      active = false;
    };
  }, [isOpen, cwd, harness]);

  // Fetch plan rate limits (5-hour and weekly) when popover is open
  useEffect(() => {
    let active = true;
    if (!isOpen || (harness !== "claude" && harness !== "codex")) return;

    async function fetchLimits() {
      try {
        const limits =
          harness === "codex"
            ? await fetchCodexRateLimits()
            : await fetchClaudeRateLimits();
        if (active && limits && limits.status === "ok") {
          setRateLimits(limits);
        }
      } catch {
        // Ignore limit fetch failures
      }
    }

    void fetchLimits();
    return () => {
      active = false;
    };
  }, [isOpen, harness]);

  const messagesTokens = blocks ? estimateBlocksTokens(blocks) : 0;
  const breakdown = computeContextBreakdown({
    usedTokens: usage?.used ?? turnUsage?.input ?? messagesTokens,
    windowTokens: usage?.window,
    memoryFiles,
    skills,
    messagesTokens,
    harness,
  });

  const systemBreakdown = useMemo(() => {
    return computeSystemAndToolsBreakdown({
      totalTokens: breakdown.systemAndTools,
      harness,
      globalRules: systemConfig?.globalRules,
      mcpServers: systemConfig?.mcpServers,
      plugins: systemConfig?.plugins,
    });
  }, [breakdown.systemAndTools, harness, systemConfig]);

  const pricing = resolveModelPricing(model, harness);
  const turnCost = calculateUsageCost(turnUsage, pricing);
  const sessionCost = calculateUsageCost(sessionUsage, pricing);

  const handlePointerEnter = useCallback(() => {
    setHovered(true);
  }, []);

  const handlePointerLeave = useCallback(() => {
    setHovered(false);
  }, []);

  const handleClick = useCallback(() => {
    setPinned((p) => !p);
  }, []);

  const handleDismiss = useCallback(() => {
    setPinned(false);
    setHovered(false);
  }, []);

  const title =
    usage?.window != null && usage?.used != null
      ? `Context window: ${usage.used.toLocaleString()} / ${usage.window.toLocaleString()} tokens (${percent}%)`
      : "Context window & token usage";

  return (
    <div
      className="relative inline-flex items-center"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <button
        ref={root}
        type="button"
        onClick={handleClick}
        aria-label={title}
        aria-expanded={isOpen}
        className="flex size-6 items-center justify-center rounded-md text-content/50 transition-colors hover:bg-content/5 hover:text-content"
      >
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className={`-rotate-90 ${busy ? "animate-pulse" : ""}`}
          aria-hidden
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            className="text-content/15"
          />
          {ratio !== null && ratio > 0 ? (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
              strokeLinecap="round"
              className={ringClass(ratio)}
            />
          ) : null}
        </svg>
      </button>

      {isOpen ? (
        <Popover
          anchor={root}
          side="top"
          align="end"
          gap={6}
          onDismiss={handleDismiss}
          dismissOnEscape
          className="w-[320px] max-w-[calc(100vw-2rem)] max-h-[82vh] overflow-y-auto p-3.5 text-xs text-content select-none shadow-xl border border-content/10 bg-surface rounded-xl"
        >
          <div className="space-y-3">
            {/* Header */}
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-content">Context window</span>
                <div className="flex items-center gap-2">
                  {onCompact ? (
                    <button
                      type="button"
                      disabled={compactDisabled}
                      onClick={() => {
                        onCompact();
                      }}
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-content/10 text-content/70 hover:bg-content/15 hover:text-content disabled:opacity-40 disabled:pointer-events-none"
                    >
                      Compact
                    </button>
                  ) : null}
                  <span className="tabular-nums text-content/70 text-[11px]">
                    {formatTokens(breakdown.usedTokens)} /{" "}
                    {formatTokens(breakdown.windowTokens)} ({breakdown.percentUsed}
                    %)
                  </span>
                </div>
              </div>

              {/* Horizontal Stacked Bar */}
              <div
                className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-content/10"
                aria-hidden
              >
                {breakdown.segments.map((seg) => {
                  if (seg.percent <= 0) return null;
                  return (
                    <div
                      key={seg.id}
                      className={`h-full ${seg.colorClass}`}
                      style={{ width: `${Math.max(0.5, seg.percent)}%` }}
                      title={`${seg.label}: ${seg.tokens.toLocaleString()} tokens (${seg.percent.toFixed(1)}%)`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Context Segments Legend / Overview */}
            <div className="space-y-1 text-[11px]">
              {breakdown.segments.map((seg) => {
                if (seg.tokens <= 0 && seg.id !== "free") return null;
                const isSystem = seg.id === "system";
                return (
                  <div
                    key={seg.id}
                    onClick={isSystem ? () => setSystemExpanded((e) => !e) : undefined}
                    className={`flex items-center justify-between text-content/70 ${
                      isSystem ? "cursor-pointer hover:text-content group" : ""
                    }`}
                    title={isSystem ? "Click to toggle System & tools breakdown" : undefined}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`size-2 shrink-0 rounded-full ${seg.colorClass}`}
                      />
                      <span className="truncate">
                        {seg.label}
                        {isSystem ? (
                          <span className="ml-1 text-[10px] text-content/40 group-hover:text-content/70">
                            {systemExpanded ? "▴" : "▾"}
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 tabular-nums shrink-0">
                      <span>{formatTokens(seg.tokens)}</span>
                      <span className="text-content/40 w-9 text-right">
                        {seg.percent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Collapsible System & Tools Breakdown */}
            {breakdown.systemAndTools > 0 ? (
              <div className="border-t border-content/10 pt-2 space-y-1">
                <button
                  type="button"
                  onClick={() => setSystemExpanded((e) => !e)}
                  className="flex w-full items-center justify-between text-left text-[11px] text-content/80 hover:text-content"
                >
                  <span className="flex items-center gap-1">
                    {systemExpanded ? (
                      <ChevronDown
                        className="size-3 shrink-0"
                        strokeWidth={1.75}
                      />
                    ) : (
                      <ChevronRight
                        className="size-3 shrink-0"
                        strokeWidth={1.75}
                      />
                    )}
                    <span>System & tools</span>
                  </span>
                  <span className="tabular-nums text-content/50">
                    {formatTokens(systemBreakdown.totalTokens)}
                  </span>
                </button>
                {systemExpanded ? (
                  <div className="space-y-1.5 pl-4 text-[11px] text-content/70">
                    {/* Base system instructions */}
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-content/60">
                        Base prompt ({harness === "codex" ? "Codex" : "Claude"})
                      </span>
                      <span className="tabular-nums shrink-0">
                        {formatTokens(systemBreakdown.baseInstructions)}
                      </span>
                    </div>

                    {/* Global rules (e.g. ~/.claude/CLAUDE.md or ~/.codex/AGENTS.md) */}
                    {systemBreakdown.globalRules.length > 0 ? (
                      <div className="space-y-0.5">
                        {systemBreakdown.globalRules.map((rule) => (
                          <div
                            key={rule.name}
                            className="flex items-center justify-between gap-1"
                            title={rule.path}
                          >
                            <span className="text-content/60 truncate">
                              {rule.name}
                            </span>
                            <span className="tabular-nums shrink-0">
                              {formatTokens(rule.tokens)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {/* Environment / workspace context */}
                    {systemBreakdown.environment > 0 ? (
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-content/60">
                          Environment & git context
                        </span>
                        <span className="tabular-nums shrink-0">
                          {formatTokens(systemBreakdown.environment)}
                        </span>
                      </div>
                    ) : null}

                    {/* Built-in tools */}
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setBuiltinToolsExpanded((e) => !e)}
                        className="flex w-full items-center justify-between text-left text-content/70 hover:text-content"
                      >
                        <span className="flex items-center gap-1">
                          {builtinToolsExpanded ? (
                            <ChevronDown
                              className="size-2.5 shrink-0"
                              strokeWidth={1.75}
                            />
                          ) : (
                            <ChevronRight
                              className="size-2.5 shrink-0"
                              strokeWidth={1.75}
                            />
                          )}
                          <span>
                            Built-in tools ({systemBreakdown.builtinTools.length})
                          </span>
                        </span>
                        <span className="tabular-nums text-content/50 shrink-0">
                          {formatTokens(systemBreakdown.builtinToolsTotal)}
                        </span>
                      </button>
                      {builtinToolsExpanded ? (
                        <div className="space-y-0.5 pl-3 text-[10.5px] text-content/60">
                          {systemBreakdown.builtinTools.map((t) => (
                            <div
                              key={t.name}
                              className="flex items-center justify-between gap-1"
                              title={t.description}
                            >
                              <span className="truncate">{t.name}</span>
                              <span className="tabular-nums shrink-0">
                                {formatTokens(t.tokens)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {/* MCP Servers */}
                    {systemBreakdown.mcpServers.length > 0 ? (
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => setMcpServersExpanded((e) => !e)}
                          className="flex w-full items-center justify-between text-left text-content/70 hover:text-content"
                        >
                          <span className="flex items-center gap-1">
                            {mcpServersExpanded ? (
                              <ChevronDown
                                className="size-2.5 shrink-0"
                                strokeWidth={1.75}
                              />
                            ) : (
                              <ChevronRight
                                className="size-2.5 shrink-0"
                                strokeWidth={1.75}
                              />
                            )}
                            <span>
                              MCP Servers ({systemBreakdown.mcpServers.length})
                            </span>
                          </span>
                          <span className="tabular-nums text-content/50 shrink-0">
                            {formatTokens(systemBreakdown.mcpServersTotal)}
                          </span>
                        </button>
                        {mcpServersExpanded ? (
                          <div className="space-y-0.5 pl-3 text-[10.5px] text-content/60">
                            {systemBreakdown.mcpServers.map((s) => (
                              <div
                                key={s.name}
                                className="flex items-center justify-between gap-1"
                                title={s.command || s.url}
                              >
                                <span className="truncate">{s.name}</span>
                                <span className="tabular-nums shrink-0">
                                  {formatTokens(s.tokens)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Plugins (Codex) */}
                    {systemBreakdown.plugins.length > 0 ? (
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => setPluginsExpanded((e) => !e)}
                          className="flex w-full items-center justify-between text-left text-content/70 hover:text-content"
                        >
                          <span className="flex items-center gap-1">
                            {pluginsExpanded ? (
                              <ChevronDown
                                className="size-2.5 shrink-0"
                                strokeWidth={1.75}
                              />
                            ) : (
                              <ChevronRight
                                className="size-2.5 shrink-0"
                                strokeWidth={1.75}
                              />
                            )}
                            <span>
                              Plugins ({systemBreakdown.plugins.length})
                            </span>
                          </span>
                          <span className="tabular-nums text-content/50 shrink-0">
                            {formatTokens(systemBreakdown.pluginsTotal)}
                          </span>
                        </button>
                        {pluginsExpanded ? (
                          <div className="space-y-0.5 pl-3 text-[10.5px] text-content/60">
                            {systemBreakdown.plugins.map((p) => (
                              <div
                                key={p.name}
                                className="flex items-center justify-between gap-1"
                              >
                                <span className="truncate">{p.name}</span>
                                <span className="tabular-nums shrink-0">
                                  {formatTokens(p.tokens)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Dynamic runtime overhead */}
                    {systemBreakdown.overhead > 0 ? (
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-content/50">
                          Dynamic runtime context
                        </span>
                        <span className="tabular-nums text-content/40 shrink-0">
                          {formatTokens(systemBreakdown.overhead)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Collapsible Memory Files */}
            {breakdown.memoryFiles.length > 0 ? (
              <div className="border-t border-content/10 pt-2 space-y-1">
                <button
                  type="button"
                  onClick={() => setMemoryFilesExpanded((e) => !e)}
                  className="flex w-full items-center justify-between text-left text-[11px] text-content/80 hover:text-content"
                >
                  <span className="flex items-center gap-1">
                    {memoryFilesExpanded ? (
                      <ChevronDown
                        className="size-3 shrink-0"
                        strokeWidth={1.75}
                      />
                    ) : (
                      <ChevronRight
                        className="size-3 shrink-0"
                        strokeWidth={1.75}
                      />
                    )}
                    <span>Memory files</span>
                  </span>
                  <span className="tabular-nums text-content/50">
                    {formatTokens(breakdown.memoryFilesTotal)} (
                    {breakdown.memoryFiles.length})
                  </span>
                </button>
                {memoryFilesExpanded ? (
                  <div className="space-y-1 pl-4 text-[11px] text-content/60">
                    {breakdown.memoryFiles.map((file) => (
                      <div
                        key={file.name}
                        className="flex items-center justify-between gap-1"
                        title={file.path}
                      >
                        <span className="truncate">{file.name}</span>
                        <span className="tabular-nums shrink-0">
                          {formatTokens(file.tokens)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Collapsible Skills */}
            {breakdown.skills.length > 0 ? (
              <div className="border-t border-content/10 pt-2 space-y-1">
                <button
                  type="button"
                  onClick={() => setSkillsExpanded((e) => !e)}
                  className="flex w-full items-center justify-between text-left text-[11px] text-content/80 hover:text-content"
                >
                  <span className="flex items-center gap-1">
                    {skillsExpanded ? (
                      <ChevronDown
                        className="size-3 shrink-0"
                        strokeWidth={1.75}
                      />
                    ) : (
                      <ChevronRight
                        className="size-3 shrink-0"
                        strokeWidth={1.75}
                      />
                    )}
                    <span>Skills</span>
                  </span>
                  <span className="tabular-nums text-content/50">
                    {formatTokens(breakdown.skillsTotal)} (
                    {breakdown.skills.length})
                  </span>
                </button>
                {skillsExpanded ? (
                  <div className="space-y-1 pl-4 text-[11px] text-content/60">
                    {breakdown.skills.map((skill) => (
                      <div
                        key={skill.name}
                        className="flex items-center justify-between gap-1"
                      >
                        <span className="truncate">{skill.name}</span>
                        <span className="tabular-nums shrink-0">
                          {formatTokens(skill.tokens)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Plan Usage Limits (if known) */}
            {rateLimits &&
            (rateLimits.session != null || rateLimits.weekly != null) ? (
              <div className="border-t border-content/10 pt-2 space-y-1.5 text-[11px]">
                <div className="font-medium text-content/90">
                  Plan usage limits
                </div>
                {rateLimits.session ? (
                  <div className="flex items-center justify-between text-content/70">
                    <span>5-hour limit</span>
                    <div className="flex items-center gap-2 tabular-nums">
                      {rateLimits.session.resetsAt ? (
                        <span className="text-content/50 text-[10px]">
                          {formatResetCountdown(
                            rateLimits.session.resetsAt - Date.now(),
                          )}
                        </span>
                      ) : null}
                      <span>
                        {formatUsagePercent(rateLimits.session.usedPercent)}
                      </span>
                    </div>
                  </div>
                ) : null}
                {rateLimits.weekly ? (
                  <div className="flex items-center justify-between text-content/70">
                    <span>Weekly limit</span>
                    <div className="flex items-center gap-2 tabular-nums">
                      {rateLimits.weekly.resetsAt ? (
                        <span className="text-content/50 text-[10px]">
                          {formatResetCountdown(
                            rateLimits.weekly.resetsAt - Date.now(),
                          )}
                        </span>
                      ) : null}
                      <span>
                        {formatUsagePercent(rateLimits.weekly.usedPercent)}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Costing and Token Processing */}
            <div className="border-t border-content/10 pt-2 space-y-2">
              <div className="flex items-baseline justify-between text-content">
                <span className="font-medium text-[11px]">
                  Costing & Processing
                </span>
                {sessionCost.totalCost > 0 ? (
                  <span className="text-[11px] font-semibold text-emerald-400 tabular-nums">
                    {formatCurrency(sessionCost.totalCost)} session
                  </span>
                ) : null}
              </div>

              {/* Turn cost & breakdown */}
              {turnUsage != null ? (
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setTurnExpanded((e) => !e)}
                    className="flex w-full items-center justify-between text-left text-[11px] text-content/80 hover:text-content"
                  >
                    <span className="flex items-center gap-1">
                      {turnExpanded ? (
                        <ChevronDown
                          className="size-3 shrink-0"
                          strokeWidth={1.75}
                        />
                      ) : (
                        <ChevronRight
                          className="size-3 shrink-0"
                          strokeWidth={1.75}
                        />
                      )}
                      <span>Latest turn</span>
                    </span>
                    <div className="flex items-center gap-1.5 tabular-nums">
                      {turnCost.cacheSavings > 0 ? (
                        <span className="text-[10px] text-emerald-400">
                          (Saved {formatCurrency(turnCost.cacheSavings)})
                        </span>
                      ) : null}
                      <span>{formatCurrency(turnCost.totalCost)}</span>
                    </div>
                  </button>
                  {turnExpanded ? (
                    <div className="pl-4">
                      <UsageBreakdownRows usage={turnUsage} />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Session breakdown */}
              {sessionUsage != null ? (
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setSessionExpanded((e) => !e)}
                    className="flex w-full items-center justify-between text-left text-[11px] text-content/80 hover:text-content"
                  >
                    <span className="flex items-center gap-1">
                      {sessionExpanded ? (
                        <ChevronDown
                          className="size-3 shrink-0"
                          strokeWidth={1.75}
                        />
                      ) : (
                        <ChevronRight
                          className="size-3 shrink-0"
                          strokeWidth={1.75}
                        />
                      )}
                      <span>Session total tokens</span>
                    </span>
                    <span className="tabular-nums text-content/50">
                      {sessionUsage.total.toLocaleString()}
                    </span>
                  </button>
                  {sessionExpanded ? (
                    <div className="pl-4">
                      <UsageBreakdownRows usage={sessionUsage} />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Footer note */}
            <div className="border-t border-content/10 pt-1.5 flex items-center justify-between text-[10px] text-content/40">
              <span>
                {harness === "codex"
                  ? "Codex telemetry"
                  : harness === "claude"
                    ? "Claude Code telemetry"
                    : "Harness telemetry"}
              </span>
              <span>
                ${pricing.inputPer1M.toFixed(2)}/M in · $
                {pricing.outputPer1M.toFixed(2)}/M out
              </span>
            </div>
          </div>
        </Popover>
      ) : null}
    </div>
  );
}
