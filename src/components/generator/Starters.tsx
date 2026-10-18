import type { QrContent, QrType } from '../../lib/payloads';
import { encoders } from '../../lib/payloads';
import type { FrameSettings, QrDesign } from '../../lib/render/design';
import { styledDesign } from '../../lib/render/presets';
import { useT } from '../common/i18n';

export interface Starter {
  id: string;
  type: QrType;
  fields?: Record<string, string | boolean>;
  frame?: Omit<FrameSettings, 'label' | 'labelColor' | 'frameColor'>;
  preset?: string;
  /** Opens the bill splitter (UPI). */
  split?: boolean;
}

/** One-tap starting points for the things people make most. */
export const STARTERS: Starter[] = [
  { id: 'bio', type: 'social', frame: { id: 'pill' }, preset: 'jamun' },
  { id: 'payMe', type: 'upi', frame: { id: 'rounded-bottom' }, preset: 'ledger' },
  { id: 'split', type: 'upi', frame: { id: 'ticket' }, preset: 'mitti', split: true },
  { id: 'wifi', type: 'wifi', frame: { id: 'pill' }, preset: 'neel' },
  { id: 'playlist', type: 'url', frame: { id: 'sticker' }, preset: 'raat' },
  { id: 'party', type: 'event', frame: { id: 'ticket' }, preset: 'jamun' },
  { id: 'card', type: 'vcard', preset: 'ledger' },
  { id: 'review', type: 'review', frame: { id: 'speech-bubble' }, preset: 'tulsi' },
];

interface Props {
  design: QrDesign;
  onStart: (content: QrContent, design: QrDesign, starter: Starter) => void;
}

export function Starters({ design, onStart }: Props) {
  const t = useT();
  const start = (s: Starter) => {
    const next = styledDesign(design, s.preset, s.frame?.id, t(`starter.${s.id}.label`));
    onStart({ type: s.type, fields: { ...encoders[s.type].defaults, ...s.fields } }, next, s);
  };
  return (
    <div className="flex flex-col gap-2">
      <h2 className="kicker !text-[0.75rem] !font-normal" id="starters-heading">
        {t('starter.heading')}
      </h2>
      <ul
        aria-labelledby="starters-heading"
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:overflow-visible"
      >
        {STARTERS.map((s) => (
          <li key={s.id} className="shrink-0">
            <button type="button" className="chip" data-starter={s.id} onClick={() => start(s)}>
              {t(`starter.${s.id}.name`)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
