import { describe, expect, it } from 'vitest';
import { urlEncoder } from '../../../src/lib/payloads/url';
import { textEncoder } from '../../../src/lib/payloads/text';
import { emailEncoder } from '../../../src/lib/payloads/email';
import { phoneEncoder } from '../../../src/lib/payloads/phone';
import { smsEncoder } from '../../../src/lib/payloads/sms';
import { whatsappEncoder } from '../../../src/lib/payloads/whatsapp';

describe('url', () => {
  const enc = (url: string) => urlEncoder.encode({ url });
  it('adds https:// when the scheme is missing', () => {
    expect(enc('example.com/menu')).toBe('https://example.com/menu');
    expect(enc('  example.com  ')).toBe('https://example.com');
    expect(enc('//example.com/x')).toBe('https://example.com/x');
  });
  it('keeps http and https as typed', () => {
    expect(enc('http://Example.com/A')).toBe('http://Example.com/A');
    expect(enc('HTTPS://example.com')).toBe('HTTPS://example.com');
  });
  it('treats host:port as a host, not a scheme', () => {
    expect(enc('example.com:8080/x')).toBe('https://example.com:8080/x');
    expect(enc('localhost:3000')).toBe('https://localhost:3000');
  });
  it('encodes spaces', () => {
    expect(enc('example.com/my menu')).toBe('https://example.com/my%20menu');
  });
  it.each(['javascript:alert(1)', 'data:text/html,hi', 'file:///etc/passwd', 'ftp://x.com'])(
    'rejects %s',
    (url) => {
      expect(urlEncoder.validate({ url })).toEqual({
        ok: false,
        errors: { url: 'errors.url.scheme' },
      });
      expect(() => enc(url)).toThrow();
    },
  );
  it.each(['', '   '])('requires a value (%j)', (url) => {
    expect(urlEncoder.validate({ url })).toEqual({ ok: false, errors: { url: 'errors.required' } });
  });
  it.each(['not a url\tx', 'hello', 'https://', 'example.', 'https://exa mple'])(
    'rejects invalid %j',
    (url) => {
      const r = urlEncoder.validate({ url });
      expect(r.ok).toBe(false);
    },
  );
  it('accepts IPs and the example', () => {
    expect(urlEncoder.validate({ url: '192.168.1.1/admin' }).ok).toBe(true);
    expect(urlEncoder.validate(urlEncoder.example).ok).toBe(true);
  });
});

describe('text', () => {
  it('preserves internal newlines and trims the ends', () => {
    expect(textEncoder.encode({ text: '  line 1\r\nline 2\n  ' })).toBe('line 1\nline 2');
  });
  it('requires text', () => {
    expect(textEncoder.validate({ text: ' ' }).ok).toBe(false);
    expect(textEncoder.validate({ text: 'नमस्ते 👋' }).ok).toBe(true);
  });
});

describe('email', () => {
  it('matches the spec example', () => {
    expect(
      emailEncoder.encode({ to: 'hello@example.com', subject: 'Order query', body: 'Hi there' }),
    ).toBe('mailto:hello@example.com?subject=Order%20query&body=Hi%20there');
  });
  it('omits empty params and encodes newlines as %0A', () => {
    expect(emailEncoder.encode({ to: 'a@b.co', subject: '', body: '' })).toBe('mailto:a@b.co');
    expect(emailEncoder.encode({ to: 'a@b.co', subject: ' ', body: 'one\r\ntwo' })).toBe(
      'mailto:a@b.co?body=one%0Atwo',
    );
  });
  it('validates the address', () => {
    expect(emailEncoder.validate({ to: '', subject: '', body: '' })).toEqual({
      ok: false,
      errors: { to: 'errors.required' },
    });
    expect(emailEncoder.validate({ to: 'nope', subject: '', body: '' })).toEqual({
      ok: false,
      errors: { to: 'errors.email.invalid' },
    });
  });
});

describe('phone / sms / whatsapp', () => {
  it('WhatsApp: "+91 98765-43210" → 919876543210', () => {
    expect(
      whatsappEncoder.encode({ countryCode: '1', number: '+91 98765-43210', message: '' }),
    ).toBe('https://wa.me/919876543210');
  });
  it('WhatsApp: picker + national number with leading zero', () => {
    expect(
      whatsappEncoder.encode({ countryCode: '+91', number: '098765 43210', message: '' }),
    ).toBe('https://wa.me/919876543210');
  });
  it('WhatsApp: message is URL-encoded (spec example)', () => {
    expect(
      whatsappEncoder.encode({
        countryCode: '91',
        number: '9876543210',
        message: 'Hi, I want to order',
      }),
    ).toBe('https://wa.me/919876543210?text=Hi%2C%20I%20want%20to%20order');
  });
  it('accepts 00-prefixed international numbers', () => {
    expect(phoneEncoder.encode({ countryCode: '91', number: '0044 20 7946 0958' })).toBe(
      'tel:+442079460958',
    );
  });
  it('phone: E.164 with + and no separators', () => {
    expect(phoneEncoder.encode({ countryCode: '91', number: '(98765) 43210' })).toBe(
      'tel:+919876543210',
    );
  });
  it('sms: SMSTO format, empty message allowed', () => {
    expect(smsEncoder.encode({ countryCode: '91', number: '9876543210', message: '' })).toBe(
      'SMSTO:+919876543210:',
    );
    expect(
      smsEncoder.encode({ countryCode: '91', number: '9876543210', message: ' Call me\r\nback ' }),
    ).toBe('SMSTO:+919876543210:Call me\nback');
  });
  it.each([
    ['', 'errors.required'],
    ['abc', 'errors.phone.invalid'],
    ['12', 'errors.phone.invalid'],
    ['+1234567890123456', 'errors.phone.invalid'],
  ])('rejects %j', (number, error) => {
    expect(phoneEncoder.validate({ countryCode: '91', number })).toEqual({
      ok: false,
      errors: { number: error },
    });
    expect(smsEncoder.validate({ countryCode: '91', number, message: '' }).ok).toBe(false);
    expect(whatsappEncoder.validate({ countryCode: '91', number, message: '' }).ok).toBe(false);
  });
  it('needs a country code for national numbers', () => {
    expect(phoneEncoder.validate({ countryCode: '', number: '9876543210' })).toEqual({
      ok: false,
      errors: { number: 'errors.phone.countryCode' },
    });
  });
  it('throws when encoding invalid input', () => {
    expect(() => phoneEncoder.encode({ countryCode: '', number: '' })).toThrow();
    expect(() => smsEncoder.encode({ countryCode: '', number: '', message: '' })).toThrow();
    expect(() => whatsappEncoder.encode({ countryCode: '', number: '', message: '' })).toThrow();
  });
});
