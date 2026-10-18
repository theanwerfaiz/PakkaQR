import { isFinderModule, type QrMatrix } from '../render/matrix';

/*
 * Photo QR: a picture fills the code; each module is drawn as a small
 * dark or light square on top, and the function patterns stay solid so
 * cameras can lock on. Use with error correction H and always run the scan
 * test — the caller does.
 */

// Alignment pattern centres per version (ISO/IEC 18004 table E.1).
const ALIGN: number[][] = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
  [6, 28, 50, 72, 94],
  [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102],
  [6, 28, 54, 80, 106],
  [6, 32, 58, 84, 110],
  [6, 30, 58, 86, 114],
  [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122],
  [6, 30, 54, 78, 102, 126],
  [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134],
  [6, 34, 60, 86, 112, 138],
  [6, 30, 58, 86, 114, 142],
  [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150],
  [6, 24, 50, 76, 102, 128, 154],
  [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162],
  [6, 26, 54, 82, 110, 138, 166],
  [6, 30, 58, 86, 114, 142, 170],
];

/** Modules that must stay solid: finders (+separator), timing and alignment patterns. */
export function isFunctionModule(
  m: Pick<QrMatrix, 'size' | 'version'>,
  r: number,
  c: number,
): boolean {
  const n = m.size;
  if ((r < 8 && c < 8) || (r < 8 && c >= n - 8) || (r >= n - 8 && c < 8)) return true;
  if (isFinderModule(n, r, c)) return true;
  if (r === 6 || c === 6) return true; // timing patterns
  const centres = ALIGN[m.version] ?? [];
  for (const ar of centres)
    for (const ac of centres) {
      // Skip the three corners that overlap finders.
      if (
        (ar === 6 && ac === 6) ||
        (ar === 6 && ac === centres.at(-1)) ||
        (ar === centres.at(-1) && ac === 6)
      )
        continue;
      if (Math.abs(r - ar) <= 2 && Math.abs(c - ac) <= 2) return true;
    }
  return false;
}

export interface PhotoQrOptions {
  /** Output size in pixels (square). */
  size: number;
  /** Quiet zone in modules. */
  margin: number;
  /** Size of each data dot as a share of the module (0.3–0.9). */
  dot: number;
  dark: string;
  light: string;
  /** Darken (negative) or lighten (positive) the photo, −1..1. */
  wash: number;
}

export const defaultPhotoOptions: PhotoQrOptions = {
  size: 1024,
  margin: 4,
  dot: 0.5,
  dark: '#000000',
  light: '#FFFFFF',
  wash: 0.15,
};

type Ctx = Pick<
  CanvasRenderingContext2D,
  | 'fillStyle'
  | 'fillRect'
  | 'drawImage'
  | 'save'
  | 'restore'
  | 'globalAlpha'
  | 'imageSmoothingQuality'
>;

/** Draws a photo QR onto a size×size canvas. `photo` is cover-fitted into the code area. */
export function drawPhotoQr(
  ctx: Ctx,
  m: QrMatrix,
  photo: CanvasImageSource & { width: number; height: number },
  o: PhotoQrOptions,
): void {
  const total = m.size + o.margin * 2;
  const cell = o.size / total;
  const origin = o.margin * cell;
  const area = m.size * cell;
  ctx.save();
  ctx.fillStyle = o.light;
  ctx.fillRect(0, 0, o.size, o.size);
  // Cover-fit the photo into the symbol area.
  const scale = Math.max(area / photo.width, area / photo.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    photo,
    (photo.width - area / scale) / 2,
    (photo.height - area / scale) / 2,
    area / scale,
    area / scale,
    origin,
    origin,
    area,
    area,
  );
  if (o.wash !== 0) {
    ctx.globalAlpha = Math.min(0.8, Math.abs(o.wash));
    ctx.fillStyle = o.wash > 0 ? '#FFFFFF' : '#000000';
    ctx.fillRect(origin, origin, area, area);
    ctx.globalAlpha = 1;
  }
  const dot = Math.min(0.9, Math.max(0.3, o.dot));
  const inset = (cell * (1 - dot)) / 2;
  for (let r = 0; r < m.size; r++) {
    for (let c = 0; c < m.size; c++) {
      const isDark = m.dark[r]![c]!;
      ctx.fillStyle = isDark ? o.dark : o.light;
      const x = origin + c * cell;
      const y = origin + r * cell;
      if (isFunctionModule(m, r, c)) ctx.fillRect(x, y, cell + 0.5, cell + 0.5);
      else ctx.fillRect(x + inset, y + inset, cell * dot, cell * dot);
    }
  }
  ctx.restore();
}
