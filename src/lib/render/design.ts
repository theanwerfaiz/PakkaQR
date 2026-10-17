export const dotStyles = [
  'square',
  'rounded',
  'dots',
  'classy',
  'classy-rounded',
  'extra-rounded',
] as const;
export const cornerSquareStyles = ['square', 'dot', 'extra-rounded'] as const;
export const cornerDotStyles = ['square', 'dot'] as const;
export const ecLevels = ['auto', 'L', 'M', 'Q', 'H'] as const;

export type DotStyle = (typeof dotStyles)[number];
export type CornerSquareStyle = (typeof cornerSquareStyles)[number];
export type CornerDotStyle = (typeof cornerDotStyles)[number];
export type EcSetting = (typeof ecLevels)[number];
export type EcLevel = Exclude<EcSetting, 'auto'>;

export interface Gradient {
  kind: 'linear' | 'radial';
  colors: [string, string];
  /** Degrees, 0 = left→right, 90 = top→bottom. Ignored for radial. */
  angle: number;
}

export interface LogoSettings {
  dataUrl: string;
  /** Logo box width as a fraction of the symbol width (0.1–0.3 in the UI). */
  sizeRatio: number;
  /** Clear space around the logo, in modules. */
  margin: number;
  hideBackgroundDots: boolean;
  /** Image width / height, so the logo is drawn without distortion. */
  aspect: number;
}

export interface FrameSettings {
  id: string;
  label: string;
  labelColor: string;
  frameColor: string;
}

export interface QrDesign {
  fg: string;
  bg: string;
  transparentBg: boolean;
  gradient?: Gradient;
  dotStyle: DotStyle;
  cornerSquareStyle: CornerSquareStyle;
  cornerDotStyle: CornerDotStyle;
  cornerColor?: string;
  logo?: LogoSettings;
  /** Quiet zone in modules. */
  margin: number;
  ecLevel: EcSetting;
  frame?: FrameSettings;
}

export const defaultDesign: QrDesign = {
  fg: '#000000',
  bg: '#FFFFFF',
  transparentBg: false,
  dotStyle: 'square',
  cornerSquareStyle: 'square',
  cornerDotStyle: 'square',
  margin: 4,
  ecLevel: 'auto',
};

export const LOGO_MIN_RATIO = 0.1;
export const LOGO_MAX_RATIO = 0.3;
export const MARGIN_MAX = 10;

/** Auto picks H when a logo covers part of the code, otherwise M. */
export function resolveEcLevel(design: Pick<QrDesign, 'ecLevel' | 'logo'>): EcLevel {
  if (design.ecLevel !== 'auto') return design.ecLevel;
  return design.logo ? 'H' : 'M';
}

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_RE.test(value);
}

/** Expands #abc to #AABBCC; returns null for anything else. */
export function normalizeHex(value: string): string | null {
  const v = value.trim();
  const withHash = v.startsWith('#') ? v : `#${v}`;
  if (!isHexColor(withHash)) return null;
  const hex = withHash.slice(1);
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  return `#${full.toUpperCase()}`;
}

const clamp = (n: unknown, min: number, max: number, fallback: number): number =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;

const oneOf = <T extends string>(list: readonly T[], value: unknown, fallback: T): T =>
  typeof value === 'string' && (list as readonly string[]).includes(value)
    ? (value as T)
    : fallback;

const color = (value: unknown, fallback: string): string =>
  (typeof value === 'string' && normalizeHex(value)) || fallback;

/**
 * Turns untrusted input (localStorage, imported JSON, URL hash) into a
 * valid design. Unknown keys are dropped and bad values replaced.
 */
export function sanitizeDesign(input: unknown): QrDesign {
  const src = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const design: QrDesign = {
    fg: color(src.fg, defaultDesign.fg),
    bg: color(src.bg, defaultDesign.bg),
    transparentBg: src.transparentBg === true,
    dotStyle: oneOf(dotStyles, src.dotStyle, defaultDesign.dotStyle),
    cornerSquareStyle: oneOf(
      cornerSquareStyles,
      src.cornerSquareStyle,
      defaultDesign.cornerSquareStyle,
    ),
    cornerDotStyle: oneOf(cornerDotStyles, src.cornerDotStyle, defaultDesign.cornerDotStyle),
    margin: Math.round(clamp(src.margin, 0, MARGIN_MAX, defaultDesign.margin)),
    ecLevel: oneOf(ecLevels, src.ecLevel, defaultDesign.ecLevel),
  };
  const g = src.gradient as Record<string, unknown> | undefined;
  if (g && typeof g === 'object' && Array.isArray(g.colors) && g.colors.length === 2) {
    design.gradient = {
      kind: g.kind === 'radial' ? 'radial' : 'linear',
      colors: [color(g.colors[0], design.fg), color(g.colors[1], design.fg)],
      angle: clamp(g.angle, 0, 360, 0),
    };
  }
  if (src.cornerColor !== undefined && normalizeHex(String(src.cornerColor))) {
    design.cornerColor = color(src.cornerColor, design.fg);
  }
  const l = src.logo as Record<string, unknown> | undefined;
  if (
    l &&
    typeof l === 'object' &&
    typeof l.dataUrl === 'string' &&
    /^data:image\/(png|jpeg|webp);base64,/.test(l.dataUrl)
  ) {
    design.logo = {
      dataUrl: l.dataUrl,
      sizeRatio: clamp(l.sizeRatio, 0.05, 0.5, 0.2),
      margin: clamp(l.margin, 0, 4, 1),
      hideBackgroundDots: l.hideBackgroundDots !== false,
      aspect: clamp(l.aspect, 0.2, 5, 1),
    };
  }
  const f = src.frame as Record<string, unknown> | undefined;
  if (f && typeof f === 'object' && typeof f.id === 'string' && f.id !== 'none') {
    design.frame = {
      id: f.id.slice(0, 40),
      label: typeof f.label === 'string' ? f.label.slice(0, 40) : '',
      labelColor: color(f.labelColor, '#FFFFFF'),
      frameColor: color(f.frameColor, '#000000'),
    };
  }
  return design;
}

/** Design without the logo image, for places that must stay small (URL hash). */
export function withoutLogo(design: QrDesign): QrDesign {
  const { logo: _logo, ...rest } = design;
  return rest;
}
