import { context2d, makeCanvas } from '../decode';
import { drawGeometry, pixelHeight } from '../render/canvas';
import type { Geometry } from '../render/geometry';
import { geometryToSvg } from '../render/svg';

export const PNG_SIZES = [256, 512, 1024, 2048, 4096] as const;
export const DEFAULT_PNG_SIZE = 1024;

export type RasterFormat = 'png' | 'jpeg' | 'webp';
export type ExportFormat = RasterFormat | 'svg' | 'pdf';

export const MIME: Record<ExportFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
};

export const EXTENSION: Record<ExportFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
  svg: 'svg',
  pdf: 'pdf',
};

// ---------------------------------------------------------------- names

/** `pakkaqr-<type>-<yyyymmdd>` (extension added separately). */
export function defaultFileName(type: string, date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `pakkaqr-${type}-${y}${m}${d}`;
}

/** Strips characters that are invalid in file names and any extension the user typed. */
export function cleanFileName(name: string, fallback: string): string {
  const cleaned = name
    .replace(/\.(png|jpe?g|webp|svg|pdf)$/i, '')
    // Control characters are invalid in file names on every OS.
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 120);
  return cleaned || fallback;
}

export const withExtension = (base: string, format: ExportFormat): string =>
  `${base}.${EXTENSION[format]}`;

// ---------------------------------------------------------------- raster

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

export function renderCanvas(
  g: Geometry,
  width: number,
  logo?: CanvasImageSource,
  underlay?: string,
): AnyCanvas {
  const canvas = makeCanvas(width, pixelHeight(g, width));
  const options: Parameters<typeof drawGeometry>[2] = { width };
  if (logo) options.logo = logo;
  if (underlay) options.underlay = underlay;
  drawGeometry(context2d(canvas), g, options);
  return canvas;
}

export function canvasToBlob(canvas: AnyCanvas, type: string, quality?: number): Promise<Blob> {
  if ('convertToBlob' in canvas) {
    return quality === undefined
      ? canvas.convertToBlob({ type })
      : canvas.convertToBlob({ type, quality });
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('errors.export'))),
      type,
      quality,
    );
  });
}

/**
 * PNG/WebP keep transparency; JPEG has none, so it is painted on the
 * code's background colour (white when the background is transparent).
 */
export async function exportRaster(
  g: Geometry,
  format: RasterFormat,
  width: number,
  options: { logo?: CanvasImageSource; bg: string; transparent: boolean },
): Promise<Blob> {
  const underlay = format === 'jpeg' ? (options.transparent ? '#FFFFFF' : options.bg) : undefined;
  const canvas = renderCanvas(g, width, options.logo, underlay);
  return canvasToBlob(canvas, MIME[format], format === 'png' ? undefined : 0.95);
}

export function exportSvg(g: Geometry, title: string, width = DEFAULT_PNG_SIZE): Blob {
  return new Blob([geometryToSvg(g, { pixelWidth: width, title })], { type: MIME.svg });
}

// ---------------------------------------------------------------- delivery

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export const canCopyImage = (): boolean =>
  typeof navigator !== 'undefined' && !!navigator.clipboard && typeof ClipboardItem !== 'undefined';

export async function copyImage(png: Blob): Promise<void> {
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
}

export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false;
  try {
    return navigator.canShare({
      files: [new File([new Uint8Array(1)], 'x.png', { type: 'image/png' })],
    });
  } catch {
    return false;
  }
}

export async function shareImage(png: Blob, fileName: string): Promise<void> {
  const file = new File([png], fileName, { type: 'image/png' });
  await navigator.share({ files: [file] });
}
