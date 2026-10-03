import type { QuickLaunch } from "../../quick-composer/model/quickComposer";
import { useManagerOverlay } from "../../../shared/hooks/useManagerOverlay";
import { useState, type ReactNode } from "react";
import { lazySurface } from "../../../shared/ui/lazySurface";
import type { RecentProject } from "../../projects/model/recents";
import type { Task } from "../tasks";
const View = lazySurface(async () => {
  const module = await import("./TasksView");
  return { default: module.TasksView };
});
const WorkComposer = lazySurface(async () => {
  const module = await import("./TaskWorkComposer");
  return { default: module.TaskWorkComposer };
});
export const OPEN_TASK_MANAGER_EVENT = "monocode:open-task-manager";
export function openTaskManager(): void {
  window.dispatchEvent(new Event(OPEN_TASK_MANAGER_EVENT));
}
export function TaskManagerHost({
  cwd,
  recents,
  navigationKey,
  onOpenSource,
  onOpenBeside,
  onLaunchTask,
}: {
  cwd?: string;
  recents: RecentProject[];
  navigationKey: string;
  onOpenSource: (sessionId: string, blockId?: string) => Promise<void>;
  onOpenBeside: (task: Task) => void;
  onLaunchTask: (
    launch: QuickLaunch,
    task: Task,
    deliveryId: string,
  ) => Promise<void>;
}): ReactNode {
  const { open, setOpen, root } = useManagerOverlay(
    OPEN_TASK_MANAGER_EVENT,
    "monocode:open-session-manager",
    navigationKey,
    false,
  );
  const [workingTask, setWorkingTask] = useState<{
    task: Task;
    deliveryId: string;
  } | null>(null);
  if (!open) return null;
  return (
    <div
      ref={root}
      tabIndex={-1}
      data-manager-overlay
      className="absolute inset-0 z-20 flex min-h-0 flex-col bg-background-base"
    >
      <View
        onWorkOn={(task) =>
          setWorkingTask({ task, deliveryId: crypto.randomUUID() })
        }
        cwd={cwd}
        recents={recents}
        onClose={() => setOpen(false)}
        onOpenSource={async (id, blockId) => {
          await onOpenSource(id, blockId);
          setOpen(false);
        }}
        onOpenBeside={(task) => {
          onOpenBeside(task);
          setOpen(false);
        }}
      />
      {workingTask ? (
        <WorkComposer
          task={workingTask.task}
          cwd={cwd}
          onStart={async (launch) => {
            await onLaunchTask(
              launch,
              workingTask.task,
              workingTask.deliveryId,
            );
            setWorkingTask(null);
            setOpen(false);
          }}
          onClose={() => setWorkingTask(null)}
        />
      ) : null}
    </div>
  );
}
