/** 0 = domingo, 1 = segunda, ..., 6 = sábado (padrão Date.getDay()) */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface TimePeriod {
  /** formato "HH:mm" */
  start: string;
  /** formato "HH:mm" */
  end: string;
}

/** Intervalos predefinidos entre horários disponíveis, em minutos */
export const SLOT_INTERVAL_PRESETS = [5, 10, 15, 20, 25, 30, 45, 60, 90, 120] as const;
export type SlotIntervalPreset = (typeof SLOT_INTERVAL_PRESETS)[number];

export interface DayAvailability {
  dayOfWeek: WeekDay;
  enabled: boolean;
  /** suporta múltiplos períodos no mesmo dia (ex.: manhã e tarde) */
  periods: TimePeriod[];
  /** intervalo entre horários, em minutos. Aceita preset ou valor customizado futuro */
  slotIntervalMinutes: number;
}

export interface AvailabilitySettings {
  providerId: string;
  days: DayAvailability[];
}

export interface TimeSlot {
  /** formato "HH:mm" */
  time: string;
  available: boolean;
}
