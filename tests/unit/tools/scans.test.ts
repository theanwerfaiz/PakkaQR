// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearScans,
  loadScans,
  recordScan,
  SCANS_KEY,
  SCANS_LIMIT,
  setScanHistoryEnabled,
} from '../../../src/lib/storage/scans';

describe('scan history', () => {
  beforeEach(() => localStorage.clear());
  it('records nothing while off (the default)', () => {
    expect(recordScan('hello')).toEqual([]);
    expect(loadScans()).toEqual([]);
  });
  it('records newest first, deduplicates and caps the list', () => {
    setScanHistoryEnabled(true);
    for (let i = 0; i < SCANS_LIMIT + 5; i++) recordScan(`code ${i}`, i);
    recordScan('code 3', 999);
    const list = loadScans();
    expect(list).toHaveLength(SCANS_LIMIT);
    expect(list[0]).toEqual({ text: 'code 3', at: 999 });
    expect(list.filter((e) => e.text === 'code 3')).toHaveLength(1);
  });
  it('turning it off deletes the history', () => {
    setScanHistoryEnabled(true);
    recordScan('x');
    setScanHistoryEnabled(false);
    expect(localStorage.getItem(SCANS_KEY)).toBeNull();
  });
  it('ignores corrupt data', () => {
    localStorage.setItem(SCANS_KEY, '{"oops":1}');
    expect(loadScans()).toEqual([]);
    localStorage.setItem(SCANS_KEY, '[{"text":1},{"text":"ok","at":1}]');
    expect(loadScans()).toEqual([{ text: 'ok', at: 1 }]);
    clearScans();
    expect(loadScans()).toEqual([]);
  });
});
