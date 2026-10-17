# 08 — Open Source & Launch

## 1. Repository setup
- Public GitHub repo `pakkaqr`. Description: "Free, open-source QR code generator. Codes never expire. No signup, no tracking, runs in your browser."
- Topics: `qr-code`, `qr-code-generator`, `open-source`, `privacy`, `static-site`, `astro`, `upi`, `pwa`.
- Files from `templates/`: README, LICENSE (MIT — fill year and name), CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, issue templates (bug, feature, new QR type, translation), PR template.
- Branch protection on `main`: PR + green CI required.
- Labels: `good first issue`, `help wanted`, `translation`, `new-qr-type`, `bug`, `enhancement`.

## 2. Contributor-friendly design
- Adding a QR type = one encoder file + one form component + JSON entry + tests. Document this in CONTRIBUTING with a worked example.
- Adding a language = copy `en.json` → `<code>.json`, translate, register locale.
- `redirect-domains.json` open for community PRs (with a source link per entry).
- Open 10–15 `good first issue` tickets at launch (new language, new preset, new frame, new social platform).

## 3. Deployment
- Cloudflare Pages (recommended) or GitHub Pages. Build command `npm run build`, output `dist`.
- Custom domain + HTTPS. Security headers via `_headers`.
- Google Search Console + Bing Webmaster: verify domain, submit sitemap (no tracking script needed).

## 4. Monetisation (keeps the promise)
- GitHub Sponsors, Buy Me a Coffee, UPI donate QR (dog-fooding the product).
- Optional "Sponsored by" line in footer later. **No ads at launch**, no popups, ever.

## 5. Launch checklist
- [ ] Release gate green, v1.0.0 tagged.
- [ ] README has a GIF of creating a styled QR in < 10 seconds.
- [ ] Product Hunt listing (tagline: "QR codes that work. Pakka. Free, open source, never expire.").
- [ ] Hacker News "Show HN" post focused on the open-source + static + privacy angle.
- [ ] Reddit: r/opensource, r/selfhosted, r/webdev, r/india, r/IndiaTech, r/smallbusiness, r/Entrepreneur (follow each sub's self-promo rules).
- [ ] LinkedIn + X post with a before/after story: "my menu QR stopped working unless I paid".
- [ ] Submit to AlternativeTo as an alternative to popular QR generators; list on awesome-lists for open-source tools.
- [ ] Short video/Reel: "Your QR code might stop working. Here's how to check." (demo of expiry checker).
