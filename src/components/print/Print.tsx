import { useEffect, useMemo, useReducer, useState } from 'react';
import { downloadBlob, renderCanvas } from '../../lib/export';
import type { Locale } from '../../lib/i18n';
import { encodeContent, type QrType } from '../../lib/payloads';
import { canvasMeasurer } from '../../lib/render/canvas';
import { defaultDesign, type QrDesign } from '../../lib/render/design';
import { buildGeometry, type Geometry } from '../../lib/render/geometry';
import { applyPreset } from '../../lib/render/presets';
import {
  buildLayout,
  PAPERS,
  type LayoutId,
  type LayoutOptions,
  type PageLayout,
  type PaperId,
} from '../../lib/print/layouts';
import { loadLastDesign, saveLastDesign } from '../../lib/storage';
import { FormField } from '../common/FormField';
import { Segmented } from '../common/Segmented';
import { Slider } from '../common/Slider';
import { ToastProvider, useToast } from '../common/Toast';
import { I18nProvider, useT } from '../common/i18n';
import { ContentForm } from '../forms/ContentForm';
import { PresetGrid } from '../generator/PresetGrid';
import { TypeTabs } from '../generator/TypeTabs';
import { measureContext, useImage } from '../generator/hooks';
import { initialState, reducer } from '../generator/state';

export default function Print({ locale }: { locale: Locale }) {
  return (
    <I18nProvider locale={locale}>
      <ToastProvider>
        <PrintApp />
      </ToastProvider>
    </I18nProvider>
  );
}

const LAYOUTS: LayoutId[] = ['stickers', 'tent', 'poster', 'cards', 'wifi'];
const TEMPLATE_BY_TYPE: Partial<Record<QrType, string>> = {
  upi: 'pay',
  wifi: 'wifi',
  review: 'review',
  social: 'follow',
};

function PreviewPage({
  layout,
  codeUrl,
  aspect,
}: {
  layout: PageLayout;
  codeUrl: string | null;
  aspect: number;
}) {
  const t = useT();
  const { paper } = layout;
  return (
    <svg
      viewBox={`0 0 ${paper.width} ${paper.height}`}
      role="img"
      aria-label={t('print.previewLabel')}
      className="w-full rounded-md bg-white shadow-sm ring-1 ring-border"
      style={{ aspectRatio: `${paper.width} / ${paper.height}` }}
    >
      {layout.items.map((item, i) => {
        switch (item.kind) {
          case 'code': {
            const w = aspect < 1 ? item.size * aspect : item.size;
            const h = w / aspect;
            const x = item.x + (item.size - w) / 2;
            const y = item.y + (item.size - h) / 2;
            return codeUrl ? (
              <image
                key={i}
                href={codeUrl}
                x={x}
                y={y}
                width={w}
                height={h}
                transform={item.rotate180 ? `rotate(180 ${x + w / 2} ${y + h / 2})` : undefined}
              />
            ) : (
              <rect key={i} x={x} y={y} width={w} height={h} fill="#e5e7eb" />
            );
          }
          case 'text':
            return (
              <text
                key={i}
                x={item.align === 'left' && item.x !== undefined ? item.x : item.cx}
                y={item.cy}
                fontSize={item.size}
                fontWeight={item.bold ? 700 : 500}
                fill="#111"
                textAnchor={item.align === 'left' ? 'start' : 'middle'}
                dominantBaseline="central"
                transform={item.rotate180 ? `rotate(180 ${item.cx} ${item.cy})` : undefined}
                textLength={
                  item.text.length * item.size * 0.55 > item.maxWidth ? item.maxWidth : undefined
                }
                lengthAdjust="spacingAndGlyphs"
              >
                {item.text}
              </text>
            );
          case 'line':
            return (
              <line
                key={i}
                x1={item.x1}
                y1={item.y1}
                x2={item.x2}
                y2={item.y2}
                stroke="#aaa"
                strokeWidth={0.3}
                strokeDasharray={item.dashed ? '2 2' : undefined}
              />
            );
          case 'rect':
            return (
              <rect
                key={i}
                x={item.x}
                y={item.y}
                width={item.w}
                height={item.h}
                rx={item.radius}
                fill="none"
                stroke="#aaa"
                strokeWidth={0.3}
              />
            );
        }
      })}
    </svg>
  );
}

