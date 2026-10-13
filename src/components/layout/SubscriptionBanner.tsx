import { Link } from 'react-router-dom';
import { AlertTriangle, Gift } from 'lucide-react';
import type { SubscriptionSummary } from '../../types';

const dayLabel = (n: number) => (n === 1 ? '1 dia' : `${n} dias`);

/** Faixa de aviso no topo do painel: mês grátis acabando ou assinatura vencida. */
export function SubscriptionBanner({ summary }: { summary: SubscriptionSummary }) {
  let tone: 'amber' | 'brick' | null = null;
  let text = '';

  if (summary.status === 'trial') {
    tone = 'amber';
    text =
      summary.freeMonthsBanked > 0
        ? `Seu mês grátis termina em ${dayLabel(summary.daysLeft)}. Em seguida entram seus ${summary.freeMonthsBanked} mês(es) grátis por indicação.`
        : `Seu mês grátis termina em ${dayLabel(summary.daysLeft)}. Depois, a mensalidade é de R$ ${summary.nextPrice}.`;
  } else if (summary.status === 'expired') {
    tone = 'brick';
    text =
      summary.trialDeniedReason && !summary.hasPaid
        ? 'Ative sua assinatura para receber agendamentos: o mês grátis já foi usado neste CPF/CNPJ ou WhatsApp.'
        : 'Sua assinatura venceu. Seus clientes não conseguem agendar até você regularizar.';
  } else if (summary.status === 'active' && summary.daysLeft <= 5 && summary.freeMonthsBanked === 0) {
    tone = 'amber';
    text = `Sua mensalidade vence em ${dayLabel(summary.daysLeft)}.`;
  }
  if (!tone) return null;

  const Icon = tone === 'brick' ? AlertTriangle : Gift;
  const colors = tone === 'brick' ? 'border-brick-100 bg-brick-50 text-brick-600' : 'border-amber-100 bg-amber-50 text-amber-600';

  return (
    <div role="status" className={`mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--radius-chip)] border px-4 py-3 text-sm ${colors}`}>
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 font-medium">{text}</span>
      <Link to="/dashboard/assinatura" className="inline-flex min-h-9 items-center font-semibold underline">
        Ver assinatura
      </Link>
    </div>
  );
}
