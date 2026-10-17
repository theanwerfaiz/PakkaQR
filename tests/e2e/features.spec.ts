import { expect, test } from '@playwright/test';
import { decodeFile, download, open } from './helpers';

test.describe('smart input and starters', () => {
  test('pasting a UPI ID picks UPI and fills the form', async ({ page }) => {
    await open(page, '/');
    await page.getByTestId('smart-input').fill('ravi@okaxis');
    await page.getByTestId('smart-input').press('Enter');
    await expect(page.getByTestId('smart-status')).toContainText('UPI ID');
    await expect(page.getByLabel('UPI ID')).toHaveValue('ravi@okaxis');
    await page.getByLabel('Payee name').fill('Ravi Stores');
    await expect(page.getByTestId('scan-status')).toHaveAttribute('data-status', 'great', {
      timeout: 15_000,
    });
    await expect(page.getByTestId('payload-text')).toHaveText(
      'upi://pay?pa=ravi@okaxis&pn=Ravi%20Stores&cu=INR',
    );
    await expect(page.getByTestId('stamp')).toHaveAttribute('data-status', 'great');
  });

  test('pasting WiFi details fills the WiFi form', async ({ page }) => {
    await open(page, '/');
    await page.getByTestId('smart-input').fill('WIFI:S:Chai Bar;T:WPA;P:masala42;;');
    await page.getByTestId('smart-input').press('Enter');
    await expect(page.getByLabel('Network name (SSID)')).toHaveValue('Chai Bar');
    await expect(page.getByLabel('Password', { exact: true })).toHaveValue('masala42');
  });

  test('split the bill sets each share as the amount', async ({ page }) => {
    await open(page, '/');
    await page.locator('[data-starter="split"]').click();
    await page.getByLabel('Bill total (₹)').fill('1000');
    await page.getByRole('button', { name: 'One person more' }).click();
    await expect(page.getByTestId('split-share')).toHaveText('₹333.34');
    await page.getByRole('button', { name: 'Use this amount' }).click();
    await expect(page.getByLabel('Amount (₹)')).toHaveValue('333.34');
  });
});

test.describe('share studio', () => {
  test('story card downloads and still scans', async ({ page }) => {
    await open(page, '/');
    await page.getByTestId('try-example').click();
    await expect(page.getByTestId('scan-status')).toHaveAttribute('data-status', 'great', {
      timeout: 15_000,
    });
    await page.getByTestId('open-share').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    const file = await download(page, 'share-download');
    expect(await decodeFile(file)).toBe('https://example.com/menu');
  });
});

test.describe('style tools', () => {
  test('shuffle changes the style and keeps the code scannable', async ({ page }) => {
    await open(page, '/');
    await page.getByTestId('try-example').click();
    await expect(page.getByTestId('scan-status')).toHaveAttribute('data-status', 'great', {
      timeout: 15_000,
    });
    for (let i = 0; i < 4; i++) {
      await page.getByTestId('remix').click();
      await expect(page.getByTestId('scan-status')).toHaveAttribute('data-status', 'great', {
        timeout: 15_000,
      });
    }
  });

  test('after a download, the scan-me card appears', async ({ page }) => {
    await open(page, '/wifi-qr-code-generator');
    await page.getByTestId('try-example').click();
    await expect(page.getByTestId('scan-status')).toHaveAttribute('data-status', 'great', {
      timeout: 15_000,
    });
    await download(page, 'download-png');
    await expect(page.getByTestId('scan-me')).toBeVisible();
    await page.getByRole('button', { name: 'It worked' }).click();
    await expect(page.getByTestId('scan-me')).toContainText('Pakka!');
  });
});

test.describe('personalise', () => {
  test('big & clear and stamp colour persist across pages', async ({ page }) => {
    await open(page, '/');
    await page.locator('[data-personalise-open]').click();
    const dialog = page.getByRole('dialog', { name: 'Make it yours' });
    await dialog.getByText('Big & clear').click();
    await dialog.getByText('Neel').click();
    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-size', 'large');
    await expect(page.locator('html')).toHaveAttribute('data-accent', 'neel');
    await open(page, '/print');
    await expect(page.locator('html')).toHaveAttribute('data-size', 'large');
    await expect(page.locator('html')).toHaveAttribute('data-accent', 'neel');
  });
});
