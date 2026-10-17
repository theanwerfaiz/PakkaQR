import { createStore, del, get, set, type UseStore } from 'idb-keyval';
import { sanitizeDesign, type QrDesign } from '../render/design';
import { isQrType, type Fields, type QrContent } from '../payloads/types';
import { readLocal, writeLocal } from './local';

/*
 * Everything here stays on this device: localStorage for small
 * preferences, IndexedDB for templates and the opt-in history.
 */

export { readLocal, writeLocal } from './local';

export const LAST_DESIGN_KEY = 'pakkaqr:last-design';
/** Logos bigger than this are not remembered, to stay well inside localStorage limits. */
const MAX_REMEMBERED_LOGO = 400_000;

export function loadLastDesign(): QrDesign | null {
  const raw = readLocal(LAST_DESIGN_KEY);
  if (!raw) return null;
  try {
    return sanitizeDesign(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Remembers the style only — never the content. */
export function saveLastDesign(design: QrDesign): void {
  const keep =
    design.logo && design.logo.dataUrl.length > MAX_REMEMBERED_LOGO
      ? { ...design, logo: undefined }
      : design;
  writeLocal(LAST_DESIGN_KEY, JSON.stringify(keep));
}

// ---------------------------------------------------------------- IndexedDB

let store: UseStore | undefined;
const db = (): UseStore => (store ??= createStore('pakkaqr', 'kv'));

export interface Template {
  id: string;
  name: string;
  createdAt: number;
  design: QrDesign;
  /** Present only when the user chose "style + content". */
  content?: QrContent;
}

export interface HistoryEntry {
  id: string;
  createdAt: number;
  content: QrContent;
  payload: string;
}

export const HISTORY_LIMIT = 30;
const TEMPLATES = 'templates';
const HISTORY = 'history';
const HISTORY_ENABLED = 'history-enabled';

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export function sanitizeContent(input: unknown): QrContent | undefined {
  if (typeof input !== 'object' || input === null) return undefined;
  const c = input as Record<string, unknown>;
  if (!isQrType(c.type) || typeof c.fields !== 'object' || c.fields === null) return undefined;
  const fields: Fields = {};
  for (const [k, v] of Object.entries(c.fields as Record<string, unknown>)) {
    if (typeof v === 'string') fields[k] = v.slice(0, 4000);
    else if (typeof v === 'boolean') fields[k] = v;
  }
  return { type: c.type, fields };
}

/** Validates a template from storage or an imported file. */
export function sanitizeTemplate(input: unknown): Template | null {
  if (typeof input !== 'object' || input === null) return null;
  const t = input as Record<string, unknown>;
  if (typeof t.name !== 'string' || !t.name.trim()) return null;
  const template: Template = {
    id: typeof t.id === 'string' && t.id ? t.id.slice(0, 64) : newId(),
    name: t.name.trim().slice(0, 80),
    createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
    design: sanitizeDesign(t.design),
  };
  const content = sanitizeContent(t.content);
  if (content) template.content = content;
  return template;
}

export async function listTemplates(): Promise<Template[]> {
  const raw = (await get<unknown[]>(TEMPLATES, db())) ?? [];
  return raw.map(sanitizeTemplate).filter((t): t is Template => t !== null);
}

export async function saveTemplates(templates: Template[]): Promise<void> {
  await set(TEMPLATES, templates, db());
}

export async function addTemplate(template: Template): Promise<Template[]> {
  const list = [template, ...(await listTemplates()).filter((t) => t.id !== template.id)];
  await saveTemplates(list);
  return list;
}

export async function deleteTemplate(id: string): Promise<Template[]> {
  const list = (await listTemplates()).filter((t) => t.id !== id);
  await saveTemplates(list);
  return list;
}

export const TEMPLATE_FILE_VERSION = 1;

export function templatesToJson(templates: Template[]): string {
  return JSON.stringify({ app: 'pakkaqr', version: TEMPLATE_FILE_VERSION, templates }, null, 2);
}

/** Parses an exported templates file; throws 'errors.templates.file' if it is not one. */
export function templatesFromJson(text: string): Template[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('errors.templates.file');
  }
  const list = Array.isArray(data) ? data : (data as { templates?: unknown })?.templates;
  if (!Array.isArray(list)) throw new Error('errors.templates.file');
  return list.map(sanitizeTemplate).filter((t): t is Template => t !== null);
}

export async function isHistoryEnabled(): Promise<boolean> {
  return (await get<boolean>(HISTORY_ENABLED, db())) === true;
}

export async function setHistoryEnabled(enabled: boolean): Promise<void> {
  await set(HISTORY_ENABLED, enabled, db());
  if (!enabled) await del(HISTORY, db());
}

export async function listHistory(): Promise<HistoryEntry[]> {
  const raw = (await get<unknown[]>(HISTORY, db())) ?? [];
  const out: HistoryEntry[] = [];
  for (const item of raw) {
    const h = item as Record<string, unknown>;
    const content = sanitizeContent(h?.content);
    if (content && typeof h.payload === 'string' && typeof h.id === 'string') {
      out.push({ id: h.id, createdAt: Number(h.createdAt) || 0, content, payload: h.payload });
    }
  }
  return out;
}

/** Adds an entry (newest first, de-duplicated by payload, capped at 30) if history is on. */
export async function recordHistory(
  content: QrContent,
  payload: string,
): Promise<HistoryEntry[] | null> {
  if (!(await isHistoryEnabled())) return null;
  const entry: HistoryEntry = { id: newId(), createdAt: Date.now(), content, payload };
  const list = [entry, ...(await listHistory()).filter((h) => h.payload !== payload)].slice(
    0,
    HISTORY_LIMIT,
  );
  await set(HISTORY, list, db());
  return list;
}

export async function clearHistory(): Promise<void> {
  await del(HISTORY, db());
}
