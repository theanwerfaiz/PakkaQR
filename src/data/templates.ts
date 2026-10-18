import type { Fields, QrType } from '../lib/payloads/types';

/**
 * Ready-made starting points. Text (names, labels, categories) lives in
 * i18n under `template.<id>`; the example content uses each type's example.
 */
export interface TemplateDef {
  id: string;
  category:
    'restaurant' | 'shop' | 'wedding' | 'wifi' | 'events' | 'business' | 'festival' | 'social';
  type: QrType;
  fields?: Fields;
  preset: string;
  frame?: string;
}

export const templateCategories = [
  'restaurant',
  'shop',
  'wedding',
  'wifi',
  'events',
  'business',
  'festival',
  'social',
] as const;

export const TEMPLATES: TemplateDef[] = [
  { id: 'cafeMenu', category: 'restaurant', type: 'url', preset: 'raat', frame: 'ticket' },
  { id: 'payCounter', category: 'shop', type: 'upi', preset: 'ledger', frame: 'rounded-bottom' },
  { id: 'shaadi', category: 'wedding', type: 'event', preset: 'jamun', frame: 'rounded-bottom' },
  { id: 'venue', category: 'wedding', type: 'location', preset: 'mitti', frame: 'pill' },
  { id: 'guestWifi', category: 'wifi', type: 'wifi', preset: 'neel', frame: 'pill' },
  { id: 'festivalSale', category: 'festival', type: 'url', preset: 'mitti', frame: 'banner-top' },
  { id: 'businessCard', category: 'business', type: 'vcard', preset: 'tulsi' },
  { id: 'party', category: 'events', type: 'event', preset: 'raat', frame: 'ticket' },
  { id: 'review', category: 'business', type: 'review', preset: 'mitti', frame: 'speech-bubble' },
  { id: 'instagram', category: 'social', type: 'social', preset: 'jamun', frame: 'pill' },
  {
    id: 'whatsappOrder',
    category: 'shop',
    type: 'whatsapp',
    preset: 'tulsi',
    frame: 'rounded-bottom',
  },
  { id: 'appDownload', category: 'business', type: 'appstore', preset: 'neel', frame: 'phone' },
];

export const templateById = new Map(TEMPLATES.map((t) => [t.id, t]));
