import { isBlank, isValidEmail, normalizeUrl, result } from '../validate/common';
import { escapeText } from './escape';
import type { MessageMap, PayloadEncoder } from './types';

export interface VCardFields {
  firstName: string;
  lastName: string;
  org: string;
  title: string;
  mobile: string;
  work: string;
  email: string;
  website: string;
  street: string;
  city: string;
  region: string;
  postcode: string;
  country: string;
  note: string;
}

const PHONE_RE = /^\+?[\d\s()./-]{3,}$/;

export const vcardEncoder: PayloadEncoder<VCardFields> = {
  type: 'vcard',
  denseThreshold: 400,
  defaults: {
    firstName: '',
    lastName: '',
    org: '',
    title: '',
    mobile: '',
    work: '',
    email: '',
    website: '',
    street: '',
    city: '',
    region: '',
    postcode: '',
    country: '',
    note: '',
  },
  example: {
    firstName: 'Priya',
    lastName: 'Sharma',
    org: 'Sharma Designs',
    title: 'Founder',
    mobile: '+91 98765 43210',
    work: '',
    email: 'priya@example.com',
    website: 'https://example.com',
    street: '12 MG Road',
    city: 'Bengaluru',
    region: 'Karnataka',
    postcode: '560001',
    country: 'India',
    note: '',
  },
  validate(f) {
    const errors: MessageMap = {};
    if (isBlank(f.firstName) && isBlank(f.lastName)) errors.firstName = 'errors.vcard.name';
    if (!isBlank(f.email) && !isValidEmail(f.email)) errors.email = 'errors.email.invalid';
    if (!isBlank(f.mobile) && !PHONE_RE.test(f.mobile.trim()))
      errors.mobile = 'errors.phone.invalid';
    if (!isBlank(f.work) && !PHONE_RE.test(f.work.trim())) errors.work = 'errors.phone.invalid';
    if (!isBlank(f.website)) {
      const r = normalizeUrl(f.website);
      if (!r.ok) errors.website = r.error;
    }
    return result(errors);
  },
  encode(f) {
    const v = (s: string) => s.trim();
    const first = v(f.firstName);
    const last = v(f.lastName);
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${escapeText(last)};${escapeText(first)};;;`,
      `FN:${escapeText([first, last].filter(Boolean).join(' '))}`,
    ];
    const add = (prefix: string, value: string, escape = true) => {
      if (value) lines.push(`${prefix}:${escape ? escapeText(value) : value}`);
    };
    add('ORG', v(f.org));
    add('TITLE', v(f.title));
    add('TEL;TYPE=CELL', v(f.mobile), false);
    add('TEL;TYPE=WORK', v(f.work), false);
    add('EMAIL', v(f.email), false);
    if (!isBlank(f.website)) {
      const r = normalizeUrl(f.website);
      add('URL', r.ok ? r.url : v(f.website), false);
    }
    const adr = [f.street, f.city, f.region, f.postcode, f.country].map(v);
    if (adr.some(Boolean)) lines.push(`ADR;TYPE=WORK:;;${adr.map(escapeText).join(';')}`);
    add('NOTE', v(f.note).replace(/\r\n?/g, '\n'));
    lines.push('END:VCARD');
    return lines.join('\r\n');
  },
};
