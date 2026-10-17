# Decisions

Decisions made while building PakkaQR where the spec was ambiguous, contradictory, or technically not possible as written. Each one picks the option that best protects privacy and simplicity.

## D-01 · Own QR renderer on `qrcode-generator` instead of `qr-code-styling`

**Spec:** use `qr-code-styling` for rendering.
**Problem:** it needs a DOM (`document.createElementNS`, `Image`) to draw, so it can't run in a Web Worker, which the batch generator requires. It also renders logos asynchronously through `Image`, and its output is hard to test in Node.
**Decision:** `src/lib/render/` builds one shared geometry (SVG path strings in module units) from a `qrcode-generator` matrix. The same geometry is serialised to SVG and drawn on any Canvas 2D context (DOM canvas, `OffscreenCanvas` in the worker, `@napi-rs/canvas` in tests) using `Path2D`. Every style in the spec is supported: six dot styles, three corner-square styles, two corner-dot styles, gradients, a separate corner colour, logos and six frames. Both packages are MIT.

## D-02 · ZXing as a decode fallback

jsQR can't read the round `dots` style that phone cameras read without trouble. The scan test runs jsQR first (fast, small) and falls back to `@zxing/library` (Apache-2.0, lazy-loaded) only when jsQR finds nothing. The spec already lists ZXing as the fallback.

## D-03 · UTF-8 byte mode for every payload

`qrcode-generator` defaults to Latin-1 bytes. We always encode UTF-8 in byte mode so Hindi, emoji and accents work (spec 03, general rules). Decoding reads jsQR's raw bytes as UTF-8 so the scan test compares exactly.

## D-04 · Fonts under the SIL Open Font License

CLAUDE.md allows MIT/Apache-2.0/BSD/ISC dependencies. The spec also asks for Inter "or similar OFL font" and Noto Sans Devanagari, both OFL-1.1. Fonts aren't code, OFL allows bundling with software under any licence, and nothing permissively licensed covers Devanagari as well. We self-host them through `@fontsource` packages.

## D-05 · axe-core (MPL-2.0) for accessibility tests only

The spec requires axe in Playwright. `axe-core` and `@axe-core/playwright` are MPL-2.0. They are dev-only test tools, unmodified and never shipped to users, so MPL's file-level copyleft has no effect on PakkaQR.

## D-06 · Content-Security-Policy via Astro's built-in hashing

`script-src 'self'` would block Astro's small inline hydration scripts. Astro 7's `security.csp` adds SHA-256 hashes for exactly those scripts, so the policy stays strict (no `'unsafe-inline'` for scripts) and otherwise matches spec 02 §2. We added `font-src 'self'` and `manifest-src 'self'`. `style-src 'unsafe-inline'` stays, as the spec allows. A `<meta>` CSP can't set `frame-ancestors`, so `public/_headers` sends `X-Frame-Options: DENY` on hosts that support headers.

## D-07 · Route names

`02_TECHNICAL_ARCHITECTURE.md` shows `batch.astro`, `scanner.astro` and `expiry-checker.astro`; `05_PAGES_AND_SEO.md` lists `/bulk-qr-code-generator`, `/qr-code-scanner` and `/qr-code-expiry-checker`. We use the SEO routes, because those are the URLs that get indexed. All pages come from one data-driven route (`src/pages/[...path].astro` + `src/data/pages.ts`) instead of one file per page; the folder structure allows either.

## D-08 · Home page H1

`05` gives "Free QR Code Generator — Codes That Never Expire"; `09` gives "Free QR codes that never expire. Pakka." The English H1 uses `05` (keyword-first for SEO); the brand line appears in the header, footer and share images. The Hindi H1 uses the Hindi line provided in `09` (`hero.title`), since that is the only reviewed Hindi version.

## D-09 · Contrast thresholds and presets

The 4.5 (warn) / 2.5 (fail) thresholds from the spec are kept. Every preset uses colours that clear 4.5 against its background (for gradients, every stop), so presets show "Verified" — except Midnight, which the spec itself marks as an inverted-risk preset and which shows ⚠️. Transparent backgrounds are checked as if printed on white.

## D-10 · Density warning without a known print size

The generator doesn't know the final print size, so for QR versions above 15 we warn and give the minimum print width (0.4 mm per module, rounded up to 0.5 cm). That's the spec's "warn for print under 3 cm" rule turned into something the user can act on.

## D-11 · Long-payload thresholds

