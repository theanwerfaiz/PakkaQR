import { useState } from 'react';
import { classify, parseWifi } from '../../lib/expiry';
import { isOpenable, linkWarnings } from '../../lib/scanner/safety';
import { localePath, type Locale } from '../../lib/i18n';
import { Modal } from '../common/Modal';
import { ToastProvider, useToast } from '../common/Toast';
import { I18nProvider, useI18n } from '../common/i18n';
import { CodeCapture } from './CodeCapture';
import { VerdictCard } from '../expiry/VerdictCard';

export default function Scanner({ locale }: { locale: Locale }) {
  return (
    <I18nProvider locale={locale}>
      <ToastProvider>
        <ScannerApp />
      </ToastProvider>
    </I18nProvider>
  );
}

function ScannerApp() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [text, setText] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (text === null) {
    return (
      <div className="card space-y-4 p-4 sm:p-6">
        <CodeCapture onResult={setText} />
        <p className="hint">{t('scanner.privacy')}</p>
      </div>
    );
  }

  const info = classify(text);
  const wifi = info.type === 'wifi' ? parseWifi(text) : null;
  const warnings = linkWarnings(text);
  const openable = isOpenable(text);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ text: t('scanner.copied'), tone: 'success' });
    } catch {
      toast({ text: t('errors.clipboard'), tone: 'error' });
    }
  };

  return (
    <div className="space-y-4">
      <section
        className="card space-y-4 p-4 sm:p-6"
        aria-labelledby="result-heading"
        data-testid="scan-result"
      >
        <h2 id="result-heading" className="text-xl font-bold">
          {t('scanner.resultTitle')}
        </h2>
        <dl className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          <dt className="font-semibold">{t('scanner.type')}</dt>
          <dd data-testid="scan-type" data-type={info.type}>
            {info.type === 'unknown' ? '—' : t(`type.${info.type}`)}
          </dd>
          {wifi && (
            <>
              <dt className="font-semibold">{t('scanner.wifi.ssid')}</dt>
              <dd>{wifi.ssid}</dd>
              <dt className="font-semibold">{t('scanner.wifi.password')}</dt>
              <dd className="font-mono">{wifi.password || '—'}</dd>
              <dt className="font-semibold">{t('scanner.wifi.security')}</dt>
              <dd>{wifi.security}</dd>
            </>
          )}
          <dt className="font-semibold">{t('scanner.content')}</dt>
          <dd>
            <pre
              className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-[10px] bg-surface-2 p-3 font-mono text-sm"
              data-testid="scan-text"
            >
              {text}
            </pre>
          </dd>
        </dl>
        {warnings.length > 0 && (
          <ul className="space-y-2" role="alert">
            {warnings.map((w) => (
              <li
                key={w}
                className={`rounded-[10px] border-l-4 p-3 text-sm ${w === 'dangerousScheme' ? 'border-danger' : 'border-warning'} bg-surface-2`}
              >
                {t(`scanner.warning.${w}`)}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => void copy()}>
            {t('scanner.copy')}
          </button>
          {'speechSynthesis' in window && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                const u = new SpeechSynthesisUtterance(text);
                u.lang = locale === 'hi' ? 'hi-IN' : 'en-IN';
                u.rate = 0.9;
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(u);
              }}
            >
              {t('payload.read')}
            </button>
          )}
          {openable ? (
            <button type="button" className="btn btn-secondary" onClick={() => setConfirming(true)}>
              {t('scanner.open')}
            </button>
          ) : (
            <p className="hint self-center">{t('scanner.notOpenable')}</p>
          )}
          <button type="button" className="btn btn-ghost" onClick={() => setText(null)}>
            {t('scanner.scanAnother')}
          </button>
        </div>
      </section>
      {info.type === 'url' || info.verdict !== 'static' ? (
        <VerdictCard info={info} text={text} />
      ) : (
        <p className="text-sm">
          <a href={localePath(locale, 'qr-code-expiry-checker', import.meta.env.BASE_URL)}>
            {t('scanner.expiry')}
          </a>
        </p>
      )}
      <Modal
        open={confirming}
        title={t('scanner.confirmTitle')}
        onClose={() => setConfirming(false)}
      >
        <p>{t('scanner.confirmBody')}</p>
        <p className="mt-2 break-all rounded-[10px] bg-surface-2 p-3 font-mono text-sm">{text}</p>
        {warnings.map((w) => (
          <p key={w} className="warning-text">
            {t(`scanner.warning.${w}`)}
          </p>
        ))}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>
            {t('scanner.cancel')}
          </button>
          <a
            className="btn btn-primary"
            href={text}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setConfirming(false)}
          >
            {t('scanner.confirmOpen')}
          </a>
        </div>
      </Modal>
    </div>
  );
}
