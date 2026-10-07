import { type ReactElement } from "react";
import { Cloud } from "../../shared/ui/icons";
import { HarnessIcon } from "../../features/sessions/ui/HarnessIcon";
import type { NativeProvider } from "../../features/provider-sessions/model/providerSessions";

export type ProviderRailEntry = {
  provider: NativeProvider;
  label: string;
  /** Loaded conversation count, once known. */
  count: number | null;
  refreshing: boolean;
  failed: boolean;
};

type Props = {
  entries: readonly ProviderRailEntry[];
  selected: NativeProvider | null;
  onSelect: (provider: NativeProvider) => void;
};

/** Explicit local attachment plus access to MonoCode-retained cloud sessions. */
export function ProviderRail({
  entries,
  selected,
  onSelect,
}: Props): ReactElement | null {
  if (entries.length === 0) return null;
  return (
    <div className="mb-2 shrink-0" data-provider-rail>
      <div className="flex items-center gap-1 px-3 pb-1.5 pt-1">
        <span className="min-w-0 flex-1 truncate px-1 text-xs text-content/50">
          Cloud sessions
        </span>
      </div>
      <ul
        data-shared-hover-continuity
        aria-label="MonoCode cloud sessions"
        className="flex flex-col gap-px px-2"
      >
        {entries.map((entry) => {
          const isSelected = selected === entry.provider;
          return (
            <li
              key={entry.provider}
              aria-busy={entry.refreshing}
              data-shared-hover-item
              data-shared-hover-preserve={isSelected ? "" : undefined}
              data-selected={isSelected || undefined}
              className={`group relative flex h-8 items-center rounded-md px-2 ${
                isSelected ? "bg-selection-strong text-content" : "opacity-65"
              }`}
            >
              <button
                type="button"
                title={`${entry.label} cloud sessions`}
                aria-label={`${entry.label} cloud sessions${
                  entry.count !== null ? `, ${entry.count} loaded` : ""
                }${entry.failed ? ", could not be read" : ""}`}
                aria-current={isSelected ? "true" : undefined}
                onClick={() => onSelect(entry.provider)}
                className="flex min-w-0 flex-1 cursor-default items-center gap-2 text-left"
              >
                <Cloud
                  className="size-4 shrink-0 text-content/70"
                  strokeWidth={1.75}
                />
                <span className="min-w-0 truncate text-sm font-medium leading-tight">
                  {entry.label} cloud
                </span>
                {entry.count !== null ? (
                  <span className="shrink-0 text-[11px] tabular-nums text-content/45">
                    {entry.count}
                  </span>
                ) : null}
                {entry.failed ? (
                  <span
                    aria-hidden
                    className="size-1.5 shrink-0 rounded-full bg-red-400"
                  />
                ) : null}
              </button>
              <HarnessIcon
                harness={entry.provider}
                className="ml-1.5 size-3.5 shrink-0"
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
