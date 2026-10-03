import { useMemo, type ReactNode } from "react";
import { pathKey, projectName } from "../../../shared/lib/paths";
import { Search, X } from "../../../shared/ui/icons";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "../../../shared/ui/SearchableSelect";
import { normalizeNoteTags } from "../../notes/notes";
import { taskFacetCounts } from "../taskFacets";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type Task,
  type TaskFilters,
} from "../tasks";

const PERSONAL = "personal";

export function hasActiveFilters(filters: TaskFilters): boolean {
  return Boolean(
    filters.query?.trim() ||
    filters.statuses?.length ||
    filters.projectCwd !== undefined ||
    filters.projectCwds?.length ||
    filters.tags?.length,
  );
}

export function TasksToolbar({
  filters,
  tasks,
  projects,
  onChange,
  leading,
  trailing,
}: {
  filters: TaskFilters;
  tasks: readonly Task[];
  projects: readonly string[];
  onChange: (filters: TaskFilters) => void;
  /** Primary actions shown before the filters (New task, Focus). */
  leading?: ReactNode;
  /** View controls pinned to the right end of the row. */
  trailing?: ReactNode;
}) {
  const facets = useMemo(
    () => taskFacetCounts(tasks, filters),
    [tasks, filters],
  );
  const statusOptions = useMemo<SearchableSelectOption[]>(
    () => [
      { value: "", label: "All statuses", count: facets.anyStatus },
      ...TASK_STATUSES.map((status) => ({
        value: status,
        label: TASK_STATUS_LABELS[status],
        count: facets.status.get(status) ?? 0,
      })),
    ],
    [facets],
  );
  const projectOptions = useMemo<SearchableSelectOption[]>(
    () => [
      { value: "", label: "All projects", count: facets.anyProject },
      { value: PERSONAL, label: "Personal", count: facets.personal },
      ...projects.map((path) => ({
        value: path,
        label: projectName(path),
        keywords: path,
        count: facets.project.get(pathKey(path)) ?? 0,
      })),
    ],
    [projects, facets],
  );
  const tagOptions = useMemo<SearchableSelectOption[]>(
    () =>
      normalizeNoteTags(tasks.flatMap((task) => task.tags))
        .sort((a, b) => a.localeCompare(b))
        .map((tag) => ({
          value: tag,
          label: `#${tag}`,
          count: facets.tag.get(tag) ?? 0,
        })),
    [tasks, facets],
  );
  const tags = filters.tags ?? [];
  const statuses = filters.statuses ?? [];
  const projectValues = (filters.projectCwds ?? []).map((cwd) =>
    cwd === null ? PERSONAL : cwd,
  );
  const toggle = <T,>(list: readonly T[], item: T): T[] =>
    list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
  return (
    <>
      <div
        data-tasks-toolbar
        className="flex h-10 shrink-0 items-center gap-1.5 px-2"
      >
        {leading}
        <div className="relative flex h-7 min-w-28 max-w-64 flex-1 items-center">
          <Search className="pointer-events-none absolute left-2 size-3 shrink-0 opacity-50" />
          <input
            value={filters.query ?? ""}
            onChange={(event) =>
              onChange({ ...filters, query: event.target.value })
            }
            placeholder="Filter tasks"
            aria-label="Filter tasks"
            spellCheck={false}
            autoComplete="off"
            className="h-7 w-full rounded-md bg-transparent pl-7 pr-2 text-[12px] text-content outline-none placeholder:text-content/40"
          />
        </div>
        <SearchableSelect
          variant="pill"
          label="Status"
          value=""
          options={statusOptions}
          searchable={false}
          multiple={{
            values: statuses,
            summary: (count) => `${count} statuses`,
            onToggle: (value) => {
              const status = TASK_STATUSES.find((entry) => entry === value);
              if (!status) return;
              const next = toggle(statuses, status);
              // Keep the board's column order stable: statuses in default order.
              onChange({
                ...filters,
                statuses: TASK_STATUSES.filter((entry) => next.includes(entry)),
              });
            },
          }}
          onChange={() => onChange({ ...filters, statuses: [] })}
        />
        <SearchableSelect
          variant="pill"
          label="Project"
          value=""
          options={projectOptions}
          searchPlaceholder="Search projects…"
          multiple={{
            values: projectValues,
            summary: (count) => `${count} projects`,
            onToggle: (value) => {
              const next = toggle(projectValues, value);
              onChange({
                ...filters,
                projectCwd: undefined,
                projectCwds: next.length
                  ? next.map((entry) => (entry === PERSONAL ? null : entry))
                  : undefined,
              });
            },
          }}
          onChange={() =>
            onChange({ ...filters, projectCwd: undefined, projectCwds: undefined })
          }
        />
        <SearchableSelect
          variant="pill"
          label="Tag"
          value=""
          options={tagOptions}
          placeholder="Add tag filter…"
          searchPlaceholder="Search tags…"
          emptyLabel="No tags yet"
          onChange={(tag) =>
            onChange({ ...filters, tags: normalizeNoteTags([...tags, tag]) })
          }
        />
        {hasActiveFilters(filters) ? (
          <button
            type="button"
            onClick={() => onChange({})}
            className="h-7 shrink-0 rounded-md px-2 text-[12px] text-content/50 hover:bg-content/10 hover:text-content"
          >
            Reset
          </button>
        ) : null}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-2">
          {trailing}
        </div>
      </div>
      {tags.length ? (
        <div className="flex min-h-7 shrink-0 flex-wrap items-center gap-1.5 px-3 pb-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex h-6 max-w-48 items-center gap-1 rounded-md bg-content/8 pl-2 pr-1 text-[11px] text-content/70"
            >
              <span className="truncate">#{tag}</span>
              <button
                type="button"
                title={`Remove tag filter #${tag}`}
                aria-label={`Remove tag filter #${tag}`}
                onClick={() =>
                  onChange({
                    ...filters,
                    tags: tags.filter((item) => item !== tag),
                  })
                }
                className="grid size-4 shrink-0 place-items-center rounded text-content/40 hover:bg-content/10 hover:text-content"
              >
                <X className="size-2.5" strokeWidth={1.75} />
              </button>
            </span>
          ))}
          {tags.length >= 2 ? (
            <div
              role="group"
              aria-label="Tag matching"
              className="flex rounded-md border border-content/10 bg-content/10 p-0.5"
            >
              {(["all", "any"] as const).map((match) => {
                const selected = (filters.tagMatch ?? "all") === match;
                return (
                  <button
                    key={match}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChange({ ...filters, tagMatch: match })}
                    className={`rounded px-2 py-0.5 text-[11px] ${
                      selected
                        ? "bg-selection-strong text-content"
                        : "text-content/45 hover:text-content/80"
                    }`}
                  >
                    {match === "all" ? "Match all" : "Match any"}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
