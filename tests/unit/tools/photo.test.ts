import { createCanvas } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';
import { decodePixels } from '../../../src/lib/decode';
import { makeMatrix } from '../../../src/lib/render/matrix';
import { defaultPhotoOptions, drawPhotoQr, isFunctionModule } from '../../../src/lib/photo';

/** A busy test "photo": colourful gradient blobs. */
function photo(w = 640, h = 480) {
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#F0A35E');
  g.addColorStop(0.5, '#C2321A');
  g.addColorStop(1, '#20345E');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = i % 2 ? '#FFFCF6' : '#1A1712';
    ctx.beginPath();
    ctx.arc((i * 97) % w, (i * 53) % h, 18 + (i % 5) * 6, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

const PAYLOAD = 'https://chaibar.in/menu';

describe('photo QR', () => {
  it.each([0.4, 0.5, 0.7])('dot %s scans back with EC H', (dot) => {
    const m = makeMatrix(PAYLOAD, 'H');
    const out = createCanvas(800, 800);
    const ctx = out.getContext('2d');
    drawPhotoQr(ctx as never, m, photo() as never, { ...defaultPhotoOptions, size: 800, dot });
    const img = ctx.getImageData(0, 0, 800, 800);
    expect(decodePixels(img.data, 800, 800)?.text).toBe(PAYLOAD);
  });
  it('marks finders, timing and alignment patterns as solid', () => {
    const m = makeMatrix(PAYLOAD, 'H'); // version 3+: one alignment pattern
    expect(isFunctionModule(m, 0, 0)).toBe(true);
    expect(isFunctionModule(m, 6, 12)).toBe(true);
    const last = m.size - 7;
    expect(isFunctionModule(m, last, last)).toBe(true);
    expect(isFunctionModule(m, 10, 12)).toBe(false);
  });
});
