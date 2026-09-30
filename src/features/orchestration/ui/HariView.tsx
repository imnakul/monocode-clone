import { useState, type ComponentProps } from "react";
import { findModel } from "../../sessions/model/models";
import { HARNESS_TITLE, type Session } from "../../sessions/model/session";
import { OrchestrationSidebarAgents } from "./OrchestrationSidebarAgents";
import { SessionPane } from "../../sessions/ui/SessionPane";
import type {
  HariBoard,
  HariBoardTask,
} from "../model/hari";
import type { OrchestrationSummary } from "../model/orchestrationSummary";

type SessionPaneProps = ComponentProps<typeof SessionPane>;
type HariSessionPaneProps = Omit<
  SessionPaneProps,
  | "session"
  | "visible"
  | "focused"
  | "inSplit"
  | "composerFocused"
  | "composerIntent"
  | "onFocus"
  | "onClose"
  | "onSubmit"
>;

type Props = {
  projectCwd?: string;
  leads?: readonly { id: string; title: string; status?: string }[];
  selectedLeadId?: string;
  session?: Session;
  sessionPaneProps?: HariSessionPaneProps;
  sessionSummary?: OrchestrationSummary;
  board: HariBoard;
  loading?: boolean;
  error?: string | null;
  isFirstGoal?: boolean;
  proposalReady?: boolean;
  onSubmit: SessionPaneProps["onSubmit"];
  onNewGoal: () => void;
  onSelectLead?: (leadId: string) => void;
  onClose: () => void;
  onOpenTask: (task: HariBoardTask) => void;
};

const LANES = [
  { id: "todos", label: "Todos" },
  { id: "in-progress", label: "In Progress" },
  { id: "needs-input", label: "Needs Input" },
  { id: "done", label: "Done" },
] as const;

