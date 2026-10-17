import { internationalDigits, isBlank, result } from '../validate/common';
import { encodeQueryValue } from './escape';
import type { PayloadEncoder } from './types';

export interface WhatsAppFields {
  countryCode: string;
  number: string;
  message: string;
}

export const whatsappEncoder: PayloadEncoder<WhatsAppFields> = {
  type: 'whatsapp',
  defaults: { countryCode: '91', number: '', message: '' },
  example: { countryCode: '91', number: '98765 43210', message: 'Hi, I want to order' },
  validate({ countryCode, number }) {
    const r = internationalDigits(countryCode, number);
    return result(r.ok ? {} : { number: r.error });
  },
  encode({ countryCode, number, message }) {
    const r = internationalDigits(countryCode, number);
    if (!r.ok) throw new Error(r.error);
    const text = message.trim();
    return `https://wa.me/${r.digits}${isBlank(text) ? '' : `?text=${encodeQueryValue(text)}`}`;
  },
};
