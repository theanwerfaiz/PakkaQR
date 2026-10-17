import { hostMatches, hostOf, normalizeUrl, result } from '../validate/common';
import type { PayloadEncoder } from './types';

export interface ReviewFields {
  url: string;
}

const REVIEW_HOSTS = ['g.page', 'search.google.com', 'maps.app.goo.gl', 'goo.gl', 'g.co'];

function isGoogleMapsUrl(url: string): boolean {
  const host = hostOf(url);
  return /(^|\.)google\.[a-z.]+$/.test(host) && new URL(url).pathname.startsWith('/maps');
}

export const reviewEncoder: PayloadEncoder<ReviewFields> = {
  type: 'review',
  defaults: { url: '' },
  example: { url: 'https://g.page/r/CaBcDeFgHiJkEBM/review' },
  validate({ url }) {
    const r = normalizeUrl(url);
    if (!r.ok) return result({ url: r.error });
    const ok = hostMatches(hostOf(r.url), REVIEW_HOSTS) || isGoogleMapsUrl(r.url);
    return result({}, ok ? {} : { url: 'warnings.review.host' });
  },
  encode({ url }) {
    const r = normalizeUrl(url);
    if (!r.ok) throw new Error(r.error);
    return r.url;
  },
};
