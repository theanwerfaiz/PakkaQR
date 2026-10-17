import { useId, type ReactNode } from 'react';

export interface FieldIds {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
}

interface Props {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  warning?: string | undefined;
  optionalText?: string | undefined;
  className?: string;
  children: (ids: FieldIds) => ReactNode;
}

/** Visible label, hint and error, linked to the control with aria-describedby. */
export function FormField({
  label,
  hint,
  error,
  warning,
  optionalText,
  className,
  children,
}: Props) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const msgId = error || warning ? `${id}-msg` : undefined;
  const describedBy = [hintId, msgId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {optionalText && (
          <span className="ml-1 text-sm font-normal text-muted">({optionalText})</span>
        )}
      </label>
      {children({ id, describedBy, invalid: !!error })}
      {hint && (
        <p id={hintId} className="hint">
          {hint}
        </p>
      )}
      {error ? (
        <p id={msgId} className="error-text">
          {error}
        </p>
      ) : warning ? (
        <p id={msgId} className="warning-text">
          {warning}
        </p>
      ) : null}
    </div>
  );
}
