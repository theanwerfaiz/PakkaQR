import type { QrType } from '../payloads/types';

export type DetectedType = QrType | 'unknown';

/** Guesses what kind of content a decoded QR code holds. */
export function detectType(text: string): DetectedType {
  const s = text.trim();
  const lower = s.toLowerCase();
  if (lower.startsWith('wifi:')) return 'wifi';
  if (lower.startsWith('upi://')) return 'upi';
  if (lower.startsWith('begin:vcard')) return 'vcard';
  if (lower.startsWith('mecard:')) return 'mecard';
  if (lower.startsWith('begin:vevent') || lower.startsWith('begin:vcalendar')) return 'event';
  if (lower.startsWith('mailto:') || lower.startsWith('matmsg:')) return 'email';
  if (lower.startsWith('tel:')) return 'phone';
  if (lower.startsWith('smsto:') || lower.startsWith('sms:')) return 'sms';
  if (lower.startsWith('geo:')) return 'location';
  if (lower.startsWith('bitcoin:') || lower.startsWith('ethereum:')) return 'crypto';
  if (/^https?:\/\//i.test(s)) {
    if (/^https?:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(s)) return 'whatsapp';
    if (
      /^https?:\/\/(www\.)?google\.[a-z.]+\/maps|^https?:\/\/maps\.(google\.[a-z.]+|app\.goo\.gl)/i.test(
        s,
      )
    )
      return 'location';
    if (/^https?:\/\/(play\.google\.com|apps\.apple\.com)\//i.test(s)) return 'appstore';
    return 'url';
  }
  return s ? 'text' : 'unknown';
}

export interface WifiDetails {
  ssid: string;
  password: string;
  security: string;
  hidden: boolean;
}

/** Parses a WIFI: payload (handles backslash escapes and quoted values). */
export function parseWifi(text: string): WifiDetails | null {
  if (!/^wifi:/i.test(text.trim())) return null;
  const body = text.trim().slice(5);
  const out: Record<string, string> = {};
  let key = '';
  let value = '';
  let readingKey = true;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]!;
    if (ch === '\\' && i + 1 < body.length) {
      value += body[++i];
      continue;
    }
    if (readingKey) {
      if (ch === ':') readingKey = false;
      else if (ch !== ';') key += ch;
    } else if (ch === ';') {
      out[key.toUpperCase()] = value;
      key = '';
      value = '';
      readingKey = true;
    } else {
      value += ch;
    }
  }
  const unquote = (v = '') => (/^".*"$/.test(v) ? v.slice(1, -1) : v);
  return {
    ssid: unquote(out.S),
    password: unquote(out.P),
    security: out.T || 'nopass',
    hidden: (out.H ?? '').toLowerCase() === 'true',
  };
}
