# 01 — Product Requirements (PRD)

## 1. Problem

Many "free" QR generators create **dynamic** codes: the printed pattern holds a short link to the vendor's server, which redirects to the real destination. After a trial period the vendor disables the redirect unless the user pays, and every printed menu, poster, business card and wedding invite silently breaks. Users also hit forced signups, watermarks, low-resolution downloads and download limits.

## 2. Solution

A fast, beautiful, fully client-side QR generator that creates **static** codes (data stored in the pattern itself), so they work forever. Free, open source, no account, no tracking, no watermark, no limits.

## 3. Target users

| Persona | Need |
|---|---|
| Small shop owner | UPI payment QR, WhatsApp order QR, printable poster |
| Restaurant / cafe | Menu link QR, WiFi QR, table tents |
| Event organiser / wedding family | Location, event, RSVP link QRs, printed in bulk |
| Freelancer / professional | Contact card (vCard) QR for business cards |
| Teacher / student | Links to forms, docs, videos |
| Marketer / designer | Branded QR with logo/colors, SVG for print, batch export |
| Anyone with an old QR | "Will my existing QR code expire?" checker |

## 4. Product principles

1. Works forever (static codes only).
2. Private by design (nothing leaves the device).
3. Done in 10 seconds (sensible defaults, live preview, one-click download).
4. Beautiful by default (good presets so even non-designers get a nice result).
5. Honest (explain trade-offs, e.g. static codes cannot be edited after printing).

## 5. Features and acceptance criteria

Priority: **P0** = must ship, **P1** = should ship, **P2** = nice to have. The goal is to ship all P0 and P1 in one go; P2 if time allows.

### F1. Generator core — P0
- Single generator workspace: **type selector → input form → live preview → customize → download**.
- Preview updates within 150 ms of input change (debounced) without layout jumps.
- Empty/invalid input shows a friendly inline message, not a broken QR.
- Shows current payload length and a warning when data gets long enough to produce a very dense code (> 300 characters) with advice ("shorten the link" / "remove optional fields").
- **AC:** For each QR type, entering valid sample data produces a preview that decodes (via the scan test, F6) to exactly the expected payload string.

### F2. QR types — P0 unless marked
Each type has its own form, validation, sample "Try an example" button, and payload encoder per `03_QR_PAYLOAD_SPEC.md`.

| Type | Priority | Notes |
|---|---|---|
| URL / Website | P0 | Auto-prefix `https://` if missing scheme; validate |
| Plain text | P0 | Multi-line |
| WiFi | P0 | SSID, password, security (WPA/WPA2/WPA3, WEP, none), hidden network toggle |
| UPI payment | P0 | UPI ID, payee name, optional amount, optional note; currency INR |
| WhatsApp | P0 | Country code picker + number, optional pre-filled message |
| Phone call | P0 | International format |
| SMS | P0 | Number + optional message |
| Email | P0 | To, optional subject, optional body |
| Contact card (vCard 3.0) | P0 | Name, org, title, phones, email, website, address, note |
| Location | P1 | Lat/long inputs **or** paste a Google Maps link; option to encode as `geo:` or maps URL |
| Calendar event | P1 | Title, start/end (with timezone), all-day toggle, location, description |
| Social profiles | P1 | Presets that build URLs: Instagram, Facebook, X, LinkedIn, YouTube, Telegram, Snapchat, TikTok, Threads, GitHub |
| App store link | P1 | Separate fields for Play Store and App Store URL (encodes one chosen link) |
| Google review link | P1 | Paste a review URL; helper text explains where to get it |
| MeCard | P2 | Compact contact alternative |
| Crypto address | P2 | BTC / ETH URI formats |

- **AC:** Every P0/P1 type has unit tests for its encoder (including special-character escaping) and an E2E test that generates, decodes, and compares.

