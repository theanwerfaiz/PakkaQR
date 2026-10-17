import { useState } from 'react';
import { useT } from '../common/i18n';

interface Props {
  onWorked: () => void;
  onFix: () => void;
  onDismiss: () => void;
}

/** After a download: "scan it with your phone right now" — a real-world check and a first-timer's lesson. */
export function ScanMe({ onWorked, onFix, onDismiss }: Props) {
  const t = useT();
  const [state, setState] = useState<'ask' | 'worked' | 'failed'>('ask');
  return (
    <section
      aria-labelledby="scanme-heading"
      className="rise rounded-[16px] border-2 border-dashed border-border-strong p-4"
      data-testid="scan-me"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 id="scanme-heading" className="text-xl">
          {t(`scanMe.${state}.title`)}
        </h3>
        <button
          type="button"
          className="btn btn-ghost btn-sm min-w-10 px-0"
          onClick={onDismiss}
          aria-label={t('modal.close')}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      {state === 'ask' && (
        <>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[0.95rem] text-muted">
            <li>{t('scanMe.ask.step1')}</li>
            <li>{t('scanMe.ask.step2')}</li>
            <li>{t('scanMe.ask.step3')}</li>
          </ol>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setState('worked');
                onWorked();
              }}
            >
              {t('scanMe.ask.yes')}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setState('failed')}
            >
              {t('scanMe.ask.no')}
            </button>
          </div>
        </>
      )}
      {state === 'worked' && <p className="mt-2 text-muted">{t('scanMe.worked.body')}</p>}
      {state === 'failed' && (
        <>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.95rem] text-muted">
            <li>{t('scanMe.failed.tip1')}</li>
            <li>{t('scanMe.failed.tip2')}</li>
            <li>{t('scanMe.failed.tip3')}</li>
          </ul>
          <button type="button" className="btn btn-primary btn-sm mt-3" onClick={onFix}>
            {t('scanMe.failed.fix')}
          </button>
        </>
      )}
    </section>
  );
}
