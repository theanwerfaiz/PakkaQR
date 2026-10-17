import { internationalDigits, result } from '../validate/common';
import type { PayloadEncoder } from './types';

export interface SmsFields {
  countryCode: string;
  number: string;
  message: string;
}

export const smsEncoder: PayloadEncoder<SmsFields> = {
  type: 'sms',
  defaults: { countryCode: '91', number: '', message: '' },
  example: { countryCode: '91', number: '98765 43210', message: 'Please call me back' },
  validate({ countryCode, number }) {
    const r = internationalDigits(countryCode, number);
    return result(r.ok ? {} : { number: r.error });
  },
  encode({ countryCode, number, message }) {
    const r = internationalDigits(countryCode, number);
    if (!r.ok) throw new Error(r.error);
    return `SMSTO:+${r.digits}:${message.replace(/\r\n?/g, '\n').trim()}`;
  },
};
