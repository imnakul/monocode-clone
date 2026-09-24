// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { applyWallpaperHalftone, applyWallpaperPath } from "./appearance";
import { prepareNewThreadBackgroundEffect } from "./newThreadBackgroundEffects";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async () => "AQID"),
  convertFileSrc: (path: string) => path,
}));
vi.mock("../../../platform/tauri/platform", () => ({
  HAS_NATIVE_GLASS: false,
  IS_MAC: false,
  IS_WINDOWS: true,
}));
vi.mock("./newThreadBackgroundEffects", () => ({
  applyPreparedNewThreadBackground: vi.fn(),
  clearPreparedNewThreadBackground: vi.fn(),
  prepareNewThreadBackgroundEffect: vi.fn(async () => new Blob(["halftone"])),
}));

const NativeURL = URL;
let nextObjectUrl = 0;
const revokedUrls: string[] = [];

beforeEach(() => {
  nextObjectUrl = 0;
  revokedUrls.length = 0;
  vi.stubGlobal("URL", class TestURL extends NativeURL {
    static createObjectURL() {
      nextObjectUrl += 1;
      return `blob:wallpaper-${nextObjectUrl}`;
    }

    static revokeObjectURL(url: string) {
      revokedUrls.push(url);
    }
  });
  document.documentElement.style.setProperty(
    "--chat-background-image",
    'url("blob:chat-background")',
  );
  vi.mocked(invoke).mockResolvedValue("AQID");
  vi.mocked(prepareNewThreadBackgroundEffect).mockResolvedValue(
    new Blob(["halftone"]),
  );
});

afterEach(async () => {
  await applyWallpaperPath("");
  document.documentElement.classList.remove("has-app-wallpaper", "theme-light");
  document.documentElement.style.removeProperty("--app-wallpaper-image");
  document.documentElement.style.removeProperty("--chat-background-image");
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("wallpaper Halftone", () => {
  it("uses an independent wallpaper URL and the shared Halftone renderer", async () => {
    const result = await applyWallpaperPath("C:/Pictures/wallpaper.png", true);

    expect(result).toEqual({ success: true });
    expect(prepareNewThreadBackgroundEffect).toHaveBeenCalledWith(
      expect.stringContaining("C:/Pictures/wallpaper.png"),
      "blob:wallpaper-1",
      "halftone",
      false,
    );
    expect(
      document.documentElement.style.getPropertyValue("--app-wallpaper-image"),
    ).toBe('url("blob:wallpaper-2")');
    expect(
      document.documentElement.style.getPropertyValue("--chat-background-image"),
    ).toBe('url("blob:chat-background")');
  });

  it("shows the original wallpaper when Halftone rendering fails", async () => {
    vi.mocked(prepareNewThreadBackgroundEffect).mockRejectedValue(
      new Error("worker failed"),
    );

    const result = await applyWallpaperPath("C:/Pictures/wallpaper.png", true);

    expect(result).toEqual({ success: true, effectError: "worker failed" });
    expect(
      document.documentElement.style.getPropertyValue("--app-wallpaper-image"),
    ).toBe('url("blob:wallpaper-1")');
    expect(document.documentElement.classList.contains("has-app-wallpaper")).toBe(
      true,
    );
  });

  it("restores the source image when Halftone is turned off", async () => {
    await applyWallpaperPath("C:/Pictures/wallpaper.png", true);
    await applyWallpaperHalftone(false);

    expect(
      document.documentElement.style.getPropertyValue("--app-wallpaper-image"),
    ).toBe('url("blob:wallpaper-1")');
    expect(revokedUrls).toContain("blob:wallpaper-2");
  });

  it("ignores a late Halftone render after a newer wallpaper is selected", async () => {
    let finishOldRender: ((blob: Blob) => void) | undefined;
    vi.mocked(prepareNewThreadBackgroundEffect).mockImplementation(
      (sourceKey) =>
        sourceKey.includes("first.png")
          ? new Promise<Blob>((resolve) => {
              finishOldRender = resolve;
            })
          : Promise.resolve(new Blob(["halftone"])),
    );

    const oldRequest = applyWallpaperPath("C:/Pictures/first.png", true);
    await vi.waitFor(() =>
      expect(prepareNewThreadBackgroundEffect).toHaveBeenCalledTimes(1),
    );
    await applyWallpaperPath("C:/Pictures/second.png", false);
    finishOldRender?.(new Blob(["late result"]));

    expect(await oldRequest).toEqual({ success: true, stale: true });
    expect(
      document.documentElement.style.getPropertyValue("--app-wallpaper-image"),
    ).toBe('url("blob:wallpaper-2")');
  });

  it("keeps the visible wallpaper URL alive when a newer image read fails", async () => {
    await applyWallpaperPath("C:/Pictures/existing.png", true);
    const visibleUrl = "blob:wallpaper-2";
    let finishNewRender: ((blob: Blob) => void) | undefined;
    vi.mocked(prepareNewThreadBackgroundEffect).mockImplementation(
      (sourceKey) =>
        sourceKey.includes("pending.png")
          ? new Promise<Blob>((resolve) => {
              finishNewRender = resolve;
            })
          : Promise.resolve(new Blob(["halftone"])),
    );
    const pendingWallpaper = applyWallpaperPath(
      "C:/Pictures/pending.png",
      true,
    );
    await vi.waitFor(() => expect(finishNewRender).toBeTypeOf("function"));

    vi.mocked(invoke).mockImplementation(async (command, args) => {
      if (
        command === "read_wallpaper_base64" &&
        args?.path === "C:/Pictures/missing.png"
      ) {
        throw new Error("wallpaper read failed");
      }
      return "AQID";
    });
    const failedRead = await applyWallpaperPath(
      "C:/Pictures/missing.png",
      true,
    );
    finishNewRender?.(new Blob(["late halftone"]));

    expect(failedRead.success).toBe(false);
    expect(await pendingWallpaper).toEqual({ success: true, stale: true });
    expect(
      document.documentElement.style.getPropertyValue("--app-wallpaper-image"),
    ).toBe(`url("${visibleUrl}")`);
    expect(revokedUrls).not.toContain(visibleUrl);
  });

  it("lets a newer off choice win while an older Halftone render is slow", async () => {
    await applyWallpaperPath("C:/Pictures/wallpaper.png", false);
    let finishRender: ((blob: Blob) => void) | undefined;
    vi.mocked(prepareNewThreadBackgroundEffect).mockImplementation(
      () =>
        new Promise<Blob>((resolve) => {
          finishRender = resolve;
        }),
    );
    const slowEnable = applyWallpaperHalftone(true);
    await vi.waitFor(() => expect(finishRender).toBeTypeOf("function"));

    const latestDisable = await applyWallpaperHalftone(false);
    finishRender?.(new Blob(["late halftone"]));

    expect(latestDisable).toEqual({ success: true });
    expect(await slowEnable).toEqual({ success: true, stale: true });
    expect(
      document.documentElement.style.getPropertyValue("--app-wallpaper-image"),
    ).toBe('url("blob:wallpaper-1")');
    expect(
      document.documentElement.style.getPropertyValue("--chat-background-image"),
    ).toBe('url("blob:chat-background")');
  });
});
