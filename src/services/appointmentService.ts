import type { Appointment, AppointmentInput } from '../types';
import { mockAppointments } from '../mocks/appointments';
import { mockServices } from '../mocks/services';
import { loadJson, saveJson } from './storage';
import { delay, generateId } from './utils';

const CREATED_KEY = 'agendasys:appointments:created';
const DELETED_KEY = 'agendasys:appointments:deleted';

/**
 * Persistência mockada: os agendamentos criados e os ids dos excluídos ficam
 * no localStorage, para sobreviverem a recarregamentos e serem compartilhados
 * entre abas (ex.: cliente agenda numa aba e o prestador vê na outra).
 * Os agendamentos de exemplo (`mockAppointments`) são gerados a cada carga,
 * sempre relativos à data de hoje. Uma API real substitui tudo isso.
 */
const readCreated = (): Appointment[] => loadJson<Appointment[]>(CREATED_KEY, []);
const readDeleted = (): string[] => loadJson<string[]>(DELETED_KEY, []);

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((cb) => cb());

function all(): Appointment[] {
  const deleted = new Set(readDeleted());
  return [...mockAppointments, ...readCreated()]
    .filter((a) => !deleted.has(a.id))
    .map((a) => {
      if (typeof a.price === 'number') return a;
      // agendamento salvo antes de existir o preço congelado: usa o preço atual do serviço
      const service = mockServices.find((s) => s.id === a.serviceId);
      return { ...a, price: service?.price ?? 0, serviceName: a.serviceName ?? service?.name ?? 'Serviço' };
    });
}

export const appointmentService = {
  async listByProvider(providerId: string): Promise<Appointment[]> {
    return delay(all().filter((a) => a.providerId === providerId));
  },

  async listByProviderAndDate(providerId: string, date: string): Promise<Appointment[]> {
    return delay(all().filter((a) => a.providerId === providerId && a.date === date));
  },

  async create(input: AppointmentInput): Promise<Appointment> {
    // Regra de negócio que a API real também deve garantir no servidor:
    // dois clientes não podem ocupar o mesmo horário.
    const conflict = all().some(
      (a) => a.providerId === input.providerId && a.date === input.date && a.time === input.time
    );
    if (conflict) {
      await delay(null, 300);
      throw new Error('Este horário acabou de ser ocupado. Escolha outro horário.');
    }

    // O preço vem do serviço (no servidor), nunca do cliente, e fica registrado
    // no agendamento: é a base do cálculo de ganhos.
    const service = mockServices.find((s) => s.id === input.serviceId && s.providerId === input.providerId);
    if (!service) throw new Error('Serviço não encontrado.');

    const appointment: Appointment = {
      id: generateId('appt'),
      createdAt: new Date().toISOString(),
      price: service.price,
      serviceName: service.name,
      ...input,
    };
    saveJson(CREATED_KEY, [...readCreated(), appointment]);
    notify();
    return delay(appointment, 600);
  },

  /**
   * Exclui o agendamento (ex.: cliente avisou que não vai comparecer e não
   * quer remarcar). O horário volta a ficar livre e o valor deixa de entrar nos ganhos.
   */
  async remove(id: string): Promise<void> {
    const appointment = all().find((a) => a.id === id);
    if (!appointment) throw new Error('Agendamento não encontrado.');
    saveJson(CREATED_KEY, readCreated().filter((a) => a.id !== id));
    saveJson(DELETED_KEY, [...readDeleted(), id]);
    notify();
    return delay(undefined);
  },

  /** Avisa quando algum agendamento muda (nesta aba ou em outra). */
  onChange(callback: () => void): () => void {
    listeners.add(callback);
    const onStorage = (e: StorageEvent) => {
      if (e.key === CREATED_KEY || e.key === DELETED_KEY || e.key === null) callback();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(callback);
      window.removeEventListener('storage', onStorage);
    };
  },
};
