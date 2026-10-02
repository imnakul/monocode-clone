import { createContext, useContext } from "react";
import { PanelLeft } from "../../../shared/ui/icons";
import type { QuickLaunch } from "../../quick-composer/model/quickComposer";

export const SESSION_MANAGER_COMPOSE_EVENT = "monocode.sessionManager.compose";
export const SessionManagerCaptureContext = createContext<
  ((text: string) => void) | undefined
>(undefined);
export function composeSessionTodo(launch: QuickLaunch) {
  window.dispatchEvent(
    new CustomEvent(SESSION_MANAGER_COMPOSE_EVENT, { detail: launch }),
  );
}
export function AddToSessionManagerButton({
  text,
  code = false,
  disabled = false,
}: {
  text: string;
  code?: boolean;
  disabled?: boolean;
}) {
  const compose = useContext(SessionManagerCaptureContext);
  if (!compose || !text.trim()) return null;
  return (
    <button
      type="button"
      title="Add to Session Manager"
      aria-label="Add to Session Manager"
      disabled={disabled}
      className={
        code
          ? "markdown-code-copy !right-10 disabled:opacity-30"
          : "rounded-md p-1 text-content/40 hover:bg-content/8 hover:text-content/70 disabled:opacity-30"
      }
      onClick={() => compose(text)}
    >
      <PanelLeft className="size-3.5" />
    </button>
  );
}
