import { describe, expect, it } from 'vitest';
import { vcardEncoder } from '../../../src/lib/payloads/vcard';
import { mecardEncoder } from '../../../src/lib/payloads/mecard';

const vc = (o: Partial<Parameters<typeof vcardEncoder.encode>[0]>) =>
  vcardEncoder.encode({ ...vcardEncoder.defaults, ...o });

describe('vcard', () => {
  it('omits empty lines but keeps N and FN, with CRLF endings', () => {
    expect(vc({ firstName: 'Priya' })).toBe(
      ['BEGIN:VCARD', 'VERSION:3.0', 'N:;Priya;;;', 'FN:Priya', 'END:VCARD'].join('\r\n'),
    );
  });
  it('escapes comma, semicolon, backslash and newlines', () => {
    const out = vc({ firstName: 'A,B', lastName: 'C;D', org: 'X\\Y', note: 'line1\nline2' });
    expect(out).toContain('N:C\\;D;A\\,B;;;');
    expect(out).toContain('FN:A\\,B C\\;D');
    expect(out).toContain('ORG:X\\\\Y');
    expect(out).toContain('NOTE:line1\\nline2');
    expect(out.split('\r\n')).toHaveLength(7);
    expect(out).not.toMatch(/[^\r]\n/);
  });
  it('writes every field of the example in order', () => {
    expect(
      vcardEncoder.encode({ ...vcardEncoder.example, work: '080 1234 5678', note: 'Hi' }),
    ).toBe(
      [
        'BEGIN:VCARD',
        'VERSION:3.0',
        'N:Sharma;Priya;;;',
        'FN:Priya Sharma',
        'ORG:Sharma Designs',
        'TITLE:Founder',
        'TEL;TYPE=CELL:+91 98765 43210',
        'TEL;TYPE=WORK:080 1234 5678',
        'EMAIL:priya@example.com',
        'URL:https://example.com',
        'ADR;TYPE=WORK:;;12 MG Road;Bengaluru;Karnataka;560001;India',
        'NOTE:Hi',
        'END:VCARD',
      ].join('\r\n'),
    );
  });
  it('adds https:// to the website', () => {
    expect(vc({ lastName: 'S', website: 'example.com' })).toContain('URL:https://example.com');
  });
  it('validates', () => {
    const v = (o: Partial<Parameters<typeof vcardEncoder.validate>[0]>) =>
      vcardEncoder.validate({ ...vcardEncoder.defaults, ...o });
    expect(v({})).toEqual({ ok: false, errors: { firstName: 'errors.vcard.name' } });
    expect(
      v({ lastName: 'S', email: 'x', mobile: 'abc', work: 'z', website: 'javascript:x' }),
    ).toEqual({
      ok: false,
      errors: {
        email: 'errors.email.invalid',
        mobile: 'errors.phone.invalid',
        work: 'errors.phone.invalid',
        website: 'errors.url.scheme',
      },
    });
    expect(v(vcardEncoder.example)).toEqual({ ok: true });
    expect(vcardEncoder.denseThreshold).toBe(400);
  });
});

describe('mecard', () => {
  it('builds the compact format and escapes specials', () => {
    expect(mecardEncoder.encode(mecardEncoder.example)).toBe(
      'MECARD:N:Sharma,Priya;TEL:+919876543210;EMAIL:priya@example.com;URL:https\\://example.com;;',
    );
    expect(
      mecardEncoder.encode({
        ...mecardEncoder.defaults,
        firstName: 'A;B',
        address: 'X, Y',
        note: 'q"',
      }),
    ).toBe('MECARD:N:A\\;B;ADR:X\\, Y;NOTE:q\\";;');
  });
  it('validates', () => {
    expect(mecardEncoder.validate(mecardEncoder.defaults)).toEqual({
      ok: false,
      errors: { firstName: 'errors.vcard.name' },
    });
    expect(
      mecardEncoder.validate({ ...mecardEncoder.defaults, lastName: 'S', email: 'bad' }),
    ).toEqual({
      ok: false,
      errors: { email: 'errors.email.invalid' },
    });
  });
});
