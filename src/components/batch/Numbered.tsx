import { useEffect, useState } from 'react';
import { seriesCsv, SERIES_MAX } from '../../lib/batch/numbered';
import { encoders, type QrType } from '../../lib/payloads';
import { useT } from '../common/i18n';

interface Props {
  type: QrType;
  onCsv: (csv: string) => void;
}

/** "Table 1 to 50": fills the bulk CSV with a numbered series. */
export function Numbered({ type, onCsv }: Props) {
  const t = useT();
  const column = Object.keys(encoders[type].defaults)[0] ?? 'text';
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(20);
  const [pad, setPad] = useState(2);
  const [template, setTemplate] = useState('https://example.com/menu?table={n}');
  const [fileName, setFileName] = useState('table-{n}');
  useEffect(() => {
    if (window.location.hash === '#numbered') setOpen(true);
  }, []);
  const csv = seriesCsv({ from, to, pad, template, column, fileName });
  const num = (v: string) => Math.max(0, Math.floor(Number(v) || 0));
  return (
    <details
      id="numbered"
      className="rounded-[18px] bg-soft/60"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex min-h-14 items-center justify-between gap-2 px-5 font-semibold">
        <span>
          {t('numbered.title')}
          <span className="hint block font-normal">{t('numbered.hint')}</span>
        </span>
      </summary>
      <div className="flex flex-col gap-4 px-5 pb-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="num-from">
              {t('numbered.from')}
            </label>
            <input
              id="num-from"
              className="input"
              inputMode="numeric"
              value={from}
              onChange={(e) => setFrom(num(e.target.value))}
            />
          </div>
          <div>
            <label className="label" htmlFor="num-to">
              {t('numbered.to')}
            </label>
            <input
              id="num-to"
              className="input"
              inputMode="numeric"
              value={to}
              onChange={(e) => setTo(num(e.target.value))}
            />
          </div>
          <div>
            <label className="label" htmlFor="num-pad">
              {t('numbered.pad')}
            </label>
            <select
              id="num-pad"
              className="input"
              value={pad}
              onChange={(e) => setPad(Number(e.target.value))}
            >
              {[0, 2, 3, 4].map((p) => (
                <option key={p} value={p}>
                  {p ? '0'.repeat(p - 1) + '1' : '1'}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="num-template">
            {t('numbered.template', { field: t(`field.${type}.${column}`) })}
          </label>
          <input
            id="num-template"
            className="input font-mono"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
          />
          <p className="hint">{t('numbered.templateHint')}</p>
        </div>
        <div>
          <label className="label" htmlFor="num-file">
            {t('numbered.fileName')}
          </label>
          <input
            id="num-file"
            className="input font-mono"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary self-start"
          disabled={!csv}
          onClick={() => csv && onCsv(csv)}
          data-testid="numbered-fill"
        >
          {csv
            ? t('numbered.fill', { count: to - from + 1 })
            : t('numbered.invalid', { max: SERIES_MAX })}
        </button>
      </div>
    </details>
  );
}
