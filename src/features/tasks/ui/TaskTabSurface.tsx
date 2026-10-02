import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle, LoaderCircle } from "../../../shared/ui/icons";
import { loadRecents } from "../../projects/model/recents";
import type { TaskTabSource } from "../../workspace/model/layout";
import { deleteTask, getTask, TASKS_CHANGED_EVENT, type Task } from "../tasks";
import { TaskEditor } from "./TaskEditor";
import {
  TaskTabActionsContext,
  type TaskTabActions,
} from "./TaskTabActionsContext";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; task: Task }
  | { kind: "deleted" }
  | { kind: "error"; message: string };

const missingActions: TaskTabActions = {
  onOpenSource: () => {
    throw new Error("Opening the source session is not available here");
  },
};

/** Full-size task editor shown as a workspace tab. */
export function TaskTabSurface({
  source,
  projectCwd,
}: {
  source: TaskTabSource;
  projectCwd?: string;
}) {
  const actions = useContext(TaskTabActionsContext) ?? missingActions;
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [recents] = useState(loadRecents);
  const loadId = useRef(0);
  const alive = useRef(true);
  const { taskId } = source;

  const load = useCallback(async () => {
    const id = ++loadId.current;
    try {
      const task = await getTask(taskId);
      if (!alive.current || id !== loadId.current) return;
      setState(task ? { kind: "ready", task } : { kind: "deleted" });
    } catch (error) {
      if (!alive.current || id !== loadId.current) return;
      const message = error instanceof Error ? error.message : String(error);
      // A failed refresh keeps the editor the user is already typing in.
      setState((current) =>
        current.kind === "ready" ? current : { kind: "error", message },
      );
    }
  }, [taskId]);

  useEffect(() => {
    alive.current = true;
    void load();
    window.addEventListener(TASKS_CHANGED_EVENT, load);
    return () => {
      alive.current = false;
      window.removeEventListener(TASKS_CHANGED_EVENT, load);
    };
  }, [load]);

  if (state.kind === "ready") {
    return (
      <div className="flex h-full min-h-0 min-w-0 flex-col text-content">
        <TaskEditor
          key={state.task.id}
          task={state.task}
          variant="full"
          recents={recents}
          cwd={projectCwd}
          onDelete={deleteTask}
          onOpenSource={actions.onOpenSource}
        />
      </div>
    );
  }
  return (
    <div className="flex h-full min-w-0 flex-col items-center justify-center px-6 text-center text-[13px] text-content/45">
      {state.kind === "loading" ? (
        <LoaderCircle
          aria-label="Loading task"
          className="size-4 animate-spin"
          strokeWidth={1.75}
        />
      ) : (
        <>
          <CheckCircle
            className="mb-3 size-6 text-content/30"
            strokeWidth={1.75}
          />
          {state.kind === "deleted" ? (
            <p>This task was deleted.</p>
          ) : (
            <p role="alert">
              Could not load task: {state.message}{" "}
              <button
                type="button"
                className="underline hover:no-underline"
                onClick={() => void load()}
              >
                Retry
              </button>
            </p>
          )}
        </>
      )}
    </div>
  );
}
