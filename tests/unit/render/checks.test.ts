import { describe, expect, it } from 'vitest';
import {
  applyFix,
  checkDesign,
  contrastRatio,
  decodeIssue,
  logoBudgetUse,
  luminance,
  minPrintCm,
  overallStatus,
} from '../../../src/lib/scannability/checks';
import { buildGeometry } from '../../../src/lib/render/geometry';
import { defaultDesign, type QrDesign } from '../../../src/lib/render/design';

const logo = (sizeRatio: number, hideBackgroundDots = true) => ({
  dataUrl: 'data:image/png;base64,AAAA',
  sizeRatio,
  margin: 1,
  hideBackgroundDots,
  aspect: 1,
});
const check = (d: Partial<QrDesign>, payload = 'https://example.com') => {
  const design = { ...defaultDesign, ...d };
  return checkDesign(design, buildGeometry(payload, design));
};
const ids = (d: Partial<QrDesign>, payload?: string) =>
  check(d, payload).map((i) => `${i.id}:${i.severity}`);

describe('contrast', () => {
  it('computes WCAG ratios', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1);
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(4.54, 1);
    expect(luminance('#fff')).toBe(1);
    expect(luminance('bogus')).toBe(0);
  });
  it('warns below 4.5 and fails below 2.5', () => {
    expect(ids({})).toEqual([]);
    expect(ids({ fg: '#888888' })).toEqual(['contrast:warn']);
    expect(ids({ fg: '#CCCCCC' })).toEqual(['contrast:fail']);
  });
  it('checks every gradient stop and the corner colour', () => {
    expect(ids({ gradient: { kind: 'linear', colors: ['#000000', '#BBBBBB'], angle: 0 } })).toEqual(
      ['contrast:fail'],
    );
    expect(ids({ cornerColor: '#999999' })).toEqual(['contrast:warn']);
  });
  it('warns on inverted codes and treats transparent as white', () => {
    expect(ids({ fg: '#FFFFFF', bg: '#111318' })).toEqual(['inverted:warn']);
    expect(ids({ fg: '#FFFFFF', bg: '#000000', transparentBg: true })).toEqual(['contrast:fail']);
  });
});

describe('logo budget', () => {
  it('is fine for 25% at H, warns near the limit, fails above', () => {
    expect(ids({ logo: logo(0.25), ecLevel: 'H' })).toEqual([]);
    expect(ids({ logo: logo(0.4), ecLevel: 'L' })).toEqual(['logo:fail']);
    expect(check({ logo: logo(0.4), ecLevel: 'L' })[0]!.fix).toBe('raiseEc');
    expect(check({ logo: logo(0.45), ecLevel: 'H' })[0]!.fix).toBe('shrinkLogo');
  });
  it('uses the logo area when dots are not hidden', () => {
    const design = { ...defaultDesign, logo: logo(0.2, false), ecLevel: 'M' as const };
    const use = logoBudgetUse(design, buildGeometry('x', design));
    expect(use).toBeCloseTo(0.04 / 0.15, 2);
    expect(logoBudgetUse(defaultDesign, buildGeometry('x', defaultDesign))).toBe(0);
  });
});

describe('quiet zone and density', () => {
  it('fails under 2 modules and warns under 4', () => {
    expect(ids({ margin: 1 })).toEqual(['quietZone:fail']);
    expect(ids({ margin: 3 })).toEqual(['quietZone:warn']);
  });
  it('warns for versions above 15 with a minimum print size', () => {
    const issues = check({}, 'x'.repeat(500));
    expect(issues.map((i) => i.id)).toEqual(['density']);
    expect(issues[0]!.vars!.cm).toBeGreaterThanOrEqual(3);
    expect(minPrintCm(85)).toBe(3.5);
  });
});

describe('status and fixes', () => {
  it('combines issues into a status', () => {
    expect(overallStatus([])).toBe('great');
    expect(overallStatus(check({ margin: 3 }))).toBe('risky');
    expect(overallStatus([...check({}), ...decodeIssue(false)])).toBe('fail');
    expect(decodeIssue(true)).toEqual([]);
  });
  it('fixes', () => {
    expect(applyFix({ ...defaultDesign, ecLevel: 'L' }, 'raiseEc').ecLevel).toBe('H');
    expect(applyFix({ ...defaultDesign, margin: 1 }, 'increaseMargin').margin).toBe(4);
    expect(
      applyFix({ ...defaultDesign, logo: logo(0.3) }, 'shrinkLogo').logo!.sizeRatio,
    ).toBeCloseTo(0.25);
    expect(applyFix(defaultDesign, 'shrinkLogo')).toBe(defaultDesign);
    const swapped = applyFix(
      { ...defaultDesign, fg: '#FFFFFF', bg: '#000000', cornerColor: '#FFFFFF' },
      'swapColors',
    );
    expect([swapped.fg, swapped.bg, swapped.cornerColor]).toEqual([
      '#000000',
      '#FFFFFF',
      undefined,
    ]);
    expect(applyFix({ ...defaultDesign, fg: '#DDDDDD' }, 'darkerColors').fg).toBe('#000000');
    const dark = applyFix({ ...defaultDesign, fg: '#333333', bg: '#222222' }, 'darkerColors');
    expect([dark.fg, dark.bg]).toEqual(['#000000', '#FFFFFF']);
  });
});
