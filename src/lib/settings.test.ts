import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COMPOSER_RUNNER_DEFAULT,
  DETAILED_CONTEXT_DEFAULT,
  DIFF_VIEWER_DEFAULT,
  FOLLOW_UP_BEHAVIOR_DEFAULT,
  GRID_ARCADE_ENABLED_DEFAULT,
  isSettingsSectionId,
  KEYBINDINGS,
  LIVE_AGENTS_ENABLED_DEFAULT,
  loadComposerRunner,
  loadDetailedContext,
  loadDiffViewer,
  loadFollowUpBehavior,
  loadGridArcadeEnabled,
  loadLiveAgentsEnabled,
  loadNotesEnabled,
  loadRemainingQuota,
  NOTES_ENABLED_DEFAULT,
  REMAINING_QUOTA_DEFAULT,
  saveComposerRunner,
  saveDetailedContext,
  saveDiffViewer,
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
} from "./settings";

const KEY = "monocode.composerRunner";
const NOTES_KEY = "monocode.notesEnabled";
const LIVE_AGENTS_KEY = "monocode.liveAgentsEnabled";
const GRID_ARCADE_KEY = "monocode.gridArcadeEnabled";
const DIFF_VIEWER_KEY = "monocode.diffViewer";
const FOLLOW_UP_BEHAVIOR_KEY = "monocode.followUpBehavior";
const DETAILED_CONTEXT_KEY = "monocode.detailedContext";
const REMAINING_QUOTA_KEY = "monocode.remainingQuota";

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
  it("documents session and project cycling in the shortcut list", () => {
    const rows = KEYBINDINGS.filter(
      (row) =>
        row.command.startsWith("Session:") ||
        row.command.startsWith("Project:"),
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
