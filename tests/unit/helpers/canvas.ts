import { createCanvas, loadImage, Path2D, type Image } from '@napi-rs/canvas';
import type { CanvasFactory } from '../../../src/lib/scannability/scan-test';
import type { Ctx2D } from '../../../src/lib/render/canvas';

// The renderer uses the global Path2D, as in browsers.
(globalThis as unknown as { Path2D: unknown }).Path2D = Path2D;

export const nodeCanvas: CanvasFactory = (width, height) => {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  return {
    ctx: ctx as unknown as Ctx2D,
    getPixels: () => ctx.getImageData(0, 0, width, height).data,
  };
};

export async function loadLogo(dataUrl: string): Promise<CanvasImageSource> {
  const img: Image = await loadImage(dataUrl);
  return img as unknown as CanvasImageSource;
}

/** A solid square logo as a PNG data URL. */
export function squareLogo(color = '#E11D48', size = 128): string {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(size * 0.3, size * 0.3, size * 0.4, size * 0.4);
  return canvas.toDataURL('image/png');
}
