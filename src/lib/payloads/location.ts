import { isBlank, normalizeUrl, result } from '../validate/common';
import type { MessageMap, PayloadEncoder } from './types';

export type LocationFormat = 'maps' | 'geo';

export interface LocationFields {
  mapsLink: string;
  lat: string;
  lng: string;
  format: LocationFormat;
}

export interface Coords {
  lat: number;
  lng: number;
}

const NUM = String.raw`(-?\d{1,3}(?:\.\d+)?)`;
const SEP = String.raw`\s*(?:,|%2C)\s*(?:\+|%20)?\s*`;
const COORD_PATTERNS: RegExp[] = [
  new RegExp(String.raw`!3d${NUM}!4d${NUM}`), // place data blob: most precise
  new RegExp(String.raw`@${NUM}${SEP}${NUM}`),
  new RegExp(
    String.raw`[?&](?:q|query|ll|sll|daddr|destination|center)=(?:loc:)?${NUM}${SEP}${NUM}`,
  ),
  new RegExp(String.raw`/(?:place|search|dir)/(?:[^/]*/)*?${NUM}${SEP}${NUM}`),
  new RegExp(String.raw`^geo:${NUM}${SEP}${NUM}`),
];

export function isValidLat(n: number): boolean {
  return Number.isFinite(n) && n >= -90 && n <= 90;
}
export function isValidLng(n: number): boolean {
  return Number.isFinite(n) && n >= -180 && n <= 180;
}

/** Extracts coordinates from common Google Maps link shapes; null if none. */
export function parseMapsLink(link: string): Coords | null {
  const s = link.trim();
  for (const re of COORD_PATTERNS) {
    const m = re.exec(s);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (isValidLat(lat) && isValidLng(lng)) return { lat, lng };
    }
  }
  return null;
}

/** Up to 6 decimals, without trailing zeros. */
export function formatCoord(n: number): string {
  return String(Number(n.toFixed(6)));
}

function coordsFrom(f: LocationFields): Coords | null {
  if (!isBlank(f.lat) || !isBlank(f.lng)) {
    const lat = Number(f.lat.trim());
    const lng = Number(f.lng.trim());
    if (isBlank(f.lat) || isBlank(f.lng) || !isValidLat(lat) || !isValidLng(lng)) return null;
    return { lat, lng };
  }
  return isBlank(f.mapsLink) ? null : parseMapsLink(f.mapsLink);
}

export const locationEncoder: PayloadEncoder<LocationFields> = {
  type: 'location',
  defaults: { mapsLink: '', lat: '', lng: '', format: 'maps' },
  example: { mapsLink: '', lat: '12.971599', lng: '77.594566', format: 'maps' },
  validate(f) {
    const errors: MessageMap = {};
    const warnings: MessageMap = {};
    const hasCoords = !isBlank(f.lat) || !isBlank(f.lng);
    if (hasCoords) {
      const lat = Number(f.lat.trim());
      const lng = Number(f.lng.trim());
      if (isBlank(f.lat) || !isValidLat(lat)) errors.lat = 'errors.location.lat';
      if (isBlank(f.lng) || !isValidLng(lng)) errors.lng = 'errors.location.lng';
    } else if (isBlank(f.mapsLink)) {
      errors.mapsLink = 'errors.location.required';
    } else if (!parseMapsLink(f.mapsLink)) {
      const r = normalizeUrl(f.mapsLink);
      if (!r.ok) errors.mapsLink = r.error;
      else warnings.mapsLink = 'warnings.location.noCoords';
    }
    return result(errors, warnings);
  },
  encode(f) {
    const c = coordsFrom(f);
    if (!c) {
      const r = normalizeUrl(f.mapsLink);
      if (!r.ok) throw new Error(r.error);
      return r.url;
    }
    const pair = `${formatCoord(c.lat)},${formatCoord(c.lng)}`;
    return f.format === 'geo'
      ? `geo:${pair}`
      : `https://www.google.com/maps/search/?api=1&query=${pair}`;
  },
};
