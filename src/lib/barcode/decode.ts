import {
  BarcodeFormat as ZxFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatOneDReader,
  RGBLuminanceSource,
} from '@zxing/library';
import type { BarcodeFormat } from './index';

const FORMAT: Record<BarcodeFormat, ZxFormat> = {
  ean13: ZxFormat.EAN_13,
  upca: ZxFormat.UPC_A,
  ean8: ZxFormat.EAN_8,
  code128: ZxFormat.CODE_128,
};

/**
 * Reads a 1D barcode from RGBA pixels (the scan test). ZXing is loaded
 * lazily by callers, so it never adds to the initial page weight.
 */
export function decodeBarcode(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  format: BarcodeFormat,
): string | null {
  const lum = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; p < lum.length; i += 4, p++) {
    lum[p] = 0.299 * rgba[i]! + 0.587 * rgba[i + 1]! + 0.114 * rgba[i + 2]!;
  }
  const hints = new Map<DecodeHintType, unknown>([
    [DecodeHintType.TRY_HARDER, true],
    [DecodeHintType.POSSIBLE_FORMATS, [FORMAT[format]]],
  ]);
  const reader = new MultiFormatOneDReader(hints);
  try {
    const result = reader.decode(
      new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(lum, width, height))),
      hints,
    );
    return result.getText();
  } catch {
    return null;
  }
}
