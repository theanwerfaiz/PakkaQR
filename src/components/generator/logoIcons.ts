/*
 * Generic, original glyphs (no third-party brand logos). Each is a
 * rounded square in a colour with a white symbol.
 */
const wrap = (bg: string, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="384" height="384"><rect width="96" height="96" rx="22" fill="${bg}"/><g fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;

export interface LogoIcon {
  id: string;
  svg: string;
}

export const logoIcons: LogoIcon[] = [
  { id: 'whatsapp', svg: wrap('#1FA855', '<path d="M24 72l5-14a26 26 0 1 1 10 9z"/>') },
  {
    id: 'wifi',
    svg: wrap(
      '#1F6FEB',
      '<path d="M20 40a40 40 0 0 1 56 0M30 51a26 26 0 0 1 36 0M40 62a12 12 0 0 1 16 0"/><circle cx="48" cy="72" r="2" fill="#fff"/>',
    ),
  },
  {
    id: 'upi',
    svg: wrap('#6D28D9', '<path d="M32 26h34M32 40h34M32 26h10a14 14 0 0 1 0 28H34l28 22"/>'),
  },
  {
    id: 'instagram',
    svg: wrap(
      '#C13584',
      '<rect x="24" y="24" width="48" height="48" rx="14"/><circle cx="48" cy="48" r="11"/><circle cx="62" cy="34" r="1.5" fill="#fff"/>',
    ),
  },
  {
    id: 'phone',
    svg: wrap(
      '#0F766E',
      '<path d="M30 22h10l5 13-7 5a30 30 0 0 0 18 18l5-7 13 5v10a6 6 0 0 1-6 6A46 46 0 0 1 24 28a6 6 0 0 1 6-6z"/>',
    ),
  },
  {
    id: 'email',
    svg: wrap(
      '#B45309',
      '<rect x="20" y="28" width="56" height="40" rx="6"/><path d="M22 32l26 20 26-20"/>',
    ),
  },
  {
    id: 'location',
    svg: wrap(
      '#DC2626',
      '<path d="M48 76s-20-20-20-34a20 20 0 0 1 40 0c0 14-20 34-20 34z"/><circle cx="48" cy="42" r="7"/>',
    ),
  },
];
