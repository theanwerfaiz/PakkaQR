import { loadPdfLib, placeCode, textImage } from '../export/pdf';
import type { Geometry } from '../render/geometry';
import type { PageLayout } from './layouts';

/**
 * Renders a page layout to a PDF at exact physical size (1 PDF unit = 1 mm).
 * Codes are vector; text is high-resolution images so every script prints.
 */
export async function layoutToPdf(layout: PageLayout, g: Geometry, title: string): Promise<Blob> {
  const jsPDF = await loadPdfLib();
  const { paper } = layout;
  const doc = new jsPDF({
    unit: 'mm',
    format: [paper.width, paper.height],
    orientation: 'portrait',
    compress: true,
  });
  doc.setProperties({ title, creator: 'PakkaQR' });
  doc.setDrawColor(170);
  doc.setLineWidth(0.2);
  for (const item of layout.items) {
    switch (item.kind) {
      case 'code': {
        // The image (frame included) is fitted into a size × size square, so a
        // frameless code prints exactly `size` mm wide.
        const w = g.height > g.width ? (item.size * g.width) / g.height : item.size;
        const h = (w * g.height) / g.width;
        await placeCode(
          doc,
          g,
          item.x + (item.size - w) / 2,
          item.y + (item.size - h) / 2,
          w,
          item.rotate180,
        );
        break;
      }
      case 'text': {
        if (!item.text.trim()) break;
        const align = item.align ?? 'center';
        const img = await textImage({
          text: item.text,
          sizeMm: item.size,
          color: '#111111',
          widthMm: item.maxWidth,
          bold: !!item.bold,
          align,
          ...(item.rotate180 ? { rotate180: true } : {}),
        });
        const x = align === 'left' && item.x !== undefined ? item.x : item.cx - img.w / 2;
        doc.addImage(img.bytes, 'PNG', x, item.cy - img.h / 2, img.w, img.h);
        break;
      }
      case 'line':
        doc.setLineDashPattern(item.dashed ? [2, 2] : [], 0);
        doc.line(item.x1, item.y1, item.x2, item.y2);
        doc.setLineDashPattern([], 0);
        break;
      case 'rect':
        if (item.radius > 0)
          doc.roundedRect(item.x, item.y, item.w, item.h, item.radius, item.radius, 'S');
        else doc.rect(item.x, item.y, item.w, item.h, 'S');
        break;
    }
  }
  return doc.output('blob');
}

/** A multi-page PDF with one code per page (batch export). */
export async function codesToPdf(
  images: Array<{ png: Uint8Array; aspect: number; caption: string }>,
  widthMm: number,
  title: string,
): Promise<Blob> {
  const jsPDF = await loadPdfLib();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title, creator: 'PakkaQR' });
  for (let i = 0; i < images.length; i++) {
    const img = images[i]!;
    if (i > 0) doc.addPage('a4');
    const w = Math.min(widthMm, 190);
    const h = w / img.aspect;
    doc.addImage(img.png, 'PNG', (210 - w) / 2, 40, w, h);
    const caption = await textImage({
      text: img.caption,
      sizeMm: 4,
      color: '#444444',
      widthMm: 190,
    });
    doc.addImage(caption.bytes, 'PNG', 10, 40 + h + 8, caption.w, caption.h);
  }
  return doc.output('blob');
}
