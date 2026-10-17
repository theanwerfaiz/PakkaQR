# Dependencies

Every dependency is pinned to an exact version (see `package.json` and `package-lock.json`). Licences were checked before adding each one. Allowed licences for code shipped to users: MIT, Apache-2.0, BSD, ISC. Exceptions are listed under the tables.

## Shipped to users (runtime)

| Package                          | Version | Licence                   | Purpose                                              |
| -------------------------------- | ------- | ------------------------- | ---------------------------------------------------- |
| @astrojs/react                   | 7.0.0   | MIT                       | React islands for Astro                              |
| @astrojs/sitemap                 | 3.7.4   | MIT                       | sitemap.xml with hreflang                            |
| @fontsource-variable/inter       | 5.3.0   | OFL-1.1                   | Self-hosted Inter font                               |
| @fontsource/noto-sans-devanagari | 5.3.0   | OFL-1.1                   | Self-hosted Devanagari font                          |
| @tailwindcss/vite                | 4.3.3   | MIT                       | Tailwind build plugin                                |
| @zxing/library                   | 0.23.0  | Apache-2.0                | QR decoding fallback (lazy-loaded)                   |
| astro                            | 7.3.5   | MIT                       | Static site framework                                |
| idb-keyval                       | 6.3.0   | Apache-2.0                | IndexedDB for saved designs and opt-in history       |
| jspdf                            | 4.2.1   | MIT                       | PDF export and print layouts (lazy-loaded)           |
| jsqr                             | 1.4.0   | Apache-2.0                | QR decoding (fast path)                              |
| jszip                            | 3.10.2  | (MIT OR GPL-3.0-or-later) | Batch ZIP export (used under its MIT licence option) |
| papaparse                        | 5.7.0   | MIT                       | CSV parsing for batch                                |
| qrcode-generator                 | 2.0.4   | MIT                       | QR matrix encoding (UTF-8 byte mode)                 |
| react                            | 19.3.0  | MIT                       | UI                                                   |
| react-dom                        | 19.3.0  | MIT                       | UI                                                   |
| svg2pdf.js                       | 2.8.1   | MIT                       | Vector QR codes in PDFs (lazy-loaded)                |
| tailwindcss                      | 4.3.3   | MIT                       | Styling                                              |

## Development, test and build only (not shipped)

| Package                   | Version | Licence    | Purpose                                                      |
| ------------------------- | ------- | ---------- | ------------------------------------------------------------ |
| @astrojs/check            | 0.9.10  | MIT        | Astro type checking                                          |
| @axe-core/playwright      | 4.13.0  | MPL-2.0    | Accessibility tests (dev only)                               |
| @eslint/js                | 10.0.1  | MIT        | Linting                                                      |
| @napi-rs/canvas           | 1.0.9   | MIT        | Node canvas for tests, icons and OG images (build/test only) |
| @playwright/test          | 1.56.1  | Apache-2.0 | E2E tests                                                    |
| @types/node               | 22.20.4 | MIT        | Types                                                        |
| @types/papaparse          | 5.5.2   | MIT        | Types                                                        |
| @types/react              | 19.3.0  | MIT        | Types                                                        |
| @types/react-dom          | 19.3.0  | MIT        | Types                                                        |
| @vitest/coverage-v8       | 5.0.3   | MIT        | Coverage                                                     |
| axe-core                  | 4.13.0  | MPL-2.0    | Accessibility tests (dev only)                               |
| eslint                    | 10.11.0 | MIT        | Linting                                                      |
| eslint-plugin-astro       | 3.2.1   | MIT        | Linting                                                      |
| eslint-plugin-react-hooks | 7.1.1   | MIT        | Linting                                                      |
| fake-indexeddb            | 6.2.5   | Apache-2.0 | IndexedDB for unit tests                                     |
| globals                   | 17.12.0 | MIT        | Linting                                                      |
| jsdom                     | 30.1.1  | MIT        | DOM for unit tests                                           |
| prettier                  | 3.9.9   | MIT        | Formatting                                                   |
| prettier-plugin-astro     | 1.1.0   | MIT        | Formatting                                                   |
| typescript                | 5.9.3   | Apache-2.0 | Type checking                                                |
| typescript-eslint         | 8.71.0  | MIT        | Linting                                                      |
| vitest                    | 5.0.3   | MIT        | Unit tests                                                   |

## Licence exceptions

- **Fonts — SIL Open Font License 1.1** (`@fontsource-variable/inter`, `@fontsource/noto-sans-devanagari`). OFL is the standard licence for open fonts and allows bundling and redistribution with software of any licence. CLAUDE.md lists MIT/Apache-2.0/BSD/ISC for code dependencies; fonts are not code, and no permissively licensed alternative covers Devanagari as well. See docs/DECISIONS.md (D-04).
- **jszip — dual MIT OR GPL-3.0-or-later.** We use it under the MIT option.
- **axe-core and @axe-core/playwright — MPL-2.0.** Used only in the test suite, never shipped or modified. See docs/DECISIONS.md (D-05).
- **Tools used during development but not installed as dependencies:** Lighthouse 13.5.0 (Apache-2.0), run with `npx` for audits.

All versions were released more than two weeks before they were added (October 2026), except where an older, already-pinned browser build forced a match: `@playwright/test` is pinned to 1.56.1 to match the preinstalled Chromium build used in development.

## Transitive dependencies

`npm ls --omit=dev --all` lists about 290 packages, almost all MIT, ISC, Apache-2.0 or BSD. The others:

| Package                                | Licence               | Where it ends up        | Notes                                          |
| -------------------------------------- | --------------------- | ----------------------- | ---------------------------------------------- |
| dompurify (via jspdf, optional)        | MPL-2.0 OR Apache-2.0 | Lazy chunk in `dist/`   | Used under Apache-2.0.                         |
| canvg → rgbcolor (via jspdf, optional) | MIT OR custom         | Lazy chunk in `dist/`   | Used under MIT.                                |
| lightningcss (via Tailwind)            | MPL-2.0               | Build tool only         | Not shipped; unmodified.                       |
| sharp / libvips (optional, via Astro)  | Apache-2.0 / LGPL-3.0 | Build tool only, unused | Astro's image service; PakkaQR doesn't use it. |
| lru-cache, sax, common-ancestor-path   | BlueOak-1.0.0         | Build tool only         | Permissive.                                    |
| argparse                               | Python-2.0            | Build tool only         | Permissive.                                    |
| mdn-data                               | CC0-1.0               | Build tool only         | Public domain.                                 |

Nothing with a copyleft-only licence is shipped to users' browsers.
