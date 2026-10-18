import { useEffect, useId, useRef, useState } from 'react';
import type { QrContent } from '../../lib/payloads';
import { detectInput, type DetectReason } from '../../lib/smart/detect';
import { useT } from '../common/i18n';

interface Props {
  onDetect: (content: QrContent) => void;
  /** Easter egg: someone typed the magic word. */
  onMagic: () => void;
  /** Move focus to the type picker ("Change type"). */
  onChangeType: () => void;
}

const MAGIC = /^(pakka|पक्का)!*$/i;

/** "Paste anything" box: guesses the type and fills the form below. */
export function SmartInput({ onDetect, onMagic, onChangeType }: Props) {
  const t = useT();
  const id = useId();
  const [value, setValue] = useState('');
  const [reason, setReason] = useState<DetectReason | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const input = useRef<HTMLInputElement>(null);

  const run = (text: string) => {
    clearTimeout(timer.current);
    if (MAGIC.test(text.trim())) {
      onMagic();
      return;
    }
    const d = detectInput(text);
    setReason(d?.reason ?? null);
    if (d) onDetect(d.content);
  };

  useEffect(() => {
    // Text typed before the page finished loading is already in the field:
    // pick it up instead of losing it.
    const early = input.current?.value ?? '';
    if (early.trim()) {
      setValue(early);
      run(early);
    }
    return () => clearTimeout(timer.current);
    // Runs once after hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={id} className="text-[0.95rem] font-[650]">
        {t('smart.label')}
      </label>
      <div className="hero-input">
        <input
          ref={input}
          id={id}
          defaultValue=""
          placeholder={t('smart.placeholder')}
          aria-describedby={`${id}-status`}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          data-testid="smart-input"
          className="min-w-0 flex-1 border-0 bg-transparent py-3 text-[1.25rem] font-medium text-text outline-none placeholder:text-muted"
          onInput={(e) => {
            const next = e.currentTarget.value;
            setValue(next);
            clearTimeout(timer.current);
            if (!next.trim()) setReason(null);
            else timer.current = setTimeout(() => run(next), 500);
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text');
            if (pasted) {
              // Let the input update first, then detect immediately.
              setTimeout(() => run((e.target as HTMLInputElement).value || pasted), 0);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              // Read the field itself: it is always current, even if state lags.
              setValue(e.currentTarget.value);
              run(e.currentTarget.value);
            }
          }}
        />
        <button
          type="button"
          className="btn btn-primary shrink-0"
          onClick={() => run(input.current?.value ?? value)}
          disabled={!value.trim()}
        >
          {t('smart.go')}
        </button>
      </div>
      <p
        id={`${id}-status`}
        role="status"
        aria-live="polite"
        className="flex min-h-7 flex-wrap items-center gap-x-3 gap-y-1 text-[0.95rem]"
        data-testid="smart-status"
      >
        {reason ? (
          <>
            <span className="flex items-center gap-2 font-semibold text-success">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 12.5l5 5L20 6.5" />
              </svg>
              {t(`smart.reason.${reason}`)}
            </span>
            <button type="button" className="btn-link btn" onClick={onChangeType}>
              {t('smart.change')}
            </button>
          </>
        ) : (
          <span className="text-muted">{t('smart.hint')}</span>
        )}
      </p>
    </div>
  );
}
