import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { CalendarX2 } from 'lucide-react';
import { AppointmentCard, DeleteAppointmentDialog } from '../../components/dashboard';
import { EmptyState, Spinner } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { useProviderAppointments } from '../../hooks/useProviderAppointments';
import { canDelete } from '../../utils/earnings';
import { formatDateBR, parseIsoDateLocal, weekdayLabel } from '../../utils/formatters';
import type { Appointment } from '../../types';

function dayHeading(date: string, now: Date): string {
  if (date === format(now, 'yyyy-MM-dd')) return 'Hoje';
  if (date === format(addDays(now, 1), 'yyyy-MM-dd')) return 'Amanhã';
  return `${weekdayLabel(parseIsoDateLocal(date).getDay())}, ${formatDateBR(date)}`;
}

export function AppointmentsPage() {
  const { user } = useAuth();
  const { appointments, isLoading } = useProviderAppointments(user?.providerId);
  const [deleting, setDeleting] = useState<Appointment | null>(null);

  if (isLoading) return <Spinner label="Carregando agendamentos…" />;

  const now = new Date();
  // de hoje em diante (dias já fechados ficam de fora: eles compõem o histórico de ganhos)
  const list = appointments
    .filter((a) => canDelete(a, now))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const groups = new Map<string, Appointment[]>();
  for (const a of list) groups.set(a.date, [...(groups.get(a.date) ?? []), a]);

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-sm text-ink-500">
        O cliente avisou que não vai comparecer e não quer remarcar? Exclua o agendamento para liberar o horário.
      </p>

      {list.length === 0 ? (
        <EmptyState
          icon={<CalendarX2 className="size-8" />}
          title="Nenhum agendamento pela frente"
          description="Quando um cliente agendar pelo seu link, ele aparece aqui."
        />
      ) : (
        [...groups.entries()].map(([date, items]) => (
          <section key={date} aria-label={dayHeading(date, now)}>
            <h3 className="mb-2 font-display text-sm font-semibold text-ink-800">{dayHeading(date, now)}</h3>
            <div className="space-y-2.5">
              {items.map((a) => (
                <AppointmentCard key={a.id} appointment={a} serviceName={a.serviceName} onDelete={setDeleting} />
              ))}
            </div>
          </section>
        ))
      )}

      <DeleteAppointmentDialog appointment={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
