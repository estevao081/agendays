import type { AuthUser, LoginInput, RegisterInput } from '../types';
import { mockUser } from '../mocks/users';
import { isValidCnpj, isValidCpf, cleanDocument } from '../utils/document';
import { isDisposableEmail, normalizeEmail } from '../utils/email';
import { normalizeBrPhone } from '../utils/phone';
import { loadJson, saveJson } from './storage';
import { providerService } from './providerService';
import { billingService } from './billingService';
import { verificationService } from './verificationService';
import { hashIdentifier, sha256Hex } from './crypto';
import { delay, generateId } from './utils';

const STORAGE_KEY = 'agendasys:auth-user';
const ACCOUNTS_KEY = 'agendasys:accounts';

interface Account {
  user: AuthUser;
  /** SHA-256 da senha. Só para o mock não guardar texto puro: o backend real deve usar argon2/bcrypt. */
  passwordHash: string;
  /** e-mail canônico (sem pontos do Gmail nem `+tag`), para detectar a mesma caixa postal */
  emailKey?: string;
}

const readAccounts = (): Account[] => loadJson<Account[]>(ACCOUNTS_KEY, []);
const emailKeyOf = (a: Account) => a.emailKey ?? normalizeEmail(a.user.email);

/**
 * Camada de autenticação mockada. A assinatura de cada função já reflete o
 * formato que uma chamada real de API teria (Promise + payload), para que a
 * troca futura por `fetch('/api/auth/...')` não exija mudanças em quem chama.
 */
export const authService = {
  async login({ email, password }: LoginInput): Promise<AuthUser> {
    await delay(null, 500);
    if (!email || !password) throw new Error('Informe e-mail e senha.');
    if (password.length < 6) throw new Error('Senha incorreta.');

    const account = readAccounts().find((a) => emailKeyOf(a) === normalizeEmail(email));
    let user: AuthUser;
    if (account) {
      if (account.passwordHash !== (await sha256Hex(password))) throw new Error('Senha incorreta.');
      user = account.user;
    } else {
      // conta de demonstração: qualquer e-mail + senha com 6+ caracteres
      user = { ...mockUser, email };
    }
    saveJson(STORAGE_KEY, user);
    return user;
  },

  async register(input: RegisterInput): Promise<AuthUser> {
    await delay(null, 500);
    if (input.password !== input.confirmPassword) throw new Error('As senhas não coincidem.');
    if (!input.businessName.trim()) throw new Error('Informe o nome do estabelecimento.');

    // --- e-mail: único (mesma caixa postal = mesma conta) e não descartável
    const email = input.email.trim().toLowerCase();
    const emailKey = normalizeEmail(email);
    if (isDisposableEmail(email)) {
      throw new Error('E-mails temporários não são aceitos. Use um e-mail que você acessa de verdade.');
    }
    if (emailKey === normalizeEmail(mockUser.email) || readAccounts().some((a) => emailKeyOf(a) === emailKey)) {
      throw new Error('Já existe uma conta com este e-mail.');
    }

    // --- documento (CPF/CNPJ) e WhatsApp verificado
    if (!isValidCpf(input.document) && !isValidCnpj(input.document)) {
      throw new Error('CPF ou CNPJ inválido. Confira os números.');
    }
    const phone = normalizeBrPhone(input.whatsapp);
    if (!phone) throw new Error('Informe um celular válido com DDD.');
    if (!(await verificationService.isVerified(phone))) {
      throw new Error('Confirme seu WhatsApp com o código enviado antes de criar a conta.');
    }

    const identity = {
      documentHash: await hashIdentifier('document', cleanDocument(input.document)),
      phoneHash: await hashIdentifier('phone', phone),
    };

    // --- indicação: o código precisa existir e não pode ser da própria pessoa
    let referrerId: string | null = null;
    if (input.referralCode?.trim()) {
      referrerId = await billingService.findReferrerId(input.referralCode);
      if (!referrerId) throw new Error('Código de indicação inválido.');
      if (billingService.isSelfReferral(referrerId, identity)) {
        throw new Error('Este código de indicação não pode ser usado nesta conta.');
      }
    }

    const provider = await providerService.create({ name: input.name, businessName: input.businessName, whatsapp: phone });
    await billingService.createForProvider(provider.id, { referredByProviderId: referrerId, identity });
    const user: AuthUser = { id: generateId('user'), name: input.name.trim(), email, providerId: provider.id };
    saveJson(ACCOUNTS_KEY, [...readAccounts(), { user, passwordHash: await sha256Hex(input.password), emailKey }]);
    await verificationService.consume(phone);
    saveJson(STORAGE_KEY, user);
    return user;
  },

  async logout(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
    return delay(undefined, 200);
  },

  getCurrentUser(): AuthUser | null {
    return loadJson<AuthUser | null>(STORAGE_KEY, null);
  },
};
