import { CalendarCheck2, CalendarClock, Users, Scissors, PartyPopper } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { StatCard, AppointmentCard, ShareLinkCard, DeleteAppointmentDialog } from '../../components/dashboard';
import { EmptyState, Spinner } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { useDashboardOverview } from '../../hooks/useDashboardOverview';
import type { Appointment } from '../../types';

const UPCOMING_LIST_LIMIT = 6;

export function OverviewPage() {
  const { user } = useAuth();
  const [deleting, setDeleting] = useState<Appointment | null>(null);
  const {
    isLoading,
    provider,
    services,
    todayCount,
    upcoming,
    upcomingCount,
    totalClients,
    serviceNameById,
  } = useDashboardOverview(user?.providerId);

  if (isLoading) return <Spinner label="Carregando visão geral…" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink-900">
          Olá, {user?.name?.split(' ')[0]} 👋
        </h2>
        <p className="text-sm text-ink-500">Aqui está o resumo do seu negócio hoje.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Agendamentos de hoje" value={todayCount} icon={CalendarCheck2} tone="emerald" />
        <StatCard label="Próximos agendamentos" value={upcomingCount} icon={CalendarClock} tone="amber" />
        <StatCard label="Total de clientes" value={totalClients} icon={Users} tone="ink" />
        <StatCard label="Serviços cadastrados" value={services.length} icon={Scissors} tone="ink" />
      </div>

      {provider && <ShareLinkCard slug={provider.slug} businessName={provider.businessName} />}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-ink-800">
            Próximos agendamentos
          </h3>
          <Link to="/dashboard/agendamentos" className="inline-flex min-h-9 items-center text-sm font-medium text-emerald-700 hover:underline">
            Ver todos
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <EmptyState
            icon={<PartyPopper className="size-8" />}
            title="Nenhum agendamento por aqui"
            description="Assim que um cliente agendar pelo seu link, ele aparece nesta lista."
          />
        ) : (
          <div className="space-y-2.5">
            {upcoming.slice(0, UPCOMING_LIST_LIMIT).map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                serviceName={serviceNameById.get(appointment.serviceId) ?? appointment.serviceName}
                onDelete={setDeleting}
              />
            ))}
            {upcoming.length > UPCOMING_LIST_LIMIT && (
              <p className="pt-1 text-center text-sm text-ink-400">
                + {upcoming.length - UPCOMING_LIST_LIMIT} agendamento(s) mais adiante
              </p>
            )}
          </div>
        )}
      </div>
      <DeleteAppointmentDialog appointment={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
