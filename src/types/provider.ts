export interface Provider {
  id: string;
  slug: string;
  name: string;
  businessName: string;
  avatarUrl: string;
  description: string;
  address: string;
  phone: string;
  whatsapp: string;
  instagram?: string;
  createdAt: string;
}

export type ProviderProfileInput = Omit<Provider, 'id' | 'createdAt'>;
