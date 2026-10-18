import { pages, TOOLS_MENU } from './pages';
import { TEMPLATES } from './templates';
import { getTranslator, localePath, type Locale } from '../lib/i18n';
import { useContent } from '../lib/i18n/content';

export interface SearchEntry {
  /** Shown in the list. */
  title: string;
  /** Group label. */
  group: string;
  /** Extra words that match (other language, synonyms). */
  keys: string;
  icon: string;
  /** A link, or an action handled by the header script. */
  href?: string;
  action?: 'dark' | 'light' | 'system' | 'large' | 'normal' | 'personalise';
}

/** Everything the Ctrl/⌘ K search can jump to, built at build time per language. */
export function searchIndex(locale: Locale, base: string): SearchEntry[] {
  const t = getTranslator(locale);
  const c = useContent(locale);
  const en = getTranslator('en');
  const href = (slug: string) => localePath(locale, slug, base);
  const out: SearchEntry[] = [];

  for (const group of TOOLS_MENU)
    for (const item of group.items)
      out.push({
        title: t(`tools.${item.id}.name`),
        group: t('search.groups.tools'),
        keys: `${t(`tools.${item.id}.desc`)} ${en(`tools.${item.id}.name`)} ${en(`tools.${item.id}.desc`)}`,
        icon: item.icon,
        href: href(item.slug),
      });

  for (const p of pages) {
    if (p.kind !== 'tool' && p.kind !== 'usecase') continue;
    out.push({
      title: c(`pages.${p.key}.linkText`),
      group: t('search.groups.create'),
      keys: `${c(`pages.${p.key}.blurb`)} ${p.slug.replace(/-/g, ' ')}`,
      icon: 'qr',
      href: href(p.slug),
    });
  }

  for (const tpl of TEMPLATES)
    out.push({
      title: t(`template.${tpl.id}.name`),
      group: t('search.groups.templates'),
      keys: `${t(`template.${tpl.id}.label`)} ${en(`template.${tpl.id}.name`)} ${t(`template.category.${tpl.category}`)}`,
      icon: 'layers',
      href: `${href('qr-code-templates')}?use=${tpl.id}`,
    });

  for (const slug of ['static-vs-dynamic-qr-codes', 'faq', 'privacy', 'about']) {
    const p = pages.find((x) => x.slug === slug)!;
    out.push({
      title: c(`pages.${p.key}.linkText`),
      group: t('search.groups.learn'),
      keys: c(`pages.${p.key}.blurb`),
      icon: 'book',
      href: href(slug),
    });
  }

  const actions: Array<[SearchEntry['action'], string]> = [
    ['dark', 'moon'],
    ['light', 'sun'],
    ['large', 'text'],
    ['normal', 'text'],
    ['personalise', 'sliders'],
  ];
  for (const [action, icon] of actions)
    out.push({
      title: t(`search.actions.${action}`),
      group: t('search.groups.settings'),
      keys: en(`search.actions.${action}`),
      icon,
      action,
    });
  return out;
}
