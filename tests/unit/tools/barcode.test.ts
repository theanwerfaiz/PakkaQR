import { createCanvas } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';
import {
  barcodeSvg,
  defaultBarcodeStyle,
  drawBarcode,
  encodeBarcode,
  gs1CheckDigit,
  layoutBarcode,
  type BarcodeFormat,
} from '../../../src/lib/barcode';
import { decodeBarcode } from '../../../src/lib/barcode/decode';

function scan(format: BarcodeFormat, input: string, showText = true): string | null {
  const r = encodeBarcode(format, input);
  if (!r.ok) throw new Error(r.error);
  const layout = layoutBarcode(format, r, { ...defaultBarcodeStyle, showText });
  const scale = 4;
  const c = createCanvas(layout.width * scale, layout.height * scale);
  const ctx = c.getContext('2d');
  drawBarcode(ctx as never, layout, defaultBarcodeStyle, scale);
  return decodeBarcode(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height, format);
}

describe('check digits', () => {
  it.each([
    ['890123456789', 0],
    ['400638133393', 1],
    ['03600029145', 2],
    ['9638507', 4],
  ])('%s → %i', (digits, check) => {
    expect(gs1CheckDigit(digits)).toBe(check);
  });
});

describe('encodeBarcode validation', () => {
  it('adds a missing check digit', () => {
    const r = encodeBarcode('ean13', '890123456789');
    expect(r.ok && r.value).toBe('8901234567890');
  });
  it('rejects a wrong check digit', () => {
    expect(encodeBarcode('ean13', '8901234567891')).toEqual({
      ok: false,
      error: 'barcode.errors.checkDigit',
    });
  });
  it.each([
    ['ean13', '12ab', 'barcode.errors.digitsOnly'],
    ['ean13', '123', 'barcode.errors.length13'],
    ['upca', '123', 'barcode.errors.length12'],
    ['ean8', '123', 'barcode.errors.length8'],
    ['code128', 'नमस्ते', 'barcode.errors.ascii'],
    ['code128', '', 'errors.required'],
    ['code128', 'x'.repeat(49), 'barcode.errors.tooLong'],
  ] as const)('%s %s → %s', (format, input, error) => {
    expect(encodeBarcode(format, input)).toEqual({ ok: false, error });
  });
  it('EAN-13 has 95 modules, EAN-8 67', () => {
    const a = encodeBarcode('ean13', '8901234567890');
    const b = encodeBarcode('ean8', '9638507');
    expect(a.ok && a.bits.length).toBe(95);
    expect(b.ok && b.bits.length).toBe(67);
  });
});

describe('every barcode scans back to its value', () => {
  it.each([
    ['ean13', '890123456789', '8901234567890'],
    ['ean13', '4006381333931', '4006381333931'],
    ['upca', '03600029145', '036000291452'],
    ['ean8', '9638507', '96385074'],
    ['code128', 'PAKKA-QR 2026', 'PAKKA-QR 2026'],
    ['code128', 'SKU/42:A_b', 'SKU/42:A_b'],
  ] as const)('%s %s', (format, input, expected) => {
    expect(scan(format, input)).toBe(expected);
    expect(scan(format, input, false)).toBe(expected);
  });
});

describe('barcodeSvg', () => {
  it('is a titled SVG with one rect per bar', () => {
    const r = encodeBarcode('ean8', '9638507');
    if (!r.ok) throw new Error();
    const layout = layoutBarcode('ean8', r, defaultBarcodeStyle);
    const svg = barcodeSvg(layout, defaultBarcodeStyle, 'EAN-8 <96385074>');
    expect(svg).toContain('<title>EAN-8 &lt;96385074&gt;</title>');
    expect(svg.match(/<rect x=/g)?.length).toBe(layout.bars.length);
  });
});
