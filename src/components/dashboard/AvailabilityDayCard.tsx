import { Plus, Trash2 } from 'lucide-react';
import type { DayAvailability, TimePeriod } from '../../types';
import { SLOT_INTERVAL_PRESETS } from '../../types';
import { Card } from '../ui/Card';
import { Switch } from '../ui/Switch';
import { TimeSlotChip } from '../booking/TimeSlotChip';
import { generateTimeSlots } from '../../utils/slotGenerator';
import { weekdayLabel } from '../../utils/formatters';

interface AvailabilityDayCardProps {
  day: DayAvailability;
  onChange: (updated: DayAvailability) => void;
}

function isValidPeriod(period: TimePeriod): boolean {
  return period.start < period.end;
}

export function AvailabilityDayCard({ day, onChange }: AvailabilityDayCardProps) {
  const hasInvalidPeriod = day.periods.some((p) => !isValidPeriod(p));

  function updatePeriod(index: number, patch: Partial<TimePeriod>) {
    const periods = day.periods.map((p, i) => (i === index ? { ...p, ...patch } : p));
    onChange({ ...day, periods });
  }

  function addPeriod() {
    const lastEnd = day.periods.at(-1)?.end ?? '13:00';
    // o novo período começa onde o anterior terminou e já nasce válido (nunca com fim <= início)
    let end = '18:00';
    if (lastEnd >= '17:00') {
      const [h, m] = lastEnd.split(':').map(Number);
      const total = Math.min(h * 60 + m + 60, 23 * 60 + 59);
      end = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    }
    onChange({ ...day, periods: [...day.periods, { start: lastEnd, end }] });
  }

  function removePeriod(index: number) {
    onChange({ ...day, periods: day.periods.filter((_, i) => i !== index) });
  }

  const validPeriods = day.periods.filter(isValidPeriod);
  const preview = day.enabled
    ? generateTimeSlots({ periods: validPeriods, slotIntervalMinutes: day.slotIntervalMinutes })
    : [];

  return (
    <Card data-testid={`availability-day-${day.dayOfWeek}`} className={['p-4 sm:p-5', day.enabled ? '' : 'bg-paper-200/60'].join(' ')}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-base font-semibold text-ink-900">
          {weekdayLabel(day.dayOfWeek)}
        </p>
        <Switch
          checked={day.enabled}
          onChange={(enabled) => onChange({ ...day, enabled })}
          label={day.enabled ? 'Atende' : 'Fechado'}
        />
      </div>

      {day.enabled && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-700" htmlFor={`interval-${day.dayOfWeek}`}>
              Intervalo entre horários
            </label>
            <select
              id={`interval-${day.dayOfWeek}`}
              value={day.slotIntervalMinutes}
              onChange={(e) => onChange({ ...day, slotIntervalMinutes: Number(e.target.value) })}
              className="h-11 w-full max-w-[13rem] rounded-[var(--radius-chip)] border border-ink-200 bg-white px-3 text-[0.95rem] text-ink-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
            >
              {SLOT_INTERVAL_PRESETS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  A cada {minutes} minutos
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2.5">
            {day.periods.map((period, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="time"
                  value={period.start}
                  onChange={(e) => updatePeriod(index, { start: e.target.value })}
                  className={[
                    'h-11 min-w-0 flex-1 rounded-[var(--radius-chip)] border bg-white px-2.5 text-sm text-ink-900 tabular-time focus:outline-none focus:ring-2 focus:ring-emerald-600/15',
                    isValidPeriod(period) ? 'border-ink-200 focus:border-emerald-600' : 'border-brick-500',
                  ].join(' ')}
                />
                <span className="text-ink-400">até</span>
                <input
                  type="time"
                  value={period.end}
                  onChange={(e) => updatePeriod(index, { end: e.target.value })}
                  className={[
                    'h-11 min-w-0 flex-1 rounded-[var(--radius-chip)] border bg-white px-2.5 text-sm text-ink-900 tabular-time focus:outline-none focus:ring-2 focus:ring-emerald-600/15',
                    isValidPeriod(period) ? 'border-ink-200 focus:border-emerald-600' : 'border-brick-500',
                  ].join(' ')}
                />
                {day.periods.length > 1 && (
                  <button
                    onClick={() => removePeriod(index)}
                    aria-label="Remover período"
                    className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-chip)] text-ink-400 hover:bg-brick-50 hover:text-brick-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            ))}

            {hasInvalidPeriod && (
              <p className="text-sm text-brick-600">
                O horário final precisa ser depois do horário inicial.
              </p>
            )}

            <button
              onClick={addPeriod}
              className="flex min-h-11 items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline"
            >
              <Plus className="size-4" />
              Adicionar período (ex.: intervalo de almoço)
            </button>
          </div>

          <div className="border-t border-ink-100 pt-3">
            <p className="mb-2 text-sm text-ink-500">
              {preview.length > 0
                ? `${preview.length} horário(s) gerado(s) automaticamente:`
                : 'Nenhum horário será gerado com essa configuração.'}
            </p>
            {preview.length > 0 && (
              <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1">
                {preview.map((slot) => (
                  <TimeSlotChip key={slot.time} time={slot.time} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
