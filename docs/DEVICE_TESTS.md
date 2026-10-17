# Manual device tests

The release gate (`docs/spec/07_TESTING_AND_QA.md` §2) needs every P0 type scanned on real phones, printed at 3 cm and on screen. These can't be automated, so the owner should fill this in before tagging v1.0.0.

Legend: ✅ works · ⚠️ works with caveats (add a note) · ❌ fails · — not tested

| Type                         | Android: Google Camera / Lens | Android: Samsung Camera | Android: budget phone | iPhone: Camera | Notes                                   |
| ---------------------------- | ----------------------------- | ----------------------- | --------------------- | -------------- | --------------------------------------- |
| URL                          | —                             | —                       | —                     | —              |                                         |
| Text (incl. Hindi)           | —                             | —                       | —                     | —              |                                         |
| WiFi (WPA)                   | —                             | —                       | —                     | —              | Offers to join?                         |
| WiFi (open, hidden)          | —                             | —                       | —                     | —              |                                         |
| WiFi (hex-only SSID, quoted) | —                             | —                       | —                     | —              | Check the quotes aren't taken literally |
| UPI                          | —                             | —                       | —                     | —              |                                         |
| WhatsApp                     | —                             | —                       | —                     | —              |                                         |
| Phone                        | —                             | —                       | —                     | —              |                                         |
| SMS                          | —                             | —                       | —                     | —              |                                         |
| Email                        | —                             | —                       | —                     | —              |                                         |
| vCard                        | —                             | —                       | —                     | —              | "Add contact" shown?                    |
| Event                        | —                             | —                       | —                     | —              | "Add to calendar" shown?                |
| Location (Maps URL)          | —                             | —                       | —                     | —              |                                         |
| Logo at 25% + EC H           | —                             | —                       | —                     | —              |                                         |
| Dots preset (Minimal Dots)   | —                             | —                       | —                     | —              |                                         |
| Inverted (Midnight)          | —                             | —                       | —                     | —              |                                         |

## UPI apps

| App        | Payee name correct | Amount pre-filled | Note shown | Notes |
| ---------- | ------------------ | ----------------- | ---------- | ----- |
| Google Pay | —                  | —                 | —          |       |
| PhonePe    | —                  | —                 | —          |       |
| Paytm      | —                  | —                 | —          |       |

Tested by: owner (Faiz Anwer) · Date: 2026-10-17 · PakkaQR commit: c69f9e0

**Sign-off:** the owner reported the real-device checks done on 2026-10-17 with no failures reported. Individual cells above were not itemised; fill them in on the next device pass (for example after a scanning-related change).
