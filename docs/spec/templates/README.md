# PakkaQR

**QR codes that work. Pakka.** Free QR codes that never expire. No signup. No tracking. No watermark. Runs entirely in your browser.

[Live site](https://YOUR-DOMAIN) · [Report a bug](../../issues) · [Request a feature](../../issues)

![Demo GIF](docs/demo.gif)

## Why
Many "free" QR generators create dynamic codes that redirect through their servers — and stop working unless you pay. PakkaQR creates **static** codes: your data lives inside the code itself, so it works forever.

## Features
- 15+ QR types: URL, WiFi, UPI, WhatsApp, vCard, location, event, email, SMS, phone, social profiles and more
- Colors, gradients, dot styles, logos, frames with "Scan me" labels, 12+ presets
- Built-in scan test — know your code works before you print it
- PNG (up to 4096 px), SVG, PDF, JPEG, WebP
- Bulk generation from CSV → ZIP
- Print sticker sheets, posters, table tents, business cards
- QR scanner and "Will my QR expire?" checker
- English + हिन्दी · Dark mode · Works offline (PWA)

## Privacy
Nothing you type or upload ever leaves your device. No cookies, no analytics, no third-party requests. Verify it yourself — the code is right here.

## Run locally
```bash
git clone https://github.com/YOUR-USERNAME/pakkaqr.git
cd pakkaqr
npm install
npm run dev
```
Build: `npm run build` → static files in `dist/`. Test: `npm test` and `npm run test:e2e`.

## Contributing
New QR types, languages, presets and frames are very welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Support
PakkaQR is free forever. If it helped you, ⭐ star the repo or [sponsor the project](YOUR-SPONSOR-LINK).

## License
MIT © YEAR YOUR-NAME

QR Code is a registered trademark of DENSO WAVE INCORPORATED. UPI is a trademark of NPCI. This project is not affiliated with either.
