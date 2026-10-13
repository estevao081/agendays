import { addDays, addMonths } from 'date-fns';
import type { Payment, SubscriptionRecord, SubscriptionSummary, TrialDeniedReason } from '../types';

/** Regras comerciais — ponto único para ajustar preço e promoções. */
export const BASE_PRICE = 50;
export const TRIAL_MONTHS = 1;
/** Cada indicado confirmado rende 1 mês grátis, e o saldo guardado nunca passa disto. */
export const MAX_BANKED_FREE_MONTHS = 3;
/**
 * A indicação só vale depois deste prazo contado da 1ª mensalidade do indicado
 * (o consumidor tem 7 dias para desistir de compra online — CDC, art. 49).
 * Evita ganhar mês grátis com contas criadas só para assinar e pedir reembolso.
 */
export const REFERRAL_HOLD_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
const t = (iso: string | null): number => (iso ? new Date(iso).getTime() : 0);
const maxDate = (a: Date, b: Date): Date => (b > a ? b : a);

/** Estado inicial de uma conta nova: só o mês grátis de boas-vindas. */
export function newSubscriptionRecord(
  providerId: string,
  referralCode: string,
  referredByProviderId: string | null,
  now: Date,
  /** quando informado, a conta nasce sem o mês grátis (já usado por este documento/WhatsApp) */
  trialDeniedReason?: TrialDeniedReason,
): SubscriptionRecord {
  return {
    providerId,
    referralCode,
    referredByProviderId,
    trialEndsAt: trialDeniedReason ? now.toISOString() : addMonths(now, TRIAL_MONTHS).toISOString(),
    paidUntil: null,
    freeMonthCredits: [],
    referralsPending: [],
    referralsConverted: [],
    payments: [],
    ...(trialDeniedReason ? { trialDeniedReason } : {}),
  };
}

/** O prestador já pagou de verdade alguma vez? (mês grátis por indicação não conta) */
export const hasPaid = (record: SubscriptionRecord): boolean => record.payments.some((p) => p.source !== 'referral_credit');

/**
 * Registros gravados pela regra antiga (ano grátis) ou sem os campos novos:
 * o ano grátis vira período coberto e os campos ausentes ganham valor padrão.
 * Devolve o MESMO objeto quando não há o que ajustar (importante para detectar mudanças).
 */
function normalize(record: SubscriptionRecord): SubscriptionRecord {
  const legacy = record as SubscriptionRecord & { freeUntil?: string | null };
  if (Array.isArray(record.freeMonthCredits) && Array.isArray(record.referralsPending) && !('freeUntil' in legacy)) return record;

  const { freeUntil, ...rest } = legacy;
  const paidUntil = freeUntil && (!rest.paidUntil || freeUntil > rest.paidUntil) ? freeUntil : rest.paidUntil;
  return { ...rest, paidUntil: paidUntil ?? null, freeMonthCredits: rest.freeMonthCredits ?? [], referralsPending: rest.referralsPending ?? [] };
}

/** Até quando a conta está coberta (teste ou período pago/grátis), sem contar meses ainda guardados. */
const coverageEnd = (record: SubscriptionRecord): Date =>
  maxDate(new Date(record.trialEndsAt), record.paidUntil ? new Date(record.paidUntil) : new Date(0));

export function summarize(recordInput: SubscriptionRecord, nowDate: Date): SubscriptionSummary {
  const record = normalize(recordInput);
  const now = nowDate.getTime();
  const total = record.referralsConverted.length;
  const pending = record.referralsPending ?? [];
  const nextConfirm = pending.length
    ? pending.map((p) => addDays(new Date(p.paidAt), REFERRAL_HOLD_DAYS).toISOString()).sort()[0]
    : null;

  let status: SubscriptionSummary['status'];
  let endsAt: string | null;
  if (t(record.trialEndsAt) > now) {
    status = 'trial';
    endsAt = record.trialEndsAt;
  } else if (t(record.paidUntil) > now) {
    status = 'active';
    endsAt = record.paidUntil;
  } else {
    status = 'expired';
    endsAt = null;
  }

  return {
    providerId: record.providerId,
    status,
    hasAccess: status !== 'expired',
    currentPeriodEndsAt: endsAt,
    daysLeft: endsAt ? Math.max(0, Math.ceil((t(endsAt) - now) / DAY_MS)) : 0,
    nextPrice: BASE_PRICE,
    hasPaid: hasPaid(record),
    referralCode: record.referralCode,
    referralsTotal: total,
    referralsPending: pending.length,
    nextReferralConfirmAt: nextConfirm,
    freeMonthsBanked: (record.freeMonthCredits ?? []).length,
    maxFreeMonths: MAX_BANKED_FREE_MONTHS,
    trialDeniedReason: record.trialDeniedReason ?? null,
    payments: record.payments,
  };
}

