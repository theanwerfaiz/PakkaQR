import { readLocal, writeLocal } from './local';

/** Opt-in scan history, kept only in this browser. */
export const SCANS_KEY = 'pakkaqr:scan-history';
export const SCANS_ON_KEY = 'pakkaqr:scan-history-on';
export const SCANS_LIMIT = 20;
const MAX_TEXT = 2000;

export interface ScanEntry {
  text: string;
  at: number;
}

export function scanHistoryEnabled(): boolean {
  return readLocal(SCANS_ON_KEY) === '1';
}

export function setScanHistoryEnabled(on: boolean): void {
  writeLocal(SCANS_ON_KEY, on ? '1' : null);
  if (!on) writeLocal(SCANS_KEY, null);
}

export function loadScans(): ScanEntry[] {
  try {
    const raw: unknown = JSON.parse(readLocal(SCANS_KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (e): e is ScanEntry =>
          !!e && typeof e === 'object' && typeof e.text === 'string' && typeof e.at === 'number',
      )
      .slice(0, SCANS_LIMIT);
  } catch {
    return [];
  }
}

/** Adds a scan to the front (deduplicated); returns the new list. No-op when history is off. */
export function recordScan(text: string, now = Date.now()): ScanEntry[] {
  if (!scanHistoryEnabled()) return [];
  const entry = { text: text.slice(0, MAX_TEXT), at: now };
  const list = [entry, ...loadScans().filter((e) => e.text !== entry.text)].slice(0, SCANS_LIMIT);
  writeLocal(SCANS_KEY, JSON.stringify(list));
  return list;
}

export function clearScans(): void {
  writeLocal(SCANS_KEY, null);
}
