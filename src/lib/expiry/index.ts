import data from '../../data/redirect-domains.json' with { type: 'json' };
import { detectType, type DetectedType } from './detect';

export { detectType, parseWifi } from './detect';

export type Verdict = 'static' | 'dynamic' | 'shortener';

export interface RedirectDomain {
  domain: string;
  category: 'dynamic-qr' | 'shortener';
  service: string;
  source: string;
}

export const redirectDomains = data.domains as RedirectDomain[];
const safeShortHosts = new Set(data.safeShortHosts.hosts);

export interface Classification {
  verdict: Verdict;
  type: DetectedType;
  host?: string;
  /** The matched list entry, when there is one. */
  match?: RedirectDomain;
}

/** Lower-cased, punycode-normalised hostname without a leading "www.". */
export function normalizeHost(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/\.$/, '');
    return host.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function findRedirectDomain(host: string): RedirectDomain | undefined {
  return redirectDomains.find((d) => host === d.domain || host.endsWith(`.${d.domain}`));
}

/**
 * A host we have never heard of with a short random-looking path is
 * probably a link shortener — but we can't be sure, so it is "unknown".
 */
export function looksLikeShortLink(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const label = host.split('.').slice(0, -1).join('.');
    const segments = u.pathname.split('/').filter(Boolean);
    return (
      label.length > 0 &&
      label.length <= 6 &&
      segments.length === 1 &&
      /^[A-Za-z0-9_-]{3,12}$/.test(segments[0]!) &&
      /\d|[A-Z]/.test(segments[0]!) &&
      !u.search
    );
  } catch {
    return false;
  }
}

/**
 * Classifies decoded QR content without any network request (we never
 * visit the link — that would leak what the user scanned).
 */
export function classify(text: string): Classification {
  const type = detectType(text);
  const trimmed = text.trim();
  if (!/^https?:\/\//i.test(trimmed)) return { verdict: 'static', type };
  const host = normalizeHost(trimmed);
  if (!host) return { verdict: 'static', type };
  const match = safeShortHosts.has(host) ? undefined : findRedirectDomain(host);
  if (match)
    return {
      verdict: match.category === 'dynamic-qr' ? 'dynamic' : 'shortener',
      type,
      host,
      match,
    };
  if (!safeShortHosts.has(host) && looksLikeShortLink(trimmed))
    return { verdict: 'shortener', type, host };
  return { verdict: 'static', type, host };
}
