import { normalizeHex, resolveEcLevel, type EcLevel, type QrDesign } from '../render/design';
import type { Geometry } from '../render/geometry';

export type Severity = 'warn' | 'fail';
export type CheckId = 'contrast' | 'inverted' | 'logo' | 'quietZone' | 'density' | 'decode';
export type FixId = 'darkerColors' | 'swapColors' | 'raiseEc' | 'shrinkLogo' | 'increaseMargin';
export type Status = 'great' | 'risky' | 'fail';

export interface Issue {
  id: CheckId;
  severity: Severity;
  /** i18n key of the one-line reason. */
  reason: string;
  fix?: FixId;
  vars?: Record<string, string | number>;
}

// ---------------------------------------------------------------- colour

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a hex colour (0 = black, 1 = white). */
export function luminance(hex: string): number {
  const h = (normalizeHex(hex) ?? '#000000').slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio, 1–21. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export const CONTRAST_WARN = 4.5;
export const CONTRAST_FAIL = 2.5;

/** Every colour used for modules (gradient stops and corner colour included). */
export function moduleColors(design: QrDesign): string[] {
  const colors = design.gradient ? [...design.gradient.colors] : [design.fg];
  if (design.cornerColor) colors.push(design.cornerColor);
  return colors;
}

/** The background the code is read against; transparent codes are assumed to be printed on white. */
export const effectiveBg = (design: QrDesign): string =>
  design.transparentBg ? '#FFFFFF' : design.bg;

// ---------------------------------------------------------------- logo

/** Share of codewords each EC level can recover. */
export const EC_CAPACITY: Record<EcLevel, number> = { L: 0.07, M: 0.15, Q: 0.25, H: 0.3 };
export const LOGO_WARN_SHARE = 0.7;

/** Fraction of the error-correction budget the logo uses (1 = all of it). */
export function logoBudgetUse(
  design: QrDesign,
  geometry: Pick<Geometry, 'hiddenRatio' | 'matrix' | 'logo'>,
): number {
  if (!design.logo || !geometry.logo) return 0;
  const n = geometry.matrix.size;
  const covered = design.logo.hideBackgroundDots
    ? geometry.hiddenRatio
    : (geometry.logo.w * geometry.logo.h) / (n * n);
  return covered / EC_CAPACITY[resolveEcLevel(design)];
}

// ---------------------------------------------------------------- density

export const DENSE_VERSION = 15;
/** Smallest module that prints and scans reliably, in mm. */
export const MIN_MODULE_MM = 0.4;

/** Minimum printed width (cm, rounded up to 0.5) for a code with this many modules incl. quiet zone. */
export function minPrintCm(modulesWithMargin: number): number {
  return Math.ceil((modulesWithMargin * MIN_MODULE_MM) / 5) / 2;
}

// ---------------------------------------------------------------- checks

/** Static checks that do not need rendering. Decode result is added separately. */
export function checkDesign(
  design: QrDesign,
  geometry: Pick<Geometry, 'hiddenRatio' | 'matrix' | 'logo'>,
): Issue[] {
  const issues: Issue[] = [];
  const bg = effectiveBg(design);
  const colors = moduleColors(design);

  const worst = Math.min(...colors.map((c) => contrastRatio(c, bg)));
  if (worst < CONTRAST_FAIL) {
    issues.push({
      id: 'contrast',
      severity: 'fail',
      reason: 'status.reason.contrast',
      fix: 'darkerColors',
    });
  } else if (worst < CONTRAST_WARN) {
    issues.push({
      id: 'contrast',
      severity: 'warn',
      reason: 'status.reason.contrast',
      fix: 'darkerColors',
    });
  }

  const lighter = colors.some((c) => luminance(c) > luminance(bg));
  if (lighter && worst >= CONTRAST_FAIL) {
    issues.push({
      id: 'inverted',
      severity: 'warn',
      reason: 'status.reason.inverted',
      fix: 'swapColors',
    });
  }

  const use = logoBudgetUse(design, geometry);
  if (use > LOGO_WARN_SHARE) {
    const ec = resolveEcLevel(design);
    issues.push({
      id: 'logo',
      severity: use > 1 ? 'fail' : 'warn',
      reason: 'status.reason.logo',
      fix: ec === 'H' ? 'shrinkLogo' : 'raiseEc',
    });
  }

  if (design.margin < 2) {
    issues.push({
      id: 'quietZone',
      severity: 'fail',
      reason: 'status.reason.quietZone',
      fix: 'increaseMargin',
    });
  } else if (design.margin < 4) {
    issues.push({
      id: 'quietZone',
      severity: 'warn',
      reason: 'status.reason.quietZone',
      fix: 'increaseMargin',
    });
  }

  const version = geometry.matrix.version;
  if (version > DENSE_VERSION) {
    issues.push({
      id: 'density',
      severity: 'warn',
      reason: 'status.reason.density',
      vars: { cm: minPrintCm(geometry.matrix.size + design.margin * 2) },
    });
  }
  return issues;
}

export function decodeIssue(decodedOk: boolean): Issue[] {
  return decodedOk ? [] : [{ id: 'decode', severity: 'fail', reason: 'status.reason.decode' }];
}

export function overallStatus(issues: Issue[]): Status {
  if (issues.some((i) => i.severity === 'fail')) return 'fail';
  if (issues.length > 0) return 'risky';
  return 'great';
}

// ---------------------------------------------------------------- fixes

/** Applies an automatic fix; returns the design unchanged when nothing applies. */
export function applyFix(design: QrDesign, fix: FixId): QrDesign {
  switch (fix) {
    case 'raiseEc':
      return { ...design, ecLevel: 'H' };
    case 'shrinkLogo':
      return design.logo
        ? {
            ...design,
            logo: { ...design.logo, sizeRatio: Math.max(0.1, design.logo.sizeRatio - 0.05) },
          }
        : design;
    case 'increaseMargin':
      return { ...design, margin: Math.max(4, design.margin) };
    case 'swapColors': {
      const { gradient: _g, cornerColor: _c, ...rest } = design;
      return { ...rest, fg: design.bg, bg: design.fg, transparentBg: false };
    }
    case 'darkerColors': {
      const { gradient: _g, cornerColor: _c, ...rest } = design;
      const bgLight = luminance(effectiveBg(design)) > 0.5;
      return bgLight
        ? { ...rest, fg: '#000000' }
        : { ...rest, fg: '#000000', bg: '#FFFFFF', transparentBg: false };
    }
  }
}
