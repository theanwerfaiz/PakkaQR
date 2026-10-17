# 03 — QR Payload Specification

The encoded string must match these formats exactly, or phones will not recognise the type. Every encoder is a pure function with unit tests for the examples below.

General rules:
- Trim leading/trailing whitespace from every field unless noted.
- Omit optional parameters entirely when empty (no `&am=` with empty value).
- Use `encodeURIComponent` for URL query values.
- Encode as UTF-8 (byte mode) so Hindi and emoji work.

---

## URL
- If no scheme, prefix `https://`. Allow `http://`, `https://`. Reject `javascript:`, `data:`, `file:`.
- Example: input `example.com/menu` → `https://example.com/menu`

## Plain text
- As typed (preserve internal newlines).

## WiFi
Format: `WIFI:T:<auth>;S:<ssid>;P:<password>;H:<true|false>;;`
- `T`: `WPA` (use for WPA/WPA2/WPA3 personal), `WEP`, or `nopass`.
- Omit `P:` when `T:nopass`. Include `H:true` only when hidden; otherwise omit `H`.
- **Escape** these characters in SSID and password with a backslash: `\` `;` `,` `:` `"`.
- If the SSID is exactly hex digits, wrap it in double quotes to prevent misinterpretation.
- Example: SSID `Cafe;Guest`, pass `p:ss"1`, WPA → `WIFI:T:WPA;S:Cafe\;Guest;P:p\:ss\"1;;`
- (Optional P2: WPA2-Enterprise fields `E`, `A`, `I`, `PH2` — skip unless time allows.)

## UPI payment
Format: `upi://pay?pa=<vpa>&pn=<name>[&am=<amount>][&tn=<note>]&cu=INR`
- `pa` (required): UPI ID, validated as `^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$`.
- `pn` (required): payee name, URL-encoded.
- `am` (optional): number with up to 2 decimals, > 0, no currency symbol, no commas.
- `tn` (optional): note, URL-encoded, max 80 chars.
- `cu`: always `INR`.
- Example: `upi://pay?pa=ravi@okaxis&pn=Ravi%20Stores&am=150.00&tn=Order%2012&cu=INR`
- UI disclaimer: "Always check the payee name in your UPI app before paying."

## WhatsApp
Format: `https://wa.me/<number>[?text=<message>]`
- Number: digits only, full international format **without** `+`, spaces, or leading zeros (e.g. `919876543210`).
- Message URL-encoded.
- Example: `https://wa.me/919876543210?text=Hi%2C%20I%20want%20to%20order`

## Phone
Format: `tel:<number>` — E.164 with `+` (e.g. `tel:+919876543210`). Strip spaces, dashes, brackets.

## SMS
Format: `SMSTO:<number>:<message>` (widest scanner support). Message may be empty: `SMSTO:+919876543210:`

## Email
Format: `mailto:<to>[?subject=<s>][&body=<b>]` with URL-encoded subject/body (`%20` for spaces, `%0A` for newlines).
- Example: `mailto:hello@example.com?subject=Order%20query&body=Hi%20there`

## Contact card — vCard 3.0
Lines separated by `\r\n`:
```
BEGIN:VCARD
VERSION:3.0
N:<Last>;<First>;;;
FN:<First Last>
ORG:<Org>
TITLE:<Title>
TEL;TYPE=CELL:<mobile>
TEL;TYPE=WORK:<work>
EMAIL:<email>
URL:<website>
ADR;TYPE=WORK:;;<street>;<city>;<region>;<postcode>;<country>
NOTE:<note>
END:VCARD
```
- Omit any line whose value is empty (keep `N` and `FN`; at least first or last name required).
- Escape `\` `,` `;` with a backslash and newlines as `\n` inside values.
- Keep vCard compact — warn if > 400 characters (dense code).

## MeCard (P2)
`MECARD:N:<Last>,<First>;TEL:<tel>;EMAIL:<email>;URL:<url>;ADR:<adr>;NOTE:<note>;;` — escape `\` `;` `,` `:` `"`.

## Location
- Option A (default): `geo:<lat>,<lng>` — lat −90..90, lng −180..180, max 6 decimals.
- Option B: Google Maps URL `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>` (better on iPhones).
- "Paste a Google Maps link" field: extract coordinates from common patterns (`@lat,lng`, `q=lat,lng`, `query=lat,lng`, `/place/.../@lat,lng`). If none found (e.g. shortened `maps.app.goo.gl` link), encode the pasted URL as a URL QR and explain.
- Default UI choice: Google Maps URL (works on more phones); `geo:` available as an option.

## Calendar event
Format (iCalendar VEVENT):
```
BEGIN:VEVENT
SUMMARY:<title>
DTSTART:<YYYYMMDDTHHMMSSZ>
DTEND:<YYYYMMDDTHHMMSSZ>
LOCATION:<location>
DESCRIPTION:<description>
END:VEVENT
```
- Convert local time + selected timezone to UTC (`Z`). All-day: `DTSTART;VALUE=DATE:YYYYMMDD` and `DTEND;VALUE=DATE:<next day>`.
- Escape `\` `,` `;` and newlines (`\n`).

## Social profiles
Build profile URLs from a username using `src/data/social-platforms.json`:

| Platform | Template |
|---|---|
| Instagram | `https://instagram.com/{u}` |
| Facebook | `https://facebook.com/{u}` |
| X | `https://x.com/{u}` |
| LinkedIn | `https://linkedin.com/in/{u}` (company: `/company/{u}`) |
| YouTube | `https://youtube.com/@{u}` |
| Telegram | `https://t.me/{u}` |
| Snapchat | `https://snapchat.com/add/{u}` |
| TikTok | `https://tiktok.com/@{u}` |
| Threads | `https://threads.net/@{u}` |
| GitHub | `https://github.com/{u}` |

Strip a leading `@` and any pasted full URL down to the username.

## App store / Google review
Encode the pasted URL as a URL QR (validate host: `play.google.com`, `apps.apple.com`, `g.page`, `search.google.com`, `maps.app.goo.gl` accepted; others allowed with a soft warning).

## Crypto (P2)
- Bitcoin: `bitcoin:<address>[?amount=<btc>]`
- Ethereum: `ethereum:<address>[@<chainId>][?value=<wei>]`

---

## Required unit test cases (minimum)

- WiFi escaping of each special character; `nopass` omits `P`; hidden flag; hex-only SSID quoting.
- UPI: invalid VPA rejected; amount `150` → `150.00` allowed as `150` or `150.00` (pick one, be consistent); empty optional fields omitted; Hindi payee name encodes.
- WhatsApp: `+91 98765-43210` → `919876543210`.
- vCard: empty lines omitted; comma/semicolon escaping; CRLF line endings.
- Event: timezone → UTC conversion; all-day dates.
- URL: scheme added; `javascript:` rejected.
- Social: `@user`, `user`, and full pasted URL all produce the same output.
