import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { SharedHoverHighlight } from "../../sessions/ui/SharedHoverHighlight";
import { completedOn, inFocusOn, type Task } from "../tasks";

export const WEEK_STRIP_ALL_KEY = "all";

function parseDay(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year || 1970, (month || 1) - 1, date || 1);
}

function formatDay(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Shift a `YYYY-MM-DD` day by `delta` days. */
export function addDays(day: string, delta: number): string {
  const date = parseDay(day);
  date.setDate(date.getDate() + delta);
  return formatDay(date);
}

/** Seven days centred on the anchor: 3 before it, the anchor, 3 after. */
export function weekWindow(anchor: string): string[] {
  return [-3, -2, -1, 0, 1, 2, 3].map((delta) => addDays(anchor, delta));
}

/** `Sun 7 Oct` for a `YYYY-MM-DD` day. */
export function describeDay(day: string): string {
  const date = parseDay(day);
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const month = date.toLocaleDateString("en-US", { month: "short" });
  return `${weekday} ${date.getDate()} ${month}`;
}

function weekdayShort(day: string): string {
  return parseDay(day).toLocaleDateString("en-US", { weekday: "short" });
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Week strip: 7 days centred on an anchor plus All. The anchor starts at
 * today and follows it across midnight unless the arrows moved the window.
 */
export function TaskWeekStrip({
  tasks,
  today,
  selectedDay,
  onSelect,
  recenterSignal = 0,
}: {
  tasks: readonly Task[];
  today: string;
  /** `null` means All. Clicking the selected day again selects All. */
  selectedDay: string | null;
  onSelect: (day: string | null) => void;
  /** Bump to re-centre the window on today ("jump to today"). */
  recenterSignal?: number;
}) {
  const [anchor, setAnchor] = useState(today);
  const [moved, setMoved] = useState(false);
  const [pill, setPill] = useState({ left: 0, width: 0, visible: false });
  const root = useRef<HTMLDivElement>(null);
  const daysRef = useRef<HTMLDivElement>(null);
  const items = useRef(new Map<string, HTMLButtonElement>());
  const slideDir = useRef(0);
  const recenterSeen = useRef(recenterSignal);

  const days = useMemo(() => weekWindow(anchor), [anchor]);
  const weekKey = days[0] ?? anchor;

  // The anchor follows today across midnight unless the user moved the window.
  const movedRef = useRef(moved);
  movedRef.current = moved;
  useEffect(() => {
    if (!movedRef.current) setAnchor(today);
  }, [today]);
  useEffect(() => {
    if (recenterSeen.current === recenterSignal) return;
    recenterSeen.current = recenterSignal;
    if (recenterSignal > 0) {
      setAnchor(today);
      setMoved(false);
    }
    // `today` is read at recenter time; the midnight effect covers the rest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterSignal]);

  // One pass over tasks for every visible day's count and dot.
  const { counts, allCount } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const day of days) counts.set(day, 0);
    for (const task of tasks) {
      for (const day of days) {
        if (inFocusOn(task, day) || completedOn(task, day))
          counts.set(day, (counts.get(day) ?? 0) + 1);
      }
    }
    return { counts, allCount: tasks.length };
  }, [tasks, days]);

  const shiftWeek = (delta: 7 | -7) => {
    slideDir.current = delta > 0 ? 1 : -1;
    setAnchor((current) => addDays(current, delta));
    setMoved(true);
  };

  // The incoming 7 days slide in from the opposite side of the arrow.
  useLayoutEffect(() => {
    const dir = slideDir.current;
    slideDir.current = 0;
    if (!dir || prefersReducedMotion()) return;
    const element = daysRef.current;
    if (!element || typeof element.animate !== "function") return;
    element.animate(
      [
        { transform: `translateX(${-24 * dir}px)`, opacity: "0" },
        { transform: "translateX(0)", opacity: "1" },
      ],
      { duration: 200, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
  }, [weekKey]);

  // Selected pill behind the selected item; hidden outside the window.
  const selectedKey = selectedDay ?? WEEK_STRIP_ALL_KEY;
  useLayoutEffect(() => {
    const element = items.current.get(selectedKey);
    if (!element) {
      setPill((current) => (current.visible ? { ...current, visible: false } : current));
      return;
    }
    const place = () =>
      setPill({ left: element.offsetLeft, width: element.offsetWidth, visible: true });
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [selectedKey, weekKey, counts]);

  const order = [...days, WEEK_STRIP_ALL_KEY];
  const focusItem = (key: string) => items.current.get(key)?.focus();

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const current = order.findIndex((key) => key === selectedKey);
    if (event.key === "Home") {
      event.preventDefault();
      setAnchor(today);
      setMoved(false);
      onSelect(today);
      focusItem(today);
      return;
    }
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const at = current === -1 ? (delta > 0 ? 0 : order.length - 1) : current + delta;
    if (at < 0) {
      // Past the first day: shift the week back and select its last day.
      const next = addDays(days[0] ?? anchor, -1);
      slideDir.current = -1;
      setAnchor((currentAnchor) => addDays(currentAnchor, -7));
      setMoved(true);
      onSelect(next);
      requestAnimationFrame(() => focusItem(next));
      return;
    }
    if (at >= order.length) {
      // Past All: wrap to the first day.
      const next = days[0] ?? anchor;
      onSelect(next === selectedDay ? null : next);
      requestAnimationFrame(() => focusItem(next));
      return;
    }
    const next = order[at]!;
    if (next === WEEK_STRIP_ALL_KEY) {
      onSelect(null);
    } else if (next === selectedDay) {
      onSelect(null);
    } else {
      onSelect(next);
    }
    requestAnimationFrame(() => focusItem(next));
  };

  const pick = (day: string | null) => {
    if (day === null) {
      onSelect(null);
      return;
    }
    onSelect(day === selectedDay ? null : day);
  };

  const setItemRef = (key: string) => (element: HTMLButtonElement | null) => {
    if (element) items.current.set(key, element);
    else items.current.delete(key);
  };

  return (
    <div
      ref={root}
      role="tablist"
      aria-label="Task days"
      onKeyDown={onKeyDown}
      className="relative flex shrink-0 items-stretch gap-0.5 px-3"
    >
      <SharedHoverHighlight />
      <button
        ref={setItemRef("prev")}
        type="button"
        data-shared-hover-item
        aria-label="Previous week"
        onClick={() => shiftWeek(-7)}
        className="relative z-[2] grid w-7 shrink-0 place-items-center rounded-md text-[13px] text-content/45 hover:text-content"
      >
        <span aria-hidden>‹</span>
      </button>
      <div ref={daysRef} className="flex min-w-0 flex-1 items-stretch justify-center gap-0.5">
        {days.map((day) => {
          const count = counts.get(day) ?? 0;
          const selected = selectedDay === day;
          const isToday = day === today;
          return (
            <button
              key={day}
              ref={setItemRef(day)}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selectedKey === day ? 0 : -1}
              data-shared-hover-item
              aria-label={`${describeDay(day)}, ${count === 0 ? "no tasks" : `${count} ${count === 1 ? "task" : "tasks"}`}`}
              onClick={() => pick(day)}
              className="relative z-[2] flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-md px-1 py-1"
            >
              <span className="text-[10px] uppercase leading-none text-content/45">
                {weekdayShort(day)}
              </span>
              <span
                className={`text-[13px] font-medium leading-none tabular-nums ${
                  isToday ? "text-accent" : selected ? "text-content" : "text-content/80"
                }`}
              >
                {parseDay(day).getDate()}
              </span>
              <span className="flex h-1 items-center">
                {count > 0 ? (
                  <span
                    aria-hidden
                    className={`size-1 rounded-full ${isToday ? "bg-accent" : "bg-content/35"}`}
                  />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      <button
        ref={setItemRef("next")}
        type="button"
        data-shared-hover-item
        aria-label="Next week"
        onClick={() => shiftWeek(7)}
        className="relative z-[2] grid w-7 shrink-0 place-items-center rounded-md text-[13px] text-content/45 hover:text-content"
      >
        <span aria-hidden>›</span>
      </button>
      <button
        ref={setItemRef(WEEK_STRIP_ALL_KEY)}
        type="button"
        role="tab"
        aria-selected={selectedDay === null}
        tabIndex={selectedKey === WEEK_STRIP_ALL_KEY ? 0 : -1}
        data-shared-hover-item
        aria-label={`All, ${allCount === 0 ? "no tasks" : `${allCount} ${allCount === 1 ? "task" : "tasks"}`}`}
        onClick={() => pick(null)}
        className="relative z-[2] flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-md px-2.5 py-1"
      >
        <span className="text-[10px] uppercase leading-none text-content/45">Show</span>
        <span className="text-[13px] font-medium leading-none text-content/80">All</span>
        <span className="flex h-1 items-center" aria-hidden />
      </button>
      <span
        aria-hidden
        data-week-pill=""
        data-week-pill-visible={pill.visible ? "" : undefined}
        className="absolute top-0 bottom-0 left-0 z-[1] rounded-md bg-selection-strong transition-[transform,width] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
        style={{
          transform: `translateX(${pill.left}px)`,
          width: pill.width,
          opacity: pill.visible ? 1 : 0,
        }}
      />
    </div>
  );
}
