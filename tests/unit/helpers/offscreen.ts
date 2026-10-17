import { createCanvas, loadImage, Path2D, type Canvas } from '@napi-rs/canvas';

/*
 * Minimal browser-canvas shims backed by @napi-rs/canvas, so code written
 * for OffscreenCanvas / createImageBitmap can be unit-tested in Node.
 */
class NodeOffscreenCanvas {
  private canvas: Canvas;
  constructor(width: number, height: number) {
    this.canvas = createCanvas(width, height);
  }
  get width() {
    return this.canvas.width;
  }
  set width(v: number) {
    this.canvas.width = v;
  }
  get height() {
    return this.canvas.height;
  }
  set height(v: number) {
    this.canvas.height = v;
  }
  getContext() {
    return this.canvas.getContext('2d');
  }
  async convertToBlob(options: { type?: string; quality?: number } = {}) {
    const type = (options.type ?? 'image/png') as 'image/png';
    const buffer =
      type === 'image/png'
        ? this.canvas.toBuffer('image/png')
        : this.canvas.toBuffer(type as 'image/jpeg', Math.round((options.quality ?? 0.92) * 100));
    return new Blob([new Uint8Array(buffer)], { type });
  }
}

const g = globalThis as unknown as Record<string, unknown>;
g.Path2D = Path2D;
g.OffscreenCanvas = NodeOffscreenCanvas;
g.createImageBitmap = async (blob: Blob) => {
  const img = await loadImage(Buffer.from(await blob.arrayBuffer()));
  return Object.assign(img, { close() {} });
};
