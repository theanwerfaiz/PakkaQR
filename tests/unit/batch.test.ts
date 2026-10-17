import { describe, expect, it } from 'vitest';
import {
  autoMap,
  exampleCsv,
  makeFileNames,
  parseCsv,
  prepareBatch,
  rowToFields,
} from '../../src/lib/batch';
import { qrTypes } from '../../src/lib/payloads';

describe('batch CSV', () => {
  it('parses with BOM, quotes and blank lines', () => {
    const parsed = parseCsv('\uFEFFurl,filename\n"https://a.com/x,y",one\n\nb.com,\n');
    expect(parsed.headers).toEqual(['url', 'filename']);
    expect(parsed.rows).toEqual([
      ['https://a.com/x,y', 'one'],
      ['b.com', ''],
    ]);
  });
  it('auto-maps headers using aliases', () => {
    expect(autoMap('url', ['Link', 'File Name'])).toEqual({ url: 0, filename: 1 });
    expect(autoMap('wifi', ['Network', 'Key', 'hidden'])).toMatchObject({
      ssid: 0,
      password: 1,
      hidden: 2,
      security: null,
    });
    expect(autoMap('vcard', ['First Name', 'Last_Name', 'Company'])).toMatchObject({
      firstName: 0,
      lastName: 1,
      org: 2,
    });
  });
  it('maps rows to fields with booleans and defaults', () => {
    expect(
      rowToFields('wifi', ['Cafe', 'secret123', 'yes'], {
        ssid: 0,
        password: 1,
        hidden: 2,
        filename: null,
      }),
    ).toEqual({
      ssid: 'Cafe',
      password: 'secret123',
      security: 'WPA',
      hidden: true,
    });
  });
  it('makes safe, unique file names', () => {
    const names = makeFileNames('url', [['a/b?.png'], ['x'], ['X'], ['']], {
      url: null,
      filename: 0,
    });
    expect(names).toEqual(['ab', 'x', 'X-2', 'pakkaqr-url-0004']);
  });
  it('reports invalid rows and keeps the rest', () => {
    const parsed = parseCsv('url\nexample.com\njavascript:alert(1)\nb.org');
    const { items, errors } = prepareBatch('url', parsed, autoMap('url', parsed.headers));
    expect(items.map((i) => i.payload)).toEqual(['https://example.com', 'https://b.org']);
    expect(errors).toEqual([{ row: 2, errors: { url: 'errors.url.scheme' } }]);
  });
  it('every example CSV is valid', () => {
    for (const type of qrTypes) {
      const parsed = parseCsv(exampleCsv(type));
      const { items, errors } = prepareBatch(type, parsed, autoMap(type, parsed.headers));
      expect(errors, type).toEqual([]);
      expect(items).toHaveLength(3);
      expect(items[0]!.fileName).toBe(`${type}-1`);
    }
  });
  it('handles 1000 rows quickly', () => {
    const csv = ['url', ...Array.from({ length: 1000 }, (_, i) => `example.com/item/${i}`)].join(
      '\n',
    );
    const parsed = parseCsv(csv);
    const { items } = prepareBatch('url', parsed, autoMap('url', parsed.headers));
    expect(items).toHaveLength(1000);
  });
});
