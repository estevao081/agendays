import { Clock, CalendarDays, Trash2 } from 'lucide-react';
import type { Appointment } from '../../types';
import { formatDateBR } from '../../utils/formatters';

interface AppointmentCardProps {
  appointment: Appointment;
  serviceName: string;
  /** Quando informado, mostra o botão de excluir (cliente avisou que não vai comparecer). */
  onDelete?: (appointment: Appointment) => void;
}

export function AppointmentCard({ appointment, serviceName, onDelete }: AppointmentCardProps) {
  return (
    <div className="flex items-start gap-3.5 rounded-[var(--radius-chip)] border border-ink-100 bg-white px-4 py-3.5">
      <div
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink-100 font-display text-sm font-semibold text-ink-700"
      >
        {appointment.clientName.charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-medium text-ink-900">{appointment.clientName}</p>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(appointment)}
              aria-label={`Excluir agendamento de ${appointment.clientName}`}
              className="-mr-2 -mt-2 flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-chip)] text-ink-400 transition-colors hover:bg-brick-50 hover:text-brick-600"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
        <p className="truncate text-sm text-ink-500">{serviceName}</p>
        <p className="mt-1.5 flex items-center gap-3 text-xs text-ink-600">
          <span className="tabular-time flex items-center gap-1">
            <Clock className="size-3.5 text-ink-400" />
            {appointment.time}
          </span>
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5 text-ink-400" />
            {formatDateBR(appointment.date)}
          </span>
        </p>
      </div>
    </div>
  );
}
