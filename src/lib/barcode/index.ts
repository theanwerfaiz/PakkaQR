/*
 * 1D barcodes: EAN-13, EAN-8, UPC-A and Code 128 (set B). Pure functions:
 * input → validated → a list of bars in module units, then SVG. Drawn on
 * the device like everything else; the scan test decodes them with ZXing.
 */

export const barcodeFormats = ['ean13', 'upca', 'ean8', 'code128'] as const;
export type BarcodeFormat = (typeof barcodeFormats)[number];

export type BarcodeResult =
  { ok: true; value: string; bits: string; human: HumanText } | { ok: false; error: string };

/** How the digits are printed under the bars. */
export interface HumanText {
  /** Groups placed at module offsets, e.g. EAN-13 "8 | 901234 | 567890". */
  groups: Array<{ text: string; x: number; width: number }>;
}

const L = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011',
];
const R = L.map((p) => [...p].map((c) => (c === '0' ? '1' : '0')).join(''));
const G = R.map((p) => [...p].reverse().join(''));
const PARITY = [
  'LLLLLL',
  'LLGLGG',
  'LLGGLG',
  'LLGGGL',
  'LGLLGG',
  'LGGLLG',
  'LGGGLL',
  'LGLGLG',
  'LGLGGL',
  'LGGLGL',
];

/** GS1 mod-10 check digit for the digits given (without the check digit). */
export function gs1CheckDigit(digits: string): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const d = Number(digits[digits.length - 1 - i]);
    sum += i % 2 === 0 ? d * 3 : d;
  }
  return (10 - (sum % 10)) % 10;
}

/** Accepts the number without or with its check digit; returns the full number or an error key. */
function withCheckDigit(
  raw: string,
  length: number,
): { ok: true; value: string } | { ok: false; error: string } {
  const digits = raw.replace(/[\s-]/g, '');
  if (!/^\d+$/.test(digits)) return { ok: false, error: 'barcode.errors.digitsOnly' };
  if (digits.length === length - 1) return { ok: true, value: digits + gs1CheckDigit(digits) };
  if (digits.length === length) {
    const check = gs1CheckDigit(digits.slice(0, -1));
    return Number(digits.at(-1)) === check
      ? { ok: true, value: digits }
      : { ok: false, error: 'barcode.errors.checkDigit' };
  }
  return { ok: false, error: `barcode.errors.length${length}` };
}

function ean13Bits(v: string): string {
  const parity = PARITY[Number(v[0])]!;
  let bits = '101';
  for (let i = 1; i <= 6; i++) bits += (parity[i - 1] === 'L' ? L : G)[Number(v[i])];
  bits += '01010';
  for (let i = 7; i <= 12; i++) bits += R[Number(v[i])];
  return bits + '101';
}

function ean8Bits(v: string): string {
  let bits = '101';
  for (let i = 0; i < 4; i++) bits += L[Number(v[i])];
  bits += '01010';
  for (let i = 4; i < 8; i++) bits += R[Number(v[i])];
  return bits + '101';
}

// Code 128 patterns (bar/space widths), values 0–106.
const C128 = [
  '212222',
  '222122',
  '222221',
  '121223',
  '121322',
  '131222',
  '122213',
  '122312',
  '132212',
  '221213',
  '221312',
  '231212',
  '112232',
  '122132',
  '122231',
  '113222',
  '123122',
  '123221',
  '223211',
  '221132',
  '221231',
  '213212',
  '223112',
  '312131',
  '311222',
  '321122',
  '321221',
  '312212',
  '322112',
  '322211',
  '212123',
  '212321',
  '232121',
  '111323',
  '131123',
  '131321',
  '112313',
  '132113',
  '132311',
  '211313',
  '231113',
  '231311',
  '112133',
  '112331',
  '132131',
  '113123',
  '113321',
  '133121',
  '313121',
  '211331',
  '231131',
  '213113',
  '213311',
  '213131',
  '311123',
  '311321',
  '331121',
  '312113',
  '312311',
  '332111',
  '314111',
  '221411',
  '431111',
  '111224',
  '111422',
  '121124',
  '121421',
  '141122',
  '141221',
  '112214',
  '112412',
  '122114',
  '122411',
  '142112',
  '142211',
  '241211',
  '221114',
  '413111',
  '241112',
  '134111',
  '111242',
  '121142',
  '121241',
  '114212',
  '124112',
  '124211',
  '411212',
  '421112',
  '421211',
  '212141',
  '214121',
  '412121',
  '111143',
  '111341',
  '131141',
  '114113',
  '114311',
  '411113',
  '411311',
  '113141',
  '114131',
  '311141',
  '411131',
  '211412',
  '211214',
  '211232',
  '2331112',
];
const START_B = 104;
const STOP = 106;

