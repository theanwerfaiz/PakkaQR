import type { MessageMap, ValidationResult } from '../payloads/types';

/** Builds a ValidationResult from collected errors/warnings. */
export function result(errors: MessageMap, warnings: MessageMap = {}): ValidationResult {
  const hasWarnings = Object.keys(warnings).length > 0;
  if (Object.keys(errors).length > 0) {
    return hasWarnings ? { ok: false, errors, warnings } : { ok: false, errors };
  }
  return hasWarnings ? { ok: true, warnings } : { ok: true };
}

export const isBlank = (value: string | undefined): boolean => !value || value.trim() === '';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** Replaces CRLF / CR with LF so newlines encode the same everywhere. */
export function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, '\n');
}

export const utf8Length = (value: string): number => new TextEncoder().encode(value).length;

// ---------------------------------------------------------------- URLs

const SCHEME_RE = /^([a-z][a-z0-9+.-]*):/i;
const ALLOWED_SCHEMES = new Set(['http', 'https']);

export type UrlResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Normalises a user-typed website address: adds `https://` when no scheme
 * is present, allows only http(s), and rejects anything that does not
 * look like a real host. Keeps the user's spelling (no lower-casing or
 * trailing slash) so the code holds exactly what they typed.
 */
export function normalizeUrl(input: string): UrlResult {
  const raw = input.trim().replace(/ /g, '%20');
  if (!raw) return { ok: false, error: 'errors.required' };
  if (/\s/.test(raw)) return { ok: false, error: 'errors.url.invalid' };

  const scheme = SCHEME_RE.exec(raw);
  // "example.com:8080/x" is a host with a port, not a scheme.
  const looksLikePort = scheme ? /^\d+(?:[/?#]|$)/.test(raw.slice(scheme[0].length)) : false;
  let url = raw;
  if (scheme && !looksLikePort) {
    if (!ALLOWED_SCHEMES.has(scheme[1]!.toLowerCase())) {
      return { ok: false, error: 'errors.url.scheme' };
    }
  } else {
    url = `https://${raw.replace(/^\/\//, '')}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: 'errors.url.invalid' };
  }
  const host = parsed.hostname;
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[');
  if (!host || (!host.includes('.') && host !== 'localhost' && !isIp) || host.endsWith('.')) {
    return { ok: false, error: 'errors.url.invalid' };
  }
  return { ok: true, url };
}

/** Lower-cased hostname of a URL, or '' when it cannot be parsed. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function hostMatches(host: string, allowed: readonly string[]): boolean {
  return allowed.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

// ---------------------------------------------------------------- Phones

export const digitsOnly = (value: string): string => value.replace(/\D/g, '');

export type PhoneResult = { ok: true; digits: string } | { ok: false; error: string };

/**
 * Builds a full international number (digits only, no '+') from a
 * country calling code and a number. A number typed with '+' or '00'
 * already carries its country code, so the picker is ignored.
 */
export function internationalDigits(countryCode: string, number: string): PhoneResult {
  const typed = number.trim();
  if (!typed) return { ok: false, error: 'errors.required' };
  if (/[^\d\s()+.\-/]/.test(typed)) return { ok: false, error: 'errors.phone.invalid' };

  let digits: string;
  if (typed.startsWith('+')) {
    digits = digitsOnly(typed);
  } else if (typed.startsWith('00')) {
    digits = digitsOnly(typed).replace(/^00/, '');
  } else {
    const cc = digitsOnly(countryCode);
    if (!cc) return { ok: false, error: 'errors.phone.countryCode' };
    digits = cc + digitsOnly(typed).replace(/^0+/, '');
  }
  if (digits.length < 7 || digits.length > 15) return { ok: false, error: 'errors.phone.invalid' };
  return { ok: true, digits };
}

// ---------------------------------------------------------------- Numbers

/** Parses a plain positive decimal like "150" or "150.5" (no commas or symbols). */
export function parseDecimal(value: string, maxDecimals: number): string | null {
  const v = value.trim();
  const re = new RegExp(`^\\d+(?:\\.\\d{1,${maxDecimals}})?$`);
  if (!re.test(v)) return null;
  if (Number(v) <= 0) return null;
  return v;
}
