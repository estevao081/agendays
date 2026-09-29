import type { AuthUser } from '../types';

/** Usuário de demonstração — qualquer senha com 6+ caracteres funciona no login mockado */
export const mockUser: AuthUser = {
  id: 'user-1',
  name: 'Fulano da Silva',
  email: 'fulano@barbearia.com',
  providerId: 'prov-1',
};
