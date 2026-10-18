import type { Fields, QrType } from '../lib/payloads/types';

export type PageKind =
  | 'home'
  | 'tool'
  | 'usecase'
  | 'batch'
  | 'scanner'
  | 'expiry'
  | 'print'
  | 'barcode'
  | 'templates'
  | 'secret'
  | 'open'
  | 'photo'
  | 'article'
  | 'about'
  | 'privacy'
  | 'faq';

export type Panel = 'presets' | 'colors' | 'shape' | 'logo' | 'frame' | 'advanced';

/** How the shared generator island starts on a page. */
export interface GeneratorStart {
  type: QrType;
  fields?: Fields;
  /** Frame preset for use-case pages; label is an i18n key. */
  frame?: { id: string; labelKey: string };
  openPanel?: Panel;
}

export interface PageDef {
  slug: string;
  kind: PageKind;
  /** Key in src/i18n/content/<locale>.json → pages.<key>. */
  key: string;
  generator?: GeneratorStart;
  /** Slugs of related pages for internal links. */
  related: string[];
  /** Include HowTo + FAQPage structured data. */
  howTo?: boolean;
}

const tool = (
  slug: string,
  key: string,
  generator: GeneratorStart,
  related: string[],
): PageDef => ({
  slug,
  kind: 'tool',
  key,
  generator,
  related,
  howTo: true,
});

const CORE = [
  'wifi-qr-code-generator',
  'upi-qr-code-generator',
  'whatsapp-qr-code-generator',
  'vcard-qr-code-generator',
];

export const pages: PageDef[] = [
  {
    slug: '',
    kind: 'home',
    key: 'home',
    generator: { type: 'url' },
    related: [...CORE, 'qr-code-with-logo', 'bulk-qr-code-generator'],
    howTo: true,
  },
  tool('url-qr-code-generator', 'url', { type: 'url' }, [
    'qr-code-with-logo',
    'restaurant-menu-qr-code',
    'bulk-qr-code-generator',
    'text-qr-code-generator',
  ]),
  tool('wifi-qr-code-generator', 'wifi', { type: 'wifi' }, [
    'restaurant-menu-qr-code',
    'print',
    'url-qr-code-generator',
    'whatsapp-qr-code-generator',
  ]),
  tool('upi-qr-code-generator', 'upi', { type: 'upi' }, [
    'whatsapp-qr-code-generator',
    'print',
    'google-review-qr-code-generator',
    'qr-code-with-logo',
  ]),
  tool('whatsapp-qr-code-generator', 'whatsapp', { type: 'whatsapp' }, [
    'upi-qr-code-generator',
    'phone-qr-code-generator',
    'sms-qr-code-generator',
    'instagram-qr-code-generator',
  ]),
  tool('vcard-qr-code-generator', 'vcard', { type: 'vcard' }, [
    'print',
    'email-qr-code-generator',
    'phone-qr-code-generator',
    'linkedin-qr-code-generator',
  ]),
  tool('text-qr-code-generator', 'text', { type: 'text' }, [
    'url-qr-code-generator',
    'email-qr-code-generator',
    'sms-qr-code-generator',
  ]),
  tool('email-qr-code-generator', 'email', { type: 'email' }, [
    'vcard-qr-code-generator',
    'sms-qr-code-generator',
    'phone-qr-code-generator',
  ]),
  tool('sms-qr-code-generator', 'sms', { type: 'sms' }, [
    'whatsapp-qr-code-generator',
    'phone-qr-code-generator',
    'email-qr-code-generator',
  ]),
  tool('phone-qr-code-generator', 'phone', { type: 'phone' }, [
    'whatsapp-qr-code-generator',
    'sms-qr-code-generator',
    'vcard-qr-code-generator',
  ]),
  tool('location-qr-code-generator', 'location', { type: 'location' }, [
    'event-qr-code-generator',
    'wedding-qr-code',
    'google-review-qr-code-generator',
  ]),
  tool('event-qr-code-generator', 'event', { type: 'event' }, [
    'wedding-qr-code',
    'location-qr-code-generator',
    'print',
  ]),
  tool(
    'instagram-qr-code-generator',
    'instagram',
    { type: 'social', fields: { platform: 'instagram' } },
    ['youtube-qr-code-generator', 'facebook-qr-code-generator', 'qr-code-with-logo'],
  ),
  tool(
    'youtube-qr-code-generator',
    'youtube',
    { type: 'social', fields: { platform: 'youtube' } },
    ['instagram-qr-code-generator', 'telegram-qr-code-generator', 'url-qr-code-generator'],
  ),
  tool(
    'facebook-qr-code-generator',
    'facebook',
    { type: 'social', fields: { platform: 'facebook' } },
    [
      'instagram-qr-code-generator',
      'whatsapp-qr-code-generator',
      'google-review-qr-code-generator',
    ],
  ),
  tool(
    'linkedin-qr-code-generator',
    'linkedin',
    { type: 'social', fields: { platform: 'linkedin' } },
    ['vcard-qr-code-generator', 'email-qr-code-generator', 'qr-code-with-logo'],
  ),
  tool(
    'telegram-qr-code-generator',
    'telegram',
    { type: 'social', fields: { platform: 'telegram' } },
    ['whatsapp-qr-code-generator', 'youtube-qr-code-generator', 'instagram-qr-code-generator'],
  ),
  tool('google-review-qr-code-generator', 'review', { type: 'review' }, [
    'restaurant-menu-qr-code',
    'print',
    'location-qr-code-generator',
  ]),
  tool('app-store-qr-code-generator', 'appstore', { type: 'appstore' }, [
    'url-qr-code-generator',
    'qr-code-with-logo',
    'bulk-qr-code-generator',
  ]),
  tool('qr-code-with-logo', 'logo', { type: 'url', openPanel: 'logo' }, [
    'url-qr-code-generator',
    'instagram-qr-code-generator',
    'print',
  ]),
  {
    slug: 'bulk-qr-code-generator',
    kind: 'batch',
    key: 'batch',
    related: ['print', 'vcard-qr-code-generator', 'url-qr-code-generator'],
    howTo: true,
  },
  {
    slug: 'qr-code-scanner',
    kind: 'scanner',
    key: 'scanner',
    related: ['qr-code-expiry-checker', 'url-qr-code-generator', 'wifi-qr-code-generator'],
    howTo: true,
  },
  {
    slug: 'qr-code-expiry-checker',
    kind: 'expiry',
    key: 'expiry',
    related: ['static-vs-dynamic-qr-codes', 'qr-code-scanner', 'url-qr-code-generator'],
    howTo: true,
  },
  {
    slug: 'print',
    kind: 'print',
    key: 'print',
    related: ['wifi-qr-code-generator', 'upi-qr-code-generator', 'restaurant-menu-qr-code'],
    howTo: true,
  },
  {
    slug: 'barcode-generator',
    kind: 'barcode',
    key: 'barcode',
    related: ['bulk-qr-code-generator', 'print', 'upi-qr-code-generator'],
    howTo: true,
  },
  {
    slug: 'qr-code-templates',
    kind: 'templates',
    key: 'templates',
    related: ['restaurant-menu-qr-code', 'wedding-qr-code', 'wifi-qr-code-generator'],
    howTo: true,
  },
  {
    slug: 'secret-message-qr-code',
    kind: 'secret',
    key: 'secret',
    related: ['text-qr-code-generator', 'qr-code-scanner', 'photo-qr-code'],
    howTo: true,
  },
  {
    slug: 'open',
    kind: 'open',
    key: 'open',
    related: ['secret-message-qr-code', 'qr-code-scanner'],
  },
  {
    slug: 'photo-qr-code',
    kind: 'photo',
    key: 'photo',
    related: ['qr-code-with-logo', 'qr-code-templates', 'instagram-qr-code-generator'],
    howTo: true,
  },
  {
    slug: 'restaurant-menu-qr-code',
    kind: 'usecase',
    key: 'restaurant',
    generator: {
      type: 'url',
      frame: { id: 'rounded-bottom', labelKey: 'content.frameLabel.menu' },
    },
    related: [
      'wifi-qr-code-generator',
      'google-review-qr-code-generator',
      'upi-qr-code-generator',
      'print',
    ],
    howTo: true,
  },
  {
    slug: 'wedding-qr-code',
    kind: 'usecase',
    key: 'wedding',
    generator: {
      type: 'location',
      frame: { id: 'rounded-bottom', labelKey: 'content.frameLabel.venue' },
    },
    related: [
      'event-qr-code-generator',
      'location-qr-code-generator',
      'url-qr-code-generator',
      'print',
    ],
    howTo: true,
  },
  {
    slug: 'static-vs-dynamic-qr-codes',
    kind: 'article',
    key: 'article',
    related: ['qr-code-expiry-checker', 'url-qr-code-generator', 'faq'],
  },
  { slug: 'about', kind: 'about', key: 'about', related: ['privacy', 'faq'] },
  { slug: 'privacy', kind: 'privacy', key: 'privacy', related: ['about', 'faq'] },
  {
    slug: 'faq',
    kind: 'faq',
    key: 'faq',
    related: ['static-vs-dynamic-qr-codes', 'qr-code-expiry-checker'],
  },
];

