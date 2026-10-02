/** Pixel buffer used by the image worker's Haze wallpaper renderer. */
export function hazeWallpaperPixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  const radius = Math.min(
    18,
    Math.max(3, Math.round(Math.min(width, height) * 0.008)),
  );
  const horizontal = new Uint8ClampedArray(pixels.length);
  const blurred = new Uint8ClampedArray(pixels.length);
  blurAxis(pixels, horizontal, width, height, radius, true);
  blurAxis(horizontal, blurred, width, height, radius, false);

  const output = new Uint8ClampedArray(pixels.length);
  for (let y = 0; y < height; y += 1) {
    const progress = height <= 1 ? 1 : y / (height - 1);
    const blur = smoothstep(0.18, 0.76, progress);
    const fade = smoothstep(0.58, 0.94, progress);
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        output[offset + channel] = Math.round(
          pixels[offset + channel] * (1 - blur) +
            blurred[offset + channel] * blur,
        );
      }
      // Let the app's opaque wallpaper base show through at the bottom edge,
      // matching Haze's fade into the surrounding background color.
      output[offset + 3] = Math.round(pixels[offset + 3] * (1 - fade));
    }
  }
  return output;
}

function smoothstep(start: number, end: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

function blurAxis(
  source: Uint8ClampedArray,
  target: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  horizontal: boolean,
): void {
  const lineCount = horizontal ? height : width;
  const lineLength = horizontal ? width : height;
  const sums = [0, 0, 0, 0];

  for (let line = 0; line < lineCount; line += 1) {
    sums.fill(0);
    let count = Math.min(lineLength - 1, radius) + 1;
    for (let position = 0; position < count; position += 1) {
      const offset = pixelOffset(line, position, width, horizontal);
      for (let channel = 0; channel < 4; channel += 1) {
        sums[channel] += source[offset + channel];
      }
    }

    for (let position = 0; position < lineLength; position += 1) {
      const left = Math.max(0, position - radius);
      const right = Math.min(lineLength - 1, position + radius);
      count = right - left + 1;
      const targetOffset = pixelOffset(line, position, width, horizontal);
      for (let channel = 0; channel < 4; channel += 1) {
        target[targetOffset + channel] = Math.round(sums[channel] / count);
      }

      const remove = position - radius;
      const add = position + radius + 1;
      if (remove >= 0) {
        const offset = pixelOffset(line, remove, width, horizontal);
        for (let channel = 0; channel < 4; channel += 1) {
          sums[channel] -= source[offset + channel];
        }
      }
      if (add < lineLength) {
        const offset = pixelOffset(line, add, width, horizontal);
        for (let channel = 0; channel < 4; channel += 1) {
          sums[channel] += source[offset + channel];
        }
      }
    }
  }
}

function pixelOffset(
  line: number,
  position: number,
  width: number,
  horizontal: boolean,
): number {
  return (horizontal ? line * width + position : position * width + line) * 4;
}
