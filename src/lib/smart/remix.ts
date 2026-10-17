import { cornerDotStyles, cornerSquareStyles, dotStyles, type QrDesign } from '../render/design';
import { contrastRatio, ensureContrast } from './color';

/** Ink + paper pairs that print and scan well. Every pair is ≥ 7:1. */
export const REMIX_PALETTES: ReadonlyArray<{ fg: string; bg: string }> = [
  { fg: '#1A1712', bg: '#FFFCF6' },
  { fg: '#20345E', bg: '#FFFFFF' },
  { fg: '#7A2412', bg: '#FBEFE8' },
  { fg: '#14492F', bg: '#EEF6F0' },
  { fg: '#4A1F44', bg: '#FAF0F7' },
  { fg: '#0B3D4F', bg: '#EAF6F8' },
  { fg: '#3B2A06', bg: '#FFF6D9' },
  { fg: '#000000', bg: '#FFFFFF' },
  { fg: '#2E1065', bg: '#F5F0FF' },
  { fg: '#5A1A1A', bg: '#FFF1EC' },
];

export const REMIX_MIN_CONTRAST = 7;

export interface RemixLocks {
  colors: boolean;
  shape: boolean;
}

const pick = <T>(list: readonly T[], rand: () => number): T =>
  list[Math.min(list.length - 1, Math.floor(rand() * list.length))]!;

/**
 * Returns a new random style that still scans: colours come from a curated
 * list (and are darkened if needed), shapes from the supported styles.
 * Logo, frame, margin and error correction are kept.
 */
export function remixDesign(
  design: QrDesign,
  rand: () => number = Math.random,
  locks: RemixLocks = { colors: false, shape: false },
): QrDesign {
  const next: QrDesign = { ...design };
  if (!locks.colors) {
    const palette = pick(REMIX_PALETTES, rand);
    next.fg = palette.fg;
    next.bg = palette.bg;
    next.transparentBg = false;
    delete next.gradient;
    delete next.cornerColor;
    if (rand() < 0.35) {
      const accent = pick(REMIX_PALETTES, rand).fg;
      if (contrastRatio(accent, palette.bg) >= REMIX_MIN_CONTRAST) next.cornerColor = accent;
    }
    next.fg = ensureContrast(next.fg, next.bg, REMIX_MIN_CONTRAST);
  }
  if (!locks.shape) {
    next.dotStyle = pick(dotStyles, rand);
    next.cornerSquareStyle = pick(cornerSquareStyles, rand);
    next.cornerDotStyle = pick(cornerDotStyles, rand);
  }
  return next;
}
