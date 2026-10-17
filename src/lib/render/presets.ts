import data from '../../data/presets.json' with { type: 'json' };
import { sanitizeDesign, type QrDesign } from './design';

export interface Preset {
  id: string;
  /** Style fields only; content-independent. */
  design: Pick<QrDesign, 'fg' | 'bg' | 'dotStyle' | 'cornerSquareStyle' | 'cornerDotStyle'> &
    Partial<Pick<QrDesign, 'gradient' | 'cornerColor'>>;
}

export const presets: Preset[] = data.presets.map((p) => {
  const clean = sanitizeDesign(p.design);
  const design: Preset['design'] = {
    fg: clean.fg,
    bg: clean.bg,
    dotStyle: clean.dotStyle,
    cornerSquareStyle: clean.cornerSquareStyle,
    cornerDotStyle: clean.cornerDotStyle,
  };
  if (clean.gradient) design.gradient = clean.gradient;
  if (clean.cornerColor) design.cornerColor = clean.cornerColor;
  return { id: p.id, design };
});

/** Applies a preset's style, keeping logo, frame, margin and error correction. */
export function applyPreset(current: QrDesign, preset: Preset): QrDesign {
  const { gradient: _g, cornerColor: _c, ...rest } = current;
  return { ...rest, transparentBg: false, ...preset.design };
}

/** The preset the design currently matches, if any. */
export function matchingPreset(design: QrDesign): string | null {
  const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const found = presets.find(
    (p) =>
      p.design.fg === design.fg &&
      p.design.bg === design.bg &&
      p.design.dotStyle === design.dotStyle &&
      p.design.cornerSquareStyle === design.cornerSquareStyle &&
      p.design.cornerDotStyle === design.cornerDotStyle &&
      same(p.design.gradient, design.gradient) &&
      same(p.design.cornerColor, design.cornerColor) &&
      !design.transparentBg,
  );
  return found?.id ?? null;
}
