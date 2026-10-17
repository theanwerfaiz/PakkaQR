import en from '../../i18n/content/en.json' with { type: 'json' };
import hi from '../../i18n/content/hi.json' with { type: 'json' };
import { createT, defaultLocale, type Dict, type Locale, type TFunction } from './index';

/*
 * Long-form page copy. Only used at build time in .astro pages, so it
 * never ships in the JavaScript bundle.
 */
// Content holds arrays (steps, FAQs) as well as strings; lookups go through createT or contentList.
const contentDicts: Record<Locale, Dict> = { en: en as unknown as Dict, hi: hi as unknown as Dict };

export function useContent(locale: Locale): TFunction {
  return createT(contentDicts[locale], contentDicts[defaultLocale]);
}

export interface Faq {
  q: string;
  a: string;
}

/** Reads a list stored as an array in the content JSON (steps, FAQs, paragraphs). */
export function contentList<T = string>(locale: Locale, key: string): T[] {
  const read = (dict: Dict): unknown => {
    let node: unknown = dict;
    for (const part of key.split('.')) {
      if (typeof node !== 'object' || node === null) return undefined;
      node = (node as Record<string, unknown>)[part];
    }
    return node;
  };
  const value = read(contentDicts[locale]) ?? read(contentDicts[defaultLocale]);
  return Array.isArray(value) ? (value as T[]) : [];
}
