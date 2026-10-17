import { describe, expect, it } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import jsQR from 'jsqr';
import { nodeCanvas } from '../helpers/canvas';
import {
  cardFormats,
  cardLayout,
  cardThemes,
  drawCard,
  type CardOptions,
} from '../../../src/lib/export/card';
import { buildGeometry } from '../../../src/lib/render/geometry';
import { drawGeometry, pixelHeight } from '../../../src/lib/render/canvas';
import { defaultDesign } from '../../../src/lib/render/design';

void nodeCanvas; // installs the Path2D global

const PAYLOAD = 'https://chaibar.in/menu';

function renderCode() {
  const g = buildGeometry(PAYLOAD, defaultDesign);
  const w = 600;
  const c = createCanvas(w, pixelHeight(g, w));
  drawGeometry(c.getContext('2d') as never, g, { width: w });
  return { canvas: c, aspect: g.height / g.width };
}

const base: CardOptions = {
  format: 'story',
  theme: 'paper',
  headline: 'Scan to see the menu',
  subline: 'Chai Bar · Indiranagar',
  stamp: true,
  credit: false,
  creditText: 'Made with PakkaQR',
  stampColor: '#C2321A',
  codeColor: '#1A1712',
};

describe('cardLayout', () => {
  it.each(cardFormats)('%s keeps the code inside the card and below the stamp', (format) => {
    const l = cardLayout(format, 1);
    expect(l.qr.x).toBeGreaterThanOrEqual(0);
    expect(l.qr.x + l.qr.w).toBeLessThanOrEqual(l.width);
    expect(l.qr.y + l.qr.h).toBeLessThanOrEqual(l.height);
    // Stamp never covers the code.
    expect(l.stamp.cy + l.stamp.r).toBeLessThanOrEqual(l.qr.y);
    expect(l.stamp.cx + l.stamp.r).toBeLessThanOrEqual(l.width);
  });
});

describe('drawCard', () => {
  it.each(cardFormats.flatMap((f) => cardThemes.map((t) => [f, t] as const)))(
    '%s / %s card still scans',
    (format, theme) => {
      const { canvas, aspect } = renderCode();
      const l = cardLayout(format, aspect);
      const out = createCanvas(l.width, l.height);
      const ctx = out.getContext('2d');
      drawCard(ctx as never, canvas as never, aspect, { ...base, format, theme });
      const img = ctx.getImageData(0, 0, l.width, l.height);
      const result = jsQR(img.data, l.width, l.height);
      expect(result?.data).toBe(PAYLOAD);
    },
  );
});
