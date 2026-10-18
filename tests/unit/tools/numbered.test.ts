import { describe, expect, it } from 'vitest';
import { seriesCsv, seriesNumbers, SERIES_MAX } from '../../../src/lib/batch/numbered';
import { parseCsv } from '../../../src/lib/batch';

describe('numbered series', () => {
  it('pads numbers', () => {
    expect(seriesNumbers(1, 3, 2)).toEqual(['01', '02', '03']);
    expect(seriesNumbers(9, 11, 0)).toEqual(['9', '10', '11']);
  });
  it('rejects bad ranges', () => {
    expect(seriesNumbers(5, 1, 0)).toBeNull();
    expect(seriesNumbers(-1, 1, 0)).toBeNull();
    expect(seriesNumbers(1, SERIES_MAX + 1, 0)).toBeNull();
  });
  it('builds CSV the bulk tool can read', () => {
    const csv = seriesCsv({
      from: 1,
      to: 3,
      pad: 2,
      template: 'https://chaibar.in/menu?table={n}',
      column: 'url',
      fileName: 'table-{n}',
    })!;
    const parsed = parseCsv(csv);
    expect(parsed.headers).toEqual(['url', 'filename']);
    expect(parsed.rows[2]).toEqual(['https://chaibar.in/menu?table=03', 'table-03']);
  });
  it('needs {n} in the template', () => {
    expect(
      seriesCsv({ from: 1, to: 2, pad: 0, template: 'x', column: 'text', fileName: '' }),
    ).toBeNull();
  });
});
