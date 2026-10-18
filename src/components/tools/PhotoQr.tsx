import { useEffect, useRef, useState } from 'react';
import { canvasToBlob, downloadBlob } from '../../lib/export';
import type { Locale } from '../../lib/i18n';
import { normalizeUrl } from '../../lib/validate/common';
import { makeMatrix, PayloadTooLongError } from '../../lib/render/matrix';
import { defaultPhotoOptions, drawPhotoQr, type PhotoQrOptions } from '../../lib/photo';
import { decodePixelsRobust } from '../../lib/decode';
import { Slider } from '../common/Slider';
import { I18nProvider, useT } from '../common/i18n';
import { Stamp, type StampStatus } from '../generator/Stamp';

export default function PhotoQr({ locale }: { locale: Locale }) {
  return (
    <I18nProvider locale={locale}>
      <PhotoApp />
    </I18nProvider>
  );
}

const PREVIEW = 720;

/** A demo "photo" (gradient + shapes) so the tool shows something before upload. */
function demoPhoto(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 600;
  c.height = 600;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 600, 600);
  g.addColorStop(0, '#F0A35E');
  g.addColorStop(0.55, '#C2321A');
  g.addColorStop(1, '#4A1F44');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 600, 600);
  ctx.fillStyle = 'rgba(255,252,246,0.35)';
  ctx.beginPath();
  ctx.arc(420, 180, 120, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

function PhotoApp() {
  const t = useT();
  const canvas = useRef<HTMLCanvasElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<
    (CanvasImageSource & { width: number; height: number }) | null
  >(null);
  const [text, setText] = useState('https://example.com');
  const [opts, setOpts] = useState<PhotoQrOptions>(defaultPhotoOptions);
  const [status, setStatus] = useState<StampStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setPhoto(demoPhoto()), []);

  // Links get https:// like the main generator; anything else is used as text.
  const payload = (() => {
    const v = text.trim();
    if (!v) return '';
    if (/\s/.test(v) || !/[.:]/.test(v)) return v;
    const r = normalizeUrl(v);
    return r.ok ? r.url : v;
  })();

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext('2d', { willReadFrequently: true });
    if (!c || !ctx || !photo || !payload) {
      setStatus(null);
      return;
    }
    let matrix;
    try {
      matrix = makeMatrix(payload, 'H');
      setError(null);
    } catch (e) {
      setError(e instanceof PayloadTooLongError ? t('errors.tooLong') : t('errors.export'));
      setStatus(null);
      return;
    }
    c.width = PREVIEW;
    c.height = PREVIEW;
    drawPhotoQr(ctx, matrix, photo, { ...opts, size: PREVIEW });
    setStatus('checking');
    let live = true;
    const timer = setTimeout(() => {
      const img = ctx.getImageData(0, 0, PREVIEW, PREVIEW);
      void decodePixelsRobust(img.data, PREVIEW, PREVIEW).then((r) => {
        if (!live) return;
        setStatus(r?.text === payload ? (opts.dot < 0.4 ? 'risky' : 'great') : 'fail');
      });
    }, 200);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [photo, payload, opts, t]);

  const load = async (f: File) => {
    try {
      const bitmap = await createImageBitmap(f);
      setPhoto(bitmap);
    } catch {
      setError(t('photo.badImage'));
    }
  };

  const download = async () => {
    if (!photo || !payload) return;
    const c = document.createElement('canvas');
    c.width = 1600;
    c.height = 1600;
    drawPhotoQr(c.getContext('2d')!, makeMatrix(payload, 'H'), photo, { ...opts, size: 1600 });
    downloadBlob(await canvasToBlob(c, 'image/png'), 'pakkaqr-photo.png');
  };

  return (
    <div className="grid overflow-clip rounded-[28px] bg-surface shadow-[var(--shadow-card)] lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
      <div className="flex flex-col gap-6 p-5 sm:p-8">
        <div>
          <label className="label" htmlFor="photo-text">
            {t('photoqr.content')}
          </label>
          <input
            id="photo-text"
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            data-testid="photo-text"
          />
          {error && <p className="error-text">{error}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <span className="label">{t('photoqr.photo')}</span>
          <input
            ref={file}
            type="file"
            accept="image/*"
            className="visually-hidden"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void load(f);
            }}
            data-testid="photo-file"
          />
          <button
            type="button"
            className="btn btn-secondary self-start"
            onClick={() => file.current?.click()}
          >
            {t('photoqr.pick')}
          </button>
          <p className="hint">{t('photoqr.private')}</p>
        </div>
        <Slider
          label={t('photoqr.dot')}
          min={30}
          max={80}
          step={5}
          value={Math.round(opts.dot * 100)}
          display={t(
            opts.dot < 0.45
              ? 'photoqr.dotArt'
              : opts.dot > 0.65
                ? 'photoqr.dotSafe'
                : 'photoqr.dotBalanced',
          )}
          onChange={(v) => setOpts({ ...opts, dot: v / 100 })}
          hint={t('photoqr.dotHint')}
        />
        <Slider
          label={t('photoqr.wash')}
          min={-50}
          max={60}
          step={5}
          value={Math.round(opts.wash * 100)}
          display={`${Math.round(opts.wash * 100)}%`}
          onChange={(v) => setOpts({ ...opts, wash: v / 100 })}
          hint={t('photoqr.washHint')}
        />
      </div>
      <div className="flex flex-col gap-5 bg-soft/70 p-5 sm:p-7">
        <div className="relative rounded-[22px] bg-surface p-5 pt-20 shadow-[var(--shadow-sheet)]">
          <canvas
            ref={canvas}
            role="img"
            aria-label={t('photoqr.alt', { text: payload })}
            className="mx-auto block aspect-square w-full max-w-[400px] rounded-[10px]"
            data-testid="photo-preview"
          />
          {status && (
            <div className="absolute top-2 right-3">
              <Stamp small status={status} stampKey={status} />
            </div>
          )}
        </div>
        <p
          role="status"
          className="text-[0.95rem] font-semibold"
          data-testid="photo-status"
          data-status={status ?? 'idle'}
        >
          {status ? t(`photoqr.status.${status}`) : ''}
        </p>
        <button
          type="button"
          className="btn btn-primary"
          disabled={status !== 'great' && status !== 'risky'}
          onClick={() => void download()}
        >
          {t('export.png')}
        </button>
      </div>
    </div>
  );
}
