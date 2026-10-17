# 02 — Technical Architecture

## 1. Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **Astro** (static output) with **React** islands | Many SEO landing pages as pre-rendered HTML; interactive generator hydrated only where needed |
| Language | TypeScript (strict) | Safety, better agent output |
| Styling | Tailwind CSS + CSS variables for theme tokens | Fast, consistent, small CSS |
| QR rendering | `qr-code-styling` | Dot/corner styles, gradients, logo, SVG + canvas output |
| QR decoding | `jsqr` (fallback: `@zxing/library`) | Scan test, reader, expiry checker |
| ZIP | `jszip` | Batch export |
| PDF | `jspdf` (+ `svg2pdf.js` for vector codes) | Print layouts, PDF export |
| CSV | `papaparse` | Batch input |
| Storage | `idb-keyval` (IndexedDB) | Saved templates, opt-in history |
| i18n | Lightweight custom JSON dictionaries + Astro i18n routing | No heavy runtime |
| PWA | `@vite-pwa/astro` | Offline + installable |
| Unit tests | Vitest | Fast |
| E2E tests | Playwright | Generate → download → decode tests across browsers |
| Lint/format | ESLint + Prettier | Consistency |

> **Before installing:** verify each package's current license and pick an exact version released more than two weeks ago. Record name, version, license in `docs/DEPENDENCIES.md`. If a library does not support a needed feature, choose a permissively licensed alternative and log it in `docs/DECISIONS.md`.

## 2. Hard constraints

- `output: 'static'` in Astro config. Build produces plain HTML/CSS/JS in `dist/`.
- No runtime network requests except loading the site's own static assets. Self-host fonts.
- Content-Security-Policy meta tag: `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; media-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'none'`. (Adjust only if a library requires it; document why.)
- Lazy-load: batch generator, PDF/print module, scanner/camera, expiry checker.

## 3. Folder structure

```
/
├─ CLAUDE.md
├─ README.md  LICENSE  CONTRIBUTING.md  CODE_OF_CONDUCT.md  SECURITY.md
├─ docs/
│  ├─ spec/                 # this build pack
│  ├─ DECISIONS.md          # agent-recorded decisions
│  └─ DEPENDENCIES.md       # name, version, license
├─ public/
│  ├─ icons/ (favicon, PWA icons)  og/ (social images)  robots.txt
├─ src/
│  ├─ pages/                # Astro routes (see 05_PAGES_AND_SEO.md)
│  │  ├─ index.astro
│  │  ├─ [type]-qr-code-generator.astro   # or explicit files per type
│  │  ├─ batch.astro  scanner.astro  expiry-checker.astro  print.astro
│  │  ├─ about.astro  privacy.astro  faq.astro  404.astro
│  │  └─ hi/ ...            # Hindi mirrors
│  ├─ layouts/BaseLayout.astro
│  ├─ components/
│  │  ├─ generator/  Generator.tsx  TypeTabs.tsx  Preview.tsx  CustomizePanel.tsx
│  │  │              ExportPanel.tsx  ScanStatus.tsx  PresetGrid.tsx  FramePicker.tsx  LogoPicker.tsx
│  │  ├─ forms/      UrlForm.tsx WifiForm.tsx UpiForm.tsx WhatsAppForm.tsx PhoneForm.tsx SmsForm.tsx
│  │  │              EmailForm.tsx VCardForm.tsx LocationForm.tsx EventForm.tsx SocialForm.tsx ...
│  │  ├─ batch/  print/  scanner/  expiry/  common/ (Button, Input, Select, Slider, ColorPicker, Toast, Modal)
│  ├─ lib/
│  │  ├─ payloads/          # pure encoders: url.ts wifi.ts upi.ts vcard.ts ... + index.ts registry
│  │  ├─ validate/          # validators per type
│  │  ├─ render/            # wrapper around qr-code-styling; frames compositor
│  │  ├─ decode/            # jsQR wrapper, image → text
│  │  ├─ scannability/      # contrast, logo budget, quiet zone, density, decode check
│  │  ├─ export/            # png, svg, pdf, jpeg, webp, clipboard, share
│  │  ├─ print/             # layout engines (stickers, tent, poster, cards)
│  │  ├─ batch/             # csv parsing, mapping, worker orchestration
│  │  ├─ expiry/            # classify decoded content
│  │  ├─ storage/           # idb-keyval wrappers
│  │  └─ i18n/
│  ├─ workers/batch.worker.ts
│  ├─ data/
│  │  ├─ presets.json  frames.json  redirect-domains.json  country-codes.json  social-platforms.json
│  ├─ i18n/ en.json  hi.json
│  └─ styles/global.css
├─ tests/
│  ├─ unit/   (encoders, validators, scannability, expiry classifier)
│  ├─ e2e/    (Playwright)
│  └─ fixtures/ (sample QR images incl. dynamic-service examples, CSVs)
└─ .github/ workflows/ci.yml  ISSUE_TEMPLATE/  PULL_REQUEST_TEMPLATE.md
```

