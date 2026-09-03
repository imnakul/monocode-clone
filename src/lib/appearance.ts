import { invoke } from "@tauri-apps/api/core";
import { IS_MAC, IS_WINDOWS } from "./platform";

const THEME_HUE_KEY = "monocode.themeHue";
const THEME_SATURATION_KEY = "monocode.themeSaturation";
const OPACITY_KEY = "monocode.sidebarOpacity";
const BLUR_KEY = "monocode.sidebarBlur";
const PROJECT_RAIL_OPEN_KEY = "monocode.projectRailOpen";
const BODY_KEY = "monocode.bodyGlass";
const SCHEME_KEY = "monocode.colorScheme";
const SIDEBAR_TAB_ORDER_KEY = "monocode.sidebarTabOrder";
const PROJECT_RAIL_WIDTH_KEY = "monocode.projectRailWidth";
const TRANSCRIPT_LAYOUT_KEY = "monocode.transcriptLayout";
const TRANSCRIPT_ANCHOR_KEY = "monocode.transcriptAnchor";
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

export type ColorScheme = "dark" | "light";
export type ThemePreference = ColorScheme | "system";
export type TranscriptLayout = "full" | "chat";
export type UiFontId = "system" | "sf-pro" | "segoe-ui" | "inter" | "geist";
export type TerminalFontId =
  | "system-mono"
  | "sf-mono"
  | "jetbrains-mono"
  | "cascadia-mono"
  | "consolas"
  | "geist-mono";

type FontOption<T extends string> = {
  value: T;
  label: string;
  family: string;
};

export const UI_FONT_OPTIONS: readonly FontOption<UiFontId>[] = [
  {
    value: "system",
    label: "System UI",
    family:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", sans-serif',
  },
  {
    value: "sf-pro",
    label: "SF Pro",
    family:
      '"SF Pro", "SF Pro Text", "SF Pro Display", system-ui, -apple-system, sans-serif',
  },
  {
    value: "segoe-ui",
    label: "Segoe UI",
    family: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
  },
  { value: "inter", label: "Inter", family: '"Inter", system-ui, sans-serif' },
  { value: "geist", label: "Geist", family: '"Geist", system-ui, sans-serif' },
];

export const TERMINAL_FONT_OPTIONS: readonly FontOption<TerminalFontId>[] = [
  {
    value: "system-mono",
    label: "System monospace",
    family: 'ui-monospace, "Cascadia Mono", Consolas, monospace',
  },
  {
    value: "sf-mono",
    label: "SF Mono",
    family: '"SF Mono", ui-monospace, "Cascadia Mono", Consolas, monospace',
  },
  {
    value: "jetbrains-mono",
    label: "JetBrains Mono",
    family:
      '"JetBrainsMonoNL Nerd Font Mono", "JetBrains Mono", ui-monospace, monospace',
  },
  {
    value: "cascadia-mono",
    label: "Cascadia Mono",
    family: '"Cascadia Mono", ui-monospace, Consolas, monospace',
  },
  {
    value: "consolas",
    label: "Consolas",
    family: "Consolas, ui-monospace, monospace",
  },
  {
    value: "geist-mono",
    label: "Geist Mono",
    family: '"Geist Mono", ui-monospace, monospace',
  },
];

