import { describe, expect, it } from 'vitest';
import { decryptNote, encryptNote, extractToken, noteLink } from '../../../src/lib/secret';

// Fewer iterations keep the tests fast; the format is the same.
const IT = 1000;

describe('secret notes', () => {
  it('round-trips, including Hindi and emoji', async () => {
    const msg = 'Locker 14 · code 4071 — जन्मदिन मुबारक 🎉';
    const token = await encryptNote(msg, 'chai-time', IT);
    expect(token.startsWith('pq1:')).toBe(true);
    expect(await decryptNote(token, 'chai-time', IT)).toEqual({ ok: true, message: msg });
  });
  it('a wrong password fails cleanly', async () => {
    const token = await encryptNote('hello', 'right', IT);
    expect(await decryptNote(token, 'wrong', IT)).toEqual({ ok: false, error: 'password' });
  });
  it('each note uses a fresh salt and IV', async () => {
    const a = await encryptNote('same', 'pw', IT);
    const b = await encryptNote('same', 'pw', IT);
    expect(a).not.toBe(b);
  });
  it('rejects garbage', async () => {
    expect(await decryptNote('pq1:abc', 'pw', IT)).toEqual({ ok: false, error: 'format' });
    expect(await decryptNote('nothing here', 'pw', IT)).toEqual({ ok: false, error: 'format' });
  });
  it('finds the token in a link and builds links', async () => {
    const token = await encryptNote('x', 'pw', IT);
    const link = noteLink('https://example.com/PakkaQR/open', token);
    expect(link).toBe(`https://example.com/PakkaQR/open#${token}`);
    expect(extractToken(link)).toBe(token);
  });
});
