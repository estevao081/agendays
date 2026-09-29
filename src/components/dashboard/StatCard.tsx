import type { ComponentType } from 'react';
import { Card } from '../ui/Card';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ComponentType<{ className?: string }>;
  tone?: 'emerald' | 'amber' | 'ink';
}

const TONE_CLASSES = {
  emerald: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-600',
  ink: 'bg-ink-100 text-ink-600',
};

export function StatCard({ label, value, icon: Icon, tone = 'ink' }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-500">{label}</p>
          <p className="mt-1.5 font-display text-3xl font-semibold text-ink-900 tabular-time">
            {value}
          </p>
        </div>
        <div className={['flex size-10 items-center justify-center rounded-[var(--radius-chip)]', TONE_CLASSES[tone]].join(' ')}>
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  );
}
