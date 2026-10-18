import { useEffect, useMemo, useState } from 'react';
import {
  barcodeFormats,
  barcodeSvg,
  defaultBarcodeStyle,
  drawBarcode,
  encodeBarcode,
  layoutBarcode,
  type BarcodeFormat,
  type BarcodeStyle,
} from '../../lib/barcode';
import { canvasToBlob, downloadBlob } from '../../lib/export';
import type { Locale } from '../../lib/i18n';
import { contrastRatio, CONTRAST_WARN } from '../../lib/scannability/checks';
import { ColorField } from '../common/ColorField';
import { Segmented } from '../common/Segmented';
import { Slider } from '../common/Slider';
import { ToastProvider, useToast } from '../common/Toast';
import { I18nProvider, useT } from '../common/i18n';
import { Stamp, type StampStatus } from '../generator/Stamp';

export default function BarcodeTool({ locale }: { locale: Locale }) {
  return (
    <I18nProvider locale={locale}>
      <ToastProvider>
        <BarcodeApp />
      </ToastProvider>
    </I18nProvider>
  );
}

const EXAMPLE: Record<BarcodeFormat, string> = {
  ean13: '890123456789',
  upca: '03600029145',
  ean8: '9638507',
  code128: 'SKU-CHAI-042',
};

const PX = 4; // pixels per module for PNG and the scan test

function renderCanvas(format: BarcodeFormat, value: string, style: BarcodeStyle, px = PX) {
  const r = encodeBarcode(format, value);
  if (!r.ok) return null;
  const layout = layoutBarcode(format, r, style);
  const canvas = document.createElement('canvas');
  canvas.width = layout.width * px;
  canvas.height = layout.height * px;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  drawBarcode(ctx, layout, style, px);
  return { canvas, layout, result: r };
}

