# Launch kit

Drafts for the v1.0.0 launch. Edit freely before posting. Live site: https://theanwerfaiz.github.io/PakkaQR/ (swap in the custom domain if you get one).

## Good first issues

Ready to open on GitHub. Each has a clear scope, the files to touch and how to test. Suggested labels in brackets.

1. **Add a Tamil translation** `[translation, good first issue]` — Copy `src/i18n/en.json` and `src/i18n/content/en.json` to `ta.json`, translate, and register `ta` in `src/lib/i18n/index.ts` (`locales`, `localeInfo`). The i18n unit test checks every key exists. Native speakers only, please.
2. **Add a Bengali translation** `[translation, good first issue]` — Same steps as above with `bn`.
3. **New preset: "Haldi" (turmeric yellow)** `[good first issue]` — Add a dark-enough yellow/brown ink on a light background to `src/data/presets.json`, plus `preset.haldi` in both UI dictionaries. The round-trip test fails if it doesn't scan.
4. **New frame: "Polaroid"** `[enhancement, good first issue]` — A white frame with a thick bottom border for the label. Add a case in `layoutFrame()` (`src/lib/render/geometry.ts`), the id to `frameIds` and `src/data/frames.json`, an icon path in `FramePicker.tsx`, and `frame.polaroid` strings. Covered by the frame round-trip test.
5. **Social platform: Pinterest** `[new-qr-type, good first issue]` — Add an entry to `src/data/social-platforms.json` with the profile URL template and hosts. Add a unit test in `tests/unit/payloads/cards.test.ts`.
6. **Social platform: Behance / Dribbble** `[new-qr-type, good first issue]` — As above, one platform per PR.
7. **Add a dynamic-QR domain** `[good first issue]` — Know a QR service whose codes stop working? Add it to `src/data/redirect-domains.json` with a `source` link that shows what the domain is.
8. **Starter: "Wedding RSVP"** `[enhancement, good first issue]` — Add a starter to `STARTERS` in `src/components/generator/Starters.tsx` (event type, ticket frame) and the `starter.rsvp` strings.
9. **Festival dates for 2029** `[good first issue]` — Add Diwali, Holi and Eid 2029 to `src/lib/smart/festival.ts` with a source link in the PR, and a test case.
10. **Smart paste: recognise Spotify and YouTube links** `[enhancement, good first issue]` — In `src/lib/smart/detect.ts`, show a friendlier message for `open.spotify.com` and `youtu.be` links (still the URL type). Add cases to `tests/unit/smart/detect.test.ts`.
11. **Share card look: "Newsprint"** `[enhancement]` — A fifth theme in `src/lib/export/card.ts` (`cardThemes` + `cardColors`). The card test checks every look still scans.
12. **Keyboard shortcut for Shuffle** `[enhancement, good first issue]` — Press `R` (when not typing) to shuffle the style. See the existing shortcuts in `Generator.tsx` and add it to the shortcuts dialog.

## Product Hunt

**Name:** PakkaQR
**Tagline (60):** QR codes that work. Pakka. Free, open source, never expire.
**Description:**
Most "free" QR generators give you a code that runs through their server — and switch it off when your trial ends. PakkaQR makes static QR codes: your link, UPI ID or WiFi password lives inside the code, so it works forever.

- Paste anything: it recognises links, UPI IDs, phone numbers and WiFi details
- Every code is scan-tested in your browser before you download
- Story cards and a short video for Instagram and WhatsApp
- Split-the-bill UPI codes, bulk from CSV, print-ready sticker sheets
- No signup, no tracking, no watermark — nothing leaves your device
- English and हिन्दी, open source (MIT)

**First comment (maker):**
I built PakkaQR after seeing a restaurant's printed menus stop working because their "free" QR site's trial ended. Everything runs in the browser: there's no backend at all, so there's nothing to switch off — and nothing collecting your data. I'd love feedback on what you make with it, and which QR types or languages you want next.

## Show HN

**Title:** Show HN: PakkaQR – static QR codes that never expire, built with no backend

**Text:**
Many QR generators create "dynamic" codes: the pattern holds the vendor's short link, which redirects to yours until the trial ends. PakkaQR only makes static codes — the data is in the pattern.

Some details that might interest HN:

- 100% static site (Astro + React islands). No server, no analytics, strict CSP, fonts self-hosted.
- Every design change is rendered and decoded in the browser (jsQR, ZXing fallback) before you can download, with fixes for low contrast, big logos and quiet zones.
- An "expiry checker" decodes a photo of any QR code and matches the host against a sourced list of dynamic-QR and shortener domains — without ever opening the link.
- Share cards and a short video are drawn on canvas and recorded with MediaRecorder; no encoder library.
- Bulk generation from CSV in a Web Worker, vector PDFs for print at exact sizes.

Code (MIT): https://github.com/theanwerfaiz/PakkaQR — happy to answer questions.

## Reddit

**r/india / r/IndiaTech** (check each sub's self-promotion rules first)
**Title:** I made a free QR code maker that never expires — UPI, WiFi, split-the-bill, works in Hindi, no signup

Body: Many "free" QR sites quietly expire your code after a trial — restaurants and small shops find out when customers can't scan the menu. I built PakkaQR so that doesn't happen: the code holds your UPI ID or link itself, nothing goes through a server. You can paste a UPI ID and get a "Scan to pay" sticker in seconds, split a bill between friends, or check if an existing QR code is "rented". It's open source and free. Feedback welcome, especially on the Hindi.

**r/opensource / r/webdev**
**Title:** PakkaQR — open-source QR generator with zero backend, in-browser scan test, MIT

Body: lead with the static-site architecture, the in-browser decode test and the CSP; link the repo first and the site second.

**r/smallbusiness**
**Title:** PSA: check whether your printed QR codes will stop working (free tool)

Body: explain dynamic vs static in two sentences, link the expiry checker page, mention it never opens the link.

## LinkedIn

A restaurant near me printed 200 menus with a QR code from a "free" website. Three weeks later the trial ended and every menu stopped working.

That's why I built PakkaQR — a free, open-source QR generator where the code holds your link itself. No middleman server, so nothing can switch it off.

✔ Scan-tested before you download ✔ UPI, WiFi, WhatsApp and 13 more types ✔ No signup, no tracking, no watermark ✔ English and Hindi

Check if your existing QR codes are "rented": [expiry checker link]
Make one that's yours: [site link]

## X / Twitter

My menu QR code stopped working unless I paid.

So I built PakkaQR: free QR codes that never expire. Your link lives inside the code — no server, no signup, no tracking.

Paste a UPI ID → get a "Scan to pay" sticker in 10 seconds. Open source. 🇮🇳 English + हिन्दी

[site link]

## Short video script (30–45 s)

1. (0–5 s) A phone scans a printed menu QR → "This QR code is no longer active. Upgrade to continue."
2. (5–12 s) Text: "Your QR code might be rented." Open the expiry checker, upload a photo → stamp lands: RENTED.
3. (12–25 s) "Make one that's yours." Paste the real menu link → PAKKA stamp → Shuffle → Download.
4. (25–35 s) Story card → share to WhatsApp status.
5. (35–40 s) End card: "PakkaQR — free, open source, never expires."