## 4. Core data model

```ts
type QrType = 'url'|'text'|'wifi'|'upi'|'whatsapp'|'phone'|'sms'|'email'|'vcard'
  |'location'|'event'|'social'|'appstore'|'review'|'mecard'|'crypto';

interface QrContent { type: QrType; fields: Record<string, string | boolean>; }

interface QrDesign {
  fg: string; bg: string; transparentBg: boolean;
  gradient?: { kind: 'linear'|'radial'; colors: [string, string]; angle: number };
  dotStyle: 'square'|'rounded'|'dots'|'classy'|'classy-rounded'|'extra-rounded';
  cornerSquareStyle: 'square'|'dot'|'extra-rounded'; cornerDotStyle: 'square'|'dot';
  cornerColor?: string;
  logo?: { dataUrl: string; sizeRatio: number; margin: number; hideBackgroundDots: boolean };
  margin: number;                         // quiet zone in modules
  ecLevel: 'auto'|'L'|'M'|'Q'|'H';
  frame?: { id: string; label: string; labelColor: string; frameColor: string };
}

interface PayloadEncoder<F> {
  type: QrType;
  validate(fields: F): { ok: true } | { ok: false; errors: Record<string, string> };
  encode(fields: F): string;              // pure, deterministic
  example: F;                             // used by "Try an example" + tests
}
```

## 5. Data flow

```
Form input ─► validate ─► encode (payload string)
                                   │
Design settings ───────────────────┼─► render (qr-code-styling) ─► Preview (canvas/SVG)
                                   │                │
                                   │                └─► frame compositor (SVG) ─► final SVG
                                   ▼
                      scannability checks ◄── decode test (offscreen canvas → jsQR)
                                   │
                                   ▼
                     Status chip + warnings ─► Export (PNG/SVG/PDF/...) / Print / Batch
```

- Render the **final** image (including frame) to an offscreen canvas at 1024 px for the decode test; debounce 300 ms.
- Frames are composed as SVG around the QR SVG so exports stay vector.

## 6. State

- Generator state (content + design) in a single React store (Zustand or `useReducer` + context — agent's choice, log it).
- Persist **design only** (not content) to localStorage as "last used style" so returning users see their style.
- Content persists only if the user enables history.

## 7. Performance budgets

- LCP < 1.5 s on simulated 4G mid-range phone; CLS < 0.05; TBT < 150 ms.
- Initial JS on `/` ≤ 200 KB gzipped. Each landing page reuses the same generator island.
- Batch of 500 PNGs @1024 px completes < 60 s on a mid-range laptop.

## 8. Security

- Treat all user text as untrusted. Escape any user text placed into SVG frames (`<`, `>`, `&`, quotes).
- Sanitize uploaded SVG logos (strip `<script>`, event handlers, external refs) or rasterize them to PNG before use.
- Scanner: never auto-open links; show full URL and warn on `javascript:`, `data:`, and look-alike/punycode domains.
- No `eval`, no `innerHTML` with user data.

## 9. Deployment

- Any static host. Recommended: Cloudflare Pages or GitHub Pages (free). Netlify/Vercel also fine.
- GitHub Actions: on PR → lint, typecheck, unit, build, Playwright (Chromium). On main → also deploy.
- Set security headers via host config where supported (`_headers` file for Cloudflare/Netlify).
