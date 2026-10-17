import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useT } from './i18n';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Wider dialog for studios with a preview. */
  wide?: boolean;
}

/** Native <dialog>: traps focus, closes on Esc, restores focus on close. */
export function Modal({ open, title, onClose, children, wide = false }: Props) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className={`m-auto max-h-[calc(100dvh-2rem)] rounded-[24px] border border-border bg-surface p-0 text-text backdrop:bg-black/55 ${
        wide ? 'w-[min(60rem,calc(100vw-2rem))]' : 'w-[min(34rem,calc(100vw-2rem))]'
      }`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <h2 id={id} className="text-2xl">
          {title}
        </h2>
        <button
          type="button"
          className="btn btn-ghost btn-sm min-h-11 min-w-11"
          onClick={onClose}
          aria-label={t('modal.close')}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
