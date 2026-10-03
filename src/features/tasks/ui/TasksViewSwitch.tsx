import type { ReactNode } from "react";
import { DashboardSquare, ListBullet, PanelTop } from "../../../shared/ui/icons";
import {
  SegmentedSwitch,
  type SegmentedOption,
} from "../../../shared/ui/SegmentedSwitch";
import type { TaskViewId } from "../taskViewState";

const VIEWS: readonly SegmentedOption<TaskViewId>[] = [
  { id: "list", label: "List", icon: ListBullet },
  { id: "table", label: "Table", icon: PanelTop },
  { id: "board", label: "Board", icon: DashboardSquare },
];

export function TasksViewSwitch({
  view,
  onChange,
}: {
  view: TaskViewId;
  onChange: (view: TaskViewId) => void;
}): ReactNode {
  return (
    <SegmentedSwitch
      options={VIEWS}
      value={view}
      onChange={onChange}
      ariaLabel="Tasks view"
    />
  );
}
