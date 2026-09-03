import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  loadTranscriptLayout,
  saveTranscriptLayout,
  TRANSCRIPT_LAYOUT_DEFAULT,
  loadTranscriptAnchor,
  saveTranscriptAnchor,
  TRANSCRIPT_ANCHOR_DEFAULT,
  loadThemePreference,
  saveThemePreference,
  resolveColorScheme,
  THEME_PREFERENCE_DEFAULT,
  loadUiFont,
  saveUiFont,
  UI_FONT_DEFAULT,
  loadTerminalFont,
  saveTerminalFont,
  TERMINAL_FONT_DEFAULT,
  loadUiFontSize,
  saveUiFontSize,
  UI_FONT_SIZE_DEFAULT,
  UI_FONT_SIZE_MIN,
  UI_FONT_SIZE_MAX,
  loadTerminalFontSize,
  saveTerminalFontSize,
  TERMINAL_FONT_SIZE_DEFAULT,
  TERMINAL_FONT_SIZE_MIN,
  TERMINAL_FONT_SIZE_MAX,
  loadPopoverSurfaceOpacity,
  savePopoverSurfaceOpacity,
  POPOVER_SURFACE_OPACITY_DEFAULT,
  POPOVER_SURFACE_OPACITY_MIN,
  POPOVER_SURFACE_OPACITY_MAX,
  loadPopoverBlur,
  savePopoverBlur,
  POPOVER_BLUR_DEFAULT,
  POPOVER_BLUR_MIN,
  POPOVER_BLUR_MAX,
  loadPopoverHighlight,
  savePopoverHighlight,
  POPOVER_HIGHLIGHT_DEFAULT,
  POPOVER_HIGHLIGHT_MIN,
  POPOVER_HIGHLIGHT_MAX,
  loadWallpaperPath,
  saveWallpaperPath,
  loadWallpaperOpacity,
  saveWallpaperOpacity,
  WALLPAPER_OPACITY_DEFAULT,
  WALLPAPER_OPACITY_MIN,
  WALLPAPER_OPACITY_MAX,
  loadWindowGlassStrength,
  saveWindowGlassStrength,
  WINDOW_GLASS_STRENGTH_DEFAULT,
  WINDOW_GLASS_STRENGTH_MIN,
  WINDOW_GLASS_STRENGTH_MAX,
} from "./appearance";

const KEY = "monocode.transcriptLayout";
const SCHEME_KEY = "monocode.colorScheme";
const ANCHOR_KEY = "monocode.transcriptAnchor";
const UI_FONT_KEY = "monocode.uiFont";
const TERMINAL_FONT_KEY = "monocode.terminalFont";
const UI_FONT_SIZE_KEY = "monocode.uiFontSize";
const TERMINAL_FONT_SIZE_KEY = "monocode.terminalFontSize";
const POPOVER_SURFACE_OPACITY_KEY = "monocode.popoverSurfaceOpacity";
const POPOVER_BLUR_KEY = "monocode.popoverBlur";
const POPOVER_HIGHLIGHT_KEY = "monocode.popoverHighlight";
const WALLPAPER_PATH_KEY = "monocode.wallpaperPath";
const WALLPAPER_OPACITY_KEY = "monocode.wallpaperOpacity";
const WINDOW_GLASS_STRENGTH_KEY = "monocode.windowGlassStrength";

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

describe("transcript layout setting", () => {
  beforeEach(mockLocalStorage);
  afterEach(() => {
    localStorage.removeItem(KEY);
  });

  it("defaults to full width", () => {
    expect(TRANSCRIPT_LAYOUT_DEFAULT).toBe("full");
    expect(loadTranscriptLayout()).toBe("full");
  });

  it("persists the chat layout", () => {
    saveTranscriptLayout("chat");
    expect(localStorage.getItem(KEY)).toBe("chat");
    expect(loadTranscriptLayout()).toBe("chat");
    saveTranscriptLayout("full");
    expect(loadTranscriptLayout()).toBe("full");
  });

  it("ignores unknown stored values", () => {
    localStorage.setItem(KEY, "bubbles");
    expect(loadTranscriptLayout()).toBe("full");
  });
});

