import { useRef, type KeyboardEvent } from 'react';
import type { QrType } from '../../lib/payloads/types';
import { moreTypes, primaryTypes } from '../forms/fields';
import { useT } from '../common/i18n';

interface Props {
  value: QrType;
  onChange: (type: QrType) => void;
  /** Keep the heading for screen readers only (when a section heading already says it). */
  hideHeading?: boolean;
}

/** Horizontal-scrolling chips (a radio group), with rarer types in a select. */
export function TypeTabs({ value, onChange, hideHeading = false }: Props) {
  const t = useT();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + primaryTypes.length) % primaryTypes.length;
    onChange(primaryTypes[next]!);
    refs.current[next]?.focus();
  };
  const isPrimary = primaryTypes.includes(value);
  return (
    <div>
      <h2
        id="qr-type-heading"
        className={hideHeading ? 'visually-hidden' : 'mb-2 text-base font-semibold'}
      >
        {t('generator.chooseType')}
      </h2>
      <div className="flex items-start gap-2">
        <div
          role="radiogroup"
          aria-labelledby="qr-type-heading"
          className="-mx-1 flex flex-1 gap-2 overflow-x-auto px-1 pb-2 lg:flex-wrap lg:overflow-visible"
        >
          {primaryTypes.map((type, i) => {
            const checked = type === value;
            return (
              <button
                key={type}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={checked}
                tabIndex={checked || (!isPrimary && i === 0) ? 0 : -1}
                onClick={() => onChange(type)}
                onKeyDown={(e) => onKey(e, i)}
                data-type={type}
                className={`min-h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-semibold ${
                  checked
                    ? 'border-accent bg-accent text-accent-contrast'
                    : 'border-border bg-surface text-text hover:bg-surface-2'
                }`}
              >
                {t(`type.${type}`)}
              </button>
            );
          })}
        </div>
        <label className="shrink-0">
          <span className="visually-hidden">{t('generator.moreTypes')}</span>
          <select
            className={`input min-h-11 w-auto rounded-full text-sm font-semibold ${isPrimary ? '' : 'border-accent'}`}
            value={isPrimary ? '' : value}
            onChange={(e) => e.target.value && onChange(e.target.value as QrType)}
          >
            <option value="">{t('generator.moreTypes')}</option>
            {moreTypes.map((type) => (
              <option key={type} value={type}>
                {t(`type.${type}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
