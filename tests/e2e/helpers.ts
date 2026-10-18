import { readFileSync } from 'node:fs';
import { createCanvas, loadImage, Path2D } from '@napi-rs/canvas';
import type { Page } from '@playwright/test';
import { decodePixels } from '../../src/lib/decode';
import { buildGeometry } from '../../src/lib/render/geometry';
import { defaultDesign } from '../../src/lib/render/design';
import { drawGeometry, type Ctx2D } from '../../src/lib/render/canvas';

(globalThis as unknown as { Path2D: unknown }).Path2D = Path2D;

/** Decodes a PNG/JPEG/WebP/SVG file on disk; returns the text or null. */
export async function decodeFile(path: string): Promise<string | null> {
  const img = await loadImage(readFileSync(path));
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const fast = decodePixels(data, w, h);
  if (fast) return fast.text;
  const { zxingDecode } = await import('../../src/lib/decode/zxing');
  return zxingDecode(data, w, h)?.text ?? null;
}

/** A plain QR code PNG for upload fixtures. */
export function qrPng(text: string, width = 600): Buffer {
  const g = buildGeometry(text, defaultDesign);
  const canvas = createCanvas(width, width);
  drawGeometry(canvas.getContext('2d') as unknown as Ctx2D, g, { width });
  return canvas.toBuffer('image/png');
}

/** Clicks a download control and returns the saved file path. */
export async function download(page: Page, testId: string): Promise<string> {
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId(testId).click(),
  ]);
  const path = await file.path();
  if (!path) throw new Error('download failed');
  return path;
}

export async function chooseType(page: Page, type: string) {
  const chip = page.locator(`[data-testid=generator] button[data-type="${type}"]`);
  if (await chip.count()) await chip.click();
  else await page.locator('[data-testid=generator] select').first().selectOption(type);
}

/** Opens a page and waits until its React island has hydrated. */
export async function open(page: Page, path: string) {
  await page.goto(path);
  await page.locator('astro-island:not([ssr])').first().waitFor({ state: 'attached' });
  // React hydrates in chunks after the island is marked; on generator pages wait
  // until the generator has mounted, so early typing can't race hydration.
  if (await page.locator('[data-testid=generator]').count())
    await page.locator('[data-testid=generator][data-ready]').waitFor({ state: 'attached' });
}
