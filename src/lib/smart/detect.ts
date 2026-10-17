import { parseWifi } from '../expiry/detect';
import { UPI_VPA_RE } from '../payloads/upi';
import type { QrContent } from '../payloads/types';
import { isValidEmail } from '../validate/common';

/** Why we picked a type, as an i18n key under `smart.reason`. */
export type DetectReason =
  | 'wifi'
  | 'upiLink'
  | 'upiId'
  | 'email'
  | 'phone'
  | 'whatsapp'
  | 'handle'
  | 'location'
  | 'url'
  | 'text';

export interface Detection {
  content: QrContent;
  reason: DetectReason;
}

const DOMAIN_RE =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}(?::\d{1,5})?(?:[/?#]\S*)?$/i;
const COORDS_RE = /^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/;
const HANDLE_RE = /^@([A-Za-z0-9._]{2,30})$/;

/** Splits a typed phone number into country code + national number. */
export function splitPhone(raw: string): { countryCode: string; number: string } | null {
  const s = raw.trim().replace(/^tel:/i, '');
  if (!/^\+?[\d\s().-]{7,20}$/.test(s)) return null;
  const digits = s.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  if (s.startsWith('+')) {
    // Indian numbers are the common case; anything else keeps its digits whole.
    if (digits.startsWith('91') && digits.length === 12)
      return { countryCode: '91', number: digits.slice(2) };
    if (digits.startsWith('1') && digits.length === 11)
      return { countryCode: '1', number: digits.slice(1) };
    return { countryCode: digits.slice(0, digits.length - 10) || '91', number: digits.slice(-10) };
  }
  if (digits.length === 10) return { countryCode: '91', number: digits };
  if (digits.length === 11 && digits.startsWith('0'))
    return { countryCode: '91', number: digits.slice(1) };
  if (digits.length === 12 && digits.startsWith('91'))
    return { countryCode: '91', number: digits.slice(2) };
  return null;
}

function upiFromLink(text: string): QrContent | null {
  let params: URLSearchParams;
  try {
    params = new URL(text).searchParams;
  } catch {
    return null;
  }
  const pa = params.get('pa') ?? '';
  if (!pa) return null;
  return {
    type: 'upi',
    fields: {
      pa,
      pn: params.get('pn') ?? '',
      am: params.get('am') ?? '',
      tn: params.get('tn') ?? '',
    },
  };
}

/**
 * Guesses what someone pasted into the "What should the code open?" box and
 * turns it into form content. Pure: never touches the network.
 */
export function detectInput(raw: string): Detection | null {
  const text = raw.trim();
  if (!text) return null;
  const lower = text.toLowerCase();

  if (lower.startsWith('wifi:')) {
    const w = parseWifi(text);
    if (w) {
      const security = ['WPA', 'WEP', 'nopass'].includes(w.security) ? w.security : 'WPA';
      return {
        reason: 'wifi',
        content: {
          type: 'wifi',
          fields: { ssid: w.ssid, password: w.password, security, hidden: w.hidden },
        },
      };
    }
  }

  if (lower.startsWith('upi://')) {
    const content = upiFromLink(text);
    if (content) return { reason: 'upiLink', content };
  }

  if (lower.startsWith('mailto:')) {
    const to = decodeURIComponent(text.slice(7).split('?')[0] ?? '');
    return { reason: 'email', content: { type: 'email', fields: { to, subject: '', body: '' } } };
  }

  if (!/\s/.test(text) && text.includes('@') && !text.startsWith('@')) {
    if (isValidEmail(text))
      return {
        reason: 'email',
        content: { type: 'email', fields: { to: text, subject: '', body: '' } },
      };
    if (UPI_VPA_RE.test(text))
      return {
        reason: 'upiId',
        content: { type: 'upi', fields: { pa: text, pn: '', am: '', tn: '' } },
      };
  }

  const handle = HANDLE_RE.exec(text);
  if (handle)
    return {
      reason: 'handle',
      content: {
        type: 'social',
        fields: { platform: 'instagram', username: handle[1]!, linkedinKind: 'in' },
      },
    };

  const waMatch = /^(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/?(\d{8,15})/i.exec(
    text,
  );
  if (waMatch) {
    const phone = splitPhone(`+${waMatch[1]}`);
    if (phone)
      return {
        reason: 'whatsapp',
        content: { type: 'whatsapp', fields: { ...phone, message: '' } },
      };
  }

  const phone = splitPhone(text);
  if (phone) return { reason: 'phone', content: { type: 'phone', fields: phone } };

  const coords = COORDS_RE.exec(text) ?? /^geo:(-?[\d.]+),(-?[\d.]+)/i.exec(text);
  if (coords && Math.abs(Number(coords[1])) <= 90 && Math.abs(Number(coords[2])) <= 180)
    return {
      reason: 'location',
      content: {
        type: 'location',
        fields: { mapsLink: '', lat: coords[1]!, lng: coords[2]!, format: 'maps' },
      },
    };

  if (/^https?:\/\//i.test(text) || (!/\s/.test(text) && DOMAIN_RE.test(text)))
    return { reason: 'url', content: { type: 'url', fields: { url: text } } };

  return { reason: 'text', content: { type: 'text', fields: { text } } };
}
