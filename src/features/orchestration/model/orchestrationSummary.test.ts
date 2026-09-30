import { describe, expect, it } from "vitest";
import type { OrchestrationRun } from "./orchestrationState";
import { summarizeOrchestration } from "./orchestrationSummary";

describe("summarizeOrchestration", () => {
  it("preserves task acceptance and delivery for board projection", () => {
    const run: OrchestrationRun = {
      version: 2,
      leadId: "lead",
      cwd: "/repo",
      status: "active",
      allowedHarnesses: ["claude"],
      maxWorkers: 2,
      cli: "monocode",
      tasks: [
        {
          id: "task",
          sessionId: "worker",
          title: "Build the board",
          harness: "claude",
          model: "claude-sonnet-4",
          prompt: "Implement the board",
          files: ["src/features/orchestration/ui/HariView.tsx"],
          scopes: ["src/features/orchestration/ui/HariView.tsx"],
          dependsOn: [],
          status: "completed",
          accepted: true,
          result: "Done",
          delivered: false,
        },
      ],
      continuations: 0,
      requests: {},
    };

    expect(summarizeOrchestration(run, []).tasks[0]).toMatchObject({
      sessionId: "worker",
      accepted: true,
      delivered: false,
    });
  });
});
