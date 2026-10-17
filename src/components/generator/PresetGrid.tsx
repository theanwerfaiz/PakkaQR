import { memo, useEffect, useRef } from 'react';
import { drawGeometry } from '../../lib/render/canvas';
import { buildGeometry } from '../../lib/render/geometry';
import { defaultDesign, type QrDesign } from '../../lib/render/design';
import { matchingPreset, presets, type Preset } from '../../lib/render/presets';
import { useT } from '../common/i18n';

const SAMPLE = 'https://pakkaqr.app';
const THUMB = 72;

const Thumb = memo(function Thumb({ preset }: { preset: Preset }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    // Thumbnails are decorative: draw them when the browser is idle so they
    // never delay the first interaction.
    const draw = () => {
      const c = ref.current;
      const ctx = c?.getContext('2d');
      if (!c || !ctx) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = THUMB * dpr;
      c.height = THUMB * dpr;
      const g = buildGeometry(SAMPLE, {
        ...defaultDesign,
        ...preset.design,
        margin: 2,
        ecLevel: 'L',
      });
      drawGeometry(ctx, g, { width: THUMB * dpr });
    };
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(draw, { timeout: 2000 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(draw, 50);
    return () => clearTimeout(id);
  }, [preset]);
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ width: THUMB, height: THUMB }}
      className="rounded-md"
    />
  );
});

interface Props {
  design: QrDesign;
  onApply: (preset: Preset) => void;
}

export function PresetGrid({ design, onApply }: Props) {
  const t = useT();
  const active = matchingPreset(design);
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {presets.map((p) => {
        const name = t(`preset.${p.id}`);
        return (
          <li key={p.id}>
            <button
              type="button"
              aria-pressed={active === p.id}
              aria-label={t('preset.apply', { name })}
              onClick={() => onApply(p)}
              data-preset={p.id}
              className={`flex w-full flex-col items-center gap-1 rounded-[10px] border-2 p-2 text-xs font-medium ${
                active === p.id ? 'border-accent bg-surface-2' : 'border-border hover:bg-surface-2'
              }`}
            >
              <Thumb preset={p} />
              <span aria-hidden="true">{name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
