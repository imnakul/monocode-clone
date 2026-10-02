import { useCallback, useEffect, useRef, useState } from "react";
import { updateTask, type Task, type TaskStatus } from "../tasks";

type Override = { status: TaskStatus; token: number };

/**
 * Optimistic status moves. Each move gets a token per task; only the latest
 * token may clear its override or report a failure, so a slow earlier write
 * never flips the card back. `updateTask` serializes writes per task, so the
 * latest move is also the last one persisted.
 */
export function useOptimisticStatus(onSaved?: (task: Task) => void) {
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
    (task: Pick<Task, "id" | "title">, status: TaskStatus) => {
      const token = (seq.current.get(task.id) ?? 0) + 1;
      seq.current.set(task.id, token);
      const title = task.title;
      setError(null);
      setOverrides((current) => ({
        ...current,
        [task.id]: { status, token },
      }));
      updateTask(task.id, { status }).then(
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

  const statusOf = useCallback(
    (task: Pick<Task, "id" | "status">): TaskStatus =>
      overrides[task.id]?.status ?? task.status,
    [overrides],
  );

  return {
    statusOf,
    move,
    error,
    dismissError: () => setError(null),
  };
}