export const pageBySlug = new Map(pages.map((p) => [p.slug, p]));

/** Header navigation targets. */
export const NAV = {
  generator: '',
  batch: 'bulk-qr-code-generator',
  scanner: 'qr-code-scanner',
  expiry: 'qr-code-expiry-checker',
  print: 'print',
} as const;

export const TOOL_SLUGS = {
  barcode: 'barcode-generator',
  templates: 'qr-code-templates',
  secret: 'secret-message-qr-code',
  open: 'open',
  photo: 'photo-qr-code',
} as const;

/** The Tools menu, grouped. Labels come from i18n `tools.<id>.name` / `.desc`. */
export const TOOLS_MENU: Array<{
  group: string;
  items: Array<{ id: string; slug: string; icon: string }>;
}> = [
  {
    group: 'create',
    items: [
      { id: 'qr', slug: '', icon: 'qr' },
      { id: 'barcode', slug: TOOL_SLUGS.barcode, icon: 'barcode' },
      { id: 'secret', slug: TOOL_SLUGS.secret, icon: 'lock' },
      { id: 'photo', slug: TOOL_SLUGS.photo, icon: 'image' },
    ],
  },
  {
    group: 'bulk',
    items: [
      { id: 'batch', slug: NAV.batch, icon: 'stack' },
      { id: 'numbered', slug: `${NAV.batch}#numbered`, icon: 'table' },
      { id: 'print', slug: NAV.print, icon: 'print' },
    ],
  },
  {
    group: 'check',
    items: [
      { id: 'scanner', slug: NAV.scanner, icon: 'scan' },
      { id: 'expiry', slug: NAV.expiry, icon: 'clock' },
      { id: 'templates', slug: TOOL_SLUGS.templates, icon: 'layers' },
    ],
  },
];
