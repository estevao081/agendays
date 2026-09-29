import { useState } from 'react';
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
  format,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = [
  { short: 'D', full: 'Domingo' },
  { short: 'S', full: 'Segunda' },
  { short: 'T', full: 'Terça' },
  { short: 'Q', full: 'Quarta' },
  { short: 'Q', full: 'Quinta' },
  { short: 'S', full: 'Sexta' },
  { short: 'S', full: 'Sábado' },
];

interface CalendarProps {
  selectedDate: string | null;
  onSelect: (isoDate: string) => void;
  /** recebe o dia da semana (0-6, Date.getDay()) e diz se o prestador atende nesse dia */
  isWeekdayEnabled: (dayOfWeek: number) => boolean;
}

export function Calendar({ selectedDate, onSelect, isWeekdayEnabled }: CalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const today = startOfDay(new Date());

  const gridStart = startOfWeek(startOfMonth(visibleMonth));
  const gridEnd = endOfWeek(endOfMonth(visibleMonth));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const monthLabel = format(visibleMonth, "MMMM 'de' yyyy", { locale: ptBR });
  const canGoPrev = visibleMonth.getTime() > startOfMonth(today).getTime();

  return (
    <div className="rounded-[var(--radius-card)] border border-ink-100 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setVisibleMonth((m) => subMonths(m, 1))}
          disabled={!canGoPrev}
          aria-label="Mês anterior"
          className="flex size-11 items-center justify-center rounded-[var(--radius-chip)] text-ink-500 hover:bg-ink-100 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="size-5" />
        </button>
        <p aria-live="polite" className="font-display text-sm font-semibold text-ink-900">
          {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
        </p>
        <button
          type="button"
          onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
          aria-label="Próximo mês"
          className="flex size-11 items-center justify-center rounded-[var(--radius-chip)] text-ink-500 hover:bg-ink-100"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-400">
        {WEEKDAYS.map((d, i) => (
          <abbr key={i} title={d.full} className="py-1 no-underline">
            {d.short}
          </abbr>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, visibleMonth);
          const isPast = isBefore(day, today);
          const enabled = isWeekdayEnabled(day.getDay());
          const iso = format(day, 'yyyy-MM-dd');
          const isSelected = selectedDate === iso;
          const isToday = isSameDay(day, today);
          const disabled = !inMonth || isPast || !enabled;

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(iso)}
              aria-label={format(day, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
              className={[
                'aspect-square min-h-10 rounded-[var(--radius-chip)] text-sm font-medium transition-colors',
                !inMonth ? 'invisible' : '',
                isSelected
                  ? 'bg-emerald-600 text-white'
                  : disabled
                    ? 'text-ink-200'
                    : 'text-ink-700 hover:bg-emerald-50 hover:text-emerald-700',
                isToday && !isSelected ? 'ring-1 ring-inset ring-emerald-500/40' : '',
              ].join(' ')}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}
