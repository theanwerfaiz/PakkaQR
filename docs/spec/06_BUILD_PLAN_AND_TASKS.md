# 06 — Build Plan & Task List

Build the full product in one continuous run, phase by phase. Tick `[x]` as you go. Each phase ends with its tests passing.

## Phase 0 — Project setup
- [ ] T0.1 Init Astro (static) + React + TypeScript strict + Tailwind. Add ESLint, Prettier, Vitest, Playwright.
- [ ] T0.2 Create folder structure from `02_TECHNICAL_ARCHITECTURE.md`. Add `docs/DECISIONS.md`, `docs/DEPENDENCIES.md`.
- [ ] T0.3 Install pinned deps (qr-code-styling, jsqr, jszip, jspdf, svg2pdf.js, papaparse, idb-keyval, @vite-pwa/astro, Astro sitemap). Record licenses.
- [ ] T0.4 Base layout: header, footer (trademark notices), theme toggle (light/dark/system), language switcher, CSP meta, self-hosted fonts.
- [ ] T0.5 i18n system with `en.json` and `hi.json`; helper `t(key)`; locale routing `/` and `/hi/`.
- [ ] T0.6 CI workflow: lint, typecheck, unit tests, build, Playwright (Chromium).
**Done when:** `npm run build` outputs static `dist/`, CI green, empty pages render in both languages and themes.

## Phase 1 — Payload engine
- [ ] T1.1 `PayloadEncoder` interface + registry.
- [ ] T1.2 Encoders + validators: url, text, wifi, upi, whatsapp, phone, sms, email, vcard.
- [ ] T1.3 Encoders: location (incl. Maps-link parsing), event (timezone → UTC), social, appstore, review.
- [ ] T1.4 P2 encoders if time: mecard, crypto.
- [ ] T1.5 Unit tests for every case listed in `03_QR_PAYLOAD_SPEC.md`.
**Done when:** ≥ 95% line coverage on `src/lib/payloads` and `src/lib/validate`.

## Phase 2 — Rendering, preview & decode
- [ ] T2.1 Render wrapper around qr-code-styling taking `(payload, QrDesign)` → SVG string + canvas.
- [ ] T2.2 Decode module (jsQR) from canvas/ImageData/File.
- [ ] T2.3 Scan-test function: render final image at 1024 px offscreen → decode → compare.
- [ ] T2.4 Unit/integration test: every encoder example renders and decodes to its payload.
**Done when:** round-trip test passes for all types with default design.

## Phase 3 — Generator UI
- [ ] T3.1 Generator shell (two-column desktop, single-column mobile with sticky download bar).
- [ ] T3.2 Type tabs/chips and all forms with validation messages and "Try an example".
- [ ] T3.3 Live preview with debounce, placeholder state, alt text.
- [ ] T3.4 Customize panel: colors, gradient, transparent bg, dot/corner styles, corner color, margin, EC level.
- [ ] T3.5 Logo picker: upload/drag/paste, built-in generic icons, size/margin/hide-dots; SVG sanitisation or rasterisation.
- [ ] T3.6 Presets grid (≥ 12) from `presets.json`.
- [ ] T3.7 Frames (≥ 6) with editable label, colors; SVG compositor; per-type default labels.
- [ ] T3.8 Remember last design in localStorage; reset button.
**Done when:** every type can be created, styled and previewed on mobile and desktop.

## Phase 4 — Scannability & export
- [ ] T4.1 Scannability checks: contrast, inverted warning, logo budget, quiet zone, density, decode result → status chip + warnings + "Fix it" actions.
- [ ] T4.2 Export PNG (sizes 256–4096), SVG, JPEG, WebP, PDF (physical size), clipboard, Web Share.
- [ ] T4.3 File naming; download-anyway modal on ❌; post-download toast (once per session).
- [ ] T4.4 E2E: for each type, generate → download PNG & SVG → decode file → compare payload.
**Done when:** E2E export tests pass in Chromium, Firefox, WebKit.

## Phase 5 — Advanced tools
- [ ] T5.1 Scanner page: camera, image upload, paste; type detection; safe-open confirmation; dangerous-scheme and punycode warnings.
- [ ] T5.2 Expiry checker page: decode → classify against `redirect-domains.json` → verdicts + "Recreate as forever code". Seed the list with well-known QR redirect services and URL shorteners (agent to research and compile; document sources in the JSON's `_meta`).
- [ ] T5.3 Print page: sticker sheet, table tent, poster, business card (10-up), WiFi card; A4/Letter/A3; exact physical sizing.
- [ ] T5.4 Batch page: CSV upload/paste, column mapping, preview, Web Worker generation, progress, ZIP (PNG/SVG) + optional PDF, per-row error report, example CSVs.
- [ ] T5.5 Saved templates (IndexedDB), opt-in history (last 30), JSON import/export.
- [ ] T5.6 (P2) Shareable design link via URL hash (design only).
**Done when:** each page's acceptance criteria in the PRD pass, including the 500-row batch test.

## Phase 6 — Pages, content & SEO
- [ ] T6.1 Create every route in `05_PAGES_AND_SEO.md` (English + Hindi) using copy from `09_CONTENT_AND_COPY.md`.
- [ ] T6.2 Structured data (WebApplication, HowTo, FAQPage), canonical, hreflang, OG tags, OG images at build.
- [ ] T6.3 Sitemap, robots.txt, 404 page.
- [ ] T6.4 Static-vs-dynamic article page with simple SVG diagram.
- [ ] T6.5 About, Privacy (plain language), FAQ pages.
**Done when:** Lighthouse SEO 100 on all pages; sitemap lists all routes.

## Phase 7 — PWA, performance, accessibility
- [ ] T7.1 PWA manifest, icons, service worker (offline), polite install prompt.
- [ ] T7.2 Lazy-load heavy modules; verify JS budgets; image/font optimisation.
- [ ] T7.3 Accessibility audit (axe in Playwright) — zero serious/critical issues; keyboard-only walkthrough.
- [ ] T7.4 Verify zero third-party network requests (Playwright test that fails on any request to another origin).
**Done when:** Lighthouse ≥ 95 in all categories on `/`, a tool page, batch, scanner.

## Phase 8 — Open-source packaging & release
- [ ] T8.1 Copy templates from `docs/spec/templates/` into repo root and `.github/`; fill placeholders.
- [ ] T8.2 README with screenshots/GIF, features, privacy promise, local dev, deploy, contribute.
- [ ] T8.3 Support links via env vars; `.env.example`.
- [ ] T8.4 Deploy config for Cloudflare Pages and GitHub Pages; security headers file.
- [ ] T8.5 Run full release gate (`07_TESTING_AND_QA.md`). Tag `v1.0.0`, write CHANGELOG.
**Done when:** release gate fully green and site is deployable with one command.

## Final report (agent must produce)
1. Table of every PRD feature with status (✅ done / ⚠️ partial / ❌ not done) and notes.
2. Lighthouse scores per page.
3. Test summary (unit count/coverage, E2E pass/fail per browser).
4. Contents of `docs/DECISIONS.md`.
5. Known issues and suggested next steps.
