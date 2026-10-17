import { describe, expect, it } from 'vitest';
import {
  classify,
  detectType,
  findRedirectDomain,
  looksLikeShortLink,
  normalizeHost,
  parseWifi,
  redirectDomains,
} from '../../src/lib/expiry';
import { isDangerousScheme, isOpenable, linkWarnings } from '../../src/lib/scanner/safety';

describe('expiry classifier', () => {
  it('static content is safe', () => {
    for (const text of [
      'WIFI:T:WPA;S:Cafe;P:12345678;;',
      'Hello world',
      'BEGIN:VCARD\r\nEND:VCARD',
      'upi://pay?pa=a@b&pn=x&cu=INR',
    ]) {
      expect(classify(text).verdict).toBe('static');
    }
    expect(classify('https://example.com/menu')).toEqual({
      verdict: 'static',
      type: 'url',
      host: 'example.com',
    });
  });
  it('known dynamic-QR redirect domains', () => {
    const r = classify('https://qrco.de/bdXYZ1');
    expect(r.verdict).toBe('dynamic');
    expect(r.match?.service).toContain('QR Code Generator');
    expect(classify('https://scnv.io/AbCd').verdict).toBe('dynamic');
  });
  it('matches subdomains, uppercase and www', () => {
    expect(classify('HTTPS://WWW.QRCO.DE/abc').verdict).toBe('dynamic');
    expect(classify('https://go.qr1.be/abc').verdict).toBe('dynamic');
    expect(normalizeHost('https://WWW.Example.COM./x')).toBe('example.com');
    expect(normalizeHost('not a url')).toBeNull();
  });
  it('known shorteners and unknown short links', () => {
    expect(classify('https://bit.ly/3abcXYZ').verdict).toBe('shortener');
    expect(classify('https://zz.io/aB3dE').verdict).toBe('shortener');
    expect(classify('https://zz.io/about').verdict).toBe('static');
    expect(looksLikeShortLink('https://example.com/aB3dE')).toBe(false);
    expect(looksLikeShortLink('nope')).toBe(false);
  });
  it('first-party short hosts are not flagged', () => {
    expect(classify('https://maps.app.goo.gl/AbC123').verdict).toBe('static');
    expect(classify('https://wa.me/919876543210').verdict).toBe('static');
  });
  it('punycode hosts are compared in ASCII form', () => {
    const r = classify('https://bücher.example/x');
    expect(r.host).toBe('xn--bcher-kva.example');
    expect(r.verdict).toBe('static');
  });
  it('every list entry has a source link', () => {
    for (const d of redirectDomains) {
      expect(d.source, d.domain).toMatch(/^https:\/\//);
      expect(findRedirectDomain(d.domain)).toBeDefined();
    }
  });
});

describe('detectType', () => {
  it.each([
    ['WIFI:T:WPA;S:x;;', 'wifi'],
    ['upi://pay?pa=x@y', 'upi'],
    ['BEGIN:VCARD', 'vcard'],
    ['MECARD:N:x;;', 'mecard'],
    ['BEGIN:VEVENT', 'event'],
    ['mailto:a@b.co', 'email'],
    ['tel:+911234567', 'phone'],
    ['SMSTO:+91:hi', 'sms'],
    ['geo:1,2', 'location'],
    ['bitcoin:bc1x', 'crypto'],
    ['https://wa.me/91', 'whatsapp'],
    ['https://www.google.com/maps/search/?api=1&query=1,2', 'location'],
    ['https://play.google.com/store/apps/details?id=x', 'appstore'],
    ['https://example.com', 'url'],
    ['plain', 'text'],
    ['  ', 'unknown'],
  ])('%s → %s', (text, type) => {
    expect(detectType(text)).toBe(type);
  });
  it('parses WiFi payloads with escapes and quotes', () => {
    expect(parseWifi('WIFI:T:WPA;S:Cafe\\;Guest;P:p\\:ss\\"1;H:true;;')).toEqual({
      ssid: 'Cafe;Guest',
      password: 'p:ss"1',
      security: 'WPA',
      hidden: true,
    });
    expect(parseWifi('WIFI:S:"ABCD12";;')).toEqual({
      ssid: 'ABCD12',
      password: '',
      security: 'nopass',
      hidden: false,
    });
    expect(parseWifi('nope')).toBeNull();
  });
});

describe('scanner link safety', () => {
  it('flags dangerous schemes and never opens them', () => {
    expect(isDangerousScheme(' javascript:alert(1)')).toBe(true);
    expect(linkWarnings('data:text/html,x')).toEqual(['dangerousScheme']);
    expect(isOpenable('javascript:alert(1)')).toBe(false);
    expect(isOpenable('https://example.com')).toBe(true);
    expect(isOpenable('tel:+91')).toBe(false);
  });
  it('warns on punycode, mixed scripts, http, credentials and IPs', () => {
    expect(linkWarnings('https://xn--pple-43d.com')).toEqual(['punycode']);
    expect(linkWarnings('https://аpple.com')).toEqual(['punycode', 'mixedScript']);
    expect(linkWarnings('http://user:pw@192.168.0.1/')).toEqual([
      'notHttps',
      'credentials',
      'ipHost',
    ]);
    expect(linkWarnings('https://example.com')).toEqual([]);
    expect(linkWarnings('not a url')).toEqual([]);
  });
});