### F3. Design customization — P0
- Foreground color and background color (color picker + hex input).
- Optional **gradient** foreground (linear/radial, 2 colors, angle) — P1.
- Transparent background toggle (PNG/SVG only).
- Dot style: square, rounded, dots, classy, classy-rounded, extra-rounded.
- Corner square style: square, dot, extra-rounded. Corner dot style: square, dot. Separate corner color — P1.
- Logo: upload PNG/JPG/SVG/WebP, size slider (10–30% of code width), margin around logo, "hide dots behind logo" toggle. Built-in logo icons for WhatsApp, WiFi, UPI, Instagram, phone, email, location — P1 (use original simple icons or permissively licensed icon sets; **do not** embed third-party brand logos whose trademark rules forbid it — use generic glyphs instead).
- Quiet zone (margin) slider; default 4 modules.
- Error correction: Auto (default; H when logo present, otherwise M), L, M, Q, H.
- **Style presets** (P0): at least 12 ready-made designs (Classic, Rounded Blue, Dark Mode, Sunset Gradient, Mint, Royal, etc.) shown as clickable thumbnails.
- **Frames with call-to-action** (P1): at least 6 frame styles (none, simple box, rounded box with bottom label, banner top, speech bubble, phone outline) with editable label ("Scan me", "Scan to pay", "Menu", "WiFi") and label color/font.
- Reset to defaults button.
- **AC:** All combinations of presets + logo at max size + frame still pass the scan test, or the UI blocks/warns before download.

### F4. Export — P0
- PNG at selectable sizes: 256, 512, 1024, 2048, 4096 px (default 1024).
- SVG (vector, true paths, logo embedded as data URI).
- PDF (single code, chosen physical size in mm/inches) — P1.
- JPEG and WebP — P1.
- Copy image to clipboard — P1.
- Native share sheet on mobile (Web Share API with file) — P1.
- File name defaults to `pakkaqr-<type>-<yyyymmdd>.<ext>`, editable.
- No watermark. No resolution cap.
- **AC:** Exported PNG and SVG both decode correctly; SVG opens in Inkscape/Illustrator/browser and stays sharp when scaled to A0.

### F5. Scannability checker — P0
Runs automatically on every change; shows a status chip: ✅ Great / ⚠️ Risky / ❌ Won't scan.
Checks:
1. **Contrast** between foreground and background (WCAG contrast ratio; warn < 4.5, fail < 2.5). Warn on inverted codes (light on dark) — some scanners struggle.
2. **Logo coverage** vs error-correction capacity (warn when logo area > 70% of the EC budget).
3. **Quiet zone** too small (< 2 modules: fail; < 4: warn).
4. **Density** (QR version > 15: warn for print under 3 cm).
5. **Actual decode test** (F6).
Each warning has a one-line fix and a "Fix it" button where possible (e.g. raise error correction to H, increase margin).

### F6. Built-in scan test — P0
- Render the current code to an offscreen canvas and decode with a QR decoder (jsQR or ZXing). Compare decoded text to the intended payload.
- Show "Verified: scans correctly" only when they match exactly.
- **AC:** A deliberately broken design (e.g. logo at 40% with EC level L) shows ❌.

### F7. Print layouts — P1
Generate a print-ready PDF:
- **Sticker sheet** (A4 / Letter): choose code size (2–10 cm) and gap; fills the page.
- **Table tent** (A4 folded): code + headline + small text on both halves.
- **Poster** (A4 / A3): big code, headline, subtext, optional "Scan to pay / Menu / WiFi" template text.
- **Business card** (85×55 mm and 3.5×2 in): code + name/title lines, 10-up sheet.
- **WiFi card**: network name + password printed in text beside the code.
- **AC:** Printed at 100% scale, physical size matches chosen size ±1 mm.

### F8. Batch generator — P1
- Upload CSV (or paste rows). Columns map to fields of the chosen type (e.g. `url,filename` or vCard fields). Column-mapping UI with preview of first 5 rows.
- Applies the current design to all rows.
- Output: ZIP of PNGs and/or SVGs, plus optional single multi-page PDF.
- Shows progress; runs in a Web Worker so the UI stays responsive.
- Up to 1,000 rows without crashing on a mid-range phone (warn above that).
- Downloadable example CSV per type.
- **AC:** 500-row CSV completes and every file in the ZIP decodes to its row's payload (test samples 20 random files).

