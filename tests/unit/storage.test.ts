// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addTemplate,
  clearHistory,
  deleteTemplate,
  HISTORY_LIMIT,
  isHistoryEnabled,
  listHistory,
  listTemplates,
  loadLastDesign,
  newId,
  readLocal,
  recordHistory,
  sanitizeContent,
  sanitizeTemplate,
  saveLastDesign,
  saveTemplates,
  setHistoryEnabled,
  templatesFromJson,
  templatesToJson,
  writeLocal,
} from '../../src/lib/storage';
import { readSession, takeSession, writeSession } from '../../src/lib/storage/local';
import { defaultDesign } from '../../src/lib/render/design';

beforeEach(async () => {
  localStorage.clear();
  await saveTemplates([]);
  await setHistoryEnabled(false);
});

describe('local preferences', () => {
  it('remembers the design only, and drops huge logos', () => {
    expect(loadLastDesign()).toBeNull();
    saveLastDesign({ ...defaultDesign, fg: '#123456' });
    expect(loadLastDesign()?.fg).toBe('#123456');
    const logo = {
      dataUrl: `data:image/png;base64,${'A'.repeat(500_000)}`,
      sizeRatio: 0.2,
      margin: 1,
      hideBackgroundDots: true,
      aspect: 1,
    };
    saveLastDesign({ ...defaultDesign, logo });
    expect(loadLastDesign()?.logo).toBeUndefined();
    writeLocal('pakkaqr:last-design', '{not json');
    expect(loadLastDesign()).toBeNull();
    writeLocal('k', 'v');
    expect(readLocal('k')).toBe('v');
    writeLocal('k', null);
    expect(readLocal('k')).toBeNull();
  });
  it('session hand-off is read once', () => {
    writeSession('h', 'x');
    expect(readSession('h')).toBe('x');
    expect(takeSession('h')).toBe('x');
    expect(takeSession('h')).toBeNull();
  });
});

describe('templates', () => {
  it('adds, lists and deletes', async () => {
    const t = { id: 'a', name: 'Shop', createdAt: 1, design: defaultDesign };
    expect(await addTemplate(t)).toHaveLength(1);
    expect(await addTemplate({ ...t, name: 'Shop 2' })).toHaveLength(1);
    expect((await listTemplates())[0]!.name).toBe('Shop 2');
    expect(await deleteTemplate('a')).toEqual([]);
  });
  it('round-trips through JSON and rejects bad files', () => {
    const t = {
      id: 'a',
      name: 'Shop',
      createdAt: 1,
      design: defaultDesign,
      content: { type: 'url' as const, fields: { url: 'x.com' } },
    };
    expect(templatesFromJson(templatesToJson([t]))).toEqual([t]);
    expect(templatesFromJson(JSON.stringify([{ name: 'Bare' }]))[0]!.name).toBe('Bare');
    expect(() => templatesFromJson('nope')).toThrow('errors.templates.file');
    expect(() => templatesFromJson('{"x":1}')).toThrow('errors.templates.file');
  });
  it('sanitises', () => {
    expect(sanitizeTemplate(null)).toBeNull();
    expect(sanitizeTemplate({ name: '  ' })).toBeNull();
    expect(sanitizeContent({ type: 'fax', fields: {} })).toBeUndefined();
    expect(sanitizeContent({ type: 'url', fields: { url: 'a', n: 1, b: true } })).toEqual({
      type: 'url',
      fields: { url: 'a', b: true },
    });
    expect(newId()).toMatch(/\w/);
  });
});

describe('history (opt-in)', () => {
  it('records nothing unless enabled', async () => {
    expect(await isHistoryEnabled()).toBe(false);
    expect(await recordHistory({ type: 'url', fields: {} }, 'p')).toBeNull();
    expect(await listHistory()).toEqual([]);
  });
  it('keeps the last 30, newest first, without duplicates; clears', async () => {
    await setHistoryEnabled(true);
    for (let i = 0; i < 35; i++)
      await recordHistory({ type: 'text', fields: { text: String(i) } }, `p${i}`);
    await recordHistory({ type: 'text', fields: { text: '34' } }, 'p34');
    const list = await listHistory();
    expect(list).toHaveLength(HISTORY_LIMIT);
    expect(list[0]!.payload).toBe('p34');
    expect(list.filter((h) => h.payload === 'p34')).toHaveLength(1);
    await clearHistory();
    expect(await listHistory()).toEqual([]);
    await recordHistory({ type: 'text', fields: {} }, 'x');
    await setHistoryEnabled(false);
    expect(await listHistory()).toEqual([]);
  });
});
