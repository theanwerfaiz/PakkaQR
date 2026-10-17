import { FONT_STACK } from '../render/geometry';

/*
 * Share cards: the QR code on a story / post sized image, ready for
 * Instagram, WhatsApp status or a printed poster. Drawn on a canvas on the
 * device; the caller supplies the already-rendered code as an image.
 */

export const cardFormats = ['story', 'post', 'square'] as const;
export type CardFormat = (typeof cardFormats)[number];

export const cardThemes = ['paper', 'ink', 'stamp', 'match'] as const;
export type CardTheme = (typeof cardThemes)[number];

export const CARD_SIZES: Record<CardFormat, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  post: { width: 1080, height: 1350 },
  square: { width: 1080, height: 1080 },
};

export interface CardOptions {
  format: CardFormat;
  theme: CardTheme;
  headline: string;
  subline: string;
  /** The stamp: "scan-tested / pakka". */
  stamp: boolean;
  /** Optional small credit line. Off by default: PakkaQR never watermarks. */
  credit: boolean;
  creditText: string;
  /** Stamp colour (the site's chosen accent). */
  stampColor: string;
  /** Code's own dark colour, used by the "match" theme. */
  codeColor: string;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CardLayout {
  width: number;
  height: number;
  sheet: Rect;
  qr: Rect;
  headlineY: number;
  headlineSize: number;
  sublineY: number;
  sublineSize: number;
  stamp: { cx: number; cy: number; r: number };
  creditY: number;
  textMaxWidth: number;
}

/** Pure layout: where everything goes for a format and code aspect ratio (height / width). */
export function cardLayout(format: CardFormat, qrAspect: number): CardLayout {
  const { width, height } = CARD_SIZES[format];
  const pad = width * 0.09;
  const textMaxWidth = width - pad * 2;
  const headlineSize = format === 'story' ? 96 : format === 'post' ? 80 : 68;
  const sublineSize = Math.round(headlineSize * 0.42);
  // Sheet width: as large as fits after the text block.
  const textBlock = headlineSize * 2.6 + sublineSize * 2.4;
  const maxSheetH = height - pad * 2 - textBlock;
  const sheetPad = width * 0.06;
  let qrW = Math.min(width - pad * 2 - sheetPad * 2, (maxSheetH - sheetPad * 2) / qrAspect);
  qrW = Math.max(200, qrW);
  const qrH = qrW * qrAspect;
  const sheetW = qrW + sheetPad * 2;
  const sheetH = qrH + sheetPad * 2;
  const blockH = headlineSize * 2.6 + sheetH + sublineSize * 2.4;
  const top = Math.max(pad, (height - blockH) / 2);
  const sheet = { x: (width - sheetW) / 2, y: top + headlineSize * 2.6, w: sheetW, h: sheetH };
  // The stamp sits on the sheet's top-right corner, entirely above the code
  // (its bottom edge stays above the code's top), so it never hides modules.
  const r = Math.min(width * 0.09, headlineSize * 1.1);
  return {
    width,
    height,
    sheet,
    qr: { x: sheet.x + sheetPad, y: sheet.y + sheetPad, w: qrW, h: qrH },
    headlineY: sheet.y - headlineSize * 1.6,
    headlineSize,
    sublineY: sheet.y + sheetH + sublineSize * 1.6,
    sublineSize,
    stamp: { cx: sheet.x + sheetW - r * 0.3, cy: sheet.y - r * 0.35, r },
    creditY: height - pad * 0.6,
    textMaxWidth,
  };
}

export interface CardColors {
  bg: string;
  text: string;
  muted: string;
  sheet: string;
}

export function cardColors(
  options: Pick<CardOptions, 'theme' | 'stampColor' | 'codeColor'>,
): CardColors {
  switch (options.theme) {
    case 'ink':
      return { bg: '#141210', text: '#EFE8DA', muted: '#B9AE99', sheet: '#FFFCF6' };
    case 'stamp':
      return { bg: options.stampColor, text: '#FFFCF6', muted: '#FFFCF6', sheet: '#FFFCF6' };
    case 'match':
      return { bg: options.codeColor, text: '#FFFFFF', muted: '#FFFFFF', sheet: '#FFFFFF' };
    default:
      return { bg: '#F4EFE6', text: '#1A1712', muted: '#4A4439', sheet: '#FFFCF6' };
  }
}

type Ctx = Pick<
  CanvasRenderingContext2D,
  | 'save'
  | 'restore'
  | 'fillStyle'
  | 'strokeStyle'
  | 'lineWidth'
  | 'font'
  | 'textAlign'
  | 'textBaseline'
  | 'fillRect'
  | 'fillText'
  | 'measureText'
  | 'beginPath'
  | 'arc'
  | 'fill'
  | 'stroke'
  | 'translate'
  | 'rotate'
  | 'drawImage'
  | 'roundRect'
  | 'setLineDash'
  | 'globalAlpha'
>;

const font = (weight: number, size: number) => `${weight} ${size}px ${FONT_STACK}`;

/** Shrinks text until it fits one line. */
function fitLine(ctx: Ctx, text: string, weight: number, size: number, maxWidth: number): number {
  ctx.font = font(weight, size);
  const w = ctx.measureText(text).width;
  return w > maxWidth ? Math.max(16, Math.floor((size * maxWidth) / w)) : size;
}

/** The rubber stamp, drawn at (cx, cy). Shared by cards and the video. */
export function drawStamp(
  ctx: Ctx,
  cx: number,
  cy: number,
  r: number,
  color: string,
  paper = 'rgba(255,252,246,0.9)',
  tiltDeg = -14,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((tiltDeg * Math.PI) / 180);
  ctx.fillStyle = paper;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.07;
  ctx.stroke();
  ctx.lineWidth = r * 0.03;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.83, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font(700, r * 0.16);
  ctx.fillText('SCAN-TESTED', 0, -r * 0.36);
  ctx.font = font(800, r * 0.46);
  ctx.fillText('PAKKA', 0, r * 0.06);
  ctx.font = font(700, r * 0.22);
  ctx.fillText('पक्का', 0, r * 0.44);
  ctx.restore();
}

/** Draws a full card. `qr` is the rendered code (any size; it's scaled to fit). */
export function drawCard(
  ctx: Ctx,
  qr: CanvasImageSource,
  qrAspect: number,
  options: CardOptions,
): void {
  const l = cardLayout(options.format, qrAspect);
  const c = cardColors(options);
  ctx.save();
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, l.width, l.height);

