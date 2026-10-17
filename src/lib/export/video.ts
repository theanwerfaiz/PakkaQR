import { cardColors, cardLayout, drawCard, drawStamp, type CardOptions } from './card';

/*
 * Animated share video: the card appears, the code "prints" from the centre
 * outwards, then the stamp lands. Recorded with the browser's own
 * MediaRecorder from a canvas — nothing is uploaded, no encoder library.
 */

const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

export function videoMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement === 'undefined') return null;
  if (!('captureStream' in HTMLCanvasElement.prototype)) return null;
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

export const canRecordVideo = (): boolean => videoMimeType() !== null;

export const videoExtension = (mime: string): 'mp4' | 'webm' =>
  mime.startsWith('video/mp4') ? 'mp4' : 'webm';

/** 0→1 progress with ease-out. */
const ease = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;

export interface VideoTiming {
  revealStart: number;
  revealEnd: number;
  stampAt: number;
  total: number;
}

export const VIDEO_TIMING: VideoTiming = {
  revealStart: 0.3,
  revealEnd: 1.8,
  stampAt: 2.0,
  total: 4.0,
};

export async function recordCardVideo(
  qr: CanvasImageSource,
  qrAspect: number,
  options: CardOptions,
  timing: VideoTiming = VIDEO_TIMING,
): Promise<{ blob: Blob; mime: string }> {
  const mime = videoMimeType();
  if (!mime) throw new Error('video-unsupported');
  const layout = cardLayout(options.format, qrAspect);
  // Video at 720p width keeps files small and encoding fast on phones.
  const scale = 720 / layout.width;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(layout.width * scale);
  canvas.height = Math.round(layout.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no-canvas');

  // The card without the stamp; the stamp is animated on top.
  const base = document.createElement('canvas');
  base.width = layout.width;
  base.height = layout.height;
  const bctx = base.getContext('2d');
  if (!bctx) throw new Error('no-canvas');
  drawCard(bctx, qr, qrAspect, { ...options, stamp: false });
  const colors = cardColors(options);

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const done = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  const frame = (t: number) => {
    ctx.save();
    ctx.scale(scale, scale);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, layout.width, layout.height);
    // Everything except the code itself.
    ctx.drawImage(base, 0, 0);
    // Cover the code, then reveal it with a growing circle from the centre.
    const q = layout.qr;
    ctx.fillStyle = colors.sheet;
    ctx.fillRect(q.x, q.y, q.w, q.h);
    const p = ease((t - timing.revealStart) / (timing.revealEnd - timing.revealStart));
    if (p > 0) {
      const cx = q.x + q.w / 2;
      const cy = q.y + q.h / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, Math.hypot(q.w, q.h) * 0.5 * p + 1, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(base, q.x, q.y, q.w, q.h, q.x, q.y, q.w, q.h);
      ctx.restore();
    }
    if (options.stamp && t >= timing.stampAt) {
      const s = (t - timing.stampAt) / 0.35;
      const grow = s < 1 ? 1.7 - 0.76 * ease(s) : 1;
      const settle = s < 1 ? grow : 1;
      const st = layout.stamp;
      ctx.globalAlpha = Math.min(1, s * 2);
      drawStamp(
        ctx,
        st.cx,
        st.cy,
        st.r * settle,
        options.theme === 'stamp' ? '#1A1712' : options.stampColor,
      );
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  };

  frame(0);
  recorder.start(250);
  const start = performance.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      frame(Math.min(t, timing.total));
      if (t < timing.total) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
  recorder.stop();
  await done;
  return { blob: new Blob(chunks, { type: mime.split(';')[0] }), mime };
}
