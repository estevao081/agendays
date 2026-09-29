import type { AppNotification } from '../types';
import { generateId } from './utils';

const STORAGE_KEY = 'agendasys:notifications';
export const NOTIFICATION_CREATED_EVENT = 'agendasys:notification-created';

function readAll(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

function writeAll(notifications: AppNotification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
}

/**
 * Notificações internas do prestador (sino no dashboard). Hoje persistidas em
 * localStorage e propagadas via evento nativo `storage` (entre abas) + um
 * CustomEvent (dentro da mesma aba), simulando uma notificação "em tempo
 * real". No futuro, este service pode ser substituído por um WebSocket,
 * Server-Sent Events ou push notification vindo de uma API real, mantendo a
 * mesma interface (`listByProvider`, `subscribe`).
 */
export const notificationService = {
  listByProvider(providerId: string): AppNotification[] {
    return readAll()
      .filter((n) => n.providerId === providerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  create(input: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): AppNotification {
    const notification: AppNotification = {
      ...input,
      id: generateId('notif'),
      createdAt: new Date().toISOString(),
      read: false,
    };
    writeAll([...readAll(), notification]);

    // dispara na própria aba (o evento `storage` só chega às outras abas)
    window.dispatchEvent(new CustomEvent(NOTIFICATION_CREATED_EVENT, { detail: notification }));

    return notification;
  },

  markAllRead(providerId: string): void {
    writeAll(
      readAll().map((n) => (n.providerId === providerId ? { ...n, read: true } : n))
    );
    window.dispatchEvent(new CustomEvent(NOTIFICATION_CREATED_EVENT));
  },

  /** Assina novas notificações (entre abas e na mesma aba). Retorna a função de cancelamento. */
  subscribe(onChange: () => void): () => void {
    function handleStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY || e.key === null) onChange();
    }
    function handleCustomEvent() {
      onChange();
    }

    window.addEventListener('storage', handleStorage);
    window.addEventListener(NOTIFICATION_CREATED_EVENT, handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(NOTIFICATION_CREATED_EVENT, handleCustomEvent);
    };
  },
};
