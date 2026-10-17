import { describe, expect, it } from 'vitest';
import { detectInput, splitPhone } from '../../../src/lib/smart/detect';
import { encodeContent } from '../../../src/lib/payloads';

describe('detectInput', () => {
  it('returns null for blank input', () => {
    expect(detectInput('   ')).toBeNull();
  });

  it.each([
    ['https://chaibar.in/menu', 'url', 'url'],
    ['chaibar.in/menu', 'url', 'url'],
    ['ravi@okaxis', 'upi', 'upiId'],
    ['hello@example.com', 'email', 'email'],
    ['mailto:hello@example.com?subject=Hi', 'email', 'email'],
    ['98765 43210', 'phone', 'phone'],
    ['+91 98765 43210', 'phone', 'phone'],
    ['tel:+919876543210', 'phone', 'phone'],
    ['https://wa.me/919876543210', 'whatsapp', 'whatsapp'],
    ['@ravistores', 'social', 'handle'],
    ['12.9716, 77.5946', 'location', 'location'],
    ['geo:12.9716,77.5946', 'location', 'location'],
    ['Table 4 — ask for the chai menu', 'text', 'text'],
  ])('%s → %s', (input, type, reason) => {
    const d = detectInput(input);
    expect(d?.content.type).toBe(type);
    expect(d?.reason).toBe(reason);
  });

  it('parses a WiFi payload into the form, escapes and all', () => {
    const d = detectInput('WIFI:S:Chai Bar\\;Guest;T:WPA;P:masala42;;');
    expect(d?.content).toEqual({
      type: 'wifi',
      fields: { ssid: 'Chai Bar;Guest', password: 'masala42', security: 'WPA', hidden: false },
    });
  });

  it('parses a UPI link', () => {
    const d = detectInput('upi://pay?pa=ravi@okaxis&pn=Ravi%20Stores&am=150.00&cu=INR');
    expect(d?.content).toEqual({
      type: 'upi',
      fields: { pa: 'ravi@okaxis', pn: 'Ravi Stores', am: '150.00', tn: '' },
    });
  });

  it('every detection encodes without throwing', () => {
    for (const input of ['https://a.in', 'ravi@okaxis', '+91 98765 43210', 'hello there']) {
      const d = detectInput(input)!;
      expect(() => encodeContent(d.content)).not.toThrow();
    }
  });

  it('UPI ID detection produces a valid UPI ID field', () => {
    const d = detectInput('ravi@okaxis')!;
    const r = encodeContent(d.content);
    // Payee name is still required, so the form asks for it.
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors)).toEqual(['pn']);
  });
});

describe('splitPhone', () => {
  it.each([
    ['9876543210', { countryCode: '91', number: '9876543210' }],
    ['09876543210', { countryCode: '91', number: '9876543210' }],
    ['+1 415 555 0100', { countryCode: '1', number: '4155550100' }],
    ['+44 20 7946 0958', { countryCode: '44', number: '2079460958' }],
  ])('%s', (input, expected) => {
    expect(splitPhone(input)).toEqual(expected);
  });
  it('rejects non-numbers', () => {
    expect(splitPhone('12ab')).toBeNull();
    expect(splitPhone('123')).toBeNull();
  });
});
