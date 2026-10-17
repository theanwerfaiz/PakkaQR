import { isBlank, parseDecimal, result } from '../validate/common';
import { encodeQueryValue } from './escape';
import type { MessageMap, PayloadEncoder } from './types';

export interface UpiFields {
  pa: string;
  pn: string;
  am: string;
  tn: string;
}

export const UPI_VPA_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
export const UPI_NOTE_MAX = 80;

/** Amounts are always written with two decimals ("150" → "150.00"). */
export function formatUpiAmount(value: string): string {
  return Number(value).toFixed(2);
}

export const upiEncoder: PayloadEncoder<UpiFields> = {
  type: 'upi',
  defaults: { pa: '', pn: '', am: '', tn: '' },
  example: { pa: 'ravi@okaxis', pn: 'Ravi Stores', am: '150', tn: 'Order 12' },
  validate({ pa, pn, am, tn }) {
    const errors: MessageMap = {};
    if (isBlank(pa)) errors.pa = 'errors.required';
    else if (!UPI_VPA_RE.test(pa.trim())) errors.pa = 'errors.upi.vpa';
    if (isBlank(pn)) errors.pn = 'errors.required';
    if (!isBlank(am)) {
      const parsed = parseDecimal(am, 2);
      if (parsed === null || Number(parsed) > 10_000_000) errors.am = 'errors.upi.amount';
    }
    if (tn.trim().length > UPI_NOTE_MAX) errors.tn = 'errors.upi.noteLength';
    return result(errors);
  },
  encode({ pa, pn, am, tn }) {
    let out = `upi://pay?pa=${pa.trim()}&pn=${encodeQueryValue(pn.trim())}`;
    if (!isBlank(am)) out += `&am=${formatUpiAmount(am.trim())}`;
    if (!isBlank(tn)) out += `&tn=${encodeQueryValue(tn.trim())}`;
    return `${out}&cu=INR`;
  },
};