  ctx.fillStyle = c.sheet;
  ctx.beginPath();
  ctx.roundRect(l.sheet.x, l.sheet.y, l.sheet.w, l.sheet.h, l.width * 0.04);
  ctx.fill();
  ctx.drawImage(qr, l.qr.x, l.qr.y, l.qr.w, l.qr.h);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const headline = options.headline.trim();
  if (headline) {
    const size = fitLine(ctx, headline, 760, l.headlineSize, l.textMaxWidth);
    ctx.font = font(760, size);
    ctx.fillStyle = c.text;
    ctx.fillText(headline, l.width / 2, l.headlineY);
  }
  const subline = options.subline.trim();
  if (subline) {
    const size = fitLine(ctx, subline, 500, l.sublineSize, l.textMaxWidth);
    ctx.font = font(500, size);
    ctx.fillStyle = c.muted;
    ctx.fillText(subline, l.width / 2, l.sublineY);
  }
  if (options.stamp)
    drawStamp(
      ctx,
      l.stamp.cx,
      l.stamp.cy,
      l.stamp.r,
      options.theme === 'stamp' ? '#1A1712' : options.stampColor,
    );
  if (options.credit && options.creditText) {
    ctx.font = font(500, 26);
    ctx.fillStyle = c.muted;
    ctx.globalAlpha = 0.8;
    ctx.fillText(options.creditText, l.width / 2, l.creditY);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