### F9. QR reader / scanner — P1
- Decode from: camera (getUserMedia), uploaded image, or pasted image (clipboard).
- Shows decoded content, detected type (URL, WiFi, UPI, vCard…), and safe actions (copy, open link **only after confirmation showing the full URL**).
- Camera stream never leaves the device.

### F10. "Will my QR code expire?" checker — P0 (signature feature)
- User uploads/scans an existing QR code.
- Decode it. If the content is a URL, compare its hostname against a bundled list of known dynamic-QR / redirect / URL-shortener domains (`src/data/redirect-domains.json`, community-maintainable).
- Result states:
  - **Static & safe** — data is stored directly (WiFi, text, vCard, UPI, or a URL pointing at a normal website).
  - **Likely dynamic — may expire** — URL goes through a known QR redirect service. Explain the risk and offer "Recreate as a forever code" (prefills generator — note we cannot know the final destination without visiting it; ask the user to paste the real destination URL).
  - **Unknown short link** — explain uncertainty honestly.
- Never makes a network request to resolve the link (privacy rule). Explain that in the UI.
- **AC:** Test images for each state produce the correct verdict.

### F11. Saved designs & history — P1
- Save current design (style only, or style + content) as a named template in IndexedDB/localStorage.
- Recent codes history (last 30), with "clear all" — **off by default**, opt-in toggle, clearly labelled "stored only on this device".
- Export/import templates as a JSON file.

### F12. Shareable design links — P2
- Encode the **design settings only** (no content) into the URL hash so users can share a style. Content is never put in the URL.

### F13. Internationalisation — P0
- English (default) and Hindi at launch. Language switcher in the header; remember choice locally.
- All strings in `src/i18n/<locale>.json`. Hindi strings provided in `09_CONTENT_AND_COPY.md` (agent fills any missing ones and marks them `// TODO review` for a native speaker).
- Structure supports RTL for future Arabic/Urdu.

### F14. PWA / offline — P1
- Installable, works fully offline after first load (service worker caches all assets).
- "Install app" prompt shown politely once, dismissible.

### F15. Theme & accessibility — P0
- Light / dark / system theme.
- WCAG 2.2 AA, full keyboard use, visible focus, screen-reader labels, reduced-motion support.
- Minimum tap target 44×44 px. Works at 320 px wide.

### F16. Trust & education — P0
- "Why PakkaQR codes never expire" section with a simple diagram (static vs dynamic).
- Privacy statement in plain language; link to source code.
- Honest note: static codes cannot be edited after printing — "If you need to change the destination later, point the QR at a page you control (e.g. your own website) and update that page instead."
- FAQ (see `09_CONTENT_AND_COPY.md`).
- Trademark notice in footer: "QR Code is a registered trademark of DENSO WAVE INCORPORATED." and "UPI is a trademark of NPCI. PakkaQR is not affiliated with NPCI."

### F17. Support / donations — P1
- Footer + post-download toast: "PakkaQR is free forever. If it helped, star us on GitHub or buy us a coffee." Links configured via env vars (`PUBLIC_GITHUB_URL`, `PUBLIC_SPONSOR_URL`, `PUBLIC_UPI_DONATE_ID`).
- Toast appears at most once per session, never blocks the download.

## 6. Out of scope (deliberately)

- Dynamic/editable QR codes, scan analytics, user accounts, cloud storage, URL shortening, paid tiers.
- Resolving/visiting links on the user's behalf.

## 7. Success metrics (measured without tracking users)

- GitHub stars, forks, contributors.
- Search Console impressions/clicks (site-level, no user tracking).
- Lighthouse ≥ 95 in all four categories on every page.
