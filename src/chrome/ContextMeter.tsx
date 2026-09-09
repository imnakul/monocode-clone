import { useRef, useState } from "react";
import {
  contextPercent,
  contextRatio,
  type ContextUsage,
} from "../lib/contextUsage";
import type { ProcessedUsage } from "../lib/tokenAccounting";
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
};

function UsageBreakdown({
  usage,
  label,
  expanded,
  onToggle,
}: {
  usage: ProcessedUsage;
  label: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="space-y-1">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-1 text-left text-[11px] text-content/60 hover:text-content"
      >
        <span className="flex items-center gap-1">
          {expanded ? (
            <ChevronDown className="size-3 shrink-0" strokeWidth={1.75} />
          ) : (
            <ChevronRight className="size-3 shrink-0" strokeWidth={1.75} />
          )}
          <span>{label} breakdown</span>
        </span>
        <span className="tabular-nums">{usage.total.toLocaleString()} total</span>
      </button>
      {expanded ? (
        <div className="space-y-0.5 pl-4 text-[11px] text-content/70">
          <div className="flex justify-between">
            <span className="text-content/50">Input</span>
            <span className="tabular-nums">{usage.input.toLocaleString()}</span>
          </div>
          {usage.cachedInput !== undefined && usage.cachedInput > 0 ? (
            <div className="flex justify-between pl-2">
              <span className="text-content/40">Cached input</span>
              <span className="tabular-nums">{usage.cachedInput.toLocaleString()}</span>
            </div>
          ) : null}
          {usage.cacheWrite !== undefined && usage.cacheWrite > 0 ? (
            <div className="flex justify-between pl-2">
              <span className="text-content/40">Cache write</span>
              <span className="tabular-nums">{usage.cacheWrite.toLocaleString()}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-content/50">Output</span>
            <span className="tabular-nums">{usage.output.toLocaleString()}</span>
          </div>
          {usage.reasoning !== undefined && usage.reasoning > 0 ? (
            <div className="flex justify-between pl-2">
              <span className="text-content/40">Reasoning</span>
              <span className="tabular-nums">{usage.reasoning.toLocaleString()}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Circular gauge and disclosure popover for token accounting.
 *
 * Keeps context-window occupancy separate from turn and session processed tokens.
 */
export function ContextMeter({
  usage,
  turnUsage,
  sessionUsage,
  busy,
}: ContextMeterProps) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [turnExpanded, setTurnExpanded] = useState(false);
  const [sessionExpanded, setSessionExpanded] = useState(false);

  const root = useRef<HTMLButtonElement>(null);
  const ratio = contextRatio(usage);
  const percent = contextPercent(usage);

  const hasData = usage != null || turnUsage != null || sessionUsage != null;
  if (!hasData) return null;

  const isOpen = hovered || pinned;

  const contextAria =
    percent !== null
      ? `${percent}% context used`
      : usage?.used
        ? `${usage.used.toLocaleString()} context tokens`
        : "Context unavailable";

  const turnAria = turnUsage
    ? `${turnUsage.total.toLocaleString()} turn tokens`
    : busy
      ? "Turn processing"
      : "No turn usage";

  const sessionAria = sessionUsage
    ? `${sessionUsage.total.toLocaleString()} session tokens`
    : "Session usage unavailable";

  const fullAria = `${contextAria}. ${turnAria}. ${sessionAria}.`;

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        ref={root}
        type="button"
        aria-label={fullAria}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setPinned((prev) => !prev)}
        className="flex size-5 items-center justify-center rounded p-0.5 hover:bg-content/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className={`${ratio !== null ? ringClass(ratio) : "text-content/30"} ${busy ? "animate-pulse" : ""}`}
          role="img"
          aria-hidden="true"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            className="opacity-25"
          />
          {ratio !== null ? (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
          ) : (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS / 2}
              fill="currentColor"
              className="opacity-40"
            />
          )}
        </svg>
      </button>

      {isOpen ? (
        <Popover
          anchor={root}
          side="top"
          align="end"
          onDismiss={() => {
            setPinned(false);
            setHovered(false);
          }}
          className="w-64 max-w-[calc(100vw-2rem)] p-3 text-xs"
        >
          <div
            className="space-y-3"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {/* Section 1: Context Window */}
            <div className="space-y-0.5">
              <div className="text-[11px] font-medium uppercase tracking-wider text-content/40">
                Context window
              </div>
              {usage && usage.used > 0 ? (
                <>
                  <div className="text-[12px] font-medium text-content">
                    {percent !== null ? `${percent}% used` : "Active window"}
                  </div>
                  <div className="text-[11px] text-content/60">
                    {usage.window
                      ? `${usage.used.toLocaleString()} / ${usage.window.toLocaleString()} tokens`
                      : `${usage.used.toLocaleString()} tokens`}
                  </div>
                </>
              ) : (
                <div className="text-[11px] text-content/50">Unavailable</div>
              )}
            </div>

            {/* Section 2: This Turn Processed */}
            <div className="border-t border-content/10 pt-2.5 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-content/40">
                <span>This turn processed</span>
                {busy ? (
                  <span className="flex items-center gap-1 text-[10px] normal-case text-accent">
                    <span className="size-1.5 rounded-full bg-accent animate-ping" />
                    Streaming
                  </span>
                ) : null}
              </div>
              {turnUsage ? (
                <UsageBreakdown
                  usage={turnUsage}
                  label="Turn"
                  expanded={turnExpanded}
                  onToggle={() => setTurnExpanded((e) => !e)}
                />
              ) : (
                <div className="text-[11px] text-content/50">
                  {busy ? "Processing turn…" : "No usage yet"}
                </div>
              )}
            </div>

            {/* Section 3: Session Processed */}
            <div className="border-t border-content/10 pt-2.5 space-y-1">
              <div className="text-[11px] font-medium uppercase tracking-wider text-content/40">
                Session processed
              </div>
              {sessionUsage ? (
                <UsageBreakdown
                  usage={sessionUsage}
                  label="Session"
                  expanded={sessionExpanded}
                  onToggle={() => setSessionExpanded((e) => !e)}
                />
              ) : (
                <div className="text-[11px] text-content/50">Unavailable</div>
              )}
            </div>
          </div>
        </Popover>
      ) : null}
    </div>
  );
}
