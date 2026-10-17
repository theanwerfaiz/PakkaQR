import JSZip from 'jszip';
import { canvasMeasurer } from '../render/canvas';
import type { QrDesign } from '../render/design';
import { buildGeometry } from '../render/geometry';
import { geometryToSvg } from '../render/svg';
import { canvasToBlob, renderCanvas } from '../export';
import { context2d, makeCanvas } from '../decode';
import type { BatchItem } from './index';

export interface BatchOptions {
  design: QrDesign;
  png: boolean;
  svg: boolean;
  size: number;
  /** Also return PNG bytes for building a PDF afterwards. */
  collectPngs: boolean;
  /** Extra text files to add to the ZIP (e.g. the error report). */
  extraFiles?: Record<string, string>;
}

export interface BatchOutput {
  zip: Blob;
  pngs: Array<{ png: Uint8Array; aspect: number; caption: string }>;
  failed: Array<{ row: number; reason: string }>;
}

/** Generates every code and packs a ZIP. Runs in a Web Worker or, as a fallback, on the main thread. */
export async function generateBatch(
  items: BatchItem[],
  options: BatchOptions,
  logo: CanvasImageSource | undefined,
  onProgress: (done: number, total: number) => void,
  yieldEvery = 0,
): Promise<BatchOutput> {
  const zip = new JSZip();
  const both = options.png && options.svg;
  const pngs: BatchOutput['pngs'] = [];
  const failed: BatchOutput['failed'] = [];
  const measure = canvasMeasurer(context2d(makeCanvas(8, 8)));
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    try {
      const g = buildGeometry(item.payload, options.design, { measure });
      if (options.png || options.collectPngs) {
        const blob = await canvasToBlob(renderCanvas(g, options.size, logo), 'image/png');
        const bytes = new Uint8Array(await blob.arrayBuffer());
        if (options.png) zip.file(`${both ? 'png/' : ''}${item.fileName}.png`, bytes);
        if (options.collectPngs)
          pngs.push({ png: bytes, aspect: g.width / g.height, caption: item.fileName });
      }
      if (options.svg)
        zip.file(
          `${both ? 'svg/' : ''}${item.fileName}.svg`,
          geometryToSvg(g, { pixelWidth: options.size }),
        );
    } catch (e) {
      failed.push({ row: item.row, reason: e instanceof Error ? e.message : 'errors.export' });
    }
    onProgress(i + 1, items.length);
    if (yieldEvery && (i + 1) % yieldEvery === 0) await new Promise((r) => setTimeout(r, 0));
  }
  for (const [name, text] of Object.entries(options.extraFiles ?? {})) zip.file(name, text);
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
  return { zip: blob, pngs, failed };
}

/** Turns a base64 data URL into an image bitmap (works in workers without fetch). */
export async function dataUrlToBitmap(dataUrl: string): Promise<ImageBitmap> {
  const [meta = '', b64 = ''] = dataUrl.split(',');
  const type = /data:([^;]+)/.exec(meta)?.[1] ?? 'image/png';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return createImageBitmap(new Blob([bytes], { type }));
}
