import { useEffect } from "react";
import { loadCheckProvidersOnStartup } from "../../settings/model/settings";
import {
  PROVIDER_CHECK_STARTUP_DELAY_MS,
  runProviderCheck,
} from "./providerCheck";

/**
 * Runs the light provider check once, {@link PROVIDER_CHECK_STARTUP_DELAY_MS}
 * after mount, unless the user turned it off in Settings. Nothing provider
 * related happens before the delay (lazy-startup policy).
 */
export function useStartupProviderCheck(): void {
  useEffect(() => {
    if (!loadCheckProvidersOnStartup()) return;
    const timer = window.setTimeout(() => {
      void runProviderCheck();
    }, PROVIDER_CHECK_STARTUP_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);
}
