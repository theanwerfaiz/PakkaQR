import qrcode from 'qrcode-generator';
import type { EcLevel } from './design';

export interface QrMatrix {
  /** Modules per side. */
  size: number;
  /** QR version 1–40. */
  version: number;
  ecLevel: EcLevel;
  dark: boolean[][];
}

export class PayloadTooLongError extends Error {
  constructor() {
    super('errors.tooLong');
    this.name = 'PayloadTooLongError';
  }
}

const encoder = new TextEncoder();
// Byte mode with UTF-8, so Hindi, emoji and accents round-trip.
const utf8Bytes = (s: string): number[] => Array.from(encoder.encode(s));

/** Byte-mode capacity per version (1–40) at each EC level. */
export function makeMatrix(payload: string, ecLevel: EcLevel): QrMatrix {
  const previous = qrcode.stringToBytes;
  qrcode.stringToBytes = utf8Bytes;
  try {
    const qr = qrcode(0, ecLevel);
    qr.addData(payload, 'Byte');
    try {
      qr.make();
    } catch {
      throw new PayloadTooLongError();
    }
    const size = qr.getModuleCount();
    const dark: boolean[][] = [];
    for (let r = 0; r < size; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < size; c++) row.push(qr.isDark(r, c));
      dark.push(row);
    }
    return { size, version: (size - 17) / 4, ecLevel, dark };
  } finally {
    qrcode.stringToBytes = previous;
  }
}

/** True when (r, c) is inside one of the three 7×7 finder patterns. */
export function isFinderModule(size: number, r: number, c: number): boolean {
  const near = (v: number) => v < 7;
  const far = (v: number) => v >= size - 7;
  return (near(r) && near(c)) || (near(r) && far(c)) || (far(r) && near(c));
}
