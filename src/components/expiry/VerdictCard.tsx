import { useState } from 'react';
import { canvasToBlob, canShareFiles, downloadBlob, renderCanvas } from '../../lib/export';
import { buildGeometry } from '../../lib/render/geometry';
import { defaultDesign } from '../../lib/render/design';
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

/** A shareable "is your QR rented?" card with a code that leads back to this checker. */
async function shareCheck(verdict: Classification['verdict'], headline: string, subline: string) {
  const { drawCard, CARD_SIZES } = await import('../../lib/export/card');
  const url = window.location.href.split('#')[0]!.split('?')[0]!;
  const g = buildGeometry(url, { ...defaultDesign, fg: '#1A1712', bg: '#FFFCF6' });
  const qr = renderCanvas(g, 800);
  const size = CARD_SIZES.post;
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  drawCard(ctx, qr, g.height / g.width, {
    format: 'post',
    theme: verdict === 'dynamic' ? 'ink' : 'paper',
    headline,
    subline,
    stamp: verdict === 'static',
    credit: false,
    creditText: '',
    stampColor: '#C2321A',
    codeColor: '#1A1712',
  });
  const blob = await canvasToBlob(canvas, 'image/png');
  const file = new File([blob], 'pakkaqr-expiry-check.png', { type: 'image/png' });
  if (canShareFiles() && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] });
  } else {
    downloadBlob(blob, file.name);
  }
}

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
      className={`card space-y-4 border-l-4 p-5 sm:p-7 ${TONE[info.verdict]}`}
      aria-labelledby="verdict-heading"
      data-testid="verdict"
      data-verdict={info.verdict}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h2 id="verdict-heading" className="max-w-[24ch] text-3xl">
          {t(`expiry.verdict.${key}.title`)}
        </h2>
        <div
          className={`stamp stamp-sm ${info.verdict === 'static' ? '!text-success' : ''}`}
          data-status={info.verdict === 'shortener' ? 'risky' : undefined}
          data-animate="true"
          aria-hidden="true"
        >
          <span className="stamp-top">{t('expiryStamp.top')}</span>
          <span className="stamp-main">{t(`expiryStamp.${info.verdict}.main`)}</span>
          <span className="stamp-bottom stamp-hi" lang="hi">
            {t(`expiryStamp.${info.verdict}.hi`)}
          </span>
        </div>
      </div>
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
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() =>
          void shareCheck(
            info.verdict,
            t(
              info.verdict === 'static'
                ? 'expiryShare.safe'
                : info.verdict === 'dynamic'
                  ? 'expiryShare.rented'
                  : 'expiryShare.unknown',
            ),
            t('expiryShare.subline'),
          ).catch(() => undefined)
        }
      >
        {t('expiryShare.button')}
      </button>
      <details>
        <summary className="text-sm font-semibold">{t('expiry.decoded')}</summary>
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-[10px] bg-surface-2 p-3 font-mono text-sm">
          {text}
        </pre>
      </details>
    </section>
  );
}
