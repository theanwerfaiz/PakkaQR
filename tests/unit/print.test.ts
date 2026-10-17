import { describe, expect, it } from 'vitest';
import {
  buildLayout,
  cardGrid,
  CARD_SIZES,
  PAPERS,
  stickerGrid,
  type LayoutOptions,
  type LayoutTexts,
} from '../../src/lib/print/layouts';

const options: LayoutOptions = {
  paper: 'a4',
  stickerCm: 5,
  gapMm: 5,
  cardSize: 'eu',
  cutLines: true,
};
const texts: LayoutTexts = {
  headline: 'Scan to pay',
  subtext: 'Thank you',
  name: 'Priya Sharma',
  title: 'Founder',
  networkLabel: 'Network',
  passwordLabel: 'Password',
  ssid: 'Cafe',
  password: 'secret123',
};
const codes = (l: ReturnType<typeof buildLayout>) => l.items.filter((i) => i.kind === 'code');
const inside = (l: ReturnType<typeof buildLayout>) =>
  codes(l).every(
    (c) =>
      c.x >= 0 &&
      c.y >= 0 &&
      c.x + c.size <= l.paper.width + 1e-9 &&
      c.y + c.size <= l.paper.height + 1e-9,
  );

describe('print layouts', () => {
  it('sticker sheet: exact size, fills the page, stays inside margins', () => {
    const l = buildLayout('stickers', options, texts);
    const c = codes(l);
    expect(c.every((x) => x.size === 50)).toBe(true);
    expect(c.length).toBe(3 * 5); // 3 columns × 5 rows of 5 cm on A4 with 5 mm gaps
    expect(inside(l)).toBe(true);
    const g = stickerGrid(PAPERS.a4, 20, 3);
    expect(g.cols * g.rows).toBe(g.cells.length);
    expect(g.cols).toBe(8);
  });
  it('sticker sizes are clamped to 2–10 cm', () => {
    expect(codes(buildLayout('stickers', { ...options, stickerCm: 1 }, texts))[0]!.size).toBe(20);
    expect(codes(buildLayout('stickers', { ...options, stickerCm: 20 }, texts))[0]!.size).toBe(100);
  });
  it('table tent: two halves, top one rotated, fold line in the middle', () => {
    const l = buildLayout('tent', options, texts);
    expect(codes(l)).toHaveLength(2);
    expect(codes(l).filter((c) => c.rotate180)).toHaveLength(1);
    expect(l.items.find((i) => i.kind === 'line')).toMatchObject({ y1: 148.5, dashed: true });
    expect(inside(l)).toBe(true);
  });
  it('poster scales with paper', () => {
    const a4 = codes(buildLayout('poster', options, texts))[0]!;
    const a3 = codes(buildLayout('poster', { ...options, paper: 'a3' }, texts))[0]!;
    expect(a3.size / a4.size).toBeCloseTo(297 / 210, 5);
  });
  it('business cards: 10-up at exact card sizes', () => {
    for (const size of ['eu', 'us'] as const) {
      const l = buildLayout('cards', { ...options, cardSize: size }, texts);
      expect(codes(l)).toHaveLength(10);
      const rects = l.items.filter((i) => i.kind === 'rect');
      expect(rects).toHaveLength(10);
      for (const r of rects)
        if (r.kind === 'rect') expect([r.w, r.h]).toEqual([CARD_SIZES[size].w, CARD_SIZES[size].h]);
      expect(l.paper.id).toBe(size === 'us' ? 'letter' : 'a4');
      expect(inside(l)).toBe(true);
    }
    expect(CARD_SIZES.us.w).toBeCloseTo(88.9, 5);
    expect(cardGrid(PAPERS.a4, CARD_SIZES.eu)[0]).toEqual({ x: 20, y: 11 });
  });
  it('WiFi cards print the network name and password', () => {
    const l = buildLayout('wifi', options, texts);
    const words = l.items.flatMap((i) => (i.kind === 'text' ? [i.text] : []));
    expect(words.filter((w) => w === 'Cafe')).toHaveLength(4);
    expect(words.filter((w) => w === 'secret123')).toHaveLength(4);
    expect(inside(l)).toBe(true);
  });
});
