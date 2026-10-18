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

const lum = (hex: string): number => {
  const h = hex.replace('#', '');
  const ch = (i: number) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(0) + 0.7152 * ch(2) + 0.0722 * ch(4);
};

/**
 * A preset plus an optional frame with a label, as starters and templates
 * use. Light-on-dark styles get a light frame with dark text.
 */
export function styledDesign(
  base: QrDesign,
  presetId: string | undefined,
  frameId: string | undefined,
  label: string,
): QrDesign {
  const preset = presets.find((p) => p.id === presetId);
  const next = preset ? applyPreset(base, preset) : { ...base };
  if (!frameId) {
    const { frame: _f, ...rest } = next;
    return rest;
  }
  const color = next.gradient ? next.gradient.colors[0] : next.fg;
  const inverted = lum(next.bg) < lum(color);
  return {
    ...next,
    frame: { id: frameId, label, labelColor: inverted ? next.bg : '#FFFFFF', frameColor: color },
  };
}
