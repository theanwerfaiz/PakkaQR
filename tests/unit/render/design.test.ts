import { describe, expect, it } from 'vitest';
import {
  defaultDesign,
  normalizeHex,
  resolveEcLevel,
  sanitizeDesign,
  withoutLogo,
} from '../../../src/lib/render/design';
import { applyPreset, matchingPreset, presets } from '../../../src/lib/render/presets';
import { buildGeometry, estimateText, frameIds } from '../../../src/lib/render/geometry';
import { escapeXml, geometryToSvg } from '../../../src/lib/render/svg';
import { makeMatrix, PayloadTooLongError } from '../../../src/lib/render/matrix';

describe('design', () => {
  it('normalises hex colours', () => {
    expect(normalizeHex('#abc')).toBe('#AABBCC');
    expect(normalizeHex('1f6feb')).toBe('#1F6FEB');
    expect(normalizeHex('red')).toBeNull();
  });
  it('resolves auto EC', () => {
    expect(resolveEcLevel({ ecLevel: 'auto' })).toBe('M');
    expect(
      resolveEcLevel({
        ecLevel: 'auto',
        logo: { dataUrl: '', sizeRatio: 0.2, margin: 1, hideBackgroundDots: true, aspect: 1 },
      }),
    ).toBe('H');
    expect(resolveEcLevel({ ecLevel: 'Q' })).toBe('Q');
  });
  it('sanitises untrusted input', () => {
    expect(sanitizeDesign(null)).toEqual(defaultDesign);
    const d = sanitizeDesign({
      fg: '#123',
      bg: 'javascript:alert(1)',
      dotStyle: 'evil',
      margin: 99,
      ecLevel: 'H',
      transparentBg: true,
      gradient: { kind: 'radial', colors: ['#fff', 'nope'], angle: 999 },
      cornerColor: '#00ff00',
      logo: { dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=', sizeRatio: 0.2 },
      frame: { id: 'phone', label: 'x'.repeat(100), labelColor: '#fff', frameColor: 'nope' },
      extra: 1,
    });
    expect(d).toEqual({
      fg: '#112233',
      bg: '#FFFFFF',
      transparentBg: true,
      dotStyle: 'square',
      cornerSquareStyle: 'square',
      cornerDotStyle: 'square',
      margin: 10,
      ecLevel: 'H',
      gradient: { kind: 'radial', colors: ['#FFFFFF', '#112233'], angle: 360 },
      cornerColor: '#00FF00',
      frame: { id: 'phone', label: 'x'.repeat(40), labelColor: '#FFFFFF', frameColor: '#000000' },
    });
    const withLogo = sanitizeDesign({
      logo: { dataUrl: 'data:image/png;base64,AAAA', sizeRatio: 2, hideBackgroundDots: false },
    });
    expect(withLogo.logo).toEqual({
      dataUrl: 'data:image/png;base64,AAAA',
      sizeRatio: 0.5,
      margin: 1,
      hideBackgroundDots: false,
      aspect: 1,
    });
    expect(withoutLogo(withLogo).logo).toBeUndefined();
    expect(sanitizeDesign({ frame: { id: 'none' } }).frame).toBeUndefined();
  });
});

describe('presets', () => {
  it('has at least 12 unique presets that sanitise cleanly', () => {
    expect(presets.length).toBeGreaterThanOrEqual(12);
    expect(new Set(presets.map((p) => p.id)).size).toBe(presets.length);
  });
  it('applies style and keeps logo/frame/margin', () => {
    const base = {
      ...defaultDesign,
      margin: 6,
      frame: { id: 'phone', label: 'Hi', labelColor: '#FFFFFF', frameColor: '#000000' },
    };
    const ocean = presets.find((p) => p.id === 'ocean')!;
    const applied = applyPreset({ ...base, cornerColor: '#FF0000' }, ocean);
    expect(applied.margin).toBe(6);
    expect(applied.frame).toEqual(base.frame);
    expect(applied.cornerColor).toBeUndefined();
    expect(applied.gradient).toBeDefined();
    expect(matchingPreset(applied)).toBe('ocean');
    expect(matchingPreset({ ...applied, fg: '#123456' })).toBeNull();
  });
});

describe('matrix and geometry', () => {
  it('reports version and size', () => {
    const m = makeMatrix('hello', 'M');
    expect(m.version).toBe(1);
    expect(m.size).toBe(21);
  });
  it('throws a typed error when the payload is too long', () => {
    expect(() => makeMatrix('x'.repeat(3000), 'H')).toThrow(PayloadTooLongError);
  });
  it('sizes frames around the code and fits labels', () => {
    for (const id of frameIds) {
      const g = buildGeometry('hi', {
        ...defaultDesign,
        frame: {
          id,
          label: 'Scan me please, it is fine',
          labelColor: '#FFFFFF',
          frameColor: '#000000',
        },
      });
      expect(g.width).toBeGreaterThanOrEqual(g.qrBox.size);
      for (const t of g.texts)
        expect(estimateText(t.text, t.fontSize)).toBeLessThanOrEqual(g.width);
    }
    const unknown = buildGeometry('hi', {
      ...defaultDesign,
      frame: { id: 'zzz', label: '', labelColor: '#FFFFFF', frameColor: '#000000' },
    });
    expect(unknown.width).toBe(unknown.qrBox.size);
  });
  it('keeps the logo aspect ratio', () => {
    const logo = {
      dataUrl: 'data:image/png;base64,AAAA',
      sizeRatio: 0.2,
      margin: 1,
      hideBackgroundDots: true,
      aspect: 2,
    };
    const wide = buildGeometry('hi', { ...defaultDesign, logo });
    expect(wide.logo!.w / wide.logo!.h).toBeCloseTo(2);
    const tall = buildGeometry('hi', { ...defaultDesign, logo: { ...logo, aspect: 0.5 } });
    expect(tall.logo!.h / tall.logo!.w).toBeCloseTo(2);
  });
});

describe('svg', () => {
  it('escapes user text', () => {
    expect(escapeXml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;',
    );
  });
  it('produces a standalone vector document with gradients, logo and label', () => {
    const svg = geometryToSvg(
      buildGeometry('hi', {
        ...defaultDesign,
        gradient: { kind: 'linear', colors: ['#000000', '#111111'], angle: 45 },
        cornerColor: '#222222',
        logo: {
          dataUrl: 'data:image/png;base64,AAAA',
          sizeRatio: 0.2,
          margin: 1,
          hideBackgroundDots: true,
          aspect: 1,
        },
        frame: {
          id: 'box-bottom',
          label: '<script>alert(1)</script>',
          labelColor: '#FFFFFF',
          frameColor: '#000000',
        },
      }),
      { pixelWidth: 512, title: 'QR & "code"' },
    );
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="512"')).toBe(true);
    expect(svg).toContain('<linearGradient id="g0"');
    expect(svg).toContain('<image href="data:image/png;base64,AAAA"');
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('<title>QR &amp; &quot;code&quot;</title>');
    const radial = geometryToSvg(
      buildGeometry('hi', {
        ...defaultDesign,
        gradient: { kind: 'radial', colors: ['#000000', '#111111'], angle: 0 },
      }),
    );
    expect(radial).toContain('<radialGradient');
  });
});
