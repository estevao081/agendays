import type { Service, ServiceInput } from '../types';
import { mockServices } from '../mocks/services';
import { delay, generateId } from './utils';

export const serviceService = {
  async listByProvider(providerId: string): Promise<Service[]> {
    return delay(mockServices.filter((s) => s.providerId === providerId));
  },

  async create(providerId: string, input: ServiceInput): Promise<Service> {
    const service: Service = { id: generateId('svc'), providerId, ...input };
    mockServices.push(service);
    return delay(service);
  },

  async update(id: string, input: Partial<ServiceInput>): Promise<Service> {
    const service = mockServices.find((s) => s.id === id);
    if (!service) throw new Error('Serviço não encontrado.');
    Object.assign(service, input);
    return delay({ ...service });
  },

  async remove(id: string): Promise<void> {
    const index = mockServices.findIndex((s) => s.id === id);
    if (index >= 0) mockServices.splice(index, 1);
    return delay(undefined, 250);
  },

  async toggleActive(id: string): Promise<Service> {
    const service = mockServices.find((s) => s.id === id);
    if (!service) throw new Error('Serviço não encontrado.');
    service.active = !service.active;
    return delay({ ...service });
  },
};
