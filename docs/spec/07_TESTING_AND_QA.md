# 07 — Testing & QA

## 1. Automated

### Unit (Vitest)
- Every payload encoder and validator (cases in `03_QR_PAYLOAD_SPEC.md`).
- Scannability: contrast calculator, logo budget math, quiet-zone and density rules.
- Expiry classifier: static content, known redirect domain, unknown shortener, subdomains, uppercase hosts, punycode.
- Maps-link coordinate extraction (≥ 6 URL patterns).
- Event timezone conversion (incl. India +05:30 and a DST zone).
- CSV mapping and row validation.

### Round-trip (Vitest + node-canvas or Playwright)
- For each type × each preset: render → decode → equals payload.
- With logo at 25% and EC=H → must decode. With logo 40% and EC=L → must be flagged ❌.

### E2E (Playwright: Chromium, Firefox, WebKit + mobile viewport)
- Generate each type via UI, download PNG/SVG, decode the downloaded file, compare.
- Batch: 500-row CSV → ZIP → sample 20 files decode correctly.
- Print: PDF generated; page size and code dimensions correct (inspect PDF metadata/geometry).
- Scanner: upload fixture images → correct text and type.
- Expiry checker: fixtures for each verdict.
- Offline: after first visit, go offline, reload, generate and download still works.
- **No third-party requests:** fail the test if any request goes to an origin other than the site's.
- Accessibility: axe-core scan on every route; zero serious/critical.
- i18n: Hindi route renders Hindi strings, no missing-key placeholders.

## 2. Manual device test matrix (before launch)
Scan every QR type, printed at 3 cm and on screen, with:
- Android: Google Camera / Lens, Samsung Camera, one budget phone camera.
- iPhone: native Camera app.
- UPI: scan the UPI QR in Google Pay, PhonePe and Paytm (use a tiny amount to your own UPI ID or just verify the payee screen).
- WiFi: confirm Android and iPhone offer to join.
- vCard: confirm "Add contact" on both platforms.
- Event: confirm "Add to calendar" appears.
Record results in `docs/DEVICE_TESTS.md`.

## 3. Release gate (all must be true)
- [ ] CI green (lint, typecheck, unit, build, E2E all browsers).
- [ ] Unit coverage ≥ 95% for payloads/validate; ≥ 80% overall `src/lib`.
- [ ] Lighthouse ≥ 95 (Performance, Accessibility, Best Practices, SEO) on `/`, `/wifi-qr-code-generator`, `/bulk-qr-code-generator`, `/qr-code-scanner`.
- [ ] Zero third-party network requests.
- [ ] Zero serious/critical axe issues.
- [ ] Manual device matrix passed for all P0 types.
- [ ] Privacy page and README promises match actual behaviour.
