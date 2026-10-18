/*
 * Secret notes: a message encrypted with a password, carried inside the QR
 * code itself. PBKDF2-SHA-256 derives an AES-256-GCM key; salt and IV are
 * random per note. Format: "pq1:" + base64url(salt[16] | iv[12] | ciphertext).
 * Runs with the Web Crypto API on the device — nothing is sent anywhere.
 */

export const SECRET_PREFIX = 'pq1:';
export const SECRET_ITERATIONS = 210_000;
export const SECRET_MAX_CHARS = 300;
export const SECRET_MIN_PASSWORD = 4;

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return null;
  try {
    const s = atob(
      text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4),
    );
    return Uint8Array.from(s, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptNote(
  message: string,
  password: string,
  iterations = SECRET_ITERATIONS,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, iterations);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      enc.encode(message),
    ),
  );
  const out = new Uint8Array(salt.length + iv.length + ct.length);
  out.set(salt, 0);
  out.set(iv, salt.length);
  out.set(ct, salt.length + iv.length);
  return SECRET_PREFIX + b64url(out);
}

export type DecryptResult =
  { ok: true; message: string } | { ok: false; error: 'format' | 'password' };

export async function decryptNote(
  token: string,
  password: string,
  iterations = SECRET_ITERATIONS,
): Promise<DecryptResult> {
  const t = extractToken(token);
  if (!t) return { ok: false, error: 'format' };
  const bytes = fromB64url(t.slice(SECRET_PREFIX.length));
  if (!bytes || bytes.length < 16 + 12 + 17) return { ok: false, error: 'format' };
  const key = await deriveKey(password, bytes.slice(0, 16), iterations);
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bytes.slice(16, 28) as BufferSource },
      key,
      bytes.slice(28) as BufferSource,
    );
    return { ok: true, message: dec.decode(plain) };
  } catch {
    return { ok: false, error: 'password' };
  }
}

/** Finds a "pq1:…" token in a raw token, a URL hash or a full link. */
export function extractToken(text: string): string | null {
  const m = /pq1:[A-Za-z0-9_-]+/.exec(text);
  return m ? m[0] : null;
}

/** The link a secret-note code holds: PakkaQR's "open a note" page with the token in the hash. */
export function noteLink(openPageUrl: string, token: string): string {
  return `${openPageUrl.split('#')[0]}#${token}`;
}
