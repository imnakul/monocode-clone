// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HariView } from "./HariView";
import type { HariBoard } from "../model/hari";

vi.mock("../../sessions/ui/SessionPane", () => ({
  SessionPane: () => null,
}));
vi.mock("./OrchestrationSidebarAgents", () => ({
  OrchestrationSidebarAgents: () => null,
}));

describe("HariView", () => {
  let container: HTMLDivElement;
  let root: Root;
  const emptyBoard: HariBoard = {
    todos: [],
    "in-progress": [],
    "needs-input": [],
    done: [],
  };

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("shows the empty board copy and switches between views", () => {
    act(() =>
      root.render(
        createElement(HariView, {
          projectCwd: "/repo",
          board: emptyBoard,
          onSubmit: vi.fn(),
          onNewGoal: vi.fn(),
          onClose: vi.fn(),
          onOpenTask: vi.fn(),
        }),
      ),
    );
    const boardTab = container.querySelector<HTMLButtonElement>(
      'button[role="tab"][aria-selected="false"]',
    )!;

    act(() => boardTab.click());
    expect(container.textContent).toContain(
      "No agent tasks yet. Describe a goal in Hari chat.",
    );

    const chatTab = container.querySelector<HTMLButtonElement>(
      'button[role="tab"]',
    )!;
    act(() => chatTab.click());
    expect(chatTab.getAttribute("aria-selected")).toBe("true");
  });

  it("shows the first-goal prompt and honest proposal and pause copy", () => {
    act(() =>
      root.render(
        createElement(HariView, {
          projectCwd: "/repo",
          board: emptyBoard,
          proposalReady: true,
          sessionSummary: { status: "paused", tasks: [] },
          onSubmit: vi.fn(),
          onNewGoal: vi.fn(),
          onClose: vi.fn(),
          onOpenTask: vi.fn(),
        }),
      ),
    );

    expect(container.textContent).toContain("Describe a goal for Hari.");
    expect(container.textContent).toContain(
      "Review the plan before starting agents.",
    );
    expect(container.textContent).toContain("Paused — review and resume.");
  });

  it("opens a task through the supplied current-worker navigation callback", () => {
    const task = {
      id: "lead:worker",
      leadId: "lead",
      sessionId: "worker",
      title: "Add the board view",
      harness: "claude" as const,
      model: "claude-sonnet-4",
      status: "Working",
      lane: "in-progress" as const,
    };
    const onOpenTask = vi.fn();

    act(() =>
      root.render(
        createElement(HariView, {
          projectCwd: "/repo",
          board: { ...emptyBoard, "in-progress": [task] },
          onSubmit: vi.fn(),
          onNewGoal: vi.fn(),
          onClose: vi.fn(),
          onOpenTask,
        }),
      ),
    );
    act(() => container.querySelector<HTMLButtonElement>(
      'button[role="tab"][aria-selected="false"]',
    )!.click());
    act(() =>
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Open task: Add the board view"]',
      )!.click(),
    );

    expect(onOpenTask).toHaveBeenCalledWith(task);
  });
});
