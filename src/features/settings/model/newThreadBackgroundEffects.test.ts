// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import tauriConfig from "../../../../src-tauri/tauri.conf.json";
import {
  applyPreparedNewThreadBackground,
  clearPreparedNewThreadBackground,
  prepareNewThreadBackgroundEffect,
} from "./newThreadBackgroundEffects";

afterEach(() => {
  clearPreparedNewThreadBackground();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("new-thread background effects", () => {
  it("allows wallpaper blob URLs to be read under both Tauri CSPs", () => {
    for (const policy of [
      tauriConfig.app.security.csp,
      tauriConfig.app.security.devCsp,
    ]) {
      const connectSources = policy
        .split(";")
        .map((directive) => directive.trim())
        .find((directive) => directive.startsWith("connect-src "))
        ?.split(/\s+/);
      expect(connectSources).toContain("blob:");
    }
  });

  it("uses the original asset directly for None so animation is preserved", async () => {
    const fetch = vi.fn();
    const worker = vi.fn(() => {
      throw new Error("None must not start a worker");
    });
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("Worker", worker);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });

    await applyPreparedNewThreadBackground(
      "/background.gif?v=101",
      "asset://localhost/background.gif?v=101",
      "none",
      false,
    );

    expect(fetch).not.toHaveBeenCalled();
    expect(worker).not.toHaveBeenCalled();
    expect(
      document.documentElement.style.getPropertyValue(
        "--chat-background-image",
      ),
    ).toContain("background.gif?v=101");
    expect(document.documentElement.classList).toContain(
      "chat-background-effect-ready",
    );
  });

  it("drops rejected source promises so transient failures can retry", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("temporary failure"));
    vi.stubGlobal("fetch", fetch);
    const sourceKey = `/background.png?v=${Date.now()}`;

    await expect(
      prepareNewThreadBackgroundEffect(
        sourceKey,
        "asset://localhost/background.png",
        "dither",
        false,
      ),
    ).rejects.toThrow("temporary failure");
    await expect(
      prepareNewThreadBackgroundEffect(
        sourceKey,
        "asset://localhost/background.png",
        "dither",
        false,
      ),
    ).rejects.toThrow("temporary failure");

    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
