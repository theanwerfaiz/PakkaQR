import { describe, expect, it, vi } from 'vitest';
import './helpers/offscreen';
import {
  canCopyImage,
  canShareFiles,
  canvasToBlob,
  cleanFileName,
  copyImage,
  defaultFileName,
  exportRaster,
  exportSvg,
  renderCanvas,
  shareImage,
  withExtension,
} from '../../src/lib/export';
import { decodeBlob, decodePixelsRobust, decodeSource } from '../../src/lib/decode';
import { buildGeometry } from '../../src/lib/render/geometry';
import { defaultDesign } from '../../src/lib/render/design';
import { withBase } from '../../src/lib/site';

const g = buildGeometry('https://example.com/menu', defaultDesign);

describe('file names', () => {
  it('defaults to pakkaqr-<type>-<yyyymmdd>', () => {
    expect(defaultFileName('wifi', new Date(2026, 0, 5))).toBe('pakkaqr-wifi-20260105');
  });
  it('cleans user names', () => {
    expect(cleanFileName('  my/menu:code?.png ', 'x')).toBe('mymenucode');
    expect(cleanFileName('...', 'fallback')).toBe('fallback');
    expect(cleanFileName('a\u0001b', 'x')).toBe('ab');
    expect(withExtension('menu', 'jpeg')).toBe('menu.jpg');
  });
});

describe('exports', () => {
  it('PNG and JPEG decode back to the payload', async () => {
    for (const format of ['png', 'jpeg'] as const) {
      const blob = await exportRaster(g, format, 512, {
        bg: '#FFFFFF',
        transparent: format === 'png',
      });
      expect(blob.type).toBe(`image/${format}`);
      expect((await decodeBlob(blob))?.text).toBe('https://example.com/menu');
    }
    const transparentJpeg = await exportRaster(g, 'jpeg', 256, {
      bg: '#000000',
      transparent: true,
    });
    expect((await decodeBlob(transparentJpeg))?.text).toBe('https://example.com/menu');
  });
  it('SVG is a vector document with a title', async () => {
    const blob = exportSvg(g, 'My code', 800);
    expect(blob.type).toBe('image/svg+xml');
    const text = await blob.text();
    expect(text).toContain('width="800"');
    expect(text).toContain('<title>My code</title>');
  });
  it('renders at the requested size', () => {
    const c = renderCanvas(g, 300) as unknown as { width: number; height: number };
    expect([c.width, c.height]).toEqual([300, 300]);
  });
  it('canvasToBlob supports HTMLCanvasElement.toBlob too', async () => {
    const fake = {
      toBlob: (cb: (b: Blob | null) => void) => cb(new Blob(['x'])),
    } as unknown as HTMLCanvasElement;
    expect(await canvasToBlob(fake, 'image/png')).toBeInstanceOf(Blob);
    const failing = {
      toBlob: (cb: (b: Blob | null) => void) => cb(null),
    } as unknown as HTMLCanvasElement;
    await expect(canvasToBlob(failing, 'image/png')).rejects.toThrow('errors.export');
  });
  it('feature detection is false outside a browser; copy/share use the platform APIs', async () => {
    expect(canCopyImage()).toBe(false);
    expect(canShareFiles()).toBe(false);
    const write = vi.fn();
    const share = vi.fn();
    vi.stubGlobal(
      'ClipboardItem',
      class {
        constructor(public items: unknown) {}
      },
    );
    vi.stubGlobal('navigator', { clipboard: { write }, share, canShare: () => true });
    expect(canCopyImage()).toBe(true);
    expect(canShareFiles()).toBe(true);
    await copyImage(new Blob(['png']));
    await shareImage(new Blob(['png']), 'a.png');
    expect(write).toHaveBeenCalledOnce();
    expect(share.mock.calls[0]![0].files[0].name).toBe('a.png');
    vi.stubGlobal('navigator', {
      canShare: () => {
        throw new Error('no');
      },
    });
    expect(canShareFiles()).toBe(false);
    vi.unstubAllGlobals();
  });
});

describe('decode', () => {
  it('decodes a source image at several scales and returns null when there is no code', async () => {
    const canvas = renderCanvas(g, 2000);
    const big = (await decodeSource(canvas as unknown as CanvasImageSource, 2000, 2000))?.text;
    expect(big).toBe('https://example.com/menu');
    const blank = new OffscreenCanvas(300, 300);
    expect(await decodeSource(blank as unknown as CanvasImageSource, 300, 300)).toBeNull();
  });
  it('falls back to ZXing for dot styles jsQR misses', async () => {
    const dots = buildGeometry('https://example.com/menu', { ...defaultDesign, dotStyle: 'dots' });
    const c = renderCanvas(dots, 800) as unknown as OffscreenCanvas;
    const ctx = c.getContext('2d') as OffscreenCanvasRenderingContext2D;
    const data = ctx.getImageData(0, 0, 800, 800).data;
    expect((await decodePixelsRobust(data, 800, 800))?.text).toBe('https://example.com/menu');
  });
});

describe('site', () => {
  it('prefixes the base path', () => {
    expect(withBase('/icons/x.svg')).toBe('/icons/x.svg');
    expect(withBase('sw.js')).toBe('/sw.js');
  });
});
