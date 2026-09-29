import type { Provider, ProviderProfileInput } from '../types';
import { findProviderById, findProviderBySlug, mockProviders } from '../mocks/providers';
import { delay } from './utils';

export const providerService = {
  async getBySlug(slug: string): Promise<Provider | null> {
    return delay(findProviderBySlug(slug) ?? null);
  },

  async getById(id: string): Promise<Provider | null> {
    return delay(findProviderById(id) ?? null);
  },

  async updateProfile(id: string, input: Partial<ProviderProfileInput>): Promise<Provider> {
    const provider = findProviderById(id);
    if (!provider) throw new Error('Prestador não encontrado.');
    Object.assign(provider, input);
    return delay({ ...provider });
  },

  /** Utilizado apenas para demonstração/testes locais */
  _all(): Provider[] {
    return mockProviders;
  },
};
