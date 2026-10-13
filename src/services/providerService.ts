import type { Provider, ProviderProfileInput } from '../types';
import { findProviderById, findProviderBySlug, mockProviders } from '../mocks/providers';
import { buildProviderSlug } from '../utils/slug';
import { loadJson, saveJson } from './storage';
import { delay, generateId } from './utils';

const CREATED_KEY = 'agendasys:providers:created';

export interface NewProviderInput {
  name: string;
  businessName: string;
  /** WhatsApp já verificado (55 + DDD + número); vira o contato público do prestador. */
  whatsapp?: string;
}

const readCreated = (): Provider[] => loadJson<Provider[]>(CREATED_KEY, []);
const allProviders = (): Provider[] => [...mockProviders, ...readCreated()];

/** Avatar padrão (inicial do estabelecimento) até o prestador enviar uma foto. */
function defaultAvatar(businessName: string): string {
  const initial = (businessName.trim()[0] ?? 'A').toUpperCase().replace(/[<>&"']/g, '');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#0F6B5C"/>` +
    `<text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="sans-serif" font-size="120" fill="#fff">${initial}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const providerService = {
  async getBySlug(slug: string): Promise<Provider | null> {
    return delay(allProviders().find((p) => p.slug === slug) ?? findProviderBySlug(slug) ?? null);
  },

  async getById(id: string): Promise<Provider | null> {
    return delay(allProviders().find((p) => p.id === id) ?? findProviderById(id) ?? null);
  },

  /**
   * Cria o prestador de uma nova conta. O slug leva um identificador único,
   * então nome + estabelecimento repetidos não impedem o cadastro.
   */
  async create(input: NewProviderInput): Promise<Provider> {
    const taken = new Set(allProviders().map((p) => p.slug));
    const provider: Provider = {
      id: generateId('prov'),
      slug: buildProviderSlug(input.businessName, (s) => taken.has(s)),
      name: input.name.trim(),
      businessName: input.businessName.trim(),
      avatarUrl: defaultAvatar(input.businessName),
      description: '',
      address: '',
      phone: input.whatsapp ?? '',
      whatsapp: input.whatsapp ?? '',
      createdAt: new Date().toISOString(),
    };
    saveJson(CREATED_KEY, [...readCreated(), provider]);
    return delay(provider, 100);
  },

  async updateProfile(id: string, input: Partial<ProviderProfileInput>): Promise<Provider> {
    // o slug é permanente: mudar o nome do estabelecimento não quebra o link já divulgado/impresso
    const { slug: _ignored, ...changes } = input;
    void _ignored;

    const demo = mockProviders.find((p) => p.id === id);
    if (demo) {
      Object.assign(demo, changes);
      return delay({ ...demo });
    }
    const created = readCreated();
    const index = created.findIndex((p) => p.id === id);
    if (index < 0) throw new Error('Prestador não encontrado.');
    created[index] = { ...created[index], ...changes };
    saveJson(CREATED_KEY, created);
    return delay({ ...created[index] });
  },

  /** Utilizado apenas para demonstração/testes locais */
  _all(): Provider[] {
    return allProviders();
  },
};
