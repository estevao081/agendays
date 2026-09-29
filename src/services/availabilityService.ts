import type { AvailabilitySettings, DayAvailability } from '../types';
import { mockAvailability } from '../mocks/availability';
import { delay } from './utils';

// mantém estado em memória para simular persistência entre navegações
let currentAvailability: AvailabilitySettings = structuredClone(mockAvailability);

export const availabilityService = {
  async get(providerId: string): Promise<AvailabilitySettings> {
    if (currentAvailability.providerId !== providerId) {
      currentAvailability = { providerId, days: structuredClone(mockAvailability.days) };
    }
    return delay(structuredClone(currentAvailability));
  },

  async updateDay(providerId: string, day: DayAvailability): Promise<AvailabilitySettings> {
    if (currentAvailability.providerId !== providerId) {
      currentAvailability = { providerId, days: structuredClone(mockAvailability.days) };
    }
    currentAvailability.days = currentAvailability.days.map((d) =>
      d.dayOfWeek === day.dayOfWeek ? day : d
    );
    return delay(structuredClone(currentAvailability));
  },

  async replaceAll(settings: AvailabilitySettings): Promise<AvailabilitySettings> {
    currentAvailability = structuredClone(settings);
    return delay(structuredClone(currentAvailability));
  },
};
