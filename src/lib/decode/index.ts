import jsQR from 'jsqr';
import { context2d, loadImageElement, makeCanvas } from './canvas';

export { context2d, loadImageElement, makeCanvas } from './canvas';

export interface DecodeResult {
  text: string;
  version: number;
}

const utf8 = new TextDecoder('utf-8', { fatal: true });

/** Decodes a QR code from RGBA pixels. Tries normal and inverted (light-on-dark) codes. */
export function decodePixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): DecodeResult | null {
  const found = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
  if (!found) return null;
  let text = found.data;
  try {
    // Byte-mode payloads are UTF-8; decode the raw bytes ourselves for exactness.
    if (found.binaryData.length) text = utf8.decode(Uint8Array.from(found.binaryData));
  } catch {
    // Not valid UTF-8 (e.g. Latin-1 or Shift-JIS code from elsewhere): keep jsQR's reading.
  }
  return { text, version: found.version };
}

/**
 * jsQR first (fast, always loaded), then ZXing (lazy-loaded) when jsQR
 * misses. jsQR struggles with round dot styles that phone cameras read fine.
 */
export async function decodePixelsRobust(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Promise<DecodeResult | null> {
  const fast = decodePixels(data, width, height);
  if (fast) return fast;
  const { zxingDecode } = await import('./zxing');
  return zxingDecode(data, width, height);
}

/**
 * Decodes a QR code from an image source (bitmap, image, canvas or video).
 * Photos are tried at a few sizes because jsQR is sensitive to scale.
 */
export async function decodeSource(
  source: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
): Promise<DecodeResult | null> {
  const longest = Math.max(srcWidth, srcHeight);
  const targets = [1024, 1600, 640, 2400].filter((t, i) => i === 0 || t < longest * 1.2);
  for (const target of targets) {
    const scale = Math.min(1, target / longest);
    const w = Math.max(1, Math.round(srcWidth * scale));
    const h = Math.max(1, Math.round(srcHeight * scale));
    const canvas = makeCanvas(w, h);
    const ctx = context2d(canvas);
    ctx.fillStyle = '#FFFFFF'; // transparent PNGs decode as if printed on white
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(source, 0, 0, w, h);
    const result = await decodePixelsRobust(ctx.getImageData(0, 0, w, h).data, w, h);
    if (result) return result;
    if (scale === 1) break;
  }
  return null;
}

/** Decodes a QR code from an image file (PNG, JPEG, WebP, GIF, SVG...). */
export async function decodeBlob(blob: Blob): Promise<DecodeResult | null> {
  if (blob.type === 'image/svg+xml' || typeof createImageBitmap === 'undefined') {
    const img = await loadImageElement(blob);
    return decodeSource(img, img.naturalWidth || 1024, img.naturalHeight || 1024);
  }
  const bitmap = await createImageBitmap(blob);
  try {
    return await decodeSource(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}
