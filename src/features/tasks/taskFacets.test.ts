import { describe, expect, it } from "vitest";
import { taskFacetCounts } from "./taskFacets";
import type { Task } from "./tasks";

function task(partial: Partial<Task> & { id: string }): Task {
  return {
    title: partial.id,
    body: "",
    status: "todo",
    tags: [],
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  };
}

const tasks = [
  task({ id: "a", status: "todo", projectCwd: "E:/Work/App", tags: ["bug"] }),
  task({ id: "b", status: "review", projectCwd: "e:\\work\\app\\" }),
  task({ id: "c", status: "todo", tags: ["bug", "ui"] }),
  task({ id: "d", status: "completed", projectCwd: "/work/other" }),
];

describe("taskFacetCounts", () => {
  it("counts everything when no filter is active", () => {
    const facets = taskFacetCounts(tasks, {});
    expect(facets.anyStatus).toBe(4);
    expect(facets.status.get("todo")).toBe(2);
    expect(facets.status.get("blocked")).toBe(0);
    expect(facets.anyProject).toBe(4);
    expect(facets.personal).toBe(1);
    // Windows path spellings count as one project.
    expect(facets.project.get("e:/work/app")).toBe(2);
    expect(facets.tag.get("bug")).toBe(2);
  });

  it("applies every other filter to each facet but not its own", () => {
    const facets = taskFacetCounts(tasks, {
      statuses: ["todo"],
      projectCwd: "E:/Work/App",
    });
    // Status facet ignores the status filter, keeps the project filter.
    expect(facets.anyStatus).toBe(2);
    expect(facets.status.get("todo")).toBe(1);
    expect(facets.status.get("review")).toBe(1);
    // Project facet ignores the project filter, keeps the status filter.
    expect(facets.anyProject).toBe(2);
    expect(facets.personal).toBe(1);
    expect(facets.project.get("/work/other")).toBeUndefined();
    // Tags count within the current results only.
    expect(facets.tag.get("bug")).toBe(1);
    expect(facets.tag.get("ui")).toBeUndefined();
  });
});
