import type { Session } from "../../sessions/model/session";
import { sessionNeedsInput } from "../../sessions/model/session";
import { sameProjectPath } from "../../projects/model/recents";
import {
  orchestrationTaskLabel,
  type OrchestrationSummary,
} from "./orchestrationSummary";

export type HariLeadCandidate = {
  id: string;
  cwd: string;
  title?: string;
  updatedAt: number;
  hasProposal?: boolean;
  isPendingGoal?: boolean;
  isDraft?: boolean;
  orchestration?: OrchestrationSummary;
};

export type HariTaskLane = "todos" | "in-progress" | "needs-input" | "done";

export type HariBoardTask = {
  id: string;
  leadId: string;
  sessionId: string;
  title: string;
  harness: OrchestrationSummary["tasks"][number]["harness"];
  model: string;
  status: string;
  lane: HariTaskLane;
};

export type HariBoardRun = {
  leadId: string;
  cwd: string;
  summary: OrchestrationSummary;
};

export type HariBoard = Record<HariTaskLane, HariBoardTask[]>;

/** Selects a lead belonging to this project while preserving an explicit choice. */
export function selectHariLead(
  projectCwd: string,
  candidates: readonly HariLeadCandidate[],
  preferredLeadId?: string,
): string | undefined {
  const projectLeads = candidates.filter(
    (candidate) =>
      sameProjectPath(candidate.cwd, projectCwd) &&
      (candidate.isDraft ||
        candidate.hasProposal ||
        candidate.isPendingGoal ||
        candidate.orchestration),
  );
  const preferred = projectLeads.find(
    (candidate) => candidate.id === preferredLeadId,
  );
  if (preferred) return preferred.id;

  return [...projectLeads]
    .sort((left, right) => {
      const leftActive = Number(
        left.orchestration?.status === "active" ||
          left.orchestration?.status === "paused",
      );
      const rightActive = Number(
        right.orchestration?.status === "active" ||
          right.orchestration?.status === "paused",
      );
      return rightActive - leftActive || right.updatedAt - left.updatedAt;
    })[0]?.id;
}

/** Projects current run summaries into read-only Hari board lanes. */
export function projectHariBoard(
  projectCwd: string,
  runs: readonly HariBoardRun[],
  sessions: readonly Session[],
): HariBoard {
  const lanes: HariBoard = {
    todos: [],
    "in-progress": [],
    "needs-input": [],
    done: [],
  };
  const sessionsById = new Map(sessions.map((session) => [session.id, session]));

  for (const run of runs) {
    if (!sameProjectPath(run.cwd, projectCwd)) continue;

    for (const task of run.summary.tasks) {
      const closedCancellation =
        task.status === "cancelled" &&
        (run.summary.status === "finished" || run.summary.status === "stopped");
      if (closedCancellation) continue;

      const session = sessionsById.get(task.sessionId);
      const pendingInput =
        task.needsInput || (!!session && sessionNeedsInput(session));
      const pausedUndelivered =
        run.summary.status === "paused" &&
        task.status === "queued" &&
        task.delivered === false;
      const awaitingReview = task.status === "completed" && !task.accepted;

      let lane: HariTaskLane;
      if (
        pendingInput ||
        pausedUndelivered ||
        awaitingReview ||
        ["blocked", "failed", "interrupted", "cancelled"].includes(
          task.status,
        )
      ) {
        lane = "needs-input";
      } else if (task.status === "completed" && task.accepted) {
        lane = "done";
      } else if (task.status === "running" || task.status === "cancelling") {
        lane = "in-progress";
      } else {
        lane = "todos";
      }

      lanes[lane].push({
        id: `${run.leadId}:${task.sessionId}`,
        leadId: run.leadId,
        sessionId: task.sessionId,
        title: task.title,
        harness: task.harness,
        model: task.model,
        status:
          awaitingReview
            ? "Review result"
            : orchestrationTaskLabel(task, run.summary),
        lane,
      });
    }
  }

  return lanes;
}
