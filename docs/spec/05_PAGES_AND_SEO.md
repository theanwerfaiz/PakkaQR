# 05 — Pages, Routes & SEO

Each tool page is a pre-rendered HTML page with unique title, description, H1, intro copy, the shared generator island (preset to that type), a short how-to, and a type-specific FAQ. This is how the site earns search traffic: one page per thing people search for.

## 1. Routes

| Route | H1 | Title tag (≤ 60 chars) |
|---|---|---|
| `/` | Free QR Code Generator — Codes That Never Expire | Free QR Code Generator That Never Expires · PakkaQR |
| `/url-qr-code-generator` | Website / URL QR Code Generator | Free URL QR Code Generator (No Expiry) |
| `/wifi-qr-code-generator` | WiFi QR Code Generator | Free WiFi QR Code Generator · Scan to Connect |
| `/upi-qr-code-generator` | UPI Payment QR Code Generator | Free UPI QR Code Generator with Amount |
| `/whatsapp-qr-code-generator` | WhatsApp QR Code Generator | Free WhatsApp QR Code Generator |
| `/vcard-qr-code-generator` | Contact Card (vCard) QR Code Generator | Free vCard QR Code for Business Cards |
| `/text-qr-code-generator` | Text QR Code Generator | Free Text QR Code Generator |
| `/email-qr-code-generator` | Email QR Code Generator | Free Email QR Code Generator |
| `/sms-qr-code-generator` | SMS QR Code Generator | Free SMS QR Code Generator |
| `/phone-qr-code-generator` | Phone Call QR Code Generator | Free Phone Number QR Code Generator |
| `/location-qr-code-generator` | Location / Google Maps QR Code Generator | Free Google Maps Location QR Code |
| `/event-qr-code-generator` | Calendar Event QR Code Generator | Free Event QR Code Generator |
| `/instagram-qr-code-generator` (+ youtube, facebook, linkedin, telegram) | Instagram QR Code Generator | Free Instagram QR Code Generator |
| `/google-review-qr-code-generator` | Google Review QR Code Generator | Free Google Review QR Code |
| `/app-store-qr-code-generator` | App Download QR Code Generator | Free App Store / Play Store QR Code |
| `/qr-code-with-logo` | QR Code Generator with Logo | Free QR Code with Logo (No Watermark) |
| `/bulk-qr-code-generator` | Bulk QR Code Generator (CSV) | Free Bulk QR Code Generator from CSV |
| `/qr-code-scanner` | Scan a QR Code from Image or Camera | Free Online QR Code Scanner |
| `/qr-code-expiry-checker` | Will My QR Code Expire? | QR Code Expiry Checker · Is My QR Dynamic? |
| `/print` | Print QR Stickers, Posters & Table Tents | Print QR Code Stickers & Posters Free |
| `/restaurant-menu-qr-code` | QR Code for Restaurant Menu | Free Restaurant Menu QR Code (Never Expires) |
| `/wedding-qr-code` | QR Codes for Weddings & Events | Free Wedding QR Codes · Location, RSVP, Photos |
| `/static-vs-dynamic-qr-codes` | Static vs Dynamic QR Codes Explained | Static vs Dynamic QR Codes: Which Never Expire? |
| `/about`, `/privacy`, `/faq`, `/404` | — | — |
| `/hi/...` | Hindi versions of all tool pages | Hindi titles |

Use-case pages (`restaurant`, `wedding`) reuse the generator with sensible defaults + use-case copy.

## 2. Per-page requirements
- Unique `<title>` and `<meta name="description">` (≤ 155 chars).
- One H1. Intro paragraph (60–120 words) with the main keyword naturally.
- "How to create a ___ QR code" — 3–4 steps (also as HowTo structured data).
- Type-specific FAQ (4–6 Q&A) + FAQPage structured data.
- Canonical URL, `hreflang` pairs (en/hi + x-default).
- Open Graph + Twitter card tags; per-page OG image (pre-generated at build, 1200×630).
- Internal links: related generators (3–6), static-vs-dynamic article, expiry checker.
- Structured data on `/`: `WebApplication` (applicationCategory `UtilitiesApplication`, `offers.price` 0, `isAccessibleForFree` true).

## 3. Technical SEO
- `sitemap.xml` (Astro sitemap integration) including Hindi URLs; `robots.txt` pointing to it.
- Clean URLs, trailing-slash policy consistent.
- No client-only rendering of indexable text — all copy in the HTML.
- Lighthouse SEO = 100 on every page.