/** Registra o pagamento de uma mensalidade (a nova mensalidade começa quando o período atual acaba). */
export function applyPayment(recordInput: SubscriptionRecord, now: Date, paymentId: string): SubscriptionRecord {
  const record = normalize(recordInput);
  const start = maxDate(now, coverageEnd(record));
  const payment: Payment = { id: paymentId, date: now.toISOString(), amount: BASE_PRICE };
  return { ...record, paidUntil: addMonths(start, 1).toISOString(), payments: [...record.payments, payment] };
}

/**
 * Usa os meses grátis guardados. Cada um entra automaticamente quando o período
 * atual termina — e nunca antes da data em que foi ganho, para não "cobrir pra
 * trás" o intervalo em que a conta ficou sem acesso. Só considera o que já
 * aconteceu até `upTo`; devolve o mesmo objeto se nada foi usado.
 */
export function consumeFreeMonths(recordInput: SubscriptionRecord, upTo: Date): SubscriptionRecord {
  let record = normalize(recordInput);
  while ((record.freeMonthCredits ?? []).length > 0) {
    const [earnedAt, ...remaining] = record.freeMonthCredits!;
    const start = maxDate(coverageEnd(record), new Date(earnedAt));
    if (start > upTo) break;

    const payment: Payment = {
      id: `credit-${earnedAt}-${record.payments.length}`,
      date: start.toISOString(),
      amount: 0,
      source: 'referral_credit',
    };
    record = { ...record, freeMonthCredits: remaining, paidUntil: addMonths(start, 1).toISOString(), payments: [...record.payments, payment] };
  }
  return record;
}

/**
 * Credita uma indicação confirmada: conta como indicação e rende 1 mês grátis,
 * desde que o saldo guardado ainda não tenha chegado ao teto.
 */
export function creditReferral(recordInput: SubscriptionRecord, referredProviderId: string, at: Date): SubscriptionRecord {
  const record = normalize(recordInput);
  if (record.referralsConverted.includes(referredProviderId)) return record;
  const credits = record.freeMonthCredits ?? [];
  return {
    ...record,
    referralsConverted: [...record.referralsConverted, referredProviderId],
    freeMonthCredits: credits.length < MAX_BANKED_FREE_MONTHS ? [...credits, at.toISOString()] : credits,
  };
}

/** Registra o indicado como pendente (idempotente). Ele só conta depois de `REFERRAL_HOLD_DAYS`. */
export function addPendingReferral(record: SubscriptionRecord, referredProviderId: string, paidAt: Date): SubscriptionRecord {
  const base = normalize(record);
  const pending = base.referralsPending ?? [];
  if (base.referralsConverted.includes(referredProviderId) || pending.some((p) => p.providerId === referredProviderId)) {
    return base;
  }
  return { ...base, referralsPending: [...pending, { providerId: referredProviderId, paidAt: paidAt.toISOString() }] };
}

/**
 * Põe a assinatura em dia até `now`: confirma as indicações cujo prazo passou e
 * usa os meses grátis que já deviam ter entrado. Tudo é processado na ordem em
 * que aconteceu (cada indicação é creditada na data em que o prazo terminou, e
 * os meses são usados antes disso quando o período já havia acabado), então o
 * resultado é o mesmo não importa quando esta função roda. Devolve o MESMO
 * objeto quando nada muda.
 */
export function settleSubscription(record: SubscriptionRecord, now: Date): SubscriptionRecord {
  let next = normalize(record);
  const pending = next.referralsPending ?? [];
  const confirmAt = (p: { paidAt: string }) => addDays(new Date(p.paidAt), REFERRAL_HOLD_DAYS);

  const due = pending.filter((p) => confirmAt(p) <= now).sort((a, b) => a.paidAt.localeCompare(b.paidAt));
  if (due.length > 0) next = { ...next, referralsPending: pending.filter((p) => !due.includes(p)) };

  for (const p of due) {
    next = consumeFreeMonths(next, confirmAt(p)); // o saldo pode ter liberado espaço antes desta indicação
    next = creditReferral(next, p.providerId, confirmAt(p));
  }
  return consumeFreeMonths(next, now);
}
