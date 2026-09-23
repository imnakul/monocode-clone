import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COMPOSER_RUNNER_DEFAULT,
  DETAILED_CONTEXT_DEFAULT,
  COLLAPSED_PROJECT_RAIL_MODE_DEFAULT,
  searchSettings,
  SETTINGS_INDEX,
  settingsSectionsByGroup,
  MODEL_CONTROLS_DEFAULT,
  DIFF_VIEWER_DEFAULT,
  FILE_TAB_MODE_DEFAULT,
  FOLLOW_UP_BEHAVIOR_DEFAULT,
  GRID_ARCADE_ENABLED_DEFAULT,
  isSettingsSectionId,
  KEYBINDINGS,
  LIVE_AGENTS_ENABLED_DEFAULT,
  TAB_ANIMATIONS_ENABLED_DEFAULT,
  loadComposerRunner,
  loadDetailedContext,
  loadComposerEffortVisible,
  loadCollapsedProjectRailMode,
  loadModelControls,
  loadDiffViewer,
  loadFileTabMode,
  loadFollowUpBehavior,
  loadGridArcadeEnabled,
  loadLiveAgentsEnabled,
  loadNotesEnabled,
  loadRemainingQuota,
  loadTabAnimationsEnabled,
  NOTES_ENABLED_DEFAULT,
  REMAINING_QUOTA_DEFAULT,
  saveComposerRunner,
  saveDetailedContext,
  saveComposerEffortVisible,
  saveCollapsedProjectRailMode,
  saveModelControls,
  saveDiffViewer,
  saveFileTabMode,
  saveFollowUpBehavior,
  saveGridArcadeEnabled,
  saveLiveAgentsEnabled,
  saveNotesEnabled,
  saveRemainingQuota,
  SETTINGS_SECTIONS,
  settingsSectionDescription,
  settingsSectionLabel,
  subscribeDetailedContext,
  subscribeFollowUpBehavior,
  subscribeRemainingQuota,
  saveTabAnimationsEnabled,
} from "./settings";
import { MOD, SHIFT } from "../../../platform/tauri/platform";

const KEY = "monocode.composerRunner";
const MODEL_CONTROLS_KEY = "monocode.modelControls";
const LEGACY_EFFORT_VISIBLE_KEY = "monocode.composerEffortVisible";
const NOTES_KEY = "monocode.notesEnabled";
const LIVE_AGENTS_KEY = "monocode.liveAgentsEnabled";
const GRID_ARCADE_KEY = "monocode.gridArcadeEnabled";
const DIFF_VIEWER_KEY = "monocode.diffViewer";
const FILE_TAB_MODE_KEY = "monocode.fileTabMode";
const FOLLOW_UP_BEHAVIOR_KEY = "monocode.followUpBehavior";
const DETAILED_CONTEXT_KEY = "monocode.detailedContext";
const REMAINING_QUOTA_KEY = "monocode.remainingQuota";
const TAB_ANIMATIONS_KEY = "monocode.tabAnimationsEnabled";
const COLLAPSED_PROJECT_RAIL_MODE_KEY = "monocode.collapsedProjectRailMode";

