// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { buildPerfReport } from "./perfRecorder";

describe("buildPerfReport", () => {
  it("summarizes FPS by area, lists own-fill items and the hover timeline", () => {
    const sample = (t: number, fps: number, location: string) => ({
      t,
      fps,
      worstMs: 1000 / fps,
      stutters: fps < 40 ? 3 : 0,
      longTasks: fps < 40 ? 1 : 0,
      longestTaskMs: fps < 40 ? 120 : 0,
      location,
      glides: 2,
      snaps: fps < 40 ? 1 : 0,
      hides: 0,
    });
    const report = buildPerfReport(
      {
        startedAt: new Date("2026-10-03T10:00:00Z"),
        startedPerf: 0,
        samples: [
          sample(1, 30, "Task Manager › Tasks › row"),
          sample(2, 118, "Explorer › Files"),
        ],
        events: [
          {
            kind: "snap",
            surface: "Tasks",
            item: "“Fix login”",
            ownFill: true,
            at: 1500,
          },
          {
            kind: "hide",
            surface: "Tasks",
            item: "“Fix login”",
            ownFill: false,
            reason: "pointer left the list",
            at: 1700,
          },
        ],
        longTasks: [{ t: 1.2, durationMs: 120, source: "self" }],
      },
      new Date("2026-10-03T10:00:03Z"),
    );
    expect(report).toContain("# MonoCode performance log");
    expect(report).toContain(
      "| Task Manager › Tasks | 1 | 30 | 30 | 3 | 1 | 120ms | 2 | 1 | 0 |",
    );
    expect(report).toContain("| Explorer › Files | 1 | 118 |");
    // Slowest area first.
    expect(report.indexOf("Task Manager › Tasks |")).toBeLessThan(
      report.indexOf("Explorer › Files |"),
    );
    expect(report).toContain("- Tasks: 1 hovers");
    expect(report).toContain("- 1.5s snap [Tasks] “Fix login” · own fill");
    expect(report).toContain("- 1.7s hide [Tasks] pointer left the list");
    expect(report).toContain("| 1.2 | 120ms | self |");
  });
});
