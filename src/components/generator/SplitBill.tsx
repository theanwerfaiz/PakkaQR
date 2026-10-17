import { useId, useState } from 'react';
import { SPLIT_MAX_PEOPLE, splitBill } from '../../lib/smart/split';
import { useT } from '../common/i18n';

interface Props {
  open: boolean;
  onToggle: (open: boolean) => void;
  /** Sets the amount and note on the UPI form. */
  onUse: (amount: string, note: string) => void;
}

/** Split a bill: one code for each person's share. */
export function SplitBill({ open, onToggle, onUse }: Props) {
  const t = useT();
  const id = useId();
  const [total, setTotal] = useState('');
  const [people, setPeople] = useState(2);
  const split = splitBill(total, people);
  const step = (d: number) => setPeople((p) => Math.min(SPLIT_MAX_PEOPLE, Math.max(2, p + d)));
  return (
    <details
      className="rounded-[16px] border border-border bg-surface"
      open={open}
      onToggle={(e) => onToggle((e.currentTarget as HTMLDetailsElement).open)}
      data-testid="split-bill"
    >
      <summary className="flex min-h-12 items-center justify-between gap-2 px-4 font-semibold">
        {t('split.title')}
        <span className="kicker">{t('split.kicker')}</span>
      </summary>
      <div className="flex flex-col gap-4 px-4 pb-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor={`${id}-total`}>
              {t('split.total')}
            </label>
            <input
              id={`${id}-total`}
              className="input"
              inputMode="decimal"
              value={total}
              placeholder="1200"
              onChange={(e) => setTotal(e.target.value)}
            />
          </div>
          <div>
            <span className="label" id={`${id}-people-label`}>
              {t('split.people')}
            </span>
            <div
              className="flex items-center gap-2"
              role="group"
              aria-labelledby={`${id}-people-label`}
            >
              <button
                type="button"
                className="btn btn-secondary min-w-12 px-0"
                onClick={() => step(-1)}
                disabled={people <= 2}
                aria-label={t('split.fewer')}
              >
                −
              </button>
              <output
                className="min-w-12 text-center text-2xl font-bold [font-stretch:80%]"
                aria-live="polite"
              >
                {people}
              </output>
              <button
                type="button"
                className="btn btn-secondary min-w-12 px-0"
                onClick={() => step(1)}
                disabled={people >= SPLIT_MAX_PEOPLE}
                aria-label={t('split.more')}
              >
                +
              </button>
            </div>
          </div>
        </div>
        {split ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-surface-2 p-3">
            <p>
              <span className="block text-sm text-muted">{t('split.each')}</span>
              <span className="text-3xl font-bold [font-stretch:80%]" data-testid="split-share">
                ₹{split.perPerson}
              </span>
              {split.collected !== Number(total.replace(/[₹,\s]/g, '')).toFixed(2) && (
                <span className="block text-sm text-muted">
                  {t('split.roundedUp', { collected: split.collected })}
                </span>
              )}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onUse(split.perPerson, t('split.note', { count: people }))}
            >
              {t('split.use')}
            </button>
          </div>
        ) : (
          <p className="hint">{t('split.hint')}</p>
        )}
      </div>
    </details>
  );
}
