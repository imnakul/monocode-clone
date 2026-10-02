import { createContext, useContext } from "react";
import { MessageMultiple } from "../../../shared/ui/icons";
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
  /** The text to capture, or a function that reads it at click time. */
  text: string | (() => string);
  code?: boolean;
  disabled?: boolean;
}) {
  const compose = useContext(SessionManagerCaptureContext);
  if (!compose || (typeof text === "string" && !text.trim())) return null;
  return (
    <button
      type="button"
      title="Add Draft to Sessions"
      aria-label="Add Draft to Sessions"
      disabled={disabled}
      className={
        code
          ? "markdown-code-copy !right-10 disabled:opacity-30"
          : "rounded-md p-1 text-content/40 transition-colors duration-100 hover:bg-content/8 hover:text-content/70 disabled:opacity-30"
      }
      onClick={() => {
        const value = typeof text === "string" ? text : text();
        if (value.trim()) compose(value);
      }}
    >
      <MessageMultiple aria-hidden className="size-3.5" strokeWidth={1.75} />
    </button>
  );
}
