import { internationalDigits, result } from '../validate/common';
import type { PayloadEncoder } from './types';

export interface PhoneFields {
  countryCode: string;
  number: string;
}

export const phoneEncoder: PayloadEncoder<PhoneFields> = {
  type: 'phone',
  defaults: { countryCode: '91', number: '' },
  example: { countryCode: '91', number: '98765 43210' },
  validate({ countryCode, number }) {
    const r = internationalDigits(countryCode, number);
    return result(r.ok ? {} : { number: r.error });
  },
  encode({ countryCode, number }) {
    const r = internationalDigits(countryCode, number);
    if (!r.ok) throw new Error(r.error);
    return `tel:+${r.digits}`;
  },
};
