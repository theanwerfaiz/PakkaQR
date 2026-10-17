/** Days when the stamp wears something special. Dates are local (IST in India). */
export type Festival = 'diwali' | 'holi' | 'independence' | 'republic' | 'newyear' | 'eid';

// Lunar festivals move every year; listed ahead for a few years.
const MOVING: Record<string, Festival> = {
  '2026-11-08': 'diwali',
  '2027-10-29': 'diwali',
  '2028-10-17': 'diwali',
  '2027-03-22': 'holi',
  '2028-03-11': 'holi',
  '2027-03-10': 'eid',
  '2028-02-27': 'eid',
};

const FIXED: Record<string, Festival> = {
  '01-01': 'newyear',
  '01-26': 'republic',
  '08-15': 'independence',
};

const pad = (n: number) => String(n).padStart(2, '0');

export function festivalOn(date: Date): Festival | null {
  const md = `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const ymd = `${date.getFullYear()}-${md}`;
  return MOVING[ymd] ?? FIXED[md] ?? null;
}
