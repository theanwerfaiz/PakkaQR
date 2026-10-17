import { expect, test } from '@playwright/test';
import { encodeContent, exampleContent, qrTypes } from '../../src/lib/payloads';
import { chooseType, decodeFile, download, open } from './helpers';

const P0_P1: string[] = qrTypes.filter((t) => t !== 'mecard' && t !== 'crypto');

test.describe('generate, download and decode', () => {
  for (const type of qrTypes) {
    test(`${type}: PNG and SVG decode to the exact payload`, async ({ page }) => {
      test.skip(
        !P0_P1.includes(type) && test.info().project.name !== 'chromium',
        'P2 types: Chromium only',
      );
      const encoded = encodeContent(exampleContent(type));
      if (!encoded.ok) throw new Error('bad example');
      await open(page, '/');
      await chooseType(page, type);
      await page.getByTestId('try-example').click();
      await expect(page.getByTestId('scan-status')).toHaveAttribute('data-status', 'great', {
        timeout: 15_000,
      });
      const png = await download(page, 'download-png');
      expect(await decodeFile(png)).toBe(encoded.payload);
      const svg = await download(page, 'download-svg');
      expect(await decodeFile(svg)).toBe(encoded.payload);
    });
  }

  test('JPEG, WebP and PDF downloads are produced', async ({ page }) => {
    await open(page, '/wifi-qr-code-generator');
    await page.getByTestId('try-example').click();
    await expect(page.getByTestId('scan-status')).toHaveAttribute('data-status', 'great', {
      timeout: 15_000,
    });
    await page.getByText('More formats').click();
    const payload = (encodeContent(exampleContent('wifi')) as { payload: string }).payload;
    expect(await decodeFile(await download(page, 'download-jpeg'))).toBe(payload);
    const webp = await download(page, 'download-webp');
    expect(webp).toBeTruthy();
    const pdf = await download(page, 'download-pdf');
    const { readFileSync } = await import('node:fs');
    expect(readFileSync(pdf).subarray(0, 5).toString()).toBe('%PDF-');
  });

  test('a deliberately broken design (40% logo, EC L) is flagged ❌', async ({ page }) => {
    const { qrPng } = await import('./helpers');
    const logo = `data:image/png;base64,${qrPng('logo', 64).toString('base64')}`;
    await page.addInitScript((dataUrl) => {
      localStorage.setItem(
        'pakkaqr:last-design',
        JSON.stringify({
          fg: '#000000',
          bg: '#FFFFFF',
          margin: 4,
          ecLevel: 'L',
          logo: { dataUrl, sizeRatio: 0.4, margin: 1, hideBackgroundDots: true, aspect: 1 },
        }),
      );
    }, logo);
    await open(page, '/');
    await page.getByTestId('try-example').click();
    await expect(page.getByTestId('scan-status')).toHaveAttribute('data-status', 'fail', {
      timeout: 15_000,
    });
    await page.getByTestId('download-png').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Fix automatically' }).click();
    await expect(page.getByTestId('scan-status')).not.toHaveAttribute('data-status', 'fail', {
      timeout: 15_000,
    });
  });

  test('empty input shows a placeholder, invalid input a friendly message', async ({ page }) => {
    await open(page, '/upi-qr-code-generator');
    await expect(page.getByTestId('qr-placeholder')).toBeVisible();
    await page.getByLabel('UPI ID').fill('not-a-vpa');
    await page.getByLabel('UPI ID').blur();
    await expect(page.getByText('UPI ID should look like name@bank.')).toBeVisible();
    await expect(page.getByTestId('download-png')).toBeDisabled();
  });
});

test('mobile: sticky download bar and no horizontal scroll at 320px @mobile', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await open(page, '/');
  await page.getByTestId('try-example').click();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(320);
  await expect(page.getByRole('button', { name: 'Download', exact: true })).toBeVisible();
});
