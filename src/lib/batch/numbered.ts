import Papa from 'papaparse';

export interface SeriesOptions {
  from: number;
  to: number;
  /** Zero-pad to this many digits (0 = no padding). */
  pad: number;
  /** Text for the code; `{n}` is replaced by the number. */
  template: string;
  /** Column the template fills (the type's main field, e.g. "url"). */
  column: string;
  /** File name pattern; `{n}` is replaced. */
  fileName: string;
}

export const SERIES_MAX = 5000;

/** Numbers from..to as padded strings, or null for an invalid range. */
export function seriesNumbers(from: number, to: number, pad: number): string[] | null {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < from) return null;
  if (to - from + 1 > SERIES_MAX) return null;
  const width = Math.max(0, Math.min(8, pad));
  return Array.from({ length: to - from + 1 }, (_, i) => String(from + i).padStart(width, '0'));
}

/** Builds CSV text (with a filename column) for the bulk generator. */
export function seriesCsv(o: SeriesOptions): string | null {
  const numbers = seriesNumbers(o.from, o.to, o.pad);
  if (!numbers || !o.template.includes('{n}')) return null;
  const fill = (s: string, n: string) => s.split('{n}').join(n);
  return Papa.unparse([
    [o.column, 'filename'],
    ...numbers.map((n) => [fill(o.template, n), fill(o.fileName || 'code-{n}', n)]),
  ]);
}
