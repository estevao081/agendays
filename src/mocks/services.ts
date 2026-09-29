import type { Service } from '../types';

export const mockServices: Service[] = [
  {
    id: 'svc-1',
    providerId: 'prov-1',
    name: 'Corte masculino',
    description: 'Corte na tesoura e máquina, com acabamento na navalha.',
    price: 35,
    durationMinutes: 30,
    active: true,
  },
  {
    id: 'svc-2',
    providerId: 'prov-1',
    name: 'Barba',
    description: 'Modelagem completa com toalha quente.',
    price: 25,
    durationMinutes: 25,
    active: true,
  },
  {
    id: 'svc-3',
    providerId: 'prov-1',
    name: 'Corte + barba',
    description: 'Combo completo: corte e barba no mesmo horário.',
    price: 55,
    durationMinutes: 60,
    active: true,
  },
];
