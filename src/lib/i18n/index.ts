import en from '../../i18n/en.json';
import hi from '../../i18n/hi.json';

export const locales = ['en', 'hi'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export interface LocaleInfo {
  code: Locale;
  /** BCP-47 tag used for <html lang> and hreflang. */
  tag: string;
  /** Name shown in the language switcher, in its own language. */
  nativeName: string;
  dir: 'ltr' | 'rtl';
}

export const localeInfo: Record<Locale, LocaleInfo> = {
  en: { code: 'en', tag: 'en', nativeName: 'English', dir: 'ltr' },
  hi: { code: 'hi', tag: 'hi', nativeName: 'हिन्दी', dir: 'ltr' },
};

export type Dict = { [key: string]: string | Dict };
export type Vars = Record<string, string | number>;

// `_meta` holds a list (reviewed keys); lookups skip it.
const uiDicts: Record<Locale, Dict> = { en: en as unknown as Dict, hi: hi as unknown as Dict };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

function lookup(dict: Dict, key: string): string | undefined {
  let node: string | Dict | undefined = dict;
  for (const part of key.split('.')) {
    if (node === undefined || typeof node === 'string') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

export function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export type TFunction = (key: string, vars?: Vars) => string;

/**
 * Builds a translator. Missing keys fall back to the fallback dictionary
 * (English), then to the key itself so gaps are visible rather than blank.
 */
export function createT(dict: Dict, fallback?: Dict): TFunction {
  return (key, vars) => {
    const value = lookup(dict, key) ?? (fallback ? lookup(fallback, key) : undefined);
    return interpolate(value ?? key, vars);
  };
}

export function hasKey(dict: Dict, key: string): boolean {
  return lookup(dict, key) !== undefined;
}

export function getTranslator(locale: Locale): TFunction {
  return createT(uiDicts[locale], uiDicts[defaultLocale]);
}

export function getUiDict(locale: Locale): Dict {
  return uiDicts[locale];
}

/** Flattens a nested dictionary into dotted keys (skipping `_meta`). */
export function flattenKeys(dict: Dict, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(dict)) {
    if (k.startsWith('_')) continue;
    const full = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') keys.push(full);
    else keys.push(...flattenKeys(v, full));
  }
  return keys;
}

/**
 * Site path for a page slug in a locale. `slug` has no leading slash; '' is home.
 * `base` is the deploy base path (e.g. '/' or '/PakkaQR/').
 */
export function localePath(locale: Locale, slug: string, base = '/'): string {
  const b = base.endsWith('/') ? base : `${base}/`;
  const parts = [locale === defaultLocale ? '' : locale, slug].filter(Boolean).join('/');
  if (!parts) return b;
  return `${b}${parts}`;
}

/** Splits a site pathname into locale + slug (inverse of localePath). */
export function parsePath(pathname: string, base = '/'): { locale: Locale; slug: string } {
  const b = base.endsWith('/') ? base : `${base}/`;
  let rest = pathname.startsWith(b) ? pathname.slice(b.length) : pathname.replace(/^\//, '');
  rest = rest.replace(/\.html$/, '').replace(/\/$/, '');
  if (rest === 'index') rest = '';
  const [first, ...others] = rest.split('/');
  if (isLocale(first) && first !== defaultLocale) {
    return { locale: first, slug: others.join('/').replace(/^index$/, '') };
  }
  return { locale: defaultLocale, slug: rest };
}
