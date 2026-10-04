import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cronFromSimpleSchedule,
  cronScheduleError,
  nextCronRunAt,
  parseCronSchedule,
} from "./cronSchedule";

const at = (value: string): number => new Date(value).getTime();
afterEach(() => vi.unstubAllEnvs());

describe("numeric custom schedules", () => {
  it.each([
    "* * 2 *",
    "0 * * * * *",
    "60 * * * *",
    "0 24 * * *",
    "0 0 0 * *",
    "0 0 * 13 *",
    "0 0 * * 8",
    "*/0 * * * *",
    "10-5 * * * *",
    "0,,1 * * * *",
    "0 0 * * MON",
    "@daily",
    "0 0 30 2 *",
    "0 0 31 4,6 *",
    "*/1/2 * * * *",
  ])("rejects invalid or impossible expression %s", (expression) => {
    expect(cronScheduleError(expression)).not.toBeNull();
  });

  it("normalizes whitespace and supports lists, ranges, steps and Sunday 0/7", () => {
    const parsed = parseCronSchedule(" 5/15\t9-17 * * 0,7 ");
    expect(parsed.expression).toBe("5/15 9-17 * * 0,7");
    expect(parsed.fields[0]?.values).toEqual([5, 20, 35, 50]);
    expect(parsed.fields[1]?.values).toEqual([
      9, 10, 11, 12, 13, 14, 15, 16, 17,
    ]);
    expect(parsed.fields[4]?.values).toEqual([0]);
    expect(cronScheduleError(" ".repeat(257))).toMatch(/too long/);
  });

  it("finds strictly later runs for steps and weekday/month schedules", () => {
    expect(nextCronRunAt("*/15 * * * *", at("2026-10-04T21:00:00"))).toBe(
      at("2026-10-04T21:15:00"),
    );
    expect(nextCronRunAt("0 21 * * 1-5", at("2026-10-03T22:00:00"))).toBe(
      at("2026-10-05T21:00:00"),
    );
    expect(nextCronRunAt("0 21 2 * *", at("2026-10-04T22:00:00"))).toBe(
      at("2026-11-02T21:00:00"),
    );
  });

  it("finds a leap day beyond the normal four-year gap without minute scanning", () => {
    expect(nextCronRunAt("0 0 29 2 *", at("2097-03-01T00:00:00"))).toBe(
      at("2104-02-29T00:00:00"),
    );
  });

  it("finds a valid day/weekday match after an eleven-year calendar gap", () => {
    expect(nextCronRunAt("0 0 */100 2 1", at("2027-02-01T00:01:00"))).toBe(
      at("2038-02-01T00:00:00"),
    );
  });

  it("uses OR for restricted day fields and AND when a day starts with *", () => {
    expect(nextCronRunAt("0 0 31 2 1", at("2026-02-01T00:00:00"))).toBe(
      at("2026-02-02T00:00:00"),
    );
    expect(nextCronRunAt("0 0 */2 * 1", at("2026-10-04T00:00:00"))).toBe(
      at("2026-10-05T00:00:00"),
    );
    expect(nextCronRunAt("0 0 2 * *", at("2026-10-02T00:00:00"))).toBe(
      at("2026-11-02T00:00:00"),
    );
  });

  it("keeps local daily time across DST, skips missing time and runs a repeated time once", () => {
    vi.stubEnv("TZ", "America/New_York");
    expect(nextCronRunAt("0 21 * * *", at("2026-03-07T22:00:00-05:00"))).toBe(
      at("2026-03-08T21:00:00-04:00"),
    );
    expect(nextCronRunAt("30 2 * * *", at("2026-03-07T03:00:00-05:00"))).toBe(
      at("2026-03-09T02:30:00-04:00"),
    );
    expect(nextCronRunAt("30 1 * * *", at("2026-11-01T00:00:00-04:00"))).toBe(
      at("2026-11-01T01:30:00-04:00"),
    );
    expect(nextCronRunAt("30 1 * * *", at("2026-11-01T01:31:00-04:00"))).toBe(
      at("2026-11-02T01:30:00-05:00"),
    );
  });

  it("converts simple choices without changing their meaning", () => {
    expect(
      cronFromSimpleSchedule({
        scheduleKind: "hourly",
        minute: 15,
        time: "09:00",
        dayOfWeek: 1,
      }),
    ).toBe("15 * * * *");
    expect(
      cronFromSimpleSchedule({
        scheduleKind: "weekdays",
        minute: 0,
        time: "21:30",
        dayOfWeek: 1,
      }),
    ).toBe("30 21 * * 1-5");
  });
});