function PrintApp() {
  const t = useT();
  const toast = useToast();
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState('url'));
  const fields = state.fields[state.type];
  const [design, setDesign] = useState<QrDesign>(defaultDesign);
  const [layoutId, setLayoutId] = useState<LayoutId>('stickers');
  const [options, setOptions] = useState<LayoutOptions>({
    paper: 'a4',
    stickerCm: 4,
    gapMm: 6,
    cardSize: 'eu',
    cutLines: true,
  });
  const [headline, setHeadline] = useState('');
  const [subtext, setSubtext] = useState('');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const logo = useImage(design.logo?.dataUrl);

  useEffect(() => setDesign(loadLastDesign() ?? defaultDesign), []);
  // Sensible headline per type, until the user types their own.
  useEffect(() => {
    const key = TEMPLATE_BY_TYPE[state.type];
    setHeadline(key ? t(`print.template.${key}`) : t('frame.defaultLabel.url'));
  }, [state.type, t]);
  useEffect(() => {
    if (state.type === 'wifi') setLayoutId('wifi');
    else if (layoutId === 'wifi') setLayoutId('stickers');
    // Only when the type changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.type]);

  const encoded = useMemo(() => encodeContent({ type: state.type, fields }), [state.type, fields]);
  const geometry: Geometry | null = useMemo(() => {
    if (!encoded.ok) return null;
    try {
      return buildGeometry(encoded.payload, design, { measure: canvasMeasurer(measureContext()) });
    } catch {
      return null;
    }
  }, [encoded, design]);
  const codeUrl = useMemo(() => {
    if (!geometry) return null;
    const canvas = renderCanvas(geometry, 400, logo ?? undefined);
    return 'toDataURL' in canvas ? canvas.toDataURL('image/png') : null;
  }, [geometry, logo]);

  const s = (k: string) => (typeof fields[k] === 'string' ? (fields[k] as string) : '');
  const texts = {
    headline,
    subtext,
    name: name || [s('firstName'), s('lastName')].filter(Boolean).join(' '),
    title: title || s('title'),
    networkLabel: t('print.network'),
    passwordLabel: t('print.password'),
    ssid: s('ssid'),
    password: fields.security === 'nopass' ? '—' : s('password'),
  };
  const layout = buildLayout(layoutId, options, texts);
  const set = (patch: Partial<LayoutOptions>) => setOptions({ ...options, ...patch });

  const download = async () => {
    if (!geometry || !encoded.ok) {
      dispatch({ kind: 'reveal' });
      return;
    }
    setBusy(true);
    try {
      const { layoutToPdf } = await import('../../lib/print/pdf');
      const blob = await layoutToPdf(layout, geometry, `PakkaQR ${t(`print.layouts.${layoutId}`)}`);
      downloadBlob(blob, `pakkaqr-${layoutId}-${layout.paper.id}.pdf`);
    } catch {
      toast({ text: t('errors.export'), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const showPaper = layoutId === 'stickers' || layoutId === 'poster' || layoutId === 'wifi';
  const papers: PaperId[] = layoutId === 'poster' ? ['a4', 'letter', 'a3'] : ['a4', 'letter'];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="space-y-6">
        <section className="card space-y-4 p-4 sm:p-6" aria-labelledby="print-content">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="print-content" className="text-xl font-bold">
              {t('print.content')}
            </h2>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => dispatch({ kind: 'example' })}
            >
              {t('action.example')}
            </button>
          </div>
          <TypeTabs
            value={state.type}
            onChange={(type) => dispatch({ kind: 'type', type })}
            hideHeading
          />
          <ContentForm
            type={state.type}
            fields={fields}
            errors={encoded.ok ? {} : encoded.errors}
            warnings={encoded.warnings}
            visible={(n) => state.revealErrors || !!state.touched[n]}
            onChange={(n, v, extra) =>
              dispatch(
                extra
                  ? { kind: 'field', name: n, value: v, extra }
                  : { kind: 'field', name: n, value: v },
              )
            }
            onBlur={(n) => dispatch({ kind: 'touch', name: n })}
            onEnter={() => undefined}
          />
          <details className="rounded-[10px] border border-border">
            <summary className="flex min-h-11 items-center px-3 font-semibold">
              {t('batch.design')}
            </summary>
            <div className="space-y-3 p-3 pt-0">
              <p className="hint">{t('print.designNote')}</p>
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
        </section>

        <section className="card space-y-4 p-4 sm:p-6" aria-labelledby="print-layout">
          <h2 id="print-layout" className="text-xl font-bold">
            {t('print.layout')}
          </h2>
          <fieldset>
            <legend className="visually-hidden">{t('print.layout')}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {LAYOUTS.map((id) => (
                <label
                  key={id}
                  className={`flex cursor-pointer flex-col gap-1 rounded-[10px] border-2 p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-[var(--focus)] ${
                    layoutId === id ? 'border-accent bg-surface-2' : 'border-border'
                  }`}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <input
                      type="radio"
                      name="print-layout"
                      value={id}
                      checked={layoutId === id}
                      onChange={() => setLayoutId(id)}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                    {t(`print.layouts.${id}`)}
                  </span>
                  <span className="text-sm text-muted">{t(`print.layoutHint.${id}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="card space-y-4 p-4 sm:p-6" aria-labelledby="print-options">
          <h2 id="print-options" className="text-xl font-bold">
            {t('print.options')}
          </h2>
          {showPaper && (
            <Segmented
              label={t('print.paper')}
              value={options.paper}
              options={papers.map((p) => ({ value: p, label: t(`print.papers.${p}`) }))}
              onChange={(paper) => set({ paper })}
            />
          )}
          {layoutId === 'stickers' && (
            <>
              <Slider
                label={t('print.stickerSize')}
                min={2}
                max={10}
                step={0.5}
                value={options.stickerCm}
                display={`${options.stickerCm} cm`}
                onChange={(stickerCm) => set({ stickerCm })}
              />
              <Slider
                label={t('print.gap')}
                min={0}
                max={20}
                value={options.gapMm}
                display={`${options.gapMm} mm`}
                onChange={(gapMm) => set({ gapMm })}
              />
            </>
          )}
          {(layoutId === 'tent' || layoutId === 'poster' || layoutId === 'wifi') && (
            <>
              <FormField label={t('print.templates')}>
                {({ id }) => (
                  <select
                    id={id}
                    className="input"
                    value=""
                    onChange={(e) =>
                      e.target.value && setHeadline(t(`print.template.${e.target.value}`))
                    }
                  >
                    <option value="">—</option>
                    {['pay', 'menu', 'wifi', 'review', 'follow'].map((k) => (
                      <option key={k} value={k}>
                        {t(`print.template.${k}`)}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>
              <FormField label={t('print.headline')}>
                {({ id }) => (
                  <input
                    id={id}
                    className="input"
                    value={headline}
                    maxLength={60}
                    onChange={(e) => setHeadline(e.target.value)}
                  />
                )}
              </FormField>
              {layoutId !== 'wifi' && (
                <FormField label={t('print.subtext')}>
                  {({ id }) => (
                    <input
                      id={id}
                      className="input"
                      value={subtext}
                      maxLength={100}
                      onChange={(e) => setSubtext(e.target.value)}
                    />
                  )}
                </FormField>
              )}
            </>
          )}
          {layoutId === 'cards' && (
            <>
              <Segmented
                label={t('print.cardSize')}
                value={options.cardSize}
                options={(['eu', 'us'] as const).map((v) => ({
                  value: v,
                  label: t(`print.cardSizes.${v}`),
                }))}
                onChange={(cardSize) => set({ cardSize })}
              />
              <FormField label={t('print.name')}>
                {({ id }) => (
                  <input
                    id={id}
                    className="input"
                    value={name}
                    maxLength={40}
                    placeholder={texts.name}
                    onChange={(e) => setName(e.target.value)}
                  />
                )}
              </FormField>
              <FormField label={t('print.title')}>
                {({ id }) => (
                  <input
                    id={id}
                    className="input"
                    value={title}
                    maxLength={60}
                    placeholder={texts.title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                )}
              </FormField>
            </>
          )}
          {(layoutId === 'stickers' || layoutId === 'cards') && (
            <label className="flex min-h-11 items-center gap-3 font-medium">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--accent)]"
                checked={options.cutLines}
                onChange={(e) => set({ cutLines: e.target.checked })}
              />
              {t('print.cutLines')}
            </label>
          )}
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4" aria-label={t('print.previewLabel')}>
        <div className="card space-y-4 p-4">
          <PreviewPage
            layout={layout}
            codeUrl={codeUrl}
            aspect={geometry ? geometry.width / geometry.height : 1}
          />
          <p className="text-center text-xs text-muted">
            {t(`print.papers.${layout.paper.id}`)} · {PAPERS[layout.paper.id].width} ×{' '}
            {PAPERS[layout.paper.id].height} mm
          </p>
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={busy}
            onClick={() => void download()}
            data-testid="print-download"
          >
            {busy ? t('print.working') : t('print.download')}
          </button>
          <p className="hint">{t('print.printNote')}</p>
        </div>
      </aside>
    </div>
  );
}
