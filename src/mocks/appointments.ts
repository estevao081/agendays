import { addDays, format, isWeekend } from 'date-fns';
import type { Appointment } from '../types';

/** Retorna o próximo dia útil a partir de hoje + offset de dias úteis */
function nextBusinessDay(businessDaysAhead: number): string {
  let date = new Date();
  let count = 0;
  while (count < businessDaysAhead) {
    date = addDays(date, 1);
    if (!isWeekend(date)) count++;
  }
  return format(date, 'yyyy-MM-dd');
}

const todayStr = format(new Date(), 'yyyy-MM-dd');
const isTodayBusinessDay = !isWeekend(new Date());

const day1 = nextBusinessDay(1);
const day2 = nextBusinessDay(2);

export const mockAppointments: Appointment[] = [
  ...(isTodayBusinessDay
    ? [
        {
          id: 'appt-1',
          providerId: 'prov-1',
          serviceId: 'svc-1',
          clientName: 'João Silva',
          date: todayStr,
          time: '10:30',
          status: 'confirmado' as const,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'appt-2',
          providerId: 'prov-1',
          serviceId: 'svc-3',
          clientName: 'Marcos Andrade',
          date: todayStr,
          time: '14:00',
          status: 'agendado' as const,
          createdAt: new Date().toISOString(),
        },
      ]
    : []),
  {
    id: 'appt-3',
    providerId: 'prov-1',
    serviceId: 'svc-2',
    clientName: 'Rafael Souza',
    date: day1,
    time: '09:00',
    status: 'agendado',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'appt-4',
    providerId: 'prov-1',
    serviceId: 'svc-1',
    clientName: 'Pedro Lima',
    date: day1,
    time: '11:30',
    status: 'confirmado',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'appt-5',
    providerId: 'prov-1',
    serviceId: 'svc-3',
    clientName: 'Carlos Eduardo',
    date: day2,
    time: '16:00',
    status: 'agendado',
    createdAt: new Date().toISOString(),
  },
];
