import { describe, expect, it } from 'vitest';
import { formatCoord, locationEncoder, parseMapsLink } from '../../../src/lib/payloads/location';
import {
  eventEncoder,
  formatUtcStamp,
  isValidTimeZone,
  zonedTimeToUtc,
} from '../../../src/lib/payloads/event';

describe('parseMapsLink', () => {
  it.each([
    ['https://www.google.com/maps/@12.9715987,77.5945627,15z', 12.9715987, 77.5945627],
    ['https://maps.google.com/?q=28.6139,77.2090', 28.6139, 77.209],
    ['https://www.google.com/maps/search/?api=1&query=19.076%2C72.8777', 19.076, 72.8777],
    [
      'https://www.google.com/maps/place/India+Gate/@28.612912,77.2295097,17z/data=x',
      28.612912,
      77.2295097,
    ],
    [
      'https://www.google.com/maps/place/X/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d28.6129!4d77.2295',
      28.6129,
      77.2295,
    ],
    ['https://maps.google.com/maps?ll=-33.8688,151.2093&z=10', -33.8688, 151.2093],
    ['https://www.google.com/maps/dir/?api=1&destination=40.7128,-74.0060', 40.7128, -74.006],
    ['https://www.google.com/maps/search/12.97,+77.59', 12.97, 77.59],
    ['geo:51.5074,-0.1278', 51.5074, -0.1278],
  ])('%s', (link, lat, lng) => {
    expect(parseMapsLink(link)).toEqual({ lat, lng });
  });
  it('returns null for short links and out-of-range numbers', () => {
    expect(parseMapsLink('https://maps.app.goo.gl/AbCdEf123')).toBeNull();
    expect(parseMapsLink('https://www.google.com/maps/@95.0,10.0,15z')).toBeNull();
  });
});

describe('location', () => {
  const loc = (o: Partial<Parameters<typeof locationEncoder.encode>[0]>) =>
    locationEncoder.encode({ ...locationEncoder.defaults, ...o });
  const v = (o: Partial<Parameters<typeof locationEncoder.validate>[0]>) =>
    locationEncoder.validate({ ...locationEncoder.defaults, ...o });

  it('defaults to a Google Maps URL; geo: is an option', () => {
    expect(loc({ lat: '12.9715987', lng: '77.5945627' })).toBe(
      'https://www.google.com/maps/search/?api=1&query=12.971599,77.594563',
    );
    expect(loc({ lat: '12.5', lng: '-77', format: 'geo' })).toBe('geo:12.5,-77');
  });
  it('uses coordinates from a pasted link', () => {
    expect(loc({ mapsLink: 'https://maps.google.com/?q=28.6139,77.2090', format: 'geo' })).toBe(
      'geo:28.6139,77.209',
    );
  });
  it('falls back to the URL when the link has no coordinates, with a warning', () => {
    expect(loc({ mapsLink: 'maps.app.goo.gl/AbCdEf123' })).toBe(
      'https://maps.app.goo.gl/AbCdEf123',
    );
    expect(v({ mapsLink: 'maps.app.goo.gl/AbCdEf123' })).toEqual({
      ok: true,
      warnings: { mapsLink: 'warnings.location.noCoords' },
    });
  });
  it('validates ranges', () => {
    expect(v({})).toEqual({ ok: false, errors: { mapsLink: 'errors.location.required' } });
    expect(v({ lat: '91', lng: '181' })).toEqual({
      ok: false,
      errors: { lat: 'errors.location.lat', lng: 'errors.location.lng' },
    });
    expect(v({ lat: '10' })).toEqual({ ok: false, errors: { lng: 'errors.location.lng' } });
    expect(v({ mapsLink: 'javascript:alert(1)' })).toEqual({
      ok: false,
      errors: { mapsLink: 'errors.url.scheme' },
    });
    expect(v({ lat: '-90', lng: '180' })).toEqual({ ok: true });
  });
  it('throws on encode with nothing valid', () => {
    expect(() => loc({ lat: '200', lng: '0' })).toThrow();
  });
  it('formats up to 6 decimals without trailing zeros', () => {
    expect(formatCoord(1.1234567)).toBe('1.123457');
    expect(formatCoord(10)).toBe('10');
  });
});

