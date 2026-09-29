import type { ReactNode } from 'react';

interface SummaryRow {
  label: string;
  value: ReactNode;
}

interface BookingSummaryTicketProps {
  rows: SummaryRow[];
  footerNote?: ReactNode;
}

export function BookingSummaryTicket({ rows, footerNote }: BookingSummaryTicketProps) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-ink-100 bg-white shadow-sm shadow-ink-950/5">
      <div className="space-y-3 px-5 py-5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4">
            <span className="text-sm text-ink-400">{row.label}</span>
            <span className="text-right text-sm font-medium text-ink-900">{row.value}</span>
          </div>
        ))}
      </div>

      {footerNote && (
        <>
          <div className="border-t border-dashed border-ink-200" />
          <div className="bg-paper-200/60 px-5 py-3 text-center text-xs text-ink-500">
            {footerNote}
          </div>
        </>
      )}
    </div>
  );
}
