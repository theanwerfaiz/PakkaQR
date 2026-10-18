import { memo, useEffect, useRef, useState } from 'react';
import { templateCategories, TEMPLATES, type TemplateDef } from '../../data/templates';
import { localePath, type Locale } from '../../lib/i18n';
import { encoders } from '../../lib/payloads';
import { drawGeometry, pixelHeight } from '../../lib/render/canvas';
import { defaultDesign, type QrDesign } from '../../lib/render/design';
import { buildGeometry } from '../../lib/render/geometry';
import { styledDesign } from '../../lib/render/presets';
import { encodeContent } from '../../lib/payloads';
import { HANDOFF_DESIGN_KEY, HANDOFF_KEY, writeSession } from '../../lib/storage/local';
import { I18nProvider, useI18n } from '../common/i18n';

export default function Templates({ locale }: { locale: Locale }) {
  return (
    <I18nProvider locale={locale}>
      <Gallery />
    </I18nProvider>
  );
}

function designFor(tpl: TemplateDef, label: string): QrDesign {
  return styledDesign(defaultDesign, tpl.preset, tpl.frame, label);
}

// Thumbnails are drawn one per idle slot, so the page stays responsive.
const queue: Array<() => void> = [];
let pumping = false;
function pump() {
  const job = queue.shift();
  if (!job) {
    pumping = false;
    return;
  }
  job();
  if ('requestIdleCallback' in window) requestIdleCallback(pump, { timeout: 500 });
  else setTimeout(pump, 16);
}
function enqueue(job: () => void) {
  queue.push(job);
  if (!pumping) {
    pumping = true;
    if ('requestIdleCallback' in window) requestIdleCallback(pump, { timeout: 500 });
    else setTimeout(pump, 16);
  }
}

const Thumb = memo(function Thumb({ tpl, label }: { tpl: TemplateDef; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const draw = () => {
      const c = ref.current;
      const ctx = c?.getContext('2d');
      if (!c || !ctx) return;
      const encoded = encodeContent({ type: tpl.type, fields: encoders[tpl.type].example });
      if (!encoded.ok) return;
      const g = buildGeometry(encoded.payload, {
        ...designFor(tpl, label),
        ecLevel: 'L',
        margin: 2,
      });
      const w = 360;
      c.width = w;
      c.height = pixelHeight(g, w);
      drawGeometry(ctx, g, { width: w });
    };
    let cancelled = false;
    enqueue(() => {
      if (!cancelled) draw();
    });
    return () => {
      cancelled = true;
    };
  }, [tpl, label]);
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="h-auto max-h-full w-full max-w-[200px] object-contain"
    />
  );
});

/** Sends a template to the generator (session storage only) and opens it. */
function openTemplate(tpl: TemplateDef, label: string, locale: Locale) {
  writeSession(
    HANDOFF_KEY,
    JSON.stringify({ type: tpl.type, fields: { ...encoders[tpl.type].example, ...tpl.fields } }),
  );
  writeSession(HANDOFF_DESIGN_KEY, JSON.stringify(designFor(tpl, label)));
  window.location.href = localePath(locale, '', import.meta.env.BASE_URL);
}

function Gallery() {
  const { t, locale } = useI18n();
  const [cat, setCat] = useState<string>('all');

  // Deep link from search: ?use=<template id>
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('use');
    const tpl = TEMPLATES.find((x) => x.id === id);
    if (tpl) openTemplate(tpl, t(`template.${tpl.id}.label`), locale);
  }, [t, locale]);

  const shown = cat === 'all' ? TEMPLATES : TEMPLATES.filter((x) => x.category === cat);
  return (
    <div className="flex flex-col gap-6">
      <div role="group" aria-label={t('template.filter')} className="flex flex-wrap gap-2">
        {['all', ...templateCategories].map((c) => (
          <button
            key={c}
            type="button"
            className="chip"
            aria-pressed={cat === c}
            onClick={() => setCat(c)}
          >
            {t(`template.category.${c}`)}
          </button>
        ))}
      </div>
      <ul
        className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4"
        data-testid="templates"
      >
        {shown.map((tpl) => {
          const label = t(`template.${tpl.id}.label`);
          const d = designFor(tpl, label);
          return (
            <li key={tpl.id} className="flex flex-col gap-3">
              <button
                type="button"
                className="group relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[22px] p-6 shadow-[0_18px_34px_-26px_rgb(0_0_0/0.55)] transition-transform hover:-translate-y-1"
                style={{ background: d.bg }}
                onClick={() => openTemplate(tpl, label, locale)}
                aria-label={t('template.use', { name: t(`template.${tpl.id}.name`) })}
                data-template={tpl.id}
              >
                <Thumb tpl={tpl} label={label} />
                <span className="btn btn-primary absolute inset-x-4 bottom-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  {t('template.useShort')}
                </span>
              </button>
              <div className="flex items-baseline justify-between gap-2 px-1">
                <span className="font-semibold">{t(`template.${tpl.id}.name`)}</span>
                <span className="text-sm text-muted">{t(`template.category.${tpl.category}`)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
