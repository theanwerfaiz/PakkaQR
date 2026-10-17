import { parseDecimal } from '../validate/common';

export const SPLIT_MAX_PEOPLE = 50;

export interface Split {
  /** Each person's share in rupees, two decimals (e.g. "333.34"). */
  perPerson: string;
  /** perPerson × people, which can be a few paise above the bill. */
  collected: string;
}

const rupees = (paise: number) => (paise / 100).toFixed(2);

/**
 * Splits a bill evenly, rounding each share up to the next paisa so the
 * group never comes up short. Returns null for anything that isn't a
 * positive amount or a sensible group size.
 */
export function splitBill(total: string, people: number): Split | null {
  const clean = parseDecimal(total.replace(/[₹,\s]/g, ''), 2);
  if (clean === null || !Number.isInteger(people) || people < 2 || people > SPLIT_MAX_PEOPLE)
    return null;
  const totalPaise = Math.round(Number(clean) * 100);
  if (totalPaise <= 0 || totalPaise > 1_000_000_000) return null;
  const share = Math.ceil(totalPaise / people);
  return { perPerson: rupees(share), collected: rupees(share * people) };
}
