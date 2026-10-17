import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { getTranslator, type Locale, type TFunction } from '../../lib/i18n';

interface I18n {
  locale: Locale;
  t: TFunction;
}

const I18nContext = createContext<I18n>({ locale: 'en', t: getTranslator('en') });

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => ({ locale, t: getTranslator(locale) }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = (): I18n => useContext(I18nContext);
export const useT = (): TFunction => useContext(I18nContext).t;
