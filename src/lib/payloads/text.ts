import { isBlank, result } from '../validate/common';
import type { PayloadEncoder } from './types';

export interface TextFields {
  text: string;
}

export const textEncoder: PayloadEncoder<TextFields> = {
  type: 'text',
  defaults: { text: '' },
  example: { text: 'Welcome to Ravi Stores!\nOpen 9am – 9pm, Monday to Saturday.' },
  validate({ text }) {
    return result(isBlank(text) ? { text: 'errors.required' } : {});
  },
  encode({ text }) {
    return text.replace(/\r\n?/g, '\n').trim();
  },
};
