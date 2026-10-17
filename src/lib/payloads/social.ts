import data from '../../data/social-platforms.json';
import { hostMatches, isBlank, result } from '../validate/common';
import type { PayloadEncoder } from './types';

export interface SocialPlatform {
  id: string;
  name: string;
  template: string;
  companyTemplate?: string;
  hosts: string[];
}

export const socialPlatforms: SocialPlatform[] = data.platforms;

export type LinkedInKind = 'in' | 'company';

export interface SocialFields {
  platform: string;
  username: string;
  /** LinkedIn only: personal profile or company page. */
  linkedinKind: LinkedInKind;
}

const USERNAME_RE = /^[\p{L}\p{N}._-]{1,100}$/u;
/** Path segments that come before the username on some platforms. */
const PREFIX_SEGMENTS = new Set(['in', 'company', 'add', 'c', 'user', 'channel', 's']);

export function findPlatform(id: string): SocialPlatform | undefined {
  return socialPlatforms.find((p) => p.id === id);
}

export interface ParsedUsername {
  username: string;
  kind?: LinkedInKind;
}

/** Reduces `@user`, `user` or a pasted profile URL to the bare username. */
export function parseUsername(platform: SocialPlatform, input: string): ParsedUsername {
  let value = input.trim();
  let kind: LinkedInKind | undefined;
  const looksLikeUrl =
    /^https?:\/\//i.test(value) ||
    platform.hosts.some((h) => value.toLowerCase().includes(`${h}/`));
  if (looksLikeUrl) {
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      if (hostMatches(url.hostname.toLowerCase(), platform.hosts)) {
        const segments = url.pathname.split('/').filter(Boolean);
        if (segments[0] === 'company') kind = 'company';
        if (segments[0] === 'in') kind = 'in';
        const skip = segments.length > 1 && PREFIX_SEGMENTS.has(segments[0]!.toLowerCase());
        const seg = segments[skip ? 1 : 0] ?? '';
        value = decodeURIComponent(seg);
      }
    } catch {
      // Not a URL after all; treat as a username.
    }
  }
  value = value.replace(/^@+/, '').replace(/\/+$/, '');
  return kind ? { username: value, kind } : { username: value };
}

export const socialEncoder: PayloadEncoder<SocialFields> = {
  type: 'social',
  defaults: { platform: 'instagram', username: '', linkedinKind: 'in' },
  example: { platform: 'instagram', username: 'ravistores', linkedinKind: 'in' },
  validate({ platform, username }) {
    const p = findPlatform(platform);
    if (!p) return result({ platform: 'errors.invalid' });
    if (isBlank(username)) return result({ username: 'errors.required' });
    const parsed = parseUsername(p, username);
    return result(USERNAME_RE.test(parsed.username) ? {} : { username: 'errors.social.username' });
  },
  encode({ platform, username, linkedinKind }) {
    const p = findPlatform(platform);
    if (!p) throw new Error('errors.invalid');
    const parsed = parseUsername(p, username);
    const kind = parsed.kind ?? linkedinKind;
    const template = kind === 'company' && p.companyTemplate ? p.companyTemplate : p.template;
    return template.replace('{u}', parsed.username);
  },
};
