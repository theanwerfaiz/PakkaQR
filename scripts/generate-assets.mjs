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
  join(fonts, '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'),
  'Inter',
);
GlobalFonts.registerFromPath(
  join(
    fonts,
    '@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-700-normal.woff2',
  ),
  'Noto Sans Devanagari',
);
const FONT = 'Inter, "Noto Sans Devanagari"';

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
      ctx.fillStyle = '#1F6FEB';
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
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 24);
  ctx.fill();
  ctx.fillStyle = '#16181D';
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (qr.isDark(r, c))
        ctx.fillRect(x + (c + 4) * cell, y + (r + 4) * cell, cell + 0.5, cell + 0.5);
}

async function ogImages() {
  const logo = await svgImage(faviconSvg);
  mkdirSync(join(pub, 'og'), { recursive: true });
  let count = 0;
  for (const locale of ['en', 'hi']) {
    for (const page of pages) {
      const c = createCanvas(1200, 630);
      const ctx = c.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 1200, 630);
      grad.addColorStop(0, '#0F1115');
      grad.addColorStop(1, '#1B2a4a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 630);
      ctx.drawImage(logo, 72, 64, 72, 72);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `700 40px ${FONT}`;
      ctx.fillText('PakkaQR', 164, 114);
      const h1 = content[locale].pages[page.key]?.h1 ?? 'PakkaQR';
      ctx.font = `700 60px ${FONT}`;
      const lines = wrap(ctx, h1, 680).slice(0, 4);
      lines.forEach((line, i) => ctx.fillText(line, 72, 250 + i * 76));
      ctx.fillStyle = '#9DB7E8';
      ctx.font = `600 30px ${FONT}`;
      ctx.fillText(ui[locale].brand.tagline, 72, 560);
      drawQr(
        ctx,
        (process.env.PUBLIC_SITE_URL || 'https://pakkaqr.pages.dev').replace(/\/$/, ''),
        820,
        150,
        320,
      );
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
