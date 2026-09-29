import { Clock, ChevronRight } from 'lucide-react';
import type { Service } from '../../types';
import { formatCurrencyBRL, formatDuration } from '../../utils/formatters';

interface ServiceCardProps {
  service: Service;
  onSelect?: () => void;
  selected?: boolean;
}

export function ServiceCard({ service, onSelect, selected = false }: ServiceCardProps) {
  const isInteractive = !!onSelect;

  const content = (
    <>
      <div className="min-w-0 flex-1 text-left">
        <p className="font-display text-base font-semibold text-ink-900">{service.name}</p>
        {service.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-ink-500">{service.description}</p>
        )}
        <div className="mt-2 flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1 text-ink-400">
            <Clock className="size-3.5" />
            {formatDuration(service.durationMinutes)}
          </span>
          <span className="font-semibold text-emerald-700">
            {formatCurrencyBRL(service.price)}
          </span>
        </div>
      </div>
      {isInteractive && (
        <ChevronRight
          className={['size-5 shrink-0', selected ? 'text-emerald-600' : 'text-ink-300'].join(' ')}
        />
      )}
    </>
  );

  const className = [
    'flex w-full items-center gap-3 rounded-[var(--radius-card)] border bg-white p-4 text-left transition-colors',
    selected ? 'border-emerald-600 ring-1 ring-emerald-600/20' : 'border-ink-100',
    isInteractive ? 'hover:border-emerald-400 active:bg-paper-200' : '',
  ].join(' ');

  if (!isInteractive) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button type="button" onClick={onSelect} className={className}>
      {content}
    </button>
  );
}
