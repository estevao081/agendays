import { CheckCircle2, X, XCircle, Info } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import type { ToastItem, ToastVariant } from '../../contexts/ToastContext';

const VARIANT_CONFIG: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; classes: string }
> = {
  success: {
    icon: CheckCircle2,
    classes: 'bg-emerald-600 text-white',
  },
  error: {
    icon: XCircle,
    classes: 'bg-brick-500 text-white',
  },
  info: {
    icon: Info,
    classes: 'bg-ink-900 text-white',
  },
};

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const { icon: Icon, classes } = VARIANT_CONFIG[toast.variant];
  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      className={[
        'flex w-full max-w-sm items-start gap-3 rounded-[var(--radius-chip)] px-4 py-3 shadow-lg shadow-ink-950/10',
        'animate-toast-in',
        classes,
      ].join(' ')}
    >
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div className="flex-1 space-y-0.5">
        <p className="text-sm font-medium leading-snug">{toast.message}</p>
        {toast.description && (
          <p className="text-xs leading-snug opacity-85">{toast.description}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        aria-label="Fechar notificação"
        className="-my-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded opacity-70 hover:opacity-100"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:right-4 sm:left-auto">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto w-full sm:w-auto">
          <ToastCard toast={toast} onDismiss={() => dismissToast(toast.id)} />
        </div>
      ))}
    </div>
  );
}
