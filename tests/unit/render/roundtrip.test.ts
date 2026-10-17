import { describe, expect, it } from 'vitest';
import { nodeCanvas, loadLogo, squareLogo } from '../helpers/canvas';
import { encodeContent, exampleContent, qrTypes } from '../../../src/lib/payloads';
import { buildGeometry } from '../../../src/lib/render/geometry';
import { defaultDesign, type QrDesign } from '../../../src/lib/render/design';
import { applyPreset, presets } from '../../../src/lib/render/presets';
import { frameIds } from '../../../src/lib/render/geometry';
import { runScanTest } from '../../../src/lib/scannability/scan-test';

function payloadFor(type: (typeof qrTypes)[number]): string {
  const r = encodeContent(exampleContent(type));
  if (!r.ok) throw new Error(`example for ${type} is invalid`);
  return r.payload;
}

const scan = (payload: string, design: QrDesign, logo?: CanvasImageSource) =>
  runScanTest(buildGeometry(payload, design), payload, nodeCanvas, logo);

describe('round-trip: every type with the default design', () => {
  it.each(qrTypes)('%s', async (type) => {
    const payload = payloadFor(type);
    expect(await scan(payload, defaultDesign)).toEqual({ ok: true, decoded: payload });
  });
});

describe('round-trip: every type × every preset', () => {
  for (const preset of presets) {
    it(preset.id, async () => {
      const design = applyPreset(defaultDesign, preset);
      for (const type of qrTypes) {
        const payload = payloadFor(type);
        expect((await scan(payload, design)).decoded, `${preset.id} / ${type}`).toBe(payload);
      }
    });
  }
});

describe('round-trip: frames, unicode, transparency', () => {
  it.each(frameIds)('frame %s', async (id) => {
    const payload = payloadFor('url');
    const design: QrDesign = {
      ...defaultDesign,
      frame: { id, label: 'Scan me', labelColor: '#FFFFFF', frameColor: '#1F6FEB' },
    };
    expect((await scan(payload, design)).ok).toBe(true);
  });
  it('Hindi and emoji payloads', async () => {
    const payload = 'नमस्ते दुनिया 👋 — पक्का';
    expect(await scan(payload, defaultDesign)).toEqual({ ok: true, decoded: payload });
  });
  it('transparent background is tested on white', async () => {
    expect((await scan('https://example.com', { ...defaultDesign, transparentBg: true })).ok).toBe(
      true,
    );
  });
});

describe('logos', () => {
  it('25% logo with EC=H decodes', async () => {
    const dataUrl = squareLogo();
    const logo = await loadLogo(dataUrl);
    const design: QrDesign = {
      ...defaultDesign,
      ecLevel: 'H',
      logo: { dataUrl, sizeRatio: 0.25, margin: 1, hideBackgroundDots: true, aspect: 1 },
    };
    for (const type of qrTypes) {
      const payload = payloadFor(type);
      expect((await scan(payload, design, logo)).ok, type).toBe(true);
    }
  });
  it('40% logo with EC=L does not decode', async () => {
    const dataUrl = squareLogo();
    const logo = await loadLogo(dataUrl);
    const design: QrDesign = {
      ...defaultDesign,
      ecLevel: 'L',
      logo: { dataUrl, sizeRatio: 0.4, margin: 1, hideBackgroundDots: true, aspect: 1 },
    };
    expect((await scan(payloadFor('url'), design, logo)).ok).toBe(false);
  });
  it('max-size logo (30%) with auto EC on every preset + frame decodes', async () => {
    const dataUrl = squareLogo('#111111');
    const logo = await loadLogo(dataUrl);
    for (const preset of presets) {
      const design: QrDesign = {
        ...applyPreset(defaultDesign, preset),
        logo: { dataUrl, sizeRatio: 0.3, margin: 1, hideBackgroundDots: true, aspect: 1 },
        frame: {
          id: 'rounded-bottom',
          label: 'Scan me',
          labelColor: '#FFFFFF',
          frameColor: '#000000',
        },
      };
      expect((await scan(payloadFor('wifi'), design, logo)).ok, preset.id).toBe(true);
    }
  });
});
