// @vitest-environment happy-dom

import { act, createElement, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsView } from "./SettingsView";
import {
  applyThemePreference,
  applyWallpaperPath,
  saveWallpaperHalftone,
  saveWallpaperPath,
  subscribeWallpaperHalftoneError,
} from "../model/appearance";
import { type SettingsSectionId } from "../model/settings";

type InvokeFunction = (
  command: string,
  args?: Record<string, unknown>,
) => Promise<unknown>;
type DialogOpenFunction = (
  options?: unknown,
) => Promise<string | string[] | null>;
type PrepareEffectFunction = (
  sourceKey: string,
  source: string,
  effect: string,
  light: boolean,
) => Promise<Blob>;

const mocks = vi.hoisted(() => ({
  invoke: vi.fn<InvokeFunction>(async () => undefined),
  open: vi.fn<DialogOpenFunction>(async () => null),
  ask: vi.fn(async () => true),
  openUrl: vi.fn(async () => undefined),
  prepareEffect: vi.fn<PrepareEffectFunction>(
    async () => new Blob(["halftone"]),
  ),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mocks.invoke,
  convertFileSrc: (path: string) => path,
}));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    isMaximized: async () => false,
    onResized: async () => () => {},
  }),
}));
vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: mocks.openUrl }));
vi.mock("@tauri-apps/plugin-dialog", () => ({
  ask: mocks.ask,
  open: mocks.open,
}));
vi.mock("../../../platform/tauri/platform", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../platform/tauri/platform")
  >()),
  HAS_NATIVE_GLASS: false,
  IS_MAC: false,
  IS_WIN: true,
  IS_WINDOWS: true,
}));
vi.mock("../model/newThreadBackgroundEffects", () => ({
  applyPreparedNewThreadBackground: vi.fn(),
  clearPreparedNewThreadBackground: vi.fn(),
  prepareNewThreadBackgroundEffect: mocks.prepareEffect,
}));

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((finish) => {
    resolve = finish;
  });
  return { promise, resolve };
}

let container: HTMLDivElement;
let root: Root;
let onSelectSection: ReturnType<typeof vi.fn>;
const NativeURL = URL;
let nextObjectUrl = 0;
const liveObjectUrls = new Set<string>();
const revokedObjectUrls: string[] = [];

function mockLocalStorage(): void {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  });
}

async function render(section: SettingsSectionId): Promise<void> {
  await act(async () =>
    root.render(
      createElement(SettingsView, {
        section,
        cwd: "/repo",
        sessions: [],
        onClose: vi.fn(),
        onSelectSection,
        onOpenSession: vi.fn(),
        onArchiveSession: vi.fn(),
        onDeleteSession: vi.fn(),
        onOpenWhatsNew: vi.fn(),
      } satisfies ComponentProps<typeof SettingsView>),
    ),
  );
}

function wallpaperRow(): HTMLElement {
  return container.querySelector<HTMLElement>(
    '[data-setting-id="windows-wallpaper"]',
  )!;
}

function invokeCalls(command: string): unknown[][] {
  return mocks.invoke.mock.calls.filter(([called]) => called === command);
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mockLocalStorage();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  onSelectSection = vi.fn();
  nextObjectUrl = 0;
  liveObjectUrls.clear();
  revokedObjectUrls.length = 0;
  vi.stubGlobal(
    "URL",
    class TestURL extends NativeURL {
      static createObjectURL(): string {
        nextObjectUrl += 1;
        const url = `blob:settings-wallpaper-${nextObjectUrl}`;
        liveObjectUrls.add(url);
        return url;
      }

      static revokeObjectURL(url: string): void {
        liveObjectUrls.delete(url);
        revokedObjectUrls.push(url);
      }
    },
  );
  mocks.invoke.mockReset();
  mocks.invoke.mockImplementation(async (command) =>
    command === "read_wallpaper_base64" ? "AQID" : undefined,
  );
  mocks.open.mockReset();
  mocks.open.mockResolvedValue(null);
  mocks.ask.mockReset();
  mocks.ask.mockResolvedValue(true);
  mocks.openUrl.mockReset();
  mocks.openUrl.mockResolvedValue(undefined);
  mocks.prepareEffect.mockReset();
  mocks.prepareEffect.mockResolvedValue(new Blob(["halftone"]));
});

