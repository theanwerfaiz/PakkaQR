import { useEffect, useRef, useState } from 'react';
import type { Geometry } from '../../lib/render/geometry';
import { canvasToBlob, downloadBlob, renderCanvas, canShareFiles } from '../../lib/export';
import { Modal } from '../common/Modal';
import { useT } from '../common/i18n';
import { useToast } from '../common/Toast';

type CardModule = typeof import('../../lib/export/card');
type CardFormat = import('../../lib/export/card').CardFormat;
type CardTheme = import('../../lib/export/card').CardTheme;

const FORMATS: CardFormat[] = ['story', 'post', 'square'];
const THEMES: CardTheme[] = ['paper', 'ink', 'stamp', 'match'];

/** Stamp colours on paper (the light-theme values of each accent). */
const ACCENT_ON_PAPER: Record<string, string> = {
  sindoor: '#C2321A',
  neel: '#2B4C9B',
  tulsi: '#1E6B47',
  jamun: '#6B2D5C',
};

interface Props {
  open: boolean;
  onClose: () => void;
  geometry: Geometry | null;
  logo: HTMLImageElement | null;
  codeColor: string;
  transparent: boolean;
  bg: string;
  defaultHeadline: string;
  defaultSubline: string;
  fileBase: string;
}

/** Story / post cards and a short animated video, made on the device. */
export function ShareStudio({
  open,
  onClose,
  geometry,
  logo,
  codeColor,
  transparent,
  bg,
  defaultHeadline,
  defaultSubline,
  fileBase,
}: Props) {
  const t = useT();
  const toast = useToast();
  const preview = useRef<HTMLCanvasElement>(null);
  const [mod, setMod] = useState<CardModule | null>(null);
  const [format, setFormat] = useState<CardFormat>('story');
  const [theme, setTheme] = useState<CardTheme>('paper');
  const [headline, setHeadline] = useState(defaultHeadline);
  const [subline, setSubline] = useState(defaultSubline);
  const [stamp, setStamp] = useState(true);
  const [credit, setCredit] = useState(false);
  const [busy, setBusy] = useState<'image' | 'video' | null>(null);
  const [canVideo, setCanVideo] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (!open) return;
    setHeadline(defaultHeadline);
    setSubline(defaultSubline);
    void import('../../lib/export/card').then(setMod);
    void import('../../lib/export/video').then((v) => setCanVideo(v.canRecordVideo()));
    setCanShare(canShareFiles());
    // Only when the studio opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const stampColor = () =>
    ACCENT_ON_PAPER[document.documentElement.dataset.accent ?? 'sindoor'] ?? '#C2321A';

  const options = () => ({
    format,
    theme,
    headline,
    subline,
    stamp,
    credit,
    creditText: t('share.creditText'),
    stampColor: stampColor(),
    codeColor,
  });

  const code = () => {
    if (!geometry) return null;
    const qr = renderCanvas(geometry, 1024, logo ?? undefined, transparent ? '#FFFFFF' : bg) as
      HTMLCanvasElement | OffscreenCanvas;
    return { qr, aspect: geometry.height / geometry.width };
  };

  const render = (): HTMLCanvasElement | null => {
    const c = code();
    if (!mod || !c) return null;
    const size = mod.CARD_SIZES[format];
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    mod.drawCard(ctx, c.qr, c.aspect, options());
    return canvas;
  };

  useEffect(() => {
    if (!open || !mod) return;
    const id = requestAnimationFrame(() => {
      const card = render();
      const target = preview.current;
      if (!card || !target) return;
      target.width = card.width / 3;
      target.height = card.height / 3;
      target.getContext('2d')?.drawImage(card, 0, 0, target.width, target.height);
    });
    return () => cancelAnimationFrame(id);
    // render() reads all of these.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mod, format, theme, headline, subline, stamp, credit, geometry, logo]);

  const deliver = async (blob: Blob, name: string, share: boolean) => {
    if (share && canShare) {
      const file = new File([blob], name, { type: blob.type });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    }
    downloadBlob(blob, name);
    toast({ text: t('share.saved'), tone: 'success' });
  };

  const saveImage = async (share: boolean) => {
    setBusy('image');
    try {
      const card = render();
      if (!card) return;
      await deliver(await canvasToBlob(card, 'image/png'), `${fileBase}-${format}.png`, share);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError'))
        toast({ text: t('errors.export'), tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const saveVideo = async (share: boolean) => {
    const c = code();
    if (!c) return;
    setBusy('video');
    try {
      const v = await import('../../lib/export/video');
      const { blob, mime } = await v.recordCardVideo(c.qr, c.aspect, options());
      await deliver(blob, `${fileBase}-${format}.${v.videoExtension(mime)}`, share);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError'))
        toast({ text: t('share.videoError'), tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const chips = <T extends string>(
    name: string,
    values: T[],
    value: T,
    set: (v: T) => void,
    label: (v: T) => string,
  ) => (
    <fieldset className="flex flex-col gap-2">
      <legend className="label">{t(`share.${name}`)}</legend>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <button
            key={v}
            type="button"
            className="chip"
            aria-pressed={v === value}
            onClick={() => set(v)}
          >
            {label(v)}
          </button>
        ))}
      </div>
    </fieldset>
  );

  return (
    <Modal open={open} title={t('share.title')} onClose={onClose} wide>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
        <div className="flex flex-col gap-5">
          {chips('format', FORMATS, format, setFormat, (v) => t(`share.formats.${v}`))}
          {chips('theme', THEMES, theme, setTheme, (v) => t(`share.themes.${v}`))}
          <div>
            <label className="label" htmlFor="share-headline">
              {t('share.headline')}
            </label>
            <input
              id="share-headline"
              className="input"
              maxLength={60}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="share-subline">
              {t('share.subline')}
            </label>
            <input
              id="share-subline"
              className="input"
              maxLength={80}
              value={subline}
              onChange={(e) => setSubline(e.target.value)}
            />
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 font-medium">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={stamp}
              onChange={(e) => setStamp(e.target.checked)}
            />
            {t('share.stamp')}
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 font-medium">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={credit}
              onChange={(e) => setCredit(e.target.checked)}
            />
            {t('share.credit')}
          </label>
        </div>
        <div className="flex flex-col items-center gap-4">
          <canvas
            ref={preview}
            role="img"
            aria-label={t('share.previewAlt')}
            className="w-full max-w-[300px] rounded-[16px] border border-border"
          />
          <div className="grid w-full gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!geometry || busy !== null}
              onClick={() => void saveImage(false)}
              data-testid="share-download"
            >
              {busy === 'image' ? t('export.working') : t('share.download')}
            </button>
            {canShare && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!geometry || busy !== null}
                onClick={() => void saveImage(true)}
              >
                {t('share.share')}
              </button>
            )}
            {canVideo && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!geometry || busy !== null}
                onClick={() => void saveVideo(canShare)}
              >
                {busy === 'video' ? t('share.recording') : t('share.video')}
              </button>
            )}
            <p className="hint text-center">{t('share.private')}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
