interface TimeSlotChipProps {
  time: string;
  available?: boolean;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export function TimeSlotChip({
  time,
  available = true,
  selected = false,
  onClick,
  disabled = false,
}: TimeSlotChipProps) {
  const isInteractive = !!onClick;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !available || !isInteractive}
      aria-pressed={isInteractive ? selected : undefined}
      aria-label={available ? time : `${time} — indisponível`}
      title={available ? undefined : 'Horário indisponível'}
      className={[
        'tabular-time inline-flex h-11 shrink-0 items-center justify-center rounded-[var(--radius-chip)] border px-3.5 text-sm font-medium transition-colors',
        selected
          ? 'border-emerald-600 bg-emerald-600 text-white'
          : available
            ? 'border-ink-200 bg-white text-ink-700 hover:border-emerald-500 hover:text-emerald-700'
            : 'border-ink-100 bg-ink-100 text-ink-300 line-through',
        !isInteractive ? 'h-9 cursor-default hover:border-ink-200 hover:text-ink-700' : '',
      ].join(' ')}
    >
      {time}
    </button>
  );
}
