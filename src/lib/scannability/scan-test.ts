import { decodePixelsRobust } from '../decode';
import { drawGeometry, pixelHeight, type Ctx2D } from '../render/canvas';
import type { Geometry } from '../render/geometry';

export const SCAN_TEST_WIDTH = 1024;

export interface ScanTestResult {
  /** True only when the decoded text equals the payload exactly. */
  ok: boolean;
  decoded: string | null;
}

export type CanvasFactory = (
  width: number,
  height: number,
) => {
  ctx: Ctx2D;
  getPixels(): Uint8ClampedArray;
};

/**
 * Renders the final image (frame included) at 1024 px, decodes it and
 * compares with the intended payload. Transparent codes are tested on white.
 */
export async function runScanTest(
  g: Geometry,
  payload: string,
  createCanvas: CanvasFactory,
  logo?: CanvasImageSource,
): Promise<ScanTestResult> {
  const width = SCAN_TEST_WIDTH;
  const height = pixelHeight(g, width);
  const canvas = createCanvas(width, height);
  drawGeometry(
    canvas.ctx,
    g,
    logo ? { width, logo, underlay: '#FFFFFF' } : { width, underlay: '#FFFFFF' },
  );
  const result = await decodePixelsRobust(canvas.getPixels(), width, height);
  return { ok: result?.text === payload, decoded: result?.text ?? null };
}
