import Papa from 'papaparse';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  autoMap,
  BATCH_WARN_ROWS,
  exampleCsv,
  FILENAME_COLUMN,
  mappableFields,
  parseCsv,
  prepareBatch,
  type Mapping,
  type ParsedCsv,
} from '../../lib/batch';
import type { BatchOutput } from '../../lib/batch/generate';
import { downloadBlob, PNG_SIZES } from '../../lib/export';
import type { Locale } from '../../lib/i18n';
import { qrTypes, type QrType } from '../../lib/payloads';
import { defaultDesign, type QrDesign } from '../../lib/render/design';
import { applyPreset } from '../../lib/render/presets';
import { loadLastDesign, saveLastDesign } from '../../lib/storage';
import type { BatchMessage, BatchRequest } from '../../workers/batch.worker';
import { Dropzone } from '../common/Dropzone';
import { FormField } from '../common/FormField';
import { ToastProvider } from '../common/Toast';
import { I18nProvider, useT } from '../common/i18n';
import { PresetGrid } from '../generator/PresetGrid';
import { Numbered } from './Numbered';

export default function Batch({ locale }: { locale: Locale }) {
  return (
    <I18nProvider locale={locale}>
      <ToastProvider>
        <BatchApp />
      </ToastProvider>
    </I18nProvider>
  );
}

function stamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

