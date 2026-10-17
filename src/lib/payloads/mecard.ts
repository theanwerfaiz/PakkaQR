import { isBlank, isValidEmail, result } from '../validate/common';
import { escapeMeCardStyle as esc } from './escape';
import type { MessageMap, PayloadEncoder } from './types';

export interface MeCardFields {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  url: string;
  address: string;
  note: string;
}

export const mecardEncoder: PayloadEncoder<MeCardFields> = {
  type: 'mecard',
  defaults: { firstName: '', lastName: '', phone: '', email: '', url: '', address: '', note: '' },
  example: {
    firstName: 'Priya',
    lastName: 'Sharma',
    phone: '+919876543210',
    email: 'priya@example.com',
    url: 'https://example.com',
    address: '',
    note: '',
  },
  validate(f) {
    const errors: MessageMap = {};
    if (isBlank(f.firstName) && isBlank(f.lastName)) errors.firstName = 'errors.vcard.name';
    if (!isBlank(f.email) && !isValidEmail(f.email)) errors.email = 'errors.email.invalid';
    return result(errors);
  },
  encode(f) {
    const v = (s: string) => s.trim();
    const name = [v(f.lastName), v(f.firstName)].filter(Boolean).map(esc).join(',');
    let out = `MECARD:N:${name};`;
    const add = (key: string, value: string) => {
      if (value) out += `${key}:${esc(value)};`;
    };
    add('TEL', v(f.phone));
    add('EMAIL', v(f.email));
    add('URL', v(f.url));
    add('ADR', v(f.address));
    add('NOTE', v(f.note));
    return `${out};`;
  },
};
