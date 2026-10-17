import { useEffect, useRef, useState } from 'react';
import { drawGeometry, pixelHeight } from '../../lib/render/canvas';
import type { Geometry } from '../../lib/render/geometry';
import { useT } from '../common/i18n';

interface Props {
  geometry: Geometry | null;
  logo: HTMLImageElement | null;
  alt: string;
  transparent: boolean;
  message?: string | undefined;
}

/** Live preview canvas at device resolution, with a placeholder when there is nothing to show. */
export function Preview({ geometry, logo, alt, transparent, message }: Props) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(320);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(160, Math.floor(entry.contentRect.width)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !geometry) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const px = Math.round(width * dpr);
    c.width = px;
    c.height = pixelHeight(geometry, px);
    c.style.width = `${width}px`;
    c.style.height = `${pixelHeight(geometry, width)}px`;
    const ctx = c.getContext('2d');
    if (ctx) drawGeometry(ctx, geometry, logo ? { width: px, logo } : { width: px });
  }, [geometry, logo, width]);

  return (
    <div ref={box} className="relative mx-auto w-full max-w-[360px]">
      {geometry ? (
        <canvas
          ref={canvas}
          role="img"
          aria-label={alt}
          data-testid="qr-preview"
          className={`block rounded-lg ${transparent ? 'checker' : ''}`}
        />
      ) : (
        <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-surface-2 p-6 text-center">
          <svg
            width="96"
            height="96"
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="opacity-25"
            fill="currentColor"
          >
            <path d="M3 3h7v7H3zm2 2v3h3V5zm9-2h7v7h-7zm2 2v3h3V5zM3 14h7v7H3zm2 2v3h3v-3zm9-2h2v2h-2zm2 2h2v2h-2zm2-2h3v2h-3zm-4 4h2v3h-2zm4 0h3v3h-3z" />
          </svg>
          <p className="text-sm text-muted" data-testid="qr-placeholder">
            {message ?? t('generator.placeholder')}
          </p>
        </div>
      )}
    </div>
  );
}
