/** Numeric five-field cron in the computer's local timezone. */
export const CRON_FIELDS = [
  { label: "Minute", min: 0, max: 59 },
  { label: "Hour", min: 0, max: 23 },
  { label: "Day of month", min: 1, max: 31 },
  { label: "Month", min: 1, max: 12 },
  { label: "Weekday", min: 0, max: 7 },
] as const;

export const DEFAULT_CRON = "0 21 * * *";
const MAX_CRON_LENGTH = 256;
// Gregorian dates and weekdays repeat every 400 years, including century gaps.
const MAX_SEARCH_DAYS = 146_097;
const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

type CronField = { values: number[]; wildcard: boolean };
export type CronSchedule = { fields: CronField[]; expression: string };

export function parseCronSchedule(expression: string): CronSchedule {
  if (expression.length > MAX_CRON_LENGTH)
    throw new Error("Custom schedule is too long (maximum 256 characters).");
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5)
    throw new Error(
      "Use five fields: minute, hour, day of month, month, weekday.",
    );
  const fields = parts.map((part, index) => {
    const { label, min, max } = CRON_FIELDS[index]!;
    const values = new Set<number>();
    for (const item of part.split(",")) {
      const match = item.match(/^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/);
      if (!match)
        throw new Error(`${label}: use numbers, *, lists, ranges or / steps.`);
      const base = match[1]!;
      const step = match[2] === undefined ? 1 : Number(match[2]);
      const range = base.split("-").map(Number);
      const from = base === "*" ? min : range[0]!;
      const to = base === "*" ? max : (range[1] ?? (match[2] ? max : from));
      if (
        !Number.isSafeInteger(step) ||
        step < 1 ||
        from < min ||
        from > max ||
        to < from ||
        to > max
      )
        throw new Error(
          `${label}: values must be ${min}–${max}, with a positive step and ascending ranges.`,
        );
      for (let value = from; value <= to; value += step)
        values.add(index === 4 && value === 7 ? 0 : value);
    }
    return {
      values: [...values].sort((a, b) => a - b),
      wildcard: part.startsWith("*"),
    };
  });
  // With either day field starting with *, both day conditions must match.
  // Otherwise cron matches the day of month OR the weekday.
  if (
    (fields[2]!.wildcard || fields[4]!.wildcard) &&
    !fields[3]!.values.some((month) =>
      fields[2]!.values.some((day) => day <= MONTH_DAYS[month - 1]!),
    )
  )
    throw new Error(
      "This schedule has no calendar date. Check the day of month and month.",
    );
  return { fields, expression: parts.join(" ") };
}

export function cronScheduleError(expression: string): string | null {
  try {
    parseCronSchedule(expression);
    return null;
  } catch (reason) {
    return reason instanceof Error ? reason.message : String(reason);
  }
}

/** Skip by calendar days; rare schedules never scan millions of minutes. */
export function nextCronRunAt(expression: string, after = Date.now()): number {
  const { fields } = parseCronSchedule(expression);
  const start = new Date(after);
  if (!Number.isFinite(start.getTime()))
    throw new Error("Invalid schedule start time.");
  const day = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
    12,
  );
  for (
    let offset = 0;
    offset <= MAX_SEARCH_DAYS;
    offset++, day.setDate(day.getDate() + 1)
  ) {
    if (!fields[3]!.values.includes(day.getMonth() + 1)) continue;
    const monthDay = fields[2]!.values.includes(day.getDate());
    const weekDay = fields[4]!.values.includes(day.getDay());
    const matchesDay =
      fields[2]!.wildcard || fields[4]!.wildcard
        ? monthDay && weekDay
        : monthDay || weekDay;
    if (!matchesDay) continue;
    for (const hour of fields[1]!.values) {
      for (const minute of fields[0]!.values) {
        const candidate = new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate(),
          hour,
          minute,
        );
        // JS normalizes nonexistent DST times; do not run them at another hour.
        // Repeated wall-clock times select their first occurrence, once.
        if (
          candidate.getFullYear() === day.getFullYear() &&
          candidate.getMonth() === day.getMonth() &&
          candidate.getDate() === day.getDate() &&
          candidate.getHours() === hour &&
          candidate.getMinutes() === minute &&
          candidate.getTime() > after
        )
          return candidate.getTime();
      }
    }
  }
  throw new Error("This schedule has no occurrence in the next 400 years.");
}

export function cronFromSimpleSchedule(schedule: {
  scheduleKind: string;
  minute: number;
  time: string;
  dayOfWeek: number;
}): string {
  if (schedule.scheduleKind === "hourly") return `${schedule.minute} * * * *`;
  const [hour, minute] = schedule.time.split(":").map(Number);
  const weekday =
    schedule.scheduleKind === "weekdays"
      ? "1-5"
      : schedule.scheduleKind === "weekly"
        ? String(schedule.dayOfWeek)
        : "*";
  return `${minute} ${hour} * * ${weekday}`;
}
