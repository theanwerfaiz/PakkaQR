import { resolveEcLevel, type DotStyle, type QrDesign } from './design';
import { isFinderModule, makeMatrix, type QrMatrix } from './matrix';
import { circlePath, fmt, polygonPath, rectPath, type Radii } from './paths';

export type Paint =
  | { type: 'solid'; color: string }
  | { type: 'linear'; x1: number; y1: number; x2: number; y2: number; colors: [string, string] }
  | { type: 'radial'; cx: number; cy: number; r: number; colors: [string, string] };

export interface Layer {
  d: string;
  paint: Paint;
  fillRule?: 'evenodd';
}

export interface TextItem {
  text: string;
  /** Centre of the text box. */
  cx: number;
  cy: number;
  fontSize: number;
  color: string;
}

export interface LogoPlacement {
  href: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Everything needed to draw a code, in module units (1 unit = 1 module). */
export interface Geometry {
  width: number;
  height: number;
  /** Area holding the code and its quiet zone. */
  qrBox: { x: number; y: number; size: number };
  layers: Layer[];
  logo?: LogoPlacement;
  texts: TextItem[];
  matrix: QrMatrix;
  /** Fraction of symbol modules hidden behind the logo. */
  hiddenRatio: number;
}

/** Measures text width in the same unit as fontSize. */
export type MeasureText = (text: string, fontSize: number) => number;

export const FONT_STACK =
  "'Anek Latin Variable', 'Anek Devanagari Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
export const FONT_WEIGHT = 700;

/** Rough width estimate used when no real text measurer is available. */
export const estimateText: MeasureText = (text, fontSize) => [...text].length * fontSize * 0.6;

// ---------------------------------------------------------------- dots

interface Neighbours {
  t: boolean;
  r: boolean;
  b: boolean;
  l: boolean;
}

function dotPath(style: DotStyle, x: number, y: number, n: Neighbours): string {
  if (style === 'square') return rectPath(x, y, 1, 1);
  if (style === 'dots') return circlePath(x + 0.5, y + 0.5, 0.5);
  const tl = !n.t && !n.l;
  const tr = !n.t && !n.r;
  const br = !n.b && !n.r;
  const bl = !n.b && !n.l;
  let radii: Radii;
  switch (style) {
    case 'rounded':
      radii = [tl ? 0.35 : 0, tr ? 0.35 : 0, br ? 0.35 : 0, bl ? 0.35 : 0];
      break;
    case 'extra-rounded':
      radii = [tl ? 0.5 : 0, tr ? 0.5 : 0, br ? 0.5 : 0, bl ? 0.5 : 0];
      break;
    case 'classy':
      radii = [tl ? 0.5 : 0, 0, br ? 0.5 : 0, 0];
      break;
    case 'classy-rounded':
      radii = [tl ? 0.5 : 0, tr ? 0.2 : 0, br ? 0.5 : 0, bl ? 0.2 : 0];
      break;
  }
  return rectPath(x, y, 1, 1, radii);
}

function cornerSquarePath(style: QrDesign['cornerSquareStyle'], x: number, y: number): string {
  if (style === 'dot') return circlePath(x + 3.5, y + 3.5, 3.5) + circlePath(x + 3.5, y + 3.5, 2.5);
  const [outer, inner] = style === 'extra-rounded' ? [2.5, 1.5] : [0, 0];
  const o: Radii = [outer, outer, outer, outer];
  const i: Radii = [inner, inner, inner, inner];
  return rectPath(x, y, 7, 7, o) + rectPath(x + 1, y + 1, 5, 5, i);
}

function cornerDotPath(style: QrDesign['cornerDotStyle'], x: number, y: number): string {
  return style === 'dot' ? circlePath(x + 3.5, y + 3.5, 1.5) : rectPath(x + 2, y + 2, 3, 3);
}

function fgPaint(design: QrDesign, x: number, y: number, size: number): Paint {
  const g = design.gradient;
  if (!g) return { type: 'solid', color: design.fg };
  const cx = x + size / 2;
  const cy = y + size / 2;
  if (g.kind === 'radial')
    return { type: 'radial', cx, cy, r: (size / 2) * Math.SQRT2, colors: g.colors };
  const a = (g.angle * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const half = (size / 2) * (Math.abs(dx) + Math.abs(dy));
  return {
    type: 'linear',
    x1: cx - dx * half,
    y1: cy - dy * half,
    x2: cx + dx * half,
    y2: cy + dy * half,
    colors: g.colors,
  };
}

// ---------------------------------------------------------------- frames

interface FrameLayout {
  width: number;
  height: number;
  qrX: number;
  qrY: number;
  /** Corner radius of the code's background card. */
  qrRadius: number;
  before: Layer[];
  after: Layer[];
  texts: TextItem[];
}

function fitText(text: string, maxWidth: number, fontSize: number, measure: MeasureText): number {
  const width = measure(text, fontSize);
  return width > maxWidth ? (fontSize * maxWidth) / width : fontSize;
}

export const frameIds = [
  'none',
  'box-bottom',
  'rounded-bottom',
  'banner-top',
  'speech-bubble',
  'phone',
  'pill',
  'ticket',
  'sticker',
] as const;
export type FrameId = (typeof frameIds)[number];

function layoutFrame(design: QrDesign, s: number, measure: MeasureText): FrameLayout {
  const frame = design.frame;
  const none: FrameLayout = {
    width: s,
    height: s,
    qrX: 0,
    qrY: 0,
    qrRadius: 0,
    before: [],
    after: [],
    texts: [],
  };
  if (!frame || frame.id === 'none') return none;

  const fc: Paint = { type: 'solid', color: frame.frameColor };
  const bg: Paint = { type: 'solid', color: design.bg };
  const label = frame.label.trim();
  const t = Math.max(1, s * 0.035);
  const labelH = label ? s * 0.2 : 0;
  const baseFont = s * 0.105;
  const text = (cx: number, cy: number, maxW: number, color: string): TextItem[] =>
    label
      ? [{ text: label, cx, cy, color, fontSize: fitText(label, maxW, baseFont, measure) }]
      : [];

  switch (frame.id) {
    case 'box-bottom':
    case 'rounded-bottom': {
      const rounded = frame.id === 'rounded-bottom';
      const pad = rounded ? s * 0.05 : t;
      const w = s + pad * 2;
      const h = s + pad * 2 + labelH;
      const r = rounded ? s * 0.08 : 0;
      const inner = rounded ? s * 0.04 : 0;
      return {
        width: w,
        height: h,
        qrX: pad,
        qrY: pad,
        qrRadius: inner,
        before: [{ d: rectPath(0, 0, w, h, [r, r, r, r]), paint: fc }],
        after: [],
        texts: text(w / 2, s + pad + labelH / 2 - pad * 0.15, w - pad * 4, frame.labelColor),
      };
    }
    case 'banner-top': {
      const w = s + t * 2;
      const top = labelH || t;
      const h = s + t + top;
      const r = s * 0.03;
      return {
        width: w,
        height: h,
        qrX: t,
        qrY: top,
        qrRadius: 0,
        before: [{ d: rectPath(0, 0, w, h, [r, r, r, r]), paint: fc }],
        after: [],
        texts: text(w / 2, top / 2 + t * 0.15, w - t * 4, frame.labelColor),
      };
    }
    case 'speech-bubble': {
      const gap = s * 0.06;
      const tail = s * 0.07;
      const bubbleH = labelH || s * 0.12;
      const w = s + t * 2;
      const bubbleY = s + t * 2 + gap + tail;
      const h = bubbleY + bubbleH;
      const r = s * 0.05;
      const cx = w / 2;
      const ring =
        rectPath(0, 0, w, s + t * 2, [r, r, r, r]) +
        rectPath(t, t, s, s, [r * 0.6, r * 0.6, r * 0.6, r * 0.6]);
      return {
        width: w,
        height: h,
        qrX: t,
        qrY: t,
        qrRadius: r * 0.6,
        before: design.transparentBg ? [] : [{ d: rectPath(0, 0, w, h, [r, r, r, r]), paint: bg }],
        after: [
          { d: ring, paint: fc, fillRule: 'evenodd' },
          { d: rectPath(0, bubbleY, w, bubbleH, [r, r, r, r]), paint: fc },
          {
            d: polygonPath([
              [cx - tail, bubbleY + 0.01],
              [cx, bubbleY - tail],
              [cx + tail, bubbleY + 0.01],
            ]),
            paint: fc,
          },
        ],
        texts: text(cx, bubbleY + bubbleH / 2, w - t * 4, frame.labelColor),
      };
    }
    case 'phone': {
      const side = s * 0.07;
      const top = s * 0.16;
      const bottom = Math.max(labelH, s * 0.1) + s * 0.04;
      const w = s + side * 2;
      const h = top + s + bottom;
      const r = s * 0.14;
      const sr = s * 0.04;
      const notchW = s * 0.22;
      const notchH = s * 0.035;
      return {
        width: w,
        height: h,
        qrX: side,
        qrY: top,
        qrRadius: sr,
        before: [
          { d: rectPath(0, 0, w, h, [r, r, r, r]), paint: fc },
          {
            d: rectPath((w - notchW) / 2, top / 2 - notchH / 2, notchW, notchH, [
              notchH / 2,
              notchH / 2,
              notchH / 2,
              notchH / 2,
            ]),
            paint: { type: 'solid', color: frame.labelColor },
          },
        ],
        after: [],
        texts: text(w / 2, top + s + bottom / 2, w - side * 3, frame.labelColor),
      };
    }
    case 'pill': {
      // Thin ring around the code with a pill-shaped label hanging below.
      const pad = s * 0.05;
      const ring = Math.max(1, s * 0.022);
      const pillH = Math.max(labelH, s * 0.14) * 0.9;
      const gap = s * 0.04;
      const w = s + pad * 2;
      const pillW = label ? Math.min(w, measure(label, baseFont) + s * 0.16) : w * 0.5;
      const h = s + pad * 2 + gap + pillH;
      const r = s * 0.07;
      const box = s + pad * 2;
      return {
        width: w,
        height: h,
        qrX: pad,
        qrY: pad,
        qrRadius: s * 0.03,
        before: design.transparentBg
          ? []
          : [{ d: rectPath(0, 0, box, box, [r, r, r, r]), paint: bg }],
        after: [
          {
            d:
              rectPath(0, 0, box, box, [r, r, r, r]) +
              rectPath(ring, ring, box - ring * 2, box - ring * 2, [
                r - ring,
                r - ring,
                r - ring,
                r - ring,
              ]),
            paint: fc,
            fillRule: 'evenodd',
          },
          {
            d: rectPath((w - pillW) / 2, box + gap, pillW, pillH, [
              pillH / 2,
              pillH / 2,
              pillH / 2,
              pillH / 2,
            ]),
            paint: fc,
          },
        ],
        texts: text(w / 2, box + gap + pillH / 2, pillW - s * 0.08, frame.labelColor),
      };
    }
    case 'ticket': {
      // Admit-one style: label stub below a perforation, with round notches.
      const pad = s * 0.06;
      const stub = Math.max(labelH, s * 0.12) + pad * 0.6;
      const w = s + pad * 2;
      const cut = s + pad * 2;
      const h = cut + stub;
      const r = s * 0.04;
      const notch = s * 0.045;
      // Half-disc notches cut into each side (drawn as inner half circles only).
      let holes =
        `M0 ${fmt(cut - notch)}A${fmt(notch)} ${fmt(notch)} 0 0 1 0 ${fmt(cut + notch)}Z` +
        `M${fmt(w)} ${fmt(cut - notch)}A${fmt(notch)} ${fmt(notch)} 0 0 0 ${fmt(w)} ${fmt(cut + notch)}Z`;
      const dash = s * 0.035;
      for (let x = notch * 1.6; x + dash < w - notch * 1.6; x += dash * 2)
        holes += rectPath(x, cut - t * 0.25, dash, t * 0.5);
      return {
        width: w,
        height: h,
        qrX: pad,
        qrY: pad,
        qrRadius: s * 0.02,
        before: [{ d: rectPath(0, 0, w, h, [r, r, r, r]) + holes, paint: fc, fillRule: 'evenodd' }],
        after: [],
        texts: text(w / 2, cut + stub / 2, w - pad * 3, frame.labelColor),
      };
    }
    case 'sticker': {
      // Round die-cut sticker: a disc with the code inside and a label arc area below.
      const qrSide = s;
      const diameter = qrSide * Math.SQRT2 + s * 0.08;
      const w = diameter;
      const h = diameter;
      const c = diameter / 2;
      const qrX = c - qrSide / 2;
      const qrY = c - qrSide / 2 - (label ? s * 0.05 : 0);
      const bandH = s * 0.15;
      const bandY = qrY + qrSide + s * 0.015;
      return {
        width: w,
        height: h,
        qrX,
        qrY,
        qrRadius: s * 0.03,
        before: [{ d: circlePath(c, c, c), paint: fc }],
        after: [],
        texts: label
          ? [
              {
                text: label,
                cx: c,
                cy: bandY + bandH / 2,
                color: frame.labelColor,
                fontSize: fitText(label, qrSide * 0.85, baseFont * 0.85, measure),
              },
            ]
          : [],
      };
    }
    default:
      return none;
  }
}

// ---------------------------------------------------------------- build

export interface BuildOptions {
  measure?: MeasureText;
}

/**
 * Lays out a QR code with its design. Throws PayloadTooLongError when the
 * payload does not fit at the chosen error-correction level.
 */
export function buildGeometry(
  payload: string,
  design: QrDesign,
  options: BuildOptions = {},
): Geometry {
  const matrix = makeMatrix(payload, resolveEcLevel(design));
  const n = matrix.size;
  const m = design.margin;
  const s = n + m * 2;
  const frame = layoutFrame(design, s, options.measure ?? estimateText);
  const ox = frame.qrX + m; // symbol origin
  const oy = frame.qrY + m;

  // Modules hidden behind the logo.
  let hidden = (_r: number, _c: number) => false;
  let logo: LogoPlacement | undefined;
  let hiddenCount = 0;
  if (design.logo) {
    const box = design.logo.sizeRatio * n;
    const aspect = design.logo.aspect || 1;
    const w = aspect >= 1 ? box : box * aspect;
    const h = aspect >= 1 ? box / aspect : box;
    const cx = n / 2;
    logo = { href: design.logo.dataUrl, x: ox + cx - w / 2, y: oy + cx - h / 2, w, h };
    if (design.logo.hideBackgroundDots) {
      const halfW = w / 2 + design.logo.margin;
      const halfH = h / 2 + design.logo.margin;
      hidden = (r, c) =>
        Math.abs(c + 0.5 - cx) < halfW &&
        Math.abs(r + 0.5 - cx) < halfH &&
        !isFinderModule(n, r, c);
    }
  }

  const isData = (r: number, c: number) =>
    r >= 0 &&
    c >= 0 &&
    r < n &&
    c < n &&
    matrix.dark[r]![c]! &&
    !isFinderModule(n, r, c) &&
    !hidden(r, c);

  let dots = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (hidden(r, c)) hiddenCount++;
      if (!isData(r, c)) continue;
      const nb = {
        t: isData(r - 1, c),
        r: isData(r, c + 1),
        b: isData(r + 1, c),
        l: isData(r, c - 1),
      };
      dots += dotPath(design.dotStyle, ox + c, oy + r, nb);
    }
  }

