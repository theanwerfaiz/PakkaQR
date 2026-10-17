import { useEffect, useState } from 'react';
import { useT, useI18n } from '../common/i18n';

interface Props {
  payload: string | null;
}

/** "What's inside the code" — the exact text a phone will read, always visible. */
export function PayloadBox({ payload }: Props) {
  const t = useT();
  const { locale } = useI18n();
  const [copied, setCopied] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  useEffect(() => setCanSpeak(typeof window !== 'undefined' && 'speechSynthesis' in window), []);
  useEffect(() => setCopied(false), [payload]);
  if (!payload) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const speak = () => {
    const u = new SpeechSynthesisUtterance(payload);
    u.lang = locale === 'hi' ? 'hi-IN' : 'en-IN';
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };
  return (
    <section aria-labelledby="payload-heading" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 id="payload-heading" className="kicker !text-[0.75rem] !font-normal">
          {t('payload.heading')}
        </h3>
        <span className="flex gap-1">
          {canSpeak && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={speak}>
              {t('payload.read')}
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void copy()}>
            {copied ? t('payload.copied') : t('payload.copy')}
          </button>
        </span>
      </div>
      <code
        className="block max-h-32 overflow-auto rounded-[12px] border border-border bg-surface-2 px-3 py-2 font-mono text-[0.85rem] break-all whitespace-pre-wrap"
        data-testid="payload-text"
      >
        {payload}
      </code>
    </section>
  );
}
