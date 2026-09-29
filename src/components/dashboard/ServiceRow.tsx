import { Pencil, Trash2, Clock } from 'lucide-react';
import type { Service } from '../../types';
import { Card } from '../ui/Card';
import { Switch } from '../ui/Switch';
import { formatCurrencyBRL, formatDuration } from '../../utils/formatters';

interface ServiceRowProps {
  service: Service;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  isToggling?: boolean;
}

export function ServiceRow({
  service,
  onEdit,
  onDelete,
  onToggleActive,
  isToggling,
}: ServiceRowProps) {
  return (
    <Card
      className={[
        'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between',
        service.active ? '' : 'opacity-60',
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-display text-base font-semibold text-ink-900">
            {service.name}
          </p>
        </div>
        {service.description && (
          <p className="mt-0.5 line-clamp-1 text-sm text-ink-500">{service.description}</p>
        )}
        <div className="mt-1.5 flex items-center gap-3 text-sm text-ink-600">
          <span className="font-medium text-emerald-700">
            {formatCurrencyBRL(service.price)}
          </span>
          <span className="flex items-center gap-1 text-ink-400">
            <Clock className="size-3.5" />
            {formatDuration(service.durationMinutes)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <Switch
          checked={service.active}
          onChange={onToggleActive}
          disabled={isToggling}
          ariaLabel={`${service.active ? 'Desativar' : 'Ativar'} ${service.name}`}
        />

        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            aria-label={`Editar ${service.name}`}
            className="flex size-11 items-center justify-center rounded-[var(--radius-chip)] text-ink-500 hover:bg-ink-100 hover:text-ink-800"
          >
            <Pencil className="size-4" />
          </button>
          <button
            onClick={onDelete}
            aria-label={`Excluir ${service.name}`}
            className="flex size-11 items-center justify-center rounded-[var(--radius-chip)] text-ink-500 hover:bg-brick-50 hover:text-brick-600"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