function BatchApp() {
  const t = useT();
  const [type, setType] = useState<QrType>('url');
  const [csvText, setCsvText] = useState('');
  const [mapping, setMapping] = useState<Mapping>({});
  const [design, setDesign] = useState<QrDesign>(defaultDesign);
  const [png, setPng] = useState(true);
  const [svg, setSvg] = useState(false);
  const [pdf, setPdf] = useState(false);
  const [size, setSize] = useState(1024);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ zip: Blob; pdf: Blob | null; count: number } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const worker = useRef<Worker | null>(null);

  useEffect(() => {
    setDesign(loadLastDesign() ?? defaultDesign);
    return () => worker.current?.terminate();
  }, []);

  const parsed: ParsedCsv = useMemo(
    () => (csvText.trim() ? parseCsv(csvText) : { headers: [], rows: [] }),
    [csvText],
  );
  useEffect(() => setMapping(autoMap(type, parsed.headers)), [type, parsed.headers]);
  const prepared = useMemo(() => prepareBatch(type, parsed, mapping), [type, parsed, mapping]);
  const previewRows = parsed.rows.slice(0, 5).map((_, i) => {
    const row = i + 1;
    const item = prepared.items.find((x) => x.row === row);
    const error = prepared.errors.find((x) => x.row === row);
    return { row, item, error };
  });
  const running = progress !== null && progress.done < progress.total && !result;

  const errorsCsv = () =>
    Papa.unparse([
      ['row', 'field', 'problem'],
      ...prepared.errors.flatMap((e) =>
        Object.entries(e.errors).map(([field, key]) => [String(e.row), field, t(key)]),
      ),
    ]);

  const generate = async () => {
    setFailure(null);
    setResult(null);
    const items = prepared.items;
    setProgress({ done: 0, total: items.length });
    const options = {
      design,
      png,
      svg,
      size,
      collectPngs: pdf,
      ...(prepared.errors.length ? { extraFiles: { 'errors.csv': errorsCsv() } } : {}),
    };
    const finish = async (out: Pick<BatchOutput, 'zip' | 'pngs'>) => {
      let pdfBlob: Blob | null = null;
      if (pdf) {
        const { codesToPdf } = await import('../../lib/print/pdf');
        pdfBlob = await codesToPdf(out.pngs, 60, 'PakkaQR');
      }
      setResult({ zip: out.zip, pdf: pdfBlob, count: items.length });
      downloadBlob(out.zip, `pakkaqr-batch-${stamp()}.zip`);
      if (pdfBlob) downloadBlob(pdfBlob, `pakkaqr-batch-${stamp()}.pdf`);
    };
    const canUseWorker = typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';
    if (canUseWorker) {
      worker.current?.terminate();
      const w = new Worker(new URL('../../workers/batch.worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.current = w;
      w.onmessage = (e: MessageEvent<BatchMessage>) => {
        const msg = e.data;
        if (msg.kind === 'progress') setProgress({ done: msg.done, total: msg.total });
        else if (msg.kind === 'done') void finish(msg).finally(() => w.terminate());
        else {
          setFailure(msg.message);
          setProgress(null);
        }
      };
      w.postMessage({ items, options } satisfies BatchRequest);
    } else {
      setFailure(t('batch.workerFallback'));
      const { generateBatch } = await import('../../lib/batch/generate');
      const { loadBatchLogo } = await import('./logo');
      const logo = await loadBatchLogo(design);
      const out = await generateBatch(
        items,
        options,
        logo,
        (done, total) => setProgress({ done, total }),
        5,
      );
      await finish(out);
    }
  };

  return (
    <div className="space-y-6">
      <section className="card space-y-4 p-4 sm:p-6" aria-labelledby="batch-step1">
        <h2 id="batch-step1" className="text-xl font-bold">
          {t('batch.step1')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('batch.type')}>
            {({ id }) => (
              <select
                id={id}
                className="input"
                value={type}
                onChange={(e) => setType(e.target.value as QrType)}
                data-testid="batch-type"
              >
                {qrTypes.map((q) => (
                  <option key={q} value={q}>
                    {t(`type.${q}`)}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <div className="flex items-end">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                downloadBlob(
                  new Blob([exampleCsv(type)], { type: 'text/csv' }),
                  `pakkaqr-example-${type}.csv`,
                )
              }
            >
              {t('batch.example')}
            </button>
          </div>
        </div>
        <Numbered type={type} onCsv={setCsvText} />
        <Dropzone
          accept=".csv,text/csv,text/plain"
          label={t('batch.upload')}
          onFile={(f) => void f.text().then(setCsvText)}
        >
          <p className="hint">{t('batch.drop')}</p>
        </Dropzone>
        <FormField label={t('batch.paste')}>
          {({ id }) => (
            <textarea
              id={id}
              className="input font-mono text-sm"
              rows={6}
              value={csvText}
              spellCheck={false}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={'url,filename\nexample.com/menu,menu\nexample.com/offers,offers'}
              data-testid="batch-csv"
            />
          )}
        </FormField>
        {parsed.rows.length > 0 && (
          <p className="text-sm" data-testid="batch-rows">
            {t('batch.rows', { count: parsed.rows.length })}
          </p>
        )}
        {parsed.rows.length > BATCH_WARN_ROWS && (
          <p className="warning-text">{t('batch.tooMany', { count: parsed.rows.length })}</p>
        )}
      </section>

      {parsed.headers.length > 0 && (
        <section className="card space-y-4 p-4 sm:p-6" aria-labelledby="batch-step2">
          <h2 id="batch-step2" className="text-xl font-bold">
            {t('batch.step2')}
          </h2>
          <p className="text-sm text-muted">{t('batch.mapping')}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mappableFields(type).map((field) => (
              <FormField
                key={field}
                label={
                  field === FILENAME_COLUMN ? t('batch.fileNameField') : t(`field.${type}.${field}`)
                }
              >
                {({ id }) => (
                  <select
                    id={id}
                    className="input"
                    value={mapping[field] ?? ''}
                    onChange={(e) =>
                      setMapping({
                        ...mapping,
                        [field]: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                  >
                    <option value="">{t('batch.notMapped')}</option>
                    {parsed.headers.map((h, i) => (
                      <option key={`${h}-${i}`} value={i}>
                        {h || `#${i + 1}`}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="mb-2 text-left font-semibold">{t('batch.preview')}</caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="py-2 pr-3">
                    {t('batch.row')}
                  </th>
                  <th scope="col" className="py-2 pr-3">
                    {t('batch.payload')}
                  </th>
                  <th scope="col" className="py-2">
                    {t('batch.status')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map(({ row, item, error }) => (
                  <tr key={row} className="border-b border-border align-top">
                    <td className="py-2 pr-3">{row}</td>
                    <td className="max-w-xs truncate py-2 pr-3 font-mono">
                      {item?.payload ?? '—'}
                    </td>
                    <td className="py-2">
                      {item ? (
                        <span className="text-success">✓ {t('batch.ok')}</span>
                      ) : (
                        <span className="text-danger">
                          {Object.values(error?.errors ?? {})
                            .map((k) => t(k))
                            .join(' ')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {parsed.rows.length > 0 && (
        <section className="card space-y-4 p-4 sm:p-6" aria-labelledby="batch-step3">
          <h2 id="batch-step3" className="text-xl font-bold">
            {t('batch.step3')}
          </h2>
          <fieldset className="flex flex-wrap gap-x-6 gap-y-2">
            <legend className="label">{t('batch.formats')}</legend>
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--accent)]"
                checked={png}
                onChange={(e) => setPng(e.target.checked)}
              />
              {t('batch.png')}
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--accent)]"
                checked={svg}
                onChange={(e) => setSvg(e.target.checked)}
              />
              {t('batch.svg')}
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--accent)]"
                checked={pdf}
                onChange={(e) => setPdf(e.target.checked)}
              />
              {t('batch.pdf')}
            </label>
          </fieldset>
          <FormField label={t('batch.size')} className="max-w-xs">
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
          <details className="rounded-[10px] border border-border">
            <summary className="flex min-h-11 items-center px-3 font-semibold">
              {t('batch.design')}
            </summary>
            <div className="space-y-3 p-3 pt-0">
              <p className="hint">{t('batch.designNote')}</p>
              <PresetGrid
                design={design}
                onApply={(p) => {
                  const d = applyPreset(design, p);
                  setDesign(d);
                  saveLastDesign(d);
                }}
              />
            </div>
          </details>
          {prepared.items.length === 0 ? (
            <p className="warning-text">{t('batch.noValid')}</p>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={running || (!png && !svg && !pdf)}
              onClick={() => void generate()}
              data-testid="batch-generate"
            >
              {t('batch.generate', { count: prepared.items.length })}
            </button>
          )}
          {progress && (
            <div className="space-y-1">
              <progress
                className="h-3 w-full accent-[var(--accent)]"
                max={progress.total}
                value={progress.done}
                aria-label={t('batch.progressLabel')}
              />
              <p className="text-sm" aria-live="polite" data-testid="batch-progress">
                {result
                  ? t('batch.done', { count: result.count })
                  : t('batch.progress', { done: progress.done, total: progress.total })}
              </p>
            </div>
          )}
          {result && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => downloadBlob(result.zip, `pakkaqr-batch-${stamp()}.zip`)}
              >
                {t('batch.downloadZip')}
              </button>
              {result.pdf && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => downloadBlob(result.pdf!, `pakkaqr-batch-${stamp()}.pdf`)}
                >
                  {t('batch.downloadPdf')}
                </button>
              )}
            </div>
          )}
          {failure && <p className="warning-text">{failure}</p>}
          {prepared.errors.length > 0 && (
            <div
              className="rounded-[10px] border-l-4 border-warning bg-surface-2 p-3 text-sm"
              data-testid="batch-errors"
            >
              <p className="font-semibold">
                {t('batch.errorsTitle', { count: prepared.errors.length })}
              </p>
              <p className="hint">{t('batch.errorsNote')}</p>
              <ul className="mt-2 max-h-48 list-disc overflow-auto pl-5">
                {prepared.errors.slice(0, 100).map((e) => (
                  <li key={e.row}>
                    {t('batch.row')} {e.row}:{' '}
                    {Object.values(e.errors)
                      .map((k) => t(k))
                      .join(' ')}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