export const UI_FONT_DEFAULT: UiFontId = "system";
export const TERMINAL_FONT_DEFAULT: TerminalFontId = "system-mono";
export const UI_FONT_SIZE_MIN = 90;
export const UI_FONT_SIZE_MAX = 120;
export const UI_FONT_SIZE_DEFAULT = 100;
export const TERMINAL_FONT_SIZE_MIN = 10;
export const TERMINAL_FONT_SIZE_MAX = 20;
export const TERMINAL_FONT_SIZE_DEFAULT = 13;
export const POPOVER_SURFACE_OPACITY_MIN = 0;
export const POPOVER_SURFACE_OPACITY_MAX = 30;
export const POPOVER_SURFACE_OPACITY_DEFAULT = 10;
export const POPOVER_BLUR_MIN = 0;
export const POPOVER_BLUR_MAX = 48;
export const POPOVER_BLUR_DEFAULT = 24;
export const POPOVER_HIGHLIGHT_MIN = 0;
export const POPOVER_HIGHLIGHT_MAX = 100;
export const POPOVER_HIGHLIGHT_DEFAULT = 10;
export const WALLPAPER_OPACITY_MIN = 0;
export const WALLPAPER_OPACITY_MAX = 100;
export const WALLPAPER_OPACITY_DEFAULT = 40;
export const WINDOW_GLASS_STRENGTH_MIN = 0;
export const WINDOW_GLASS_STRENGTH_MAX = 100;
export const WINDOW_GLASS_STRENGTH_DEFAULT = 0;

export const THEME_PREFERENCE_DEFAULT: ThemePreference = "dark";

/** Fired on `window` whenever the color scheme flips (detail: ColorScheme). */
export const SCHEME_CHANGE_EVENT = "monocode:schemechange";

export const TRANSCRIPT_LAYOUT_DEFAULT: TranscriptLayout = "full";

export const TRANSCRIPT_ANCHOR_DEFAULT = true;

/** Fired on `window` whenever prompt-to-top anchoring flips (detail: boolean). */
export const TRANSCRIPT_ANCHOR_CHANGE_EVENT = "monocode:transcriptanchorchange";

/** Fired on `window` whenever the transcript layout flips (detail: TranscriptLayout). */
export const TRANSCRIPT_LAYOUT_CHANGE_EVENT = "monocode:transcriptlayoutchange";

export type SidebarTabId = "files" | "sessions" | "changes" | "inbox";

const DEFAULT_SIDEBAR_TAB_ORDER: SidebarTabId[] = [
  "sessions",
  "inbox",
  "files",
  "changes",
];

export const THEME_HUE_MIN = 0;
export const THEME_HUE_MAX = 360;
export const THEME_HUE_DEFAULT = 240;

export const THEME_SATURATION_MIN = 0;
export const THEME_SATURATION_MAX = 100;
export const THEME_SATURATION_DEFAULT = 0;

export const SIDEBAR_OPACITY_MIN = 0.15;
export const SIDEBAR_OPACITY_MAX = 1;
export const SIDEBAR_OPACITY_DEFAULT = 0.72;

export const SIDEBAR_BLUR_MIN = 1;
export const SIDEBAR_BLUR_MAX = 64;
export const SIDEBAR_BLUR_DEFAULT = 24;

export const PROJECT_RAIL_WIDTH_MIN = 180;
export const PROJECT_RAIL_WIDTH_MAX = 360;
export const PROJECT_RAIL_WIDTH_DEFAULT = 200;

export const BODY_GLASS_DEFAULT = true;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readNumber(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeNumber(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // private mode / quota
  }
}

function readFlag(key: string): boolean | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return null;
    return raw === "1" || raw === "true";
  } catch {
    return null;
  }
}

function writeFlag(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // private mode / quota
  }
}

function readText(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeText(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private mode / quota
  }
}

export function loadThemeHue(): number {
  return Math.round(
    clamp(
      readNumber(THEME_HUE_KEY) ?? THEME_HUE_DEFAULT,
      THEME_HUE_MIN,
      THEME_HUE_MAX,
    ),
  );
}

export function saveThemeHue(value: number) {
  writeNumber(
    THEME_HUE_KEY,
    Math.round(clamp(value, THEME_HUE_MIN, THEME_HUE_MAX)),
  );
}

export function loadThemeSaturation(): number {
  return Math.round(
    clamp(
      readNumber(THEME_SATURATION_KEY) ?? THEME_SATURATION_DEFAULT,
      THEME_SATURATION_MIN,
      THEME_SATURATION_MAX,
    ),
  );
}

