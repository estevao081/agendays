import type { ReactNode } from 'react';

export function PagePlaceholder({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-ink-200 bg-white/60 p-8 text-center">
      <p className="font-display text-lg font-semibold text-ink-800">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400">{description}</p>}
      {children}
    </div>
  );
}
