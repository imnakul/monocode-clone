import { pathKey } from "../../shared/lib/paths";
import { normalizeNoteTags } from "../notes/notes";
import {
  filterTasks,
  TASK_STATUSES,
  type Task,
  type TaskFilters,
  type TaskStatus,
} from "./tasks";

/**
 * How many tasks each filter option would show. Counts are faceted: every
 * facet applies all the *other* active filters, so an option's number is what
 * the list shows after picking it (the usual e-commerce/Linear behaviour).
 */
export type TaskFacetCounts = {
  /** Tasks matching every filter except status (the "All statuses" count). */
  anyStatus: number;
  status: Map<TaskStatus, number>;
  /** Tasks matching every filter except project (the "All projects" count). */
  anyProject: number;
  personal: number;
  /** Keyed by `pathKey(projectCwd)`. */
  project: Map<string, number>;
  /** Keyed by normalized tag, counted within the current results. */
  tag: Map<string, number>;
};

export function taskFacetCounts(
  tasks: readonly Task[],
  filters: TaskFilters,
): TaskFacetCounts {
  const withoutStatus = filterTasks(tasks, { ...filters, statuses: undefined });
  const status = new Map<TaskStatus, number>(
    TASK_STATUSES.map((value) => [value, 0]),
  );
  for (const task of withoutStatus)
    status.set(task.status, (status.get(task.status) ?? 0) + 1);

  const withoutProject = filterTasks(tasks, {
    ...filters,
    projectCwd: undefined,
  });
  const project = new Map<string, number>();
  let personal = 0;
  for (const task of withoutProject) {
    if (!task.projectCwd) {
      personal += 1;
      continue;
    }
    const key = pathKey(task.projectCwd);
    project.set(key, (project.get(key) ?? 0) + 1);
  }

  const tag = new Map<string, number>();
  for (const task of filterTasks(tasks, filters))
    for (const name of normalizeNoteTags(task.tags))
      tag.set(name, (tag.get(name) ?? 0) + 1);

  return {
    anyStatus: withoutStatus.length,
    status,
    anyProject: withoutProject.length,
    personal,
    project,
    tag,
  };
}