export function saveThemeSaturation(value: number) {
  writeNumber(
    THEME_SATURATION_KEY,
    Math.round(
      clamp(value, THEME_SATURATION_MIN, THEME_SATURATION_MAX),
    ),
  );
}

export function applyThemeTint(hue: number, saturation: number) {
  const nextHue = Math.round(clamp(hue, THEME_HUE_MIN, THEME_HUE_MAX));
  const nextSaturation = Math.round(
    clamp(saturation, THEME_SATURATION_MIN, THEME_SATURATION_MAX),
  );
  document.documentElement.style.setProperty("--theme-hue", String(nextHue));
  document.documentElement.style.setProperty(
    "--theme-saturation",
    `${nextSaturation}%`,
  );
  return { hue: nextHue, saturation: nextSaturation };
}

export const TYPOGRAPHY_CHANGE_EVENT = "monocode:typographychange";

function notifyTypographyChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TYPOGRAPHY_CHANGE_EVENT));
}

function isUiFontId(value: unknown): value is UiFontId {
  return UI_FONT_OPTIONS.some((option) => option.value === value);
}

function isTerminalFontId(value: unknown): value is TerminalFontId {
  return TERMINAL_FONT_OPTIONS.some((option) => option.value === value);
}

export function loadUiFont(): UiFontId {
  const raw = readText(UI_FONT_KEY);
  return isUiFontId(raw) ? raw : UI_FONT_DEFAULT;
}

export function saveUiFont(value: UiFontId) {
  writeText(UI_FONT_KEY, isUiFontId(value) ? value : UI_FONT_DEFAULT);
}

export function applyUiFont(value: UiFontId): UiFontId {
  const next = isUiFontId(value) ? value : UI_FONT_DEFAULT;
  const option = UI_FONT_OPTIONS.find((item) => item.value === next)!;
  document.documentElement.style.setProperty("--font-sans", option.family);
  notifyTypographyChange();
  return next;
}

export function loadTerminalFont(): TerminalFontId {
  const raw = readText(TERMINAL_FONT_KEY);
  return isTerminalFontId(raw) ? raw : TERMINAL_FONT_DEFAULT;
}

export function saveTerminalFont(value: TerminalFontId) {
  writeText(
    TERMINAL_FONT_KEY,
    isTerminalFontId(value) ? value : TERMINAL_FONT_DEFAULT,
  );
}

export function applyTerminalFont(value: TerminalFontId): TerminalFontId {
  const next = isTerminalFontId(value) ? value : TERMINAL_FONT_DEFAULT;
  const option = TERMINAL_FONT_OPTIONS.find((item) => item.value === next)!;
  document.documentElement.style.setProperty("--font-terminal", option.family);
  notifyTypographyChange();
  return next;
}

export function loadUiFontSize(): number {
  return Math.round(
    clamp(
      readNumber(UI_FONT_SIZE_KEY) ?? UI_FONT_SIZE_DEFAULT,
      UI_FONT_SIZE_MIN,
      UI_FONT_SIZE_MAX,
    ),
  );
}

export function saveUiFontSize(value: number) {
  writeNumber(
    UI_FONT_SIZE_KEY,
    Math.round(clamp(value, UI_FONT_SIZE_MIN, UI_FONT_SIZE_MAX)),
  );
}

export function applyUiFontSize(value: number): number {
  const next = Math.round(clamp(value, UI_FONT_SIZE_MIN, UI_FONT_SIZE_MAX));
  const scale = next / 100;
  const root = document.documentElement;
  root.style.setProperty("--ui-font-scale", String(scale));
  for (const [name, size, lineHeight] of [
    ["xs", 12, 16],
    ["sm", 14, 20],
    ["lg", 18, 28],
    ["2xl", 24, 32],
  ] as const) {
    root.style.setProperty(`--text-${name}`, `${size * scale}px`);
    root.style.setProperty(
      `--text-${name}--line-height`,
      `${lineHeight * scale}px`,
    );
  }
  for (const size of [7, 8, 10, 10.5, 11, 12, 13, 14, 15, 20]) {
    const token = String(size).replace(".", "-");
    root.style.setProperty(`--ui-font-size-${token}`, `${size * scale}px`);
  }
  notifyTypographyChange();
  return next;
}

