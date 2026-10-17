import { appstoreEncoder } from './appstore';
import { cryptoEncoder } from './crypto';
import { emailEncoder } from './email';
import { eventEncoder } from './event';
import { locationEncoder } from './location';
import { mecardEncoder } from './mecard';
import { phoneEncoder } from './phone';
import { reviewEncoder } from './review';
import { smsEncoder } from './sms';
import { socialEncoder } from './social';
import { textEncoder } from './text';
import { upiEncoder } from './upi';
import { urlEncoder } from './url';
import { vcardEncoder } from './vcard';
import { whatsappEncoder } from './whatsapp';
import { wifiEncoder } from './wifi';
import type { Fields, MessageMap, PayloadEncoder, QrContent, QrType } from './types';

export * from './types';

/** Default threshold (characters) above which a code gets dense. */
export const DEFAULT_DENSE_THRESHOLD = 300;

// Each encoder is typed with its own field interface; the registry stores
// them under the common Fields shape used by forms and storage.
const asGeneric = <F extends object>(e: PayloadEncoder<F>) =>
  e as unknown as PayloadEncoder<Fields>;

export const encoders: Record<QrType, PayloadEncoder<Fields>> = {
  url: asGeneric(urlEncoder),
  text: asGeneric(textEncoder),
  wifi: asGeneric(wifiEncoder),
  upi: asGeneric(upiEncoder),
  whatsapp: asGeneric(whatsappEncoder),
  phone: asGeneric(phoneEncoder),
  sms: asGeneric(smsEncoder),
  email: asGeneric(emailEncoder),
  vcard: asGeneric(vcardEncoder),
  location: asGeneric(locationEncoder),
  event: asGeneric(eventEncoder),
  social: asGeneric(socialEncoder),
  appstore: asGeneric(appstoreEncoder),
  review: asGeneric(reviewEncoder),
  mecard: asGeneric(mecardEncoder),
  crypto: asGeneric(cryptoEncoder),
};

/** Merges caller fields over the type's defaults, dropping unknown keys. */
export function withDefaults(type: QrType, fields: Partial<Fields>): Fields {
  const defaults = encoders[type].defaults;
  const out: Fields = { ...defaults };
  for (const key of Object.keys(defaults)) {
    const value = fields[key];
    if (value !== undefined && typeof value === typeof defaults[key]) out[key] = value;
  }
  return out;
}

export type EncodeResult =
  | { ok: true; payload: string; warnings: MessageMap; dense: boolean }
  | { ok: false; errors: MessageMap; warnings: MessageMap };

/** Validates then encodes. Never throws for user input. */
export function encodeContent(content: QrContent): EncodeResult {
  const encoder = encoders[content.type];
  const fields = withDefaults(content.type, content.fields);
  const v = encoder.validate(fields);
  const warnings = v.warnings ?? {};
  if (!v.ok) return { ok: false, errors: v.errors, warnings };
  const payload = encoder.encode(fields);
  const threshold = encoder.denseThreshold ?? DEFAULT_DENSE_THRESHOLD;
  return { ok: true, payload, warnings, dense: payload.length > threshold };
}

export function exampleContent(type: QrType): QrContent {
  return { type, fields: { ...encoders[type].example } };
}
