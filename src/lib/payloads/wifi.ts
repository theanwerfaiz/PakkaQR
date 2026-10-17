import { result, utf8Length } from '../validate/common';
import { escapeMeCardStyle } from './escape';
import type { MessageMap, PayloadEncoder } from './types';

export type WifiSecurity = 'WPA' | 'WEP' | 'nopass';

export interface WifiFields {
  ssid: string;
  password: string;
  security: WifiSecurity;
  hidden: boolean;
}

/*
 * SSID and password are NOT trimmed: spaces can be part of real network
 * credentials, and trimming them would make the code fail to join.
 */
function encodeSsid(ssid: string): string {
  // A hex-only SSID could be read as raw bytes by some scanners; quote it.
  if (/^[0-9A-Fa-f]+$/.test(ssid)) return `"${ssid}"`;
  return escapeMeCardStyle(ssid);
}

export const wifiEncoder: PayloadEncoder<WifiFields> = {
  type: 'wifi',
  defaults: { ssid: '', password: '', security: 'WPA', hidden: false },
  example: { ssid: 'Cafe Guest', password: 'coffee-time-2024', security: 'WPA', hidden: false },
  validate({ ssid, password, security }) {
    const errors: MessageMap = {};
    if (ssid === '') errors.ssid = 'errors.required';
    else if (utf8Length(ssid) > 32) errors.ssid = 'errors.wifi.ssidLength';
    if (!['WPA', 'WEP', 'nopass'].includes(security)) errors.security = 'errors.invalid';
    if (security !== 'nopass') {
      if (password === '') errors.password = 'errors.required';
      else if (security === 'WPA' && (password.length < 8 || password.length > 63)) {
        errors.password = 'errors.wifi.wpaLength';
      }
    }
    return result(errors);
  },
  encode({ ssid, password, security, hidden }) {
    let out = `WIFI:T:${security};S:${encodeSsid(ssid)};`;
    if (security !== 'nopass') out += `P:${escapeMeCardStyle(password)};`;
    if (hidden) out += 'H:true;';
    return `${out};`;
  },
};
