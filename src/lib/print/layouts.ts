/*
 * Print layouts as pure geometry in millimetres. The PDF builder only
 * draws what these functions return, so physical sizes are testable.
 */

export type PaperId = 'a4' | 'letter' | 'a3';
export type LayoutId = 'stickers' | 'tent' | 'poster' | 'cards' | 'wifi';

export interface Paper {
  id: PaperId;
  width: number;
  height: number;
}

export const PAPERS: Record<PaperId, Paper> = {
  a4: { id: 'a4', width: 210, height: 297 },
  letter: { id: 'letter', width: 215.9, height: 279.4 },
  a3: { id: 'a3', width: 297, height: 420 },
};

export const MM_PER_INCH = 25.4;

/** A code placed on the page; `size` is the printed width of the whole image. */
export interface CodeItem {
  kind: 'code';
  x: number;
  y: number;
  size: number;
  rotate180?: boolean;
}

export interface TextItem {
  kind: 'text';
  text: string;
  /** Centre x, centre y. */
  cx: number;
  cy: number;
  /** Font size in mm (cap height ≈ 0.7 × this). */
  size: number;
  maxWidth: number;
  bold?: boolean;
  align?: 'center' | 'left';
  /** For left-aligned text, x is the left edge. */
  x?: number;
  rotate180?: boolean;
}

export interface LineItem {
  kind: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dashed?: boolean;
}

export interface RectItem {
  kind: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
}

export type PageItem = CodeItem | TextItem | LineItem | RectItem;

export interface PageLayout {
  paper: Paper;
  orientation: 'portrait' | 'landscape';
  items: PageItem[];
}

export interface LayoutTexts {
  headline: string;
  subtext: string;
  /** Business card lines. */
  name: string;
  title: string;
  /** WiFi card. */
  networkLabel: string;
  passwordLabel: string;
  ssid: string;
  password: string;
}

export interface LayoutOptions {
  paper: PaperId;
  /** Sticker code size in cm (2–10). */
  stickerCm: number;
  /** Sticker gap in mm. */
  gapMm: number;
  /** Business card size. */
  cardSize: 'eu' | 'us';
  /** Cut guides around stickers and cards. */
  cutLines: boolean;
}

export const PAGE_MARGIN = 10;

// ---------------------------------------------------------------- stickers

export function stickerGrid(paper: Paper, sizeMm: number, gapMm: number, margin = PAGE_MARGIN) {
  const usableW = paper.width - margin * 2;
  const usableH = paper.height - margin * 2;
  const cols = Math.max(1, Math.floor((usableW + gapMm) / (sizeMm + gapMm)));
  const rows = Math.max(1, Math.floor((usableH + gapMm) / (sizeMm + gapMm)));
  const gridW = cols * sizeMm + (cols - 1) * gapMm;
  const gridH = rows * sizeMm + (rows - 1) * gapMm;
  const x0 = (paper.width - gridW) / 2;
  const y0 = (paper.height - gridH) / 2;
  const cells: Array<{ x: number; y: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++)
      cells.push({ x: x0 + c * (sizeMm + gapMm), y: y0 + r * (sizeMm + gapMm) });
  }
  return { cols, rows, cells };
}

function stickers(o: LayoutOptions): PageLayout {
  const paper = PAPERS[o.paper];
  const size = Math.min(100, Math.max(20, o.stickerCm * 10));
  const { cells } = stickerGrid(paper, size, o.gapMm);
  const items: PageItem[] = [];
  for (const cell of cells) {
    items.push({ kind: 'code', x: cell.x, y: cell.y, size });
    if (o.cutLines)
      items.push({
        kind: 'rect',
        x: cell.x - 1,
        y: cell.y - 1,
        w: size + 2,
        h: size + 2,
        radius: 1.5,
      });
  }
  return { paper, orientation: 'portrait', items };
}

// ---------------------------------------------------------------- table tent

/** A4 folded across the middle: the top half is upside down so both sides read when standing. */
function tent(t: LayoutTexts): PageLayout {
  const paper = PAPERS.a4;
  const half = paper.height / 2;
  const code = 80;
  const items: PageItem[] = [
    { kind: 'line', x1: 0, y1: half, x2: paper.width, y2: half, dashed: true },
  ];
  // Bottom half (reads normally).
  const bottom = (y0: number): PageItem[] => [
    {
      kind: 'text',
      text: t.headline,
      cx: paper.width / 2,
      cy: y0 + 22,
      size: 11,
      maxWidth: 180,
      bold: true,
    },
    { kind: 'code', x: (paper.width - code) / 2, y: y0 + 34, size: code },
    { kind: 'text', text: t.subtext, cx: paper.width / 2, cy: y0 + 128, size: 6, maxWidth: 180 },
  ];
  items.push(...bottom(half));
  // Top half: same content mirrored around the page centre and rotated 180°.
  for (const item of bottom(half)) {
    if (item.kind === 'code')
      items.push({
        ...item,
        y: paper.height - item.y - item.size,
        x: paper.width - item.x - item.size,
        rotate180: true,
      });
    if (item.kind === 'text')
      items.push({
        ...item,
        cy: paper.height - item.cy,
        cx: paper.width - item.cx,
        rotate180: true,
      });
  }
  return { paper, orientation: 'portrait', items };
}

