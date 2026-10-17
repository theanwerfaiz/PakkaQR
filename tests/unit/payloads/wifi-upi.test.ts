import { describe, expect, it } from 'vitest';
import { wifiEncoder } from '../../../src/lib/payloads/wifi';
import { upiEncoder, formatUpiAmount } from '../../../src/lib/payloads/upi';

const wifi = (o: Partial<Parameters<typeof wifiEncoder.encode>[0]>) =>
  wifiEncoder.encode({ ...wifiEncoder.defaults, ...o });

describe('wifi', () => {
  it('matches the spec example', () => {
    expect(wifi({ ssid: 'Cafe;Guest', password: 'p:ss"1', security: 'WPA' })).toBe(
      'WIFI:T:WPA;S:Cafe\\;Guest;P:p\\:ss\\"1;;',
    );
  });
  it.each([
    ['\\', '\\\\'],
    [';', '\\;'],
    [',', '\\,'],
    [':', '\\:'],
    ['"', '\\"'],
  ])('escapes %s in SSID and password', (ch, escaped) => {
    expect(wifi({ ssid: `a${ch}b`, password: `pass${ch}word` })).toBe(
      `WIFI:T:WPA;S:a${escaped}b;P:pass${escaped}word;;`,
    );
  });
  it('omits P for nopass', () => {
    expect(wifi({ ssid: 'Open', password: 'ignored', security: 'nopass' })).toBe(
      'WIFI:T:nopass;S:Open;;',
    );
  });
  it('adds H:true only when hidden', () => {
    expect(wifi({ ssid: 'Home', password: '12345678', hidden: true })).toBe(
      'WIFI:T:WPA;S:Home;P:12345678;H:true;;',
    );
    expect(wifi({ ssid: 'Home', password: '12345678', hidden: false })).not.toContain('H:');
  });
  it('quotes hex-only SSIDs', () => {
    expect(wifi({ ssid: 'ABCDEF12', password: '12345678' })).toBe(
      'WIFI:T:WPA;S:"ABCDEF12";P:12345678;;',
    );
  });
  it('WEP', () => {
    expect(wifi({ ssid: 'Old', password: 'abcde', security: 'WEP' })).toBe(
      'WIFI:T:WEP;S:Old;P:abcde;;',
    );
  });
  it('keeps spaces in credentials (not trimmed)', () => {
    expect(wifi({ ssid: ' My Net ', password: ' secret pass ' })).toBe(
      'WIFI:T:WPA;S: My Net ;P: secret pass ;;',
    );
  });
  it('validates', () => {
    const v = (o: Partial<Parameters<typeof wifiEncoder.validate>[0]>) =>
      wifiEncoder.validate({ ...wifiEncoder.defaults, ...o });
    expect(v({})).toEqual({
      ok: false,
      errors: { ssid: 'errors.required', password: 'errors.required' },
    });
    expect(v({ ssid: 'x', password: 'short' })).toEqual({
      ok: false,
      errors: { password: 'errors.wifi.wpaLength' },
    });
    expect(v({ ssid: 'x'.repeat(33), security: 'nopass' })).toEqual({
      ok: false,
      errors: { ssid: 'errors.wifi.ssidLength' },
    });
    expect(v({ ssid: 'x', security: 'nopass' })).toEqual({ ok: true });
    expect(v({ ssid: 'x', password: 'abc', security: 'WEP' })).toEqual({ ok: true });
    expect(v({ ssid: 'x', security: 'BAD' as never, password: 'abcdefgh' })).toEqual({
      ok: false,
      errors: { security: 'errors.invalid' },
    });
  });
});

const upi = (o: Partial<Parameters<typeof upiEncoder.encode>[0]>) =>
  upiEncoder.encode({ ...upiEncoder.defaults, ...o });
const upiV = (o: Partial<Parameters<typeof upiEncoder.validate>[0]>) =>
  upiEncoder.validate({ ...upiEncoder.defaults, ...o });

describe('upi', () => {
  it('matches the spec example', () => {
    expect(upi({ pa: 'ravi@okaxis', pn: 'Ravi Stores', am: '150.00', tn: 'Order 12' })).toBe(
      'upi://pay?pa=ravi@okaxis&pn=Ravi%20Stores&am=150.00&tn=Order%2012&cu=INR',
    );
  });
  it('always writes two decimals', () => {
    expect(formatUpiAmount('150')).toBe('150.00');
    expect(formatUpiAmount('150.5')).toBe('150.50');
    expect(upi({ pa: 'ravi@okaxis', pn: 'R', am: '150' })).toBe(
      'upi://pay?pa=ravi@okaxis&pn=R&am=150.00&cu=INR',
    );
  });
  it('omits empty optional fields', () => {
    expect(upi({ pa: 'ravi@okaxis', pn: 'Ravi', am: ' ', tn: '' })).toBe(
      'upi://pay?pa=ravi@okaxis&pn=Ravi&cu=INR',
    );
  });
  it('encodes a Hindi payee name', () => {
    expect(upi({ pa: 'ravi@okaxis', pn: 'रवि स्टोर्स' })).toBe(
      `upi://pay?pa=ravi@okaxis&pn=${encodeURIComponent('रवि स्टोर्स')}&cu=INR`,
    );
  });
  it.each(['ravi', 'ravi@', '@okaxis', 'r@okaxis', 'ravi@ok axis', 'ravi@123', 'ra vi@okaxis'])(
    'rejects invalid VPA %j',
    (pa) => {
      expect(upiV({ pa, pn: 'R' })).toEqual({ ok: false, errors: { pa: 'errors.upi.vpa' } });
    },
  );
  it.each(['0', '-5', '1,000', '₹100', '10.123', 'abc', '20000000'])('rejects amount %j', (am) => {
    expect(upiV({ pa: 'ravi@okaxis', pn: 'R', am })).toEqual({
      ok: false,
      errors: { am: 'errors.upi.amount' },
    });
  });
  it('requires VPA and name; limits note to 80 chars', () => {
    expect(upiV({})).toEqual({
      ok: false,
      errors: { pa: 'errors.required', pn: 'errors.required' },
    });
    expect(upiV({ pa: 'a.b-c_d@ybl', pn: 'R', tn: 'x'.repeat(81) })).toEqual({
      ok: false,
      errors: { tn: 'errors.upi.noteLength' },
    });
    expect(upiV({ pa: 'a.b-c_d@ybl', pn: 'R', tn: 'x'.repeat(80), am: '99.9' })).toEqual({
      ok: true,
    });
  });
});
