import { ArrowLeft } from 'lucide-react';

interface BookingStepHeaderProps {
  step: number;
  totalSteps: number;
  title: string;
  onBack?: () => void;
}

export function BookingStepHeader({ step, totalSteps, title, onBack }: BookingStepHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-paper-100/95 px-5 pb-3 pt-5 backdrop-blur">
      <div className="mb-3 flex items-center gap-3">
        {onBack ? (
          <button
            onClick={onBack}
            aria-label="Voltar"
            className="-ml-3 flex size-11 items-center justify-center rounded-[var(--radius-chip)] text-ink-500 hover:bg-ink-100"
          >
            <ArrowLeft className="size-5" />
          </button>
        ) : (
          <div className="size-2" />
        )}
        <h1 className="font-display text-base font-semibold text-ink-900">{title}</h1>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={[
              'h-1.5 flex-1 rounded-full transition-colors',
              i < step ? 'bg-emerald-600' : 'bg-ink-100',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}
