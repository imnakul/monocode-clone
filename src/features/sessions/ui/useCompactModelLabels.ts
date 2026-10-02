import { useSyncExternalStore } from "react";
import {
  loadCompactModelLabels,
  subscribeCompactModelLabels,
} from "../../settings/model/settings";
import { resolveModel } from "../model/models";
import type { SessionSummary } from "../data/sessionStore";

/** Live subscription so the Experimentation switch updates existing cards. */
export function useCompactModelLabels(): boolean {
  return useSyncExternalStore(
    subscribeCompactModelLabels,
    loadCompactModelLabels,
    () => false,
  );
}

/** Prefer the actual in-flight turn model if the next-turn choice changed. */
export function compactModelLabel(session: SessionSummary): string {
  const active = session.activeTurnModel;
  if (active?.name) return active.name;
  return resolveModel(session.harness, session.model).name;
}
