import { describeDay } from "./TaskWeekStrip";
import {
  firstFocusDay,
  inFocusOn,
  localDay,
  type Task,
} from "../tasks";
import { dayDiff, shortDay as chipShortDay } from "./TaskTags";

type TimelineTask = Pick<
  Task,
  "focusDate" | "focusDays" | "createdAt" | "completedAt" | "status"
>;

/** Sorted, de-duplicated days the task was in focus (history, plan, created). */
export function focusUnion(task: TimelineTask, today: string): string[] {
  const days = new Set<string>();
  for (const day of task.focusDays) days.add(day);
  if (task.focusDate !== undefined && task.focusDate <= today)
    days.add(task.focusDate);
  const created = localDay(task.createdAt);
  if (inFocusOn(task, created)) days.add(created);
  return [...days].sort();
}

/** "7 Oct" for a `YYYY-MM-DD` day. */
export function formatDayMonth(day: string): string {
  return chipShortDay(day);
}

/** Compact a long focus run: "7 Oct … 14 Oct · 6 days". */
export function formatFocusRun(days: string[]): string {
  if (days.length <= 5) return days.map(formatDayMonth).join(" · ");
  const first = days[0]!;
  const last = days[days.length - 1]!;
  return `${formatDayMonth(first)} … ${formatDayMonth(last)} · ${days.length} days`;
}

function Dot({ hollow = false }: { hollow?: boolean }) {
  return hollow ? (
    <span
      aria-hidden
      className="size-1.5 shrink-0 rounded-full border border-content/40"
    />
  ) : (
    <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-content/40" />
  );
}

/**
 * Timeline: when the task was created, which days it sat in focus, and
 * whether it is completed (with how long it took), still open, or planned.
 */
export function TaskTimeline({
  task,
  today,
}: {
  task: TimelineTask;
  today: string;
}) {
  const created = localDay(task.createdAt);
  const union = focusUnion(task, today);
  const first = firstFocusDay(task, today);
  const completed =
    task.completedAt !== undefined
      ? localDay(task.completedAt)
      : undefined;
  const planned =
    task.focusDate !== undefined && task.focusDate > today
      ? task.focusDate
      : undefined;
  const openDays =
    completed === undefined && first !== undefined
      ? dayDiff(first, today)
      : undefined;

  return (
    <section aria-label="Timeline" className="flex flex-col gap-2">
      <div className="text-[12px] font-medium text-content/80">Timeline</div>
      <ol className="flex flex-col text-[12px] text-content/70">
        <li className="flex min-w-0 items-stretch gap-2.5">
          <span className="flex flex-col items-center">
            <Dot />
            <span aria-hidden className="w-px flex-1 border-l border-content/15" />
          </span>
          <span className="min-w-0 flex-1 pb-2.5">
            Created&nbsp;&nbsp;{formatDayMonth(created)}
          </span>
        </li>
        {union.length ? (
          <li className="flex min-w-0 items-stretch gap-2.5">
            <span className="flex flex-col items-center">
              <Dot />
              <span
                aria-hidden
                className={`w-px flex-1 border-l border-content/15 ${completed === undefined ? "border-dashed" : ""}`}
              />
            </span>
            <span className="min-w-0 flex-1 pb-2.5">
              In focus&nbsp;&nbsp;{formatFocusRun(union)}
            </span>
          </li>
        ) : null}
        {completed !== undefined ? (
          <li className="flex min-w-0 items-stretch gap-2.5">
            <span className="flex flex-col items-center">
              <Dot />
              {planned ? (
                <span aria-hidden className="w-px flex-1 border-l border-content/15" />
              ) : null}
            </span>
            <span className="min-w-0 flex-1 pb-2.5">
              Completed&nbsp;&nbsp;{formatDayMonth(completed)}
              {first !== undefined
                ? (() => {
                    const took = dayDiff(first, completed);
                    return ` · took ${took} ${took === 1 ? "day" : "days"}`;
                  })()
                : null}
            </span>
          </li>
        ) : (
          <li className="flex min-w-0 items-stretch gap-2.5 text-content/45">
            <span className="flex flex-col items-center">
              <Dot hollow />
              {planned ? (
                <span
                  aria-hidden
                  className="w-px flex-1 border-l border-dashed border-content/15"
                />
              ) : null}
            </span>
            <span className="min-w-0 flex-1 pb-2.5">
              Open
              {openDays !== undefined
                ? ` · ${openDays} ${openDays === 1 ? "day" : "days"}`
                : null}
            </span>
          </li>
        )}
        {planned ? (
          <li className="flex min-w-0 items-stretch gap-2.5 text-content/45">
            <span className="flex flex-col items-center">
              <Dot hollow />
            </span>
            <span className="min-w-0 flex-1">Planned&nbsp;&nbsp;{describeDay(planned)}</span>
          </li>
        ) : null}
      </ol>
    </section>
  );
}
