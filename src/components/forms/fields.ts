import type { Fields, QrType } from '../../lib/payloads/types';
import { parseMapsLink, formatCoord } from '../../lib/payloads/location';
import { socialPlatforms } from '../../lib/payloads/social';

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'url'
  | 'email'
  | 'tel'
  | 'decimal'
  | 'password'
  | 'select'
  | 'segmented'
  | 'checkbox'
  | 'datetime'
  | 'date'
  | 'timezone'
  | 'countryCode';

export interface FieldOption {
  value: string;
  /** i18n key, or literal text when `literal` is true. */
  label: string;
  literal?: boolean;
}

export interface FieldDef {
  name: string;
  kind: FieldKind;
  required?: boolean;
  options?: FieldOption[];
  autoComplete?: string;
  maxLength?: number;
  rows?: number;
  /** Half-width on wide screens. */
  half?: boolean;
  /** Only shown when this returns true. */
  showIf?: (fields: Fields) => boolean;
  /** Extra field updates when this field changes (e.g. coordinates from a Maps link). */
  onChange?: (value: string | boolean, fields: Fields) => Fields;
}

/*
 * Labels, hints and placeholders come from i18n keys:
 *   field.<type>.<name>, hint.<type>.<name>, placeholder.<type>.<name>
 */
const country = (half = true): FieldDef => ({ name: 'countryCode', kind: 'countryCode', half });

