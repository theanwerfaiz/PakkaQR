import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useT } from './i18n';

export interface ToastMessage {
  id: number;
  text: string;
  tone?: 'info' | 'success' | 'error';
  action?: ReactNode;
  /** ms; 0 keeps it until dismissed. */
  duration?: number;
}

type Show = (toast: Omit<ToastMessage, 'id'>) => void;
const ToastContext = createContext<Show>(() => {});
export const useToast = (): Show => useContext(ToastContext);

/** Non-blocking toasts announced through a polite live region. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const next = useRef(1);
  const dismiss = useCallback(
    (id: number) => setToasts((list) => list.filter((x) => x.id !== id)),
    [],
  );
  const show = useCallback<Show>((toast) => {
    const id = next.current++;
    setToasts((list) => [...list.slice(-2), { ...toast, id }]);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => dismiss(toast.id)}
            dismissLabel={t('toast.dismiss')}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
  dismissLabel,
}: {
  toast: ToastMessage;
  onDismiss: () => void;
  dismissLabel: string;
}) {
  useEffect(() => {
    const duration = toast.duration ?? 5000;
    if (!duration) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);
  const tone =
    toast.tone === 'error'
      ? 'border-danger'
      : toast.tone === 'success'
        ? 'border-success'
        : 'border-border';
  return (
    <div
      className={`card pointer-events-auto flex w-full max-w-md items-start gap-3 border-l-4 p-3 text-sm ${tone}`}
    >
      <div className="flex-1">
        <p>{toast.text}</p>
        {toast.action && <div className="mt-2 flex flex-wrap gap-2">{toast.action}</div>}
      </div>
      <button
        type="button"
        className="btn btn-ghost btn-sm min-h-9 min-w-9 px-2"
        onClick={onDismiss}
        aria-label={dismissLabel}
      >
        <svg
          width="16"
          height="16"
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
  );
}
