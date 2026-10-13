import type { SubscriptionRecord, SubscriptionSummary, TrialDeniedReason } from '../types';
import { demoSubscription } from '../mocks/subscriptions';
import { addPendingReferral, applyPayment, hasPaid, newSubscriptionRecord, settleSubscription, summarize } from '../utils/billing';
import { randomLinkId } from '../utils/slug';
import { loadJson, saveJson } from './storage';
import { delay, generateId } from './utils';

const KEY = 'agendasys:subscriptions';
const LEDGER_KEY = 'agendasys:identity-ledger';
const DEMO_PROVIDER_ID = 'prov-1';

/** Impressões digitais (hash) de quem abriu a conta. Nunca guardamos o CPF/CNPJ nem o telefone em si. */
export interface IdentityHashes {
  documentHash: string;
  phoneHash: string;
}

interface LedgerEntry extends IdentityHashes {
  providerId: string;
  at: string;
}

function readAll(now: Date): SubscriptionRecord[] {
  const stored = loadJson<SubscriptionRecord[]>(KEY, []);
  return stored.some((r) => r.providerId === DEMO_PROVIDER_ID) ? stored : [demoSubscription(now), ...stored];
}

const readLedger = (): LedgerEntry[] => loadJson<LedgerEntry[]>(LEDGER_KEY, []);

const listeners = new Set<() => void>();
function writeAll(records: SubscriptionRecord[]) {
  saveJson(KEY, records);
  listeners.forEach((cb) => cb());
}

/** Lê as assinaturas já confirmando as indicações vencidas e usando os meses grátis devidos (e grava, se algo mudou). */
function loadSettled(now: Date): SubscriptionRecord[] {
  const records = readAll(now);
  const settled = records.map((r) => settleSubscription(r, now));
  if (settled.some((r, i) => r !== records[i])) writeAll(settled);
  return settled;
}

/** Código de indicação curto e único (ex.: "K3X9QA"). */
function uniqueReferralCode(records: SubscriptionRecord[]): string {
  let code: string;
  do {
    code = randomLinkId().toUpperCase();
  } while (records.some((r) => r.referralCode === code));
  return code;
}

/**
 * Cobrança mockada. Não há gateway: `pay` apenas registra o pagamento. Numa API
 * real, a cobrança acontece no servidor (Pix/cartão via Mercado Pago, Stripe…),
 * confirmada por webhook — nunca pelo cliente. As regras antiabuso abaixo
 * (um mês grátis por documento/telefone, autoindicação, prazo de confirmação)
 * também precisam rodar no servidor.
 */
export const billingService = {
  /** Descobre quem é o dono de um código de indicação (null se não existir). */
  async findReferrerId(code: string, now = new Date()): Promise<string | null> {
    const normalized = code.trim().toUpperCase();
    return delay(readAll(now).find((r) => r.referralCode === normalized)?.providerId ?? null, 100);
  },

  /** Esta identidade já usou o mês grátis? Devolve o motivo ou null se está elegível. */
  trialDeniedReasonFor(identity: IdentityHashes): TrialDeniedReason | null {
    const ledger = readLedger();
    if (ledger.some((e) => e.documentHash === identity.documentHash)) return 'document';
    if (ledger.some((e) => e.phoneHash === identity.phoneHash)) return 'phone';
    return null;
  },

  /** Quem indica e quem foi indicado são a mesma pessoa (mesmo documento ou mesmo telefone)? */
  isSelfReferral(referrerProviderId: string, identity: IdentityHashes): boolean {
    return readLedger().some(
      (e) => e.providerId === referrerProviderId && (e.documentHash === identity.documentHash || e.phoneHash === identity.phoneHash),
    );
  },

  /**
   * Abre a assinatura de uma conta nova. Começa no mês grátis, a não ser que o
   * documento ou o WhatsApp já tenha usado o teste em outra conta.
   */
  async createForProvider(
    providerId: string,
    options: { referredByProviderId?: string | null; identity: IdentityHashes },
    now = new Date(),
  ): Promise<SubscriptionSummary> {
    const records = readAll(now);
    const deniedReason = this.trialDeniedReasonFor(options.identity) ?? undefined;
    const record = newSubscriptionRecord(
      providerId,
      uniqueReferralCode(records),
      options.referredByProviderId ?? null,
      now,
      deniedReason,
    );
    // o registro de identidades é permanente: apagar a conta não devolve o mês grátis
    saveJson(LEDGER_KEY, [...readLedger(), { providerId, ...options.identity, at: now.toISOString() }]);
    writeAll([...records, record]);
    return delay(summarize(record, now), 100);
  },

  async getSummary(providerId: string, now = new Date()): Promise<SubscriptionSummary> {
    const records = loadSettled(now);
    let record = records.find((r) => r.providerId === providerId);
    if (!record) {
      // conta anterior à cobrança: ganha o mês grátis a partir do primeiro acesso
      record = newSubscriptionRecord(providerId, uniqueReferralCode(records), null, now);
      writeAll([...records, record]);
    }
    return delay(summarize(record, now), 150);
  },

  /** O prestador pode receber agendamentos / usar o painel? */
  async hasAccess(providerId: string, now = new Date()): Promise<boolean> {
    return (await this.getSummary(providerId, now)).hasAccess;
  },

  /**
   * Paga a mensalidade (simulado). Na 1ª mensalidade, o indicador recebe a
   * indicação como *pendente*; ela só rende mês grátis depois de `REFERRAL_HOLD_DAYS`.
   */
  async pay(providerId: string, now = new Date()): Promise<SubscriptionSummary> {
    let records = loadSettled(now);
    const record = records.find((r) => r.providerId === providerId);
    if (!record) throw new Error('Assinatura não encontrada.');
    const paid = applyPayment(record, now, generateId('pay'));
    records = records.map((r) => (r.providerId === providerId ? paid : r));

    if (!hasPaid(record) && record.referredByProviderId) {
      records = records.map((r) =>
        r.providerId === record.referredByProviderId ? addPendingReferral(r, providerId, now) : r,
      );
    }
    writeAll(records);
    return delay(summarize(paid, now), 400);
  },

  /** Avisa quando a assinatura muda (nesta aba ou em outra). */
  onChange(callback: () => void): () => void {
    listeners.add(callback);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) callback();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(callback);
      window.removeEventListener('storage', onStorage);
    };
  },
};
