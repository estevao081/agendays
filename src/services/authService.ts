import type { AuthUser, LoginInput, RegisterInput } from '../types';
import { mockUser } from '../mocks/users';
import { delay } from './utils';

const STORAGE_KEY = 'agendasys:auth-user';

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
    const user = { ...mockUser, email };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return user;
  },

  async register(input: RegisterInput): Promise<AuthUser> {
    await delay(null, 500);
    if (input.password !== input.confirmPassword) throw new Error('As senhas não coincidem.');
    const user: AuthUser = { ...mockUser, name: input.name, email: input.email };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return user;
  },

  async logout(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
    return delay(undefined, 200);
  },

  getCurrentUser(): AuthUser | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },
};
