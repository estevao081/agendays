import { addMinutes, addSeconds } from 'date-fns';
import { normalizeBrPhone } from '../utils/phone';
import { hashIdentifier, sha256Hex } from './crypto';
import { loadJson, saveJson } from './storage';
import { delay } from './utils';

const KEY = 'agendasys:otp';

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 5;
export const OTP_RESEND_SECONDS = 30;
export const OTP_MAX_ATTEMPTS = 5;
/** Depois de verificado, o número vale para concluir o cadastro por este tempo. */
export const VERIFIED_TTL_MINUTES = 15;

interface Challenge {
  codeHash: string;
  expiresAt: string;
  sentAt: string;
  attempts: number;
}
interface Store {
  /** desafios ativos, por hash do telefone */
  challenges: Record<string, Challenge>;
  /** telefones já verificados (hash → validade) */
  verified: Record<string, string>;
}

const read = (): Store => loadJson<Store>(KEY, { challenges: {}, verified: {} });

const keyOf = (phone: string) => hashIdentifier('phone', phone);

function requirePhone(raw: string): string {
  const phone = normalizeBrPhone(raw);
  if (!phone) throw new Error('Informe um celular válido com DDD, ex.: (81) 99123-4567.');
  return phone;
}

function randomCode(): string {
  const n = globalThis.crypto.getRandomValues(new Uint32Array(1))[0] % 10 ** OTP_LENGTH;
  return String(n).padStart(OTP_LENGTH, '0');
}

/**
 * Verificação do WhatsApp por código (OTP). Prova que a pessoa tem o número.
 *
 * MOCK: não há envio de verdade. `sendCode` devolve `demoCode` só para a tela
 * mostrar em "modo demonstração". Com um provedor real (WhatsApp Business API,
 * Twilio Verify…), o código é enviado no servidor e NUNCA volta na resposta.
 * Os limites (reenvio, expiração, tentativas) também precisam existir no servidor.
 */
export const verificationService = {
  async sendCode(rawPhone: string, now = new Date()): Promise<{ expiresAt: string; demoCode: string }> {
    const phone = requirePhone(rawPhone);
    const key = await keyOf(phone);
    const store = read();

    const previous = store.challenges[key];
    if (previous) {
      const wait = Math.ceil((addSeconds(new Date(previous.sentAt), OTP_RESEND_SECONDS).getTime() - now.getTime()) / 1000);
      if (wait > 0) throw new Error(`Aguarde ${wait}s para pedir outro código.`);
    }

    const code = randomCode();
    const expiresAt = addMinutes(now, OTP_TTL_MINUTES).toISOString();
    store.challenges[key] = { codeHash: await sha256Hex(`${key}:${code}`), expiresAt, sentAt: now.toISOString(), attempts: 0 };
    saveJson(KEY, store);
    return delay({ expiresAt, demoCode: code }, 300);
  },

  async verifyCode(rawPhone: string, code: string, now = new Date()): Promise<void> {
    const phone = requirePhone(rawPhone);
    const key = await keyOf(phone);
    const store = read();
    const challenge = store.challenges[key];

    if (!challenge) throw new Error('Peça um código primeiro.');
    if (new Date(challenge.expiresAt) <= now) throw new Error('O código expirou. Peça um novo.');
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) throw new Error('Muitas tentativas. Peça um novo código.');

    if (challenge.codeHash !== (await sha256Hex(`${key}:${code.trim()}`))) {
      challenge.attempts += 1;
      saveJson(KEY, store);
      throw new Error('Código incorreto.');
    }

    delete store.challenges[key];
    store.verified[key] = addMinutes(now, VERIFIED_TTL_MINUTES).toISOString();
    saveJson(KEY, store);
    return delay(undefined, 200);
  },

  /** O número foi verificado recentemente? (o servidor confere isto ao criar a conta) */
  async isVerified(rawPhone: string, now = new Date()): Promise<boolean> {
    const phone = normalizeBrPhone(rawPhone);
    if (!phone) return false;
    const until = read().verified[await keyOf(phone)];
    return !!until && new Date(until) > now;
  },

  /** Usa a verificação (vale uma vez só). */
  async consume(rawPhone: string): Promise<void> {
    const phone = normalizeBrPhone(rawPhone);
    if (!phone) return;
    const store = read();
    delete store.verified[await keyOf(phone)];
    saveJson(KEY, store);
  },
};