export function loadTerminalFontSize(): number {
  return Math.round(
    clamp(
      readNumber(TERMINAL_FONT_SIZE_KEY) ?? TERMINAL_FONT_SIZE_DEFAULT,
      TERMINAL_FONT_SIZE_MIN,
      TERMINAL_FONT_SIZE_MAX,
    ),
  );
}

export function saveTerminalFontSize(value: number) {
  writeNumber(
    TERMINAL_FONT_SIZE_KEY,
    Math.round(clamp(value, TERMINAL_FONT_SIZE_MIN, TERMINAL_FONT_SIZE_MAX)),
  );
}

export function applyTerminalFontSize(value: number): number {
  const next = Math.round(
    clamp(value, TERMINAL_FONT_SIZE_MIN, TERMINAL_FONT_SIZE_MAX),
  );
  document.documentElement.style.setProperty(
    "--terminal-font-size",
    `${next}px`,
  );
  notifyTypographyChange();
  return next;
}

export function loadPopoverSurfaceOpacity(): number {
  return Math.round(
    clamp(
      readNumber(POPOVER_SURFACE_OPACITY_KEY) ??
        POPOVER_SURFACE_OPACITY_DEFAULT,
      POPOVER_SURFACE_OPACITY_MIN,
      POPOVER_SURFACE_OPACITY_MAX,
    ),
  );
}

export function savePopoverSurfaceOpacity(value: number) {
  writeNumber(
    POPOVER_SURFACE_OPACITY_KEY,
    Math.round(
      clamp(value, POPOVER_SURFACE_OPACITY_MIN, POPOVER_SURFACE_OPACITY_MAX),
    ),
  );
}

export function applyPopoverSurfaceOpacity(value: number): number {
  const next = Math.round(
    clamp(value, POPOVER_SURFACE_OPACITY_MIN, POPOVER_SURFACE_OPACITY_MAX),
  );
  document.documentElement.style.setProperty(
    "--popover-surface-opacity",
    `${next}%`,
  );
  return next;
}

export function loadPopoverBlur(): number {
  return Math.round(
    clamp(
      readNumber(POPOVER_BLUR_KEY) ?? POPOVER_BLUR_DEFAULT,
      POPOVER_BLUR_MIN,
      POPOVER_BLUR_MAX,
    ),
  );
}

export function savePopoverBlur(value: number) {
  writeNumber(
    POPOVER_BLUR_KEY,
    Math.round(clamp(value, POPOVER_BLUR_MIN, POPOVER_BLUR_MAX)),
  );
}

export function applyPopoverBlur(value: number): number {
  const next = Math.round(clamp(value, POPOVER_BLUR_MIN, POPOVER_BLUR_MAX));
  document.documentElement.style.setProperty(
    "--popover-backdrop-blur",
    `${next}px`,
  );
  return next;
}

export function loadPopoverHighlight(): number {
  return (
    Math.round(
      clamp(
        readNumber(POPOVER_HIGHLIGHT_KEY) ?? POPOVER_HIGHLIGHT_DEFAULT,
        POPOVER_HIGHLIGHT_MIN,
        POPOVER_HIGHLIGHT_MAX,
      ) / 10,
    ) * 10
  );
}

export function savePopoverHighlight(value: number) {
  writeNumber(
    POPOVER_HIGHLIGHT_KEY,
    Math.round(
      clamp(value, POPOVER_HIGHLIGHT_MIN, POPOVER_HIGHLIGHT_MAX) / 10,
    ) * 10,
  );
}

export function applyPopoverHighlight(value: number): number {
  const next =
    Math.round(
      clamp(value, POPOVER_HIGHLIGHT_MIN, POPOVER_HIGHLIGHT_MAX) / 10,
    ) * 10;
  const root = document.documentElement;
  root.style.setProperty("--popover-highlight-opacity", `${next}%`);
  root.classList.toggle("popover-highlight-invert", next >= 50);
  return next;
}

