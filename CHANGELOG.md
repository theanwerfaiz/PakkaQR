# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.0.0] — unreleased

First public release candidate. Not tagged yet: the release gate still needs CI on Firefox/WebKit and the manual device tests (see `docs/DEVICE_TESTS.md`).

### Added

- Premium polish: softer surfaces, custom switches/sliders/dropdowns, a sticky header with a Tools menu and Ctrl/⌘ K search, real-look previews (table tent, phone, sticker), a feature grid on the home page and smooth page transitions.
- New tools: barcode generator (EAN-13, UPC-A, EAN-8, Code 128, scan-tested, bulk ZIP), template gallery (12 designs), password-locked secret notes with an "open a note" page, photo QR codes, numbered series in the bulk tool, opt-in scan history, and "share into PakkaQR" on Android.
- "Ink & Stamp" redesign: paper/ink palette with one stamp colour, Anek Latin + Anek Devanagari and JetBrains Mono (self-hosted), and a rubber-stamp status (PAKKA / RISKY / DOES NOT SCAN) instead of emoji.
- Paste-anything box that detects the QR type and fills the form; one-tap starters (link in bio, pay me, split the bill, guest WiFi, playlist, party invite, business card, reviews).
- Split the bill for UPI codes, "What's inside the code" box with copy and read-aloud, and a scan-with-your-phone check after downloading.
- Share studio: story (9:16), post (4:5) and square cards in four looks, plus a 4-second animated video, made on the device.
- Shuffle (always-scannable random styles with locks), match colours from a photo, six new presets (Ledger, Neel, Mitti, Tulsi, Raat, Jamun) and three new frames (pill, ticket, round sticker).
- Personalise panel: theme, stamp colour, Big & clear text size, less motion and vibration; festival stamps on a few special days; shareable expiry-check cards.
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
