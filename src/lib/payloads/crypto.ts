import { isBlank, parseDecimal, result } from '../validate/common';
import type { MessageMap, PayloadEncoder } from './types';

export type Coin = 'btc' | 'eth';

export interface CryptoFields {
  coin: Coin;
  address: string;
  /** In BTC or ETH (not wei); converted for Ethereum. */
  amount: string;
  /** Ethereum only, optional (1 = mainnet). */
  chainId: string;
}

const BTC_RE = /^(?:[13][a-km-zA-HJ-NP-Z1-9]{25,34}|(?:bc1|BC1)[a-zA-HJ-NP-Z0-9]{11,71})$/;
const ETH_RE = /^0x[0-9a-fA-F]{40}$/;

/** "0.5" ETH → "500000000000000000" wei, using string math (no float error). */
export function ethToWei(eth: string): string {
  const [whole = '0', frac = ''] = eth.split('.');
  const wei = `${whole}${frac.padEnd(18, '0')}`.replace(/^0+(?=\d)/, '');
  return wei;
}

export const cryptoEncoder: PayloadEncoder<CryptoFields> = {
  type: 'crypto',
  defaults: { coin: 'btc', address: '', amount: '', chainId: '' },
  example: {
    coin: 'btc',
    address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    amount: '0.001',
    chainId: '',
  },
  validate(f) {
    const errors: MessageMap = {};
    const address = f.address.trim();
    if (f.coin !== 'btc' && f.coin !== 'eth') errors.coin = 'errors.invalid';
    if (!address) errors.address = 'errors.required';
    else if (!(f.coin === 'eth' ? ETH_RE : BTC_RE).test(address))
      errors.address = 'errors.crypto.address';
    if (!isBlank(f.amount) && parseDecimal(f.amount, f.coin === 'eth' ? 18 : 8) === null) {
      errors.amount = 'errors.crypto.amount';
    }
    if (f.coin === 'eth' && !isBlank(f.chainId) && !/^[1-9]\d{0,15}$/.test(f.chainId.trim())) {
      errors.chainId = 'errors.crypto.chainId';
    }
    return result(errors);
  },
  encode(f) {
    const address = f.address.trim();
    const amount = f.amount.trim();
    if (f.coin === 'eth') {
      const chain = isBlank(f.chainId) ? '' : `@${f.chainId.trim()}`;
      return `ethereum:${address}${chain}${amount ? `?value=${ethToWei(amount)}` : ''}`;
    }
    return `bitcoin:${address}${amount ? `?amount=${amount}` : ''}`;
  },
};