function widthsToBits(widths: string): string {
  let bits = '';
  for (let i = 0; i < widths.length; i++)
    bits += (i % 2 === 0 ? '1' : '0').repeat(Number(widths[i]));
  return bits;
}

export const CODE128_MAX = 48;

function code128Bits(text: string): string {
  const codes = [START_B, ...[...text].map((ch) => ch.charCodeAt(0) - 32)];
  const check = codes.reduce((sum, c, i) => sum + c * (i === 0 ? 1 : i), 0) % 103;
  return [...codes, check, STOP].map((c) => widthsToBits(C128[c]!)).join('');
}

/** Validates and encodes. Quiet zones are not included in `bits`. */
export function encodeBarcode(format: BarcodeFormat, input: string): BarcodeResult {
  if (format === 'code128') {
    if (!input) return { ok: false, error: 'errors.required' };
    if (input.length > CODE128_MAX) return { ok: false, error: 'barcode.errors.tooLong' };
    if (!/^[\x20-\x7e]+$/.test(input)) return { ok: false, error: 'barcode.errors.ascii' };
    const bits = code128Bits(input);
    return {
      ok: true,
      value: input,
      bits,
      human: { groups: [{ text: input, x: 0, width: bits.length }] },
    };
  }
  if (!input.trim()) return { ok: false, error: 'errors.required' };
  if (format === 'ean8') {
    const r = withCheckDigit(input, 8);
    if (!r.ok) return r;
    return {
      ok: true,
      value: r.value,
      bits: ean8Bits(r.value),
      human: {
        groups: [
          { text: r.value.slice(0, 4), x: 3, width: 28 },
          { text: r.value.slice(4), x: 36, width: 28 },
        ],
      },
    };
  }
  const r = withCheckDigit(input, format === 'upca' ? 12 : 13);
  if (!r.ok) return r;
  const ean = format === 'upca' ? `0${r.value}` : r.value;
  const groups =
    format === 'upca'
      ? [
          { text: r.value[0]!, x: -9, width: 7 },
          { text: r.value.slice(1, 6), x: 10, width: 35 },
          { text: r.value.slice(6, 11), x: 50, width: 35 },
          { text: r.value[11]!, x: 97, width: 7 },
        ]
      : [
          { text: ean[0]!, x: -9, width: 7 },
          { text: ean.slice(1, 7), x: 3, width: 42 },
          { text: ean.slice(7), x: 50, width: 42 },
        ];
  return { ok: true, value: r.value, bits: ean13Bits(ean), human: { groups } };
}

/** Modules that make the long guard bars (EAN/UPC), so they extend below the others. */
export function guardModules(format: BarcodeFormat, length: number): Set<number> {
  if (format === 'code128') return new Set();
  const mid = format === 'ean8' ? [31, 32, 33, 34, 35] : [45, 46, 47, 48, 49];
  const out = new Set([0, 1, 2, ...mid, length - 3, length - 2, length - 1]);
  if (format === 'upca') {
    // UPC-A prints the first and last digits outside, so their bars are long too.
    for (let i = 3; i < 10; i++) {
      out.add(i);
      out.add(length - 1 - i);
    }
  }
  return out;
}

