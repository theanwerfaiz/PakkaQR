import { useState } from 'react';
import type { Classification } from '../../lib/expiry';
import { localePath } from '../../lib/i18n';
import { normalizeUrl } from '../../lib/validate/common';
import { HANDOFF_KEY, writeSession } from '../../lib/storage/local';
import { FormField } from '../common/FormField';
import { useI18n } from '../common/i18n';

const TONE = {
  static: 'border-success',
  dynamic: 'border-danger',
  shortener: 'border-warning',
} as const;

export function VerdictCard({ info, text }: { info: Classification; text: string }) {
  const { t, locale } = useI18n();
  const [destination, setDestination] = useState('');
  const [error, setError] = useState<string | null>(null);
  const key = info.verdict === 'static' && info.host ? 'staticUrl' : info.verdict;
  const vars = { host: info.host ?? '', service: info.match?.service ?? info.host ?? '' };

  const recreate = () => {
    const r = normalizeUrl(destination);
    if (!r.ok) {
      setError(t(r.error));
      return;
    }
    writeSession(HANDOFF_KEY, JSON.stringify({ type: 'url', fields: { url: r.url } }));
    window.location.href = localePath(locale, '', import.meta.env.BASE_URL);
  };

  return (
    <section
      className={`card space-y-3 border-l-4 p-4 sm:p-6 ${TONE[info.verdict]}`}
      aria-labelledby="verdict-heading"
      data-testid="verdict"
      data-verdict={info.verdict}
    >
      <h2 id="verdict-heading" className="text-xl font-bold">
        {info.verdict === 'static' ? '✅' : info.verdict === 'dynamic' ? '⚠️' : '❓'}{' '}
        {t(`expiry.verdict.${key}.title`)}
      </h2>
      <p>{t(`expiry.verdict.${key}.body`, vars)}</p>
      {info.match && (
        <p className="text-sm">
          {t('expiry.source')}:{' '}
          <a href={info.match.source} target="_blank" rel="noopener noreferrer">
            {info.match.service}
          </a>
        </p>
      )}
      {info.host && <p className="hint">{t('expiry.noNetwork')}</p>}
      {info.verdict !== 'static' && (
        <div className="space-y-3 rounded-[10px] bg-surface-2 p-4">
          <h3 className="font-bold">{t('expiry.recreateTitle')}</h3>
          <p className="text-sm">{t('expiry.recreateBody')}</p>
          <FormField label={t('expiry.destination')} error={error ?? undefined}>
            {({ id, describedBy, invalid }) => (
              <input
                id={id}
                className="input"
                type="url"
                value={destination}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                placeholder="https://example.com/menu"
                onChange={(e) => {
                  setDestination(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && recreate()}
              />
            )}
          </FormField>
          <button type="button" className="btn btn-primary" onClick={recreate}>
            {t('expiry.recreate')}
          </button>
        </div>
      )}
      <details>
        <summary className="text-sm font-semibold">{t('expiry.decoded')}</summary>
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-[10px] bg-surface-2 p-3 font-mono text-sm">
          {text}
        </pre>
      </details>
    </section>
  );
}