describe("transcript prompt-to-top setting", () => {
  beforeEach(mockLocalStorage);
  afterEach(() => {
    localStorage.removeItem(ANCHOR_KEY);
  });

  it("defaults to on", () => {
    expect(TRANSCRIPT_ANCHOR_DEFAULT).toBe(true);
    expect(loadTranscriptAnchor()).toBe(true);
  });

  it("persists across loads", () => {
    saveTranscriptAnchor(true);
    expect(loadTranscriptAnchor()).toBe(true);
    saveTranscriptAnchor(false);
    expect(loadTranscriptAnchor()).toBe(false);
  });
});

describe("typography settings", () => {
  beforeEach(mockLocalStorage);
  afterEach(() => {
    localStorage.removeItem(UI_FONT_KEY);
    localStorage.removeItem(TERMINAL_FONT_KEY);
    localStorage.removeItem(UI_FONT_SIZE_KEY);
    localStorage.removeItem(TERMINAL_FONT_SIZE_KEY);
  });

  it("defaults to system fonts and standard sizes", () => {
    expect(loadUiFont()).toBe(UI_FONT_DEFAULT);
    expect(loadTerminalFont()).toBe(TERMINAL_FONT_DEFAULT);
    expect(loadUiFontSize()).toBe(UI_FONT_SIZE_DEFAULT);
    expect(loadTerminalFontSize()).toBe(TERMINAL_FONT_SIZE_DEFAULT);
  });

  it("persists valid interface and terminal font choices", () => {
    saveUiFont("sf-pro");
    saveTerminalFont("sf-mono");
    expect(loadUiFont()).toBe("sf-pro");
    expect(loadTerminalFont()).toBe("sf-mono");
  });

  it("ignores unknown stored font choices", () => {
    localStorage.setItem(UI_FONT_KEY, "comic-sans");
    localStorage.setItem(TERMINAL_FONT_KEY, "papyrus-mono");
    expect(loadUiFont()).toBe(UI_FONT_DEFAULT);
    expect(loadTerminalFont()).toBe(TERMINAL_FONT_DEFAULT);
  });

  it("clamps saved font sizes to supported ranges", () => {
    saveUiFontSize(UI_FONT_SIZE_MAX + 50);
    saveTerminalFontSize(TERMINAL_FONT_SIZE_MIN - 5);
    expect(loadUiFontSize()).toBe(UI_FONT_SIZE_MAX);
    expect(loadTerminalFontSize()).toBe(TERMINAL_FONT_SIZE_MIN);

    saveUiFontSize(UI_FONT_SIZE_MIN);
    saveTerminalFontSize(TERMINAL_FONT_SIZE_MAX);
    expect(loadUiFontSize()).toBe(UI_FONT_SIZE_MIN);
    expect(loadTerminalFontSize()).toBe(TERMINAL_FONT_SIZE_MAX);
  });
});

describe("popover appearance settings", () => {
  beforeEach(mockLocalStorage);
  afterEach(() => {
    localStorage.removeItem(POPOVER_SURFACE_OPACITY_KEY);
    localStorage.removeItem(POPOVER_BLUR_KEY);
    localStorage.removeItem(POPOVER_HIGHLIGHT_KEY);
  });

  it("defaults to the current bg-content and blur-xl treatment", () => {
    expect(loadPopoverSurfaceOpacity()).toBe(POPOVER_SURFACE_OPACITY_DEFAULT);
    expect(loadPopoverBlur()).toBe(POPOVER_BLUR_DEFAULT);
    expect(loadPopoverHighlight()).toBe(POPOVER_HIGHLIGHT_DEFAULT);
  });

  it("persists and clamps menu surface controls", () => {
    savePopoverSurfaceOpacity(POPOVER_SURFACE_OPACITY_MAX + 20);
    savePopoverBlur(POPOVER_BLUR_MIN - 10);
    expect(loadPopoverSurfaceOpacity()).toBe(POPOVER_SURFACE_OPACITY_MAX);
    expect(loadPopoverBlur()).toBe(POPOVER_BLUR_MIN);

    savePopoverSurfaceOpacity(POPOVER_SURFACE_OPACITY_MIN);
    savePopoverBlur(POPOVER_BLUR_MAX);
    savePopoverHighlight(56);
    expect(loadPopoverSurfaceOpacity()).toBe(POPOVER_SURFACE_OPACITY_MIN);
    expect(loadPopoverBlur()).toBe(POPOVER_BLUR_MAX);
    expect(loadPopoverHighlight()).toBe(60);

    savePopoverHighlight(POPOVER_HIGHLIGHT_MAX + 20);
    expect(loadPopoverHighlight()).toBe(POPOVER_HIGHLIGHT_MAX);
    savePopoverHighlight(POPOVER_HIGHLIGHT_MIN);
    expect(loadPopoverHighlight()).toBe(POPOVER_HIGHLIGHT_MIN);
  });
});

