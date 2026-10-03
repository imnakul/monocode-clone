import type { ReactElement } from "react";
import { Toggle } from "../../../shared/ui/Toggle";
import { playCue } from "../model/sounds";

/** The one Settings switch: the shared Toggle plus the switch sound cue. */
export function SettingsToggle({
  label,
  on,
  onChange,
  disabled = false,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
}): ReactElement {
  return (
    <Toggle
      label={label}
      on={on}
      onChange={onChange}
      disabled={disabled}
      onToggle={() => playCue("switch")}
    />
  );
}
