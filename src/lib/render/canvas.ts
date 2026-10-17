import { FONT_STACK, FONT_WEIGHT, type Geometry, type Paint } from './geometry';

/** The subset of the Canvas 2D API we use (works for DOM, Offscreen and node canvases). */
export type Ctx2D = Pick<
  CanvasRenderingContext2D,
  | 'save'
  | 'restore'
  | 'scale'
  | 'fill'
  | 'fillRect'
  | 'clearRect'
  | 'drawImage'
  | 'fillText'
  | 'measureText'
  | 'createLinearGradient'
  | 'createRadialGradient'
  | 'fillStyle'
  | 'font'
  | 'textAlign'
  | 'textBaseline'
  | 'imageSmoothingQuality'
>;

export interface DrawOptions {
  /** Output width in pixels; height follows the geometry's aspect ratio. */
  width: number;
  /** Decoded logo image, if the design has one. */
  logo?: CanvasImageSource;
  /** Paint this colour behind everything first (used for JPEG and the scan test). */
  underlay?: string;
}

export const pixelHeight = (g: Geometry, width: number): number =>
  Math.round((width * g.height) / g.width);

export const canvasFont = (size: number): string => `${FONT_WEIGHT} ${size}px ${FONT_STACK}`;

function toStyle(ctx: Ctx2D, paint: Paint): string | CanvasGradient {
  if (paint.type === 'solid') return paint.color;
  const grad =
    paint.type === 'linear'
      ? ctx.createLinearGradient(paint.x1, paint.y1, paint.x2, paint.y2)
      : ctx.createRadialGradient(paint.cx, paint.cy, 0, paint.cx, paint.cy, paint.r);
  grad.addColorStop(0, paint.colors[0]);
  grad.addColorStop(1, paint.colors[1]);
  return grad;
}

/** Draws geometry onto a 2D context sized `width × pixelHeight(g, width)`. */
export function drawGeometry(ctx: Ctx2D, g: Geometry, options: DrawOptions): void {
  const scale = options.width / g.width;
  const height = pixelHeight(g, options.width);
  ctx.save();
  ctx.clearRect(0, 0, options.width, height);
  if (options.underlay) {
    ctx.fillStyle = options.underlay;
    ctx.fillRect(0, 0, options.width, height);
  }
  ctx.scale(scale, scale);
  for (const layer of g.layers) {
    ctx.fillStyle = toStyle(ctx, layer.paint);
    ctx.fill(new Path2D(layer.d), layer.fillRule ?? 'nonzero');
  }
  if (g.logo && options.logo) {
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(options.logo, g.logo.x, g.logo.y, g.logo.w, g.logo.h);
  }
  for (const t of g.texts) {
    ctx.font = canvasFont(t.fontSize);
    ctx.fillStyle = t.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.text, t.cx, t.cy);
  }
  ctx.restore();
}

/** A text measurer backed by a canvas context, for accurate frame labels. */
export function canvasMeasurer(ctx: Pick<CanvasRenderingContext2D, 'font' | 'measureText'>) {
  return (text: string, fontSize: number): number => {
    // Measure at a comfortable size, then scale: tiny font sizes round badly.
    ctx.font = canvasFont(100);
    return (ctx.measureText(text).width * fontSize) / 100;
  };
}
