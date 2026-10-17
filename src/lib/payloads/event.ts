import { isBlank, result } from '../validate/common';
import { escapeText } from './escape';
import type { MessageMap, PayloadEncoder } from './types';

export interface EventFields {
  title: string;
  /** `YYYY-MM-DDTHH:mm` (or `YYYY-MM-DD` for all-day), wall-clock time in `timezone`. */
  start: string;
  end: string;
  allDay: boolean;
  /** IANA zone, e.g. `Asia/Kolkata`. */
  timezone: string;
  location: string;
  description: string;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export function isValidTimeZone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Offset of `timeZone` from UTC at instant `utcMs`, in milliseconds. */
function zoneOffset(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/**
 * Converts a wall-clock time in an IANA zone to a UTC epoch (ms). Two
 * passes handle DST: the offset is re-read at the first guess.
 */
export function zonedTimeToUtc(local: string, timeZone: string): number | null {
  const m = DATETIME_RE.exec(local);
  if (!m || !isValidTimeZone(timeZone)) return null;
  const [y, mo, d, h, mi, s] = m.slice(1).map((x) => Number(x ?? 0)) as number[];
  const wall = Date.UTC(y!, mo! - 1, d!, h!, mi!, s!);
  const check = new Date(wall);
  if (check.getUTCMonth() !== mo! - 1 || check.getUTCDate() !== d! || h! > 23 || mi! > 59)
    return null;
  let utc = wall - zoneOffset(wall, timeZone);
  utc = wall - zoneOffset(utc, timeZone);
  return utc;
}

const pad = (n: number, len = 2) => String(n).padStart(len, '0');

export function formatUtcStamp(ms: number): string {
  const d = new Date(ms);
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function parseDate(value: string): number | null {
  const m = DATE_RE.exec(value.trim().slice(0, 10));
  if (!m) return null;
  const [y, mo, d] = m.slice(1).map(Number) as [number, number, number];
  const ms = Date.UTC(y, mo - 1, d);
  const check = new Date(ms);
  return check.getUTCMonth() === mo - 1 && check.getUTCDate() === d ? ms : null;
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

const DAY = 86_400_000;
const HOUR = 3_600_000;

interface Range {
  start: number;
  end: number;
}

function resolveRange(f: EventFields): Range | { error: MessageMap } {
  if (f.allDay) {
    const start = parseDate(f.start);
    if (start === null) return { error: { start: 'errors.event.start' } };
    const end = isBlank(f.end) ? start : parseDate(f.end);
    if (end === null) return { error: { end: 'errors.event.end' } };
    if (end < start) return { error: { end: 'errors.event.order' } };
    return { start, end: end + DAY }; // DTEND is exclusive for all-day events
  }
  if (!isValidTimeZone(f.timezone)) return { error: { timezone: 'errors.event.timezone' } };
  const start = zonedTimeToUtc(f.start.trim(), f.timezone);
  if (start === null) return { error: { start: 'errors.event.start' } };
  const end = isBlank(f.end) ? start + HOUR : zonedTimeToUtc(f.end.trim(), f.timezone);
  if (end === null) return { error: { end: 'errors.event.end' } };
  if (end <= start) return { error: { end: 'errors.event.order' } };
  return { start, end };
}

export const eventEncoder: PayloadEncoder<EventFields> = {
  type: 'event',
  defaults: {
    title: '',
    start: '',
    end: '',
    allDay: false,
    timezone: 'Asia/Kolkata',
    location: '',
    description: '',
  },
  example: {
    title: 'Anita & Rahul’s Wedding Reception',
    start: '2026-12-12T19:00',
    end: '2026-12-12T23:00',
    allDay: false,
    timezone: 'Asia/Kolkata',
    location: 'Taj Lands End, Mumbai',
    description: 'Dinner and music. Dress: festive.',
  },
  validate(f) {
    const errors: MessageMap = {};
    if (isBlank(f.title)) errors.title = 'errors.required';
    if (isBlank(f.start)) errors.start = 'errors.required';
    else {
      const r = resolveRange(f);
      if ('error' in r) Object.assign(errors, r.error);
    }
    return result(errors);
  },
  encode(f) {
    const r = resolveRange(f);
    if ('error' in r) throw new Error(Object.values(r.error)[0]);
    const lines = ['BEGIN:VEVENT', `SUMMARY:${escapeText(f.title.trim())}`];
    if (f.allDay) {
      lines.push(
        `DTSTART;VALUE=DATE:${formatDate(r.start)}`,
        `DTEND;VALUE=DATE:${formatDate(r.end)}`,
      );
    } else {
      lines.push(`DTSTART:${formatUtcStamp(r.start)}`, `DTEND:${formatUtcStamp(r.end)}`);
    }
    if (!isBlank(f.location)) lines.push(`LOCATION:${escapeText(f.location.trim())}`);
    if (!isBlank(f.description)) lines.push(`DESCRIPTION:${escapeText(f.description.trim())}`);
    lines.push('END:VEVENT');
    return lines.join('\r\n');
  },
};