export function loadWallpaperPath(): string {
  return readText(WALLPAPER_PATH_KEY) ?? "";
}

export function saveWallpaperPath(value: string) {
  writeText(WALLPAPER_PATH_KEY, value);
}

export function loadWallpaperOpacity(): number {
  return Math.round(
    clamp(
      readNumber(WALLPAPER_OPACITY_KEY) ?? WALLPAPER_OPACITY_DEFAULT,
      WALLPAPER_OPACITY_MIN,
      WALLPAPER_OPACITY_MAX,
    ),
  );
}

export function saveWallpaperOpacity(value: number) {
  writeNumber(
    WALLPAPER_OPACITY_KEY,
    Math.round(clamp(value, WALLPAPER_OPACITY_MIN, WALLPAPER_OPACITY_MAX)),
  );
}

export function applyWallpaperOpacity(value: number): number {
  const next = Math.round(
    clamp(value, WALLPAPER_OPACITY_MIN, WALLPAPER_OPACITY_MAX),
  );
  document.documentElement.style.setProperty(
    "--app-wallpaper-opacity",
    String(next / 100),
  );
  return next;
}

let wallpaperObjectUrl: string | null = null;

function wallpaperMime(path: string): string {
  const ext = path.toLowerCase().split(".").pop();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "bmp") return "image/bmp";
  if (ext === "avif") return "image/avif";
  return "image/png";
}

export async function applyWallpaperPath(path: string): Promise<boolean> {
  const root = document.documentElement;
  if (!IS_WINDOWS || !path) {
    root.classList.remove("has-app-wallpaper");
    root.style.removeProperty("--app-wallpaper-image");
    if (wallpaperObjectUrl) URL.revokeObjectURL(wallpaperObjectUrl);
    wallpaperObjectUrl = null;
    return !path;
  }
  try {
    const data = await invoke<string>("read_wallpaper_base64", { path });
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    const nextUrl = URL.createObjectURL(
      new Blob([bytes], { type: wallpaperMime(path) }),
    );
    const previousUrl = wallpaperObjectUrl;
    wallpaperObjectUrl = nextUrl;
    root.style.setProperty("--app-wallpaper-image", `url("${nextUrl}")`);
    root.classList.add("has-app-wallpaper");
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    return true;
  } catch {
    return false;
  }
}

export function loadWindowGlassStrength(): number {
  return Math.round(
    clamp(
      readNumber(WINDOW_GLASS_STRENGTH_KEY) ?? WINDOW_GLASS_STRENGTH_DEFAULT,
      WINDOW_GLASS_STRENGTH_MIN,
      WINDOW_GLASS_STRENGTH_MAX,
    ),
  );
}

export function saveWindowGlassStrength(value: number) {
  writeNumber(
    WINDOW_GLASS_STRENGTH_KEY,
    Math.round(
      clamp(value, WINDOW_GLASS_STRENGTH_MIN, WINDOW_GLASS_STRENGTH_MAX),
    ),
  );
}

