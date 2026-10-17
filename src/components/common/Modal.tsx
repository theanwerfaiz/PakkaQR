import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useT } from './i18n';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Native <dialog>: traps focus, closes on Esc, restores focus on close. */
export function Modal({ open, title, onClose, children }: Props) {
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
      className="card m-auto w-[min(32rem,calc(100vw-2rem))] p-0 text-text backdrop:bg-black/50"
    >
      <div className="flex items-start justify-between gap-4 border-b border-border p-4">
        <h2 id={id} className="text-lg font-bold">
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
      <div className="p-4">{children}</div>
    </dialog>
  );
}
