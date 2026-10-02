import { describe, expect, it } from "vitest";
import { hazeWallpaperPixels } from "./wallpaperHaze";

describe("wallpaper Haze pixels", () => {
  it("keeps the top artwork clear, softens the lower image, and fades it out", () => {
    const width = 5;
    const height = 5;
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        pixels[offset] = x === 0 ? 255 : 0;
        pixels[offset + 1] = y * 40;
        pixels[offset + 2] = 90;
        pixels[offset + 3] = 255;
      }
    }

    const output = hazeWallpaperPixels(pixels, width, height);

    expect(output.slice(0, width * 4)).toEqual(pixels.slice(0, width * 4));
    const lowerOffset = 3 * width * 4;
    expect(output[lowerOffset]).toBeGreaterThan(0);
    expect(output[lowerOffset]).toBeLessThan(255);
    expect(output[lowerOffset + 3]).toBeLessThan(255);
    expect(output[(height - 1) * width * 4 + 3]).toBe(0);
  });
});
