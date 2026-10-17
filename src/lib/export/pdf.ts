import type { Geometry } from '../render/geometry';
import { geometryToSvg } from '../render/svg';
import { canvasFont, type Ctx2D } from '../render/canvas';
import { context2d, makeCanvas } from '../decode/canvas';
import { canvasToBlob } from './index';

export const MM_PER_INCH = 25.4;

type JsPdf = import('jspdf').jsPDF;

/** Loads jsPDF and svg2pdf on demand (they are large and only needed for PDFs). */
export async function loadPdfLib() {
  const [{ jsPDF }] = await Promise.all([import('jspdf'), import('svg2pdf.js')]);
  return jsPDF;
}

export interface TextImageOptions {
  text: string;
  /** Font size in mm. */
  sizeMm: number;
  color: string;
  /** Box width in mm. */
  widthMm: number;
  bold?: boolean;
  align?: 'center' | 'left';
  rotate180?: boolean;
}

/**
 * Text is drawn as a high-resolution image rather than PDF text: PDF base
 * fonts cannot shape Devanagari or emoji, while the browser's canvas can.
 * The font shrinks to fit the box width.
 */
export async function textImage(o: TextImageOptions) {
  const pxPerMm = 600 / MM_PER_INCH;
  const w = Math.max(1, Math.ceil(o.widthMm * pxPerMm));
  let fontPx = o.sizeMm * pxPerMm;
  const h = Math.max(1, Math.ceil(fontPx * 1.6));
  const canvas = makeCanvas(w, h);
  const ctx = context2d(canvas) as unknown as Ctx2D;
  const font = (px: number) => (o.bold ? canvasFont(px) : canvasFont(px).replace(/^\d+/, '500'));
  ctx.font = font(fontPx);
  const measured = ctx.measureText(o.text).width;
  if (measured > w) {
    fontPx = (fontPx * w) / measured;
    ctx.font = font(fontPx);
  }
  const c = ctx as unknown as CanvasRenderingContext2D;
  if (o.rotate180) {
    c.translate(w, h);
    c.rotate(Math.PI);
  }
  ctx.fillStyle = o.color;
  ctx.textAlign = o.align === 'left' ? 'left' : 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(o.text, o.align === 'left' ? 0 : w / 2, h / 2);
  const blob = await canvasToBlob(canvas, 'image/png');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return { bytes, w: w / pxPerMm, h: h / pxPerMm };
}

/**
 * Places a code on a PDF page as vector paths (svg2pdf), at `widthMm`
 * wide with its top-left corner at (x, y) in mm.
 */
export async function placeCode(
  doc: JsPdf,
  g: Geometry,
  x: number,
  y: number,
  widthMm: number,
  rotate180 = false,
): Promise<void> {
  const scale = widthMm / g.width;
  const vectorOnly: Geometry = { ...g, texts: [] };
  const svgText = geometryToSvg(vectorOnly, { pixelWidth: 1000, rotate180 });
  const svg = new DOMParser().parseFromString(svgText, 'image/svg+xml').documentElement;
  // svg2pdf needs the element in a document to resolve styles.
  const holder = document.createElement('div');
  holder.style.cssText = 'position:absolute;left:-99999px;top:0;width:0;height:0;overflow:hidden';
  holder.append(svg);
  document.body.append(holder);
  try {
    await doc.svg(svg, { x, y, width: widthMm, height: g.height * scale });
  } finally {
    holder.remove();
  }
  for (const t of g.texts) {
    const img = await textImage({
      text: t.text,
      sizeMm: t.fontSize * scale,
      color: t.color,
      widthMm: g.width * scale,
      bold: true,
      rotate180,
    });
    const cx = rotate180 ? g.width - t.cx : t.cx;
    const cy = rotate180 ? g.height - t.cy : t.cy;
    doc.addImage(
      img.bytes,
      'PNG',
      x + cx * scale - img.w / 2,
      y + cy * scale - img.h / 2,
      img.w,
      img.h,
    );
  }
}

export interface SinglePdfOptions {
  /** Printed width of the whole image (frame included), in mm. */
  widthMm: number;
  title: string;
}

/** A4 page with the code centred at an exact physical size. */
export async function exportPdf(g: Geometry, options: SinglePdfOptions): Promise<Blob> {
  const jsPDF = await loadPdfLib();
  const pageW = 210;
  const pageH = 297;
  const width = Math.min(options.widthMm, pageW - 20);
  const height = (g.height / g.width) * width;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  doc.setProperties({ title: options.title, creator: 'PakkaQR' });
  await placeCode(doc, g, (pageW - width) / 2, Math.max(10, (pageH - height) / 2), width);
  return doc.output('blob');
}
