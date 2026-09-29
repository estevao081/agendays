import type { Provider } from '../types';

export const mockProviders: Provider[] = [
  {
    id: 'prov-1',
    slug: 'fulano-barbearia',
    name: 'Fulano da Silva',
    businessName: 'Barbearia Fulano',
    avatarUrl:
      'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=256&h=256&fit=crop&q=80',
    description:
      'Cortes clássicos e modernos com atenção aos detalhes. Ambiente descontraído no coração do bairro, atendimento marcado para você não perder tempo esperando.',
    address: 'Rua das Palmeiras, 245 — Recife, PE',
    phone: '(81) 99123-4567',
    whatsapp: '5581991234567',
    instagram: '@barbeariafulano',
    createdAt: '2026-01-10T10:00:00.000Z',
  },
];

export function findProviderBySlug(slug: string): Provider | undefined {
  return mockProviders.find((p) => p.slug === slug);
}

export function findProviderById(id: string): Provider | undefined {
  return mockProviders.find((p) => p.id === id);
}
