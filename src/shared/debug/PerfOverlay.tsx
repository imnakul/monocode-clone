import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  keybindingPressed,
  keybindingShortcutLabel,
  PERF_OVERLAY_COMMAND,
} from "../../features/settings/model/settings";
import { ALT, MOD, SHIFT } from "../../platform/tauri/platform";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { X } from "../ui/icons";
import {
  clearHoverDebugEvents,
  hoverDebugEvents,
  isPerfDebugEnabled,
  setPerfDebugEnabled,
  subscribePerfDebug,
  togglePerfDebug,
  type HoverDebugEvent,
} from "./perfDebug";
import {
  dismissRecorderResult,
  isPerfRecording,
  recorderState,
  startPerfRecording,
  stopPerfRecording,
  subscribeRecorder,
} from "./perfRecorder";

/** Frames slower than this count as a visible stutter (about 3 dropped frames at 60 Hz). */
const JANK_MS = 50;
const WINDOW_MS = 10_000;
const SAMPLE_MS = 500;

type FrameStats = {
  fps: number;
  worstMs: number;
  janks: number;
  longTasks: number | null;
  longestTaskMs: number;
};

/**
 * Always mounted: owns the View: Toggle Performance Overlay shortcut and
 * renders the overlay only while it is on.
 */
export function PerfOverlayHost(): ReactNode {
  const enabled = useSyncExternalStore(
    subscribePerfDebug,
    isPerfDebugEnabled,
    () => false,
  );
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.isComposing || event.repeat) return;
      const defaultMatch =
        (event.ctrlKey || event.metaKey) &&
        event.altKey &&
        event.shiftKey &&
        event.code === "KeyP";
      if (!keybindingPressed(PERF_OVERLAY_COMMAND, event, defaultMatch)) return;
      event.preventDefault();
      togglePerfDebug();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  return enabled ? <PerfOverlay /> : null;
}

/**
 * Small corner panel for telling real lag (low FPS, long tasks) apart from a
 * hover highlight that snaps or flashes instead of gliding.
 */