export const formSchemas: Record<QrType, FieldDef[]> = {
  url: [{ name: 'url', kind: 'url', required: true, autoComplete: 'url' }],
  text: [{ name: 'text', kind: 'textarea', required: true, rows: 5 }],
  wifi: [
    { name: 'ssid', kind: 'text', required: true, autoComplete: 'off' },
    {
      name: 'security',
      kind: 'select',
      options: [
        { value: 'WPA', label: 'option.wifi.WPA' },
        { value: 'WEP', label: 'option.wifi.WEP' },
        { value: 'nopass', label: 'option.wifi.nopass' },
      ],
    },
    {
      name: 'password',
      kind: 'password',
      required: true,
      autoComplete: 'off',
      showIf: (f) => f.security !== 'nopass',
    },
    { name: 'hidden', kind: 'checkbox' },
  ],
  upi: [
    { name: 'pa', kind: 'text', required: true, autoComplete: 'off' },
    { name: 'pn', kind: 'text', required: true, autoComplete: 'name' },
    { name: 'am', kind: 'decimal', half: true },
    { name: 'tn', kind: 'text', maxLength: 80, half: true },
  ],
  whatsapp: [
    country(),
    { name: 'number', kind: 'tel', required: true, half: true, autoComplete: 'tel-national' },
    { name: 'message', kind: 'textarea', rows: 3 },
  ],
  phone: [
    country(),
    { name: 'number', kind: 'tel', required: true, half: true, autoComplete: 'tel-national' },
  ],
  sms: [
    country(),
    { name: 'number', kind: 'tel', required: true, half: true, autoComplete: 'tel-national' },
    { name: 'message', kind: 'textarea', rows: 3 },
  ],
  email: [
    { name: 'to', kind: 'email', required: true, autoComplete: 'email' },
    { name: 'subject', kind: 'text' },
    { name: 'body', kind: 'textarea', rows: 4 },
  ],
  vcard: [
    { name: 'firstName', kind: 'text', half: true, autoComplete: 'given-name' },
    { name: 'lastName', kind: 'text', half: true, autoComplete: 'family-name' },
    { name: 'org', kind: 'text', half: true, autoComplete: 'organization' },
    { name: 'title', kind: 'text', half: true, autoComplete: 'organization-title' },
    { name: 'mobile', kind: 'tel', half: true, autoComplete: 'tel' },
    { name: 'work', kind: 'tel', half: true },
    { name: 'email', kind: 'email', half: true, autoComplete: 'email' },
    { name: 'website', kind: 'url', half: true, autoComplete: 'url' },
    { name: 'street', kind: 'text', autoComplete: 'street-address' },
    { name: 'city', kind: 'text', half: true, autoComplete: 'address-level2' },
    { name: 'region', kind: 'text', half: true, autoComplete: 'address-level1' },
    { name: 'postcode', kind: 'text', half: true, autoComplete: 'postal-code' },
    { name: 'country', kind: 'text', half: true, autoComplete: 'country-name' },
    { name: 'note', kind: 'textarea', rows: 2 },
  ],
  location: [
    {
      name: 'mapsLink',
      kind: 'url',
      onChange: (value) => {
        const c = typeof value === 'string' ? parseMapsLink(value) : null;
        return c ? { lat: formatCoord(c.lat), lng: formatCoord(c.lng) } : { lat: '', lng: '' };
      },
    },
    { name: 'lat', kind: 'decimal', half: true },
    { name: 'lng', kind: 'decimal', half: true },
    {
      name: 'format',
      kind: 'segmented',
      options: [
        { value: 'maps', label: 'option.location.maps' },
        { value: 'geo', label: 'option.location.geo' },
      ],
    },
  ],
  event: [
    { name: 'title', kind: 'text', required: true },
    { name: 'allDay', kind: 'checkbox' },
    { name: 'start', kind: 'datetime', required: true, half: true, showIf: (f) => !f.allDay },
    { name: 'end', kind: 'datetime', half: true, showIf: (f) => !f.allDay },
    { name: 'start', kind: 'date', required: true, half: true, showIf: (f) => !!f.allDay },
    { name: 'end', kind: 'date', half: true, showIf: (f) => !!f.allDay },
    { name: 'timezone', kind: 'timezone', showIf: (f) => !f.allDay },
    { name: 'location', kind: 'text' },
    { name: 'description', kind: 'textarea', rows: 3 },
  ],
  social: [
    {
      name: 'platform',
      kind: 'select',
      options: socialPlatforms.map((p) => ({ value: p.id, label: p.name, literal: true })),
    },
    { name: 'username', kind: 'text', required: true, autoComplete: 'off' },
    {
      name: 'linkedinKind',
      kind: 'segmented',
      showIf: (f) => f.platform === 'linkedin',
      options: [
        { value: 'in', label: 'option.linkedinKind.in' },
        { value: 'company', label: 'option.linkedinKind.company' },
      ],
    },
  ],
  appstore: [
    {
      name: 'store',
      kind: 'segmented',
      options: [
        { value: 'play', label: 'option.store.play' },
        { value: 'apple', label: 'option.store.apple' },
      ],
    },
    { name: 'playUrl', kind: 'url', required: true, showIf: (f) => f.store !== 'apple' },
    { name: 'appleUrl', kind: 'url', required: true, showIf: (f) => f.store === 'apple' },
  ],
  review: [{ name: 'url', kind: 'url', required: true }],
  mecard: [
    { name: 'firstName', kind: 'text', half: true, autoComplete: 'given-name' },
    { name: 'lastName', kind: 'text', half: true, autoComplete: 'family-name' },
    { name: 'phone', kind: 'tel', half: true, autoComplete: 'tel' },
    { name: 'email', kind: 'email', half: true, autoComplete: 'email' },
    { name: 'url', kind: 'url', autoComplete: 'url' },
    { name: 'address', kind: 'text', autoComplete: 'street-address' },
    { name: 'note', kind: 'text' },
  ],
  crypto: [
    {
      name: 'coin',
      kind: 'segmented',
      options: [
        { value: 'btc', label: 'option.coin.btc' },
        { value: 'eth', label: 'option.coin.eth' },
      ],
    },
    { name: 'address', kind: 'text', required: true, autoComplete: 'off' },
    { name: 'amount', kind: 'decimal', half: true },
    { name: 'chainId', kind: 'text', half: true, showIf: (f) => f.coin === 'eth' },
  ],
};

/** Types shown as primary chips; the rest sit behind "More types". */
export const primaryTypes: QrType[] = [
  'url',
  'wifi',
  'upi',
  'whatsapp',
  'vcard',
  'text',
  'email',
  'phone',
  'sms',
  'location',
  'event',
  'social',
];
export const moreTypes: QrType[] = ['appstore', 'review', 'mecard', 'crypto'];
