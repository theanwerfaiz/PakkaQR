import { forwardRef, useState } from 'react';
import { PNG_SIZES, type ExportFormat } from '../../lib/export';
import { FormField } from '../common/FormField';
import { useT } from '../common/i18n';

export type ExportAction = ExportFormat | 'copy' | 'share';

export interface ExportRequest {
  action: ExportAction;
  size: number;
  pdfWidthCm: number;
}

interface Props {
  disabled: boolean;
  busy: boolean;
  fileName: string;
  defaultName: string;
  onFileName: (name: string) => void;
  onExport: (request: ExportRequest) => void;
  canCopy: boolean;
  canShare: boolean;
}

export const ExportPanel = forwardRef<HTMLButtonElement, Props>(function ExportPanel(
  { disabled, busy, fileName, defaultName, onFileName, onExport, canCopy, canShare },
  pngButton,
) {
  const t = useT();
  const [size, setSize] = useState(1024);
  const [pdfWidthCm, setPdfWidthCm] = useState(5);
  const run = (action: ExportAction) => onExport({ action, size, pdfWidthCm });
  return (
    <section aria-labelledby="export-heading" className="space-y-3">
      <h2 id="export-heading" className="visually-hidden">
        {t('export.heading')}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <FormField label={t('export.size')}>
          {({ id }) => (
            <select
              id={id}
              className="input"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            >
              {PNG_SIZES.map((s) => (
                <option key={s} value={s}>
                  {t('export.sizeOption', { size: s })}
                </option>
              ))}
            </select>
          )}
        </FormField>
        <FormField label={t('export.fileName')}>
          {({ id }) => (
            <input
              id={id}
              className="input"
              value={fileName}
              placeholder={defaultName}
              spellCheck={false}
              onChange={(e) => onFileName(e.target.value)}
            />
          )}
        </FormField>
      </div>
      <div className="flex gap-2">
        <button
          ref={pngButton}
          type="button"
          className="btn btn-primary flex-1"
          disabled={disabled || busy}
          aria-busy={busy || undefined}
          onClick={() => run('png')}
          data-testid="download-png"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
          </svg>
          {busy ? t('export.working') : t('export.png')}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={disabled || busy}
          onClick={() => run('svg')}
          aria-label={t('export.svgLong')}
          data-testid="download-svg"
        >
          {t('export.svg')}
        </button>
      </div>
      <details className="rounded-[10px] border border-border">
        <summary className="flex min-h-11 items-center px-3 text-sm font-semibold">
          {t('export.more')}
        </summary>
        <div className="grid gap-2 p-3 pt-0">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={disabled || busy}
            onClick={() => run('jpeg')}
            data-testid="download-jpeg"
          >
            {t('export.jpeg')}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={disabled || busy}
            onClick={() => run('webp')}
            data-testid="download-webp"
          >
            {t('export.webp')}
          </button>
          <div className="flex items-end gap-2">
            <FormField label={t('export.pdfWidth')} className="flex-1">
              {({ id }) => (
                <div className="flex items-center gap-2">
                  <input
                    id={id}
                    className="input"
                    type="number"
                    min={1}
                    max={19}
                    step={0.5}
                    value={pdfWidthCm}
                    onChange={(e) =>
                      setPdfWidthCm(Math.min(19, Math.max(1, Number(e.target.value) || 5)))
                    }
                  />
                  <span className="text-sm text-muted">{t('export.unitCm')}</span>
                </div>
              )}
            </FormField>
            <button
              type="button"
              className="btn btn-secondary btn-sm min-h-11"
              disabled={disabled || busy}
              onClick={() => run('pdf')}
              data-testid="download-pdf"
            >
              {t('export.pdf')}
            </button>
          </div>
          {canCopy && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={disabled || busy}
              onClick={() => run('copy')}
            >
              {t('export.copy')}
            </button>
          )}
          {canShare && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={disabled || busy}
              onClick={() => run('share')}
            >
              {t('export.share')}
            </button>
          )}
          <p className="hint">{t('export.svgTip')}</p>
        </div>
      </details>
      <p className="text-center text-xs text-muted">{t('export.promise')}</p>
    </section>
  );
});
