# Release plan — PakkaQR v1.0.0

**Goal:** a public, tagged v1.0.0 that meets the release gate in `docs/spec/07_TESTING_AND_QA.md`, live on a real domain, then launched.

**State on 2026-10-17:** the code is feature-complete on branch `claude/relaxed-dirac-yjxujt`. Locally: lint, typecheck, 246 unit tests (87% coverage of `src/lib`), the build and 102 Chromium E2E tests all pass, and Lighthouse is ≥ 95 on the four gate pages. **The GitHub repo has no `main` branch yet**, so CI has never run on GitHub.

Owner key: **F** = Faiz (needs your accounts, devices or judgement) · **C** = Claude (can be done in a session) · **F+C** = together.

---

## Stage 1 — Repository and CI (day 1)

| #   | Task                                                                                                                                                                        | Who                                    | Done when                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------ |
| 1.1 | Create `main` from the current branch and make it the default branch (Settings → General → Default branch).                                                                 | F (or C pushes `main`, F sets default) | `main` exists and is the default     |
| 1.2 | Turn on **Actions** if prompted. Repo settings: description and topics from `08_OPEN_SOURCE_AND_LAUNCH.md` §1.                                                              | F                                      | Workflows show under the Actions tab |
| 1.3 | First CI run on `main`: lint, typecheck, coverage, build, Chromium + mobile E2E, then the **Firefox + WebKit** job.                                                         | C                                      | Both CI jobs green                   |
| 1.4 | Fix anything that is red only in Firefox/WebKit (likely areas: canvas `convertToBlob`, `OffscreenCanvas` in workers on WebKit, file downloads).                             | C                                      | Green on all three engines           |
| 1.5 | Branch protection on `main`: require a PR and green **CI** checks. Create the labels `good first issue`, `help wanted`, `translation`, `new-qr-type`, `bug`, `enhancement`. | F                                      | Settings saved                       |
| 1.6 | Turn on **private vulnerability reporting** (Settings → Security). SECURITY.md relies on it.                                                                                | F                                      | Enabled                              |

## Stage 2 — Staging deploy (day 1–2)

| #   | Task                                                                                                                                                                                                                                                                                                  | Who                        | Done when                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------- |
| 2.1 | Decide the domain (check availability and trademarks for "PakkaQR"). Until then use `pakkaqr.pages.dev`.                                                                                                                                                                                              | F                          | Domain chosen                                              |
| 2.2 | **Cloudflare Pages** (recommended): connect the repo; build `npm run build`, output `dist`, env `NODE_VERSION=24`, `PUBLIC_SITE_URL=<domain>`, and optionally `PUBLIC_SPONSOR_URL` / `PUBLIC_UPI_DONATE_ID`. _Or_ GitHub Pages: Settings → Pages → Source: GitHub Actions (workflow already in repo). | F                          | Preview URL loads                                          |
| 2.3 | Smoke test on the live URL: headers from `public/_headers` are sent, the service worker installs, the site works offline, and nothing is requested from another origin (DevTools → Network).                                                                                                          | C (scripted) + F (eyeball) | Checklist below passes                                     |
| 2.4 | Custom domain + HTTPS on the host; set `PUBLIC_SITE_URL` to it and redeploy so canonical/hreflang/sitemap/OG URLs are correct.                                                                                                                                                                        | F                          | `https://<domain>/sitemap-index.xml` lists the real domain |

**Smoke checklist (2.3):** home, a tool page, `/hi`, bulk, scanner, expiry checker, print all load · generate + download PNG/SVG/PDF · camera permission prompt works on HTTPS · install prompt appears on Android Chrome · `robots.txt` and `sitemap-index.xml` are correct · 404 page shows for a bad URL.

## Stage 3 — Real-world verification (day 2–4)

| #   | Task                                                                                                                                                                  | Who | Done when                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------------------------------ |
| 3.1 | **Device matrix** in `docs/DEVICE_TESTS.md`: every P0 type, printed at 3 cm and on screen, on Android (Google Lens, Samsung, a budget phone) and iPhone.              | F   | Table filled, no ❌            |
| 3.2 | **UPI**: scan in Google Pay, PhonePe and Paytm. Check the payee name, the amount (`150.00`) and the note; pay ₹1 to yourself in one app.                              | F   | All three show correct details |
| 3.3 | **WiFi edge cases**: special characters (`;` `:` `"`), an open network, a hidden network, and a hex-only network name (watch whether the quotes are taken literally). | F   | Joins on Android and iPhone    |
| 3.4 | **Print**: print a sticker sheet and a business-card sheet at 100%; measure the codes with a ruler (±1 mm).                                                           | F   | Sizes match                    |
| 3.5 | Fix anything from 3.1–3.4 and add a regression test for each fix.                                                                                                     | C   | Re-test passes                 |

