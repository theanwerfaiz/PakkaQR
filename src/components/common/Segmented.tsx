import { useId, useRef, type KeyboardEvent } from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  hint?: string | undefined;
}

/** Radio group styled as a segmented control (arrow keys move the selection). */
export function Segmented<T extends string>({ label, value, options, onChange, hint }: Props<T>) {
  const id = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const move = (e: KeyboardEvent, index: number) => {
    const delta =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + options.length) % options.length;
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  };
  return (
    <div>
      <span className="label" id={`${id}-label`}>
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="inline-flex flex-wrap gap-1 rounded-[10px] border border-border bg-surface-2 p-1"
      >
        {options.map((o, i) => {
          const checked = o.value === value;
          return (
            <button
              key={o.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => onChange(o.value)}
              onKeyDown={(e) => move(e, i)}
              className={`min-h-10 rounded-lg px-3 text-sm font-medium ${
                checked ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      )}
    </div>
  );
}
