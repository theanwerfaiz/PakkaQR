# 04 — Design System & UX

## 1. Feel
Clean, calm, trustworthy, fast. Lots of white space. One accent color. The QR preview is the hero. Think "a well-made utility", not a marketing site. No popups, no dark patterns, no fake urgency.

## 2. Tokens (CSS variables)

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#FAFAF9` | `#0F1115` |
| `--surface` | `#FFFFFF` | `#171A21` |
| `--surface-2` | `#F2F2F0` | `#1F232C` |
| `--text` | `#16181D` | `#ECEDEF` |
| `--text-muted` | `#5B6170` | `#A0A6B4` |
| `--border` | `#E4E4E0` | `#2A2F3A` |
| `--accent` | `#1F6FEB` | `#5B9BFF` |
| `--accent-contrast` | `#FFFFFF` | `#0F1115` |
| `--success` | `#1A7F37` | `#3FB950` |
| `--warning` | `#9A6700` | `#D29922` |
| `--danger` | `#CF222E` | `#F85149` |

- Radius: 8 px controls, 14 px cards. Shadow: very soft, cards only.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64.
- Type: one self-hosted variable sans (e.g. Inter or similar OFL font) + Noto Sans Devanagari for Hindi. Base 16 px; headings 1.25 scale. Fallback stacks required.
- All color pairs must meet WCAG AA contrast.

## 3. Layout

### Desktop (≥ 1024 px): two columns
```
┌──────────────────────────────────────────────────────────────┐
│ Logo  PakkaQR     Generator Batch Scanner Expiry-check  EN/हि ☀ │
├──────────────────────────────┬───────────────────────────────┤
│ [URL][WiFi][UPI][WhatsApp]…  │   ┌─────────────────────┐     │
│ ┌──────────────────────────┐ │   │                     │     │
│ │ Form fields              │ │   │     QR PREVIEW      │     │
│ │ [Try an example]         │ │   │   (sticky)          │     │
│ └──────────────────────────┘ │   └─────────────────────┘     │
│ ▸ Presets (thumbnails)       │   ✅ Verified: scans correctly │
│ ▸ Colors   ▸ Shape           │   Size [1024 ▾]  File name    │
│ ▸ Logo     ▸ Frame & label   │   [Download PNG] [SVG] [More▾]│
│ ▸ Advanced (margin, EC)      │   Works forever · No tracking │
└──────────────────────────────┴───────────────────────────────┘
│ Why it never expires · How it works · FAQ · Footer           │
```
### Mobile (< 768 px): single column
Type chips (horizontal scroll) → form → **preview card** → status + download (sticky bottom bar with primary "Download" button) → customize accordions.

## 4. Components
Button (primary/secondary/ghost/danger, sm/md/lg, loading state) · Input/Textarea with label, hint, error · Select · Segmented control · Slider with numeric input · ColorPicker (swatches + hex + native picker) · Accordion · Tabs/Chips · Toast (non-blocking, auto-dismiss, polite live region) · Modal (focus trap, Esc closes) · Dropzone (drag & drop + click, paste support) · StatusChip (great/risky/fail) · ProgressBar · Tooltip (also on focus).

## 5. Key interactions
- Typing updates preview live; no "Generate" button needed (but pressing Enter focuses Download).
- Switching type keeps the design.
- "Try an example" fills realistic sample data per type.
- Download button disabled only when input invalid; if scannability is ❌, clicking shows a modal: "This code may not scan. Fix automatically / Download anyway".
- After first download, a gentle toast: "Saved! This code will work forever." plus optional support link (max once per session).
- Logo upload: drag/drop, paste, or pick; instant preview; remove button.
- Keyboard shortcuts (shown in a help modal, `?`): `Ctrl/Cmd+S` download PNG, `Ctrl/Cmd+Shift+S` download SVG.

## 6. Empty, loading, error states
- Empty: show a faint placeholder QR with "Your QR code will appear here".
- Invalid field: inline message under the field in plain language ("UPI ID should look like name@bank").
- Camera denied: explain how to allow, offer image upload instead.
- Batch errors: list failing rows with reasons; still export the rest.

## 7. Accessibility
- Every input has a visible label. Errors linked via `aria-describedby`.
- Preview image has alt text describing type and destination ("QR code for WiFi network Cafe Guest").
- Status changes announced via `aria-live="polite"`.
- Color pickers usable without a mouse (hex input).
- Respect `prefers-reduced-motion`.

## 8. Presets (minimum 12)
Classic (black/white, square) · Rounded Ink · Ocean (blue gradient, rounded) · Sunset (orange→pink gradient) · Forest (deep green, dots) · Royal (purple, classy) · Mint (teal on mint) · Midnight (white on near-black, flagged as inverted-risk) · Coffee (brown, extra-rounded) · Cherry (red, rounded) · Minimal Dots (black dots) · Gold (dark gold on cream).
Each preset must pass the scan test at default settings.

## 9. Frames (minimum 6)
None · Box with bottom label · Rounded card with bottom label · Top banner label · Speech bubble · Phone outline. Default labels per type: URL "Scan me", WiFi "Scan to join WiFi", UPI "Scan to pay", WhatsApp "Chat with us", vCard "Save my contact", Location "Find us", Event "Add to calendar".
