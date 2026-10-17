import { useRef, useState } from 'react';
import type { QrDesign } from '../../lib/render/design';
import type { PaletteSuggestion } from '../../lib/smart/palette';
import { remixDesign } from '../../lib/smart/remix';
import { useT } from '../common/i18n';

interface Props {
  design: QrDesign;
  onChange: (design: QrDesign) => void;
}

/** Shuffle a style that still scans, or match the colours of a photo. */
export function QuickStyle({ design, onChange }: Props) {
  const t = useT();
  const file = useRef<HTMLInputElement>(null);
  const [locks, setLocks] = useState({ colors: false, shape: false });
  const [suggestions, setSuggestions] = useState<PaletteSuggestion[]>([]);
  const [busy, setBusy] = useState(false);

  const fromPhoto = async (f: File) => {
    setBusy(true);
    try {
      const [{ paletteFromPixels }, bitmap] = await Promise.all([
        import('../../lib/smart/palette'),
        createImageBitmap(f),
      ]);
      // Downscale: 64 px is plenty to find the main colours, and fast.
      const scale = Math.min(1, 64 / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close();
      setSuggestions(paletteFromPixels(ctx.getImageData(0, 0, w, h).data, 4));
    } catch {
      setSuggestions([]);
    } finally {
      setBusy(false);
      if (file.current) file.current.value = '';
    }
  };

  const apply = (s: PaletteSuggestion) => {
    const { gradient: _g, cornerColor: _c, ...rest } = design;
    onChange({ ...rest, fg: s.fg, bg: s.bg, transparentBg: false });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2" data-testid="quick-style">
      <div className="flex flex-col gap-3 rounded-[16px] border border-border p-4">
        <div>
          <h3 className="text-xl">{t('remix.title')}</h3>
          <p className="hint">{t('remix.hint')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['colors', 'shape'] as const).map((k) => (
            <button
              key={k}
              type="button"
              className="chip"
              aria-pressed={locks[k]}
              onClick={() => setLocks({ ...locks, [k]: !locks[k] })}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d={locks[k] ? 'M8 11V8a4 4 0 0 1 8 0v3' : 'M8 11V8a4 4 0 0 1 7.5-2'} />
              </svg>
              {t(`remix.lock.${k}`)}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={locks.colors && locks.shape}
          onClick={() => onChange(remixDesign(design, Math.random, locks))}
          data-testid="remix"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 7h3.5a5 5 0 0 1 4 2l3 4a5 5 0 0 0 4 2H21M3 17h3.5a5 5 0 0 0 4-2M17.5 9H21M18 4l3 3-3 3M18 14l3 3-3 3" />
          </svg>
          {t('remix.shuffle')}
        </button>
      </div>
      <div className="flex flex-col gap-3 rounded-[16px] border border-border p-4">
        <div>
          <h3 className="text-xl">{t('photo.title')}</h3>
          <p className="hint">{t('photo.hint')}</p>
        </div>
        <input
          ref={file}
          type="file"
          accept="image/*"
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          id="photo-palette"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void fromPhoto(f);
          }}
        />
        <button
          type="button"
          className="btn btn-secondary"
          aria-busy={busy || undefined}
          disabled={busy}
          onClick={() => file.current?.click()}
        >
          {busy ? t('photo.working') : t('photo.pick')}
        </button>
        {suggestions.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label={t('photo.suggestions')}>
            {suggestions.map((s) => (
              <li key={`${s.fg}${s.bg}`}>
                <button
                  type="button"
                  className="flex min-h-11 items-center gap-2 rounded-[12px] border border-border-strong px-2 py-1"
                  style={{ background: s.bg, color: s.fg }}
                  onClick={() => apply(s)}
                  aria-label={t('photo.use', { fg: s.fg, bg: s.bg })}
                >
                  <span className="grid grid-cols-2 gap-0.5" aria-hidden="true">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className="h-2.5 w-2.5 rounded-[2px]"
                        style={{
                          background: i % 3 ? s.fg : 'transparent',
                          outline: `1px solid ${s.fg}`,
                        }}
                      />
                    ))}
                  </span>
                  <span className="font-mono text-xs font-semibold">{s.fg}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
