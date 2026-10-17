import {
  contrastRatio,
  ensureContrast,
  hexToRgb,
  lighten,
  luminance,
  rgbToHex,
  saturation,
} from './color';

export interface PaletteSuggestion {
  fg: string;
  bg: string;
}

export const PALETTE_MIN_CONTRAST = 7;

/**
 * Finds QR colour pairs that match a photo. Takes raw RGBA pixels (already
 * downscaled by the caller) and returns up to `count` scannable pairs: a
 * dark ink from the photo's colours on a light paper tinted by the photo.
 * Runs entirely on the device.
 */
export function paletteFromPixels(data: ArrayLike<number>, count = 3): PaletteSuggestion[] {
  // 4 bits per channel buckets → the most common colours.
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i + 3 < data.length; i += 4) {
    if ((data[i + 3] ?? 255) < 128) continue;
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bucket.n++;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  }
  const colours = [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, 24)
    .map((c) => rgbToHex([c.r / c.n, c.g / c.n, c.b / c.n]));
  if (colours.length === 0) return [];

  // Inks: prefer colourful ones; paper: the lightest common colour, softened.
  const inks = [...colours].sort(
    (a, b) =>
      saturation(hexToRgb(b)) * (1 - luminance(b)) - saturation(hexToRgb(a)) * (1 - luminance(a)),
  );
  const lightest = [...colours].sort((a, b) => luminance(b) - luminance(a))[0]!;
  const papers = [lighten(lightest, 0.85), '#FFFFFF', lighten(inks[0]!, 0.92)];

  const out: PaletteSuggestion[] = [];
  for (const ink of inks) {
    for (const bg of papers) {
      const fg = ensureContrast(ink, bg, PALETTE_MIN_CONTRAST);
      if (contrastRatio(fg, bg) < PALETTE_MIN_CONTRAST) continue;
      if (out.some((s) => s.fg === fg && s.bg === bg)) continue;
      // Skip near-duplicates so the suggestions look different.
      if (out.some((s) => Math.abs(luminance(s.fg) - luminance(fg)) < 0.004 && s.bg === bg))
        continue;
      out.push({ fg, bg });
      break;
    }
    if (out.length >= count) break;
  }
  if (out.length === 0) out.push({ fg: '#000000', bg: '#FFFFFF' });
  return out;
}
