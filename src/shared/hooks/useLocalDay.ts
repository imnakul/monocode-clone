import { useEffect, useState } from "react";
import { localDay } from "../../features/tasks/tasks";

/** Next local midnight plus one second, as a timeout delay in ms. */
export function msUntilNextLocalDay(from: number = Date.now()): number {
  const date = new Date(from);
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return next.getTime() - from + 1000;
}

/**
 * Today's local day (`YYYY-MM-DD`). Re-arms a timeout to the next local
 * midnight + 1s so the strip and Focus follow a day change with the app open.
 */
export function useLocalDay(): string {
  const [day, setDay] = useState(() => localDay());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const arm = () => {
      timer = setTimeout(() => {
        setDay(localDay());
        arm();
      }, msUntilNextLocalDay());
    };
    arm();
    return () => clearTimeout(timer);
  }, []);
  return day;
}
