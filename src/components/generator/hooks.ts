import { useEffect, useState } from 'react';
import type { CanvasFactory } from '../../lib/scannability/scan-test';
import type { Ctx2D } from '../../lib/render/canvas';
import { context2d, makeCanvas } from '../../lib/decode/canvas';

export function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

/** Decodes a logo data URL into an image element ready for canvas drawing. */
export function useImage(src: string | undefined): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }
    let live = true;
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    img
      .decode()
      .then(() => live && setImage(img))
      .catch(() => live && setImage(null));
    return () => {
      live = false;
    };
  }, [src]);
  return image;
}

/** Becomes true once web fonts are ready, so frame labels measure correctly. */
export function useFontsReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!('fonts' in document)) {
      setReady(true);
      return;
    }
    let live = true;
    void Promise.all([
      document.fonts.load('700 16px "Anek Latin Variable"'),
      document.fonts.load('700 16px "Anek Devanagari Variable"', 'क'),
    ])
      .catch(() => undefined)
      .then(() => document.fonts.ready)
      .then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);
  return ready;
}

export const browserCanvas: CanvasFactory = (width, height) => {
  const canvas = makeCanvas(width, height);
  const ctx = context2d(canvas);
  return {
    ctx: ctx as unknown as Ctx2D,
    getPixels: () => ctx.getImageData(0, 0, width, height).data,
  };
};

let measureCtx: CanvasRenderingContext2D | null = null;
/** A shared context for measuring label text. */
export function measureContext(): CanvasRenderingContext2D {
  measureCtx ??= context2d(makeCanvas(8, 8));
  return measureCtx;
}

/** True when the user is typing in a field (shortcuts must not fire). */
export function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

/**
 * A short vibration for moments that matter (fixed, saved). Respects the
 * Personalise switches; silently does nothing where vibration isn't
 * supported (iPhone, desktop).
 */
export function buzz(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    if (localStorage.getItem('pakkaqr:haptics') === 'off') return;
  } catch {
    // Storage blocked: vibration stays on (the OS still controls it).
  }
  if (document.documentElement.dataset.motion === 'reduce') return;
  navigator.vibrate(pattern);
}
