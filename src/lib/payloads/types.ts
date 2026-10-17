export const qrTypes = [
  'url',
  'text',
  'wifi',
  'upi',
  'whatsapp',
  'phone',
  'sms',
  'email',
  'vcard',
  'location',
  'event',
  'social',
  'appstore',
  'review',
  'mecard',
  'crypto',
] as const;

export type QrType = (typeof qrTypes)[number];

export type FieldValue = string | boolean;
export type Fields = Record<string, FieldValue>;

export interface QrContent {
  type: QrType;
  fields: Fields;
}

/** Field name → i18n key of the message. */
export type MessageMap = Record<string, string>;

export type ValidationResult =
  { ok: true; warnings?: MessageMap } | { ok: false; errors: MessageMap; warnings?: MessageMap };

export interface PayloadEncoder<F extends object = Fields> {
  type: QrType;
  /** Values used for any field the caller leaves out. */
  defaults: F;
  validate(fields: F): ValidationResult;
  /** Pure and deterministic. Only call with fields that passed `validate`. */
  encode(fields: F): string;
  /** Realistic sample data for "Try an example" and tests. */
  example: F;
  /** Payload length above which we warn that the code gets dense. */
  denseThreshold?: number;
}

export function isQrType(value: unknown): value is QrType {
  return typeof value === 'string' && (qrTypes as readonly string[]).includes(value);
}
