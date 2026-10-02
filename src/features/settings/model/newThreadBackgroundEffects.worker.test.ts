import { afterEach, describe, expect, it, vi } from "vitest";
import { hazeWallpaperPixels } from "./wallpaperHaze";

describe("wallpaper worker effect routing", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("routes Haze through the Haze renderer instead of the scanline fallback", async () => {
    vi.stubGlobal("self", { postMessage: vi.fn() });
    const { renderEffectPixels } =
      await import("./newThreadBackgroundEffects.worker");
    const width = 8;
    const height = 12;
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        pixels[offset] = x % 2 === 0 ? 240 : 10;
        pixels[offset + 1] = y * 17;
        pixels[offset + 2] = 90;
        pixels[offset + 3] = 255;
      }
    }
    const source = {
      width,
      height,
      pixels,
      luma: new Uint8Array(width * height),
    };

    const rendered = renderEffectPixels(source, "gradient-blur", false);
    expect(rendered).toEqual(hazeWallpaperPixels(pixels, width, height));
    // The scanline effect changes the top row; Haze leaves its artwork clear.
    expect(rendered.slice(0, width * 4)).toEqual(pixels.slice(0, width * 4));
  });
});