describe("wallpaper and glass strength settings", () => {
  beforeEach(mockLocalStorage);
  afterEach(() => {
    localStorage.removeItem(WALLPAPER_PATH_KEY);
    localStorage.removeItem(WALLPAPER_OPACITY_KEY);
    localStorage.removeItem(WINDOW_GLASS_STRENGTH_KEY);
  });

  it("defaults to no wallpaper and the standard glass treatment", () => {
    expect(loadWallpaperPath()).toBe("");
    expect(loadWallpaperOpacity()).toBe(WALLPAPER_OPACITY_DEFAULT);
    expect(loadWindowGlassStrength()).toBe(WINDOW_GLASS_STRENGTH_DEFAULT);
  });

  it("persists wallpaper path and clamps visual controls", () => {
    saveWallpaperPath("C:/Pictures/wallpaper.png");
    saveWallpaperOpacity(WALLPAPER_OPACITY_MAX + 20);
    saveWindowGlassStrength(WINDOW_GLASS_STRENGTH_MIN - 20);
    expect(loadWallpaperPath()).toBe("C:/Pictures/wallpaper.png");
    expect(loadWallpaperOpacity()).toBe(WALLPAPER_OPACITY_MAX);
    expect(loadWindowGlassStrength()).toBe(WINDOW_GLASS_STRENGTH_MIN);

    saveWallpaperPath("");
    saveWallpaperOpacity(WALLPAPER_OPACITY_MIN);
    saveWindowGlassStrength(WINDOW_GLASS_STRENGTH_MAX);
    expect(loadWallpaperPath()).toBe("");
    expect(loadWallpaperOpacity()).toBe(WALLPAPER_OPACITY_MIN);
    expect(loadWindowGlassStrength()).toBe(WINDOW_GLASS_STRENGTH_MAX);
  });
});

function mockSystemScheme(scheme: "dark" | "light") {
  Object.defineProperty(globalThis, "window", {
    value: {
      matchMedia: (query: string) => ({
        matches: query.includes("light") && scheme === "light",
      }),
    },
    configurable: true,
  });
}

describe("theme preference setting", () => {
  beforeEach(mockLocalStorage);
  afterEach(() => {
    localStorage.removeItem(SCHEME_KEY);
    Reflect.deleteProperty(globalThis, "window");
  });

  it("defaults to dark", () => {
    expect(THEME_PREFERENCE_DEFAULT).toBe("dark");
    expect(loadThemePreference()).toBe("dark");
  });

  it("persists each preference", () => {
    for (const value of ["system", "light", "dark"] as const) {
      saveThemePreference(value);
      expect(localStorage.getItem(SCHEME_KEY)).toBe(value);
      expect(loadThemePreference()).toBe(value);
    }
  });

  it("ignores unknown stored values", () => {
    localStorage.setItem(SCHEME_KEY, "solarized");
    expect(loadThemePreference()).toBe(THEME_PREFERENCE_DEFAULT);
  });

  it("resolves system against the OS appearance", () => {
    mockSystemScheme("light");
    expect(resolveColorScheme("system")).toBe("light");
    mockSystemScheme("dark");
    expect(resolveColorScheme("system")).toBe("dark");
  });

  it("keeps explicit picks regardless of the OS appearance", () => {
    mockSystemScheme("light");
    expect(resolveColorScheme("dark")).toBe("dark");
    mockSystemScheme("dark");
    expect(resolveColorScheme("light")).toBe("light");
  });

  it("falls back to dark without matchMedia", () => {
    expect(resolveColorScheme("system")).toBe("dark");
  });
});
