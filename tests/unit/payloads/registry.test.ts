import { describe, expect, it } from 'vitest';
import {
  encodeContent,
  encoders,
  exampleContent,
  isQrType,
  qrTypes,
  withDefaults,
} from '../../../src/lib/payloads';

describe('registry', () => {
  it('has an encoder for every type, and every example is valid', () => {
    for (const type of qrTypes) {
      const enc = encoders[type];
      expect(enc.type).toBe(type);
      const r = encodeContent(exampleContent(type));
      expect(r.ok, type).toBe(true);
      if (r.ok) expect(r.payload.length).toBeGreaterThan(0);
    }
  });
  it('merges defaults and drops unknown or mistyped fields', () => {
    expect(withDefaults('wifi', { ssid: 'x', bogus: 'y', hidden: 'yes' })).toEqual({
      ssid: 'x',
      password: '',
      security: 'WPA',
      hidden: false,
    });
  });
  it('returns errors without throwing', () => {
    expect(encodeContent({ type: 'url', fields: {} })).toEqual({
      ok: false,
      errors: { url: 'errors.required' },
      warnings: {},
    });
  });
  it('flags dense payloads', () => {
    const r = encodeContent({ type: 'text', fields: { text: 'x'.repeat(301) } });
    expect(r.ok && r.dense).toBe(true);
    const v = encodeContent({ type: 'vcard', fields: { firstName: 'x'.repeat(140) } });
    expect(v.ok && v.dense).toBe(false);
  });
  it('isQrType', () => {
    expect(isQrType('wifi')).toBe(true);
    expect(isQrType('fax')).toBe(false);
  });
});
