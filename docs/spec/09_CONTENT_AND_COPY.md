# 09 — Content & Copy

Tone: friendly, plain, confident, honest. Short sentences. No hype words like "revolutionary".

## Home hero
- **H1:** Free QR codes that never expire. Pakka.
- **Brand tagline (header, OG images, social):** QR codes that work. Pakka.
- **Sub:** No signup. No tracking. No watermark. Your code is made right here in your browser — and it works forever.
- **Trust row:** ✓ Works forever ✓ 100% free ✓ Nothing leaves your device ✓ Open source

## Why it never expires (section)
**Title:** Why PakkaQR codes never stop working
Many free QR sites quietly create "dynamic" codes. The pattern you print doesn't contain your link — it contains *their* short link, which redirects to yours. When the free trial ends, they switch that redirect off and your printed menus, cards and posters stop working until you pay.
PakkaQR makes **static** codes. Your link, WiFi password or contact details are stored inside the pattern itself. There is no middleman server, so there is nothing to switch off.
**One honest trade-off:** a static code can't be edited after printing. Tip: if you might change the destination later, point the code to a page you control and update that page instead.

## How it works
1. Choose what your QR should do.
2. Type your details — the code appears instantly.
3. Style it (optional) and download. Done.

## Status messages
- great: "Verified — this code scans correctly."
- risky: "This code might be hard to scan. {reason}"
- fail: "This code probably won't scan. {reason}"
- reasons: "Colors are too similar." · "Light code on dark background — some cameras struggle." · "Logo is too big." · "Add more white space around the code." · "Too much data for a small print — shorten it."

## Home FAQ
1. **Do these QR codes really never expire?** Yes. The data is stored inside the code itself. Nothing depends on our website — even if PakkaQR disappeared, your code would keep working.
2. **Is it really free?** Yes, completely. No trial, no limits, no watermark, no signup.
3. **Do you see or store what I type?** No. Everything happens in your browser. Nothing is uploaded. You can check the open-source code.
4. **Can I edit a code after printing?** No — that's the trade-off of a code that never expires. Point it to a page you control if you need flexibility.
5. **Can I track how many people scanned it?** Not with a static code. Tracking requires a redirect server, which is exactly what makes other codes expire.
6. **Can I use the codes commercially?** Yes, for anything. No attribution needed.
7. **How do I check if my existing QR code will expire?** Use our free expiry checker — upload a photo of the code.
8. **Which format should I download for printing?** SVG for printing at any size; PNG at 2048 px or more is also fine.

## Type-specific intros (examples; agent writes the rest in the same style)
- **WiFi:** Let guests join your WiFi by scanning — no more spelling out passwords. Perfect for homes, cafes, offices and Airbnbs.
- **UPI:** Create a UPI QR to receive payments in any UPI app. Add a fixed amount for invoices or leave it open for customers to enter.
- **WhatsApp:** Customers scan and land straight in a chat with you, with an optional message already typed.
- **vCard:** Put your contact details on a business card. One scan and your number, email and website are saved.

## Footer
"PakkaQR is free and open source. Made for everyone who's tired of QR codes that stop working."
"QR Code is a registered trademark of DENSO WAVE INCORPORATED. UPI is a trademark of NPCI. PakkaQR is not affiliated with either."

## Hindi starter strings (`hi.json`)
Agent: use these, translate remaining strings, and tag new ones `// TODO review` for a native speaker.

| key | English | Hindi |
|---|---|---|
| hero.title | Free QR codes that never expire. Pakka. | मुफ़्त QR कोड जो कभी एक्सपायर नहीं होते। पक्का। |
| brand.tagline | QR codes that work. Pakka. | QR कोड जो चलते हैं। पक्का। |
| hero.sub | No signup. No tracking. No watermark. | न साइनअप, न ट्रैकिंग, न वॉटरमार्क। |
| trust.forever | Works forever | हमेशा काम करता है |
| trust.free | 100% free | 100% मुफ़्त |
| trust.private | Nothing leaves your device | आपका डेटा आपके डिवाइस से बाहर नहीं जाता |
| trust.opensource | Open source | ओपन सोर्स |
| type.url | Website | वेबसाइट |
| type.text | Text | टेक्स्ट |
| type.wifi | WiFi | वाईफ़ाई |
| type.upi | UPI payment | UPI भुगतान |
| type.whatsapp | WhatsApp | व्हाट्सऐप |
| type.phone | Phone call | फ़ोन कॉल |
| type.sms | SMS | एसएमएस |
| type.email | Email | ईमेल |
| type.vcard | Contact card | कॉन्टैक्ट कार्ड |
| type.location | Location | लोकेशन |
| type.event | Event | इवेंट |
| action.download | Download | डाउनलोड करें |
| action.example | Try an example | उदाहरण देखें |
| action.reset | Reset | रीसेट करें |
| status.great | Verified — this code scans correctly. | जाँचा गया — यह कोड सही से स्कैन होता है। |
| status.fail | This code probably won't scan. | यह कोड शायद स्कैन नहीं होगा। |
| upi.check | Always check the payee name in your UPI app before paying. | भुगतान से पहले अपने UPI ऐप में प्राप्तकर्ता का नाम ज़रूर जाँचें। |
| design.colors | Colors | रंग |
| design.logo | Logo | लोगो |
| design.frame | Frame & label | फ़्रेम और लेबल |