function BarcodeApp() {
  const t = useT();
  const toast = useToast();
  const [format, setFormat] = useState<BarcodeFormat>('ean13');
  const [value, setValue] = useState(EXAMPLE.ean13);
  const [style, setStyle] = useState<BarcodeStyle>(defaultBarcodeStyle);
  const [many, setMany] = useState(false);
  const [list, setList] = useState('');
  const [status, setStatus] = useState<StampStatus | null>(null);

  const result = useMemo(() => encodeBarcode(format, value), [format, value]);
  const svg = useMemo(() => {
    if (!result.ok) return null;
    return barcodeSvg(layoutBarcode(format, result, style), style, `${format} ${result.value}`, 3);
  }, [format, result, style]);
  const lowContrast = contrastRatio(style.fg, style.bg) < CONTRAST_WARN;

  // Scan test: decode the rendered barcode with ZXing (loaded on demand).
  useEffect(() => {
    if (!result.ok) {
      setStatus(null);
      return;
    }
    setStatus('checking');
    let live = true;
    const timer = setTimeout(() => {
      void import('../../lib/barcode/decode').then(({ decodeBarcode }) => {
        const r = renderCanvas(format, value, style);
        if (!r || !live) return;
        const ctx = r.canvas.getContext('2d')!;
        const px = ctx.getImageData(0, 0, r.canvas.width, r.canvas.height).data;
        const text = decodeBarcode(px, r.canvas.width, r.canvas.height, format);
        if (live) setStatus(text === r.result.value ? (lowContrast ? 'risky' : 'great') : 'fail');
      });
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [format, value, style, result.ok, lowContrast]);

  const name = (v: string) => `barcode-${format}-${v.replace(/[^\w-]+/g, '_').slice(0, 40)}`;

  const downloadPng = async () => {
    const r = renderCanvas(format, value, style, 8);
    if (!r) return;
    downloadBlob(await canvasToBlob(r.canvas, 'image/png'), `${name(r.result.value)}.png`);
  };
  const downloadSvg = () => {
    if (!svg || !result.ok) return;
    downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${name(result.value)}.svg`);
  };

  const lines = list
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const checked = lines.map((l) => ({ input: l, r: encodeBarcode(format, l) }));
  const bad = checked.filter((c) => !c.r.ok);
  const downloadZip = async () => {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    for (const c of checked) {
      if (!c.r.ok) continue;
      const layout = layoutBarcode(format, c.r, style);
      zip.file(`${name(c.r.value)}.svg`, barcodeSvg(layout, style, `${format} ${c.r.value}`, 3));
    }
    downloadBlob(await zip.generateAsync({ type: 'blob' }), `barcodes-${format}.zip`);
    toast({ text: t('barcode.zipped', { count: checked.length - bad.length }), tone: 'success' });
  };

  return (
    <div className="grid overflow-clip rounded-[28px] bg-surface shadow-[var(--shadow-card)] lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)]">
      <div className="flex flex-col gap-6 p-5 sm:p-8">
        <Segmented
          label={t('barcode.format')}
          value={format}
          options={barcodeFormats.map((f) => ({ value: f, label: t(`barcode.formats.${f}`) }))}
          onChange={(f) => {
            setFormat(f);
            setValue(EXAMPLE[f]);
          }}
          hint={t(`barcode.formatHint.${format}`)}
        />
        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-[14px] bg-soft/70 px-4 py-3 font-semibold">
          <span>
            {t('barcode.many')}
            <span className="hint block font-normal">{t('barcode.manyHint')}</span>
          </span>
          <input type="checkbox" checked={many} onChange={(e) => setMany(e.target.checked)} />
        </label>
        {!many ? (
          <div>
            <label className="label" htmlFor="barcode-value">
              {t(format === 'code128' ? 'barcode.text' : 'barcode.number')}
            </label>
            <input
              id="barcode-value"
              className="input font-mono"
              value={value}
              inputMode={format === 'code128' ? 'text' : 'numeric'}
              spellCheck={false}
              aria-invalid={!result.ok || undefined}
              aria-describedby="barcode-value-msg"
              onChange={(e) => setValue(e.target.value)}
              data-testid="barcode-input"
            />
            <p id="barcode-value-msg" className={result.ok ? 'hint' : 'error-text'}>
              {result.ok
                ? format === 'code128'
                  ? t('barcode.okText')
                  : t('barcode.okNumber', { value: result.value })
                : t(result.error)}
            </p>
          </div>
        ) : (
          <div>
            <label className="label" htmlFor="barcode-list">
              {t('barcode.list')}
            </label>
            <textarea
              id="barcode-list"
              className="input min-h-40 font-mono"
              value={list}
              placeholder={`${EXAMPLE[format]}\n…`}
              onChange={(e) => setList(e.target.value)}
            />
            <p className={bad.length ? 'error-text' : 'hint'}>
              {bad.length
                ? t('barcode.listBad', { count: bad.length, first: bad[0]!.input })
                : t('barcode.listOk', { count: lines.length })}
            </p>
          </div>
        )}
        <Slider
          label={t('barcode.height')}
          min={30}
          max={120}
          step={5}
          value={style.height}
          onChange={(height) => setStyle({ ...style, height })}
        />
        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 font-semibold">
          {t('barcode.showText')}
          <input
            type="checkbox"
            checked={style.showText}
            onChange={(e) => setStyle({ ...style, showText: e.target.checked })}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField
            label={t('design.fg')}
            value={style.fg}
            onChange={(fg) => setStyle({ ...style, fg })}
          />
          <ColorField
            label={t('design.bg')}
            value={style.bg}
            onChange={(bg) => setStyle({ ...style, bg })}
          />
        </div>
        {lowContrast && <p className="note text-[0.95rem]">{t('status.reason.contrast')}</p>}
      </div>

      <div className="flex flex-col gap-5 bg-soft/70 p-5 sm:p-7">
        <div className="relative flex min-h-[300px] items-center justify-center rounded-[22px] bg-surface p-8 pt-20 shadow-[var(--shadow-sheet)]">
          {svg ? (
            <div
              className="w-full max-w-[380px] [&>svg]:h-auto [&>svg]:w-full"
              role="img"
              aria-label={t('barcode.alt', { value: result.ok ? result.value : '' })}
              data-testid="barcode-preview"
              // Our own SVG: every value is escaped in barcodeSvg.
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <p className="text-muted">{t('barcode.placeholder')}</p>
          )}
          {status && (
            <div className="absolute top-2 right-3">
              <Stamp small status={status} stampKey={status} />
            </div>
          )}
        </div>
        <p
          role="status"
          className="text-[0.95rem] font-semibold"
          data-testid="barcode-status"
          data-status={status ?? 'idle'}
        >
          {status ? t(`barcode.status.${status}`) : ''}
        </p>
        {!many ? (
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!result.ok}
              onClick={downloadSvg}
              data-testid="barcode-svg"
            >
              {t('barcode.downloadSvg')}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!result.ok}
              onClick={() => void downloadPng()}
              data-testid="barcode-png"
            >
              PNG
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={checked.length - bad.length === 0}
            onClick={() => void downloadZip()}
          >
            {t('barcode.downloadZip', { count: checked.length - bad.length })}
          </button>
        )}
        <p className="hint">{t('barcode.gs1')}</p>
      </div>
    </div>
  );
}
