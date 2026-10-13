import { useEffect, useState } from 'react';
import type { Appointment } from '../types';
import { appointmentService } from '../services/appointmentService';

/** Todos os agendamentos do prestador; recarrega quando algum é criado ou excluído (nesta aba ou em outra). */
export function useProviderAppointments(providerId: string | undefined) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => appointmentService.onChange(() => setReloadKey((k) => k + 1)), []);

  useEffect(() => {
    if (!providerId) return;
    let cancelled = false;
    appointmentService.listByProvider(providerId).then((list) => {
      if (cancelled) return;
      setAppointments(list);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [providerId, reloadKey]);

  return { appointments, isLoading };
}
