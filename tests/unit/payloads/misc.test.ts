import { describe, expect, it } from 'vitest';
import {
  findPlatform,
  parseUsername,
  socialEncoder,
  socialPlatforms,
} from '../../../src/lib/payloads/social';
import { appstoreEncoder } from '../../../src/lib/payloads/appstore';
import { reviewEncoder } from '../../../src/lib/payloads/review';
import { cryptoEncoder, ethToWei } from '../../../src/lib/payloads/crypto';

describe('social', () => {
  const enc = (platform: string, username: string, linkedinKind: 'in' | 'company' = 'in') =>
    socialEncoder.encode({ platform, username, linkedinKind });

  it.each([
    ['instagram', 'https://instagram.com/user'],
    ['facebook', 'https://facebook.com/user'],
    ['x', 'https://x.com/user'],
    ['linkedin', 'https://linkedin.com/in/user'],
    ['youtube', 'https://youtube.com/@user'],
    ['telegram', 'https://t.me/user'],
    ['snapchat', 'https://snapchat.com/add/user'],
    ['tiktok', 'https://tiktok.com/@user'],
    ['threads', 'https://threads.net/@user'],
    ['github', 'https://github.com/user'],
  ])('%s: @user, user and a pasted URL give the same output', (platform, expected) => {
    const p = findPlatform(platform)!;
    const pasted = p.template.replace('{u}', 'user');
    expect(enc(platform, '@user')).toBe(expected);
    expect(enc(platform, 'user')).toBe(expected);
    expect(enc(platform, `${pasted}/?utm_source=x`)).toBe(expected);
    expect(enc(platform, pasted.replace('https://', 'www.'))).toBe(expected);
  });
  it('detects LinkedIn company pages', () => {
    expect(enc('linkedin', 'https://www.linkedin.com/company/acme/')).toBe(
      'https://linkedin.com/company/acme',
    );
    expect(enc('linkedin', 'acme', 'company')).toBe('https://linkedin.com/company/acme');
    expect(enc('linkedin', 'https://linkedin.com/in/priya', 'company')).toBe(
      'https://linkedin.com/in/priya',
    );
  });
  it('handles legacy hosts and channel paths', () => {
    expect(enc('x', 'https://twitter.com/user')).toBe('https://x.com/user');
    expect(enc('youtube', 'https://www.youtube.com/c/user')).toBe('https://youtube.com/@user');
    expect(parseUsername(findPlatform('instagram')!, 'https://example.com/user')).toEqual({
      username: 'https://example.com/user',
    });
  });
  it('validates', () => {
    expect(
      socialEncoder.validate({ platform: 'myspace', username: 'x', linkedinKind: 'in' }),
    ).toEqual({
      ok: false,
      errors: { platform: 'errors.invalid' },
    });
    expect(socialEncoder.validate({ platform: 'x', username: ' ', linkedinKind: 'in' })).toEqual({
      ok: false,
      errors: { username: 'errors.required' },
    });
    expect(
      socialEncoder.validate({ platform: 'x', username: 'bad name!', linkedinKind: 'in' }),
    ).toEqual({
      ok: false,
      errors: { username: 'errors.social.username' },
    });
    expect(socialEncoder.validate(socialEncoder.example)).toEqual({ ok: true });
    expect(() => enc('myspace', 'x')).toThrow();
    expect(socialPlatforms.length).toBeGreaterThanOrEqual(10);
  });
});

describe('appstore', () => {
  it('encodes the chosen store', () => {
    expect(appstoreEncoder.encode(appstoreEncoder.example)).toBe(appstoreEncoder.example.playUrl);
    expect(appstoreEncoder.encode({ ...appstoreEncoder.example, store: 'apple' })).toBe(
      appstoreEncoder.example.appleUrl,
    );
  });
  it('soft-warns for other hosts and errors for bad URLs', () => {
    expect(appstoreEncoder.validate(appstoreEncoder.example)).toEqual({ ok: true });
    expect(
      appstoreEncoder.validate({ store: 'apple', playUrl: '', appleUrl: 'example.com/app' }),
    ).toEqual({
      ok: true,
      warnings: { appleUrl: 'warnings.appstore.host' },
    });
    expect(appstoreEncoder.validate({ store: 'play', playUrl: '', appleUrl: '' })).toEqual({
      ok: false,
      errors: { playUrl: 'errors.required' },
    });
    expect(appstoreEncoder.validate({ store: 'x' as never, playUrl: '', appleUrl: '' }).ok).toBe(
      false,
    );
    expect(() => appstoreEncoder.encode({ store: 'play', playUrl: '', appleUrl: '' })).toThrow();
  });
});

describe('review', () => {
  it.each([
    'https://g.page/r/CaBcDeFgHiJkEBM/review',
    'https://search.google.com/local/writereview?placeid=ChIJ',
    'https://maps.app.goo.gl/abc',
    'https://www.google.com/maps/place/X',
    'https://www.google.co.in/maps/place/X',
  ])('accepts %s', (url) => {
    expect(reviewEncoder.validate({ url })).toEqual({ ok: true });
    expect(reviewEncoder.encode({ url })).toBe(url);
  });
  it('warns for other hosts', () => {
    expect(reviewEncoder.validate({ url: 'https://www.google.com/search?q=x' })).toEqual({
      ok: true,
      warnings: { url: 'warnings.review.host' },
    });
    expect(reviewEncoder.validate({ url: '' }).ok).toBe(false);
    expect(() => reviewEncoder.encode({ url: '' })).toThrow();
  });
});

describe('crypto', () => {
  const btc = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
  const eth = '0x52908400098527886E0F7030069857D2E4169EE7';
  it('bitcoin URI', () => {
    expect(cryptoEncoder.encode({ coin: 'btc', address: btc, amount: '', chainId: '' })).toBe(
      `bitcoin:${btc}`,
    );
    expect(cryptoEncoder.encode(cryptoEncoder.example)).toBe(`bitcoin:${btc}?amount=0.001`);
    expect(
      cryptoEncoder.validate({
        coin: 'btc',
        address: '1BoatSLRHtKNngkdXEeobR76b53LETtpyT',
        amount: '',
        chainId: '',
      }),
    ).toEqual({ ok: true });
  });
  it('ethereum URI with chain id and wei', () => {
    expect(ethToWei('0.5')).toBe('500000000000000000');
    expect(ethToWei('2')).toBe('2000000000000000000');
    expect(cryptoEncoder.encode({ coin: 'eth', address: eth, amount: '0.001', chainId: '1' })).toBe(
      `ethereum:${eth}@1?value=1000000000000000`,
    );
    expect(cryptoEncoder.encode({ coin: 'eth', address: eth, amount: '', chainId: '' })).toBe(
      `ethereum:${eth}`,
    );
  });
  it('validates', () => {
    expect(
      cryptoEncoder.validate({ coin: 'eth', address: btc, amount: '-1', chainId: '0' }),
    ).toEqual({
      ok: false,
      errors: {
        address: 'errors.crypto.address',
        amount: 'errors.crypto.amount',
        chainId: 'errors.crypto.chainId',
      },
    });
    expect(
      cryptoEncoder.validate({ coin: 'doge' as never, address: '', amount: '', chainId: '' }),
    ).toEqual({
      ok: false,
      errors: { coin: 'errors.invalid', address: 'errors.required' },
    });
  });
});
