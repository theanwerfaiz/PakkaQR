import { useEffect, useRef, useState } from 'react';
import { festivalOn } from '../../lib/smart/festival';
import { useT } from '../common/i18n';

export type StampStatus = 'great' | 'risky' | 'fail' | 'checking';

interface Props {
  status: StampStatus;
  small?: boolean;
  /** Changes when a new result lands, replaying the stamp animation. */
  stampKey?: string | number;
  /** Increase to play the celebratory spin (easter egg / "it worked"). */
  spin?: number;
  className?: string;
}

/**
 * The rubber stamp: our only status icon. Each state differs by words, line
 * style and tilt — never by colour alone — and has a full spoken label.
 */
export function Stamp({ status, small = false, stampKey, spin = 0, className = '' }: Props) {
  const t = useT();
  const [festival, setFestival] = useState<string | null>(null);
  useEffect(() => setFestival(festivalOn(new Date())), []);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!spin || !el || typeof el.animate !== 'function') return;
    const reduce =
      document.documentElement.dataset.motion === 'reduce' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const tilt = getComputedStyle(el).getPropertyValue('--stamp-tilt').trim() || '-14deg';
    el.animate(
      [
        { transform: `rotate(${tilt}) scale(1)` },
        { transform: `rotate(calc(${tilt} + 360deg)) scale(1.08)` },
        { transform: `rotate(calc(${tilt} + 360deg)) scale(1)` },
      ],
      { duration: 900, easing: 'cubic-bezier(0.5, 0, 0.2, 1)' },
    );
  }, [spin]);
  const top = status === 'great' && festival ? t(`festival.${festival}`) : t(`stamp.${status}.top`);
  return (
    <div
      ref={ref}
      key={stampKey}
      role="img"
      aria-label={t(`stamp.${status}.label`)}
      data-status={status}
      data-animate={status !== 'checking'}
      data-testid="stamp"
      className={`stamp ${small ? 'stamp-sm' : ''} ${className}`}
    >
      <span className="stamp-top" aria-hidden="true">
        {top}
      </span>
      <span className="stamp-main" aria-hidden="true">
        {t(`stamp.${status}.main`)}
      </span>
      <span className="stamp-bottom stamp-hi" lang="hi" aria-hidden="true">
        {t(`stamp.${status}.hi`)}
      </span>
    </div>
  );
}
