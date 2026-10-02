import { createContext } from "react";

export type TaskTabActions = {
  onOpenSource: (sessionId: string, blockId?: string) => void | Promise<void>;
};

/** App provides how a task tab jumps to its source session. */
export const TaskTabActionsContext = createContext<TaskTabActions | null>(null);
