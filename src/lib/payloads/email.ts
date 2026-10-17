import { isBlank, isValidEmail, result } from '../validate/common';
import { encodeQueryValue } from './escape';
import type { PayloadEncoder } from './types';

export interface EmailFields {
  to: string;
  subject: string;
  body: string;
}

export const emailEncoder: PayloadEncoder<EmailFields> = {
  type: 'email',
  defaults: { to: '', subject: '', body: '' },
  example: { to: 'hello@example.com', subject: 'Order query', body: 'Hi there' },
  validate({ to }) {
    if (isBlank(to)) return result({ to: 'errors.required' });
    return result(isValidEmail(to) ? {} : { to: 'errors.email.invalid' });
  },
  encode({ to, subject, body }) {
    const params: string[] = [];
    if (!isBlank(subject)) params.push(`subject=${encodeQueryValue(subject.trim())}`);
    if (!isBlank(body)) params.push(`body=${encodeQueryValue(body.trim())}`);
    return `mailto:${to.trim()}${params.length ? `?${params.join('&')}` : ''}`;
  },
};
