import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import JSZip from 'jszip';
import { decodeFile, open, qrPng } from './helpers';

const out = (name: string) => {
  mkdirSync(test.info().outputDir, { recursive: true });
  return join(test.info().outputDir, name);
};

const fixture = (name: string, text: string) => {
  const path = out(name);
  writeFileSync(path, qrPng(text));
  return path;
};

test.describe('scanner', () => {
  test('reads an uploaded image and detects the type', async ({ page }) => {
    await open(page, '/qr-code-scanner');
    await page
      .locator('input[type=file]')
      .setInputFiles(fixture('wifi.png', 'WIFI:T:WPA;S:Cafe;P:secret123;;'));
    await expect(page.getByTestId('scan-text')).toHaveText('WIFI:T:WPA;S:Cafe;P:secret123;;');
    await expect(page.getByTestId('scan-type')).toHaveAttribute('data-type', 'wifi');
  });
  test('never opens links without confirmation and warns on javascript:', async ({ page }) => {
    await open(page, '/qr-code-scanner');
    await page.locator('input[type=file]').setInputFiles(fixture('js.png', 'javascript:alert(1)'));
    await expect(
      page.getByRole('alert').getByText(/Danger: this is not a normal web link/),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open link…' })).toHaveCount(0);
  });
  test('says when no code is found', async ({ page }) => {
    await open(page, '/qr-code-scanner');
    const blank = out('blank.png');
    const { createCanvas } = await import('@napi-rs/canvas');
    writeFileSync(blank, createCanvas(200, 200).toBuffer('image/png'));
    await page.locator('input[type=file]').setInputFiles(blank);
    await expect(page.getByTestId('capture-error')).toBeVisible();
  });
});

test.describe('expiry checker', () => {
  for (const [name, text, verdict] of [
    ['static-wifi', 'WIFI:T:WPA;S:Home;P:12345678;;', 'static'],
    ['static-url', 'https://example.com/menu', 'static'],
    ['dynamic', 'https://qrco.de/bdAbC1', 'dynamic'],
    ['shortener', 'https://bit.ly/3XyZabc', 'shortener'],
  ] as const) {
    test(`${name} is ${verdict}`, async ({ page }) => {
      await open(page, '/qr-code-expiry-checker');
      await page.locator('input[type=file]').setInputFiles(fixture(`${name}.png`, text));
      await expect(page.getByTestId('verdict')).toHaveAttribute('data-verdict', verdict);
    });
  }
  test('recreate as a forever code hands off to the generator', async ({ page }) => {
    await open(page, '/qr-code-expiry-checker');
    await page
      .locator('input[type=file]')
      .setInputFiles(fixture('dyn.png', 'https://qrco.de/abc123'));
    await page.getByLabel('Real destination address').fill('example.com/real-menu');
    await page.getByRole('button', { name: 'Create forever code' }).click();
    await expect(page.getByLabel('Website address')).toHaveValue('https://example.com/real-menu');
  });
});

test.describe('batch', () => {
  test('500-row CSV to ZIP; 20 random files decode to their row', async ({ page }) => {
    test.setTimeout(180_000);
    const rows = Array.from({ length: 500 }, (_, i) => [
      `https://example.com/item/${i + 1}`,
      `item-${i + 1}`,
    ]);
    const csv = ['url,filename', ...rows.map((r) => r.join(','))].join('\n');
    await open(page, '/bulk-qr-code-generator');
    await page.getByTestId('batch-csv').fill(csv);
    await expect(page.getByTestId('batch-rows')).toContainText('500');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 170_000 }),
      page.getByTestId('batch-generate').click(),
    ]);
    const zip = await JSZip.loadAsync(readFileSync((await download.path())!));
    const names = Object.keys(zip.files).filter((n) => n.endsWith('.png'));
    expect(names).toHaveLength(500);
    const picks = Array.from({ length: 20 }, () => Math.floor(Math.random() * 500));
    for (const i of picks) {
      const file = out(`b${i}.png`);
      writeFileSync(file, await zip.file(`item-${i + 1}.png`)!.async('nodebuffer'));
      expect(await decodeFile(file)).toBe(rows[i]![0]);
    }
  });
  test('invalid rows are reported and the rest still export', async ({ page }) => {
    await open(page, '/bulk-qr-code-generator');
    await page.getByTestId('batch-csv').fill('url\nexample.com\njavascript:alert(1)\nexample.org');
    await expect(page.getByTestId('batch-errors')).toContainText('1 rows were skipped');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('batch-generate').click(),
    ]);
    const zip = await JSZip.loadAsync(readFileSync((await download.path())!));
    expect(Object.keys(zip.files).sort()).toEqual([
      'errors.csv',
      'pakkaqr-url-0001.png',
      'pakkaqr-url-0003.png',
    ]);
  });
});

test.describe('print', () => {
  test('sticker sheet PDF is A4 with codes at the chosen size', async ({ page }) => {
    await open(page, '/print');
    await page.getByRole('button', { name: 'Try an example' }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('print-download').click(),
    ]);
    const pdf = readFileSync((await download.path())!).toString('latin1');
    expect(pdf.startsWith('%PDF-')).toBe(true);
    // A4 = 595.28 × 841.89 pt
    expect(pdf).toMatch(/\/MediaBox \[0 0 595\.2\d+ 841\.8\d+\]/);
  });
});
