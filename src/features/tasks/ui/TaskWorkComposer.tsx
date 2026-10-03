import type { ReactNode } from "react";
import type { Task } from "../tasks";
import { taskWorkPrompt } from "../tasks";
import { Modal } from "../../../shared/ui/Modal";
import { QuickComposer } from "../../quick-composer/ui/QuickComposer";
import {
  initialQuickChoice,
  type QuickLaunch,
} from "../../quick-composer/model/quickComposer";
export function TaskWorkComposer({
  task,
  cwd,
  onStart,
  onClose,
}: {
  task: Task;
  cwd?: string;
  onStart: (launch: QuickLaunch) => Promise<void>;
  onClose: () => void;
}): ReactNode {
  return (
    <Modal title="Work on task" onClose={onClose} fitViewport>
      <div className="p-3">
        <QuickComposer
          onShown={() => {}}
          initialLaunch={{
            ...initialQuickChoice(),
            cwd: task.projectCwd ?? cwd ?? "~",
            prompt: taskWorkPrompt(task),
            runtimeMode: "supervised",
            reveal: true,
          }}
          onSubmitLaunch={onStart}
          onDismiss={onClose}
          submitLabel="Start Work"
        />
      </div>
    </Modal>
  );
}
