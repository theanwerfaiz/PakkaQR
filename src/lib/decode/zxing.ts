import {
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  QRCodeReader,
  RGBLuminanceSource,
} from '@zxing/library';
import type { DecodeResult } from './index';

const hints = new Map<DecodeHintType, unknown>([
  [DecodeHintType.TRY_HARDER, true],
  [DecodeHintType.CHARACTER_SET, 'UTF-8'],
]);

function toLuminance(rgba: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; p < out.length; i += 4, p++) {
    // Composite onto white so transparent pixels read as light.
    const a = rgba[i + 3]! / 255;
    const lum = 0.299 * rgba[i]! + 0.587 * rgba[i + 1]! + 0.114 * rgba[i + 2]!;
    out[p] = lum * a + 255 * (1 - a);
  }
  return out;
}

/** ZXing decoder: slower than jsQR but more tolerant of dot styles and photos. */
export function zxingDecode(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): DecodeResult | null {
  const source = new RGBLuminanceSource(toLuminance(rgba, width, height), width, height);
  const reader = new QRCodeReader();
  for (const src of [source, source.invert()]) {
    try {
      const result = reader.decode(new BinaryBitmap(new HybridBinarizer(src)), hints);
      return { text: result.getText(), version: 0 };
    } catch {
      reader.reset();
    }
  }
  return null;
}
