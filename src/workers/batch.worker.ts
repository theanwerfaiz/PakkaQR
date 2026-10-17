/// <reference lib="webworker" />
import { dataUrlToBitmap, generateBatch, type BatchOptions } from '../lib/batch/generate';
import type { BatchItem } from '../lib/batch';

export interface BatchRequest {
  items: BatchItem[];
  options: BatchOptions;
}

export type BatchMessage =
  | { kind: 'progress'; done: number; total: number }
  | {
      kind: 'done';
      zip: Blob;
      pngs: Array<{ png: Uint8Array; aspect: number; caption: string }>;
      failed: Array<{ row: number; reason: string }>;
    }
  | { kind: 'error'; message: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (event: MessageEvent<BatchRequest>) => {
  const { items, options } = event.data;
  try {
    const logo = options.design.logo
      ? await dataUrlToBitmap(options.design.logo.dataUrl)
      : undefined;
    let last = 0;
    const out = await generateBatch(items, options, logo, (done, total) => {
      const now = Date.now();
      if (now - last > 100 || done === total) {
        last = now;
        ctx.postMessage({ kind: 'progress', done, total } satisfies BatchMessage);
      }
    });
    ctx.postMessage(
      { kind: 'done', ...out } satisfies BatchMessage,
      out.pngs.map((p) => p.png.buffer as ArrayBuffer),
    );
  } catch (e) {
    ctx.postMessage({
      kind: 'error',
      message: e instanceof Error ? e.message : String(e),
    } satisfies BatchMessage);
  }
};
