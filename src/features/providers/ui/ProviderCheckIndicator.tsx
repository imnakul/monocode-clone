import { useEffect, useState, useSyncExternalStore, type ReactElement } from "react";
import { Check } from "../../../shared/ui/icons";
import { TerminalSpinner } from "../../sessions/ui/TerminalSpinner";
import {
  getProviderCheckSnapshot,
  subscribeProviderCheck,
} from "../model/providerCheck";

/** How long "Providers ready" stays before it fades out. */
export const READY_VISIBLE_MS = 2000;
const FADE_MS = 300;
/** Opens Settings → Providers; App listens for it. */
export const OPEN_PROVIDER_SETTINGS_EVENT = "monocode:open-provider-settings";

type ReadyPhase = "hidden" | "visible" | "fading";

/**
 * Title-bar status for the shared provider check: a spinner while it runs,
 * "Providers ready" for a moment when it finishes, and an amber dot that opens
 * Settings → Providers when something could not be checked.
 */
export function ProviderCheckIndicator(): ReactElement | null {
  const check = useSyncExternalStore(
    subscribeProviderCheck,
    getProviderCheckSnapshot,
    getProviderCheckSnapshot,
  );
  const [ready, setReady] = useState<ReadyPhase>("hidden");
  const readyAt = check.phase === "ready" ? check.completedAt : undefined;
  useEffect(() => {
    if (readyAt === undefined) {
      setReady("hidden");
      return;
    }
    setReady("visible");
    const fade = window.setTimeout(() => setReady("fading"), READY_VISIBLE_MS);
    const hide = window.setTimeout(
      () => setReady("hidden"),
      READY_VISIBLE_MS + FADE_MS,
    );
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(hide);
    };
  }, [readyAt]);

  if (check.phase === "checking")
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex shrink-0 items-center gap-1.5 px-2 text-[11px] text-content/55"
      >
        <TerminalSpinner className="inline-block w-3.5 select-none text-center text-[11px] leading-none text-accent" />
        Checking providers…
      </div>
    );
  if (check.phase === "error")
    return (
      <div className="flex shrink-0 items-center px-2">
        <button
          type="button"
          title="Some providers could not be checked. Open Providers settings"
          aria-label="Some providers could not be checked. Open Providers settings"
          onClick={() =>
            window.dispatchEvent(new Event(OPEN_PROVIDER_SETTINGS_EVENT))
          }
          className="grid size-6 place-items-center rounded-md hover:bg-content/10"
        >
          <span aria-hidden className="size-1.5 rounded-full bg-amber-400" />
        </button>
      </div>
    );
  if (check.phase === "ready" && ready !== "hidden")
    return (
      <div
        role="status"
        aria-live="polite"
        className={`flex shrink-0 items-center gap-1.5 px-2 text-[11px] text-content/55 transition-opacity duration-300 motion-reduce:transition-none ${
          ready === "fading" ? "opacity-0 motion-reduce:hidden" : "opacity-100"
        }`}
      >
        <Check aria-hidden className="size-3 text-teal-400" strokeWidth={2} />
        Providers ready
      </div>
    );
  return null;
}
