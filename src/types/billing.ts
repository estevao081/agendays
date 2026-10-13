export type SubscriptionStatus = 'trial' | 'active' | 'expired';

/** Motivo de o mês grátis não ter sido concedido na criação da conta. */
export type TrialDeniedReason = 'document' | 'phone';

/** Indicado que já pagou a 1ª mensalidade, mas ainda está no período de confirmação. */
export interface PendingReferral {
  providerId: string;
  /** data da 1ª mensalidade do indicado (ISO) */
  paidAt: string;
}

export interface Payment {
  id: string;
  /** ISO 8601 */
  date: string;
  /** valor efetivamente cobrado (R$ 0 num mês grátis por indicação) */
  amount: number;
  /** 'referral_credit' = mês grátis ganho por indicação (não é um pagamento de verdade) */
  source?: 'referral_credit';
}

/** Registro de assinatura de um prestador (na API real, uma tabela própria). */
export interface SubscriptionRecord {
  providerId: string;
  /** código que o prestador divulga para indicar o app */
  referralCode: string;
  /** prestador que indicou esta conta (se houve) */
  referredByProviderId: string | null;
  /** fim do mês grátis de boas-vindas (ISO) */
  trialEndsAt: string;
  /** fim do período já pago ou coberto por mês grátis de indicação (ISO) */
  paidUntil: string | null;
  /**
   * Saldo de meses grátis ganhos por indicação (máx. 3). Cada item é a data em
   * que o mês foi ganho; eles são usados automaticamente, do mais antigo ao
   * mais novo, quando o período atual termina. (Ausente em registros antigos.)
   */
  freeMonthCredits?: string[];
  /** indicados que pagaram, aguardando o prazo de confirmação (ausente em registros antigos) */
  referralsPending?: PendingReferral[];
  /** ids dos indicados já confirmados (cada um conta uma vez) */
  referralsConverted: string[];
  /** preenchido quando a conta nasceu sem o mês grátis */
  trialDeniedReason?: TrialDeniedReason;
  payments: Payment[];
}

export interface SubscriptionSummary {
  providerId: string;
  status: SubscriptionStatus;
  /** false quando o teste/assinatura venceu */
  hasAccess: boolean;
  /** data em que o estado atual termina (null se vencida) */
  currentPeriodEndsAt: string | null;
  daysLeft: number;
  /** valor da mensalidade (não há mais desconto por indicação: o prêmio é mês grátis) */
  nextPrice: number;
  /** já fez ao menos um pagamento de verdade (meses grátis não contam) */
  hasPaid: boolean;
  referralCode: string;
  /** indicações confirmadas (inclusive as que não renderam mês por causa do teto) */
  referralsTotal: number;
  /** indicados que já pagaram, mas ainda no prazo de confirmação */
  referralsPending: number;
  /** quando a próxima indicação pendente é confirmada (ISO) */
  nextReferralConfirmAt: string | null;
  /** meses grátis guardados, ainda não usados */
  freeMonthsBanked: number;
  /** teto do saldo de meses grátis */
  maxFreeMonths: number;
  trialDeniedReason: TrialDeniedReason | null;
  payments: Payment[];
}
