import type { TimePeriod, TimeSlot } from '../types';

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (totalMinutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

interface GenerateSlotsParams {
  periods: TimePeriod[];
  slotIntervalMinutes: number;
  /** horários (formato "HH:mm") já ocupados nesse dia */
  occupiedTimes?: string[];
}

/**
 * Gera a lista de horários disponíveis para um dia, a partir dos períodos de
 * atendimento configurados (ex.: 08:00-12:00 e 14:00-18:00) e do intervalo
 * entre horários (ex.: a cada 30 minutos).
 *
 * Horários presentes em `occupiedTimes` são retornados com `available: false`.
 */
export function generateTimeSlots({
  periods,
  slotIntervalMinutes,
  occupiedTimes = [],
}: GenerateSlotsParams): TimeSlot[] {
  if (!periods.length || slotIntervalMinutes <= 0) return [];

  const occupiedSet = new Set(occupiedTimes);
  const slots: TimeSlot[] = [];

  for (const period of periods) {
    const start = timeToMinutes(period.start);
    const end = timeToMinutes(period.end);

    for (let t = start; t < end; t += slotIntervalMinutes) {
      const time = minutesToTime(t);
      slots.push({ time, available: !occupiedSet.has(time) });
    }
  }

  // ordena e remove duplicidades caso períodos se sobreponham
  const uniqueByTime = new Map(slots.map((s) => [s.time, s]));
  return Array.from(uniqueByTime.values()).sort((a, b) =>
    a.time.localeCompare(b.time)
  );
}
