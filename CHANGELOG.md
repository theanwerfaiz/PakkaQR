# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.0.0] — unreleased

First public release candidate. Not tagged yet: the release gate still needs CI on Firefox/WebKit and the manual device tests (see `docs/DEVICE_TESTS.md`).

### Added

- Static QR codes for 16 types: URL, text, WiFi, UPI, WhatsApp, phone, SMS, email, vCard, location, event, social profiles, app download, Google review, MeCard and crypto, each with validation and a "Try an example" button.
- Design: colours, gradients, transparent background, six dot styles, corner styles and colour, logo upload (SVG logos are rasterised for safety) or built-in icons, six frames with labels, quiet zone, error correction and 12 presets.
- Built-in scan test plus contrast, inverted-colour, logo-budget, quiet-zone and density checks, with one-click fixes and a warning before downloading a code that won't scan.
- Export to PNG (256–4096 px), SVG, PDF at a physical size, JPEG and WebP; copy to clipboard; share sheet on mobile.
- Bulk generator: CSV upload or paste, column mapping, preview, Web Worker generation, ZIP of PNG/SVG, optional PDF and an error report.
- Print layouts: sticker sheets, table tents, posters, 10-up business cards and WiFi cards as vector PDFs at exact sizes.
- QR scanner (camera, upload, paste) with type detection and safe link opening.
- "Will my QR code expire?" checker with a sourced list of dynamic-QR and shortener domains, and a "recreate as forever code" flow.
- Saved designs (IndexedDB), opt-in history of the last 30 codes, JSON import/export and shareable style links.
- English and Hindi, light/dark/system theme, offline support and install prompt, one SEO landing page per use case with structured data, sitemap and per-page share images.
