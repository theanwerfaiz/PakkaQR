import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../../../src/lib/scannability/checks';

const css = readFileSync('src/styles/global.css', 'utf8');

/** Reads `--name: #hex` pairs from the first block that starts with `selector {`. */
function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no block ${selector}`);
  const body = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!]),
  );
}

const light = block(':root');
const dark = { ...light, ...block("[data-theme='dark']") };

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme contrast (WCAG 2.2 AA)', (_name, v) => {
  const text = (fg: string, bg: string) => contrastRatio(v[fg]!, v[bg]!);
  it.each([
    ['text', 'bg'],
    ['text', 'surface'],
    ['text', 'surface-2'],
    ['text-muted', 'bg'],
    ['text-muted', 'surface'],
    ['text-muted', 'surface-2'],
    ['accent-contrast', 'accent'],
    ['success', 'bg'],
    ['warning', 'bg'],
    ['danger', 'bg'],
    ['danger', 'surface'],
    ['text', 'warning-soft'],
  ])('%s on %s ≥ 4.5', (fg, bg) => {
    expect(text(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
  it.each([
    ['border-strong', 'surface'],
    ['border-strong', 'bg'],
    ['stamp', 'bg'],
    ['stamp', 'surface'],
  ])('%s on %s ≥ 3 (non-text)', (fg, bg) => {
    expect(text(fg, bg)).toBeGreaterThanOrEqual(3);
  });
});

describe.each(['neel', 'tulsi', 'jamun'])('accent %s', (accent) => {
  it('stamp colour is readable as text on paper, light and dark', () => {
    const l = { ...light, ...block(`:root[data-accent='${accent}']`) };
    const d = { ...dark, ...block(`[data-theme='dark'][data-accent='${accent}']`) };
    expect(contrastRatio(l.stamp!, l.bg!)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(d.stamp!, d.bg!)).toBeGreaterThanOrEqual(4.5);
  });
});

it('sindoor stamp is readable as text in both themes', () => {
  expect(contrastRatio(light.stamp!, light.bg!)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(dark.stamp!, dark.bg!)).toBeGreaterThanOrEqual(4.5);
});
