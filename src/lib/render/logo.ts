import { context2d, loadImageElement, makeCanvas } from '../decode/canvas';
import { canvasToBlob } from '../export';

export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
export const LOGO_MAX_BYTES = 5 * 1024 * 1024;
const MAX_SIDE = 512;

export interface ProcessedLogo {
  dataUrl: string;
  aspect: number;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('errors.image.unreadable'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Validates an uploaded logo and re-encodes it as a PNG of at most 512 px.
 * SVGs are rasterised this way, which drops any scripts, event handlers or
 * external references they might contain — they are never embedded as SVG.
 */
export async function processLogo(file: Blob): Promise<ProcessedLogo> {
  if (!LOGO_TYPES.includes(file.type)) throw new Error('errors.logo.type');
  if (file.size > LOGO_MAX_BYTES) throw new Error('errors.logo.size');
  const img = await loadImageElement(file);
  const w = img.naturalWidth || 512;
  const h = img.naturalHeight || 512;
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = makeCanvas(cw, ch);
  const ctx = context2d(canvas);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, cw, ch);
  const png = await canvasToBlob(canvas, 'image/png');
  return { dataUrl: await blobToDataUrl(png), aspect: cw / ch };
}

/** Rasterises one of our own built-in SVG icons to a PNG logo. */
export async function svgIconToLogo(svg: string): Promise<ProcessedLogo> {
  return processLogo(new Blob([svg], { type: 'image/svg+xml' }));
}
