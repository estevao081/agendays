import type { HTMLAttributes } from 'react';
import type { AppointmentStatus } from '../../types';

type BadgeTone = 'emerald' | 'amber' | 'brick' | 'ink';

const toneClasses: Record<BadgeTone, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-100',
  brick: 'bg-brick-50 text-brick-600 border-brick-100',
  ink: 'bg-ink-100 text-ink-600 border-ink-100',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = 'ink', className = '', ...props }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium leading-none',
        toneClasses[tone],
        className,
      ].join(' ')}
      {...props}
    />
  );
}

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; tone: BadgeTone }> = {
  agendado: { label: 'Agendado', tone: 'amber' },
  confirmado: { label: 'Confirmado', tone: 'emerald' },
  concluido: { label: 'Concluído', tone: 'ink' },
  cancelado: { label: 'Cancelado', tone: 'brick' },
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
