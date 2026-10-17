# Contributing to PakkaQR

Thanks for helping! Ground rules: no backend, nothing leaves the device, static QR codes only, no tracking. PRs that break these will be declined.

## Setup
`npm install` → `npm run dev`. Before opening a PR: `npm run lint && npm run typecheck && npm test`.

## Add a new QR type (example: "Zoom meeting")
1. `src/lib/payloads/zoom.ts` — implement `PayloadEncoder` (`validate`, `encode`, `example`).
2. `tests/unit/payloads/zoom.test.ts` — cover valid, invalid and escaping cases.
3. `src/components/forms/ZoomForm.tsx` — labelled inputs using i18n keys.
4. Register it in `src/lib/payloads/index.ts` and add strings to `src/i18n/en.json` (and other locales if you can).
5. Optional: add a landing page in `src/pages/`.

## Add a language
Copy `src/i18n/en.json` to `src/i18n/<code>.json`, translate, register the locale in the i18n config, open a PR. Partial translations are fine.

## Add a redirect domain (expiry checker)
Edit `src/data/redirect-domains.json`; include a source link showing the domain is a QR redirect or URL-shortening service.

## Commits & PRs
Conventional commits (`feat:`, `fix:`, `docs:`). Keep PRs focused. Add screenshots for UI changes.
