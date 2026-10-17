// Build-time assets: PWA icons and a 1200×630 Open Graph image per page and
// language. Runs before `astro build` (npm "prebuild"). Output is git-ignored.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GlobalFonts, createCanvas, loadImage } from '@napi-rs/canvas';
import qrcode from 'qrcode-generator';
import { pages } from '../src/data/pages.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
const fonts = join(root, 'node_modules');
GlobalFonts.registerFromPath(
  join(fonts, '@fontsource-variable/anek-latin/files/anek-latin-latin-wght-normal.woff2'),
  'Anek Latin',
);
GlobalFonts.registerFromPath(
  join(
    fonts,
    '@fontsource-variable/anek-devanagari/files/anek-devanagari-devanagari-wght-normal.woff2',
  ),
  'Anek Devanagari',
);
const FONT = '"Anek Latin", "Anek Devanagari"';
const PAPER = '#F4EFE6';
const SHEET = '#FFFCF6';
const INK = '#1A1712';
const STAMP = '#C2321A';

const content = {
  en: JSON.parse(readFileSync(join(root, 'src/i18n/content/en.json'), 'utf8')),
  hi: JSON.parse(readFileSync(join(root, 'src/i18n/content/hi.json'), 'utf8')),
};
const ui = {
  en: JSON.parse(readFileSync(join(root, 'src/i18n/en.json'), 'utf8')),
  hi: JSON.parse(readFileSync(join(root, 'src/i18n/hi.json'), 'utf8')),
};

const faviconSvg = readFileSync(join(pub, 'icons/favicon.svg'));

const svgImage = (svg) => loadImage(svg);

// ------------------------------------------------------------------ icons
async function icons() {
  const logo = await svgImage(faviconSvg);
  mkdirSync(join(pub, 'icons'), { recursive: true });
  for (const [name, size, pad] of [
    ['icon-192.png', 192, 0],
    ['icon-512.png', 512, 0],
    ['icon-maskable-512.png', 512, 0.12],
    ['apple-touch-icon.png', 180, 0.08],
  ]) {
    const c = createCanvas(size, size);
    const ctx = c.getContext('2d');
    if (pad) {
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, size, size);
    }
    const inset = size * pad;
    ctx.drawImage(logo, inset, inset, size - inset * 2, size - inset * 2);
    writeFileSync(join(pub, 'icons', name), c.toBuffer('image/png'));
  }
}

// ------------------------------------------------------------------ OG images
function wrap(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function drawQr(ctx, text, x, y, size) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const cell = size / (n + 8);
  ctx.fillStyle = SHEET;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 24);
  ctx.fill();
  ctx.strokeStyle = '#DCD3C2';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = INK;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (qr.isDark(r, c))
        ctx.fillRect(x + (c + 4) * cell, y + (r + 4) * cell, cell + 0.5, cell + 0.5);
}

function stamp(ctx, cx, cy) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-14 * Math.PI) / 180);
  ctx.fillStyle = 'rgba(255,252,246,0.9)';
  ctx.beginPath();
  ctx.arc(0, 0, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = STAMP;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 58, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = STAMP;
  ctx.textAlign = 'center';
  ctx.font = `700 11px ${FONT}`;
  ctx.fillText('SCAN-TESTED', 0, -22);
  ctx.font = `800 34px ${FONT}`;
  ctx.fillText('PAKKA', 0, 12);
  ctx.font = `700 16px ${FONT}`;
  ctx.fillText('पक्का', 0, 36);
  ctx.restore();
}

async function ogImages() {
  const logo = await svgImage(faviconSvg);
  mkdirSync(join(pub, 'og'), { recursive: true });
  let count = 0;
  for (const locale of ['en', 'hi']) {
    for (const page of pages) {
      const c = createCanvas(1200, 630);
      const ctx = c.getContext('2d');
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, 1200, 630);
      ctx.drawImage(logo, 72, 64, 64, 64);
      ctx.fillStyle = INK;
      ctx.font = `700 40px ${FONT}`;
      ctx.fillText('PakkaQR', 152, 110);
      const h1 = content[locale].pages[page.key]?.h1 ?? 'PakkaQR';
      ctx.font = `700 62px ${FONT}`;
      const lines = wrap(ctx, h1, 660).slice(0, 4);
      lines.forEach((line, i) => ctx.fillText(line, 72, 240 + i * (locale === 'hi' ? 84 : 70)));
      ctx.fillStyle = STAMP;
      ctx.fillRect(72, 520, 120, 6);
      ctx.fillStyle = '#4A4439';
      ctx.font = `600 30px ${FONT}`;
      ctx.fillText(ui[locale].brand.tagline, 72, 572);
      drawQr(
        ctx,
        (process.env.PUBLIC_SITE_URL || 'https://pakkaqr.pages.dev').replace(/\/$/, ''),
        810,
        150,
        320,
      );
      stamp(ctx, 1110, 165);
      const file = `${page.slug || 'home'}-${locale}.png`;
      writeFileSync(join(pub, 'og', file), c.toBuffer('image/png'));
      count++;
    }
  }
  return count;
}

await icons();
const n = await ogImages();
console.log(`[assets] icons + ${n} Open Graph images written`);
