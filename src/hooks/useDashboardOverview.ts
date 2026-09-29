import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import type { Appointment, Provider, Service } from '../types';
import { appointmentService } from '../services/appointmentService';
import { serviceService } from '../services/serviceService';
import { providerService } from '../services/providerService';
import { notificationService } from '../services/notificationService';

export interface DashboardOverviewData {
  isLoading: boolean;
  provider: Provider | null;
  services: Service[];
  todayCount: number;
  upcoming: Appointment[];
  upcomingCount: number;
  totalClients: number;
  serviceNameById: Map<string, string>;
}

const ACTIVE_STATUSES = new Set(['agendado', 'confirmado']);

export function useDashboardOverview(providerId: string | undefined): DashboardOverviewData {
  const [isLoading, setIsLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // um novo agendamento (mesma aba ou outra) gera uma notificação: recarrega os dados
  useEffect(() => notificationService.subscribe(() => setReloadKey((k) => k + 1)), []);

  useEffect(() => {
    if (!providerId) return;
    let cancelled = false;

    Promise.all([
      appointmentService.listByProvider(providerId),
      serviceService.listByProvider(providerId),
      providerService.getById(providerId),
    ]).then(([appts, svcs, prov]) => {
      if (cancelled) return;
      setAppointments(appts);
      setServices(svcs);
      setProvider(prov);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [providerId, reloadKey]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const nowTime = format(new Date(), 'HH:mm');

  const todayCount = appointments.filter(
    (a) => a.date === today && a.status !== 'cancelado'
  ).length;

  const upcoming = appointments
    .filter((a) => {
      if (!ACTIVE_STATUSES.has(a.status)) return false;
      if (a.date > today) return true;
      if (a.date === today) return a.time >= nowTime;
      return false;
    })
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const totalClients = new Set(appointments.map((a) => a.clientName.trim().toLowerCase())).size;

  const serviceNameById = new Map(services.map((s) => [s.id, s.name]));

  return {
    isLoading,
    provider,
    services,
    todayCount,
    upcoming,
    upcomingCount: upcoming.length,
    totalClients,
    serviceNameById,
  };
}
