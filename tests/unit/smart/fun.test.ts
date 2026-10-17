import { describe, expect, it } from 'vitest';
import { splitBill } from '../../../src/lib/smart/split';
import { remixDesign, REMIX_MIN_CONTRAST, REMIX_PALETTES } from '../../../src/lib/smart/remix';
import { paletteFromPixels, PALETTE_MIN_CONTRAST } from '../../../src/lib/smart/palette';
import { ensureContrast, hexToRgb, rgbToHex } from '../../../src/lib/smart/color';
import { festivalOn } from '../../../src/lib/smart/festival';
import { contrastRatio } from '../../../src/lib/scannability/checks';
import { defaultDesign } from '../../../src/lib/render/design';

const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

describe('splitBill', () => {
  it('splits evenly', () => {
    expect(splitBill('900', 3)).toEqual({ perPerson: '300.00', collected: '900.00' });
  });
  it('rounds each share up so nobody is short', () => {
    expect(splitBill('1000', 3)).toEqual({ perPerson: '333.34', collected: '1000.02' });
  });
  it('accepts rupee symbols and commas', () => {
    expect(splitBill('₹1,250.50', 2)?.perPerson).toBe('625.25');
  });
  it.each([
    ['0', 2],
    ['abc', 2],
    ['100', 1],
    ['100', 51],
    ['100', 2.5],
    ['-5', 2],
  ])('rejects %s / %s', (total, people) => {
    expect(splitBill(total, people)).toBeNull();
  });
});

describe('remixDesign', () => {
  it('every palette meets the remix contrast', () => {
    for (const p of REMIX_PALETTES)
      expect(contrastRatio(p.fg, p.bg), `${p.fg}/${p.bg}`).toBeGreaterThanOrEqual(
        REMIX_MIN_CONTRAST,
      );
  });
  it('always produces high-contrast, solid colours', () => {
    const rand = seeded(42);
    for (let i = 0; i < 200; i++) {
      const d = remixDesign(defaultDesign, rand);
      expect(contrastRatio(d.fg, d.bg)).toBeGreaterThanOrEqual(REMIX_MIN_CONTRAST);
      if (d.cornerColor)
        expect(contrastRatio(d.cornerColor, d.bg)).toBeGreaterThanOrEqual(REMIX_MIN_CONTRAST);
      expect(d.gradient).toBeUndefined();
      expect(d.transparentBg).toBe(false);
    }
  });
  it('respects locks and keeps logo/frame/margin', () => {
    const base = {
      ...defaultDesign,
      fg: '#123456',
      margin: 6,
      frame: { id: 'pill', label: 'Hi', labelColor: '#FFFFFF', frameColor: '#000000' },
    };
    const colorsLocked = remixDesign(base, seeded(7), { colors: true, shape: false });
    expect(colorsLocked.fg).toBe('#123456');
    expect(colorsLocked.margin).toBe(6);
    expect(colorsLocked.frame).toEqual(base.frame);
    const shapeLocked = remixDesign(base, seeded(7), { colors: false, shape: true });
    expect(shapeLocked.dotStyle).toBe(base.dotStyle);
    expect(shapeLocked.cornerSquareStyle).toBe(base.cornerSquareStyle);
  });
});

describe('colour helpers', () => {
  it('round-trips hex', () => {
    expect(rgbToHex(hexToRgb('#C2321A'))).toBe('#C2321A');
  });
  it('ensureContrast darkens until the target', () => {
    const fg = ensureContrast('#FFB703', '#FFFFFF', 7);
    expect(contrastRatio(fg, '#FFFFFF')).toBeGreaterThanOrEqual(7);
  });
});

describe('paletteFromPixels', () => {
  const image = (colors: Array<[number, number, number]>, each = 100) => {
    const data = new Uint8ClampedArray(colors.length * each * 4);
    colors.forEach(([r, g, b], ci) => {
      for (let i = 0; i < each; i++) {
        const o = (ci * each + i) * 4;
        data[o] = r;
        data[o + 1] = g;
        data[o + 2] = b;
        data[o + 3] = 255;
      }
    });
    return data;
  };
  it('suggests scannable pairs from a colourful photo', () => {
    const out = paletteFromPixels(
      image([
        [230, 57, 70],
        [29, 53, 87],
        [241, 250, 238],
        [69, 123, 157],
      ]),
    );
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThanOrEqual(3);
    for (const s of out)
      expect(contrastRatio(s.fg, s.bg)).toBeGreaterThanOrEqual(PALETTE_MIN_CONTRAST);
  });
  it('handles a blank or transparent image', () => {
    expect(paletteFromPixels(new Uint8ClampedArray(0))).toEqual([]);
    expect(paletteFromPixels(new Uint8ClampedArray([0, 0, 0, 0]))).toEqual([]);
  });
  it('a single grey still gives a usable pair', () => {
    const out = paletteFromPixels(image([[128, 128, 128]]));
    expect(contrastRatio(out[0]!.fg, out[0]!.bg)).toBeGreaterThanOrEqual(PALETTE_MIN_CONTRAST);
  });
});

describe('festivalOn', () => {
  it.each([
    ['2026-08-15', 'independence'],
    ['2027-01-26', 'republic'],
    ['2026-11-08', 'diwali'],
    ['2027-01-01', 'newyear'],
    ['2026-10-17', null],
  ])('%s → %s', (iso, expected) => {
    const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
    expect(festivalOn(new Date(y, m - 1, d))).toBe(expected);
  });
});
