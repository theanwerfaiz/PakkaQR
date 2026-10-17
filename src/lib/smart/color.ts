import { contrastRatio, luminance } from '../scannability/checks';

/** Colour helpers for remix and photo palettes. Pure, hex in / hex out. */

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

export function rgbToHex([r, g, b]: Rgb): string {
  const to = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

/** Mixes a colour towards black (amount 0–1). */
export function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex([r * (1 - amount), g * (1 - amount), b * (1 - amount)]);
}

/** Mixes a colour towards white (amount 0–1). */
export function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex([r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount]);
}

/**
 * Darkens `fg` step by step until it reaches `target` contrast against `bg`.
 * Keeps the hue, so a brand colour still looks like itself.
 */
export function ensureContrast(fg: string, bg: string, target: number): string {
  let out = fg;
  for (let step = 0; step <= 20 && contrastRatio(out, bg) < target; step++) {
    out = darken(fg, step / 20);
  }
  return out;
}

export function saturation([r, g, b]: Rgb): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

export { contrastRatio, luminance };