## Stage 4 — Content and polish (parallel with stage 3)

| #   | Task                                                                                                                                               | Who                                       | Done when                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------- |
| 4.1 | **Hindi review** by a native speaker: `src/i18n/hi.json` and `src/i18n/content/hi.json` (the `_meta.reviewed` list marks what's already reviewed). | F finds a reviewer, C applies corrections | Review done; `_meta.todoReview` removed |
| 4.2 | Read the English copy once yourself (tone, claims, FAQ answers).                                                                                   | F                                         | OK'd                                    |
| 4.3 | README: record the demo GIF (making a styled QR in < 10 s) and set the live-site link to the real domain.                                          | C records, F approves                     | Committed                               |
| 4.4 | Optional contact email in SECURITY.md / CODE_OF_CONDUCT.md (currently GitHub-only).                                                                | F decides                                 | —                                       |
| 4.5 | Seed the community: 10–15 `good first issue`s (new language, preset, frame, social platform, redirect-domain entries).                             | C drafts, F approves                      | Issues open                             |

## Stage 5 — Go / no-go and release (day 5)

**Go only if all of these are true** (the release gate in `07_TESTING_AND_QA.md`):

- [ ] CI green on `main`: lint, typecheck, unit, build, E2E in Chromium, Firefox and WebKit
- [ ] Unit coverage ≥ 95% for payloads/validate and ≥ 80% for `src/lib` (currently 100% / 96% / 87%)
- [ ] Lighthouse ≥ 95 in all four categories on `/`, `/wifi-qr-code-generator`, `/bulk-qr-code-generator` and `/qr-code-scanner`, **re-run on the live URL**
- [ ] Zero third-party requests; zero serious/critical axe issues
- [ ] Device matrix passed for all P0 types
- [ ] The Privacy page and README promises match actual behaviour (spot-check the Network tab live)
- [ ] Hindi reviewed

**Release steps (C, after F says go):**

1. Move the CHANGELOG entry from "unreleased" to `1.0.0 — <date>`.
2. Tag `v1.0.0` on `main` and create a GitHub Release with the CHANGELOG notes (no AI attribution, per CLAUDE.md).
3. Confirm the production deploy is built from the tagged commit.
4. Submit the sitemap in Google Search Console and Bing Webmaster Tools (F; verify the domain by DNS, so no tracking script is needed).

**Rollback:** the site is static. On Cloudflare Pages, choose "Rollback" to the previous deployment; on GitHub Pages, re-run the deploy workflow on the previous commit. No data or users to migrate. Returning visitors get the new version when the service worker updates (cache is versioned by content hash).

## Stage 6 — Launch (day 6+)

From `08_OPEN_SOURCE_AND_LAUNCH.md` §5, owned by F (C can draft posts):

- Product Hunt (tagline: "QR codes that work. Pakka. Free, open source, never expire.")
- Show HN, focused on the open-source, static and privacy angle
- Reddit: r/opensource, r/selfhosted, r/webdev, r/india, r/IndiaTech, r/smallbusiness, r/Entrepreneur (follow each sub's self-promo rules)
- LinkedIn and X post with the "my menu QR stopped working unless I paid" story
- AlternativeTo listing and relevant awesome-lists
- Short video: "Your QR code might stop working. Here's how to check." (expiry checker demo)

**First week after launch:** watch GitHub issues daily, triage into labels, patch release (`v1.0.x`) for any scanning bug within 48 h, and add community redirect-domain PRs with their sources.

---

## Timeline at a glance

| Day | Stages                                   |
| --- | ---------------------------------------- |
| 1   | 1 (repo + CI), start 2                   |
| 2   | 2 done (staging live), start 3 and 4     |
| 3–4 | 3 device tests and 4 Hindi review; fixes |
| 5   | Go/no-go, tag v1.0.0, production deploy  |
| 6+  | Launch                                   |

## Risks

| Risk                                                                           | Likelihood | Mitigation                                                                                        |
| ------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------- |
| Firefox/WebKit E2E failures (never run yet)                                    | Medium     | Stage 1.4 before anything else; most likely fixes are test timing or Safari canvas APIs           |
| A phone camera misreads a style the built-in test passes (e.g. dots, inverted) | Low–medium | Device matrix covers Minimal Dots and Midnight; the fallback is a stricter check for those styles |
| UPI app rejects a payload detail                                               | Low        | Format follows the NPCI-style spec; 3.2 tests three apps with a real ₹1 payment                   |
| Hindi reviewer not available quickly                                           | Medium     | Can launch in English first with Hindi marked "beta" — your call                                  |
| Domain/trademark conflict on "PakkaQR"                                         | Unknown    | Check before 2.4; the code doesn't hard-code a domain                                             |
