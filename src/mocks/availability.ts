import type { AvailabilitySettings, DayAvailability, WeekDay } from '../types';

function weekdayPeriod(dayOfWeek: WeekDay): DayAvailability {
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  return {
    dayOfWeek,
    enabled: isWeekday,
    periods: isWeekday ? [{ start: '08:00', end: '18:00' }] : [],
    slotIntervalMinutes: 30,
  };
}

export const mockAvailability: AvailabilitySettings = {
  providerId: 'prov-1',
  days: [0, 1, 2, 3, 4, 5, 6].map((d) => weekdayPeriod(d as WeekDay)),
};
