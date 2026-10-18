// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';

const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), 'PUBLIC_');
const site = (env.PUBLIC_SITE_URL || 'https://pakkaqr.pages.dev').replace(/\/$/, '');
const base = env.PUBLIC_BASE_PATH || '/';

// Must stay in sync with docs/spec/02_TECHNICAL_ARCHITECTURE.md §2. Astro adds hashes
// for its own inline scripts to script-src, so no 'unsafe-inline' is needed for scripts.
const cspDirectives = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
];

export default defineConfig({
  site,
  base,
  output: 'static',
  markdown: { syntaxHighlight: false },
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'never' },
  integrations: [
    react(),
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en-IN', hi: 'hi-IN' } },
      filter: (page) => !page.includes('/404') && !/\/open(\.html)?$/.test(page),
    }),
  ],
  security: {
    csp: {
      directives: cspDirectives,
      scriptDirective: { resources: ["'self'"] },
      styleDirective: { resources: ["'self'", "'unsafe-inline'"] },
    },
  },
  vite: {
    plugins: [tailwindcss()],
    worker: { format: 'es' },
    // Fonts are always separate files: the CSP allows font-src 'self', not data: URIs.
    build: { assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined) },
  },
});
