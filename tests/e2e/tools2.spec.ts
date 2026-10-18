import { expect, test } from '@playwright/test';
import { decodeFile, download, open } from './helpers';

test.describe('barcode generator', () => {
  test('EAN-13 adds the check digit and passes the scan test', async ({ page }) => {
    await open(page, '/barcode-generator');
    await page.getByTestId('barcode-input').fill('890123456789');
    await expect(page.locator('#barcode-value-msg')).toContainText('8901234567890');
    await expect(page.getByTestId('barcode-status')).toHaveAttribute('data-status', 'great', {
      timeout: 15_000,
    });
    const svg = await download(page, 'barcode-svg');
    const { readFileSync } = await import('node:fs');
    expect(readFileSync(svg, 'utf8')).toContain('<svg');
  });
  test('a wrong check digit is explained', async ({ page }) => {
    await open(page, '/barcode-generator');
    await page.getByTestId('barcode-input').fill('8901234567891');
    await expect(page.getByText(/check digit\) is wrong/)).toBeVisible();
  });
});

test.describe('templates', () => {
  test('a template opens in the generator with its frame and still scans', async ({ page }) => {
    await open(page, '/qr-code-templates');
    await page.locator('[data-template="guestWifi"]').click();
    await page.waitForURL((u) => !u.pathname.includes('templates'));
    await page.locator('astro-island:not([ssr])').first().waitFor({ state: 'attached' });
    await expect(page.getByLabel('Network name (SSID)')).not.toHaveValue('');
    await expect(page.getByTestId('scan-status')).toHaveAttribute('data-status', 'great', {
      timeout: 15_000,
    });
  });
});

test.describe('secret note', () => {
  test('lock, then open with the password', async ({ page }) => {
    await open(page, '/secret-message-qr-code');
    await page.getByTestId('secret-message').fill('Locker 14 · code 4071');
    await page.getByTestId('secret-password').fill('chai-time');
    await page.getByTestId('secret-make').click();
    const link = (await page.getByTestId('secret-link').textContent())!;
    expect(link).toContain('/open#pq1:');
    const png = await download(page, 'secret-png');
    expect(await decodeFile(png)).toBe(link);
    // Open the note on the same origin.
    await open(page, new URL(link).pathname + new URL(link).hash);
    await page.getByTestId('note-password').fill('wrong');
    await page.getByTestId('note-open').click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.getByTestId('note-password').fill('chai-time');
    await page.getByTestId('note-open').click();
    await expect(page.getByTestId('note-text')).toHaveText('Locker 14 · code 4071');
  });
});

test.describe('photo QR', () => {
  test('the demo photo code passes the scan test', async ({ page }) => {
    await open(page, '/photo-qr-code');
    await expect(page.getByTestId('photo-status')).toHaveAttribute('data-status', 'great', {
      timeout: 15_000,
    });
  });
});

test.describe('numbered series', () => {
  test('fills the bulk CSV', async ({ page }) => {
    await open(page, '/bulk-qr-code-generator#numbered');
    await page.getByTestId('numbered-fill').click();
    await expect(page.getByTestId('batch-rows')).toContainText('20');
  });
});

test.describe('header', () => {
  test('search palette jumps to a tool', async ({ page }) => {
    await open(page, '/');
    await page.keyboard.press('Control+k');
    await page.keyboard.type('barcode');
    await page.keyboard.press('Enter');
    await page.waitForURL(/barcode-generator/);
  });
  test('tools menu opens and closes with Escape', async ({ page }) => {
    await open(page, '/');
    await page.locator('[data-tools-toggle]').click();
    await expect(page.locator('#tools-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#tools-menu')).toBeHidden();
  });
  test('real-look preview switches to a table tent', async ({ page }) => {
    await open(page, '/');
    await page.locator('[data-mockup="tent"]').click();
    await expect(page.getByTestId('mockup-stage')).toHaveAttribute('data-mode', 'tent');
  });
});

test.describe('share target', () => {
  test('text shared from another app is detected', async ({ page }) => {
    await open(page, '/?text=' + encodeURIComponent('Look at this https://chaibar.in/menu'));
    await expect(page.getByLabel('Website address')).toHaveValue('https://chaibar.in/menu');
  });
});

test.describe('scanner history', () => {
  test('is off by default and can be turned on', async ({ page }) => {
    await open(page, '/qr-code-scanner');
    await expect(page.getByTestId('history-toggle')).not.toBeChecked();
    await page.getByTestId('history-toggle').check();
    await expect(page.getByText('No scans yet.')).toBeVisible();
  });
});
