import { FONT_STACK, FONT_WEIGHT, type Geometry, type Paint } from './geometry';
import { fmt } from './paths';

/** Escapes text for use inside SVG/XML text nodes and attribute values. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function paintDef(paint: Paint, id: string): string {
  if (paint.type === 'linear') {
    return (
      `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${fmt(paint.x1)}" y1="${fmt(paint.y1)}" x2="${fmt(paint.x2)}" y2="${fmt(paint.y2)}">` +
      `<stop offset="0" stop-color="${paint.colors[0]}"/><stop offset="1" stop-color="${paint.colors[1]}"/></linearGradient>`
    );
  }
  if (paint.type === 'radial') {
    return (
      `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${fmt(paint.cx)}" cy="${fmt(paint.cy)}" r="${fmt(paint.r)}">` +
      `<stop offset="0" stop-color="${paint.colors[0]}"/><stop offset="1" stop-color="${paint.colors[1]}"/></radialGradient>`
    );
  }
  return '';
}

export interface SvgOptions {
  /** Output width/height attributes in px; the viewBox stays in modules. */
  pixelWidth?: number;
  title?: string;
  /** Turn the whole image upside down (folded table tents). */
  rotate180?: boolean;
}

/** Serialises geometry to a standalone, vector SVG document. */
export function geometryToSvg(g: Geometry, options: SvgOptions = {}): string {
  const defs: string[] = [];
  const paintIds = new Map<Paint, string>();
  const fillFor = (paint: Paint): string => {
    if (paint.type === 'solid') return paint.color;
    let id = paintIds.get(paint);
    if (!id) {
      id = `g${paintIds.size}`;
      paintIds.set(paint, id);
      defs.push(paintDef(paint, id));
    }
    return `url(#${id})`;
  };

  const body: string[] = [];
  for (const layer of g.layers) {
    const rule = layer.fillRule ? ` fill-rule="${layer.fillRule}"` : '';
    body.push(`<path d="${layer.d}" fill="${fillFor(layer.paint)}"${rule}/>`);
  }
  if (g.logo) {
    const l = g.logo;
    body.push(
      `<image href="${escapeXml(l.href)}" x="${fmt(l.x)}" y="${fmt(l.y)}" width="${fmt(l.w)}" height="${fmt(l.h)}" preserveAspectRatio="xMidYMid meet"/>`,
    );
  }
  for (const t of g.texts) {
    body.push(
      `<text x="${fmt(t.cx)}" y="${fmt(t.cy)}" fill="${t.color}" font-family="${escapeXml(FONT_STACK)}" font-weight="${FONT_WEIGHT}" ` +
        `font-size="${fmt(t.fontSize)}" text-anchor="middle" dominant-baseline="central">${escapeXml(t.text)}</text>`,
    );
  }

  const w = options.pixelWidth ?? Math.round(g.width * 10);
  const h = Math.round((w * g.height) / g.width);
  const title = options.title ? `<title>${escapeXml(options.title)}</title>` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${fmt(g.width)} ${fmt(g.height)}" shape-rendering="geometricPrecision">` +
    title +
    (defs.length ? `<defs>${defs.join('')}</defs>` : '') +
    (options.rotate180
      ? `<g transform="rotate(180 ${fmt(g.width / 2)} ${fmt(g.height / 2)})">${body.join('')}</g>`
      : body.join('')) +
    '</svg>'
  );
}