afterEach(async () => {
  await act(async () => root.unmount());
  await applyWallpaperPath("");
  container.remove();
  localStorage.clear();
  document.documentElement.classList.remove("has-app-wallpaper", "theme-light");
  document.documentElement.style.removeProperty("--app-wallpaper-image");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("wallpaper settings races", () => {
  it("keeps a successful choice when a later picker is canceled and restores it after reinitialization", async () => {
    const pendingRender = deferred<Blob>();
    const managedPath = "C:/AppData/wallpaper/wallpaper-a.png";
    saveWallpaperHalftone(true);
    mocks.open
      .mockResolvedValueOnce("C:/Pictures/a.png")
      .mockResolvedValueOnce(null);
    mocks.invoke.mockImplementation(async (command) => {
      if (command === "persist_wallpaper") return managedPath;
      return command === "read_wallpaper_base64" ? "AQID" : undefined;
    });
    mocks.prepareEffect.mockReturnValueOnce(pendingRender.promise);
    await render("appearance");
    const changeButton = wallpaperRow().querySelector<HTMLButtonElement>(
      "button",
    )!;

    await act(async () => changeButton.click());
    await vi.waitFor(() => expect(mocks.prepareEffect).toHaveBeenCalledTimes(1));
    await act(async () => changeButton.click());
    await act(async () => {
      pendingRender.resolve(new Blob(["wallpaper a halftone"]));
      await Promise.resolve();
    });

    expect(localStorage.getItem("monocode.wallpaperPath")).toBe(managedPath);
    expect(wallpaperRow().querySelectorAll("button")).toHaveLength(2);
    expect(
      container.querySelector<HTMLButtonElement>(
        '[role="switch"][aria-label="Halftone wallpaper"]',
      )?.disabled,
    ).toBe(false);
    const displayedCss = document.documentElement.style.getPropertyValue(
      "--app-wallpaper-image",
    );
    expect(displayedCss).toBe('url("blob:settings-wallpaper-2")');
    expect(liveObjectUrls.has("blob:settings-wallpaper-2")).toBe(true);
    expect(revokedObjectUrls).not.toContain("blob:settings-wallpaper-2");

    await act(async () => root.unmount());
    root = createRoot(container);
    await act(async () => {
      await applyWallpaperPath(managedPath, false);
    });
    expect(mocks.invoke).toHaveBeenCalledWith("read_wallpaper_base64", {
      path: managedPath,
    });
    expect(localStorage.getItem("monocode.wallpaperPath")).toBe(managedPath);
    expect(
      document.documentElement.style.getPropertyValue("--app-wallpaper-image"),
    ).toBe('url("blob:settings-wallpaper-3")');
    await render("appearance");
    expect(wallpaperRow().querySelectorAll("button")).toHaveLength(2);
    expect(
      container.querySelector<HTMLButtonElement>(
        '[role="switch"][aria-label="Halftone wallpaper"]',
      )?.disabled,
    ).toBe(false);
  });

  it("lets a newer off choice win while the previous render is still pending", async () => {
    saveWallpaperPath("C:/Pictures/current.png");
    await applyWallpaperPath("C:/Pictures/current.png", false);
    const slowRender = deferred<Blob>();
    mocks.prepareEffect.mockReturnValueOnce(slowRender.promise);
    await render("appearance");
    const toggle = container.querySelector<HTMLButtonElement>(
      '[role="switch"][aria-label="Halftone wallpaper"]',
    )!;

    await act(async () => toggle.click());
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(toggle.disabled).toBe(false);
    expect(container.textContent).toContain("Applying effect...");

    await act(async () => toggle.click());
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(
      document.documentElement.style.getPropertyValue("--app-wallpaper-image"),
    ).toBe('url("blob:settings-wallpaper-1")');

    await act(async () => {
      slowRender.resolve(new Blob(["late halftone"]));
      await Promise.resolve();
    });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(
      document.documentElement.style.getPropertyValue("--app-wallpaper-image"),
    ).toBe('url("blob:settings-wallpaper-1")');
  });

  it("keeps the last selected image when an earlier persist finishes late", async () => {
    const firstPersist = deferred<string>();
    const lastPersist = deferred<string>();
    mocks.open
      .mockResolvedValueOnce("C:/Pictures/first.png")
      .mockResolvedValueOnce("C:/Pictures/last.png");
    mocks.invoke.mockImplementation(async (command, args) => {
      if (command === "persist_wallpaper") {
        return args?.path === "C:/Pictures/first.png"
          ? firstPersist.promise
          : lastPersist.promise;
      }
      return command === "read_wallpaper_base64" ? "AQID" : undefined;
    });
    await render("appearance");
    const changeButton = wallpaperRow().querySelector<HTMLButtonElement>(
      "button",
    )!;

    await act(async () => changeButton.click());
    await vi.waitFor(() =>
      expect(invokeCalls("persist_wallpaper")).toHaveLength(1),
    );
    await act(async () => changeButton.click());
    expect(invokeCalls("persist_wallpaper")).toHaveLength(1);

    await act(async () => {
      firstPersist.resolve("C:/AppData/wallpaper/first.png");
      await vi.waitFor(() =>
        expect(invokeCalls("persist_wallpaper")).toHaveLength(2),
      );
    });
    expect(invokeCalls("persist_wallpaper")[1]?.[1]).toEqual({
      path: "C:/Pictures/last.png",
    });

    await act(async () => {
      lastPersist.resolve("C:/AppData/wallpaper/last.png");
      await vi.waitFor(() =>
        expect(localStorage.getItem("monocode.wallpaperPath")).toBe(
          "C:/AppData/wallpaper/last.png",
        ),
      );
    });
    expect(invokeCalls("read_wallpaper_base64")).toEqual([
      [
        "read_wallpaper_base64",
        { path: "C:/AppData/wallpaper/first.png" },
      ],
      ["read_wallpaper_base64", { path: "C:/AppData/wallpaper/last.png" }],
    ]);
    expect(
      document.documentElement.style.getPropertyValue("--app-wallpaper-image"),
    ).toBe('url("blob:settings-wallpaper-2")');
  });

  it.each(["persistence", "read", "render"] as const)(
    "keeps the pending successful choice coherent when a newer %s fails",
    async (failureStage) => {
      const pendingRender = deferred<Blob>();
      const existingPath = "C:/AppData/wallpaper/existing.png";
      const firstManagedPath = "C:/AppData/wallpaper/first.png";
      const secondManagedPath = "C:/AppData/wallpaper/second.png";
      saveWallpaperPath(existingPath);
      saveWallpaperHalftone(true);
      await applyWallpaperPath(existingPath, true);
      mocks.open
        .mockResolvedValueOnce("C:/Pictures/first.png")
        .mockResolvedValueOnce("C:/Pictures/second.png");
      mocks.invoke.mockImplementation(async (command, args) => {
        if (command === "persist_wallpaper") {
          if (
            failureStage === "persistence" &&
            args?.path === "C:/Pictures/second.png"
          ) {
            throw new Error("managed copy failed");
          }
          return args?.path === "C:/Pictures/first.png"
            ? firstManagedPath
            : secondManagedPath;
        }
        if (
          command === "read_wallpaper_base64" &&
          failureStage === "read" &&
          args?.path === secondManagedPath
        ) {
          throw new Error("image read failed");
        }
        return command === "read_wallpaper_base64" ? "AQID" : undefined;
      });
      mocks.prepareEffect.mockImplementation((sourceKey) => {
        if (sourceKey.includes("first.png")) return pendingRender.promise;
        if (failureStage === "render" && sourceKey.includes("second.png")) {
          return Promise.reject(new Error("Halftone failed"));
        }
        return Promise.resolve(new Blob(["halftone"]));
      });
      await render("appearance");
      const changeButton = wallpaperRow().querySelector<HTMLButtonElement>(
        "button",
      )!;

      await act(async () => changeButton.click());
      await vi.waitFor(() =>
        expect(mocks.prepareEffect).toHaveBeenCalledWith(
          expect.stringContaining("first.png"),
          expect.any(String),
          "halftone",
          false,
        ),
      );
      await act(async () => changeButton.click());
      await vi.waitFor(() =>
        expect(container.textContent).toMatch(
          failureStage === "persistence"
            ? "Wallpaper could not be saved."
            : failureStage === "read"
              ? "Wallpaper could not be loaded."
              : "Wallpaper could not be applied.",
        ),
      );

      expect(localStorage.getItem("monocode.wallpaperPath")).toBe(existingPath);
      expect(
        document.documentElement.style.getPropertyValue(
          "--app-wallpaper-image",
        ),
      ).toBe('url("blob:settings-wallpaper-2")');
      expect(liveObjectUrls.has("blob:settings-wallpaper-2")).toBe(true);
      expect(
        container.querySelector<HTMLButtonElement>(
          '[role="switch"][aria-label="Halftone wallpaper"]',
        )?.disabled,
      ).toBe(false);

      await act(async () => {
        pendingRender.resolve(new Blob(["first halftone"]));
        await Promise.resolve();
      });

      expect(localStorage.getItem("monocode.wallpaperPath")).toBe(
        firstManagedPath,
      );
      expect(container.textContent).toContain(
        failureStage === "persistence"
          ? "Wallpaper could not be saved."
          : failureStage === "read"
            ? "Wallpaper could not be loaded."
            : "Wallpaper could not be applied.",
      );
      const displayUrl = document.documentElement.style
        .getPropertyValue("--app-wallpaper-image")
        .match(/blob:[^")]+/)?.[0];
      expect(displayUrl).toBeDefined();
      expect(liveObjectUrls.has(displayUrl!)).toBe(true);
      expect(revokedObjectUrls).not.toContain(displayUrl);
      expect(
        container.querySelector<HTMLButtonElement>(
          '[role="switch"][aria-label="Halftone wallpaper"]',
        )?.disabled,
      ).toBe(false);
      await vi.waitFor(() =>
        expect(mocks.invoke).toHaveBeenCalledWith("retain_managed_wallpaper", {
          path: firstManagedPath,
        }),
      );
    },
  );

  it("does not let a slower earlier image restore itself after a newer success", async () => {
    const pendingRender = deferred<Blob>();
    const firstManagedPath = "C:/AppData/wallpaper/first.png";
    const secondManagedPath = "C:/AppData/wallpaper/second.png";
    saveWallpaperHalftone(true);
    mocks.open
      .mockResolvedValueOnce("C:/Pictures/first.png")
      .mockResolvedValueOnce("C:/Pictures/second.png");
    mocks.invoke.mockImplementation(async (command, args) => {
      if (command === "persist_wallpaper") {
        return args?.path === "C:/Pictures/first.png"
          ? firstManagedPath
          : secondManagedPath;
      }
      return command === "read_wallpaper_base64" ? "AQID" : undefined;
    });
    mocks.prepareEffect.mockImplementation((sourceKey) =>
      sourceKey.includes("first.png")
        ? pendingRender.promise
        : Promise.resolve(new Blob(["second halftone"])),
    );
    await render("appearance");
    const changeButton = wallpaperRow().querySelector<HTMLButtonElement>(
      "button",
    )!;

    await act(async () => changeButton.click());
    await vi.waitFor(() => expect(mocks.prepareEffect).toHaveBeenCalledTimes(1));
    await act(async () => changeButton.click());
    await vi.waitFor(() =>
      expect(localStorage.getItem("monocode.wallpaperPath")).toBe(
        secondManagedPath,
      ),
    );
    const secondDisplay = document.documentElement.style.getPropertyValue(
      "--app-wallpaper-image",
    );
    const secondUrl = secondDisplay.match(/blob:[^")]+/)?.[0];
    expect(secondUrl).toBeDefined();
    expect(liveObjectUrls.has(secondUrl!)).toBe(true);
    expect(
      container.querySelector<HTMLButtonElement>(
        '[role="switch"][aria-label="Halftone wallpaper"]',
      )?.disabled,
    ).toBe(false);

    await act(async () => {
      pendingRender.resolve(new Blob(["late first halftone"]));
      await Promise.resolve();
    });

    expect(localStorage.getItem("monocode.wallpaperPath")).toBe(
      secondManagedPath,
    );
    expect(
      document.documentElement.style.getPropertyValue("--app-wallpaper-image"),
    ).toBe(secondDisplay);
    expect(liveObjectUrls.has(secondUrl!)).toBe(true);
    expect(revokedObjectUrls).not.toContain(secondUrl);
  });

  it("does not let a pending image restore wallpaper after Remove", async () => {
    const pendingRender = deferred<Blob>();
    const existingPath = "C:/AppData/wallpaper/existing.png";
    saveWallpaperPath(existingPath);
    saveWallpaperHalftone(true);
    await applyWallpaperPath(existingPath, false);
    mocks.open.mockResolvedValueOnce("C:/Pictures/pending.png");
    mocks.invoke.mockImplementation(async (command) =>
      command === "persist_wallpaper"
        ? "C:/AppData/wallpaper/pending.png"
        : command === "read_wallpaper_base64"
          ? "AQID"
          : undefined,
    );
    mocks.prepareEffect.mockReturnValueOnce(pendingRender.promise);
    await render("appearance");
    const row = wallpaperRow();

    await act(async () =>
      row.querySelector<HTMLButtonElement>("button")!.click(),
    );
    await vi.waitFor(() => expect(mocks.prepareEffect).toHaveBeenCalledTimes(1));
    await act(async () => {
      Array.from(row.querySelectorAll<HTMLButtonElement>("button"))
        .find((button) => button.textContent?.trim() === "Remove")!
        .click();
    });
    expect(localStorage.getItem("monocode.wallpaperPath")).toBe("");
    expect(
      document.documentElement.style.getPropertyValue("--app-wallpaper-image"),
    ).toBe("");

    await act(async () => {
      pendingRender.resolve(new Blob(["late wallpaper"]));
      await Promise.resolve();
    });

    expect(localStorage.getItem("monocode.wallpaperPath")).toBe("");
    expect(
      document.documentElement.style.getPropertyValue("--app-wallpaper-image"),
    ).toBe("");
    expect(
      document.documentElement.classList.contains("has-app-wallpaper"),
    ).toBe(false);
    expect(liveObjectUrls.size).toBe(0);
    expect(
      container.querySelector<HTMLButtonElement>(
        '[role="switch"][aria-label="Halftone wallpaper"]',
      )?.disabled,
    ).toBe(true);
    expect(invokeCalls("clear_managed_wallpaper")).toHaveLength(1);
    await vi.waitFor(() =>
      expect(mocks.invoke).toHaveBeenCalledWith("retain_managed_wallpaper", {
        path: null,
      }),
    );
  });

  it("keeps Remove as the final managed-file operation during a pending persist", async () => {
    const pendingPersist = deferred<string>();
    localStorage.setItem("monocode.wallpaperPath", "C:/AppData/wallpaper/old.png");
    mocks.open.mockResolvedValueOnce("C:/Pictures/next.png");
    mocks.invoke.mockImplementation(async (command) => {
      if (command === "persist_wallpaper") return pendingPersist.promise;
      return command === "read_wallpaper_base64" ? "AQID" : undefined;
    });
    await render("appearance");
    const row = wallpaperRow();
    const changeButton = row.querySelector<HTMLButtonElement>("button")!;

    await act(async () => changeButton.click());
    await vi.waitFor(() =>
      expect(invokeCalls("persist_wallpaper")).toHaveLength(1),
    );
    await act(async () => {
      Array.from(row.querySelectorAll<HTMLButtonElement>("button"))
        .find((button) => button.textContent?.trim() === "Remove")!
        .click();
    });
    expect(localStorage.getItem("monocode.wallpaperPath")).toBe("");
    expect(invokeCalls("clear_managed_wallpaper")).toHaveLength(0);

    await act(async () => {
      pendingPersist.resolve("C:/AppData/wallpaper/next.png");
      await vi.waitFor(() =>
        expect(invokeCalls("clear_managed_wallpaper")).toHaveLength(1),
      );
    });

    expect(invokeCalls("read_wallpaper_base64")).toHaveLength(0);
    expect(invokeCalls("clear_managed_wallpaper")).toHaveLength(1);
    expect(localStorage.getItem("monocode.wallpaperPath")).toBe("");
    expect(
      document.documentElement.style.getPropertyValue("--app-wallpaper-image"),
    ).toBe("");
  });

  it("shows Settings error when a theme refresh cannot render Halftone", async () => {
    await applyWallpaperPath("C:/Pictures/current.png", false);
    saveWallpaperPath("C:/Pictures/current.png");
    saveWallpaperHalftone(true);
    mocks.prepareEffect.mockRejectedValue(new Error("worker failed"));
    let reportedError: string | null = null;
    const unsubscribe = subscribeWallpaperHalftoneError((error) => {
      reportedError = error;
    });
    await render("appearance");

    await act(async () => {
      applyThemePreference("light");
      expect(mocks.prepareEffect).toHaveBeenCalled();
    });
    await vi.waitFor(() =>
      expect(reportedError).toBe("Halftone could not be applied."),
    );
    await vi.waitFor(() =>
      expect(container.textContent).toContain("Halftone could not be applied."),
    );
    unsubscribe();

    expect(container.textContent).toContain("Showing the original wallpaper.");
    expect(
      document.documentElement.style.getPropertyValue("--app-wallpaper-image"),
    ).toBe('url("blob:settings-wallpaper-1")');
  });
});