export interface BarcodeStyle {
  /** Bar height in modules. */
  height: number;
  showText: boolean;
  fg: string;
  bg: string;
}

export const defaultBarcodeStyle: BarcodeStyle = {
  height: 60,
  showText: true,
  fg: '#000000',
  bg: '#FFFFFF',
};

export interface BarcodeLayout {
  width: number;
  height: number;
  bars: Array<{ x: number; w: number; h: number }>;
  texts: Array<{ text: string; cx: number; y: number; size: number }>;
}

/** Lays out bars and digits in module units, with quiet zones. */
export function layoutBarcode(
  format: BarcodeFormat,
  result: Extract<BarcodeResult, { ok: true }>,
  style: Pick<BarcodeStyle, 'height' | 'showText'>,
): BarcodeLayout {
  const quiet = format === 'code128' ? 10 : 11;
  const n = result.bits.length;
  const guards = guardModules(format, n);
  const textSize = format === 'code128' ? 9 : 10;
  const textGap = style.showText ? textSize + 3 : 0;
  const tall = format === 'code128' || !style.showText ? 0 : 5;
  const bars: BarcodeLayout['bars'] = [];
  for (let i = 0; i < n;) {
    if (result.bits[i] !== '1') {
      i++;
      continue;
    }
    let j = i;
    while (j < n && result.bits[j] === '1') j++;
    const long = [...Array(j - i).keys()].some((k) => guards.has(i + k));
    bars.push({ x: quiet + i, w: j - i, h: style.height + (long ? tall : 0) });
    i = j;
  }
  const texts = style.showText
    ? result.human.groups.map((g) => ({
        text: g.text,
        cx: quiet + g.x + g.width / 2,
        y: style.height + textSize,
        size: textSize,
      }))
    : [];
  return { width: n + quiet * 2, height: style.height + Math.max(textGap, tall) + 2, bars, texts };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function barcodeSvg(
  layout: BarcodeLayout,
  style: BarcodeStyle,
  title: string,
  pxPerModule = 3,
): string {
  const w = layout.width * pxPerModule;
  const h = layout.height * pxPerModule;
  const bars = layout.bars
    .map((b) => `<rect x="${b.x}" y="1" width="${b.w}" height="${b.h}"/>`)
    .join('');
  const texts = layout.texts
    .map(
      (t) =>
        `<text x="${t.cx}" y="${t.y + 1}" font-size="${t.size}" text-anchor="middle" font-family="'JetBrains Mono', ui-monospace, monospace">${esc(t.text)}</text>`,
    )
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${layout.width} ${layout.height}" shape-rendering="crispEdges" role="img">` +
    `<title>${esc(title)}</title><rect width="100%" height="100%" fill="${style.bg}"/>` +
    `<g fill="${style.fg}">${bars}${texts}</g></svg>`
  );
}

type Ctx = Pick<
  CanvasRenderingContext2D,
  | 'fillStyle'
  | 'fillRect'
  | 'fillText'
  | 'font'
  | 'textAlign'
  | 'textBaseline'
  | 'save'
  | 'restore'
  | 'scale'
>;

/** Draws onto a canvas sized layout.width*scale × layout.height*scale. */
export function drawBarcode(
  ctx: Ctx,
  layout: BarcodeLayout,
  style: BarcodeStyle,
  scale: number,
): void {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.fillStyle = style.bg;
  ctx.fillRect(0, 0, layout.width, layout.height);
  ctx.fillStyle = style.fg;
  for (const b of layout.bars) ctx.fillRect(b.x, 1, b.w, b.h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (const t of layout.texts) {
    ctx.font = `${t.size}px 'JetBrains Mono Variable', ui-monospace, monospace`;
    ctx.fillText(t.text, t.cx, t.y + 1);
  }
  ctx.restore();
}
