import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ACCENT_COLOR_DEFAULT,
  CHAT_BACKGROUND_OPACITY_DEFAULT,
  CHAT_BACKGROUND_SCOPE_DEFAULT,
  loadChatBackgroundOpacity,
  loadAccentColor,
  loadChatBackgroundPath,
  loadChatBackgroundScope,
  loadNewThreadBackgroundEffect,
  loadTranscriptLayout,
  saveChatBackgroundOpacity,
  saveAccentColor,
  saveChatBackgroundPath,
  saveChatBackgroundScope,
  saveNewThreadBackgroundEffect,
  saveTranscriptLayout,
  TRANSCRIPT_LAYOUT_DEFAULT,
  loadTranscriptAnchor,
  saveTranscriptAnchor,
  TRANSCRIPT_ANCHOR_DEFAULT,
  loadShowExcludedFiles,
  saveShowExcludedFiles,
  SHOW_EXCLUDED_FILES_DEFAULT,
  loadThemePreference,
  loadThemeDarkLightness,
  saveThemeDarkLightness,
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
  THEME_DARK_LIGHTNESS_DEFAULT,
  NEW_THREAD_BACKGROUND_EFFECT_DEFAULT,
} from "./appearance";

const KEY = "monocode.transcriptLayout";
const ACCENT_COLOR_KEY = "monocode.accentColor";
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
const SHOW_EXCLUDED_FILES_KEY = "monocode.showExcludedFiles";
const CHAT_BACKGROUND_PATH_KEY = "monocode.chatBackgroundPath";
const CHAT_BACKGROUND_OPACITY_KEY = "monocode.chatBackgroundOpacity";
const CHAT_BACKGROUND_SCOPE_KEY = "monocode.chatBackgroundScope";
const NEW_THREAD_BACKGROUND_EFFECT_KEY = "monocode.newThreadBackgroundEffect";
const THEME_DARK_LIGHTNESS_KEY = "monocode.themeDarkLightness";

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

describe("accent color setting", () => {
  beforeEach(mockLocalStorage);
  afterEach(() => {
    localStorage.removeItem(ACCENT_COLOR_KEY);
  });

  it("defaults to the original neutral appearance", () => {
    expect(ACCENT_COLOR_DEFAULT).toBeNull();
    expect(loadAccentColor()).toBeNull();
  });

  it("persists normalized hex colors and clears default or invalid values", () => {
    saveAccentColor("#AABBCC");
    expect(localStorage.getItem(ACCENT_COLOR_KEY)).toBe("#aabbcc");
    expect(loadAccentColor()).toBe("#aabbcc");

    saveAccentColor(ACCENT_COLOR_DEFAULT);
    expect(localStorage.getItem(ACCENT_COLOR_KEY)).toBeNull();

    saveAccentColor("tomato");
    expect(localStorage.getItem(ACCENT_COLOR_KEY)).toBeNull();
    expect(loadAccentColor()).toBeNull();
  });
});

describe("transcript layout setting", () => {
  beforeEach(mockLocalStorage);
  afterEach(() => {
    localStorage.removeItem(KEY);
  });

  it("defaults to chat", () => {
    expect(TRANSCRIPT_LAYOUT_DEFAULT).toBe("chat");
    expect(loadTranscriptLayout()).toBe("chat");
  });

  it("persists an explicit full width layout", () => {
    saveTranscriptLayout("full");
    expect(localStorage.getItem(KEY)).toBe("full");
    expect(loadTranscriptLayout()).toBe("full");
    saveTranscriptLayout("chat");
    expect(loadTranscriptLayout()).toBe("chat");
  });

  it("ignores unknown stored values", () => {
    localStorage.setItem(KEY, "bubbles");
    expect(loadTranscriptLayout()).toBe("chat");
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

describe("show excluded files setting", () => {
  beforeEach(mockLocalStorage);
  afterEach(() => {
    localStorage.removeItem(SHOW_EXCLUDED_FILES_KEY);
  });

  it("defaults to off", () => {
    expect(SHOW_EXCLUDED_FILES_DEFAULT).toBe(false);
    expect(loadShowExcludedFiles()).toBe(false);
  });

  it("persists across loads", () => {
    saveShowExcludedFiles(true);
    expect(loadShowExcludedFiles()).toBe(true);
    saveShowExcludedFiles(false);
    expect(loadShowExcludedFiles()).toBe(false);
  });
});

describe("chat background setting", () => {
  beforeEach(mockLocalStorage);
  afterEach(() => {
    localStorage.removeItem(CHAT_BACKGROUND_PATH_KEY);
    localStorage.removeItem(CHAT_BACKGROUND_OPACITY_KEY);
    localStorage.removeItem(CHAT_BACKGROUND_SCOPE_KEY);
    localStorage.removeItem(NEW_THREAD_BACKGROUND_EFFECT_KEY);
  });

  it("stores and clears the app-owned background path", () => {
    expect(loadChatBackgroundPath()).toBeNull();
    saveChatBackgroundPath("/app-data/backgrounds/chat-background.webp");
    expect(loadChatBackgroundPath()).toBe(
      "/app-data/backgrounds/chat-background.webp",
    );
    saveChatBackgroundPath(null);
    expect(loadChatBackgroundPath()).toBeNull();
  });

  it("defaults and clamps background visibility", () => {
    expect(loadChatBackgroundOpacity()).toBe(CHAT_BACKGROUND_OPACITY_DEFAULT);
    saveChatBackgroundOpacity(1);
    expect(loadChatBackgroundOpacity()).toBe(0.65);
    saveChatBackgroundOpacity(0);
    expect(loadChatBackgroundOpacity()).toBe(0.05);
  });

  it("persists where the background is shown", () => {
    expect(loadChatBackgroundScope()).toBe(CHAT_BACKGROUND_SCOPE_DEFAULT);
    saveChatBackgroundScope("empty");
    expect(loadChatBackgroundScope()).toBe("empty");
    saveChatBackgroundScope("all");
    expect(loadChatBackgroundScope()).toBe("all");
    localStorage.setItem(CHAT_BACKGROUND_SCOPE_KEY, "transcript");
    expect(loadChatBackgroundScope()).toBe(CHAT_BACKGROUND_SCOPE_DEFAULT);
  });

  it("defaults, persists, and validates the new-thread background effect", () => {
    expect(loadNewThreadBackgroundEffect()).toBe(
      NEW_THREAD_BACKGROUND_EFFECT_DEFAULT,
    );
    for (const effect of [
      "none",
      "dither",
      "ascii",
      "halftone",
      "scanlines",
    ] as const) {
      saveNewThreadBackgroundEffect(effect);
      expect(loadNewThreadBackgroundEffect()).toBe(effect);
    }
    localStorage.setItem(NEW_THREAD_BACKGROUND_EFFECT_KEY, "blur");
    expect(loadNewThreadBackgroundEffect()).toBe(
      NEW_THREAD_BACKGROUND_EFFECT_DEFAULT,
    );
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

describe("dark theme lightness setting", () => {
  beforeEach(mockLocalStorage);
  afterEach(() => {
    localStorage.removeItem(THEME_DARK_LIGHTNESS_KEY);
  });

  it("defaults to the existing dark background lightness", () => {
    expect(THEME_DARK_LIGHTNESS_DEFAULT).toBe(9);
    expect(loadThemeDarkLightness()).toBe(9);
  });

  it("persists true black and clamps overly light values", () => {
    saveThemeDarkLightness(0);
    expect(loadThemeDarkLightness()).toBe(0);
    saveThemeDarkLightness(100);
    expect(loadThemeDarkLightness()).toBe(30);
  });
});