function PerfOverlay(): ReactNode {
  const stats = useFrameStats();
  // The event log is mutated in place, so re-render on every report.
  const [, setTick] = useState(0);
  useEffect(() => subscribePerfDebug(() => setTick((n) => n + 1)), []);
  const events = hoverDebugEvents();
  const shortcut = keybindingShortcutLabel(
    PERF_OVERLAY_COMMAND,
    `${MOD}${ALT}${SHIFT}P`,
  );

  const now = performance.now();
  const recent = events.filter((event) => now - event.at < WINDOW_MS);
  const glides = recent.filter((event) => event.kind === "glide").length;
  const snaps = recent.filter((event) => event.kind === "snap").length;
  const hides = recent.filter((event) => event.kind === "hide").length;
  const latestMove = events.find((event) => event.kind !== "hide");
  const fpsTone =
    stats.fps >= 55
      ? "text-emerald-400"
      : stats.fps >= 30
        ? "text-amber-400"
        : "text-red-400";

  return (
    <aside
      aria-label="Performance overlay"
      className="pointer-events-auto fixed bottom-3 right-3 z-[2147483000] w-80 rounded-lg border border-content/15 bg-background-base/92 p-2.5 font-mono text-[11px] leading-4 text-content/80 shadow-xl"
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="font-sans text-[12px] font-medium text-content">
          Performance
        </span>
        {shortcut ? <span className="text-content/40">{shortcut}</span> : null}
        <button
          type="button"
          onClick={clearHoverDebugEvents}
          aria-label="Reset hover log"
          className="ml-auto rounded px-1.5 text-content/55 hover:bg-content/10 hover:text-content"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => {
            // Closing mid-recording saves what was captured so far.
            if (isPerfRecording()) void stopPerfRecording();
            setPerfDebugEnabled(false);
          }}
          aria-label="Close performance overlay"
          className="grid size-5 place-items-center rounded text-content/55 hover:bg-content/10 hover:text-content"
        >
          <X aria-hidden className="size-3" />
        </button>
      </div>

      <RecorderControls />

      <Row label="FPS">
        <span className={fpsTone}>{stats.fps}</span>
        <span className="text-content/45">
          {" "}
          · worst {Math.round(stats.worstMs)}ms · stutters {stats.janks}
        </span>
      </Row>
      <Row label="Long tasks">
        {stats.longTasks === null ? (
          <span className="text-content/45">not supported</span>
        ) : (
          <span className={stats.longTasks ? "text-amber-400" : ""}>
            {stats.longTasks}
            <span className="text-content/45">
              {" "}
              · longest {Math.round(stats.longestTaskMs)}ms
            </span>
          </span>
        )}
      </Row>

      <div className="mt-2 border-t border-content/10 pt-2">
        <Row label="Surface">
          <span className="text-content">
            {latestMove?.surface ?? "hover a list…"}
          </span>
        </Row>
        <Row label="Glide">
          <span className="text-emerald-400">{glides} glide</span>
          <span className="text-content/45"> · </span>
          <span className={snaps ? "text-amber-400" : ""}>{snaps} snap</span>
          <span className="text-content/45"> · </span>
          <span>{hides} hide</span>
        </Row>
        {latestMove?.ownFill ? (
          <p className="mt-1 rounded bg-red-500/15 px-1.5 py-1 text-red-300">
            This item paints its own hover background, so it lights up instantly
            while the glide is still moving.
          </p>
        ) : null}
      </div>

      <ol aria-label="Recent hover events" className="mt-2 space-y-0.5">
        {events.slice(0, 8).map((event) => (
          <EventLine key={`${event.at}-${event.kind}`} event={event} />
        ))}
      </ol>
      <p className="mt-2 font-sans text-[10px] leading-3.5 text-content/40">
        Window: last 10s. Stutter = a frame over {JANK_MS}ms. Snap = the
        highlight appeared without gliding.
      </p>
    </aside>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): ReactNode {
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 text-content/45">{label}</span>
      <span className="min-w-0 truncate">{children}</span>
    </div>
  );
}

const KIND_TONE: Record<HoverDebugEvent["kind"], string> = {
  glide: "text-emerald-400",
  snap: "text-amber-400",
  hide: "text-content/50",
};

function EventLine({ event }: { event: HoverDebugEvent }): ReactNode {
  return (
    <li className="truncate" title={event.reason ?? event.item}>
      <span className={`inline-block w-10 ${KIND_TONE[event.kind]}`}>
        {event.kind}
      </span>
      {event.kind === "hide" ? (
        <span className="text-content/55">{event.reason}</span>
      ) : (
        <span>
          {event.item}
          {event.ownFill ? (
            <span className="text-red-300"> · own fill</span>
          ) : null}
        </span>
      )}
    </li>
  );
}

