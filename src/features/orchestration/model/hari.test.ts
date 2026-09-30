import { describe, expect, it } from "vitest";
import type { Session } from "../../sessions/model/session";
import type { OrchestrationSummary } from "./orchestrationSummary";
import { projectHariBoard, selectHariLead, type HariBoardRun } from "./hari";

const session = (id: string, cwd: string): Session => ({
  id,
  cwd,
  harness: "claude",
  model: "claude-sonnet-4",
  modelSettings: {},
  runtimeMode: "supervised",
  title: id,
  blocks: [],
});

function run(
  status: OrchestrationSummary["status"],
  tasks: Partial<OrchestrationSummary["tasks"][number]>[],
  cwd = "/repo-a",
): HariBoardRun {
  return {
    leadId: `lead-${status}`,
    cwd,
    summary: {
      status,
      live: true,
      tasks: tasks.map((task, index) => ({
        sessionId: task.sessionId ?? `worker-${index}`,
        title: task.title ?? `Task ${index}`,
        harness: task.harness ?? "claude",
        model: task.model ?? "claude-sonnet-4",
        status: task.status ?? "queued",
        ...task,
      })),
    },
  };
}

describe("selectHariLead", () => {
  it("keeps a preferred lead within its project and ignores other projects", () => {
    const candidates = [
      {
        id: "older",
        cwd: "/repo-a",
        updatedAt: 10,
        hasProposal: true,
      },
      {
        id: "newer",
        cwd: "/repo-a",
        updatedAt: 20,
        hasProposal: true,
      },
      {
        id: "other-project",
        cwd: "/repo-b",
        updatedAt: 99,
        hasProposal: true,
      },
    ];

    expect(selectHariLead("/repo-a", candidates, "older")).toBe("older");
    expect(selectHariLead("/repo-a", candidates, "other-project")).toBe(
      "newer",
    );
  });

  it("prefers an active or paused run over a newer finished run", () => {
    const candidates = [
      {
        id: "finished",
        cwd: "/repo-a",
        updatedAt: 100,
        orchestration: { status: "finished", tasks: [] },
      },
      {
        id: "paused",
        cwd: "/repo-a",
        updatedAt: 1,
        orchestration: { status: "paused", tasks: [] },
      },
    ];

    expect(selectHariLead("/repo-a", candidates)).toBe("paused");
  });

  it("keeps an accepted goal selected while its proposal is being prepared", () => {
    expect(
      selectHariLead("/repo-a", [
        {
          id: "accepted-goal",
          cwd: "/repo-a",
          updatedAt: 1,
          isPendingGoal: true,
        },
      ]),
    ).toBe("accepted-goal");
  });
});

describe("projectHariBoard", () => {
  it("places live, waiting, review, and accepted work in the matching lanes", () => {
    const board = projectHariBoard(
      "/repo-a",
      [
        run("active", [
          { sessionId: "queued", status: "queued" },
          { sessionId: "running", status: "running" },
          { sessionId: "failed", status: "failed" },
          { sessionId: "review", status: "completed", accepted: false },
          { sessionId: "accepted", status: "completed", accepted: true },
        ]),
      ],
      [session("approval", "/repo-a")],
    );

    expect(board.todos.map((task) => task.sessionId)).toEqual(["queued"]);
    expect(board["in-progress"].map((task) => task.sessionId)).toEqual([
      "running",
    ]);
    expect(board["needs-input"].map((task) => task.sessionId)).toEqual([
      "failed",
      "review",
    ]);
    expect(board["needs-input"][1]?.status).toBe("Review result");
    expect(board.done.map((task) => task.sessionId)).toEqual(["accepted"]);
  });

  it("keeps paused undelivered and pending-approval tasks in Needs Input", () => {
    const approval = {
      ...session("approval", "/repo-a"),
      blocks: [
        {
          id: "approval-block",
          role: "assistant" as const,
          text: "Allow this action?",
          approval: { id: 7, command: "npm test" },
        },
      ],
    };
    const board = projectHariBoard(
      "/repo-a",
      [
        run("paused", [
          { sessionId: "undelivered", status: "queued", delivered: false },
          { sessionId: "approval", status: "running" },
        ]),
      ],
      [approval],
    );

    expect(board["needs-input"].map((task) => task.sessionId)).toEqual([
      "undelivered",
      "approval",
    ]);
  });

  it("omits cancelled tasks when their run is closed and filters other projects", () => {
    const board = projectHariBoard(
      "/repo-a",
      [
        run("stopped", [{ sessionId: "cancelled", status: "cancelled" }]),
        run("active", [{ sessionId: "other", status: "running" }], "/repo-b"),
      ],
      [],
    );

    expect(board).toEqual({
      todos: [],
      "in-progress": [],
      "needs-input": [],
      done: [],
    });
  });
});
