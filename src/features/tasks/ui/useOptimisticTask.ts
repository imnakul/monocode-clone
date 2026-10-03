import { useCallback, useEffect, useRef, useState } from "react";
import { updateTask, type Task, type TaskStatus } from "../tasks";

/** Fields a board drop can change. `projectCwd: null` moves to Personal. */
export type TaskMovePatch = {
  status?: TaskStatus;
  projectCwd?: string | null;
  /** Manual position inside the target column. */
  sortOrder?: number;
};

type Override = { patch: TaskMovePatch; token: number };

/**
 * Optimistic board moves. Each move gets a token per task; only the latest
 * token may clear its override or report a failure, so a slow earlier write
 * never flips the card back. Patches for the same task merge, and
 * `updateTask` serializes writes per task, so the latest move is also the
 * last one persisted.
 */
export function useOptimisticTask(onSaved?: (task: Task) => void) {
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(new Map<string, number>());
  const alive = useRef(true);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const clear = useCallback((id: string) => {
    setOverrides((current) => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const move = useCallback(
    (task: Pick<Task, "id" | "title">, patch: TaskMovePatch) => {
      const token = (seq.current.get(task.id) ?? 0) + 1;
      seq.current.set(task.id, token);
      const title = task.title;
      setError(null);
      setOverrides((current) => ({
        ...current,
        [task.id]: { patch: { ...current[task.id]?.patch, ...patch }, token },
      }));
      updateTask(task.id, patch).then(
        (saved) => {
          if (!alive.current || seq.current.get(task.id) !== token) return;
          // Land the persisted row before dropping the override so the card
          // does not flash its old column while the refresh is in flight.
          onSavedRef.current?.(saved);
          clear(task.id);
        },
        (reason: unknown) => {
          if (!alive.current || seq.current.get(task.id) !== token) return;
          clear(task.id);
          setError(
            `Could not move "${title}": ${
              reason instanceof Error ? reason.message : String(reason)
            }`,
          );
        },
      );
    },
    [clear],
  );

  /** The task as the board should show it, with any pending move applied. */
  const view = useCallback(
    (task: Task): Task => {
      const patch = overrides[task.id]?.patch;
      if (!patch) return task;
      const next: Task = { ...task };
      if (patch.status) next.status = patch.status;
      if (patch.projectCwd !== undefined)
        next.projectCwd = patch.projectCwd ?? undefined;
      if (patch.sortOrder !== undefined) next.sortOrder = patch.sortOrder;
      return next;
    },
    [overrides],
  );

  return {
    view,
    move,
    error,
    dismissError: () => setError(null),
  };
}
