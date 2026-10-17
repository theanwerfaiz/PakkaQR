import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { pages } from '../../src/data/pages';

const routes = [
  ...pages.map((p) => `/${p.slug}`),
  ...pages.map((p) => `/hi${p.slug ? `/${p.slug}` : ''}`),
  '/404',
];

test.describe('every route', () => {
  for (const route of routes) {
    test(`${route}: no third-party requests, no serious axe issues`, async ({ page, baseURL }) => {
      const origin = new URL(baseURL!).origin;
      const outside: string[] = [];
      page.on('request', (r) => {
        const u = r.url();
        if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:'))
          outside.push(u);
      });
      await page.goto(route, { waitUntil: 'networkidle' });
      expect(outside).toEqual([]);
      const results = // @axe-core/playwright is typed against a newer Playwright; the runtime API is the same.
        await new AxeBuilder({ page: page as never })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
      const bad = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      expect(
        bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
      ).toEqual([]);
    });
  }
});

test('Hindi pages render Hindi with no missing-key placeholders', async ({ page }) => {
  for (const p of pages) {
    await page.goto(`/hi${p.slug ? `/${p.slug}` : ''}`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
    const text = await page.locator('body').innerText();
    expect(text, p.slug).toMatch(/[ऀ-ॿ]/);
    expect(text, p.slug).not.toMatch(/\b(pages|generator|field|errors|design|status)\.[a-zA-Z]+/);
  }
});

test('works offline after the first visit', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return reg.active?.state;
  });
  // Wait until the precache is complete (the worker activates after install).
  await page
    .waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 30_000 })
    .catch(() => page.reload());
  await context.setOffline(true);
  await page.goto('/wifi-qr-code-generator');
  await page.getByTestId('try-example').click();
  await expect(page.getByTestId('scan-status')).toHaveAttribute('data-status', 'great', {
    timeout: 15_000,
  });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-png').click(),
  ]);
  expect(await download.path()).toBeTruthy();
  await context.setOffline(false);
});

test('SEO basics: unique titles, canonical, hreflang, structured data', async ({ page }) => {
  const titles = new Set<string>();
  for (const p of pages) {
    await page.goto(`/${p.slug}`);
    const title = await page.title();
    expect(titles.has(title), title).toBe(false);
    titles.add(title);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel=canonical]')).toHaveCount(1);
    await expect(page.locator('link[hreflang=hi]')).toHaveCount(1);
    await expect(page.locator('link[hreflang=x-default]')).toHaveCount(1);
  }
  await page.goto('/');
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.join()).toContain('"WebApplication"');
  expect(ld.join()).toContain('"isAccessibleForFree":true');
});

test.describe('dark theme', () => {
  for (const route of ['/', '/hi/upi-qr-code-generator', '/print', '/qr-code-scanner', '/faq']) {
    test(`${route}: no serious axe issues in dark mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto(route, { waitUntil: 'networkidle' });
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      // @axe-core/playwright is typed against a newer Playwright; the runtime API is the same.
      const results = await new AxeBuilder({ page: page as never })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      const bad = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      expect(
        bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
      ).toEqual([]);
    });
  }
});

test('keyboard only: choose a type, fill the form and reach Download', async ({ page }) => {
  await page.goto('/');
  await page.locator('astro-island:not([ssr])').first().waitFor({ state: 'attached' });
  await page.keyboard.press('Tab'); // skip link
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skip).toBeFocused();
  await page.getByRole('radio', { name: 'Website' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'WiFi' })).toBeFocused();
  await expect(page.getByRole('radio', { name: 'WiFi' })).toHaveAttribute('aria-checked', 'true');
  await page.getByLabel('Network name (SSID)').fill('Home');
  await page.getByLabel('Password', { exact: true }).fill('12345678');
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await expect(page.getByTestId('download-png')).toBeFocused();
});