describe('event time zones', () => {
  it('converts India (+05:30) to UTC', () => {
    expect(formatUtcStamp(zonedTimeToUtc('2026-12-12T19:00', 'Asia/Kolkata')!)).toBe(
      '20261212T133000Z',
    );
  });
  it('handles a DST zone on both sides of the change', () => {
    // New York: EST (-5) in January, EDT (-4) in July.
    expect(formatUtcStamp(zonedTimeToUtc('2026-01-15T09:00', 'America/New_York')!)).toBe(
      '20260115T140000Z',
    );
    expect(formatUtcStamp(zonedTimeToUtc('2026-07-15T09:00', 'America/New_York')!)).toBe(
      '20260715T130000Z',
    );
    // London on the day clocks go forward (29 March 2026, 01:00 UTC).
    expect(formatUtcStamp(zonedTimeToUtc('2026-03-29T12:00', 'Europe/London')!)).toBe(
      '20260329T110000Z',
    );
  });
  it('rejects bad input', () => {
    expect(zonedTimeToUtc('2026-02-30T10:00', 'Asia/Kolkata')).toBeNull();
    expect(zonedTimeToUtc('nope', 'Asia/Kolkata')).toBeNull();
    expect(zonedTimeToUtc('2026-01-01T10:00', 'Mars/Base')).toBeNull();
    expect(isValidTimeZone('')).toBe(false);
  });
});

describe('event', () => {
  const ev = (o: Partial<Parameters<typeof eventEncoder.encode>[0]>) =>
    eventEncoder.encode({ ...eventEncoder.defaults, title: 'Party', ...o });
  const v = (o: Partial<Parameters<typeof eventEncoder.validate>[0]>) =>
    eventEncoder.validate({ ...eventEncoder.defaults, title: 'Party', ...o });

  it('builds a VEVENT in UTC with escaping', () => {
    expect(eventEncoder.encode(eventEncoder.example)).toBe(
      [
        'BEGIN:VEVENT',
        'SUMMARY:Anita & Rahul’s Wedding Reception',
        'DTSTART:20261212T133000Z',
        'DTEND:20261212T173000Z',
        'LOCATION:Taj Lands End\\, Mumbai',
        'DESCRIPTION:Dinner and music. Dress: festive.',
        'END:VEVENT',
      ].join('\r\n'),
    );
    expect(ev({ start: '2026-01-01T10:00', description: 'a;b\nc\\d' })).toContain(
      'DESCRIPTION:a\\;b\\nc\\\\d',
    );
  });
  it('defaults the end to one hour later', () => {
    expect(ev({ start: '2026-01-01T10:00', timezone: 'UTC' })).toContain('DTEND:20260101T110000Z');
  });
  it('all-day events use VALUE=DATE with an exclusive next-day end', () => {
    const out = ev({ allDay: true, start: '2026-12-31' });
    expect(out).toContain('DTSTART;VALUE=DATE:20261231');
    expect(out).toContain('DTEND;VALUE=DATE:20270101');
    expect(ev({ allDay: true, start: '2026-12-30', end: '2026-12-31T00:00' })).toContain(
      'DTEND;VALUE=DATE:20270101',
    );
  });
  it('validates', () => {
    expect(eventEncoder.validate(eventEncoder.defaults)).toEqual({
      ok: false,
      errors: { title: 'errors.required', start: 'errors.required' },
    });
    expect(v({ start: '2026-01-01T10:00', end: '2026-01-01T09:00' })).toEqual({
      ok: false,
      errors: { end: 'errors.event.order' },
    });
    expect(v({ start: 'x' })).toEqual({ ok: false, errors: { start: 'errors.event.start' } });
    expect(v({ start: '2026-01-01T10:00', end: 'x' })).toEqual({
      ok: false,
      errors: { end: 'errors.event.end' },
    });
    expect(v({ start: '2026-01-01T10:00', timezone: 'Nope/Zone' })).toEqual({
      ok: false,
      errors: { timezone: 'errors.event.timezone' },
    });
    expect(v({ allDay: true, start: 'x' })).toEqual({
      ok: false,
      errors: { start: 'errors.event.start' },
    });
    expect(v({ allDay: true, start: '2026-01-02', end: 'x' })).toEqual({
      ok: false,
      errors: { end: 'errors.event.end' },
    });
    expect(v({ allDay: true, start: '2026-01-02', end: '2026-01-01' })).toEqual({
      ok: false,
      errors: { end: 'errors.event.order' },
    });
    expect(() => ev({ start: 'x' })).toThrow();
  });
});
