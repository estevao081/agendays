import { addDays, format, isWeekend, subDays } from 'date-fns';
import type { Appointment } from '../types';
import { mockServices } from './services';

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

// Preço e nome do serviço no momento do agendamento (base do cálculo de ganhos)
const snapshot = (serviceId: string) => {
  const s = mockServices.find((x) => x.id === serviceId)!;
  return { serviceId, price: s.price, serviceName: s.name };
};

const base = { providerId: 'prov-1', createdAt: new Date().toISOString() };

const upcomingMocks: Appointment[] = [
  ...(isTodayBusinessDay
    ? [
        { ...base, id: 'appt-1', ...snapshot('svc-1'), clientName: 'João Silva', date: todayStr, time: '10:30' },
        { ...base, id: 'appt-2', ...snapshot('svc-3'), clientName: 'Marcos Andrade', date: todayStr, time: '14:00' },
      ]
    : []),
  { ...base, id: 'appt-3', ...snapshot('svc-2'), clientName: 'Rafael Souza', date: day1, time: '09:00' },
  { ...base, id: 'appt-4', ...snapshot('svc-1'), clientName: 'Pedro Lima', date: day1, time: '11:30' },
  { ...base, id: 'appt-5', ...snapshot('svc-3'), clientName: 'Carlos Eduardo', date: day2, time: '16:00' },
];

/**
 * Histórico de exemplo (dias úteis dos últimos ~200 dias) para o dashboard de
 * ganhos da conta de demonstração não abrir vazio. É determinístico: o mesmo
 * dia sempre gera os mesmos atendimentos.
 */
const HISTORY_DAYS = 200;
const HISTORY_TIMES = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'];
const HISTORY_CLIENTS = ['Lucas Alves', 'Bruno Costa', 'Diego Rocha', 'Felipe Nunes', 'Gustavo Melo', 'Henrique Dias', 'Igor Ramos', 'Thiago Lopes', 'André Barros', 'Caio Freitas'];
const HISTORY_SERVICES = ['svc-1', 'svc-1', 'svc-1', 'svc-2', 'svc-3'];

function historyMocks(): Appointment[] {
  const list: Appointment[] = [];
  for (let i = 1; i <= HISTORY_DAYS; i++) {
    const date = subDays(new Date(), i);
    if (isWeekend(date)) continue;
    const dateStr = format(date, 'yyyy-MM-dd');
    // gerador pseudoaleatório simples e estável (depende só de i)
    let seed = i * 2654435761 % 4294967296;
    const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const count = 2 + Math.floor(rand() * 5); // 2 a 6 atendimentos por dia
    const times = [...HISTORY_TIMES].sort(() => rand() - 0.5).slice(0, count).sort();
    times.forEach((time, n) => {
      const serviceId = HISTORY_SERVICES[Math.floor(rand() * HISTORY_SERVICES.length)];
      list.push({
        ...base,
        id: `appt-h-${i}-${n}`,
        ...snapshot(serviceId),
        clientName: HISTORY_CLIENTS[Math.floor(rand() * HISTORY_CLIENTS.length)],
        date: dateStr,
        time,
      });
    });
  }
  return list;
}

export const mockAppointments: Appointment[] = [...upcomingMocks, ...historyMocks()];
