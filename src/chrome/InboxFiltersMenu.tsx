import { Check, CircleDot, GitPullRequest } from "./icons";
import { type ReactNode } from "react";
import type { InboxKind } from "../lib/githubTasks";
import {
  DEFAULT_INBOX_FILTERS,
  disambiguateProjectNames,
  hasActiveInboxFilters,
  type InboxFilters,
  type InboxSource,
  type InboxTimeFilter,
} from "../lib/inboxFilters";
import { Popover } from "./Popover";
import { ProjectLogoIcon } from "./ProjectLogoIcon";

export const INBOX_FILTER_MENU_WIDTH = 248;

type ProjectOption = {
  path: string;
  name: string;
  logoPath: string | null;
};

type Props = {
  x: number;
  y: number;
  projects: ProjectOption[];
  source: InboxSource;
  filters: InboxFilters;
  onChange: (filters: InboxFilters) => void;
  onClose: () => void;
};

const TIME_OPTIONS: { id: InboxTimeFilter; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
];

const KIND_OPTIONS: {
  id: InboxKind;
  label: string;
  icon: ReactNode;
}[] = [
  {
    id: "issue",
    label: "Issues",
    icon: <CircleDot className="size-3.5 shrink-0" strokeWidth={1.75} />,
  },
  {
    id: "pr",
    label: "Pull requests",
    icon: <GitPullRequest className="size-3.5 shrink-0" strokeWidth={1.75} />,
  },
];

export function InboxFiltersMenu({
  x,
  y,
  projects,
  source,
  filters,
  onChange,
  onClose,
}: Props) {
  const hiddenProjects = new Set(filters.hiddenProjects);
  const hiddenKinds = new Set(filters.hiddenKinds);

  const toggleAssigned = () => {
    onChange({ ...filters, assignedToMe: !filters.assignedToMe });
  };

  const toggleKind = (kind: InboxKind) => {
    const next = new Set(hiddenKinds);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    onChange({ ...filters, hiddenKinds: [...next] });
  };

  const toggleProject = (path: string) => {
    const next = new Set(hiddenProjects);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    onChange({ ...filters, hiddenProjects: [...next] });
  };

  const setTime = (time: InboxTimeFilter) => {
    onChange({ ...filters, time });
  };

  const toggleStatus = (key: keyof InboxFilters["status"]) => {
    onChange({
      ...filters,
      status: { ...filters.status, [key]: !filters.status[key] },
    });
  };

  const projectLabels = disambiguateProjectNames(projects);

  return (
    <Popover
      anchor={{ x, y }}
      gap={0}
      width={INBOX_FILTER_MENU_WIDTH}
      maxHeight={480}
      onDismiss={onClose}
      role="menu"
      aria-label="Filter inbox"
      onContextMenu={(event) => event.preventDefault()}
      className="overflow-y-auto overscroll-none p-1"
    >
      <FilterItem
        label="Assigned to me"
        checked={filters.assignedToMe}
        onClick={toggleAssigned}
      />

      <SectionDivider />
      <SectionLabel>Status</SectionLabel>
      <div data-shared-hover-continuity className="flex flex-col gap-1">
        <FilterItem
          label="Open"
          checked={filters.status.open}
          onClick={() => toggleStatus("open")}
        />
        {source === "github" ? (
          <FilterItem
            label="Draft"
            checked={filters.status.draft}
            onClick={() => toggleStatus("draft")}
          />
        ) : null}
        <FilterItem
          label="Closed"
          checked={filters.status.closed}
          onClick={() => toggleStatus("closed")}
        />
        {source === "github" ? (
          <FilterItem
            label="Merged"
            checked={filters.status.merged}
            onClick={() => toggleStatus("merged")}
          />
        ) : null}
      </div>

      <SectionDivider />
      <SectionLabel>Time</SectionLabel>
      {TIME_OPTIONS.map((option) => (
        <FilterItem
          key={option.id}
          label={option.label}
          checked={filters.time === option.id}
          marker="dot"
          onClick={() => setTime(option.id)}
        />
      ))}

      {source === "github" ? (
        <>
          <SectionDivider />
          <SectionLabel>Type</SectionLabel>
          <div data-shared-hover-continuity className="flex flex-col gap-1">
            {KIND_OPTIONS.map((option) => (
              <FilterItem
                key={option.id}
                label={option.label}
                checked={!hiddenKinds.has(option.id)}
                icon={option.icon}
                onClick={() => toggleKind(option.id)}
              />
            ))}
          </div>
        </>
      ) : null}

      {source === "github" && projects.length > 0 ? (
        <>
          <SectionDivider />
          <SectionLabel>Projects</SectionLabel>
          <div data-shared-hover-continuity className="flex flex-col gap-1">
            {projects.map((project, index) => (
              <FilterItem
                key={project.path}
                label={projectLabels[index]?.label ?? project.name}
                title={project.path}
              checked={!hiddenProjects.has(project.path)}
              icon={
                project.logoPath ? (
                  <ProjectLogoIcon
                    path={project.logoPath}
                    className="size-3.5 shrink-0 rounded-sm"
                    imageClassName="size-3.5"
                  />
                ) : undefined
              }
              onClick={() => toggleProject(project.path)}
              />
            ))}
          </div>
        </>
      ) : null}

      {hasActiveInboxFilters(filters, source) ? (
        <>
          <div role="separator" className="my-1 h-px bg-content/10" />
          <button
            type="button"
            role="menuitem"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onChange(DEFAULT_INBOX_FILTERS)}
            className="flex h-7 w-full items-center rounded-lg px-2 text-left text-[13px] leading-none text-content/70 hover:bg-content/5 hover:text-content"
          >
            Clear filters
          </button>
        </>
      ) : null}
    </Popover>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-content/40">
      {children}
    </div>
  );
}

function SectionDivider() {
  return (
    <div role="separator" className="mx-2 my-1 h-px bg-content/10" />
  );
}

function FilterItem({
  label,
  title,
  checked,
  marker = "check",
  icon,
  onClick,
}: {
  label: string;
  title?: string;
  checked: boolean;
  /** Single-select rows read as radios (dot); multi-select rows keep checks. */
  marker?: "check" | "dot";
  icon?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="flex h-7 w-full items-center gap-2 rounded-lg px-2 text-left text-[13px] leading-none text-content hover:bg-content/5"
    >
      {icon}
      <span className="min-w-0 flex-1 truncate" title={title}>
        {label}
      </span>
      {checked ? (
        marker === "dot" ? (
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full bg-content/70"
          />
        ) : (
          <Check className="size-3.5 shrink-0" strokeWidth={2.25} />
        )
      ) : null}
    </button>
  );
}
