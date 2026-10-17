import { useCallback, useEffect, useRef, useState } from 'react';
import { context2d, decodeBlob, decodePixels, makeCanvas } from '../../lib/decode';
import { Dropzone } from '../common/Dropzone';
import { useT } from '../common/i18n';

interface Props {
  onResult: (text: string) => void;
}

type CameraState = 'off' | 'starting' | 'on' | 'denied' | 'unavailable';

/**
 * Gets a QR code from the camera, an uploaded image or a pasted image.
 * Everything is decoded locally; frames and files never leave the device.
 */
export function CodeCapture({ onResult }: Props) {
  const t = useT();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [camera, setCamera] = useState<CameraState>('off');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    setCamera((c) => (c === 'on' || c === 'starting' ? 'off' : c));
  }, []);

  const fromBlob = useCallback(
    async (blob: Blob) => {
      setError(null);
      setBusy(true);
      try {
        const result = await decodeBlob(blob);
        if (result) onResult(result.text);
        else setError(t('capture.notFound'));
      } catch {
        setError(t('errors.image.unreadable'));
      } finally {
        setBusy(false);
      }
    },
    [onResult, t],
  );

  // Paste anywhere on the page.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
      if (file) {
        e.preventDefault();
        void fromBlob(file);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [fromBlob]);

  useEffect(() => stop, [stop]);

  const start = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera('unavailable');
      return;
    }
    setCamera('starting');
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      setCamera('on');
    } catch (e) {
      const name = e instanceof DOMException ? e.name : '';
      setCamera(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
    }
  };

  // Attach the stream and scan a few frames per second.
  useEffect(() => {
    if (camera !== 'on' || !video.current || !stream.current) return;
    const v = video.current;
    v.srcObject = stream.current;
    void v.play().catch(() => undefined);
    let live = true;
    const canvas = makeCanvas(640, 640);
    const ctx = context2d(canvas);
    const tick = () => {
      if (!live) return;
      if (v.readyState >= 2 && v.videoWidth) {
        const scale = Math.min(1, 800 / Math.max(v.videoWidth, v.videoHeight));
        const w = Math.round(v.videoWidth * scale);
        const h = Math.round(v.videoHeight * scale);
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
        ctx.drawImage(v, 0, 0, w, h);
        const result = decodePixels(ctx.getImageData(0, 0, w, h).data, w, h);
        if (result) {
          stop();
          onResult(result.text);
          return;
        }
      }
      setTimeout(tick, 200);
    };
    tick();
    return () => {
      live = false;
    };
  }, [camera, onResult, stop]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {camera === 'on' || camera === 'starting' ? (
          <button type="button" className="btn btn-secondary" onClick={stop}>
            {t('capture.stopCamera')}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => void start()}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            {t('capture.camera')}
          </button>
        )}
      </div>
      {(camera === 'on' || camera === 'starting') && (
        <figure className="space-y-2">
          <video
            ref={video}
            muted
            playsInline
            aria-label={t('capture.cameraLabel')}
            className="aspect-video w-full max-w-xl rounded-[14px] bg-black object-cover"
          />
          <figcaption className="hint">{t('capture.cameraHint')}</figcaption>
        </figure>
      )}
      {camera === 'denied' && (
        <p className="warning-text" role="alert">
          {t('capture.cameraDenied')}
        </p>
      )}
      {camera === 'unavailable' && (
        <p className="warning-text" role="alert">
          {t('capture.cameraUnavailable')}
        </p>
      )}
      <Dropzone accept="image/*" label={t('capture.upload')} onFile={(f) => void fromBlob(f)}>
        <p className="hint">{t('capture.drop')}</p>
      </Dropzone>
      <div aria-live="polite">
        {busy && <p className="text-sm text-muted">{t('capture.reading')}</p>}
        {error && (
          <p className="error-text" data-testid="capture-error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