export function HariView({
  projectCwd,
  leads = [],
  selectedLeadId,
  session,
  sessionPaneProps,
  sessionSummary,
  board,
  loading = false,
  error,
  isFirstGoal = false,
  proposalReady = false,
  onSubmit,
  onNewGoal,
  onSelectLead,
  onClose,
  onOpenTask,
}: Props) {
  const [tab, setTab] = useState<"chat" | "board">("chat");
  const taskCount = LANES.reduce((count, lane) => count + board[lane.id].length, 0);
  const runClosed =
    sessionSummary?.status === "finished" ||
    sessionSummary?.status === "stopped";

  return (
    <section
      aria-label="Hari orchestration"
      data-hari-surface
      className="absolute inset-0 z-20 flex min-h-0 min-w-0 flex-col bg-background-base"
    >
      <header className="flex min-h-12 shrink-0 flex-wrap items-center gap-3 border-b border-stroke px-4 py-2">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold text-content">Hari</h1>
          <p className="truncate text-[11px] text-content/45">
            {projectCwd ?? "Select a project to use Hari"}
          </p>
        </div>
        <div role="tablist" aria-label="Hari views" className="flex items-center gap-1 rounded-lg bg-content/5 p-1">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "chat"}
            onClick={() => setTab("chat")}
            className={`h-7 rounded-md px-3 text-xs ${tab === "chat" ? "bg-selection text-content" : "text-content/55 hover:text-content"}`}
          >
            Chat
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "board"}
            onClick={() => setTab("board")}
            className={`h-7 rounded-md px-3 text-xs ${tab === "board" ? "bg-selection text-content" : "text-content/55 hover:text-content"}`}
          >
            Board{taskCount ? ` · ${taskCount}` : ""}
          </button>
        </div>
        {leads.length > 1 ? (
          <label className="sr-only" htmlFor="hari-lead-select">
            Hari lead conversation
          </label>
        ) : null}
        {leads.length > 1 ? (
          <select
            id="hari-lead-select"
            aria-label="Hari lead conversation"
            value={selectedLeadId ?? ""}
            onChange={(event) => onSelectLead?.(event.target.value)}
            className="h-8 max-w-48 rounded-md border border-stroke bg-background-base px-2 text-xs text-content/70"
          >
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.title}{lead.status ? ` · ${lead.status}` : ""}
              </option>
            ))}
          </select>
        ) : null}
        {runClosed && session ? (
          <button
            type="button"
            onClick={() => {
              setTab("chat");
              onNewGoal();
            }}
            className="h-8 rounded-md bg-content px-3 text-xs font-medium text-background-base hover:bg-content/80"
          >
            New goal
          </button>
        ) : null}
        <button
          type="button"
          aria-label="Return to projects"
          onClick={onClose}
          className="h-8 rounded-md px-2 text-xs text-content/50 hover:bg-content/8 hover:text-content"
        >
          Projects
        </button>
      </header>

      {tab === "chat" ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {proposalReady ? (
            <p className="shrink-0 border-b border-stroke px-4 py-2 text-xs text-content/55">
              Review the plan before starting agents.
            </p>
          ) : null}
          {sessionSummary?.status === "paused" ? (
            <p className="shrink-0 border-b border-stroke px-4 py-2 text-xs text-amber-400">
              Paused — review and resume.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="shrink-0 border-b border-stroke px-4 py-2 text-xs text-red-400">
              {error}
            </p>
          ) : null}
          {session && sessionPaneProps ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
              <div className="min-h-0 min-w-0 flex-1">
                <SessionPane
                  {...sessionPaneProps}
                  session={session}
                  visible
                  focused
                  inSplit={false}
                  composerFocused={false}
                  composerIntent={isFirstGoal ? "orchestrate" : undefined}
                  composerPlaceholder={
                    isFirstGoal ? "Describe a goal for Hari" : undefined
                  }
                  onFocus={() => {}}
                  onClose={onClose}
                  onSubmit={onSubmit}
                />
              </div>
              {sessionSummary ? (
                <aside
                  aria-label="Hari agent controls"
                  className="max-h-64 shrink-0 overflow-y-auto border-t border-stroke px-3 py-2 lg:max-h-none lg:w-72 lg:border-l lg:border-t-0"
                >
                  <OrchestrationSidebarAgents
                    leadId={session.id}
                    summary={sessionSummary}
                  />
                </aside>
              ) : null}
            </div>
          ) : loading ? (
            <div role="status" className="grid min-h-0 flex-1 place-items-center text-sm text-content/45">
              Loading Hari conversation…
            </div>
          ) : projectCwd ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
              <p className="text-sm text-content/60">Describe a goal for Hari.</p>
              <button
                type="button"
                onClick={onNewGoal}
                className="h-8 rounded-md bg-content px-3 text-xs font-medium text-background-base hover:bg-content/80"
              >
                Start a goal
              </button>
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 place-items-center px-5 text-center text-sm text-content/45">
              Select a project to use Hari.
            </div>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {taskCount === 0 ? (
            <div className="grid min-h-full place-items-center px-5 text-center text-sm text-content/45">
              No agent tasks yet. Describe a goal in Hari chat.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              {LANES.map((lane) => (
                <section
                  key={lane.id}
                  aria-label={lane.label}
                  className="min-w-0 rounded-lg border border-stroke bg-content/[0.02] p-2"
                >
                  <h2 className="flex items-center justify-between px-1 py-1.5 text-xs font-medium text-content/65">
                    {lane.label}
                    <span className="tabular-nums text-content/35">
                      {board[lane.id].length}
                    </span>
                  </h2>
                  <div className="flex min-h-8 flex-col gap-1.5">
                    {board[lane.id].map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        aria-label={`Open task: ${task.title}`}
                        onClick={() => onOpenTask(task)}
                        className="min-w-0 rounded-md border border-stroke bg-background-base px-2.5 py-2 text-left hover:border-content/20 hover:bg-content/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                      >
                        <span className="block truncate text-xs font-medium text-content/85">
                          {task.title}
                        </span>
                        <span className="mt-1 block truncate text-[11px] text-content/45">
                          {findModel(task.model)?.name ?? task.model} · {HARNESS_TITLE[task.harness]}
                        </span>
                        <span className="mt-1 block text-[11px] text-content/60">
                          {task.status}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