F1 says to warn above 300 characters; the vCard spec says above 400. Each encoder may set `denseThreshold`; the default is 300 and vCard uses 400.

## D-12 · Logo budget

Logo coverage = share of symbol modules hidden behind the logo, or the logo's area when dots aren't hidden, divided by the EC level's recovery capacity (L 7%, M 15%, Q 25%, H 30%). Above 70% of the budget it warns; above 100% it fails. The actual decode test always has the final say. The UI slider stops at 30% as the spec says; the "40% logo with EC L fails" requirement is covered by unit tests and an E2E test that loads such a design from storage.

## D-13 · UPI amount format

Amounts are always written with two decimals (`150` → `150.00`), as in the spec example.

## D-14 · WiFi SSID and password are not trimmed

The general rule is to trim every field, but spaces can be part of real network names and passwords, and trimming them would produce a code that fails to join. SSID and password are kept exactly as typed.

## D-15 · Hindi review marking

JSON can't hold `// TODO review` comments. `src/i18n/hi.json` has a `_meta.todoReview` note and a `_meta.reviewed` list of the keys that came verbatim from `09_CONTENT_AND_COPY.md`. Every other Hindi UI string, and all of `src/i18n/content/hi.json`, was translated by the build agent and needs review by a native speaker.

## D-16 · Two dictionaries per locale

`src/i18n/<locale>.json` holds UI strings, which ship in the island bundle. `src/i18n/content/<locale>.json` holds long page copy, which is only used at build time in `.astro` pages and never ships as JavaScript. Both live under `src/i18n/`, as the spec asks.

## D-17 · Schema-driven forms

One `ContentForm` renders each type from a field schema (`src/components/forms/fields.ts`), instead of one form component per type. Adding a QR type means an encoder file plus a schema entry and strings (CONTRIBUTING.md has a worked example). This keeps behaviour (labels, errors, `aria-describedby`, keyboard use) identical across types.

## D-18 · State management

Plain `useReducer` (no Zustand). The generator is a single island with one reducer; a library added nothing.

## D-19 · Own service worker instead of `@vite-pwa/astro`

`@vite-pwa/astro` supports Astro up to v5, and this project uses Astro 7. `scripts/build-sw.mjs` writes a small service worker after the build. It precaches every built file except the share images, under a content-hashed cache name. Pages are network-first with an offline fallback; hashed assets are cache-first. No dependency is needed.

## D-20 · Trailing-slash policy and clean URLs

`trailingSlash: 'never'` with `build.format: 'file'` outputs `wifi-qr-code-generator.html`, served at `/wifi-qr-code-generator` by Cloudflare Pages, Netlify and GitHub Pages. Canonical and hreflang URLs never end in a slash.

## D-21 · Default site URL and base path

Canonical URLs need an origin. `PUBLIC_SITE_URL` sets it; if it's missing we use `https://pakkaqr.pages.dev` (Cloudflare Pages' default for a project named `pakkaqr`). Set the real domain before launch. `PUBLIC_BASE_PATH` supports GitHub Pages project sites (`/PakkaQR/`).

## D-22 · PDF text as images

jsPDF's built-in fonts can't shape Devanagari or emoji. In every PDF the QR code itself is vector (svg2pdf), and labels and headlines are drawn by the browser's canvas at 600 dpi and placed as images, so Hindi prints correctly.

## D-23 · Table-tent layout

"A4 folded" is read as an A4 portrait sheet folded across the middle. The top half is rotated 180° so both faces read correctly when the tent stands, and a dashed fold line is printed.

## D-24 · Batch in a Web Worker with OffscreenCanvas

The worker renders with `OffscreenCanvas` + `Path2D` and builds the ZIP with JSZip. Browsers without `OffscreenCanvas` in workers fall back to the main thread, yielding every 5 rows, and say so. The optional multi-page PDF is assembled on the main thread from the worker's PNGs, because jsPDF/svg2pdf need a DOM.

## D-25 · "Recreate as forever code" hand-off

The expiry checker never resolves links. It asks the user to paste the real destination and passes it to the generator through `sessionStorage` (read once, then deleted). Content never goes into a URL.

## D-26 · Shareable style links leave out the logo and label

Spec F12: design only, never content. The link also drops the logo (too large for a URL) and the frame label (it can contain personal text).

## D-27 · Analytics hook

