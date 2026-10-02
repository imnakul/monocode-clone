import { useState } from "react";
import { projectKey, projectName } from "../../../shared/lib/paths";
import { StickyNote } from "../../../shared/ui/icons";
import { useTabGroupLogos } from "../hooks/useTabGroupLogos";
import {
  loadTabGroupColors,
  loadTabGroupCustomColors,
  loadTabGroupMascots,
  resolveTabGroupColor,
  resolveTabGroupLogo,
  resolveTabGroupMascot,
} from "../../workspace/model/tabGroups";
import { ProjectLogoIcon } from "./ProjectLogoIcon";
import { ProjectMascot } from "./ProjectMascot";

export type ProjectMarks = {
  logos: Record<string, string>;
  mascots: Record<string, string>;
  colors: Record<string, number>;
  customColors: Record<string, string>;
};

export function useProjectMarks(): ProjectMarks {
  const logos = useTabGroupLogos();
  const [mascots] = useState(loadTabGroupMascots);
  const [colors] = useState(loadTabGroupColors);
  const [customColors] = useState(loadTabGroupCustomColors);
  return { logos, mascots, colors, customColors };
}

export function ProjectMark({
  cwd,
  logos,
  mascots,
  colors,
  customColors,
}: { cwd: string } & ProjectMarks) {
  const project = projectName(cwd);
  const key = projectKey(cwd);
  const logoPath = resolveTabGroupLogo(key, logos);
  const mascotName = resolveTabGroupMascot(key, mascots);
  const mascotColor = resolveTabGroupColor(key, colors, customColors, project);
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {logoPath ? (
        <ProjectLogoIcon
          path={logoPath}
          className="size-3.5 shrink-0 rounded-sm"
          imageClassName="size-3.5"
        />
      ) : (
        <ProjectMascot
          project={project}
          color={mascotColor}
          name={mascotName}
          className="size-3 shrink-0"
        />
      )}
      <span className="min-w-0 truncate">{project}</span>
    </span>
  );
}

/** Same visual weight as a project mark, so unbound items don't read as blank. */
export function PersonalMark() {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <StickyNote
        className="size-3 shrink-0 text-content/50"
        strokeWidth={1.75}
      />
      <span className="min-w-0 truncate">Personal</span>
    </span>
  );
}
