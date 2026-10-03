import { useManagerOverlay } from "../../../shared/hooks/useManagerOverlay";
import { useState, type ReactNode } from "react";
import { lazySurface } from "../../../shared/ui/lazySurface";
import type { Session } from "../../sessions/model/session";
import type { QuickLaunch } from "../../quick-composer/model/quickComposer";
import { initialQuickChoice } from "../../quick-composer/model/quickComposer";
import type { RecentProject } from "../../projects/model/recents";
import type { sessionTodoManager } from "../sessionTodos";
import { useSessionBoard } from "../useSessionBoard";
import { SessionTodoComposer } from "./SessionTodoComposer";
const View = lazySurface(async () => {
  const module = await import("./SessionBoardView");
  return { default: module.SessionBoardView };
});
export const OPEN_SESSION_MANAGER_EVENT = "monocode:open-session-manager";
export function openSessionManager(): void {
  window.dispatchEvent(new Event(OPEN_SESSION_MANAGER_EVENT));
}
export function SessionManagerHost({
  sessions,
  cwd,
  recents,
  manager,
  navigationKey,
  onOpenSession,
  onWorkspaceHost,
  onPaneVisible,
}: {
  sessions: readonly Session[];
  cwd: string;
  recents: RecentProject[];
  manager: ReturnType<typeof sessionTodoManager>;
  navigationKey: string;
  onOpenSession: (id: string) => Promise<void>;
  onWorkspaceHost: (host: HTMLElement | null) => void;
  onPaneVisible: (visible: boolean) => void;
}): ReactNode {
  const { open, setOpen, root } = useManagerOverlay(
    OPEN_SESSION_MANAGER_EVENT,
    "monocode:open-task-manager",
    navigationKey,
  );
  const [composer, setComposer] = useState<{
    launch: QuickLaunch;
    id: string;
    editing: boolean;
    revision?: string;
  } | null>(null);
  const board = useSessionBoard(sessions);
  if (!open) return null;
  return (
    <div
      ref={root}
      tabIndex={-1}
      data-manager-overlay
      className="absolute inset-0 z-20 flex min-h-0 flex-col bg-background-base"
    >
      <View
        cards={board.cards}
        loading={!board.ready}
        error={board.error}
        cwd={cwd}
        recents={recents}
        onClose={() => setOpen(false)}
        onOpenSession={onOpenSession}
        onWorkspaceHost={onWorkspaceHost}
        onPaneVisible={onPaneVisible}
        onAddTodo={(project) =>
          setComposer({
            id: crypto.randomUUID(),
            editing: false,
            launch: {
              cwd: project ?? cwd,
              prompt: "",
              ...initialQuickChoice(),
              runtimeMode: "supervised",
              reveal: false,
            },
          })
        }
        onEditTodo={async (id) => {
          const draft = await manager.read(id);
          setComposer({
            id,
            editing: true,
            revision: draft.revision,
            launch: draft,
          });
        }}
        onStartTodo={async (id) => {
          await manager.start(id);
        }}
        onDeleteTodo={async (id) => {
          await manager.delete(id);
        }}
      />
      {composer ? (
        <SessionTodoComposer
          key={composer.id}
          initialLaunch={composer.launch}
          editing={composer.editing}
          onSave={async (launch) => {
            await manager.write(composer.id, launch, {
              edit: composer.editing,
              expectedRevision: composer.revision,
            });
          }}
          onClose={() => setComposer(null)}
        />
      ) : null}
    </div>
  );
}
