import { addDays, addMonths } from 'date-fns';
import type { SubscriptionRecord } from '../types';
import { BASE_PRICE } from '../utils/billing';

/** Assinatura da conta de demonstração: já paga, para não bloquear o acesso de exemplo. */
export function demoSubscription(now: Date): SubscriptionRecord {
  return {
    providerId: 'prov-1',
    referralCode: 'FULANO',
    referredByProviderId: null,
    trialEndsAt: addMonths(now, -2).toISOString(),
    paidUntil: addDays(now, 20).toISOString(),
    freeMonthCredits: [],
    referralsPending: [],
    referralsConverted: [],
    payments: [
      { id: 'pay-demo-1', date: addDays(now, -10).toISOString(), amount: BASE_PRICE },
    ],
  };
}