export function applyWindowGlassStrength(value: number): number {
  const next = Math.round(
    clamp(value, WINDOW_GLASS_STRENGTH_MIN, WINDOW_GLASS_STRENGTH_MAX),
  );
  const root = document.documentElement;
  root.style.setProperty(
    "--window-glass-tint-opacity",
    `${Math.round(next * 0.3)}%`,
  );
  root.style.setProperty(
    "--window-wallpaper-blur",
    `${Math.round(next * 0.36)}px`,
  );
  return next;
}
export function initAppearance() {
  document.documentElement.classList.toggle("is-mac", IS_MAC);
  document.documentElement.classList.toggle("is-windows", IS_WINDOWS);
  document.documentElement.classList.toggle("has-glass", IS_MAC || IS_WINDOWS);
  applyUiFont(loadUiFont());
  applyUiFontSize(loadUiFontSize());
  applyTerminalFont(loadTerminalFont());
  applyTerminalFontSize(loadTerminalFontSize());
  applyPopoverSurfaceOpacity(loadPopoverSurfaceOpacity());
  applyPopoverBlur(loadPopoverBlur());
  applyPopoverHighlight(loadPopoverHighlight());
  applyWallpaperOpacity(loadWallpaperOpacity());
  applyWindowGlassStrength(loadWindowGlassStrength());
  void applyWallpaperPath(loadWallpaperPath());
  applyThemeTint(loadThemeHue(), loadThemeSaturation());
  applyThemePreference(loadThemePreference());
  watchSystemColorScheme();
  applySidebarOpacity(loadSidebarOpacity());
  applySidebarBlur(loadSidebarBlur());
  applyBodyGlass(loadBodyGlass());
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "dark" || value === "light" || value === "system";
}

export function loadThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(SCHEME_KEY);
    return isThemePreference(raw) ? raw : THEME_PREFERENCE_DEFAULT;
  } catch {
    return THEME_PREFERENCE_DEFAULT;
  }
}

export function saveThemePreference(value: ThemePreference) {
  try {
    localStorage.setItem(SCHEME_KEY, value);
  } catch {
    // private mode / quota
  }
}

function systemQuery(): MediaQueryList | null {
  if (typeof window === "undefined" || !window.matchMedia) return null;
  return window.matchMedia("(prefers-color-scheme: light)");
}

function systemColorScheme(): ColorScheme {
  return systemQuery()?.matches ? "light" : "dark";
}

export function resolveColorScheme(value: ThemePreference): ColorScheme {
  return value === "system" ? systemColorScheme() : value;
}

export function isLightScheme(): boolean {
  return document.documentElement.classList.contains("theme-light");
}

export function applyThemePreference(value: ThemePreference): ColorScheme {
  const next = resolveColorScheme(value);
  document.documentElement.classList.toggle("theme-light", next === "light");
  window.dispatchEvent(
    new CustomEvent<ColorScheme>(SCHEME_CHANGE_EVENT, { detail: next }),
  );
  return next;
}

/** Keeps the "system" preference in sync when the OS flips appearance. */
export function watchSystemColorScheme() {
  const query = systemQuery();
  if (!query) return;
  query.addEventListener("change", () => {
    const preference = loadThemePreference();
    if (preference === "system") applyThemePreference(preference);
  });
}

export function loadSidebarOpacity(): number {
  return clamp(
    readNumber(OPACITY_KEY) ?? SIDEBAR_OPACITY_DEFAULT,
    SIDEBAR_OPACITY_MIN,
    SIDEBAR_OPACITY_MAX,
  );
}

export function saveSidebarOpacity(value: number) {
  writeNumber(
    OPACITY_KEY,
    clamp(value, SIDEBAR_OPACITY_MIN, SIDEBAR_OPACITY_MAX),
  );
}

export function applySidebarOpacity(value: number) {
  const next = clamp(value, SIDEBAR_OPACITY_MIN, SIDEBAR_OPACITY_MAX);
  document.documentElement.style.setProperty("--sidebar-opacity", String(next));
  return next;
}

export function loadSidebarBlur(): number {
  return Math.round(
    clamp(
      readNumber(BLUR_KEY) ?? SIDEBAR_BLUR_DEFAULT,
      SIDEBAR_BLUR_MIN,
      SIDEBAR_BLUR_MAX,
    ),
  );
}

export function saveSidebarBlur(value: number) {
  writeNumber(
    BLUR_KEY,
    Math.round(clamp(value, SIDEBAR_BLUR_MIN, SIDEBAR_BLUR_MAX)),
  );
}

export function applySidebarBlur(value: number) {
  const next = Math.round(
    clamp(value, SIDEBAR_BLUR_MIN, SIDEBAR_BLUR_MAX),
  );
  document.documentElement.style.setProperty("--window-blur-radius", `${next}px`);
  if (IS_MAC) void invoke("set_window_background_blur", { radius: next });
  return next;
}

