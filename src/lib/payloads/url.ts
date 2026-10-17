import { normalizeUrl, result } from '../validate/common';
import type { PayloadEncoder } from './types';

export interface UrlFields {
  url: string;
}

export const urlEncoder: PayloadEncoder<UrlFields> = {
  type: 'url',
  defaults: { url: '' },
  example: { url: 'https://example.com/menu' },
  validate({ url }) {
    const r = normalizeUrl(url);
    return result(r.ok ? {} : { url: r.error });
  },
  encode({ url }) {
    const r = normalizeUrl(url);
    if (!r.ok) throw new Error(r.error);
    return r.url;
  },
};
