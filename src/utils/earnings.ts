import {
  endOfMonth, endOfWeek, endOfYear, format, startOfMonth, startOfWeek, startOfYear,
  subDays, subMonths, subWeeks, subYears,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Appointment } from '../types';

export type Granularity = 'day' | 'week' | 'month' | 'year';

/** Semana comercial: segunda a domingo. */
const WEEK = { weekStartsOn: 1 } as const;
const iso = (d: Date) => format(d, 'yyyy-MM-dd');

export interface Bucket {
  key: string;
  label: string;
  /** primeiro e último dia (yyyy-MM-dd) do período, ambos inclusos */
  from: string;
  to: string;
  /** ganho já realizado: o horário do atendimento já passou */
  realized: number;
  realizedCount: number;
  /** ganho previsto: atendimentos que ainda vão acontecer no período */
  upcoming: number;
  upcomingCount: number;
}

/** O atendimento já aconteceu? (o horário de início já passou) */
export function isRealized(a: Pick<Appointment, 'date' | 'time'>, now: Date): boolean {
  return `${a.date} ${a.time}` <= `${iso(now)} ${format(now, 'HH:mm')}`;
}

function makeBucket(
  appointments: Appointment[], now: Date, key: string, label: string, start: Date, end: Date,
): Bucket {
  const from = iso(start);
  const to = iso(end);
  const bucket: Bucket = { key, label, from, to, realized: 0, realizedCount: 0, upcoming: 0, upcomingCount: 0 };
  for (const a of appointments) {
    if (a.date < from || a.date > to) continue;
    if (isRealized(a, now)) {
      bucket.realized += a.price;
      bucket.realizedCount += 1;
    } else {
      bucket.upcoming += a.price;
      bucket.upcomingCount += 1;
    }
  }
  return bucket;
}

/** Período (dia/semana/mês/ano) que contém `ref`. */
export function periodBucket(appointments: Appointment[], now: Date, g: Granularity, ref: Date = now): Bucket {
  switch (g) {
    case 'day':
      return makeBucket(appointments, now, iso(ref), format(ref, 'dd/MM', { locale: ptBR }), ref, ref);
    case 'week': {
      const s = startOfWeek(ref, WEEK);
      const e = endOfWeek(ref, WEEK);
      return makeBucket(appointments, now, iso(s), `${format(s, 'dd/MM')}–${format(e, 'dd/MM')}`, s, e);
    }
    case 'month':
      return makeBucket(appointments, now, format(ref, 'yyyy-MM'), format(ref, 'MMM/yy', { locale: ptBR }), startOfMonth(ref), endOfMonth(ref));
    case 'year':
      return makeBucket(appointments, now, format(ref, 'yyyy'), format(ref, 'yyyy'), startOfYear(ref), endOfYear(ref));
  }
}

/** Períodos que o gráfico mostra, do mais antigo ao atual. */
export const SERIES_LENGTH: Record<Granularity, number> = { day: 14, week: 8, month: 12, year: 3 };

export function buildSeries(appointments: Appointment[], now: Date, g: Granularity): Bucket[] {
  const back = { day: subDays, week: subWeeks, month: subMonths, year: subYears }[g];
  const n = SERIES_LENGTH[g];
  return Array.from({ length: n }, (_, i) => periodBucket(appointments, now, g, back(now, n - 1 - i)));
}

/** Resumo de hoje, da semana, do mês e do ano. */
export function summarizePeriods(appointments: Appointment[], now: Date): Record<Granularity, Bucket> {
  return {
    day: periodBucket(appointments, now, 'day'),
    week: periodBucket(appointments, now, 'week'),
    month: periodBucket(appointments, now, 'month'),
    year: periodBucket(appointments, now, 'year'),
  };
}

/** Só agendamentos de hoje em diante podem ser excluídos: dias já fechados não mudam o histórico. */
export function canDelete(a: Pick<Appointment, 'date'>, now: Date): boolean {
  return a.date >= iso(now);
}
