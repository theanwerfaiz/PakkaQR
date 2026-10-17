import Papa from 'papaparse';
import {
  encodeContent,
  encoders,
  withDefaults,
  type Fields,
  type MessageMap,
  type QrType,
} from '../payloads';

export const BATCH_WARN_ROWS = 1000;
export const FILENAME_COLUMN = 'filename';

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

/** Parses CSV text (with a header row). Empty lines are skipped. */
export function parseCsv(text: string): ParsedCsv {
  const result = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), { skipEmptyLines: 'greedy' });
  const [headers = [], ...rows] = result.data;
  return {
    headers: headers.map((h) => h.trim()),
    rows: rows.map((r) => headers.map((_, i) => r[i] ?? '')),
  };
}

/** Field name → column index (or null when not mapped). */
export type Mapping = Record<string, number | null>;

const ALIASES: Record<string, string[]> = {
  url: ['url', 'link', 'website', 'address', 'href'],
  text: ['text', 'content', 'message'],
  ssid: ['ssid', 'network', 'wifi', 'name'],
  password: ['password', 'pass', 'key'],
  pa: ['pa', 'upi', 'upi id', 'vpa'],
  pn: ['pn', 'name', 'payee', 'payee name'],
  am: ['am', 'amount'],
  tn: ['tn', 'note'],
  number: ['number', 'phone', 'mobile', 'whatsapp'],
  to: ['to', 'email'],
  firstName: ['firstname', 'first name', 'first'],
  lastName: ['lastname', 'last name', 'last', 'surname'],
  org: ['org', 'company', 'organisation', 'organization'],
  [FILENAME_COLUMN]: ['filename', 'file', 'file name'],
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
    .trim();

/** Mappable field names for a type, plus the optional file-name column. */
export function mappableFields(type: QrType): string[] {
  return [...Object.keys(encoders[type].defaults), FILENAME_COLUMN];
}

/** Guesses the mapping from header names. */
export function autoMap(type: QrType, headers: string[]): Mapping {
  const normalized = headers.map(norm);
  const mapping: Mapping = {};
  for (const field of mappableFields(type)) {
    const candidates = [norm(field), ...(ALIASES[field] ?? []).map(norm)];
    const index = normalized.findIndex((h) => candidates.includes(h));
    mapping[field] = index >= 0 ? index : null;
  }
  return mapping;
}

const TRUE = new Set(['true', 'yes', 'y', '1', 'on']);

export function rowToFields(type: QrType, row: string[], mapping: Mapping): Fields {
  const defaults = encoders[type].defaults;
  const fields: Fields = {};
  for (const [field, index] of Object.entries(mapping)) {
    if (index === null || index === undefined || field === FILENAME_COLUMN || !(field in defaults))
      continue;
    const raw = row[index] ?? '';
    fields[field] = typeof defaults[field] === 'boolean' ? TRUE.has(raw.trim().toLowerCase()) : raw;
  }
  return withDefaults(type, fields);
}

/** Safe, unique file names (without extension). */
export function makeFileNames(type: QrType, rows: string[][], mapping: Mapping): string[] {
  const col = mapping[FILENAME_COLUMN];
  const used = new Map<string, number>();
  return rows.map((row, i) => {
    const raw = col !== null && col !== undefined ? (row[col] ?? '') : '';
    let base =
      raw
        // eslint-disable-next-line no-control-regex -- control characters are invalid in file names
        .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
        .replace(/\.(png|svg|jpe?g|webp)$/i, '')
        .replace(/^\.+/, '')
        .trim()
        .slice(0, 100) || `pakkaqr-${type}-${String(i + 1).padStart(4, '0')}`;
    const count = used.get(base.toLowerCase()) ?? 0;
    used.set(base.toLowerCase(), count + 1);
    if (count > 0) base = `${base}-${count + 1}`;
    return base;
  });
}

export interface BatchItem {
  row: number;
  fileName: string;
  payload: string;
}

export interface BatchError {
  /** 1-based data row number (header is row 0). */
  row: number;
  errors: MessageMap;
}

export function prepareBatch(type: QrType, parsed: ParsedCsv, mapping: Mapping) {
  const names = makeFileNames(type, parsed.rows, mapping);
  const items: BatchItem[] = [];
  const errors: BatchError[] = [];
  parsed.rows.forEach((row, i) => {
    const r = encodeContent({ type, fields: rowToFields(type, row, mapping) });
    if (r.ok) items.push({ row: i + 1, fileName: names[i]!, payload: r.payload });
    else errors.push({ row: i + 1, errors: r.errors });
  });
  return { items, errors };
}

/** Example CSV for a type: header row plus a few sample rows. */
export function exampleCsv(type: QrType): string {
  const example = encoders[type].example;
  const fields = Object.keys(example);
  const header = [...fields, FILENAME_COLUMN];
  const rows = [1, 2, 3].map((n) => [
    ...fields.map((f) => {
      const v = example[f as keyof typeof example] as unknown;
      if (typeof v === 'boolean') return String(v);
      const s = String(v ?? '');
      if (!s) return '';
      if (f === 'url' || f.endsWith('Url')) return s.replace(/\/?$/, n === 1 ? '' : `?item=${n}`);
      if (n === 1) return s;
      if (f === 'username') return `${s}${n}`;
      return ['ssid', 'pn', 'firstName', 'title', 'text', 'tn'].includes(f) ? `${s} ${n}` : s;
    }),
    `${type}-${n}`,
  ]);
  return Papa.unparse([header, ...rows]);
}
