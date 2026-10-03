import { useEffect, useRef, useState } from "react";
import type { Session } from "../sessions/model/session";
import {
  boardSnapshot,
  loadBoard,
  observeBoardSessions,
  subscribeBoard,
} from "./sessionBoard";
export function useSessionBoard(sessions: readonly Session[]) {
  const [snapshot, setSnapshot] = useState(boardSnapshot);
  const latest = useRef(sessions);
  latest.current = sessions;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = subscribeBoard(() => setSnapshot(boardSnapshot()));
    void loadBoard();
    return () => {
      unsubscribe();
      clearTimeout(timer.current);
      // StrictMode replays setup after cleanup; a cancelled timer is no longer pending.
      timer.current = undefined;
    };
  }, []);
  useEffect(() => {
    // Throttle rather than debounce: uninterrupted token streams must still
    // create/update running cards. Projection avoids writes for token-only changes.
    if (timer.current !== undefined) return;
    timer.current = setTimeout(() => {
      timer.current = undefined;
      void observeBoardSessions(latest.current).catch(() => {});
    }, 150);
  }, [sessions]);
  return snapshot;
}
