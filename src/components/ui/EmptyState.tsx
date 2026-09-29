import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-ink-200 px-6 py-14 text-center">
      {icon && <div className="text-ink-300">{icon}</div>}
      <div className="space-y-1">
        <p className="font-display text-base font-semibold text-ink-800">{title}</p>
        {description && <p className="text-sm text-ink-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}
