import { sanitizeDesign, withoutLogo, type QrDesign } from './design';

/*
 * Shareable style links put the design (never content, never the logo)
 * in the URL hash, which browsers do not send to servers.
 */
const PREFIX = '#design=';

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): string {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

export function designToHash(design: QrDesign): string {
  const style = withoutLogo(design);
  if (style.frame) style.frame = { ...style.frame, label: '' };
  return PREFIX + toBase64Url(JSON.stringify(style));
}

/** Returns the design in a URL hash, or null when there is none / it is invalid. */
export function designFromHash(hash: string): QrDesign | null {
  if (!hash.startsWith(PREFIX) || hash.length > 4000) return null;
  try {
    return withoutLogo(sanitizeDesign(JSON.parse(fromBase64Url(hash.slice(PREFIX.length)))));
  } catch {
    return null;
  }
}
