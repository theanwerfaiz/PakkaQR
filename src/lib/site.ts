/** Public, build-time configuration (see .env.example). Nothing here is secret. */
const env = import.meta.env;

const clean = (value: string | undefined): string => (value ?? '').trim();

export const siteConfig = {
  githubUrl: clean(env.PUBLIC_GITHUB_URL) || 'https://github.com/theanwerfaiz/PakkaQR',
  sponsorUrl: clean(env.PUBLIC_SPONSOR_URL),
  upiDonateId: clean(env.PUBLIC_UPI_DONATE_ID),
  analyticsEnabled: clean(env.PUBLIC_ANALYTICS_ENABLED) === 'true',
  /** Same-origin path that accepts a cookieless page-view beacon. */
  analyticsPath: clean(env.PUBLIC_ANALYTICS_PATH) || '/api/hit',
};

/** Prefixes a site-relative path with the deploy base (for GitHub Pages sub-paths). */
export function withBase(path: string): string {
  const base = env.BASE_URL.endsWith('/') ? env.BASE_URL : `${env.BASE_URL}/`;
  return `${base}${path.replace(/^\//, '')}`;
}