  let squares = '';
  let cornerDots = '';
  for (const [r, c] of [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ] as const) {
    squares += cornerSquarePath(design.cornerSquareStyle, ox + c, oy + r);
    cornerDots += cornerDotPath(design.cornerDotStyle, ox + c, oy + r);
  }

  const dotPaint = fgPaint(design, ox, oy, n);
  const cornerPaint: Paint = design.cornerColor
    ? { type: 'solid', color: design.cornerColor }
    : dotPaint;
  const layers: Layer[] = [...frame.before];
  if (!design.transparentBg) {
    const qr = frame.qrRadius;
    layers.push({
      d: rectPath(frame.qrX, frame.qrY, s, s, [qr, qr, qr, qr]),
      paint: { type: 'solid', color: design.bg },
    });
  }
  if (dots) layers.push({ d: dots, paint: dotPaint });
  layers.push({ d: squares, paint: cornerPaint, fillRule: 'evenodd' });
  layers.push({ d: cornerDots, paint: cornerPaint });
  layers.push(...frame.after);

  const geometry: Geometry = {
    width: frame.width,
    height: frame.height,
    qrBox: { x: frame.qrX, y: frame.qrY, size: s },
    layers,
    texts: frame.texts,
    matrix,
    hiddenRatio: hiddenCount / (n * n),
  };
  if (logo) geometry.logo = logo;
  return geometry;
}
