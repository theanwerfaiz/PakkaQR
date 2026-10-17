import type { Geometry } from '../render/geometry';
import { geometryToSvg } from '../render/svg';
import { canvasFont, type Ctx2D } from '../render/canvas';
import { context2d, makeCanvas } from '../decode';
import { canvasToBlob } from './index';

export const MM_PER_INCH = 25.4;

type JsPdf = import('jspdf').jsPDF;

/** Loads jsPDF and svg2pdf on demand (they are large and only needed for PDFs). */
export async function loadPdfLib() {
  const [{ jsPDF }] = await Promise.all([import('jspdf'), import('svg2pdf.js')]);
  return jsPDF;
}

/**
 * Text is drawn as a high-resolution image rather than PDF text: PDF base
 * fonts cannot shape Devanagari or emoji, while the browser's canvas can.
 */
async function textImage(text: string, fontSizeMm: number, color: string, widthMm: number) {
  const pxPerMm = 600 / MM_PER_INCH;
  const w = Math.max(1, Math.ceil(widthMm * pxPerMm));
  const h = Math.max(1, Math.ceil(fontSizeMm * 1.6 * pxPerMm));
  const canvas = makeCanvas(w, h);
  const ctx = context2d(canvas) as unknown as Ctx2D;
  ctx.font = canvasFont(fontSizeMm * pxPerMm);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2);
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
): Promise<void> {
  const scale = widthMm / g.width;
  const vectorOnly: Geometry = { ...g, texts: [] };
  const svgText = geometryToSvg(vectorOnly, { pixelWidth: 1000 });
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
    const img = await textImage(t.text, t.fontSize * scale, t.color, g.width * scale);
    doc.addImage(
      img.bytes,
      'PNG',
      x + t.cx * scale - img.w / 2,
      y + t.cy * scale - img.h / 2,
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
