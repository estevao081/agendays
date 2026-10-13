import { useState } from 'react';
import { format } from 'date-fns';
import { Check, Clock, Copy, CreditCard, Gift, Info, Users } from 'lucide-react';
import { Badge, Button, Card, Spinner } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { useToast } from '../../hooks/useToast';
import { billingService } from '../../services/billingService';
import { formatCurrencyBRL } from '../../utils/formatters';
import { REFERRAL_HOLD_DAYS } from '../../utils/billing';
import type { SubscriptionStatus } from '../../types';

const fmtDate = (iso: string) => format(new Date(iso), 'dd/MM/yyyy');
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const STATUS_BADGE: Record<SubscriptionStatus, { label: string; tone: 'emerald' | 'amber' | 'brick' | 'ink' }> = {
  trial: { label: 'Mês grátis', tone: 'amber' },
  active: { label: 'Assinatura ativa', tone: 'emerald' },
  expired: { label: 'Vencida', tone: 'brick' },
};

export function SubscriptionPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { summary, isLoading, refresh } = useSubscription(user?.providerId);
  const [isPaying, setIsPaying] = useState(false);
  const [copied, setCopied] = useState(false);

  if (isLoading || !summary || !user) return <Spinner label="Carregando assinatura…" />;

  const referralUrl = `${window.location.origin}/cadastro?ref=${summary.referralCode}`;
  const trialAlreadyUsed = summary.trialDeniedReason !== null && !summary.hasPaid;
  const badge =
    trialAlreadyUsed && summary.status === 'expired' ? { label: 'Sem assinatura', tone: 'amber' as const } : STATUS_BADGE[summary.status];
  const payLabel = {
    trial: 'Assinar agora',
    active: 'Renovar mensalidade',
    expired: trialAlreadyUsed ? 'Assinar agora' : 'Reativar assinatura',
  }[summary.status];
  const bankFull = summary.freeMonthsBanked >= summary.maxFreeMonths;

  async function handlePay() {
    setIsPaying(true);
    try {
      await billingService.pay(user!.providerId);
      await refresh();
      showToast({ message: 'Pagamento registrado.', description: 'Obrigado por assinar o agendasys!', variant: 'success' });
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : 'Não foi possível pagar.', variant: 'error' });
    } finally {
      setIsPaying(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      showToast({ message: 'Link de indicação copiado!', variant: 'success' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast({ message: 'Não foi possível copiar', description: 'Selecione o link e copie manualmente.', variant: 'error' });
    }
  }

  // histórico em ordem cronológica inversa (meses grátis entram na data em que começam a valer)
  const history = [...summary.payments].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="max-w-2xl space-y-5">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold text-ink-900">Seu plano</h3>
            <p className="mt-0.5 text-sm text-ink-500">Primeiro mês grátis; depois {formatCurrencyBRL(summary.nextPrice)} por mês.</p>
          </div>
          <Badge tone={badge.tone} className="shrink-0 whitespace-nowrap">
            {badge.label}
          </Badge>
        </div>

        {trialAlreadyUsed && (
          <div role="note" className="mt-4 flex gap-2.5 rounded-[var(--radius-chip)] border border-amber-100 bg-amber-50 p-3 text-sm text-amber-700">
            <Info className="mt-0.5 size-4 shrink-0" />
            <p>
              O mês grátis não foi aplicado: este {summary.trialDeniedReason === 'document' ? 'CPF/CNPJ' : 'WhatsApp'} já usou
              o período de teste em outra conta. Assine para começar a receber agendamentos.
            </p>
          </div>
        )}

        <p className="mt-4 text-sm text-ink-700" data-testid="subscription-status-text">
          {summary.status === 'trial' && `Seu mês grátis vai até ${fmtDate(summary.currentPeriodEndsAt!)} (${summary.daysLeft} dia(s)).`}
          {summary.status === 'active' && `Assinatura ativa até ${fmtDate(summary.currentPeriodEndsAt!)}.`}
          {summary.status === 'expired' &&
            (trialAlreadyUsed ? 'Sua assinatura ainda não está ativa.' : 'Sua assinatura venceu. Reative para voltar a receber agendamentos.')}
        </p>

        {summary.freeMonthsBanked > 0 && (
          <p className="mt-2 flex items-start gap-1.5 text-sm text-emerald-700" data-testid="banked-note">
            <Gift className="mt-0.5 size-4 shrink-0" />
            <span>
              Você tem {plural(summary.freeMonthsBanked, 'mês grátis guardado', 'meses grátis guardados')} por indicação.
              {summary.currentPeriodEndsAt
                ? ` Entram automaticamente quando o período atual terminar, em ${fmtDate(summary.currentPeriodEndsAt)}.`
                : ' Entram automaticamente.'}
            </span>
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs text-ink-400">Mensalidade</p>
            <p className="font-display text-2xl font-semibold text-ink-900" data-testid="next-price">
              {formatCurrencyBRL(summary.nextPrice)}
            </p>
          </div>
          <Button variant="secondary" onClick={handlePay} isLoading={isPaying}>
            <CreditCard className="size-4" />
            {payLabel} · {formatCurrencyBRL(summary.nextPrice)}
          </Button>
        </div>
        <p className="mt-3 text-xs text-ink-400">Pagamento simulado nesta versão de demonstração — nenhuma cobrança real é feita.</p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Gift className="size-5 text-emerald-600" />
          <h3 className="font-display text-base font-semibold text-ink-900">Indique e ganhe meses grátis</h3>
        </div>
        <p className="mt-1 text-sm text-ink-500">
          Cada pessoa que você indicar e que assinar rende <strong>1 mês grátis</strong> para você. Você pode guardar no máximo{' '}
          {summary.maxFreeMonths} meses; eles entram automaticamente quando seu período atual terminar.
        </p>
        <p className="mt-1 text-xs text-ink-400">
          Cada indicação é confirmada {REFERRAL_HOLD_DAYS} dias depois da 1ª mensalidade do indicado (prazo de desistência
          do consumidor). Não vale indicar a si mesmo ou a uma conta com o mesmo CPF/CNPJ ou WhatsApp.
        </p>

        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-medium text-ink-800">
              <Users className="size-4 text-ink-400" />
              <span data-testid="free-months">
                Meses grátis guardados: {summary.freeMonthsBanked} de {summary.maxFreeMonths}
              </span>
            </span>
            <span className="text-xs text-ink-400" data-testid="referrals-total">
              {plural(summary.referralsTotal, 'indicação confirmada', 'indicações confirmadas')}
            </span>
          </div>
          <div
            className="mt-2 flex gap-1.5"
            role="progressbar"
            aria-label="Meses grátis guardados"
            aria-valuemin={0}
            aria-valuemax={summary.maxFreeMonths}
            aria-valuenow={summary.freeMonthsBanked}
          >
            {Array.from({ length: summary.maxFreeMonths }, (_, i) => (
              <div key={i} className={`h-2 flex-1 rounded-full ${i < summary.freeMonthsBanked ? 'bg-emerald-600' : 'bg-ink-100'}`} />
            ))}
          </div>
          {bankFull && (
            <p className="mt-2 text-xs text-amber-600" data-testid="bank-full">
              Você chegou ao limite de {summary.maxFreeMonths} meses guardados. Novas indicações só rendem mês grátis depois
              que você usar algum.
            </p>
          )}
          {summary.referralsPending > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600" data-testid="referral-pending">
              <Clock className="size-3.5" />
              {summary.referralsPending} indicação(ões) em confirmação
              {summary.nextReferralConfirmAt ? ` — próxima em ${fmtDate(summary.nextReferralConfirmAt)}` : ''}
            </p>
          )}
        </div>

        <div className="mt-4 rounded-[var(--radius-chip)] border border-ink-100 bg-paper-200/70 px-3.5 py-3">
          <p className="text-xs text-ink-400">Seu código</p>
          <p className="select-all font-display text-lg font-semibold tracking-wider text-ink-900">{summary.referralCode}</p>
          <p className="mt-1 break-all text-xs text-ink-500">{referralUrl}</p>
        </div>
        <Button className="mt-3" variant="secondary" onClick={handleCopy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? 'Copiado' : 'Copiar link de indicação'}
        </Button>
      </Card>

      <Card className="p-5">
        <h3 className="font-display text-base font-semibold text-ink-900">Histórico</h3>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-ink-500">Nenhum pagamento ainda.</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink-100">
            {history.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-ink-600">
                  {fmtDate(p.date)}
                  {p.source === 'referral_credit' && <span className="ml-2 text-xs text-emerald-700">Mês grátis por indicação</span>}
                </span>
                <span className="font-medium text-ink-900">{formatCurrencyBRL(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
