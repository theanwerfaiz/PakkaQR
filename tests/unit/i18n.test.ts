import { describe, expect, it } from 'vitest';
import en from '../../src/i18n/en.json';
import hi from '../../src/i18n/hi.json';
import enContent from '../../src/i18n/content/en.json';
import hiContent from '../../src/i18n/content/hi.json';
import {
  createT,
  flattenKeys,
  getUiDict,
  interpolate,
  localePath,
  parsePath,
  type Dict,
} from '../../src/lib/i18n';
import { pages } from '../../src/data/pages';

const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const lookup = (d: Dict, key: string) =>
  key.split('.').reduce<unknown>((n, p) => (n as Record<string, unknown>)?.[p], d);

describe('i18n dictionaries', () => {
  it('Hindi has every English UI key with the same placeholders', () => {
    for (const key of flattenKeys(en as unknown as Dict)) {
      const value = lookup(hi as Dict, key);
      expect(typeof value, key).toBe('string');
      expect(vars(value as string), key).toEqual(vars(lookup(en as unknown as Dict, key) as string));
    }
  });
  it('spec-provided Hindi strings are used verbatim', () => {
    const t = createT(getUiDict('hi'));
    expect(t('brand.tagline')).toBe('QR कोड जो चलते हैं। पक्का।');
    expect(t('upi.check')).toBe('भुगतान से पहले अपने UPI ऐप में प्राप्तकर्ता का नाम ज़रूर जाँचें।');
    expect(t('status.great')).toBe('जाँचा गया — यह कोड सही से स्कैन होता है।');
  });
  it('every page has title, description, h1 and intro in both languages', () => {
    for (const page of pages) {
      for (const dict of [enContent, hiContent] as unknown as Dict[]) {
        for (const field of ['title', 'description', 'h1', 'intro', 'linkText', 'blurb']) {
          const v = lookup(dict, `pages.${page.key}.${field}`);
          expect(typeof v, `${page.key}.${field}`).toBe('string');
        }
        expect((lookup(dict, `pages.${page.key}.title`) as string).length).toBeLessThanOrEqual(60);
        expect(
          (lookup(dict, `pages.${page.key}.description`) as string).length,
        ).toBeLessThanOrEqual(155);
      }
    }
  });
});

describe('i18n helpers', () => {
  it('interpolates and falls back', () => {
    expect(interpolate('Hi {name}, {missing}', { name: 'Ravi' })).toBe('Hi Ravi, {missing}');
    expect(interpolate('plain')).toBe('plain');
    const t = createT({ a: { b: 'B' } } as Dict, { c: 'C' } as Dict);
    expect([t('a.b'), t('c'), t('zz.top')]).toEqual(['B', 'C', 'zz.top']);
  });
  it('builds and parses locale paths', () => {
    expect(localePath('en', '')).toBe('/');
    expect(localePath('hi', '')).toBe('/hi');
    expect(localePath('hi', 'wifi-qr-code-generator', '/PakkaQR')).toBe(
      '/PakkaQR/hi/wifi-qr-code-generator',
    );
    expect(parsePath('/hi/wifi-qr-code-generator.html')).toEqual({
      locale: 'hi',
      slug: 'wifi-qr-code-generator',
    });
    expect(parsePath('/PakkaQR/print', '/PakkaQR/')).toEqual({ locale: 'en', slug: 'print' });
    expect(parsePath('/index.html')).toEqual({ locale: 'en', slug: '' });
    expect(parsePath('/hi/')).toEqual({ locale: 'hi', slug: '' });
  });
});