// ---------------------------------------------------------------- poster

function poster(o: LayoutOptions, t: LayoutTexts): PageLayout {
  const paper = PAPERS[o.paper === 'a3' ? 'a3' : o.paper];
  const s = paper.width / 210; // scale with paper
  const code = 140 * s;
  return {
    paper,
    orientation: 'portrait',
    items: [
      {
        kind: 'text',
        text: t.headline,
        cx: paper.width / 2,
        cy: 45 * s,
        size: 18 * s,
        maxWidth: paper.width - 30,
        bold: true,
      },
      { kind: 'code', x: (paper.width - code) / 2, y: 70 * s, size: code },
      {
        kind: 'text',
        text: t.subtext,
        cx: paper.width / 2,
        cy: 70 * s + code + 22 * s,
        size: 8 * s,
        maxWidth: paper.width - 30,
      },
    ],
  };
}

// ---------------------------------------------------------------- business cards

export const CARD_SIZES = {
  eu: { w: 85, h: 55 },
  us: { w: 3.5 * MM_PER_INCH, h: 2 * MM_PER_INCH },
};

/** 10-up: 2 columns × 5 rows, centred. */
export function cardGrid(paper: Paper, card: { w: number; h: number }) {
  const cols = 2;
  const rows = 5;
  const x0 = (paper.width - cols * card.w) / 2;
  const y0 = (paper.height - rows * card.h) / 2;
  const cells: Array<{ x: number; y: number }> = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) cells.push({ x: x0 + c * card.w, y: y0 + r * card.h });
  return cells;
}

function cards(o: LayoutOptions, t: LayoutTexts): PageLayout {
  const paper = PAPERS[o.cardSize === 'us' ? 'letter' : 'a4'];
  const card = CARD_SIZES[o.cardSize];
  const items: PageItem[] = [];
  const pad = 5;
  const code = card.h - pad * 2;
  for (const cell of cardGrid(paper, card)) {
    items.push({ kind: 'code', x: cell.x + pad, y: cell.y + pad, size: code });
    const textX = cell.x + pad * 2 + code;
    const textW = card.w - code - pad * 3;
    items.push({
      kind: 'text',
      text: t.name,
      x: textX,
      cx: textX + textW / 2,
      cy: cell.y + card.h / 2 - 4,
      size: 4.2,
      maxWidth: textW,
      bold: true,
      align: 'left',
    });
    items.push({
      kind: 'text',
      text: t.title,
      x: textX,
      cx: textX + textW / 2,
      cy: cell.y + card.h / 2 + 3,
      size: 3,
      maxWidth: textW,
      align: 'left',
    });
    if (o.cutLines)
      items.push({ kind: 'rect', x: cell.x, y: cell.y, w: card.w, h: card.h, radius: 0 });
  }
  return { paper, orientation: 'portrait', items };
}

// ---------------------------------------------------------------- WiFi card

/** Four 100 × 70 mm cards per page, code on the left, network details on the right. */
function wifi(o: LayoutOptions, t: LayoutTexts): PageLayout {
  const paper = PAPERS[o.paper === 'letter' ? 'letter' : 'a4'];
  const card = { w: 100, h: 70 };
  const x0 = (paper.width - card.w * 2) / 2;
  const y0 = 20;
  const items: PageItem[] = [];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      const x = x0 + c * card.w;
      const y = y0 + r * (card.h + 10);
      const code = 50;
      items.push({ kind: 'rect', x, y, w: card.w, h: card.h, radius: 4 });
      items.push({
        kind: 'text',
        text: t.headline,
        cx: x + card.w / 2,
        cy: y + 8,
        size: 4.5,
        maxWidth: card.w - 8,
        bold: true,
      });
      items.push({ kind: 'code', x: x + 4, y: y + 15, size: code });
      const tx = x + code + 8;
      const tw = card.w - code - 12;
      items.push({
        kind: 'text',
        text: t.networkLabel,
        x: tx,
        cx: tx + tw / 2,
        cy: y + 24,
        size: 2.8,
        maxWidth: tw,
        align: 'left',
      });
      items.push({
        kind: 'text',
        text: t.ssid,
        x: tx,
        cx: tx + tw / 2,
        cy: y + 30,
        size: 3.6,
        maxWidth: tw,
        bold: true,
        align: 'left',
      });
      items.push({
        kind: 'text',
        text: t.passwordLabel,
        x: tx,
        cx: tx + tw / 2,
        cy: y + 42,
        size: 2.8,
        maxWidth: tw,
        align: 'left',
      });
      items.push({
        kind: 'text',
        text: t.password,
        x: tx,
        cx: tx + tw / 2,
        cy: y + 48,
        size: 3.6,
        maxWidth: tw,
        bold: true,
        align: 'left',
      });
    }
  }
  return { paper, orientation: 'portrait', items };
}

export function buildLayout(
  layout: LayoutId,
  options: LayoutOptions,
  texts: LayoutTexts,
): PageLayout {
  switch (layout) {
    case 'stickers':
      return stickers(options);
    case 'tent':
      return tent(texts);
    case 'poster':
      return poster(options, texts);
    case 'cards':
      return cards(options, texts);
    case 'wifi':
      return wifi(options, texts);
  }
}
