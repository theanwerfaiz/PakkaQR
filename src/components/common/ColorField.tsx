import { useEffect, useId, useState } from 'react';
import { normalizeHex } from '../../lib/render/design';
import { useT } from './i18n';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

/** Native colour picker plus a hex text input, so it works without a mouse. */
export function ColorField({ label, value, onChange }: Props) {
  const t = useT();
  const id = useId();
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div>
      <span className="label" id={`${id}-label`}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value.length === 7 ? value.toLowerCase() : '#000000'}
          aria-label={t('design.picker', { name: label })}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-border bg-surface p-1"
        />
        <input
          type="text"
          className="input font-mono uppercase"
          value={text}
          spellCheck={false}
          maxLength={7}
          aria-label={t('design.hex', { name: label })}
          aria-invalid={normalizeHex(text) ? undefined : true}
          onChange={(e) => {
            setText(e.target.value);
            const hex = normalizeHex(e.target.value);
            if (hex && e.target.value.replace('#', '').length === 6) onChange(hex);
          }}
          onBlur={() => {
            const hex = normalizeHex(text);
            if (hex) onChange(hex);
            else setText(value);
          }}
        />
      </div>
    </div>
  );
}
