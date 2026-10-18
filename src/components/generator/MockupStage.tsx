import { useEffect, useState, type ReactNode } from 'react';
import { readLocal, writeLocal } from '../../lib/storage/local';
import { useT } from '../common/i18n';

export const mockups = ['plain', 'tent', 'phone', 'sticker'] as const;
export type Mockup = (typeof mockups)[number];
const KEY = 'pakkaqr:mockup';

interface Props {
  /** The live preview canvas. */
  children: ReactNode;
  /** The stamp, positioned by the stage. */
  stamp: ReactNode;
  caption?: string;
}

/**
 * Shows the code on a plain sheet or in a real-looking setting (table tent,
 * phone, round sticker), so people can judge size and look before printing.
 */
export function MockupStage({ children, stamp, caption }: Props) {
  const t = useT();
  const [mode, setMode] = useState<Mockup>('plain');
  useEffect(() => {
    const saved = readLocal(KEY);
    if (saved && (mockups as readonly string[]).includes(saved)) setMode(saved as Mockup);
  }, []);
  const choose = (m: Mockup) => {
    setMode(m);
    writeLocal(KEY, m);
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="seg self-start" role="group" aria-label={t('mockup.label')}>
        {mockups.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => choose(m)}
            data-mockup={m}
          >
            {t(`mockup.${m}`)}
          </button>
        ))}
      </div>
      <div className={`stage stage-${mode}`} data-testid="mockup-stage" data-mode={mode}>
        <div className="stage-object">
          {mode === 'phone' && <span className="stage-notch" aria-hidden="true" />}
          <div className="stage-code">{children}</div>
          {mode !== 'plain' && caption && (
            <span className="stage-caption" aria-hidden="true">
              {caption}
            </span>
          )}
        </div>
        <div className="stage-stamp">{stamp}</div>
      </div>
    </div>
  );
}
