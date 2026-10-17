import type { Faq } from './i18n/content';

/** schema.org structured data builders (JSON-LD). */

export function webApplication(opts: {
  name: string;
  url: string;
  description: string;
  inLanguage: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: opts.name,
    url: opts.url,
    description: opts.description,
    inLanguage: opts.inLanguage,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any (runs in a web browser)',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  };
}

export function howTo(opts: { name: string; steps: string[]; inLanguage: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: opts.name,
    inLanguage: opts.inLanguage,
    totalTime: 'PT1M',
    estimatedCost: { '@type': 'MonetaryAmount', currency: 'INR', value: '0' },
    step: opts.steps.map((text, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: text,
      text,
    })),
  };
}

export function faqPage(faqs: Faq[], inLanguage: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage,
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function breadcrumbs(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