`PUBLIC_ANALYTICS_ENABLED=false` by default. When enabled, the only thing sent is `navigator.sendBeacon(<same-origin path>, location.pathname)`: no cookies, no identifiers, no third-party origin (CSP `connect-src 'self'` enforces this).

## D-28 · Built-in logo icons

Original, generic glyphs (chat bubble, WiFi waves, rupee sign, camera, phone, envelope, map pin), not third-party brand logos, as F3 requires.

## D-29 · Pinned versions and the two-week rule

All packages are pinned exactly and were released more than two weeks before installation. TypeScript stays on 5.9.3 because `@astrojs/check` and `typescript-eslint` don't support 7.x yet. `@playwright/test` is pinned to 1.56.1 to match the Chromium build available offline in the development environment; CI installs browsers for that version.

## D-30 · Contact details in community files

SECURITY.md and CODE_OF_CONDUCT.md point to GitHub's private vulnerability reporting and the maintainer's GitHub profile, not a personal email address. The owner can add an email later if they want.

## D-31 · Link colour

The accent `#1F6FEB` on the page background is 4.45:1, just under WCAG AA for body text. Links use a slightly darker `#1A5FCC` (5.6:1); buttons and other accent uses keep the spec token.

## D-32 · Lighthouse performance

To keep total blocking time low, QR matrices are cached, preset thumbnails draw at idle time, and the decoder (jsQR/ZXing) loads on first use. Initial JS on generator pages is about 127 KB gzipped (budget 200 KB).

## D-33 · "Ink & Stamp" redesign

The first version looked generic (Inter, default blue, a card around every section, emoji status icons). The redesign uses paper, ink and a rubber stamp — things a shop owner already trusts:

- **Colour:** paper `#F4EFE6`, sheet `#FFFCF6`, ink `#1A1712` and one stamp colour (sindoor `#C2321A` by default). Primary buttons are ink; the stamp colour is kept for verified results, focus rings and link underlines. Contrast of every text pair is checked in `tests/unit/smart/tokens.test.ts`.
- **Type:** one family for both scripts — Anek Latin and Anek Devanagari (variable width and weight), with JetBrains Mono for payloads. Hindi gets taller line height so matras never clip. All three are self-hosted; the bundler never inlines font files because the CSP only allows `font-src 'self'`.
- **Status:** emoji were replaced by the stamp — PAKKA (solid ring), RISKY (dashed, tilted the other way) and DOES NOT SCAN (hatched). States differ by words and line style, not just colour, and each has a spoken label.
- **Stamp placement:** on screen the stamp sits on the sheet's top edge, outside the code's modules. On share cards it is placed entirely above the code (unit-tested), so it never affects scanning.

## D-34 · Engagement features without tracking

Features chosen from the Gen Z / all-ages research (story cards, link-in-bio, split the bill, frames, shuffle, photo palette, scan-me check, big & clear mode) all run on the device. Things that need a server or tracking were left out on purpose: public galleries, likes, streaks, leaderboards and cloud AI art.

- **Story cards and video:** drawn on a canvas; the video uses the browser's own `MediaRecorder` (MP4 or WebM, whichever the browser supports) — no encoder library. The button only appears when recording is supported.
- **"Made with PakkaQR" credit line:** optional and off by default, because the product promises no watermark.
- **Photo palette:** the photo is downscaled to 64 px on a local canvas; colours are darkened until they reach 7:1 contrast so suggestions always scan.
- **Shuffle:** picks from curated ink/paper pairs (all ≥ 7:1) and the supported shapes; logo, frame, quiet zone and error correction are kept.
- **Split the bill:** each share is rounded up to the next paisa so the group is never short; one code is shared by everyone.
- **Haptics:** a short vibration when a risky code is fixed or a file is saved. Off with Personalise → vibration or "less motion"; silently unavailable on iPhone.
- **Festival stamps:** the stamp's top line changes on a few national/festival days. Lunar dates are listed ahead in `src/lib/smart/festival.ts` and need a yearly update.
- **Personalise:** theme, stamp colour, text size (Big & clear scales the whole UI via the root font size), motion and vibration — stored in localStorage and applied before first paint by `public/theme.js`.

## D-35 · Smart paste detection

The home page's "What should the code open?" box guesses the type from what was pasted (WiFi string, UPI link or ID, email, phone, WhatsApp link, @handle, coordinates, URL, else text) and fills the normal form. A bare `name@bank` without a dot is treated as a UPI ID, `name@domain.tld` as an email. Detection is a pure function with unit tests and never touches the network.