export function loadBodyGlass(): boolean {
  return readFlag(BODY_KEY) ?? BODY_GLASS_DEFAULT;
}

export function saveBodyGlass(value: boolean) {
  writeFlag(BODY_KEY, value);
}

export function applyBodyGlass(value: boolean) {
  document.documentElement.classList.toggle("glass-body", value);
  return value;
}

function isSidebarTabId(value: unknown): value is SidebarTabId {
  return (
    value === "files" ||
    value === "sessions" ||
    value === "changes" ||
    value === "inbox"
  );
}

export function loadProjectRailOpen(): boolean {
  return readFlag(PROJECT_RAIL_OPEN_KEY) ?? true;
}

export function saveProjectRailOpen(value: boolean) {
  writeFlag(PROJECT_RAIL_OPEN_KEY, value);
}

export function loadSidebarTabOrder(): SidebarTabId[] {
  try {
    const raw = localStorage.getItem(SIDEBAR_TAB_ORDER_KEY);
    if (!raw) return [...DEFAULT_SIDEBAR_TAB_ORDER];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_SIDEBAR_TAB_ORDER];
    const next = parsed.filter(isSidebarTabId);
    for (const id of DEFAULT_SIDEBAR_TAB_ORDER) {
      if (!next.includes(id)) next.push(id);
    }
    return next.length === DEFAULT_SIDEBAR_TAB_ORDER.length
      ? next
      : [...DEFAULT_SIDEBAR_TAB_ORDER];
  } catch {
    return [...DEFAULT_SIDEBAR_TAB_ORDER];
  }
}

export function saveSidebarTabOrder(order: SidebarTabId[]) {
  try {
    localStorage.setItem(SIDEBAR_TAB_ORDER_KEY, JSON.stringify(order));
  } catch {
    // private mode / quota
  }
}

export function loadProjectRailWidth(): number {
  return Math.round(
    clamp(
      readNumber(PROJECT_RAIL_WIDTH_KEY) ?? PROJECT_RAIL_WIDTH_DEFAULT,
      PROJECT_RAIL_WIDTH_MIN,
      PROJECT_RAIL_WIDTH_MAX,
    ),
  );
}

export function saveProjectRailWidth(value: number) {
  writeNumber(
    PROJECT_RAIL_WIDTH_KEY,
    Math.round(
      clamp(value, PROJECT_RAIL_WIDTH_MIN, PROJECT_RAIL_WIDTH_MAX),
    ),
  );
}

function isTranscriptLayout(value: unknown): value is TranscriptLayout {
  return value === "full" || value === "chat";
}

export function loadTranscriptLayout(): TranscriptLayout {
  try {
    const raw = localStorage.getItem(TRANSCRIPT_LAYOUT_KEY);
    return isTranscriptLayout(raw) ? raw : TRANSCRIPT_LAYOUT_DEFAULT;
  } catch {
    return TRANSCRIPT_LAYOUT_DEFAULT;
  }
}

export function saveTranscriptLayout(value: TranscriptLayout) {
  const next = isTranscriptLayout(value) ? value : TRANSCRIPT_LAYOUT_DEFAULT;
  try {
    localStorage.setItem(TRANSCRIPT_LAYOUT_KEY, next);
  } catch {
    // private mode / quota
  }
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<TranscriptLayout>(TRANSCRIPT_LAYOUT_CHANGE_EVENT, {
      detail: next,
    }),
  );
}

export function loadTranscriptAnchor(): boolean {
  return readFlag(TRANSCRIPT_ANCHOR_KEY) ?? TRANSCRIPT_ANCHOR_DEFAULT;
}

export function saveTranscriptAnchor(value: boolean) {
  writeFlag(TRANSCRIPT_ANCHOR_KEY, value);
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<boolean>(TRANSCRIPT_ANCHOR_CHANGE_EVENT, {
      detail: value,
    }),
  );
}
