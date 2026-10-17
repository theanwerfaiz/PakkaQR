import { hostMatches, hostOf, normalizeUrl, result } from '../validate/common';
import type { PayloadEncoder } from './types';

export type AppStore = 'play' | 'apple';

export interface AppStoreFields {
  store: AppStore;
  playUrl: string;
  appleUrl: string;
}

const HOSTS: Record<AppStore, string[]> = {
  play: ['play.google.com'],
  apple: ['apps.apple.com', 'itunes.apple.com'],
};

const chosenUrl = (f: AppStoreFields) => (f.store === 'apple' ? f.appleUrl : f.playUrl);
const fieldName = (f: AppStoreFields) => (f.store === 'apple' ? 'appleUrl' : 'playUrl');

export const appstoreEncoder: PayloadEncoder<AppStoreFields> = {
  type: 'appstore',
  defaults: { store: 'play', playUrl: '', appleUrl: '' },
  example: {
    store: 'play',
    playUrl: 'https://play.google.com/store/apps/details?id=com.example.app',
    appleUrl: 'https://apps.apple.com/app/id1234567890',
  },
  validate(f) {
    if (f.store !== 'play' && f.store !== 'apple') return result({ store: 'errors.invalid' });
    const r = normalizeUrl(chosenUrl(f));
    if (!r.ok) return result({ [fieldName(f)]: r.error });
    const ok = hostMatches(hostOf(r.url), HOSTS[f.store]);
    return result({}, ok ? {} : { [fieldName(f)]: 'warnings.appstore.host' });
  },
  encode(f) {
    const r = normalizeUrl(chosenUrl(f));
    if (!r.ok) throw new Error(r.error);
    return r.url;
  },
};