/** Frame timing from requestAnimationFrame plus Long Tasks, if available. */
function useFrameStats(): FrameStats {
  const [stats, setStats] = useState<FrameStats>({
    fps: 0,
    worstMs: 0,
    janks: 0,
    longTasks: null,
    longestTaskMs: 0,
  });
  useEffect(() => {
    const frames: number[] = [];
    const tasks: { at: number; duration: number }[] = [];
    let last = performance.now();
    let raf = requestAnimationFrame(function tick(time: number) {
      frames.push(time - last);
      last = time;
      if (frames.length > 1200) frames.splice(0, frames.length - 1200);
      raf = requestAnimationFrame(tick);
    });
    let observer: PerformanceObserver | null = null;
    const supported =
      typeof PerformanceObserver !== "undefined" &&
      PerformanceObserver.supportedEntryTypes?.includes("longtask");
    if (supported) {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          tasks.push({ at: entry.startTime, duration: entry.duration });
      });
      observer.observe({ type: "longtask" });
    }
    const timer = window.setInterval(() => {
      const now = performance.now();
      // Frames in the last second give FPS; the last 10s give stutters.
      let elapsed = 0;
      let count = 0;
      for (
        let index = frames.length - 1;
        index >= 0 && elapsed < 1000;
        index--
      ) {
        elapsed += frames[index];
        count += 1;
      }
      let windowed = 0;
      let worst = 0;
      let janks = 0;
      for (
        let index = frames.length - 1;
        index >= 0 && windowed < WINDOW_MS;
        index--
      ) {
        windowed += frames[index];
        worst = Math.max(worst, frames[index]);
        if (frames[index] > JANK_MS) janks += 1;
      }
      while (tasks.length && now - tasks[0].at > WINDOW_MS) tasks.shift();
      setStats({
        fps: elapsed ? Math.round((count * 1000) / elapsed) : 0,
        worstMs: worst,
        janks,
        longTasks: supported ? tasks.length : null,
        longestTaskMs: tasks.reduce(
          (longest, task) => Math.max(longest, task.duration),
          0,
        ),
      });
    }, SAMPLE_MS);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(timer);
      observer?.disconnect();
    };
  }, []);
  return stats;
}

/** Start/stop a log, then show where it was saved with Reveal and Copy. */
function RecorderControls(): ReactNode {
  const state = useSyncExternalStore(
    subscribeRecorder,
    recorderState,
    recorderState,
  );
  const [, setNow] = useState(0);
  useEffect(() => {
    if (state.status !== "recording") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [state.status]);
  const [copied, setCopied] = useState(false);
  const button =
    "rounded px-1.5 py-0.5 font-sans text-[11px] hover:bg-content/10 hover:text-content disabled:opacity-40";

  return (
    <div className="mb-2 rounded-md bg-content/5 p-1.5">
      <div className="flex items-center gap-2">
        {state.status === "recording" ? (
          <>
            <span
              aria-hidden
              className="size-2 animate-pulse rounded-full bg-red-500"
            />
            <span className="text-content" role="status">
              Recording {formatElapsed(performance.now() - state.startedPerf)}
            </span>
            <button
              type="button"
              onClick={() => void stopPerfRecording()}
              className={`${button} ml-auto bg-red-500/20 text-red-200`}
            >
              Stop &amp; save log
            </button>
          </>
        ) : (
          <>
            <span className="font-sans text-content/55">
              {state.status === "saving"
                ? "Saving log…"
                : "Record FPS, location and glide while you move around"}
            </span>
            <button
              type="button"
              disabled={state.status === "saving"}
              onClick={() => {
                dismissRecorderResult();
                startPerfRecording();
              }}
              className={`${button} ml-auto shrink-0 bg-content/10 text-content`}
            >
              Start log
            </button>
          </>
        )}
      </div>
      {state.status === "saved" ? (
        <div className="mt-1.5 border-t border-content/10 pt-1.5">
          <p className="break-all text-emerald-300" role="status">
            Saved: {state.path}
          </p>
          <div className="mt-1 flex gap-1">
            <button
              type="button"
              className={button}
              onClick={() => void revealItemInDir(state.path).catch(() => {})}
            >
              Show in folder
            </button>
            <button
              type="button"
              className={button}
              onClick={() =>
                void navigator.clipboard
                  .writeText(state.path)
                  .then(() => setCopied(true))
                  .catch(() => {})
              }
            >
              {copied ? "Copied" : "Copy path"}
            </button>
            <button
              type="button"
              className={`${button} ml-auto`}
              onClick={() => {
                setCopied(false);
                dismissRecorderResult();
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
      {state.status === "error" ? (
        <p className="mt-1.5 text-red-300" role="alert">
          Could not save the log: {state.message}
        </p>
      ) : null}
    </div>
  );
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}
