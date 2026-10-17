import {
  encoders,
  qrTypes,
  withDefaults,
  type Fields,
  type QrContent,
  type QrType,
} from '../../lib/payloads';
import { defaultDesign, type QrDesign } from '../../lib/render/design';

export interface GenState {
  type: QrType;
  fields: Record<QrType, Fields>;
  /** Fields the user has left (or example-filled): only these show errors. */
  touched: Record<string, boolean>;
  /** Show every error (after a download attempt). */
  revealErrors: boolean;
  design: QrDesign;
}

export type GenAction =
  | { kind: 'type'; type: QrType }
  | { kind: 'field'; name: string; value: string | boolean; extra?: Fields }
  | { kind: 'touch'; name: string }
  | { kind: 'example' }
  | { kind: 'content'; content: QrContent }
  | { kind: 'reveal' }
  | { kind: 'design'; design: QrDesign };

export function initialState(type: QrType, fields: Fields = {}): GenState {
  const all = Object.fromEntries(qrTypes.map((t) => [t, { ...encoders[t].defaults }])) as Record<
    QrType,
    Fields
  >;
  all[type] = withDefaults(type, fields);
  return { type, fields: all, touched: {}, revealErrors: false, design: defaultDesign };
}

export function reducer(state: GenState, action: GenAction): GenState {
  switch (action.kind) {
    case 'type':
      return action.type === state.type
        ? state
        : { ...state, type: action.type, touched: {}, revealErrors: false };
    case 'field': {
      const current = state.fields[state.type];
      const next = { ...current, ...action.extra, [action.name]: action.value };
      return { ...state, fields: { ...state.fields, [state.type]: next } };
    }
    case 'touch':
      return state.touched[action.name]
        ? state
        : { ...state, touched: { ...state.touched, [action.name]: true } };
    case 'example': {
      const example = { ...encoders[state.type].example };
      const touched = Object.fromEntries(Object.keys(example).map((k) => [k, true]));
      return { ...state, fields: { ...state.fields, [state.type]: example }, touched };
    }
    case 'content':
      return {
        ...state,
        type: action.content.type,
        fields: {
          ...state.fields,
          [action.content.type]: withDefaults(action.content.type, action.content.fields),
        },
        touched: Object.fromEntries(Object.keys(action.content.fields).map((k) => [k, true])),
        revealErrors: false,
      };
    case 'reveal':
      return { ...state, revealErrors: true };
    case 'design':
      return { ...state, design: action.design };
  }
}

const SUMMARY_FIELD: Partial<Record<QrType, string>> = {
  url: 'url',
  text: 'text',
  wifi: 'ssid',
  upi: 'pn',
  whatsapp: 'number',
  phone: 'number',
  sms: 'number',
  email: 'to',
  event: 'title',
  review: 'url',
  crypto: 'address',
};

/** Short human description of the content, for the preview's alt text. */
export function summarize(type: QrType, fields: Fields): string {
  const s = (k: string) => (typeof fields[k] === 'string' ? (fields[k] as string).trim() : '');
  let text: string;
  switch (type) {
    case 'vcard':
    case 'mecard':
      text = [s('firstName'), s('lastName')].filter(Boolean).join(' ');
      break;
    case 'location':
      text = s('lat') && s('lng') ? `${s('lat')}, ${s('lng')}` : s('mapsLink');
      break;
    case 'social':
      text = `${s('platform')} ${s('username')}`;
      break;
    case 'appstore':
      text = s(fields.store === 'apple' ? 'appleUrl' : 'playUrl');
      break;
    default:
      text = s(SUMMARY_FIELD[type] ?? '');
  }
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
}
