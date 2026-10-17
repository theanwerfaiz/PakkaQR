import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import './helpers/offscreen';
import { dataUrlToBitmap, generateBatch } from '../../src/lib/batch/generate';
import { decodeBlob } from '../../src/lib/decode';
import { defaultDesign } from '../../src/lib/render/design';
import { squareLogo } from './helpers/canvas';

describe('batch generation', () => {
  it('packs PNG and SVG folders, extra files, PNG bytes for PDFs and failures', async () => {
    const progress: number[] = [];
    const out = await generateBatch(
      [
        { row: 1, fileName: 'a', payload: 'https://a.example' },
        { row: 2, fileName: 'b', payload: 'x'.repeat(4000) },
        { row: 3, fileName: 'c', payload: 'https://c.example' },
      ],
      {
        design: defaultDesign,
        png: true,
        svg: true,
        size: 256,
        collectPngs: true,
        extraFiles: { 'errors.csv': 'row\n9' },
      },
      undefined,
      (done) => progress.push(done),
      2,
    );
    expect(progress).toEqual([1, 2, 3]);
    expect(out.failed).toEqual([{ row: 2, reason: 'errors.tooLong' }]);
    const zip = await JSZip.loadAsync(await out.zip.arrayBuffer());
    expect(
      Object.keys(zip.files)
        .filter((f) => !f.endsWith('/'))
        .sort(),
    ).toEqual(['errors.csv', 'png/a.png', 'png/c.png', 'svg/a.svg', 'svg/c.svg']);
    expect(out.pngs.map((p) => p.caption)).toEqual(['a', 'c']);
    const png = new Blob([await zip.file('png/c.png')!.async('arraybuffer')], { type: 'image/png' });
    expect((await decodeBlob(png))?.text).toBe('https://c.example');
  });
  it('decodes a data-URL logo without fetch', async () => {
    const bitmap = await dataUrlToBitmap(squareLogo());
    expect((bitmap as unknown as { width: number }).width).toBe(128);
  });
});
