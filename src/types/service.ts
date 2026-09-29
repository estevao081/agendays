export interface Service {
  id: string;
  providerId: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  active: boolean;
}

export type ServiceInput = Omit<Service, 'id' | 'providerId'>;
