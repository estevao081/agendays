import { authService } from '../src/services/authService';
import { verificationService } from '../src/services/verificationService';
import type { AuthUser, RegisterInput } from '../src/types';

let seq = 0;

/** CPF válido, gerado com o algoritmo (independente do validador do app). */
export function makeCpf(n: number): string {
  const base = String(100000000 + ((n * 7919) % 800000000)).split('').map(Number);
  const dv = (digits: number[]) => {
    const factor = digits.length + 1;
    const sum = digits.reduce((acc, d, i) => acc + d * (factor - i), 0);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = dv(base);
  const d2 = dv([...base, d1]);
  return [...base, d1, d2].join('');
}

/** Celular válido e único: 81 9 1000 0000+n */
export const makePhone = (n: number): string => `819${String(10000000 + n)}`;

/**
 * Cria uma conta de verdade: pede e confirma o código do WhatsApp (OTP) e
 * registra. Cada chamada gera CPF, telefone e e-mail novos (sobrescreva o que precisar).
 * Atenção: deixa a conta recém-criada como usuário logado.
 */
export async function registerAccount(
  over: Partial<RegisterInput> = {},
): Promise<AuthUser & { email: string; document: string; whatsapp: string }> {
  seq += 1;
  const whatsapp = over.whatsapp ?? makePhone(seq);
  // "agora" deslocado por conta: evita o intervalo mínimo de reenvio entre contas do mesmo número
  const at = new Date(Date.now() + seq * 60_000);
  const { demoCode } = await verificationService.sendCode(whatsapp, at);
  await verificationService.verifyCode(whatsapp, demoCode, at);

  const input: RegisterInput = {
    name: `Pessoa ${seq}`,
    businessName: `Negócio ${seq}`,
    document: makeCpf(seq),
    whatsapp,
    email: `pessoa${seq}@teste.com`,
    password: 'abcdef',
    confirmPassword: 'abcdef',
    ...over,
  };
  const user = await authService.register(input);
  return { ...user, email: input.email, document: input.document, whatsapp: input.whatsapp };
}
