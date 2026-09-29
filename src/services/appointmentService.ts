import type { Appointment, AppointmentInput, AppointmentStatus } from '../types';
import { mockAppointments } from '../mocks/appointments';
import { delay, generateId } from './utils';

const CREATED_KEY = 'agendasys:appointments:created';
const STATUS_KEY = 'agendasys:appointments:status';

/**
 * Persistência mockada: os agendamentos criados e as mudanças de status ficam
 * no localStorage, para sobreviverem a recarregamentos e serem compartilhados
 * entre abas (ex.: cliente agenda numa aba e o prestador vê na outra).
 * Os agendamentos de exemplo (`mockAppointments`) são gerados a cada carga,
 * sempre relativos à data de hoje. Sem localStorage (ex.: testes em Node),
 * cai para memória. Uma API real substitui tudo isso.
 */
const memory: { created: Appointment[]; status: Record<string, AppointmentStatus> } = {
  created: [],
  status: {},
};

function hasStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const readCreated = (): Appointment[] => (hasStorage() ? readJson(CREATED_KEY, []) : memory.created);
const readStatus = (): Record<string, AppointmentStatus> =>
  hasStorage() ? readJson(STATUS_KEY, {}) : memory.status;

function writeCreated(list: Appointment[]) {
  if (hasStorage()) localStorage.setItem(CREATED_KEY, JSON.stringify(list));
  else memory.created = list;
}
function writeStatus(map: Record<string, AppointmentStatus>) {
  if (hasStorage()) localStorage.setItem(STATUS_KEY, JSON.stringify(map));
  else memory.status = map;
}

function all(): Appointment[] {
  const status = readStatus();
  return [...mockAppointments, ...readCreated()].map((a) =>
    status[a.id] ? { ...a, status: status[a.id] } : a
  );
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
      (a) =>
        a.providerId === input.providerId &&
        a.date === input.date &&
        a.time === input.time &&
        a.status !== 'cancelado'
    );
    if (conflict) {
      await delay(null, 300);
      throw new Error('Este horário acabou de ser ocupado. Escolha outro horário.');
    }

    const appointment: Appointment = {
      id: generateId('appt'),
      status: 'agendado',
      createdAt: new Date().toISOString(),
      ...input,
    };
    writeCreated([...readCreated(), appointment]);
    return delay(appointment, 600);
  },

  async updateStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
    const appointment = all().find((a) => a.id === id);
    if (!appointment) throw new Error('Agendamento não encontrado.');
    writeStatus({ ...readStatus(), [id]: status });
    return delay({ ...appointment, status });
  },
};
