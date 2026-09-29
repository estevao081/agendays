import type { ReactNode } from 'react';
import { CalendarClock } from 'lucide-react';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper-200 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-[var(--radius-chip)] bg-emerald-600 text-white">
            <CalendarClock className="size-6" />
          </div>
          <div>
            <p className="font-display text-xl font-semibold text-ink-900">agendasys</p>
          </div>
        </div>

        <div className="rounded-[var(--radius-card)] border border-ink-100 bg-white p-6 shadow-sm shadow-ink-950/5 sm:p-8">
          <div className="mb-6 space-y-1">
            <h1 className="font-display text-lg font-semibold text-ink-900">{title}</h1>
            {subtitle && <p className="text-sm text-ink-400">{subtitle}</p>}
          </div>
          {children}
        </div>

        {footer && <div className="mt-6 text-center text-sm text-ink-500">{footer}</div>}
      </div>
    </div>
  );
}
