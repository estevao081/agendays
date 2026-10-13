import { useMemo, useState } from 'react';
import { Card, EmptyState, Spinner } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { useProviderAppointments } from '../../hooks/useProviderAppointments';
import { buildSeries, summarizePeriods, type Bucket, type Granularity } from '../../utils/earnings';
import { formatCurrencyBRL, formatDateBR } from '../../utils/formatters';

const TABS: { id: Granularity; label: string; caption: string }[] = [
  { id: 'day', label: 'Dia', caption: 'Últimos 14 dias' },
  { id: 'week', label: 'Semana', caption: 'Últimas 8 semanas (segunda a domingo)' },
  { id: 'month', label: 'Mês', caption: 'Últimos 12 meses' },
  { id: 'year', label: 'Ano', caption: 'Últimos 3 anos' },
];

const CARD_TITLES: Record<Granularity, string> = { day: 'Hoje', week: 'Esta semana', month: 'Este mês', year: 'Este ano' };

function rangeLabel(b: Bucket): string {
  return b.from === b.to ? formatDateBR(b.from) : `${formatDateBR(b.from)} a ${formatDateBR(b.to)}`;
}

function SummaryCard({ granularity, bucket }: { granularity: Granularity; bucket: Bucket }) {
  return (
    <Card className="min-w-0 p-4 sm:p-5" data-testid={`earnings-${granularity}`}>
      <p className="text-sm text-ink-500">{CARD_TITLES[granularity]}</p>
      <p className="mt-1.5 font-display text-xl font-semibold text-ink-900 tabular-time sm:text-2xl" data-testid={`earnings-${granularity}-value`}>
        {formatCurrencyBRL(bucket.realized)}
      </p>
      <p className="mt-1 text-xs text-ink-500">
        {bucket.realizedCount} atendimento{bucket.realizedCount === 1 ? '' : 's'}
      </p>
      {bucket.upcomingCount > 0 && (
        <p className="mt-0.5 text-xs text-amber-600">
          + {formatCurrencyBRL(bucket.upcoming)} previsto ({bucket.upcomingCount} agendado{bucket.upcomingCount === 1 ? '' : 's'})
        </p>
      )}
      <p className="mt-2 text-[11px] text-ink-400">{rangeLabel(bucket)}</p>
    </Card>
  );
}

/** Rótulo curto para o eixo do gráfico (o completo fica na tabela). */
function axisLabel(b: Bucket, g: Granularity): string {
  if (g === 'week') return `${b.from.slice(8, 10)}/${b.from.slice(5, 7)}`;
  if (g === 'month') return b.label.split('/')[0];
  return b.label;
}

function BarChart({ series, granularity }: { series: Bucket[]; granularity: Granularity }) {
  const max = Math.max(1, ...series.map((b) => b.realized + b.upcoming));
  const labelStep = granularity === 'day' ? 2 : 1;

  return (
    <div>
      <div className="flex items-end justify-between text-[11px] text-ink-400">
        <span>{formatCurrencyBRL(max)}</span>
      </div>
      {/* o gráfico é decorativo: os mesmos números estão na tabela abaixo */}
      <div aria-hidden="true" className="mt-1 flex h-44 items-end gap-1 border-b border-ink-100 sm:gap-2">
        {series.map((b) => {
          const total = b.realized + b.upcoming;
          return (
            <div key={b.key} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${b.label}: ${formatCurrencyBRL(total)}`}>
              <div className="w-full rounded-t-sm bg-amber-400/70" style={{ height: `${(b.upcoming / max) * 100}%` }} />
              <div className="w-full bg-emerald-600" style={{ height: `${(b.realized / max) * 100}%`, minHeight: b.realized > 0 ? 2 : 0 }} />
            </div>
          );
        })}
      </div>
      <div aria-hidden="true" className="mt-1.5 flex justify-between gap-1 overflow-visible sm:gap-2">
        {series.map((b, i) => (
          <span key={b.key} className="min-w-0 flex-1 whitespace-nowrap text-center text-[10px] text-ink-400">
            {i % labelStep === (series.length - 1) % labelStep ? axisLabel(b, granularity) : ''}
          </span>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-ink-500">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-emerald-600" />Realizado</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-amber-400/70" />Previsto</span>
      </div>
    </div>
  );
}

export function EarningsPage() {
  const { user } = useAuth();
  const { appointments, isLoading } = useProviderAppointments(user?.providerId);
  const [granularity, setGranularity] = useState<Granularity>('day');

  const now = new Date();
  const summary = useMemo(() => summarizePeriods(appointments, now), [appointments]); // eslint-disable-line react-hooks/exhaustive-deps
  const series = useMemo(() => buildSeries(appointments, now, granularity), [appointments, granularity]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <Spinner label="Calculando ganhos…" />;

  const tab = TABS.find((t) => t.id === granularity)!;
  const hasAny = appointments.length > 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(['day', 'week', 'month', 'year'] as const).map((g) => (
          <SummaryCard key={g} granularity={g} bucket={summary[g]} />
        ))}
      </div>

      {!hasAny ? (
        <EmptyState
          title="Ainda não há ganhos para mostrar"
          description="Assim que seus clientes agendarem e os atendimentos acontecerem, os valores aparecem aqui."
        />
      ) : (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-semibold text-ink-900">Ganhos por período</h3>
              <p className="text-sm text-ink-500">{tab.caption}</p>
            </div>
            <div role="tablist" aria-label="Período" className="flex rounded-[var(--radius-chip)] bg-ink-100 p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  type="button"
                  aria-selected={granularity === t.id}
                  onClick={() => setGranularity(t.id)}
                  className={[
                    'min-h-9 rounded-[8px] px-3 text-sm font-medium transition-colors',
                    granularity === t.id ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800',
                  ].join(' ')}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <BarChart series={series} granularity={granularity} />
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm" data-testid="earnings-table">
              <caption className="sr-only">Ganhos por {tab.label.toLowerCase()}</caption>
              <thead>
                <tr className="border-b border-ink-100 text-xs text-ink-400">
                  <th scope="col" className="py-2 pr-2 font-medium">Período</th>
                  <th scope="col" className="py-2 pr-2 text-right font-medium"><abbr title="Atendimentos" className="no-underline">Atend.</abbr></th>
                  <th scope="col" className="py-2 pr-2 text-right font-medium">Ganho</th>
                  <th scope="col" className="py-2 text-right font-medium">Previsto</th>
                </tr>
              </thead>
              <tbody>
                {[...series].reverse().map((b) => (
                  <tr key={b.key} className="border-b border-ink-100/70 last:border-0">
                    <th scope="row" className="py-2 pr-2 font-medium text-ink-800">{b.label}</th>
                    <td className="py-2 pr-2 text-right tabular-time text-ink-600">{b.realizedCount}</td>
                    <td className="py-2 pr-2 text-right tabular-time font-medium text-ink-900">{formatCurrencyBRL(b.realized)}</td>
                    <td className="py-2 text-right tabular-time text-amber-600">{b.upcomingCount > 0 ? formatCurrencyBRL(b.upcoming) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-ink-400">
            Ganho = soma dos preços dos atendimentos cujo horário já passou, com o valor do serviço na data do agendamento.
            Agendamentos excluídos não entram.
          </p>
        </Card>
      )}
    </div>
  );
}