describe("follow-up behavior setting", () => {
  beforeEach(mockLocalStorage);
  afterEach(() => {
    localStorage.removeItem(FOLLOW_UP_BEHAVIOR_KEY);
  });

  it("defaults to steer", () => {
    expect(FOLLOW_UP_BEHAVIOR_DEFAULT).toBe("steer");
    expect(loadFollowUpBehavior()).toBe("steer");
  });

  it("persists queue behavior", () => {
    saveFollowUpBehavior("queue");
    expect(loadFollowUpBehavior()).toBe("queue");
  });

  it("ignores unknown stored values", () => {
    localStorage.setItem(FOLLOW_UP_BEHAVIOR_KEY, "interrupt");
    expect(loadFollowUpBehavior()).toBe("steer");
  });

  it("safely falls back when storage throws", () => {
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: () => {
          throw new Error("storage quota exceeded");
        },
        setItem: () => {
          throw new Error("storage quota exceeded");
        },
        removeItem: () => {},
      },
      configurable: true,
    });
    expect(loadFollowUpBehavior()).toBe("steer");
    expect(() => saveFollowUpBehavior("queue")).not.toThrow();
  });

  it("notifies subscribers when setting changes and cleans up", () => {
    const target = new EventTarget();
    vi.stubGlobal("window", target);
    try {
      let callCount = 0;
      const unsubscribe = subscribeFollowUpBehavior(() => {
        callCount++;
      });

      saveFollowUpBehavior("queue");
      expect(callCount).toBe(1);

      saveFollowUpBehavior("steer");
      expect(callCount).toBe(2);

      unsubscribe();
      saveFollowUpBehavior("queue");
      expect(callCount).toBe(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

function mockLocalStorage() {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => {
      data.clear();
    },
    key: (index: number) => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  });
}

describe("composer runner setting", () => {
  beforeEach(mockLocalStorage);
  afterEach(() => {
    localStorage.removeItem(KEY);
  });

  it("defaults to on", () => {
    expect(COMPOSER_RUNNER_DEFAULT).toBe(true);
    expect(loadComposerRunner()).toBe(true);
  });

  it("persists an off switch", () => {
    saveComposerRunner(false);
    expect(localStorage.getItem(KEY)).toBe("0");
    expect(loadComposerRunner()).toBe(false);
    saveComposerRunner(true);
    expect(loadComposerRunner()).toBe(true);
  });
});

describe("model controls setting", () => {
  beforeEach(mockLocalStorage);
  afterEach(() => {
    localStorage.removeItem(MODEL_CONTROLS_KEY);
    localStorage.removeItem(LEGACY_EFFORT_VISIBLE_KEY);
  });

  it("keeps options in the model menu by default", () => {
    expect(MODEL_CONTROLS_DEFAULT).toBe("menu");
    expect(loadModelControls()).toBe("menu");
  });

  it("persists the beside-picker preference", () => {
    saveModelControls("beside");
    expect(localStorage.getItem(MODEL_CONTROLS_KEY)).toBe("beside");
    expect(loadModelControls()).toBe("beside");
    saveModelControls("menu");
    expect(loadModelControls()).toBe("menu");
  });

  it("ignores unknown stored values", () => {
    localStorage.setItem(MODEL_CONTROLS_KEY, "everywhere");
    expect(loadModelControls()).toBe("menu");
  });

  it("migrates the previous effort-control toggle", () => {
    localStorage.setItem(LEGACY_EFFORT_VISIBLE_KEY, "1");
    expect(loadModelControls()).toBe("beside");
    localStorage.setItem(LEGACY_EFFORT_VISIBLE_KEY, "0");
    localStorage.removeItem(MODEL_CONTROLS_KEY);
    expect(loadModelControls()).toBe("menu");
  });
});

describe("notes enabled setting", () => {
  beforeEach(mockLocalStorage);
  afterEach(() => {
    localStorage.removeItem(NOTES_KEY);
  });

  it("defaults to on", () => {
    expect(NOTES_ENABLED_DEFAULT).toBe(true);
    expect(loadNotesEnabled()).toBe(true);
  });

  it("persists an off switch", () => {
    saveNotesEnabled(false);
    expect(localStorage.getItem(NOTES_KEY)).toBe("0");
    expect(loadNotesEnabled()).toBe(false);
    saveNotesEnabled(true);
    expect(loadNotesEnabled()).toBe(true);
  });
});

describe("live agents enabled setting", () => {
  beforeEach(mockLocalStorage);
  afterEach(() => {
    localStorage.removeItem(LIVE_AGENTS_KEY);
  });

  it("defaults to on", () => {
    expect(LIVE_AGENTS_ENABLED_DEFAULT).toBe(true);
    expect(loadLiveAgentsEnabled()).toBe(true);
  });

  it("persists an off switch", () => {
    saveLiveAgentsEnabled(false);
    expect(localStorage.getItem(LIVE_AGENTS_KEY)).toBe("0");
    expect(loadLiveAgentsEnabled()).toBe(false);
    saveLiveAgentsEnabled(true);
    expect(loadLiveAgentsEnabled()).toBe(true);
  });
});

describe("grid arcade enabled setting", () => {
  beforeEach(mockLocalStorage);
  afterEach(() => {
    localStorage.removeItem(GRID_ARCADE_KEY);
  });

  it("defaults to on", () => {
    expect(GRID_ARCADE_ENABLED_DEFAULT).toBe(true);
    expect(loadGridArcadeEnabled()).toBe(true);
  });

  it("persists an off switch", () => {
    saveGridArcadeEnabled(false);
    expect(localStorage.getItem(GRID_ARCADE_KEY)).toBe("0");
    expect(loadGridArcadeEnabled()).toBe(false);
    saveGridArcadeEnabled(true);
    expect(loadGridArcadeEnabled()).toBe(true);
  });
});

describe("workspace navigation keybindings", () => {
  it("documents the command palette and reload shortcuts", () => {
    expect(
      KEYBINDINGS.filter((row) =>
        ["App: Command Palette", "View: Reload"].includes(row.command),
      ),
    ).toEqual([
      {
        command: "App: Command Palette",
        keys: `${MOD}${SHIFT}P`,
        when: "Always",
      },
      {
        command: "View: Reload",
        keys: `${MOD}${SHIFT}R`,
        when: "Always",
      },
    ]);
  });
  it("documents the draft workspace toggle", () => {
    expect(
      KEYBINDINGS.find((row) => row.command === "Composer: Toggle Workspace"),
    ).toEqual({
      command: "Composer: Toggle Workspace",
      keys: `${MOD}${SHIFT}G`,
      when: "Draft session composer",
    });
  });
  it("documents session and project cycling in the shortcut list", () => {
    const rows = KEYBINDINGS.filter((row) =>
      /^(Session|Project): (Previous|Next)$/.test(row.command),
    );
    expect(rows.map((row) => row.command)).toEqual([
      "Session: Previous",
      "Session: Next",
      "Project: Previous",
      "Project: Next",
    ]);
    expect(
      rows.every(
        (row) => row.when === "!overlay && (!textFocus || emptyComposer)",
      ),
    ).toBe(true);
  });
});

describe("diff viewer setting", () => {
  beforeEach(mockLocalStorage);
  afterEach(() => {
    localStorage.removeItem(DIFF_VIEWER_KEY);
  });

  it("defaults to the editor layout", () => {
    expect(DIFF_VIEWER_DEFAULT).toBe("editor");
    expect(loadDiffViewer()).toBe("editor");
  });

  it("persists the unified layout", () => {
    saveDiffViewer("unified");
    expect(localStorage.getItem(DIFF_VIEWER_KEY)).toBe("unified");
    expect(loadDiffViewer()).toBe("unified");
    saveDiffViewer("editor");
    expect(loadDiffViewer()).toBe("editor");
  });

  it("ignores unknown stored values", () => {
    localStorage.setItem(DIFF_VIEWER_KEY, "split");
    expect(loadDiffViewer()).toBe("editor");
  });
});

describe("experimentation section metadata", () => {
  it("registers experimentation as a valid settings section", () => {
    expect(isSettingsSectionId("experimentation")).toBe(true);
    expect(
      SETTINGS_SECTIONS.some((section) => section.id === "experimentation"),
    ).toBe(true);
    expect(settingsSectionLabel("experimentation")).toBe("Experimentation");
    expect(settingsSectionDescription("experimentation")).toBe(
      "Preview features that may change or use estimated data.",
    );
  });
});

describe("detailed context setting", () => {
  beforeEach(mockLocalStorage);
  afterEach(() => {
    localStorage.removeItem(DETAILED_CONTEXT_KEY);
  });

  it("defaults to off", () => {
    expect(DETAILED_CONTEXT_DEFAULT).toBe(false);
    expect(loadDetailedContext()).toBe(false);
  });

  it("persists on and off switches", () => {
    saveDetailedContext(true);
    expect(localStorage.getItem(DETAILED_CONTEXT_KEY)).toBe("1");
    expect(loadDetailedContext()).toBe(true);

    saveDetailedContext(false);
    expect(localStorage.getItem(DETAILED_CONTEXT_KEY)).toBe("0");
    expect(loadDetailedContext()).toBe(false);
  });

  it("safely falls back to false for invalid stored values", () => {
    localStorage.setItem(DETAILED_CONTEXT_KEY, "invalid");
    expect(loadDetailedContext()).toBe(false);

    localStorage.setItem(DETAILED_CONTEXT_KEY, "");
    expect(loadDetailedContext()).toBe(false);
  });

  it("safely falls back to false when storage throws", () => {
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: () => {
          throw new Error("storage quota exceeded");
        },
        setItem: () => {
          throw new Error("storage quota exceeded");
        },
        removeItem: () => {},
      },
      configurable: true,
    });
    expect(loadDetailedContext()).toBe(false);
    expect(() => saveDetailedContext(true)).not.toThrow();
  });

  it("notifies subscribers when the setting changes", () => {
    const target = new EventTarget();
    vi.stubGlobal("window", target);
    try {
      let callCount = 0;
      const unsubscribe = subscribeDetailedContext(() => {
        callCount++;
      });

      saveDetailedContext(true);
      expect(callCount).toBe(1);

      saveDetailedContext(false);
      expect(callCount).toBe(2);

      unsubscribe();
      saveDetailedContext(true);
      expect(callCount).toBe(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("remaining quota setting", () => {
  beforeEach(mockLocalStorage);
  afterEach(() => {
    localStorage.removeItem(REMAINING_QUOTA_KEY);
  });

  it("defaults to off", () => {
    expect(REMAINING_QUOTA_DEFAULT).toBe(false);
    expect(loadRemainingQuota()).toBe(false);
  });

  it("persists on and off switches", () => {
    saveRemainingQuota(true);
    expect(localStorage.getItem(REMAINING_QUOTA_KEY)).toBe("1");
    expect(loadRemainingQuota()).toBe(true);

    saveRemainingQuota(false);
    expect(localStorage.getItem(REMAINING_QUOTA_KEY)).toBe("0");
    expect(loadRemainingQuota()).toBe(false);
  });

  it("safely falls back to false for invalid stored values", () => {
    localStorage.setItem(REMAINING_QUOTA_KEY, "invalid");
    expect(loadRemainingQuota()).toBe(false);

    localStorage.setItem(REMAINING_QUOTA_KEY, "");
    expect(loadRemainingQuota()).toBe(false);
  });

  it("safely falls back to false when storage throws", () => {
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: () => {
          throw new Error("storage access denied");
        },
        setItem: () => {
          throw new Error("storage access denied");
        },
        removeItem: () => {},
      },
      configurable: true,
    });
    expect(loadRemainingQuota()).toBe(false);
    expect(() => saveRemainingQuota(true)).not.toThrow();
  });

  it("notifies subscribers when the setting changes", () => {
    const target = new EventTarget();
    vi.stubGlobal("window", target);
    try {
      let callCount = 0;
      const unsubscribe = subscribeRemainingQuota(() => {
        callCount++;
      });

      saveRemainingQuota(true);
      expect(callCount).toBe(1);

      saveRemainingQuota(false);
      expect(callCount).toBe(2);

      unsubscribe();
      saveRemainingQuota(true);
      expect(callCount).toBe(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });

});

describe("file tab mode setting", () => {
  beforeEach(mockLocalStorage);
  afterEach(() => {
    localStorage.removeItem(FILE_TAB_MODE_KEY);
  });

  it("opens files beside chat by default", () => {
    expect(FILE_TAB_MODE_DEFAULT).toBe("pane");
    expect(loadFileTabMode()).toBe("pane");
  });

  it("persists top-level file tabs", () => {
    saveFileTabMode("workspace");
    expect(localStorage.getItem(FILE_TAB_MODE_KEY)).toBe("workspace");
    expect(loadFileTabMode()).toBe("workspace");
  });

  it("ignores unknown stored values", () => {
    localStorage.setItem(FILE_TAB_MODE_KEY, "window");
    expect(loadFileTabMode()).toBe("pane");
  });
});

describe("tab animations setting", () => {
  beforeEach(mockLocalStorage);
  afterEach(() => {
    localStorage.removeItem(TAB_ANIMATIONS_KEY);
  });

  it("defaults to off", () => {
    expect(TAB_ANIMATIONS_ENABLED_DEFAULT).toBe(false);
    expect(loadTabAnimationsEnabled()).toBe(false);
  });

  it("persists an off switch", () => {
    saveTabAnimationsEnabled(false);
    expect(localStorage.getItem(TAB_ANIMATIONS_KEY)).toBe("0");
    expect(loadTabAnimationsEnabled()).toBe(false);
    saveTabAnimationsEnabled(true);
    expect(loadTabAnimationsEnabled()).toBe(true);
  });
});

describe("collapsed project rail setting", () => {
  beforeEach(mockLocalStorage);
  afterEach(() => {
    localStorage.removeItem(COLLAPSED_PROJECT_RAIL_MODE_KEY);
  });

  it("defaults to the previously shipped hidden rail", () => {
    expect(COLLAPSED_PROJECT_RAIL_MODE_DEFAULT).toBe("hidden");
    expect(loadCollapsedProjectRailMode()).toBe("hidden");
  });

  it("persists the compact mode and ignores unknown values", () => {
    saveCollapsedProjectRailMode("compact");
    expect(localStorage.getItem(COLLAPSED_PROJECT_RAIL_MODE_KEY)).toBe(
      "compact",
    );
    expect(loadCollapsedProjectRailMode()).toBe("compact");

    localStorage.setItem(COLLAPSED_PROJECT_RAIL_MODE_KEY, "floating");
    expect(loadCollapsedProjectRailMode()).toBe("hidden");
  });
});

describe("settings navigation", () => {
  it("lists every section under exactly one rail group", () => {
    const groups = settingsSectionsByGroup();
    expect(groups.map((group) => group.label)).toEqual([
      "App",
      "Agents",
      "Workspace",
    ]);
    expect(groups.flatMap((group) => group.sections.map((s) => s.id))).toEqual([
      "general",
      "appearance",
      "keybindings",
      "experimentation",
      "chat",
      "providers",
      "skills",
      "inbox",
      "archive",
      "worktrees",
      "migration",
    ]);
  });

  it("points every indexed setting at a real section", () => {
    const sections = new Set(
      settingsSectionsByGroup().flatMap((group) =>
        group.sections.map((section) => section.id),
      ),
    );
    for (const entry of SETTINGS_INDEX) {
      expect(sections.has(entry.section), entry.id).toBe(true);
    }
  });
});

describe("settings search", () => {
  it("returns nothing for an empty query", () => {
    expect(searchSettings("   ")).toEqual([]);
  });

  it("ranks label matches over keyword matches, and pages last", () => {
    expect(searchSettings("glass").map((result) => result.label)).toEqual([
      "Glass strength",
      "Main pane glass",
      "Blur radius",
      "Sidebar opacity",
      "Appearance",
    ]);
  });

  it("finds a setting by a word that is not in its label", () => {
    expect(searchSettings("steer")[0]).toMatchObject({
      section: "chat",
      sectionLabel: "Chat",
      settingId: "follow-up",
      label: "Follow-up behavior",
    });
  });

  it("returns a whole page with no setting id", () => {
    expect(searchSettings("skills")).toEqual([
      {
        section: "skills",
        sectionLabel: "Skills",
        settingId: null,
        label: "Skills",
      },
    ]);
  });

  it("caps the result list", () => {
    expect(searchSettings("e", 4)).toHaveLength(4);
  });
});
