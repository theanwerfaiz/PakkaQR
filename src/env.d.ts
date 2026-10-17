/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_BASE_PATH?: string;
  readonly PUBLIC_GITHUB_URL?: string;
  readonly PUBLIC_SPONSOR_URL?: string;
  readonly PUBLIC_UPI_DONATE_ID?: string;
  readonly PUBLIC_ANALYTICS_ENABLED?: string;
  readonly PUBLIC_ANALYTICS_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
