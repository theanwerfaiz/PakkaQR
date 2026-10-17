import { useState } from 'react';
import { classify } from '../../lib/expiry';
import type { Locale } from '../../lib/i18n';
import { CodeCapture } from '../scanner/CodeCapture';
import { ToastProvider } from '../common/Toast';
import { I18nProvider, useT } from '../common/i18n';
import { VerdictCard } from './VerdictCard';

export default function ExpiryChecker({ locale }: { locale: Locale }) {
  return (
    <I18nProvider locale={locale}>
      <ToastProvider>
        <ExpiryApp />
      </ToastProvider>
    </I18nProvider>
  );
}

function ExpiryApp() {
  const t = useT();
  const [text, setText] = useState<string | null>(null);
  if (text === null) {
    return (
      <div className="card space-y-4 p-4 sm:p-6">
        <CodeCapture onResult={setText} />
        <p className="hint">{t('expiry.noNetwork')}</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <VerdictCard info={classify(text)} text={text} />
      <button type="button" className="btn btn-secondary" onClick={() => setText(null)}>
        {t('expiry.checkAnother')}
      </button>
    </div>
  );
}
