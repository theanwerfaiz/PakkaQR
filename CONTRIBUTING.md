# Contributing to PakkaQR

Thanks for helping! Ground rules: **no backend, nothing leaves the device, static QR codes only, no tracking.** PRs that break these will be declined.

## Setup

`npm install` → `npm run dev`. Before opening a PR run `npm run lint && npm run typecheck && npm test`. For UI changes also run `npm run build && npm run test:e2e`.

## Add a new QR type (example: "Zoom meeting")

1. **Encoder:** `src/lib/payloads/zoom.ts` exports a `PayloadEncoder` with `defaults`, `validate`, `encode` and a realistic `example`. Keep `encode` pure. Error and warning values are i18n keys (`errors.zoom.id`).
2. **Register it:** add `'zoom'` to `qrTypes` in `src/lib/payloads/types.ts` and to `encoders` in `src/lib/payloads/index.ts`.
3. **Form:** add a field list to `formSchemas` in `src/components/forms/fields.ts` (one entry per field: `kind`, `required`, `half`, `showIf`…). The shared `ContentForm` renders it with labels, hints and accessible errors.
4. **Strings:** add `type.zoom`, `field.zoom.*`, optional `hint.zoom.*` / `placeholder.zoom.*` and `frame.defaultLabel.zoom` to `src/i18n/en.json` and `src/i18n/hi.json`. The i18n test fails if a key is missing.
5. **Tests:** `tests/unit/payloads/zoom.test.ts` covering valid, invalid and escaping cases. The round-trip test picks up the new type and its example automatically.
6. Optional: a landing page — add an entry to `src/data/pages.ts` and its copy to `src/i18n/content/*.json`.

## Add a language

Copy `src/i18n/en.json` to `src/i18n/<code>.json` and `src/i18n/content/en.json` to `src/i18n/content/<code>.json`, then translate. Register the locale in `src/lib/i18n/index.ts` (`locales`, `localeInfo` — set `dir: 'rtl'` for Arabic or Urdu), `src/lib/i18n/content.ts` and the sitemap `i18n` option in `astro.config.mjs`. Partial translations are fine: missing keys fall back to English.

## Add a redirect domain (expiry checker)

Edit `src/data/redirect-domains.json`. Add `domain`, `category` (`dynamic-qr` or `shortener`), `service`, and a `source` link showing what the domain is.

## Presets and frames

Presets live in `src/data/presets.json`; every preset must pass the scan test (the round-trip test checks this). Frame geometry is in `layoutFrame()` in `src/lib/render/geometry.ts`.

## Commits & PRs

Conventional commits (`feat:`, `fix:`, `docs:`). Keep PRs focused. Add screenshots for UI changes.
